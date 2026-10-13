"use client";

import { useEffect, useMemo } from "react";
import { toErrorMessage } from "@/lib/errors";
import { readResponseJson } from "@/lib/http/json";
import { uploadMediaToStorage } from "@/lib/storage/client-upload";
import type { MediaUploadDir } from "@/lib/storage/media-upload";
import type { MediaUploadConfig } from "@/lib/storage/media-config";
import {
  extractThumbnailWithFfmpeg,
  extractVideoFrame,
} from "@/lib/videos/extractThumbnail";
import {
  needsWebTranscode,
  prepareVideoForWebUpload,
} from "@/lib/videos/transcode";

export { primePortfolioAudio, releasePortfolioAudio } from "@/lib/videos/transcode";
import type { VideoUploadProfile } from "@/lib/videos/profile";

export type MediaUploadStatus =
  | "idle"
  | "preparing"
  | "uploading"
  | "ready"
  | "error";

export type MediaUploadState = {
  status: MediaUploadStatus;
  progress: number;
  message: string;
  error: string | null;
};

export function idleMediaUpload(): MediaUploadState {
  return { status: "idle", progress: 0, message: "", error: null };
}

export function isMediaUploadBusy(state: MediaUploadState): boolean {
  return state.status === "preparing" || state.status === "uploading";
}

export function isMediaBlockingSave(
  file: File | null,
  state: MediaUploadState,
  required: boolean,
): boolean {
  if (!file && !required) return false;
  if (!file && required) return true;
  if (state.status === "error") return true;
  if (state.status === "ready") return false;
  return true;
}

export type PreparedUpload =
  | { kind: "remote"; url: string; file: File }
  | { kind: "file"; file: File };

export function preparedUploadUrl(upload: PreparedUpload | null): string | null {
  return upload?.kind === "remote" ? upload.url : null;
}

export type CaptureKind = "thumbnail" | "poster" | "none";

export class UploadAbortedError extends Error {
  constructor() {
    super("Upload aborted");
    this.name = "UploadAbortedError";
  }
}

export function isUploadAborted(error: unknown): boolean {
  return error instanceof UploadAbortedError;
}

export type PipelineProgress = {
  status: "preparing" | "uploading";
  message: string;
  progress?: number;
};

let configPromise: Promise<MediaUploadConfig> | null = null;

export async function getMediaUploadConfig(): Promise<MediaUploadConfig> {
  if (!configPromise) {
    configPromise = (async () => {
      const response = await fetch("/api/media/config");
      const config = await readResponseJson<MediaUploadConfig>(response);
      if (!response.ok) {
        throw new Error("Could not load upload settings.");
      }
      return config;
    })().catch((error: unknown) => {
      configPromise = null;
      throw error;
    });
  }
  return configPromise;
}

export async function captureVideoStill(
  file: File,
  capture: Exclude<CaptureKind, "none">,
  preparedPromise?: Promise<File>,
): Promise<File | null> {
  const quality = capture === "poster" ? 0.72 : 0.74;
  const tryFrame = async (source: File, allowPlay: boolean) => {
    try {
      return await extractVideoFrame(source, {
        mimeType: "image/jpeg",
        quality,
        allowPlay,
      });
    } catch (error) {
      console.warn(
        toErrorMessage(error, "Could not capture a thumbnail from the video."),
      );
      return null;
    }
  };

  let prepared: File | null = null;
  if (preparedPromise) {
    try {
      prepared = await preparedPromise;
    } catch (error) {
      console.warn(
        toErrorMessage(error, "Could not capture a thumbnail from the video."),
      );
    }
  }

  // Prefer the already-transcoded clip: iOS often refuses a second HEVC
  // decode of the original, and play() is blocked after the file-picker
  // gesture has expired.
  if (prepared) {
    const fromPrepared = await tryFrame(prepared, false);
    if (fromPrepared) return fromPrepared;
  }

  const fromOriginal = await tryFrame(file, !prepared);
  if (fromOriginal) return fromOriginal;

  const ffmpegSource = prepared ?? file;
  try {
    return await extractThumbnailWithFfmpeg(ffmpegSource);
  } catch (ffmpegError) {
    console.warn(
      toErrorMessage(
        ffmpegError,
        "Could not capture a thumbnail from the video.",
      ),
    );
    return null;
  }
}

