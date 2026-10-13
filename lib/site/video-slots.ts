import type { MediaUploadDir } from "@/lib/storage/media-upload";
import type { VideoUploadProfile } from "@/lib/videos/profile";

export const VIDEO_SLOTS = ["hero"] as const;
export type VideoSlot = (typeof VIDEO_SLOTS)[number];

export type VideoSlotDescriptor = {
  slot: VideoSlot;
  noun: string;
  endpoint: string;
  hint: string;
  profile: VideoUploadProfile;
  persistPoster: boolean;
  dir: MediaUploadDir;
};

export const VIDEO_SLOT_DESCRIPTORS: Record<VideoSlot, VideoSlotDescriptor> = {
  hero: {
    slot: "hero",
    noun: "hero video",
    endpoint: "/api/site/videos/hero",
    hint: "Upload the original 1080p or 4K clip from Photos — not a compressed copy. It plays once with sound when someone presses play, up to one minute. On phones, portrait clips lengthen the hero so the full frame stays visible. On a wide screen they fill the viewport height. Landscape clips always fill the viewport height. The picture is never stretched.",
    profile: "hero",
    persistPoster: true,
    dir: "hero",
  },
};

export function isVideoSlot(value: string): value is VideoSlot {
  return VIDEO_SLOTS.includes(value as VideoSlot);
}

export function videoSlotDescriptor(slot: VideoSlot): VideoSlotDescriptor {
  return VIDEO_SLOT_DESCRIPTORS[slot];
}
