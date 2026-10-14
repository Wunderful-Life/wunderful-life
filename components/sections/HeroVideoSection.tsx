"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { PlantSectionBackground } from "@/components/ui/PlantSectionBackground";
import { useSiteContent } from "@/components/admin/AdminViewProvider";
import { shouldBypassImageOptimizer } from "@/lib/media/urls";
import { sectionWallpapers } from "@/lib/plants";
import type { MediaIntrinsicSize } from "@/lib/videos/cover-fit";

type MeasuredMedia = {
  sourceKey: string;
  size: MediaIntrinsicSize;
};

type FullscreenVideo = HTMLVideoElement & {
  webkitEnterFullscreen?: () => void;
};

function ratioPaddingTop(size: MediaIntrinsicSize): string {
  if (size.width < 1) return "177.78%";
  return `${(size.height / size.width) * 100}%`;
}

function enterFullscreen(video: HTMLVideoElement) {
  const webkit = video as FullscreenVideo;
  if (typeof webkit.webkitEnterFullscreen === "function") {
    try {
      webkit.webkitEnterFullscreen();
      return;
    } catch {
      // Desktop browsers without the legacy API fall through.
    }
  }
  if (typeof video.requestFullscreen === "function") {
    void video.requestFullscreen().catch(() => undefined);
  }
}

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

  function prime(video: HTMLVideoElement) {
    video.muted = false;
    video.defaultMuted = false;
    video.removeAttribute("muted");
    video.volume = 1;
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");
    if (assignedSrcRef.current !== src || video.error) {
      video.src = src;
      assignedSrcRef.current = src;
    } else if (!playing && video.currentTime !== 0) {
      try {
        video.currentTime = 0;
      } catch {
        // Seek throws if metadata is not ready yet.
      }
    }
  }

  function startPlayback() {
    const video = videoRef.current;
    if (!video) return null;
    prime(video);
    setPlaying(true);
    void video.play().catch(() => {
      setPlaying(false);
      setStarted(false);
    });
    return video;
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
    <div
      className={`hero-video-frame absolute inset-0 ${started ? "is-playing" : ""}`}
    >
      {poster ? (
        <Image
          src={poster}
          alt=""
          fill
          priority
          sizes="(max-width: 640px) 100vw, 72vh"
          className={`pointer-events-none object-contain ${started ? "invisible" : ""}`}
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
        controlsList="nofullscreen"
        aria-hidden={!started}
        aria-label={started ? "Hero video" : undefined}
        className={`absolute inset-0 h-full w-full bg-forest-deep object-contain ${
          started ? "pointer-events-auto" : "pointer-events-none opacity-0"
        }`}
        onPlaying={() => setStarted(true)}
        onLoadedMetadata={(event) => {
          const media = event.currentTarget;
          if (media.videoWidth > 0 && media.videoHeight > 0) {
            onIntrinsicSize({
              width: media.videoWidth,
              height: media.videoHeight,
            });
          }
        }}
        onEnded={onEnded}
        onError={onPlaybackError}
      />
      {playing ? null : (
        <button
          type="button"
          onClick={() => {
            startPlayback();
          }}
          className="hero-play-button pointer-events-auto absolute top-1/2 left-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/45 bg-paper/26 text-blush-deep/90 shadow-lg shadow-forest/8 ring-1 ring-white/25 backdrop-blur-xl transition hover:bg-paper/38 hover:text-forest focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/45 active:scale-95 lg:h-24 lg:w-24"
          aria-label="Play hero video"
        >
          <span
            className="hero-play-mark translate-x-0.5 text-3xl leading-none lg:translate-x-1 lg:text-5xl"
            aria-hidden
          >
            ▶
          </span>
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          const video = startPlayback();
          if (!video) return;
          video.style.opacity = "1";
          setStarted(true);
          enterFullscreen(video);
        }}
        className="hero-video-fullscreen pointer-events-auto absolute z-20 flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-white/45 bg-paper/26 text-blush-deep/90 shadow-lg shadow-forest/8 ring-1 ring-white/25 backdrop-blur-xl transition hover:bg-paper/38 hover:text-forest focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/45 active:scale-95 sm:h-14 sm:w-14"
        aria-label="Full screen"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 sm:h-6 sm:w-6"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M4 9V4h5v2H6v3H4zm11-5h5v5h-2V6h-3V4zM4 15h2v3h3v2H4v-5zm14 3v-3h2v5h-5v-2h3z"
          />
        </svg>
      </button>
    </div>
  );
}

export function HeroVideoSection() {
  const site = useSiteContent();
  const { wallpaper, overlay } = sectionWallpapers.hero;
  const videoPath = site.hero.videoPath;
  const posterPath = site.hero.posterPath;
  const hasVideo = Boolean(videoPath);
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

  const sizerSize = mediaSizeForSource ?? { width: 9, height: 16 };

  return (
    <section className="hero-video-band relative z-20 w-full overflow-hidden bg-forest-deep">
      {hasVideo && videoPath ? (
        <div
          className="hero-video-stage relative mx-auto"
          style={{
            ["--hero-aspect" as string]: String(
              sizerSize.width / sizerSize.height,
            ),
            ["--hero-ratio-padding" as string]: ratioPaddingTop(sizerSize),
          }}
        >
          {/*
            In-flow padding-top box. A grid item with aspect-ratio is ignored
            in Safari, which left the clip cropped inside a short wide frame.
          */}
          <div aria-hidden className="hero-video-stage-ratio w-full" />
          <HeroClickToPlay
            key={videoPath}
            src={videoPath}
            poster={posterPath}
            onIntrinsicSize={onIntrinsicSize}
          />
        </div>
      ) : (
        <>
          <div aria-hidden className="hero-video-sizer-cover w-full" />
          <div className="pointer-events-none absolute inset-0 z-0">
            <PlantSectionBackground wallpaper={wallpaper} overlay={overlay} />
          </div>
        </>
      )}
    </section>
  );
}
