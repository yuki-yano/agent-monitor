import { stat } from "node:fs/promises";

import type {
  AgentMonitorConfig,
  ApiError,
  LaunchAgent,
  LaunchAgentResult,
  LaunchCommandResponse,
  LaunchRollback,
  LaunchVerification,
} from "@vde-monitor/shared";
import type { TmuxAdapter } from "@vde-monitor/tmux";
import { execa } from "execa";

import { buildError } from "../errors";
import { resolveVwWorktreeSnapshotCached } from "../monitor/vw-worktree";
import { normalizeAbsolutePath } from "../path-normalization";
import type { ActionResult, ActionResultHelpers } from "./action-results";

const LAUNCH_VERIFY_INTERVAL_MS = 200;
const LAUNCH_VERIFY_MAX_ATTEMPTS = 5;

type CreateLaunchActionsParams = {
  adapter: TmuxAdapter;
  config: AgentMonitorConfig;
  actionResults: ActionResultHelpers;
  exitCopyModeIfNeeded: (paneId: string) => Promise<void>;
  sendEnterKey: (paneId: string) => Promise<ActionResult>;
};

type LaunchResult = LaunchCommandResponse;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const createLaunchActions = ({
  adapter,
  config,
  actionResults,
  exitCopyModeIfNeeded,
  sendEnterKey,
}: CreateLaunchActionsParams) => {
  const { internalError } = actionResults;

  const normalizeOptionalText = (value?: string) => {
    const normalized = value?.trim();
    return normalized && normalized.length > 0 ? normalized : undefined;
  };

  const containsNulOrLineBreak = (value: string) =>
    value.includes("\0") || value.includes("\r") || value.includes("\n") || value.includes("\t");

  const validateWindowName = (value: string | undefined): ApiError | null => {
    if (!value) {
      return null;
    }
    if (containsNulOrLineBreak(value)) {
      return buildError("INVALID_PAYLOAD", "windowName must not include control characters");
    }
    return null;
  };

  const validateCwd = async (value: string | undefined): Promise<ApiError | null> => {
    if (!value) {
      return null;
    }
    try {
      const stats = await stat(value);
      if (!stats.isDirectory()) {
        return buildError("INVALID_PAYLOAD", "cwd must be a directory");
      }
      return null;
    } catch {
      return buildError("INVALID_PAYLOAD", "cwd does not exist");
    }
  };

  const normalizePathValue = (value: string): string => {
    const normalized = normalizeAbsolutePath(value);
    if (normalized) {
      return normalized;
    }
    return normalizeAbsolutePath(process.cwd()) ?? process.cwd();
  };

  const resolveSessionSnapshotCwd = async (
    sessionName: string,
  ): Promise<{ ok: true; cwd: string } | { ok: false; error: ApiError }> => {
    const listed = await adapter.run([
      "list-panes",
      "-t",
      sessionName,
      "-F",
      "#{pane_current_path}",
    ]);
    if (listed.exitCode !== 0) {
      return {
        ok: false,
        error: buildError("INTERNAL", listed.stderr || "failed to inspect session pane cwd"),
      };
    }
    const firstPath =
      listed.stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line.length > 0) ?? null;
    if (!firstPath) {
      return {
        ok: false,
        error: buildError("INVALID_PAYLOAD", "failed to resolve session current path"),
      };
    }
    return { ok: true, cwd: firstPath };
  };

  const resolveWorktreeCwd = async ({
    sessionName,
    worktreePath,
    worktreeBranch,
    worktreeCreateIfMissing,
  }: {
    sessionName: string;
    worktreePath?: string;
    worktreeBranch?: string;
    worktreeCreateIfMissing: boolean;
  }): Promise<{ ok: true; cwd?: string } | { ok: false; error: ApiError }> => {
    if (!worktreePath && !worktreeBranch && !worktreeCreateIfMissing) {
      return { ok: true, cwd: undefined };
    }

    const snapshotCwd = await resolveSessionSnapshotCwd(sessionName);
    if (!snapshotCwd.ok) {
      return snapshotCwd;
    }

    const snapshot = await resolveVwWorktreeSnapshotCached(snapshotCwd.cwd, { ghMode: "never" });
    if (!snapshot) {
      return {
        ok: false,
        error: buildError("INVALID_PAYLOAD", "vw worktree snapshot is unavailable"),
      };
    }

    const normalizedPath = worktreePath ? normalizePathValue(worktreePath) : undefined;
    const matchedByPath = normalizedPath
      ? (snapshot.entries.find((entry) => normalizePathValue(entry.path) === normalizedPath) ??
        null)
      : null;
    if (normalizedPath && !matchedByPath) {
      return {
        ok: false,
        error: buildError("INVALID_PAYLOAD", `worktree path not found: ${normalizedPath}`),
      };
    }

    const matchedByBranch = worktreeBranch
      ? (snapshot.entries.find((entry) => entry.branch === worktreeBranch) ?? null)
      : null;
    if (worktreeBranch && !matchedByBranch && !worktreeCreateIfMissing) {
      return {
        ok: false,
        error: buildError("INVALID_PAYLOAD", `worktree branch not found: ${worktreeBranch}`),
      };
    }

    if (matchedByPath && matchedByBranch && matchedByPath.path !== matchedByBranch.path) {
      return {
        ok: false,
        error: buildError(
          "INVALID_PAYLOAD",
          "worktreePath and worktreeBranch resolved to different worktrees",
        ),
      };
    }

    if (worktreeBranch && !matchedByBranch && worktreeCreateIfMissing) {
      const repoRoot = snapshot.repoRoot ? normalizePathValue(snapshot.repoRoot) : null;
      if (!repoRoot) {
        return {
          ok: false,
          error: buildError("INVALID_PAYLOAD", "repo root is unavailable for vw worktree creation"),
        };
      }

      const currentBranch = await execa("vw", ["branch", "--show-current"], {
        cwd: repoRoot,
        reject: false,
        timeout: 5000,
        maxBuffer: 2_000_000,
      });
      const previousBranch =
        currentBranch.exitCode === 0 ? normalizeOptionalText(currentBranch.stdout) : undefined;
      const rollbackSwitchedBranch = async () => {
        if (!previousBranch || previousBranch === worktreeBranch) {
          return;
        }
        await execa("vw", ["switch", previousBranch], {
          cwd: repoRoot,
          reject: false,
          timeout: 15_000,
          maxBuffer: 2_000_000,
        });
      };

      const switched = await execa("vw", ["switch", worktreeBranch], {
        cwd: repoRoot,
        reject: false,
        timeout: 15_000,
        maxBuffer: 2_000_000,
      });
      if (switched.exitCode !== 0) {
        const message = (switched.stderr || switched.stdout || "vw switch failed").trim();
        return {
          ok: false,
          error: buildError("INVALID_PAYLOAD", `vw switch failed: ${message}`),
        };
      }

      const resolvedPath = await execa("vw", ["path", worktreeBranch], {
        cwd: repoRoot,
        reject: false,
        timeout: 5000,
        maxBuffer: 2_000_000,
      });
      if (resolvedPath.exitCode !== 0) {
        await rollbackSwitchedBranch();
        const message = (resolvedPath.stderr || resolvedPath.stdout || "vw path failed").trim();
        return {
          ok: false,
          error: buildError("INVALID_PAYLOAD", `vw path failed: ${message}`),
        };
      }

      const nextCwd = normalizeOptionalText(resolvedPath.stdout);
      if (!nextCwd) {
        await rollbackSwitchedBranch();
        return {
          ok: false,
          error: buildError("INVALID_PAYLOAD", "vw path returned an empty path"),
        };
      }
      return { ok: true, cwd: normalizePathValue(nextCwd) };
    }

    const resolvedCwd = matchedByPath?.path ?? matchedByBranch?.path;
    return { ok: true, cwd: resolvedCwd };
  };

  const normalizeLaunchOptions = (options?: string[]) => {
    if (!options) {
      return undefined;
    }
    return options.filter((option) => option.trim().length > 0);
  };

  const validateLaunchOptions = (options: string[] | undefined): ApiError | null => {
    if (!options) {
      return null;
    }
    if (options.some((option) => option.length > 256 || containsNulOrLineBreak(option))) {
      return buildError("INVALID_PAYLOAD", "agent options include an invalid value");
    }
    return null;
  };

  const resolveConfiguredLaunchOptions = (agent: LaunchAgent, optionsOverride?: string[]) => {
    const sourceOptions = optionsOverride ?? config.launch.agents[agent].options ?? [];
    return sourceOptions.filter((option) => option.trim().length > 0);
  };

  const buildLaunchCommandLine = (agent: LaunchAgent, options: string[]) =>
    [agent, ...options].join(" ");

  const assertSessionExists = async (sessionName: string): Promise<ApiError | null> => {
    const result = await adapter.run(["has-session", "-t", sessionName]);
    if (result.exitCode !== 0) {
      return buildError("NOT_FOUND", `session not found: ${sessionName}`);
    }
    return null;
  };

  const resolveUniqueWindowName = async ({
    sessionName,
    requestedName,
    agent,
  }: {
    sessionName: string;
    requestedName?: string;
    agent: LaunchAgent;
  }): Promise<{ ok: true; windowName: string } | { ok: false; error: ApiError }> => {
    const baseName = requestedName ?? `${agent}-work`;
    const listed = await adapter.run(["list-windows", "-t", sessionName, "-F", "#{window_name}"]);
    if (listed.exitCode !== 0) {
      return {
        ok: false,
        error: buildError("INTERNAL", listed.stderr || "failed to list windows"),
      };
    }
    const existingNames = new Set(
      listed.stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    );

    if (!existingNames.has(baseName)) {
      return { ok: true, windowName: baseName };
    }

    for (let suffix = 2; suffix <= 10_000; suffix += 1) {
      const candidate = `${baseName}-${suffix}`;
      if (!existingNames.has(candidate)) {
        return { ok: true, windowName: candidate };
      }
    }

    return {
      ok: false,
      error: buildError("INTERNAL", "failed to resolve unique window name"),
    };
  };

  const createDetachedWindow = async ({
    sessionName,
    windowName,
    cwd,
  }: {
    sessionName: string;
    windowName: string;
    cwd?: string;
  }): Promise<
    | {
        ok: true;
        windowId: string;
        windowIndex: number;
        windowName: string;
        paneId: string;
      }
    | { ok: false; error: ApiError }
  > => {
    const args = [
      "new-window",
      "-d",
      "-P",
      "-F",
      "#{window_id}\t#{window_index}\t#{window_name}\t#{pane_id}",
      "-t",
      sessionName,
      "-n",
      windowName,
    ];
    if (cwd) {
      args.push("-c", cwd);
    }
    const created = await adapter.run(args);
    if (created.exitCode !== 0) {
      return {
        ok: false,
        error: buildError("INTERNAL", created.stderr || "failed to create tmux window"),
      };
    }
    const firstLine = created.stdout.split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";
    const [windowId, indexRaw, resolvedWindowName, paneId] = firstLine.split("\t");
    if (!windowId || !indexRaw || !resolvedWindowName || !paneId) {
      return {
        ok: false,
        error: buildError("INTERNAL", "unexpected tmux new-window output"),
      };
    }
    const windowIndex = Number.parseInt(indexRaw, 10);
    if (Number.isNaN(windowIndex)) {
      return {
        ok: false,
        error: buildError("INTERNAL", "invalid tmux window index"),
      };
    }
    return {
      ok: true,
      windowId,
      windowIndex,
      windowName: resolvedWindowName,
      paneId,
    };
  };

  const sendLaunchCommand = async ({
    paneId,
    agent,
    options,
  }: {
    paneId: string;
    agent: LaunchAgent;
    options: string[];
  }) => {
    await exitCopyModeIfNeeded(paneId);
    const commandLine = buildLaunchCommandLine(agent, options);
    const sendResult = await adapter.run(["send-keys", "-l", "-t", paneId, "--", commandLine]);
    if (sendResult.exitCode !== 0) {
      return internalError(sendResult.stderr || "send-keys launch command failed");
    }
    return sendEnterKey(paneId);
  };

  const verifyLaunch = async ({
    paneId,
    agent,
  }: {
    paneId: string;
    agent: LaunchAgent;
  }): Promise<LaunchVerification> => {
    let observedCommand: string | null = null;

    for (let attempt = 1; attempt <= LAUNCH_VERIFY_MAX_ATTEMPTS; attempt += 1) {
      const result = await adapter.run([
        "list-panes",
        "-t",
        paneId,
        "-F",
        "#{pane_current_command}",
      ]);
      if (result.exitCode === 0) {
        const currentCommand =
          result.stdout
            .split(/\r?\n/)
            .map((line) => line.trim())
            .find((line) => line.length > 0) ?? null;
        observedCommand = currentCommand;
        if (currentCommand === agent) {
          return {
            status: "verified",
            observedCommand: currentCommand,
            attempts: attempt,
          };
        }
      }

      if (attempt < LAUNCH_VERIFY_MAX_ATTEMPTS) {
        await sleep(LAUNCH_VERIFY_INTERVAL_MS);
      }
    }

    if (observedCommand) {
      return {
        status: "mismatch",
        observedCommand,
        attempts: LAUNCH_VERIFY_MAX_ATTEMPTS,
      };
    }
    return {
      status: "timeout",
      observedCommand: null,
      attempts: LAUNCH_VERIFY_MAX_ATTEMPTS,
    };
  };

  const rollbackCreatedWindow = async (windowId: string): Promise<LaunchRollback> => {
    const result = await adapter.run(["kill-window", "-t", windowId]);
    if (result.exitCode === 0) {
      return { attempted: true, ok: true };
    }
    return {
      attempted: true,
      ok: false,
      message: result.stderr || "failed to rollback created window",
    };
  };

  const defaultLaunchRollback = (): LaunchRollback => ({ attempted: false, ok: true });

  const launchError = (error: ApiError, rollback: LaunchRollback): LaunchResult => ({
    ok: false,
    error,
    rollback,
  });

  const launchSuccess = (result: LaunchAgentResult): LaunchResult => ({
    ok: true,
    result,
    rollback: defaultLaunchRollback(),
  });

  const launchAgentInSession = async ({
    sessionName,
    agent,
    windowName,
    cwd,
    agentOptions,
    worktreePath,
    worktreeBranch,
    worktreeCreateIfMissing,
  }: {
    sessionName: string;
    agent: LaunchAgent;
    requestId?: string;
    windowName?: string;
    cwd?: string;
    agentOptions?: string[];
    worktreePath?: string;
    worktreeBranch?: string;
    worktreeCreateIfMissing?: boolean;
  }): Promise<LaunchResult> => {
    const normalizedSessionName = sessionName.trim();
    if (!normalizedSessionName) {
      return launchError(
        buildError("INVALID_PAYLOAD", "sessionName is required"),
        defaultLaunchRollback(),
      );
    }

    const normalizedWindowName = normalizeOptionalText(windowName);
    const windowNameError = validateWindowName(normalizedWindowName);
    if (windowNameError) {
      return launchError(windowNameError, defaultLaunchRollback());
    }

    const normalizedCwd = normalizeOptionalText(cwd);
    const normalizedAgentOptions = normalizeLaunchOptions(agentOptions);
    const normalizedAgentOptionsError = validateLaunchOptions(normalizedAgentOptions);
    if (normalizedAgentOptionsError) {
      return launchError(normalizedAgentOptionsError, defaultLaunchRollback());
    }
    const normalizedWorktreePath = normalizeOptionalText(worktreePath);
    const normalizedWorktreeBranch = normalizeOptionalText(worktreeBranch);
    const normalizedWorktreeCreateIfMissing = worktreeCreateIfMissing === true;
    if (
      normalizedCwd &&
      (normalizedWorktreePath || normalizedWorktreeBranch || normalizedWorktreeCreateIfMissing)
    ) {
      return launchError(
        buildError(
          "INVALID_PAYLOAD",
          "cwd cannot be combined with worktreePath/worktreeBranch/worktreeCreateIfMissing",
        ),
        defaultLaunchRollback(),
      );
    }

    if (normalizedWorktreeCreateIfMissing && normalizedWorktreePath) {
      return launchError(
        buildError(
          "INVALID_PAYLOAD",
          "worktreePath cannot be combined with worktreeCreateIfMissing",
        ),
        defaultLaunchRollback(),
      );
    }

    if (normalizedWorktreeCreateIfMissing && !normalizedWorktreeBranch) {
      return launchError(
        buildError(
          "INVALID_PAYLOAD",
          "worktreeBranch is required when worktreeCreateIfMissing is true",
        ),
        defaultLaunchRollback(),
      );
    }

    const sessionError = await assertSessionExists(normalizedSessionName);
    if (sessionError) {
      return launchError(sessionError, defaultLaunchRollback());
    }

    const resolvedWorktreeCwd = await resolveWorktreeCwd({
      sessionName: normalizedSessionName,
      worktreePath: normalizedWorktreePath,
      worktreeBranch: normalizedWorktreeBranch,
      worktreeCreateIfMissing: normalizedWorktreeCreateIfMissing,
    });
    if (!resolvedWorktreeCwd.ok) {
      return launchError(resolvedWorktreeCwd.error, defaultLaunchRollback());
    }
    const finalCwd = normalizedCwd ?? resolvedWorktreeCwd.cwd;
    const cwdError = await validateCwd(finalCwd);
    if (cwdError) {
      return launchError(cwdError, defaultLaunchRollback());
    }

    const resolvedWindowName = await resolveUniqueWindowName({
      sessionName: normalizedSessionName,
      requestedName: normalizedWindowName,
      agent,
    });
    if (!resolvedWindowName.ok) {
      return launchError(resolvedWindowName.error, defaultLaunchRollback());
    }

    const created = await createDetachedWindow({
      sessionName: normalizedSessionName,
      windowName: resolvedWindowName.windowName,
      cwd: finalCwd,
    });
    if (!created.ok) {
      return launchError(created.error, defaultLaunchRollback());
    }

    const resolvedOptions = resolveConfiguredLaunchOptions(agent, normalizedAgentOptions);
    const resolvedOptionsError = validateLaunchOptions(resolvedOptions);
    if (resolvedOptionsError) {
      const rollback = await rollbackCreatedWindow(created.windowId);
      return launchError(resolvedOptionsError, rollback);
    }
    const sendResult = await sendLaunchCommand({
      paneId: created.paneId,
      agent,
      options: resolvedOptions,
    });
    if (!sendResult.ok) {
      const rollback = await rollbackCreatedWindow(created.windowId);
      return launchError(sendResult.error, rollback);
    }

    const verification = await verifyLaunch({ paneId: created.paneId, agent });
    return launchSuccess({
      sessionName: normalizedSessionName,
      agent,
      windowId: created.windowId,
      windowIndex: created.windowIndex,
      windowName: created.windowName,
      paneId: created.paneId,
      launchedCommand: agent,
      resolvedOptions,
      verification,
    });
  };

  return {
    launchAgentInSession,
  };
};