async function toPreparedUpload(
  file: File,
  dir: MediaUploadDir,
  config: MediaUploadConfig,
  onProgress?: (percentage: number) => void,
): Promise<PreparedUpload> {
  if (!config.clientUpload) {
    return { kind: "file", file };
  }
  const url = await uploadMediaToStorage(
    file,
    dir,
    config.handleUploadUrl,
    onProgress,
  );
  return { kind: "remote", url, file };
}

export async function prepareAndUploadImage(options: {
  file: File;
  dir: MediaUploadDir;
  onProgress?: (update: PipelineProgress) => void;
  isCurrent?: () => boolean;
}): Promise<PreparedUpload> {
  const { file, dir, onProgress, isCurrent } = options;
  const assertCurrent = () => {
    if (isCurrent && !isCurrent()) throw new UploadAbortedError();
  };

  onProgress?.({ status: "preparing", message: "Preparing image…" });
  const config = await getMediaUploadConfig();
  assertCurrent();

  if (config.clientUpload) {
    onProgress?.({
      status: "uploading",
      message: "Uploading… 0%",
      progress: 0,
    });
  }

  const uploaded = await toPreparedUpload(file, dir, config, (percentage) => {
    onProgress?.({
      status: "uploading",
      message: `Uploading… ${percentage}%`,
      progress: percentage,
    });
  });
  assertCurrent();
  return uploaded;
}

export async function prepareAndUploadVideo(options: {
  file: File;
  profile: VideoUploadProfile;
  dir: MediaUploadDir;
  capture: CaptureKind;
  stillDir?: MediaUploadDir;
  onProgress?: (update: PipelineProgress) => void;
  onNotice?: (message: string) => void;
  isCurrent?: () => boolean;
}): Promise<{ video: PreparedUpload; still: PreparedUpload | null }> {
  const {
    file,
    profile,
    dir,
    capture,
    stillDir,
    onProgress,
    onNotice,
    isCurrent,
  } = options;
  const assertCurrent = () => {
    if (isCurrent && !isCurrent()) throw new UploadAbortedError();
  };

  onProgress?.({
    status: "preparing",
    message: needsWebTranscode(file, profile)
      ? "Compressing video for the web… (longer clips can take a few minutes)"
      : "Preparing video…",
  });

  const preparedPromise = prepareVideoForWebUpload(file, {
    profile,
    onProgress: (message) => onProgress?.({ status: "preparing", message }),
    onNotice,
  });
  const configPromise = getMediaUploadConfig();

  // Do not decode a second <video> while compressing. iOS will block both
  // play() calls and surface "browser blocked video playback".
  const [prepared, config] = await Promise.all([
    preparedPromise,
    configPromise,
  ]);
  assertCurrent();

  let stillFile: File | null = null;
  if (capture !== "none") {
    onProgress?.({
      status: "preparing",
      message: "Capturing thumbnail…",
    });
    stillFile = await captureVideoStill(file, capture, Promise.resolve(prepared));
    assertCurrent();
  }

  if (config.clientUpload) {
    onProgress?.({
      status: "uploading",
      message: "Uploading video… 0%",
      progress: 0,
    });
  }

  const [video, still] = await Promise.all([
    toPreparedUpload(prepared, dir, config, (percentage) => {
      onProgress?.({
        status: "uploading",
        message: `Uploading video… ${percentage}%`,
        progress: percentage,
      });
    }),
    stillFile
      ? toPreparedUpload(stillFile, stillDir ?? dir, config)
      : Promise.resolve(null),
  ]);
  assertCurrent();
  return { video, still };
}

export function appendPreparedUpload(
  payload: FormData,
  upload: PreparedUpload | null | undefined,
  keys: { url: string; file: string },
) {
  if (!upload) return;
  if (upload.kind === "remote") {
    payload.set(keys.url, upload.url);
    return;
  }
  payload.set(keys.file, upload.file);
}

export function useMediaPreview(
  file: File | null,
  existingPath?: string,
): string | null {
  const objectUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  useEffect(() => {
    if (!objectUrl) return;
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  return objectUrl ?? existingPath ?? null;
}
