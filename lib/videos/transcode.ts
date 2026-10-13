import { containerHasAudio } from "@/lib/videos/container-audio";
import { toErrorMessage } from "@/lib/errors";
import { extensionFromFilename } from "@/lib/files";
import {
  FFMPEG_SAFE_SOURCE_BYTES,
  formatMaxDuration,
  MAX_SOURCE_VIDEO_BYTES,
  settingsForProfile,
  type CompressSettings,
} from "@/lib/videos/compress-settings";
import { MAX_VIDEO_BYTES } from "@/lib/videos/upload";
import {
  attachHiddenVideo,
  detachHiddenVideo,
  readFileDurationSeconds,
  readVideoDurationSeconds,
  seekVideo,
  sleep,
  waitForVideoEvent,
  withTimeout,
} from "@/lib/videos/media-dom";
import {
  bytesFromFfmpegFile,
  fileFromBytes,
  getFFmpeg,
  readFileBytes,
} from "@/lib/videos/ffmpeg";
import type { VideoUploadProfile } from "@/lib/videos/profile";

export type { VideoUploadProfile };

const FFMPEG_CONVERT_TIMEOUT_MS = 600_000;
const BROWSER_RECORD_TIMEOUT_MS = 600_000;
const VIDEO_LOAD_TIMEOUT_MS = 60_000;
const SEEK_RECORD_FPS = 24;

export function isMp4File(file: File): boolean {
  return extensionFromFilename(file.name) === ".mp4" || file.type === "video/mp4";
}

/**
 * True when the MP4 index (`moov`) appears before media data (`mdat`), so
 * playback can start without downloading the whole file first.
 */
