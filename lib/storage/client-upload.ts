import { readResponseJson } from "@/lib/http/json";
import type { SignedMediaUpload } from "./media-host";
import type { MediaUploadDir } from "./media-upload";

type SignedUploadResponse = Partial<SignedMediaUpload> & { error?: string };

export async function uploadMediaToStorage(
  file: File,
  dir: MediaUploadDir,
  handleUploadUrl: string,
  onProgress?: (percentage: number) => void,
): Promise<string> {
  const response = await fetch(handleUploadUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      dir,
      filename: file.name,
      contentType: file.type,
      byteLength: file.size,
    }),
  });

  const payload = await readResponseJson<SignedUploadResponse>(response);
  if (!response.ok || !payload.uploadUrl || !payload.publicUrl) {
    throw new Error(payload.error ?? "Could not start upload.");
  }

  const mode = payload.mode ?? "supabase-form";
  switch (mode) {
    case "raw-put":
      await putToSignedUrl(payload.uploadUrl, file, payload.headers, onProgress);
      break;
    case "supabase-form":
      await putToSignedUrl(
        payload.uploadUrl,
        supabaseFormBody(file),
        payload.headers,
        onProgress,
      );
      break;
    case "origin-chunks":
      await uploadOriginChunks(file, payload, onProgress);
      break;
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown upload mode: ${_exhaustive}`);
    }
  }
  return payload.publicUrl;
}

function supabaseFormBody(file: File): FormData {
  const body = new FormData();
  body.append("cacheControl", "31536000");
  body.append("", file);
  return body;
}

async function uploadOriginChunks(
  file: File,
  payload: SignedUploadResponse,
  onProgress?: (percentage: number) => void,
): Promise<void> {
  const chunkSize = payload.chunkSize;
  const token = payload.uploadToken;
  const uploadUrl = payload.uploadUrl;
  const completeUrl = payload.completeUrl;
  if (!chunkSize || chunkSize < 1 || !token || !uploadUrl || !completeUrl) {
    throw new Error("Could not start upload.");
  }

  const chunkCount = Math.max(1, Math.ceil(file.size / chunkSize));
  try {
    for (let index = 0; index < chunkCount; index += 1) {
      const start = index * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      await putChunk(uploadUrl, file.slice(start, end), token, index, (loaded) => {
        if (!onProgress || file.size <= 0) return;
        onProgress(Math.min(99, Math.round(((start + loaded) / file.size) * 100)));
      });
    }
  } catch (error) {
    await abortOriginUpload(payload.abortUrl, token);
    throw error;
  }

  const complete = await fetch(completeUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!complete.ok) {
    const completePayload = await readResponseJson<{ error?: string }>(complete);
    await abortOriginUpload(payload.abortUrl, token);
    throw new Error(completePayload.error ?? "Upload failed. Please try again.");
  }
  onProgress?.(100);
}

function abortOriginUpload(abortUrl: string | undefined, token: string): Promise<void> {
  if (!abortUrl) return Promise.resolve();
  return fetch(abortUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  }).then(
    () => undefined,
    () => undefined,
  );
}

function putChunk(
  uploadUrl: string,
  body: Blob,
  token: string,
  index: number,
  onProgress?: (loaded: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.setRequestHeader("X-Upload-Token", token);
    xhr.setRequestHeader("X-Chunk-Index", String(index));
    xhr.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) return;
      onProgress(event.loaded);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error("Upload failed. Please try again."));
    };
    xhr.onerror = () =>
      reject(new Error("Upload failed. Check your connection and try again."));
    xhr.onabort = () => reject(new Error("Upload was cancelled."));
    xhr.send(body);
  });
}

function putToSignedUrl(
  uploadUrl: string,
  body: XMLHttpRequestBodyInit,
  headers?: Record<string, string>,
  onProgress?: (percentage: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    for (const [name, value] of Object.entries(headers ?? {})) {
      xhr.setRequestHeader(name, value);
    }
    xhr.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable || event.total <= 0) return;
      onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      reject(new Error("Upload failed. Please try again."));
    };
    xhr.onerror = () =>
      reject(new Error("Upload failed. Check your connection and try again."));
    xhr.onabort = () => reject(new Error("Upload was cancelled."));
    xhr.send(body);
  });
}
