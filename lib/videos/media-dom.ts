export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Keep the element in the viewport. iOS Safari treats off-screen videos
 * (`left: -9999px`) as not visible and refuses `play()`, even when muted.
 * Portfolio compression passes `muted: false` so the soundtrack can be
 * recorded; callers that only need a frame should leave the default.
 */
export function attachHiddenVideo(
  video: HTMLVideoElement,
  options?: { muted?: boolean },
): void {
  if (typeof document === "undefined") return;
  const muted = options?.muted ?? true;
  video.muted = muted;
  video.defaultMuted = muted;
  video.volume = muted ? 0 : 1;
  video.playsInline = true;
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  if (muted) {
    video.setAttribute("muted", "");
  } else {
    video.removeAttribute("muted");
  }
  video.preload = "auto";
  video.controls = false;
  video.disablePictureInPicture = true;
  video.style.position = "fixed";
  video.style.top = "0";
  video.style.left = "0";
  video.style.width = "2px";
  video.style.height = "2px";
  video.style.opacity = "0.01";
  video.style.pointerEvents = "none";
  video.style.zIndex = "-1";
  document.body.appendChild(video);
}

export function detachHiddenVideo(video: HTMLVideoElement): void {
  video.pause();
  video.removeAttribute("src");
  video.load();
  video.remove();
}

export function waitForVideoEvent(
  video: HTMLVideoElement,
  event: "loadedmetadata" | "loadeddata" | "seeked" | "ended",
  errorMessage = "Could not load this video.",
): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSuccess = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error(errorMessage));
    };
    const cleanup = () => {
      video.removeEventListener(event, onSuccess);
      video.removeEventListener("error", onError);
    };
    if (event === "loadedmetadata" && video.readyState >= 1) {
      resolve();
      return;
    }
    if (event === "loadeddata" && video.readyState >= 2) {
      resolve();
      return;
    }
    video.addEventListener(event, onSuccess);
    video.addEventListener("error", onError);
  });
}

export function readVideoDurationSeconds(video: HTMLVideoElement): number {
  if (Number.isFinite(video.duration) && video.duration > 0) {
    return video.duration;
  }
  if (video.seekable.length > 0) {
    const end = video.seekable.end(video.seekable.length - 1);
    if (Number.isFinite(end) && end > 0) return end;
  }
  return 0;
}

export async function readFileDurationSeconds(
  file: File,
  timeoutMs: number,
): Promise<number> {
  if (typeof document === "undefined") return 0;

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  attachHiddenVideo(video);
  video.preload = "metadata";
  video.src = objectUrl;
  try {
    await withTimeout(
      waitForVideoEvent(video, "loadedmetadata", "Could not load this video."),
      timeoutMs,
      "Could not load this video.",
    );
    return readVideoDurationSeconds(video);
  } finally {
    detachHiddenVideo(video);
    URL.revokeObjectURL(objectUrl);
  }
}

export async function seekVideo(
  video: HTMLVideoElement,
  time: number,
  timeoutMs = 8_000,
): Promise<void> {
  const duration = readVideoDurationSeconds(video);
  const target =
    duration > 0
      ? Math.min(Math.max(0, time), Math.max(0, duration - 0.001))
      : Math.max(0, time);
  if (
    Math.abs(video.currentTime - target) <= 0.04 &&
    video.readyState >= 2 &&
    video.videoWidth > 0
  ) {
    return;
  }
  const seeked = waitForVideoEvent(video, "seeked", "Could not load this video.");
  video.currentTime = target;
  await withTimeout(seeked, timeoutMs, "Could not load this video.");
}

export async function waitForVideoDimensions(
  video: HTMLVideoElement,
  timeoutMs = 8_000,
): Promise<{ width: number; height: number }> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (video.error) {
      throw new Error("Could not load this video.");
    }
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      return { width: video.videoWidth, height: video.videoHeight };
    }
    await sleep(40);
  }

  throw new Error("Could not read video dimensions.");
}