async function mp4HasFastStart(file: File): Promise<boolean> {
  const probeSize = Math.min(file.size, 256 * 1024);
  if (probeSize < 8) return false;
  const bytes = new Uint8Array(await file.slice(0, probeSize).arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  while (offset + 8 <= view.byteLength) {
    let boxSize = view.getUint32(offset);
    const type = String.fromCharCode(
      bytes[offset + 4],
      bytes[offset + 5],
      bytes[offset + 6],
      bytes[offset + 7],
    );
    if (type === "moov") return true;
    if (type === "mdat") return false;
    if (boxSize === 1) {
      if (offset + 16 > view.byteLength) break;
      if (view.getUint32(offset + 8) !== 0) break;
      boxSize = view.getUint32(offset + 12);
    }
    if (boxSize < 8) break;
    offset += boxSize;
  }
  return false;
}

export function needsWebTranscode(
  file: File,
  profile: VideoUploadProfile = "portfolio",
): boolean {
  const ext = extensionFromFilename(file.name);
  if (ext === ".mov" || ext === ".m4v" || ext === ".webm") return true;
  if (!isMp4File(file)) return true;
  return file.size > settingsForProfile(profile).skipIfMp4UnderBytes;
}

function scaleToShortEdge(maxShortEdge: number): string {
  // Square the pixels first so anamorphic / rotated phone clips do not encode
  // as a stretched-wide frame that browsers then display incorrectly.
  return [
    "scale=iw*sar:ih",
    "setsar=1",
    `scale='if(gte(iw,ih),-2,min(iw,${maxShortEdge}))':'if(gt(ih,iw),-2,min(ih,${maxShortEdge}))'`,
    "scale=trunc(iw/2)*2:trunc(ih/2)*2",
    "setsar=1",
  ].join(",");
}

function ffmpegArgs(
  profile: VideoUploadProfile,
  inputName: string,
  outputName: string,
): string[] {
  const settings = settingsForProfile(profile);
  const args = ["-i", inputName];
  if (settings.maxDurationSec !== null) {
    args.push("-t", String(settings.maxDurationSec));
  }
  args.push(
    "-map",
    "0:v:0",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    String(settings.crf),
    "-vf",
    scaleToShortEdge(settings.maxShortEdge),
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
  );
  if (settings.stripAudio) {
    args.push("-an");
  } else {
    args.push("-map", "0:a:0?", "-c:a", "aac", "-b:a", "96k", "-ac", "2");
  }
  args.push(outputName);
  return args;
}

function prefersBrowserRecorder(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iP(hone|ad|od)/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

function canRemuxInWasm(file: File): boolean {
  // Stream-copy still writeFile()s the source into ffmpeg.wasm.
  return !prefersBrowserRecorder() && file.size <= FFMPEG_SAFE_SOURCE_BYTES;
}

type EncodeBackend = "recorder" | "ffmpeg";

type EncodePlan = {
  first: EncodeBackend;
  fallback: EncodeBackend | null;
};

function encodePlan(file: File): EncodePlan {
  if (file.size > FFMPEG_SAFE_SOURCE_BYTES) {
    return { first: "recorder", fallback: null };
  }
  if (prefersBrowserRecorder()) {
    return { first: "recorder", fallback: "ffmpeg" };
  }
  return { first: "ffmpeg", fallback: "recorder" };
}

async function exceedsMaxDuration(
  file: File,
  maxDurationSec: number | null,
): Promise<boolean> {
  if (maxDurationSec === null) return false;
  try {
    const duration = await readFileDurationSeconds(file, VIDEO_LOAD_TIMEOUT_MS);
    return duration > maxDurationSec;
  } catch {
    return false;
  }
}

function pickRecorderMimeType(includeAudio: boolean): string {
  if (typeof MediaRecorder === "undefined") return "";

  const withAudio = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  const videoOnly = [
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];

  for (const type of includeAudio ? withAudio : videoOnly) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

type CapturableVideo = HTMLVideoElement & {
  captureStream?: (frameRate?: number) => MediaStream;
  mozCaptureStream?: (frameRate?: number) => MediaStream;
};

type CanvasCaptureTrack = MediaStreamTrack & {
  requestFrame?: () => void;
};

const AUDIO_LOST_MESSAGE = "Could not keep this clip's sound while compressing.";

async function tryPlayMuted(video: HTMLVideoElement): Promise<boolean> {
  video.muted = true;
  video.defaultMuted = true;
  video.volume = 0;
  try {
    await video.play();
    return !video.paused;
  } catch {
    return false;
  }
}

function playAudible(video: HTMLVideoElement): Promise<boolean> {
  video.muted = false;
  video.defaultMuted = false;
  video.volume = 1;
  video.removeAttribute("muted");
  try {
    return video.play().then(
      () => !video.paused && !video.muted && video.volume > 0,
      () => false,
    );
  } catch {
    return Promise.resolve(false);
  }
}

type SpeakerTap = {
  tracks: MediaStreamTrack[];
  context: AudioContext;
  release: () => void;
};

function audioContextConstructor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  const scope = window as Window & { webkitAudioContext?: typeof AudioContext };
  return window.AudioContext ?? scope.webkitAudioContext ?? null;
}

/**
 * Route the element into a recorder stream and silence the speakers.
 * The element itself must stay unmuted — a muted video captures silence.
 */
function tapSilentSpeakers(video: HTMLVideoElement): SpeakerTap | null {
  const AudioContextCtor = audioContextConstructor();
  if (!AudioContextCtor) return null;

  const context = new AudioContextCtor();
  void context.resume().catch(() => undefined);
  video.muted = false;
  video.defaultMuted = false;
  video.volume = 1;
  video.removeAttribute("muted");

  try {
    const source = context.createMediaElementSource(video);
    const destination = context.createMediaStreamDestination();
    const silence = context.createGain();
    silence.gain.value = 0;
    source.connect(destination);
    source.connect(silence);
    silence.connect(context.destination);
    return {
      tracks: destination.stream.getAudioTracks(),
      context,
      release: () => {
        try {
          source.disconnect();
          silence.disconnect();
        } catch {
          // The graph is already torn down.
        }
        void context.close();
      },
    };
  } catch (error) {
    console.warn(AUDIO_LOST_MESSAGE, error);
    void context.close();
    return null;
  }
}

type PrimedPlayback = {
  file: File;
  video: CapturableVideo;
  objectUrl: string;
  audio: SpeakerTap;
  playPromise: Promise<boolean>;
};

let primedPlayback: PrimedPlayback | null = null;

function discardPrimedPlayback(primed: PrimedPlayback) {
  primed.video.pause();
  primed.audio.release();
  detachHiddenVideo(primed.video);
  URL.revokeObjectURL(primed.objectUrl);
}

/** Stop a file-picker playback that compression never took over. */
export function releasePortfolioAudio(file?: File): void {
  if (!primedPlayback) return;
  if (file && primedPlayback.file !== file) return;
  const primed = primedPlayback;
  primedPlayback = null;
  discardPrimedPlayback(primed);
}

function takePrimedPlayback(file: File): PrimedPlayback | null {
  if (!primedPlayback || primedPlayback.file !== file) return null;
  const primed = primedPlayback;
  primedPlayback = null;
  return primed;
}

/**
 * Call this synchronously from the file input's change event, before any
 * await. iPhone uploads are compressed by playing the clip, and audible
 * play() is only allowed in that gesture. Desktop files that fit in
 * ffmpeg.wasm do not need it — that path muxes the soundtrack directly.
 */
export function primePortfolioAudio(file: File): void {
  releasePortfolioAudio();
  if (typeof document === "undefined") return;
  if (!needsWebTranscode(file, "portfolio")) return;
  if (!prefersBrowserRecorder() && file.size <= FFMPEG_SAFE_SOURCE_BYTES) return;

  const video = document.createElement("video") as CapturableVideo;
  attachHiddenVideo(video, { muted: false });
  const objectUrl = URL.createObjectURL(file);
  video.preload = "auto";
  video.src = objectUrl;
  const audio = tapSilentSpeakers(video);
  if (!audio || audio.tracks.length === 0) {
    detachHiddenVideo(video);
    URL.revokeObjectURL(objectUrl);
    return;
  }

  primedPlayback = {
    file,
    video,
    objectUrl,
    audio,
    playPromise: playAudible(video),
  };
}

function recordingAudioTracks(
  video: CapturableVideo,
  tap: SpeakerTap | null,
): MediaStreamTrack[] {
  if (tap && tap.tracks.length > 0) return tap.tracks;
  if (video.muted || video.volume === 0) return [];
  try {
    const captured =
      video.captureStream?.(30) ?? video.mozCaptureStream?.(30) ?? null;
    return captured?.getAudioTracks() ?? [];
  } catch (error) {
    console.warn(AUDIO_LOST_MESSAGE, error);
    return [];
  }
}

async function outputDroppedAudio(
  source: File,
  output: File,
  keepAudio: boolean,
): Promise<boolean> {
  if (!keepAudio) return false;
  const outputAudio = await containerHasAudio(output);
  if (outputAudio === true) return false;
  const sourceAudio = await containerHasAudio(source);
  if (outputAudio === false) return sourceAudio !== false;
  return sourceAudio === true;
}

function extensionForRecorderMime(mimeType: string): { ext: string; type: string } {
  if (mimeType.startsWith("video/mp4")) {
    return { ext: ".mp4", type: "video/mp4" };
  }
  return { ext: ".webm", type: "video/webm" };
}

function stopStream(stream: MediaStream | null) {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

function captureCanvasStream(
  canvas: HTMLCanvasElement,
  frameRate: number,
): MediaStream {
  const capturable = canvas as HTMLCanvasElement & {
    captureStream?: (frameRate?: number) => MediaStream;
    webkitCaptureStream?: (frameRate?: number) => MediaStream;
  };
  const stream =
    capturable.captureStream?.(frameRate) ??
    capturable.webkitCaptureStream?.(frameRate);
  if (!stream) {
    throw new Error("This browser cannot compress video.");
  }
  return stream;
}

function fileFromRecorderChunks(
  chunks: Blob[],
  mimeType: string,
  file: File,
): File {
  const outputMime = mimeType.split(";")[0] || "video/mp4";
  const blob = new Blob(chunks, { type: outputMime });
  if (blob.size === 0) {
    throw new Error("Could not compress this video.");
  }
  const { ext, type } = extensionForRecorderMime(outputMime);
  const baseName = file.name.replace(/\.[^.]+$/i, "") || "video";
  return new File([blob], `${baseName}${ext}`, {
    type,
    lastModified: Date.now(),
  });
}

function startRecorder(
  stream: MediaStream,
  mimeType: string,
  settings: CompressSettings,
  hasAudio: boolean,
): { recorder: MediaRecorder; chunks: Blob[]; stopped: Promise<void> } {
  const recorder = new MediaRecorder(stream, {
    ...(mimeType ? { mimeType } : {}),
    videoBitsPerSecond: settings.bitrate,
    ...(hasAudio ? { audioBitsPerSecond: 96_000 } : {}),
  });
  const chunks: Blob[] = [];
  recorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  });
  const stopped = new Promise<void>((resolve, reject) => {
    recorder.addEventListener("stop", () => resolve(), { once: true });
    recorder.addEventListener(
      "error",
      () => reject(new Error("Could not compress this video.")),
      { once: true },
    );
  });
  return { recorder, chunks, stopped };
}

function scaledCaptureSize(
  srcW: number,
  srcH: number,
  maxShortEdge: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxShortEdge / Math.min(srcW, srcH));
  return {
    width: Math.max(2, Math.round((srcW * scale) / 2) * 2),
    height: Math.max(2, Math.round((srcH * scale) / 2) * 2),
  };
}

