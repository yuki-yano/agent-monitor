import { zValidator } from "@hono/zod-validator";
import type {
  AgentMonitorConfig,
  LaunchCommandResponse,
  LaunchResumeMeta,
  LaunchResumePolicy,
} from "@vde-monitor/shared";
import { Hono } from "hono";
import { z } from "zod";

import { setMapEntryWithLimit } from "../../../cache";
import { toErrorMessage } from "../../../errors";
import { buildError } from "../../helpers";
import type { SessionRouteDeps } from "../types";
import { resolveLaunchResumePlan } from "./launch-resume-planner";
import { launchRequestSchema } from "./shared";

const LAUNCH_IDEMPOTENCY_TTL_MS = 60_000;
const LAUNCH_IDEMPOTENCY_MAX_ENTRIES = 500;

type SendLimiter = (key: string) => boolean;
type LaunchRequestBody = z.infer<typeof launchRequestSchema>;
type LaunchIdempotencyPayload = {
  agent: LaunchRequestBody["agent"];
  windowName: string | null;
  cwd: string | null;
  agentOptions: string[] | null;
  worktreePath: string | null;
  worktreeBranch: string | null;
  worktreeCreateIfMissing: boolean;
  resumeSessionId: string | null;
  resumeFromPaneId: string | null;
  effectiveResumePolicy: LaunchResumePolicy | null;
};

