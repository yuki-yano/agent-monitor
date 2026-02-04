import { Clock, FolderGit2 } from "lucide-react";

import { GlassPanel, GlowCard, LastInputPill, TagPill } from "@/components/ui";
import { formatRelativeTime, getLastInputTone } from "@/lib/session-format";
import type { SessionGroup } from "@/lib/session-group";

import { formatRepoName, formatRepoPath } from "../sessionListFormat";
import { SessionCard } from "./SessionCard";

type SessionGroupSectionProps = {
  group: SessionGroup;
  nowMs: number;
};

export const SessionGroupSection = ({ group, nowMs }: SessionGroupSectionProps) => {
  const groupTone = getLastInputTone(group.lastInputAt, nowMs);
  const repoName = formatRepoName(group.repoRoot);
  const repoPath = formatRepoPath(group.repoRoot);

  return (
    <GlowCard contentClassName="gap-3 sm:gap-4">
      <GlassPanel
        className="px-4 py-3 sm:px-5 sm:py-4"
        contentClassName="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="border-latte-surface2/70 from-latte-crust/70 via-latte-surface0/70 to-latte-mantle/80 relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-gradient-to-br">
            <div className="bg-latte-lavender/30 pointer-events-none absolute -bottom-3 -right-3 h-8 w-8 rounded-full blur-xl" />
            <FolderGit2 className="text-latte-lavender h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="font-display text-latte-text truncate text-lg font-semibold leading-snug">
              {repoName}
            </p>
            {repoPath && (
              <p className="text-latte-subtext0 truncate font-mono text-[11px] leading-normal">
                {repoPath}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <TagPill tone="neutral" className="text-[11px]">
            {group.sessions.length} sessions
          </TagPill>
          <LastInputPill
            tone={groupTone}
            label={<Clock className="h-3 w-3" />}
            srLabel="Latest input"
            value={formatRelativeTime(group.lastInputAt, nowMs)}
            size="xs"
            showDot={false}
            className="text-[10px]"
          />
        </div>
      </GlassPanel>
      <div className="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {group.sessions.map((session) => (
          <SessionCard key={session.paneId} session={session} nowMs={nowMs} />
        ))}
      </div>
    </GlowCard>
  );
};
