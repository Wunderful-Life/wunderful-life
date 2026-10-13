import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { MAX_VIDEO_BYTES } from "@/lib/videos/upload";
import {
  allocateR2Key,
  deleteR2Key,
  getR2ObjectBytes,
  putR2Bytes,
  r2PublicUrl,
} from "./r2-media";
import { isMediaUploadDir, type MediaUploadDir } from "./media-upload";
import { StorageError } from "./types";

/** Stay under the 4.5MB platform request limit, with room for headers. */
export const ORIGIN_CHUNK_BYTES = 4 * 1024 * 1024;

const TOKEN_TTL_MS = 30 * 60 * 1000;
const MAX_CHUNKS = Math.ceil(MAX_VIDEO_BYTES / ORIGIN_CHUNK_BYTES);

type UploadTicket = {
  uploadId: string;
  path: string;
  contentType: string;
  byteLength: number;
  chunkCount: number;
  exp: number;
};

function tokenSecret(): string {
  const secret = process.env.R2_SECRET_ACCESS_KEY?.trim();
  if (!secret) {
    throw new StorageError("Media storage is not configured.", 503);
  }
  return secret;
}

function signPayload(payload: string): string {
  return createHmac("sha256", tokenSecret()).update(payload).digest("base64url");
}

function issueToken(ticket: UploadTicket): string {
  const payload = Buffer.from(JSON.stringify(ticket)).toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

export function readUploadToken(token: string): UploadTicket {
  const separator = token.lastIndexOf(".");
  const payload = separator > 0 ? token.slice(0, separator) : "";
  const signature = separator > 0 ? token.slice(separator + 1) : "";
  if (!payload || !signature) {
    throw new StorageError("That upload session is not valid.", 400);
  }

  const expected = signPayload(payload);
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (
    actualBytes.length !== expectedBytes.length ||
    !timingSafeEqual(actualBytes, expectedBytes)
  ) {
    throw new StorageError("That upload session is not valid.", 400);
  }

  let ticket: UploadTicket;
  try {
    ticket = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as UploadTicket;
  } catch {
    throw new StorageError("That upload session is not valid.", 400);
  }

  if (
    typeof ticket.uploadId !== "string" ||
    typeof ticket.path !== "string" ||
    typeof ticket.contentType !== "string" ||
    !Number.isInteger(ticket.byteLength) ||
    !Number.isInteger(ticket.chunkCount) ||
    !Number.isFinite(ticket.exp)
  ) {
    throw new StorageError("That upload session is not valid.", 400);
  }

  if (ticket.exp < Date.now()) {
    throw new StorageError("That upload session expired. Please try again.", 400);
  }

  if (!isUuid(ticket.uploadId) || !isPublishableKey(ticket.path)) {
    throw new StorageError("That upload session is not valid.", 400);
  }

  if (
    ticket.byteLength < 1 ||
    ticket.byteLength > MAX_VIDEO_BYTES ||
    ticket.chunkCount < 1 ||
    ticket.chunkCount > MAX_CHUNKS ||
    ticket.chunkCount !== Math.ceil(ticket.byteLength / ORIGIN_CHUNK_BYTES)
  ) {
    throw new StorageError("That upload session is not valid.", 400);
  }

  return ticket;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function isPublishableKey(path: string): boolean {
  const slash = path.indexOf("/");
  if (slash <= 0) return false;
  const dir = path.slice(0, slash);
  const name = path.slice(slash + 1);
  return isMediaUploadDir(dir) && /^[0-9a-f-]{36}\.[a-z0-9]+$/i.test(name);
}

export function partKey(uploadId: string, index: number): string {
  return `_upload-parts/${uploadId}/${index}`;
}

export function beginOriginChunkUpload(
  dir: MediaUploadDir,
  originalName: string,
  contentType: string | undefined,
  byteLength: number,
): {
  publicUrl: string;
  path: string;
  chunkSize: number;
  chunkCount: number;
  uploadToken: string;
} {
  if (!Number.isInteger(byteLength) || byteLength < 1) {
    throw new StorageError("That file is empty.", 400);
  }
  if (byteLength > MAX_VIDEO_BYTES) {
    throw new StorageError("That file is too large to upload.", 400);
  }

  const allocated = allocateR2Key(dir, originalName, contentType);
  const chunkCount = Math.ceil(byteLength / ORIGIN_CHUNK_BYTES);
  const ticket: UploadTicket = {
    uploadId: randomUUID(),
    path: allocated.key,
    contentType: allocated.contentType,
    byteLength,
    chunkCount,
    exp: Date.now() + TOKEN_TTL_MS,
  };

  return {
    publicUrl: r2PublicUrl(allocated.key),
    path: allocated.key,
    chunkSize: ORIGIN_CHUNK_BYTES,
    chunkCount,
    uploadToken: issueToken(ticket),
  };
}

export async function storeOriginChunk(
  token: string,
  index: number,
  body: Uint8Array,
): Promise<void> {
  const ticket = readUploadToken(token);
  if (!Number.isInteger(index) || index < 0 || index >= ticket.chunkCount) {
    throw new StorageError("That upload part is out of range.", 400);
  }

  const expected =
    index === ticket.chunkCount - 1
      ? ticket.byteLength - index * ORIGIN_CHUNK_BYTES
      : ORIGIN_CHUNK_BYTES;
  if (body.byteLength !== expected) {
    throw new StorageError("That upload part is the wrong size.", 400);
  }

  await putR2Bytes(partKey(ticket.uploadId, index), body, "application/octet-stream");
}

export async function completeOriginChunkUpload(token: string): Promise<string> {
  const ticket = readUploadToken(token);
  const parts: Uint8Array[] = [];
  let total = 0;

  for (let index = 0; index < ticket.chunkCount; index += 1) {
    const part = await getR2ObjectBytes(partKey(ticket.uploadId, index));
    parts.push(part);
    total += part.byteLength;
  }

  if (total !== ticket.byteLength) {
    throw new StorageError("The upload was incomplete. Please try again.", 400);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    body.set(part, offset);
    offset += part.byteLength;
  }

  const publicUrl = await putR2Bytes(ticket.path, body, ticket.contentType);
  await discardOriginParts(ticket.uploadId, ticket.chunkCount);
  return publicUrl;
}

export async function abortOriginChunkUpload(token: string): Promise<void> {
  const ticket = readUploadToken(token);
  await discardOriginParts(ticket.uploadId, ticket.chunkCount);
}

async function discardOriginParts(uploadId: string, chunkCount: number): Promise<void> {
  await Promise.all(
    Array.from({ length: chunkCount }, (_, index) =>
      deleteR2Key(partKey(uploadId, index)).catch(() => undefined),
    ),
  );
}