function clipDurationSeconds(
  video: HTMLVideoElement,
  maxDurationSec: number | null,
): number {
  const duration = readVideoDurationSeconds(video);
  if (maxDurationSec === null) return duration;
  return Math.min(maxDurationSec, duration || maxDurationSec);
}

async function recordByPlayback(
  video: CapturableVideo,
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  file: File,
  settings: CompressSettings,
  mimeType: string,
  audioTracks: MediaStreamTrack[],
): Promise<File> {
  const keepAudio = !settings.stripAudio;
  if (keepAudio && audioTracks.length === 0) {
    throw new Error(AUDIO_LOST_MESSAGE);
  }

  const canvasStream = captureCanvasStream(canvas, 30);
  const mixedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...audioTracks,
  ]);

  const { recorder, chunks, stopped } = startRecorder(
    mixedStream,
    pickRecorderMimeType(audioTracks.length > 0) || mimeType,
    settings,
    audioTracks.length > 0,
  );

  try {
    if (video.currentTime > 0.05) {
      await seekVideo(video, 0);
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    recorder.start(250);
    const playing = keepAudio ? await playAudible(video) : await tryPlayMuted(video);
    if (!playing) {
      throw new Error(keepAudio ? AUDIO_LOST_MESSAGE : "Playback was blocked.");
    }

    const draw = () => {
      if (recorder.state !== "recording") return;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      if (
        video.ended ||
        (settings.maxDurationSec !== null &&
          video.currentTime >= settings.maxDurationSec)
      ) {
        video.pause();
        if (recorder.state === "recording") recorder.stop();
        return;
      }
      if (!video.paused && !video.ended) {
        requestAnimationFrame(draw);
      }
    };

    const onEnded = () => {
      if (recorder.state === "recording") recorder.stop();
    };
    video.addEventListener("ended", onEnded, { once: true });
    requestAnimationFrame(draw);

    const timeoutMs = recorderTimeoutMs(clipDurationSeconds(video, settings.maxDurationSec));
    try {
      await withTimeout(stopped, timeoutMs, "Video compression timed out.");
    } finally {
      video.removeEventListener("ended", onEnded);
      if (recorder.state === "recording") recorder.stop();
    }

    return fileFromRecorderChunks(
      chunks,
      recorder.mimeType || mimeType || "video/mp4",
      file,
    );
  } finally {
    stopStream(mixedStream);
    stopStream(canvasStream);
  }
}

