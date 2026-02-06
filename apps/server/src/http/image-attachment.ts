import { randomBytes } from "node:crypto";
import { chmod, lstat, mkdir, open, readdir, realpath, stat, unlink } from "node:fs/promises";
import path from "node:path";

import { encodePaneId } from "@vde-monitor/shared";

export const IMAGE_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
export const IMAGE_ATTACHMENT_CONTENT_LENGTH_GRACE_BYTES = 64 * 1024;
export const IMAGE_ATTACHMENT_MAX_CONTENT_LENGTH_BYTES =
  IMAGE_ATTACHMENT_MAX_BYTES + IMAGE_ATTACHMENT_CONTENT_LENGTH_GRACE_BYTES;
const ATTACHMENT_TTL_MS = 24 * 60 * 60 * 1000;
const ATTACHMENT_SUBDIR = path.join("vde-monitor", "attachments");

const ALLOWED_MIME_TO_EXT = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

type AllowedImageMimeType = keyof typeof ALLOWED_MIME_TO_EXT;

type ImageAttachmentErrorCode = "INVALID_PAYLOAD" | "INTERNAL";
type ImageAttachmentStatus = 400 | 500;

const isNodeError = (value: unknown): value is NodeJS.ErrnoException =>
  value instanceof Error && "code" in value;

const isNotFoundError = (value: unknown) => isNodeError(value) && value.code === "ENOENT";

