"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { PlantSectionBackground } from "@/components/ui/PlantSectionBackground";
import { useSiteContent } from "@/components/admin/AdminViewProvider";
import { shouldBypassImageOptimizer } from "@/lib/media/urls";
import { sectionWallpapers } from "@/lib/plants";
import type { MediaIntrinsicSize } from "@/lib/videos/cover-fit";

type MeasuredMedia = {
  sourceKey: string;
  size: MediaIntrinsicSize;
};

function usePortraitOrientation() {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(orientation: portrait)");
    const sync = () => setIsPortrait(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return isPortrait;
}

function ratioPaddingTop(size: MediaIntrinsicSize): string {
  if (size.width < 1) return "177.78%";
  return `${(size.height / size.width) * 100}%`;
}

/** Below center so the short frame holds the cascade instead of the canopy. */
const HERO_CROP_FOCUS_Y = 0.68;
const HERO_OBJECT_POSITION = `center ${HERO_CROP_FOCUS_Y * 100}%`;

function HeroClickToPlay({
  src,
  poster,
  onIntrinsicSize,
}: {
  src: string;
  poster?: string;
  onIntrinsicSize: (size: MediaIntrinsicSize) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const assignedSrcRef = useRef<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);

  function onPlayClick() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.defaultMuted = false;
    video.removeAttribute("muted");
    video.volume = 1;
    video.playsInline = true;
    // The DOM src is absolute after assignment, so compare the path we set.
    if (assignedSrcRef.current !== src || video.error) {
      video.src = src;
      assignedSrcRef.current = src;
    } else if (video.currentTime !== 0) {
      try {
        video.currentTime = 0;
      } catch {
        // Seek throws if metadata is not ready yet.
      }
    }
    setPlaying(true);
    // play() has to run in this click. A later effect loses the gesture and
    // Safari starts the clip muted or not at all.
    void video.play().catch(() => {
      setPlaying(false);
      setStarted(false);
    });
  }

  function onEnded() {
    const video = videoRef.current;
    if (video) {
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        // Seek throws if metadata is not ready yet.
      }
    }
    setPlaying(false);
    setStarted(false);
  }

  function onPlaybackError() {
    const video = videoRef.current;
    if (!video?.getAttribute("src")) return;
    video.pause();
    setPlaying(false);
    setStarted(false);
  }

  return (
    <div className="absolute inset-0">
      {poster ? (
        <Image
          src={poster}
          alt=""
          fill
          priority
          sizes="100vw"
          className={`pointer-events-none object-cover ${started ? "invisible" : ""}`}
          style={{ objectPosition: HERO_OBJECT_POSITION }}
          unoptimized={shouldBypassImageOptimizer(poster)}
          onLoad={(event) => {
            const image = event.currentTarget;
            if (image.naturalWidth > 0 && image.naturalHeight > 0) {
              onIntrinsicSize({
                width: image.naturalWidth,
                height: image.naturalHeight,
              });
            }
          }}
        />
      ) : null}
      <video
        ref={videoRef}
        preload="none"
        playsInline
        controls={started}
        aria-hidden={!started}
        aria-label={started ? "Hero video" : undefined}
        className={`absolute inset-0 h-full w-full bg-forest-deep object-cover ${
          started ? "pointer-events-auto" : "pointer-events-none opacity-0"
        }`}
        style={{ objectPosition: HERO_OBJECT_POSITION }}
        onPlaying={() => setStarted(true)}
        onEnded={onEnded}
        onError={onPlaybackError}
      />
      {playing ? null : (
        <button
          type="button"
          onClick={onPlayClick}
          className="pointer-events-auto absolute top-1/2 left-1/2 z-10 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/45 bg-paper/26 text-blush-deep/90 shadow-lg shadow-forest/8 ring-1 ring-white/25 backdrop-blur-xl transition hover:scale-105 hover:bg-paper/38 hover:text-forest focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/45 sm:h-24 sm:w-24"
          aria-label="Play hero video"
        >
          <span
            className="translate-x-0.5 text-4xl leading-none sm:translate-x-1 sm:text-5xl"
            aria-hidden
          >
            ▶
          </span>
        </button>
      )}
    </div>
  );
}

export function HeroVideoSection() {
  const site = useSiteContent();
  const { wallpaper, overlay } = sectionWallpapers.hero;
  const videoPath = site.hero.videoPath;
  const posterPath = site.hero.posterPath;
  const hasVideo = Boolean(videoPath);
  const hasPoster = Boolean(posterPath);
  const mediaSourceKey = `${videoPath ?? ""}\u0000${posterPath ?? ""}`;
  const [mediaSize, setMediaSize] = useState<MeasuredMedia | null>(null);
  const mediaSizeForSource =
    mediaSize?.sourceKey === mediaSourceKey ? mediaSize.size : null;

  const onIntrinsicSize = useCallback(
    (size: MediaIntrinsicSize) => {
      setMediaSize((current) => {
        if (
          current?.sourceKey === mediaSourceKey &&
          current.size.width === size.width &&
          current.size.height === size.height
        ) {
          return current;
        }
        return { sourceKey: mediaSourceKey, size };
      });
    },
    [mediaSourceKey],
  );

  const isPortraitOrientation = usePortraitOrientation();
  const knownLandscape = Boolean(
    mediaSizeForSource &&
      mediaSizeForSource.width >= mediaSizeForSource.height,
  );
  // Portrait clips size from their own ratio. On a wide desktop that box is
  // thousands of pixels tall, so landscape uses the fixed cover frame.
  const useExactRatio = Boolean(
    hasVideo && isPortraitOrientation && !knownLandscape,
  );
  const sizerSize = mediaSizeForSource ?? { width: 9, height: 16 };

  return (
    <section
      className="hero-video-band relative z-20 w-full overflow-hidden bg-forest-deep"
      data-exact={useExactRatio ? "true" : "false"}
      data-has-ratio={hasVideo ? "true" : "false"}
    >
      {/*
        In-flow padding-top box. A grid item with aspect-ratio is ignored in
        Safari, which left vertical clips in a fixed cover frame and cropped
        the top and bottom. Frame height is 70% of that original size.
      */}
      <div className="hero-video-sizers w-full min-w-0">
        {hasVideo ? (
          <div
            aria-hidden
            className="hero-video-sizer-exact w-full"
            style={{
              ["--hero-ratio-padding" as string]: ratioPaddingTop(sizerSize),
            }}
          />
        ) : null}
        <div aria-hidden className="hero-video-sizer-cover w-full" />
      </div>

      <div className="pointer-events-none absolute inset-0 z-0">
        <PlantSectionBackground
          wallpaper={wallpaper}
          overlay={hasVideo && hasPoster ? "none" : overlay}
        />
        {hasVideo && videoPath ? (
          <HeroClickToPlay
            key={videoPath}
            src={videoPath}
            poster={posterPath}
            onIntrinsicSize={onIntrinsicSize}
          />
        ) : null}
      </div>
    </section>
  );
}
