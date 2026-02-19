import type {
  AllowedKey,
  RawItem,
  SessionStateTimelineRange,
  SessionStateTimelineScope,
} from "./types";

export type ApiClientRequestOptions = {
  init?: RequestInit;
};

export type PaneParam = {
  paneId: string;
};

export type PaneHashParam = PaneParam & {
  hash: string;
};

export type NoteIdParam = PaneParam & {
  noteId: string;
};

export type ForceQuery = {
  force?: string;
  worktreePath?: string;
};

export type DiffFileQuery = ForceQuery & {
  path: string;
  rev?: string;
};

export type CommitLogQuery = ForceQuery & {
  limit?: string;
  skip?: string;
};

export type CommitFileQuery = ForceQuery & {
  path: string;
};

export type ScreenRequestJson = {
  mode?: "text" | "image";
  lines?: number;
  cursor?: string;
};

export type SendTextJson = {
  text: string;
  enter: boolean;
  requestId?: string;
};

export type SendKeysJson = {
  keys: AllowedKey[];
};

export type SendRawJson = {
  items: RawItem[];
  unsafe?: boolean;
};

export type LaunchAgentJson = {
  sessionName: string;
  agent: "codex" | "claude";
  requestId: string;
  windowName?: string;
  cwd?: string;
  agentOptions?: string[];
  worktreePath?: string;
  worktreeBranch?: string;
  worktreeCreateIfMissing?: boolean;
};

export type SessionTitleJson = {
  title: string | null;
};

export type UploadImageForm = {
  image: File;
};

export type TimelineQuery = {
  scope?: SessionStateTimelineScope;
  range?: SessionStateTimelineRange;
  limit?: string;
};

export type RepoNotePayloadJson = {
  title: string | null;
  body: string;
};

export type RepoFileTreeQuery = {
  path?: string;
  cursor?: string;
  limit?: string;
  worktreePath?: string;
};

export type RepoFileSearchQuery = {
  q: string;
  cursor?: string;
  limit?: string;
  worktreePath?: string;
};

export type RepoFileContentQuery = {
  path: string;
  maxBytes?: string;
  worktreePath?: string;
};

type ApiRequest<TArgs> = (args: TArgs, options?: ApiClientRequestOptions) => Promise<Response>;

type ApiRootGetRequest = (options?: ApiClientRequestOptions) => Promise<Response>;

type SessionApiClient = {
  focus: { $post: ApiRequest<{ param: PaneParam }> };
  kill: {
    pane: { $post: ApiRequest<{ param: PaneParam }> };
    window: { $post: ApiRequest<{ param: PaneParam }> };
  };
  send: {
    text: { $post: ApiRequest<{ param: PaneParam; json: SendTextJson }> };
    keys: { $post: ApiRequest<{ param: PaneParam; json: SendKeysJson }> };
    raw: { $post: ApiRequest<{ param: PaneParam; json: SendRawJson }> };
  };
  title: { $put: ApiRequest<{ param: PaneParam; json: SessionTitleJson }> };
  touch: { $post: ApiRequest<{ param: PaneParam }> };
  attachments: {
    image: { $post: ApiRequest<{ param: PaneParam; form: UploadImageForm }> };
  };
  screen: { $post: ApiRequest<{ param: PaneParam; json: ScreenRequestJson }> };
  diff: {
    $get: ApiRequest<{ param: PaneParam; query: ForceQuery }>;
    file: { $get: ApiRequest<{ param: PaneParam; query: DiffFileQuery }> };
  };
  commits: {
    $get: ApiRequest<{ param: PaneParam; query: CommitLogQuery }>;
    ":hash": {
      $get: ApiRequest<{ param: PaneHashParam; query: ForceQuery }>;
      file: { $get: ApiRequest<{ param: PaneHashParam; query: CommitFileQuery }> };
    };
  };
  timeline: { $get: ApiRequest<{ param: PaneParam; query: TimelineQuery }> };
  notes: {
    $get: ApiRequest<{ param: PaneParam }>;
    $post: ApiRequest<{ param: PaneParam; json: RepoNotePayloadJson }>;
    ":noteId": {
      $put: ApiRequest<{ param: NoteIdParam; json: RepoNotePayloadJson }>;
      $delete: ApiRequest<{ param: NoteIdParam }>;
    };
  };
  files: {
    tree: { $get: ApiRequest<{ param: PaneParam; query: RepoFileTreeQuery }> };
    search: { $get: ApiRequest<{ param: PaneParam; query: RepoFileSearchQuery }> };
    content: { $get: ApiRequest<{ param: PaneParam; query: RepoFileContentQuery }> };
  };
  worktrees: { $get: ApiRequest<{ param: PaneParam }> };
};

export type ApiClientContract = {
  sessions: {
    $get: ApiRootGetRequest;
    launch: { $post: ApiRequest<{ json: LaunchAgentJson }> };
    ":paneId": SessionApiClient;
  };
};