export const createLaunchRoute = ({
  config,
  monitor,
  actions,
  sendLimiter,
  getLimiterKey,
}: {
  config: AgentMonitorConfig;
  monitor: SessionRouteDeps["monitor"];
  actions: SessionRouteDeps["actions"];
  sendLimiter: SendLimiter;
  getLimiterKey: SessionRouteDeps["getLimiterKey"];
}) => {
  const launchIdempotency = new Map<
    string,
    {
      expiresAtMs: number;
      payloadFingerprint: string;
      settled: boolean;
      wasSuccessful: boolean;
      promise: Promise<LaunchCommandResponse>;
    }
  >();

  const pruneLaunchIdempotency = () => {
    const nowMs = Date.now();
    for (const [key, value] of launchIdempotency.entries()) {
      if (value.expiresAtMs <= nowMs) {
        launchIdempotency.delete(key);
      }
    }
  };

  const launchResponseWithRollback = (
    errorCode: "INVALID_PAYLOAD" | "RATE_LIMIT" | "INTERNAL",
    message: string,
    resume: LaunchResumeMeta | null,
  ): LaunchCommandResponse => {
    if (resume) {
      return {
        ok: false,
        error: buildError(errorCode, message),
        rollback: { attempted: false, ok: true },
        resume,
      };
    }
    return {
      ok: false,
      error: buildError(errorCode, message),
      rollback: { attempted: false, ok: true },
    };
  };

  const normalizeResumeText = (value: string | undefined) => {
    const normalized = value?.trim();
    return normalized && normalized.length > 0 ? normalized : null;
  };

  const resolveEffectiveResumePolicy = (
    body: LaunchRequestBody,
    resumeRequested: boolean,
  ): LaunchResumePolicy | null => {
    if (!resumeRequested) {
      return null;
    }
    if (body.resumePolicy) {
      return body.resumePolicy;
    }
    if (normalizeResumeText(body.resumeSessionId)) {
      return "required";
    }
    return "best_effort";
  };

  const toLaunchIdempotencyPayload = (
    body: LaunchRequestBody,
    effectiveResumePolicy: LaunchResumePolicy | null,
  ): LaunchIdempotencyPayload => ({
    agent: body.agent,
    windowName: body.windowName ?? null,
    cwd: body.cwd ?? null,
    agentOptions: body.agentOptions ?? null,
    worktreePath: body.worktreePath ?? null,
    worktreeBranch: body.worktreeBranch ?? null,
    worktreeCreateIfMissing: body.worktreeCreateIfMissing === true,
    resumeSessionId: normalizeResumeText(body.resumeSessionId),
    resumeFromPaneId: normalizeResumeText(body.resumeFromPaneId),
    effectiveResumePolicy,
  });

  const createUnsupportedResumeMeta = (policy: LaunchResumePolicy | null): LaunchResumeMeta => ({
    requested: true,
    reused: false,
    sessionId: null,
    source: null,
    confidence: "none",
    policy,
    failureReason: "unsupported",
  });

  const executeLaunchAgentCommand = async (
    body: LaunchRequestBody,
    limiterKey: string,
  ): Promise<LaunchCommandResponse> => {
    const resumeRequested = Boolean(
      normalizeResumeText(body.resumeSessionId) || normalizeResumeText(body.resumeFromPaneId),
    );
    const effectiveResumePolicy = resolveEffectiveResumePolicy(body, resumeRequested);

    const resumePlan = await resolveLaunchResumePlan({
      requestAgent: body.agent,
      resumeSessionId: body.resumeSessionId,
      resumeFromPaneId: body.resumeFromPaneId,
      resumePolicy: effectiveResumePolicy ?? undefined,
      getPaneDetail: (paneId) => monitor.registry.getDetail(paneId),
    });

    if (resumePlan.requested && config.multiplexer.backend !== "tmux") {
      return {
        ok: false,
        error: buildError("TMUX_UNAVAILABLE", "launch-agent requires tmux backend"),
        rollback: { attempted: false, ok: true },
        resume: createUnsupportedResumeMeta(resumePlan.effectivePolicy),
      };
    }
    if (resumePlan.requested && resumePlan.error) {
      return {
        ok: false,
        error: resumePlan.error,
        rollback: { attempted: false, ok: true },
        resume: resumePlan.meta,
      };
    }

    pruneLaunchIdempotency();
    const cacheKey = `${body.sessionName}:${body.requestId}`;
    const payloadFingerprint = JSON.stringify(
      toLaunchIdempotencyPayload(body, effectiveResumePolicy),
    );
    const nowMs = Date.now();
    const cached = launchIdempotency.get(cacheKey);
    if (cached && cached.expiresAtMs > nowMs) {
      if (cached.payloadFingerprint !== payloadFingerprint) {
        return launchResponseWithRollback(
          "INVALID_PAYLOAD",
          "requestId payload mismatch",
          resumePlan.meta,
        );
      }
      if (!cached.settled || cached.wasSuccessful) {
        return cached.promise;
      }
      launchIdempotency.delete(cacheKey);
    } else if (cached) {
      launchIdempotency.delete(cacheKey);
    }

    if (!sendLimiter(limiterKey)) {
      return launchResponseWithRollback("RATE_LIMIT", "rate limited", resumePlan.meta);
    }

    const entry: {
      expiresAtMs: number;
      payloadFingerprint: string;
      settled: boolean;
      wasSuccessful: boolean;
      promise: Promise<LaunchCommandResponse>;
    } = {
      expiresAtMs: nowMs + LAUNCH_IDEMPOTENCY_TTL_MS,
      payloadFingerprint,
      settled: false,
      wasSuccessful: false,
      promise: actions
        .launchAgentInSession({
          sessionName: body.sessionName,
          agent: body.agent,
          windowName: body.windowName,
          cwd: body.cwd,
          agentOptions: body.agentOptions,
          worktreePath: body.worktreePath,
          worktreeBranch: body.worktreeBranch,
          worktreeCreateIfMissing: body.worktreeCreateIfMissing,
          resumeSessionId: resumePlan.resolvedSessionId ?? undefined,
          resumeFromPaneId: body.resumeFromPaneId,
          resumePolicy: effectiveResumePolicy ?? undefined,
        })
        .then((response) => {
          const isUnsupported = !response.ok && response.error.code === "TMUX_UNAVAILABLE";
          const withResumeMeta =
            resumePlan.requested && isUnsupported
              ? { ...response, resume: createUnsupportedResumeMeta(resumePlan.effectivePolicy) }
              : resumePlan.requested
                ? { ...response, resume: resumePlan.meta }
                : response;
          entry.settled = true;
          entry.wasSuccessful = withResumeMeta.ok;
          if (!withResumeMeta.ok) {
            launchIdempotency.delete(cacheKey);
          }
          return withResumeMeta;
        })
        .catch((error) => {
          launchIdempotency.delete(cacheKey);
          return launchResponseWithRollback(
            "INTERNAL",
            toErrorMessage(error, "launch command failed"),
            resumePlan.meta,
          );
        }),
    };

    setMapEntryWithLimit(launchIdempotency, cacheKey, entry, LAUNCH_IDEMPOTENCY_MAX_ENTRIES);
    return entry.promise;
  };

  return new Hono().post("/sessions/launch", zValidator("json", launchRequestSchema), async (c) => {
    const body = c.req.valid("json");
    const command = await executeLaunchAgentCommand(body, getLimiterKey(c));
    return c.json({ command });
  });
};
