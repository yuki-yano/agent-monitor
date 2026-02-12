import type { Dirent } from "node:fs";
import fs from "node:fs/promises";

import type { RepoFileTreeNode, RepoFileTreePage } from "@vde-monitor/shared";

import type { FileVisibilityPolicy } from "./file-visibility-policy";
import { resolveRepoAbsolutePath } from "./path-guard";
import {
  createServiceError,
  isNotFoundError,
  isReadablePermissionError,
  isRepoFileServiceError,
} from "./service-context";
import { paginateItems } from "./service-pagination";
import { toDirectoryRelativePath } from "./service-visibility";

type ReadTreeDirectoryEntriesArgs = {
  repoRoot: string;
  basePath: string;
};

type BuildVisibleTreeNodesArgs = {
  entries: Dirent[];
  basePath: string;
  repoRoot: string;
  policy: FileVisibilityPolicy;
  resolveHasVisibleChildren: (input: {
    repoRoot: string;
    relativePath: string;
    policy: FileVisibilityPolicy;
  }) => Promise<boolean>;
};

type BuildListTreePageArgs = {
  basePath: string;
  nodes: RepoFileTreeNode[];
  cursor?: string;
  limit: number;
};

export const readTreeDirectoryEntries = async ({
  repoRoot,
  basePath,
}: ReadTreeDirectoryEntriesArgs) => {
  const absoluteBasePath = resolveRepoAbsolutePath(repoRoot, basePath);
  try {
    const stats = await fs.stat(absoluteBasePath);
    if (!stats.isDirectory()) {
      throw createServiceError("INVALID_PAYLOAD", 400, "path must point to a directory");
    }
    return await fs.readdir(absoluteBasePath, { withFileTypes: true });
  } catch (error) {
    if (isRepoFileServiceError(error)) {
      throw error;
    }
    if (isReadablePermissionError(error)) {
      throw createServiceError("PERMISSION_DENIED", 403, "permission denied");
    }
    if (isNotFoundError(error)) {
      throw createServiceError("NOT_FOUND", 404, "path not found");
    }
    throw error;
  }
};

export const buildVisibleTreeNodes = async ({
  entries,
  basePath,
  repoRoot,
  policy,
  resolveHasVisibleChildren,
}: BuildVisibleTreeNodesArgs): Promise<RepoFileTreeNode[]> => {
  const visibleNodes: RepoFileTreeNode[] = [];
  const sortedEntries = [...entries].sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of sortedEntries) {
    if (entry.isSymbolicLink()) {
      continue;
    }
    const relativePath = toDirectoryRelativePath(basePath, entry.name);
    if (entry.isDirectory()) {
      const include = policy.shouldIncludePath({ relativePath, isDirectory: true });
      if (!include) {
        continue;
      }
      const hasChildren = await resolveHasVisibleChildren({ repoRoot, relativePath, policy });
      visibleNodes.push({
        path: relativePath,
        name: entry.name,
        kind: "directory",
        hasChildren,
      });
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    if (!policy.shouldIncludePath({ relativePath, isDirectory: false })) {
      continue;
    }
    visibleNodes.push({
      path: relativePath,
      name: entry.name,
      kind: "file",
    });
  }

  return visibleNodes;
};

export const buildListTreePage = ({ basePath, nodes, cursor, limit }: BuildListTreePageArgs) => {
  const sortedNodes = [...nodes].sort((left, right) => left.name.localeCompare(right.name));
  const paged = paginateItems({
    allItems: sortedNodes,
    cursor,
    limit,
  });
  return {
    basePath,
    entries: paged.items,
    nextCursor: paged.nextCursor,
  } satisfies RepoFileTreePage;
};
