import type { VideoUploadProfile } from "@/lib/videos/profile";

export type CompressSettings = {
  /** Short edge, i.e. true 720p / 1080p. Long-edge 720 made portrait clips 406×720. */
  maxShortEdge: number;
  crf: number;
  stripAudio: boolean;
  maxDurationSec: number | null;
  skipIfMp4UnderBytes: number;
  progressMessage: string;
  bitrate: number;
  requireMp4: boolean;
};

/** iPhone 4K originals for a two-minute clip can exceed 250MB. */
export const MAX_SOURCE_VIDEO_BYTES = 1024 * 1024 * 1024;
/** Writing a huge file into ffmpeg.wasm often OOM-kills the tab. */
export const FFMPEG_SAFE_SOURCE_BYTES = 120 * 1024 * 1024;

export const COMPRESS_SETTINGS: Record<VideoUploadProfile, CompressSettings> = {
  hero: {
    maxShortEdge: 1080,
    crf: 23,
    stripAudio: false,
    maxDurationSec: 60,
    skipIfMp4UnderBytes: 8_000_000,
    progressMessage: "Compressing background video (1080p, soundtrack kept)…",
    bitrate: 4_500_000,
    requireMp4: true,
  },
  portfolio: {
    maxShortEdge: 720,
    crf: 26,
    stripAudio: false,
    maxDurationSec: 120,
    skipIfMp4UnderBytes: 8_000_000,
    progressMessage: "Compressing video for the web…",
    bitrate: 2_500_000,
    requireMp4: true,
  },
};

export function settingsForProfile(profile: VideoUploadProfile): CompressSettings {
  return COMPRESS_SETTINGS[profile];
}

export function formatMaxDuration(maxDurationSec: number): string {
  if (maxDurationSec % 60 === 0) {
    const minutes = maxDurationSec / 60;
    if (minutes === 1) return "one minute";
    if (minutes === 2) return "two minutes";
    return `${minutes} minutes`;
  }
  return `${maxDurationSec} seconds`;
}

export function videoUploadHelp(profile: VideoUploadProfile): string {
  const settings = settingsForProfile(profile);
  const skipMb = Math.round(settings.skipIfMp4UnderBytes / (1024 * 1024));
  const duration =
    settings.maxDurationSec === null
      ? ""
      : `, including clips up to ${formatMaxDuration(settings.maxDurationSec)} (longer clips are trimmed)`;
  return `MP4, MOV, and M4V are accepted${duration}. Clips are converted to a web MP4 before they go live. Files already under ${skipMb}MB MP4 may upload as-is.`;
}
