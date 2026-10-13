import { SOUNDTRACK_LOST_MESSAGE } from "@/lib/videos/container-audio";
import { settingsForProfile } from "@/lib/videos/compress-settings";
import type { VideoUploadProfile } from "@/lib/videos/profile";
import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
  Quality,
  canEncodeVideo,
} from "mediabunny";

function scaledEvenSize(
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

/**
 * Re-encode by reading the file's own audio and video packets.
 * Recording a playing element drops the soundtrack whenever the browser
 * mutes that element, which is what the file picker forces.
 */
export async function transcodePackets(
  file: File,
  profile: VideoUploadProfile,
  onProgress?: (message: string) => void,
): Promise<File> {
  if (typeof VideoEncoder === "undefined" || typeof VideoDecoder === "undefined") {
    throw new Error("This browser cannot compress video.");
  }

  const settings = settingsForProfile(profile);
  const input = new Input({
    source: new BlobSource(file),
    formats: ALL_FORMATS,
  });

  try {
    if (!(await canEncodeVideo("avc"))) {
      throw new Error("This browser cannot compress video.");
    }

    const sourceAudio = settings.stripAudio
      ? null
      : await input.getPrimaryAudioTrack();
    const target = new BufferTarget();
    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: "in-memory" }),
      target,
    });
    const progressLabel = settings.progressMessage.replace(/…$/, "");
    const conversion = await Conversion.init({
      input,
      output,
      tracks: "primary",
      showWarnings: false,
      ...(settings.maxDurationSec !== null
        ? { trim: { end: settings.maxDurationSec } }
        : {}),
      video: async (track) => {
        const width = await track.getDisplayWidth();
        const height = await track.getDisplayHeight();
        if (!width || !height) {
          throw new Error("Could not read this video to compress it.");
        }
        const size = scaledEvenSize(width, height, settings.maxShortEdge);
        return {
          codec: "avc",
          width: size.width,
          height: size.height,
          fit: "fill",
          quality: new Quality({ bitrate: settings.bitrate }),
          forceTranscode: true,
          keyFrameInterval: 2,
          allowTransformationMetadata: false,
        };
      },
      audio: settings.stripAudio
        ? { discard: true }
        : {
            // Copy AAC when the clip already has it. Re-encode only when the
            // soundtrack is something an MP4 cannot hold.
            codec: "aac",
          },
    });

    const keptAudio = conversion.utilizedTracks.some((track) =>
      track.isAudioTrack(),
    );
    if (sourceAudio && !keptAudio) {
      const reason = conversion.discardedTracks.find((entry) =>
        entry.track.isAudioTrack(),
      )?.reason;
      console.warn(SOUNDTRACK_LOST_MESSAGE, reason ?? "audio track dropped");
      throw new Error(SOUNDTRACK_LOST_MESSAGE);
    }
    if (!conversion.isValid) {
      throw new Error("Could not compress this video.");
    }

    conversion.onProgress = (progress) => {
      const percent = Math.min(99, Math.max(0, Math.round(progress * 100)));
      onProgress?.(`${progressLabel}… ${percent}%`);
    };
    await conversion.execute();

    const buffer = target.buffer;
    if (!buffer || buffer.byteLength === 0) {
      throw new Error("Could not compress this video.");
    }

    const baseName = file.name.replace(/\.[^.]+$/i, "") || "video";
    return new File([buffer], `${baseName}.mp4`, {
      type: "video/mp4",
      lastModified: Date.now(),
    });
  } finally {
    input.dispose();
  }
}
