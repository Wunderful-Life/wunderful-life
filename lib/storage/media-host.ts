import type { MediaUploadDir } from "./media-upload";
import { beginOriginChunkUpload } from "./origin-upload";
import {
  deleteFromR2,
  hasR2MediaConfig,
  r2KeyFromPublicUrl,
  uploadToR2,
} from "./r2-media";
import {
  createSignedPublicMediaUpload,
  deletePublicMedia as deleteSupabaseMedia,
  hasSupabaseMediaConfig,
  uploadPublicMedia as uploadSupabaseMedia,
} from "./supabase-media";

/**
 * Chooses where new media is written. R2 wins when configured because its
 * egress is free; Supabase Storage remains the fallback and keeps serving every
 * file uploaded before the switch, so no existing URL ever breaks.
 */

export function hasMediaConfig(): boolean {
  return hasR2MediaConfig() || hasSupabaseMediaConfig();
}

export function activeMediaHost(): "r2" | "supabase" | "none" {
  if (hasR2MediaConfig()) return "r2";
  if (hasSupabaseMediaConfig()) return "supabase";
  return "none";
}

/**
 * Supabase signed uploads expect a multipart form. R2 cannot accept a browser
 * PUT until the bucket sends CORS headers, so those files are posted back to
 * this site in chunks and written with the server credentials.
 */
export type SignedMediaUpload = {
  uploadUrl: string;
  publicUrl: string;
  path: string;
  mode: "supabase-form" | "raw-put" | "origin-chunks";
  headers?: Record<string, string>;
  chunkSize?: number;
  chunkCount?: number;
  uploadToken?: string;
  completeUrl?: string;
  abortUrl?: string;
};

export async function createSignedMediaUpload(
  dir: MediaUploadDir,
  originalName: string,
  contentType?: string,
  byteLength?: number,
): Promise<SignedMediaUpload> {
  if (hasR2MediaConfig()) {
    const upload = beginOriginChunkUpload(
      dir,
      originalName,
      contentType,
      byteLength ?? 0,
    );
    return {
      uploadUrl: "/api/videos/upload/chunk",
      completeUrl: "/api/videos/upload/complete",
      abortUrl: "/api/videos/upload/abort",
      publicUrl: upload.publicUrl,
      path: upload.path,
      mode: "origin-chunks",
      chunkSize: upload.chunkSize,
      chunkCount: upload.chunkCount,
      uploadToken: upload.uploadToken,
    };
  }
  return {
    ...(await createSignedPublicMediaUpload(dir, originalName)),
    mode: "supabase-form",
  };
}

export async function uploadMedia(
  pathname: string,
  file: File,
  contentType?: string,
): Promise<string> {
  if (hasR2MediaConfig()) {
    return uploadToR2(pathname, file, contentType);
  }
  return uploadSupabaseMedia(pathname, file, contentType);
}

/** Routes deletes by URL so pre-migration Supabase files stay reachable. */
export async function deleteMedia(value: string): Promise<void> {
  if (hasR2MediaConfig() && r2KeyFromPublicUrl(value)) {
    await deleteFromR2(value);
    return;
  }
  if (hasSupabaseMediaConfig()) {
    await deleteSupabaseMedia(value);
  }
}
