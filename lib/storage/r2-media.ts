import { randomUUID } from "crypto";
import { extensionFromFilename } from "@/lib/files";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { defaultExtensionForDir, isMediaUploadDir, type MediaUploadDir } from "./media-upload";
import { StorageError } from "./types";

/**
 * Cloudflare R2 media host. R2 charges nothing for egress, so serving Emily's
 * photos and videos from here removes the quota that Supabase Storage kept
 * hitting. Supabase still holds the CMS documents and revision history.
 */

const SIGNED_UPLOAD_TTL_SECONDS = 60 * 30;
const PUBLIC_CACHE_CONTROL = "public, max-age=31536000, immutable";

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export function hasR2MediaConfig(): boolean {
  return Boolean(
    readEnv("R2_ACCOUNT_ID") &&
      readEnv("R2_ACCESS_KEY_ID") &&
      readEnv("R2_SECRET_ACCESS_KEY") &&
      readEnv("R2_BUCKET") &&
      readEnv("R2_PUBLIC_BASE_URL"),
  );
}

function requireEnv(name: string): string {
  const value = readEnv(name);
  if (!value) {
    throw new StorageError(
      `Media storage is not configured. Add ${name}.`,
      503,
    );
  }
  return value;
}

export function r2PublicBaseUrl(): string {
  return requireEnv("R2_PUBLIC_BASE_URL").replace(/\/+$/, "");
}

function getClient(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    },
  });
}

export function r2PublicUrl(key: string): string {
  const encoded = key.split("/").map(encodeURIComponent).join("/");
  return `${r2PublicBaseUrl()}/${encoded}`;
}

/** Returns the object key when the URL points at our R2 bucket, else null. */
export function r2KeyFromPublicUrl(value: string): string | null {
  try {
    const base = new URL(r2PublicBaseUrl());
    const target = new URL(value);
    const prefix = base.pathname === "/" ? "/" : `${base.pathname}/`;

    if (target.origin !== base.origin || !target.pathname.startsWith(prefix)) {
      return null;
    }

    return decodeURIComponent(target.pathname.slice(prefix.length)) || null;
  } catch {
    return null;
  }
}

export function allocateR2Key(
  dir: MediaUploadDir,
  originalName: string,
  contentType?: string,
): { key: string; contentType: string } {
  if (!isMediaUploadDir(dir)) {
    throw new StorageError("That upload folder is not allowed.", 400);
  }

  const ext = extensionFromFilename(originalName) || defaultExtensionForDir(dir);
  const key = `${dir}/${randomUUID()}${ext}`;
  return { key, contentType: contentTypeForKey(key, contentType) };
}

function contentTypeForKey(key: string, provided?: string): string {
  if (provided && provided.includes("/")) return provided;
  switch (extensionFromFilename(key)) {
    case ".mp4":
      return "video/mp4";
    case ".mov":
      return "video/quicktime";
    case ".webm":
      return "video/webm";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}

export async function createSignedR2Upload(
  dir: MediaUploadDir,
  originalName: string,
  contentType?: string,
): Promise<{
  uploadUrl: string;
  publicUrl: string;
  path: string;
  mode: "raw-put";
  headers: Record<string, string>;
}> {
  const allocated = allocateR2Key(dir, originalName, contentType);
  const key = allocated.key;
  // The signature covers these headers, so the browser must echo them exactly.
  const headers = {
    "Content-Type": allocated.contentType,
    "Cache-Control": PUBLIC_CACHE_CONTROL,
  };

  const uploadUrl = await getSignedUrl(
    getClient(),
    new PutObjectCommand({
      Bucket: requireEnv("R2_BUCKET"),
      Key: key,
      CacheControl: headers["Cache-Control"],
      ContentType: headers["Content-Type"],
    }),
    { expiresIn: SIGNED_UPLOAD_TTL_SECONDS },
  );

  return {
    uploadUrl,
    publicUrl: r2PublicUrl(key),
    path: key,
    mode: "raw-put",
    headers,
  };
}

export async function putR2Bytes(
  key: string,
  body: Uint8Array,
  contentType?: string,
): Promise<string> {
  try {
    await getClient().send(
      new PutObjectCommand({
        Bucket: requireEnv("R2_BUCKET"),
        Key: key,
        Body: body,
        CacheControl: PUBLIC_CACHE_CONTROL,
        ContentType: contentType,
      }),
    );
  } catch (error) {
    throw new StorageError(
      `Could not upload media: ${error instanceof Error ? error.message : "unknown error"}`,
      503,
    );
  }

  return r2PublicUrl(key);
}

export async function getR2ObjectBytes(key: string): Promise<Uint8Array> {
  try {
    const response = await getClient().send(
      new GetObjectCommand({ Bucket: requireEnv("R2_BUCKET"), Key: key }),
    );
    const bytes = await response.Body?.transformToByteArray();
    if (!bytes || bytes.byteLength === 0) {
      throw new StorageError("An upload part is missing. Please try again.", 400);
    }
    return bytes;
  } catch (error) {
    if (error instanceof StorageError) throw error;
    throw new StorageError(
      `Could not read media: ${error instanceof Error ? error.message : "unknown error"}`,
      503,
    );
  }
}

export async function deleteR2Key(key: string): Promise<void> {
  try {
    await getClient().send(
      new DeleteObjectCommand({ Bucket: requireEnv("R2_BUCKET"), Key: key }),
    );
  } catch (error) {
    throw new StorageError(
      `Could not delete media: ${error instanceof Error ? error.message : "unknown error"}`,
      503,
    );
  }
}

export async function uploadToR2(
  key: string,
  file: File,
  contentType?: string,
): Promise<string> {
  const body = new Uint8Array(await file.arrayBuffer());
  return putR2Bytes(key, body, contentType || file.type || undefined);
}

export async function deleteFromR2(value: string): Promise<void> {
  const key = r2KeyFromPublicUrl(value);
  if (!key) return;
  await deleteR2Key(key);
}