function recorderTimeoutMs(clipDuration: number): number {
  return clipDuration > 0
    ? Math.min(
        BROWSER_RECORD_TIMEOUT_MS,
        Math.max(45_000, clipDuration * 3000 + 15_000),
      )
    : BROWSER_RECORD_TIMEOUT_MS;
}

async function recordBySeeking(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  file: File,
  settings: CompressSettings,
  mimeType: string,
  onProgress?: (message: string) => void,
): Promise<File> {
  const clipDuration = clipDurationSeconds(video, settings.maxDurationSec);
  if (clipDuration <= 0) {
    throw new Error("Could not read this video to compress it.");
  }

  const canvasStream = captureCanvasStream(canvas, SEEK_RECORD_FPS);
  const { recorder, chunks, stopped } = startRecorder(
    canvasStream,
    pickRecorderMimeType(false) || mimeType,
    settings,
    false,
  );
  const track = canvasStream.getVideoTracks()[0] as CanvasCaptureTrack | undefined;

  try {
    await seekVideo(video, 0);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    track?.requestFrame?.();
    recorder.start(250);

    const frameCount = Math.max(1, Math.round(clipDuration * SEEK_RECORD_FPS));
    const startedAt = performance.now();

    for (let index = 0; index < frameCount; index += 1) {
      if (recorder.state !== "recording") break;
      const time = Math.min(clipDuration, index / SEEK_RECORD_FPS);
      await seekVideo(video, time);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      track?.requestFrame?.();

      if (index === 0 || index % SEEK_RECORD_FPS === 0) {
        const percent = Math.min(99, Math.round(((index + 1) / frameCount) * 100));
        onProgress?.(`Compressing video in this browser… ${percent}%`);
      }

      const targetMs = ((index + 1) / SEEK_RECORD_FPS) * 1000;
      const elapsed = performance.now() - startedAt;
      if (elapsed > targetMs + 2_000) {
        throw new Error("Could not compress this video.");
      }
      if (targetMs > elapsed) {
        await sleep(targetMs - elapsed);
      }
    }

    if (recorder.state === "recording") recorder.stop();
    await withTimeout(
      stopped,
      recorderTimeoutMs(clipDuration),
      "Video compression timed out.",
    );

    return fileFromRecorderChunks(
      chunks,
      recorder.mimeType || mimeType || "video/mp4",
      file,
    );
  } finally {
    stopStream(canvasStream);
  }
}

