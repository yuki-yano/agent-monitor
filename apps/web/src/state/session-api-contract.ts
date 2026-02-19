import type {
  ApiClientContract,
  CommitFileQuery,
  CommitLogQuery,
  DiffFileQuery,
  ForceQuery,
  LaunchAgentJson,
  NoteIdParam,
  PaneHashParam,
  PaneParam,
  RepoFileContentQuery,
  RepoFileSearchQuery,
  RepoFileTreeQuery,
  RepoNotePayloadJson,
  ScreenRequestJson,
  SendKeysJson,
  SendRawJson,
  SendTextJson,
  SessionTitleJson,
  TimelineQuery,
  UploadImageForm,
} from "@vde-monitor/shared";
import { hc } from "hono/client";

export const createApiClient = (apiBasePath: string, authHeaders: Record<string, string>) =>
  hc(apiBasePath, {
    headers: authHeaders,
  }) as unknown as ApiClientContract;

export type {
  ApiClientContract,
  CommitFileQuery,
  CommitLogQuery,
  DiffFileQuery,
  ForceQuery,
  LaunchAgentJson,
  NoteIdParam,
  PaneHashParam,
  PaneParam,
  RepoFileContentQuery,
  RepoFileSearchQuery,
  RepoFileTreeQuery,
  RepoNotePayloadJson,
  ScreenRequestJson,
  SendKeysJson,
  SendRawJson,
  SendTextJson,
  SessionTitleJson,
  TimelineQuery,
  UploadImageForm,
};