const isPathWithin = (basePath: string, targetPath: string) => {
  const relative = path.relative(basePath, targetPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
};

const formatUtcTimestamp = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  const second = String(date.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hour}${minute}${second}`;
};

const resolveBaseTmpDir = () => {
  const envTmp = process.env.TMPDIR?.trim();
  if (envTmp && envTmp.length > 0) {
    return envTmp;
  }
  return "/tmp";
};

const assertPathWithin = (basePath: string, targetPath: string, message: string) => {
  if (!isPathWithin(basePath, targetPath)) {
    throw ImageAttachmentError.invalidPayload(message);
  }
};

const assertNoGitMarkerInAncestors = async (startPath: string) => {
  let current = startPath;
  while (true) {
    const gitMarker = path.join(current, ".git");
    try {
      const markerStat = await lstat(gitMarker);
      if (markerStat.isDirectory() || markerStat.isFile()) {
        throw ImageAttachmentError.invalidPayload("TMPDIR cannot be under git-managed path");
      }
    } catch (error) {
      if (error instanceof ImageAttachmentError) {
        throw error;
      }
      if (!isNotFoundError(error)) {
        throw ImageAttachmentError.internal("failed to inspect TMPDIR safety", error);
      }
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return;
    }
    current = parent;
  }
};

const assertNoSymlinkOnExistingPath = async (basePath: string, targetPath: string) => {
  assertPathWithin(basePath, targetPath, "path safety violation");
  const relative = path.relative(basePath, targetPath);
  if (relative === "") {
    return;
  }
  const segments = relative.split(path.sep).filter((segment) => segment.length > 0);
  let current = basePath;
  for (const segment of segments) {
    current = path.join(current, segment);
    try {
      const fileStat = await lstat(current);
      if (fileStat.isSymbolicLink()) {
        throw ImageAttachmentError.invalidPayload("symlink is not allowed in attachment path");
      }
    } catch (error) {
      if (isNotFoundError(error)) {
        return;
      }
      if (error instanceof ImageAttachmentError) {
        throw error;
      }
      throw ImageAttachmentError.internal("failed to inspect attachment path", error);
    }
  }
};

const cleanupExpiredFiles = async (paneDir: string, nowMs: number) => {
  let entries: string[];
  try {
    entries = await readdir(paneDir);
  } catch (error) {
    if (isNotFoundError(error)) {
      return;
    }
    throw ImageAttachmentError.internal("failed to read attachment directory", error);
  }

  const cutoff = nowMs - ATTACHMENT_TTL_MS;
  await Promise.all(
    entries.map(async (entryName) => {
      const filePath = path.join(paneDir, entryName);
      try {
        const fileStat = await stat(filePath);
        if (!fileStat.isFile() || fileStat.mtimeMs >= cutoff) {
          return;
        }
        await unlink(filePath);
      } catch {
        // Cleanup is best effort and must not block upload.
      }
    }),
  );
};

const toAllowedMimeType = (mimeType: string): AllowedImageMimeType => {
  if (mimeType in ALLOWED_MIME_TO_EXT) {
    return mimeType as AllowedImageMimeType;
  }
  throw ImageAttachmentError.invalidPayload("unsupported image MIME type");
};

const createFileName = (mimeType: AllowedImageMimeType, now: Date) => {
  const ext = ALLOWED_MIME_TO_EXT[mimeType];
  const timestamp = formatUtcTimestamp(now);
  const random = randomBytes(4).toString("hex");
  return `mobile-${timestamp}-${random}.${ext}`;
};

export class ImageAttachmentError extends Error {
  readonly status: ImageAttachmentStatus;
  readonly code: ImageAttachmentErrorCode;

  private constructor({
    status,
    code,
    message,
    cause,
  }: {
    status: ImageAttachmentStatus;
    code: ImageAttachmentErrorCode;
    message: string;
    cause?: unknown;
  }) {
    super(message, { cause });
    this.name = "ImageAttachmentError";
    this.status = status;
    this.code = code;
  }

  static invalidPayload(message: string) {
    return new ImageAttachmentError({
      status: 400,
      code: "INVALID_PAYLOAD",
      message,
    });
  }

  static internal(message: string, cause?: unknown) {
    return new ImageAttachmentError({
      status: 500,
      code: "INTERNAL",
      message,
      cause,
    });
  }
}

export type SaveImageAttachmentInput = {
  paneId: string;
  repoRoot: string | null;
  file: File;
  now?: Date;
};

export type SaveImageAttachmentResult = {
  path: string;
  mimeType: AllowedImageMimeType;
  size: number;
  createdAt: string;
  insertText: string;
};

export const saveImageAttachment = async ({
  paneId,
  repoRoot,
  file,
  now = new Date(),
}: SaveImageAttachmentInput): Promise<SaveImageAttachmentResult> => {
  if (!(file instanceof File)) {
    throw ImageAttachmentError.invalidPayload("image is required");
  }
  const mimeType = toAllowedMimeType(file.type);
  if (!Number.isFinite(file.size) || file.size < 1 || file.size > IMAGE_ATTACHMENT_MAX_BYTES) {
    throw ImageAttachmentError.invalidPayload("image size must be between 1 byte and 10MB");
  }

  const baseTmp = resolveBaseTmpDir();
  const resolvedBaseTmp = path.resolve(baseTmp);
  let realBaseTmp: string;
  try {
    realBaseTmp = await realpath(resolvedBaseTmp);
  } catch (error) {
    throw ImageAttachmentError.internal("failed to resolve TMPDIR", error);
  }

  await assertNoGitMarkerInAncestors(realBaseTmp);

  const attachmentRoot = path.resolve(realBaseTmp, ATTACHMENT_SUBDIR);
  await assertNoSymlinkOnExistingPath(realBaseTmp, attachmentRoot);

  try {
    await mkdir(attachmentRoot, { recursive: true, mode: 0o700 });
  } catch (error) {
    throw ImageAttachmentError.internal("failed to create attachment root", error);
  }

  let realAttachmentRoot: string;
  try {
    realAttachmentRoot = await realpath(attachmentRoot);
  } catch (error) {
    throw ImageAttachmentError.internal("failed to resolve attachment root", error);
  }
  assertPathWithin(realBaseTmp, realAttachmentRoot, "attachment root escapes TMPDIR");

  const paneDir = path.resolve(realAttachmentRoot, encodePaneId(paneId));
  assertPathWithin(realAttachmentRoot, paneDir, "invalid pane attachment path");
  await assertNoSymlinkOnExistingPath(realAttachmentRoot, paneDir);

  try {
    await mkdir(paneDir, { recursive: true, mode: 0o700 });
  } catch (error) {
    throw ImageAttachmentError.internal("failed to create pane attachment directory", error);
  }

  let realPaneDir: string;
  try {
    realPaneDir = await realpath(paneDir);
  } catch (error) {
    throw ImageAttachmentError.internal("failed to resolve pane attachment directory", error);
  }
  assertPathWithin(realAttachmentRoot, realPaneDir, "pane attachment directory escapes root");
  await assertNoSymlinkOnExistingPath(realAttachmentRoot, realPaneDir);

  await cleanupExpiredFiles(realPaneDir, now.getTime());

  const fileName = createFileName(mimeType, now);
  const finalPath = path.join(realPaneDir, fileName);

  if (repoRoot) {
    let realRepoRoot: string;
    try {
      realRepoRoot = await realpath(repoRoot);
    } catch (error) {
      throw ImageAttachmentError.internal("failed to resolve repo root", error);
    }
    let realFinalParent: string;
    try {
      realFinalParent = await realpath(path.dirname(finalPath));
    } catch (error) {
      throw ImageAttachmentError.internal("failed to resolve final attachment parent", error);
    }
    const finalCandidate = path.join(realFinalParent, path.basename(finalPath));
    if (isPathWithin(realRepoRoot, finalCandidate)) {
      throw ImageAttachmentError.invalidPayload("attachment path cannot be under repository path");
    }
  }

  await assertNoSymlinkOnExistingPath(realAttachmentRoot, path.dirname(finalPath));

  const payload = Buffer.from(await file.arrayBuffer());
  const fileHandle = await open(finalPath, "wx", 0o600).catch((error) => {
    throw ImageAttachmentError.internal("failed to create attachment file", error);
  });
  try {
    await fileHandle.writeFile(payload);
  } catch (error) {
    throw ImageAttachmentError.internal("failed to write attachment file", error);
  } finally {
    await fileHandle.close().catch(() => undefined);
  }
  await chmod(finalPath, 0o600).catch(() => undefined);

  return {
    path: finalPath,
    mimeType,
    size: payload.byteLength,
    createdAt: now.toISOString(),
    insertText: `${finalPath} `,
  };
};