async function transcodeWithMediaRecorder(
  file: File,
  profile: VideoUploadProfile,
  onProgress?: (message: string) => void,
): Promise<File> {
  if (typeof document === "undefined" || typeof MediaRecorder === "undefined") {
    throw new Error("This browser cannot compress video.");
  }

  const settings = settingsForProfile(profile);
  const keepAudio = !settings.stripAudio;
  const mimeType = pickRecorderMimeType(keepAudio);
  const primed = keepAudio ? takePrimedPlayback(file) : null;

  onProgress?.("Compressing video in this browser…");

  const objectUrl = primed?.objectUrl ?? URL.createObjectURL(file);
  const video = primed?.video ?? (document.createElement("video") as CapturableVideo);
  const audio = primed?.audio ?? null;
  const canvas = document.createElement("canvas");
  if (!primed) {
    attachHiddenVideo(video, { muted: !keepAudio });
    video.src = objectUrl;
  }
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "2px";
  canvas.style.height = "2px";
  canvas.style.opacity = "0.01";
  canvas.style.pointerEvents = "none";
  document.body.appendChild(canvas);
  const playPromise = primed
    ? primed.playPromise
    : keepAudio
      ? playAudible(video)
      : tryPlayMuted(video);

  try {
    return await withTimeout(
      (async () => {
        await withTimeout(
          waitForVideoEvent(
            video,
            "loadeddata",
            "Could not load this video to compress it.",
          ),
          VIDEO_LOAD_TIMEOUT_MS,
          "Could not load this video to compress it.",
        );

        let playing = await playPromise;
        if (video.paused) {
          playing = keepAudio ? await playAudible(video) : await tryPlayMuted(video);
        }

        if (keepAudio && audio && audio.context.state !== "running") {
          try {
            await audio.context.resume();
          } catch {
            // Resume outside the file-picker gesture often stays suspended.
          }
        }

        const audioTracks = keepAudio ? recordingAudioTracks(video, audio) : [];
        if (
          keepAudio &&
          (video.muted ||
            video.volume === 0 ||
            !playing ||
            audioTracks.length === 0 ||
            (audio !== null && audio.context.state !== "running"))
        ) {
          throw new Error(AUDIO_LOST_MESSAGE);
        }

        if (!video.videoWidth || !video.videoHeight) {
          await seekVideo(video, 0.1);
        }

        const srcW = video.videoWidth;
        const srcH = video.videoHeight;
        if (!srcW || !srcH) {
          throw new Error("Could not read this video to compress it.");
        }

        const { width, height } = scaledCaptureSize(
          srcW,
          srcH,
          settings.maxShortEdge,
        );
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) {
          throw new Error("Could not compress this video.");
        }

        context.drawImage(video, 0, 0, width, height);

        if (playing && !video.paused) {
          try {
            const recorded = await recordByPlayback(
              video,
              canvas,
              context,
              file,
              settings,
              mimeType,
              audioTracks,
            );
            if (await outputDroppedAudio(file, recorded, keepAudio)) {
              throw new Error(AUDIO_LOST_MESSAGE);
            }
            return recorded;
          } catch (error) {
            if (keepAudio) throw error;
            console.warn(
              "Realtime compression failed, drawing frames instead:",
              error,
            );
            video.pause();
          }
        }

        if (keepAudio) {
          throw new Error(AUDIO_LOST_MESSAGE);
        }

        return recordBySeeking(
          video,
          canvas,
          context,
          file,
          settings,
          mimeType,
          onProgress,
        );
      })(),
      BROWSER_RECORD_TIMEOUT_MS,
      "Video compression timed out.",
    );
  } finally {
    video.pause();
    audio?.release();
    detachHiddenVideo(video);
    canvas.remove();
    URL.revokeObjectURL(objectUrl);
  }
}

