import type { RepoFileContent, RepoFileSearchPage } from "@vde-monitor/shared";
import type { SetStateAction } from "react";

import type { LogFileCandidateItem } from "./useSessionFiles-log-resolve-state";

type SessionFilesUiStateKey = keyof SessionFilesUiState;

type SessionFilesUiState = {
  selectedFilePath: string | null;
  searchQuery: string;
  searchResult: RepoFileSearchPage | null;
  searchLoading: boolean;
  searchError: string | null;
  searchActiveIndex: number;
  fileModalOpen: boolean;
  fileModalPath: string | null;
  fileModalLoading: boolean;
  fileModalError: string | null;
  fileModalFile: RepoFileContent | null;
  fileModalMarkdownViewMode: "code" | "preview" | "diff";
  fileModalShowLineNumbers: boolean;
  fileModalCopiedPath: boolean;
  fileModalCopyError: string | null;
  fileModalHighlightLine: number | null;
  fileResolveError: string | null;
  logFileCandidateModalOpen: boolean;
  logFileCandidateReference: string | null;
  logFileCandidatePaneId: string | null;
  logFileCandidateLine: number | null;
  logFileCandidateItems: LogFileCandidateItem[];
};

type SessionFilesUiAction =
  | { type: "set"; key: SessionFilesUiStateKey; value: unknown }
  | { type: "reset" };

const applySetStateAction = <T>(prev: T, action: unknown): T => {
  if (typeof action === "function") {
    return (action as (current: T) => T)(prev);
  }
  return action as T;
};

export const createInitialSessionFilesUiState = (): SessionFilesUiState => ({
  selectedFilePath: null,
  searchQuery: "",
  searchResult: null,
  searchLoading: false,
  searchError: null,
  searchActiveIndex: 0,
  fileModalOpen: false,
  fileModalPath: null,
  fileModalLoading: false,
  fileModalError: null,
  fileModalFile: null,
  fileModalMarkdownViewMode: "code",
  fileModalShowLineNumbers: true,
  fileModalCopiedPath: false,
  fileModalCopyError: null,
  fileModalHighlightLine: null,
  fileResolveError: null,
  logFileCandidateModalOpen: false,
  logFileCandidateReference: null,
  logFileCandidatePaneId: null,
  logFileCandidateLine: null,
  logFileCandidateItems: [],
});

export const reduceSessionFilesUiState = (
  state: SessionFilesUiState,
  action: SessionFilesUiAction,
): SessionFilesUiState => {
  if (action.type === "reset") {
    return createInitialSessionFilesUiState();
  }

  const key = action.key;
  const previousValue = state[key];
  const nextValue = applySetStateAction(previousValue as never, action.value);
  if (Object.is(previousValue, nextValue)) {
    return state;
  }
  return {
    ...state,
    [key]: nextValue,
  };
};

export const createSessionFilesUiSetter = <T>({
  dispatch,
  key,
}: {
  dispatch: (action: SessionFilesUiAction) => void;
  key: SessionFilesUiStateKey;
}) => {
  return (value: SetStateAction<T>) => {
    dispatch({
      type: "set",
      key,
      value,
    });
  };
};