async function transcodeToMp4(
  file: File,
  profile: VideoUploadProfile,
  onProgress?: (message: string) => void,
): Promise<File> {
  onProgress?.("Loading video converter…");
  const ff = await getFFmpeg();
  const inputExt = extensionFromFilename(file.name) || ".mov";
  const inputName = `input${inputExt}`;
  const outputName = "output.mp4";

  await ff.writeFile(inputName, await readFileBytes(file));
  onProgress?.(settingsForProfile(profile).progressMessage);

  const exitCode = await withTimeout(
    ff.exec(ffmpegArgs(profile, inputName, outputName)),
    FFMPEG_CONVERT_TIMEOUT_MS,
    "Video conversion timed out.",
  );

  if (exitCode !== 0) {
    throw new Error(
      "Could not compress this video. Export a smaller MP4 from Photos and try again.",
    );
  }

  const data = await ff.readFile(outputName);
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  const bytes = bytesFromFfmpegFile(data);

  if (bytes.byteLength === 0) {
    throw new Error(
      "Video conversion failed. Export as MP4 from Photos and try again.",
    );
  }

  const baseName = file.name.replace(/\.[^.]+$/i, "") || "video";
  const output = fileFromBytes(bytes, `${baseName}.mp4`, "video/mp4");
  if (
    await outputDroppedAudio(
      file,
      output,
      !settingsForProfile(profile).stripAudio,
    )
  ) {
    throw new Error(AUDIO_LOST_MESSAGE);
  }
  return output;
}

async function remuxToMp4(
  file: File,
  onProgress?: (message: string) => void,
): Promise<File> {
  onProgress?.("Optimizing video so it can start sooner…");
  const ff = await getFFmpeg();
  const inputExt = extensionFromFilename(file.name) || ".mp4";
  const inputName = `input${inputExt}`;
  const outputName = "output.mp4";

  await ff.writeFile(inputName, await readFileBytes(file));
  const exitCode = await withTimeout(
    ff.exec(["-i", inputName, "-c", "copy", "-movflags", "+faststart", outputName]),
    FFMPEG_CONVERT_TIMEOUT_MS,
    "Video conversion timed out.",
  );

  if (exitCode !== 0) {
    throw new Error("Could not optimize this video for fast start.");
  }

  const data = await ff.readFile(outputName);
  await ff.deleteFile(inputName);
  await ff.deleteFile(outputName);

  const bytes = bytesFromFfmpegFile(data);

  if (bytes.byteLength === 0) {
    throw new Error("Could not optimize this video for fast start.");
  }

  const baseName = file.name.replace(/\.[^.]+$/i, "") || "video";
  return fileFromBytes(bytes, `${baseName}.mp4`, "video/mp4");
}

function assertUploadableVideo(file: File): File {
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error(
      "That clip is still too large after compression. Export a shorter 720p or 1080p MP4 from Photos and try again.",
    );
  }
  return file;
}

function assertProfileOutput(file: File, profile: VideoUploadProfile): File {
  const uploadable = assertUploadableVideo(file);
  if (settingsForProfile(profile).requireMp4 && !isMp4File(uploadable)) {
    throw new Error(
      "This clip could not be converted for phones. Export an MP4 from Photos and try again.",
    );
  }
  return uploadable;
}

function runEncodeBackend(
  backend: EncodeBackend,
  file: File,
  profile: VideoUploadProfile,
  onProgress?: (message: string) => void,
): Promise<File> {
  switch (backend) {
    case "recorder":
      return transcodeWithMediaRecorder(file, profile, onProgress);
    case "ffmpeg":
      return transcodeToMp4(file, profile, onProgress);
    default: {
      const _exhaustive: never = backend;
      throw new Error(`Unknown encode backend: ${_exhaustive}`);
    }
  }
}

async function compressForWebUpload(
  file: File,
  profile: VideoUploadProfile,
  onProgress?: (message: string) => void,
): Promise<File> {
  if (file.size > MAX_SOURCE_VIDEO_BYTES) {
    throw new Error(
      "That file is too large to compress in the browser. Export a smaller MP4 from Photos and try again.",
    );
  }

  const settings = settingsForProfile(profile);
  const canSkip = !needsWebTranscode(file, profile);
  const canRemuxContainer =
    !isMp4File(file) &&
    file.size <= settings.skipIfMp4UnderBytes &&
    canRemuxInWasm(file);
  const trimRequired =
    (canSkip || canRemuxContainer) &&
    (await exceedsMaxDuration(file, settings.maxDurationSec));

  if (canSkip && !trimRequired) {
    if (settings.requireMp4 && isMp4File(file) && !(await mp4HasFastStart(file))) {
      try {
        return await remuxToMp4(file, onProgress);
      } catch (error) {
        console.warn("Fast-start remux skipped:", error);
        return file;
      }
    }
    return file;
  }

  if (canRemuxContainer && !trimRequired) {
    try {
      return await remuxToMp4(file, onProgress);
    } catch (error) {
      console.warn("Container remux skipped:", error);
    }
  }

  const plan = encodePlan(file);
  let compressed: File;
  try {
    compressed = await runEncodeBackend(plan.first, file, profile, onProgress);
  } catch (error) {
    if (!plan.fallback) throw error;
    console.warn(
      plan.first === "recorder"
        ? "Browser recorder failed, trying converter:"
        : "Client video transcode failed, trying browser recorder:",
      error,
    );
    compressed = await runEncodeBackend(plan.fallback, file, profile, onProgress);
  }

  if (isMp4File(file) && compressed.size >= file.size && !trimRequired) {
    if (settings.requireMp4 && !(await mp4HasFastStart(file))) {
      try {
        return await remuxToMp4(file, onProgress);
      } catch (error) {
        console.warn("Fast-start remux skipped:", error);
        return assertUploadableVideo(file);
      }
    }
    return assertUploadableVideo(file);
  }

  return assertUploadableVideo(compressed);
}

export type PrepareVideoOptions = {
  onProgress?: (message: string) => void;
  /** Called when the clip is uploaded uncompressed because compression failed. */
  onNotice?: (message: string) => void;
  profile?: VideoUploadProfile;
};

/**
 * Browser compression is required to produce a web MP4. When every encode
 * strategy fails we only keep the original if it is already an MP4 under the
 * size and duration caps. QuickTime / WebM originals are rejected so Chrome
 * and phones can play the clip.
 */
export async function prepareVideoForWebUpload(
  file: File,
  options: PrepareVideoOptions = {},
): Promise<File> {
  const { onProgress, onNotice, profile = "portfolio" } = options;
  const settings = settingsForProfile(profile);

  try {
    return assertProfileOutput(
      await compressForWebUpload(file, profile, onProgress),
      profile,
    );
  } catch (error) {
    if (settings.requireMp4 && !isMp4File(file)) {
      try {
        return assertProfileOutput(await remuxToMp4(file, onProgress), profile);
      } catch {
        throw new Error(
          toErrorMessage(
            error,
            "This clip could not be converted for phones. Export an MP4 from Photos and try again.",
          ),
        );
      }
    }

    if (file.size > MAX_VIDEO_BYTES) {
      throw new Error(
        "That clip is still too large after compression. Export a shorter 720p or 1080p MP4 from Photos and try again.",
      );
    }

    const maxDurationSec = settings.maxDurationSec;
    if (
      maxDurationSec !== null &&
      (await exceedsMaxDuration(file, maxDurationSec))
    ) {
      throw new Error(
        `That clip is still too long after compression. Export a clip under ${formatMaxDuration(maxDurationSec)} and try again.`,
      );
    }

    console.warn("Falling back to the original video file:", error);
    onNotice?.(
      "Couldn't compress this clip in the browser, so the original was uploaded. It will play fine but may load more slowly.",
    );
    return assertProfileOutput(file, profile);
  } finally {
    releasePortfolioAudio(file);
  }
}
