"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useAdminView } from "@/components/admin/AdminViewProvider";
import { VideoThumbnail } from "@/components/ui/VideoThumbnail";
import type { PortfolioVideo } from "@/lib/videos/types";

type DetailVideoPlayerProps = {
  video: PortfolioVideo;
};

type FrameSize = {
  width: number;
  height: number;
};

const DEFAULT_FRAME: FrameSize = { width: 9, height: 16 };

function usableSize(width: number, height: number) {
  return width >= 2 && height >= 2;
}

export function DetailVideoPlayer({ video }: DetailVideoPlayerProps) {
  const { viewMode } = useAdminView();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);
  const [frame, setFrame] = useState<FrameSize>(DEFAULT_FRAME);

  useEffect(() => {
    let cancelled = false;
    let bestRank = 0;
    const apply = (width: number, height: number, rank: number) => {
      if (cancelled || !usableSize(width, height) || rank < bestRank) return;
      bestRank = rank;
      setFrame((current) =>
        current.width === width && current.height === height
          ? current
          : { width, height },
      );
    };

    const poster = new Image();
    if (video.thumbnailPath) {
      poster.onload = () => apply(poster.naturalWidth, poster.naturalHeight, 1);
      poster.src = video.thumbnailPath;
    }

    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.playsInline = true;
    const onMeta = () => apply(probe.videoWidth, probe.videoHeight, 2);
    probe.addEventListener("loadedmetadata", onMeta);
    probe.src = video.videoPath;

    return () => {
      cancelled = true;
      probe.removeEventListener("loadedmetadata", onMeta);
      probe.removeAttribute("src");
      probe.load();
    };
  }, [video.id, video.thumbnailPath, video.videoPath]);

  useEffect(() => {
    if (!playing) return;
    const element = videoRef.current;
    if (!element) return;
    const playPromise = element.play();
    if (playPromise) {
      void playPromise.catch(() => {
        setPlaying(false);
        setPlaybackError(true);
      });
    }
  }, [playing, video.videoPath]);

  const frameStyle = {
    paddingTop: `${(frame.height / frame.width) * 100}%`,
    "--detail-ar": String(frame.width / frame.height),
  } as CSSProperties;

  return (
    <div className="flex w-full justify-center">
      <div
        className="detail-video-frame relative overflow-hidden rounded-[1.75rem] bg-brown/10 shadow-[0_18px_44px_rgba(92,58,46,0.12)] ring-1 ring-white/80"
        style={frameStyle}
      >
        {playing && !playbackError ? (
          <video
            ref={videoRef}
            src={video.videoPath}
            controls
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full bg-black object-contain"
            onLoadedMetadata={(event) => {
              const { videoWidth, videoHeight } = event.currentTarget;
              if (!usableSize(videoWidth, videoHeight)) return;
              setFrame((current) =>
                current.width === videoWidth && current.height === videoHeight
                  ? current
                  : { width: videoWidth, height: videoHeight },
              );
            }}
            onError={() => {
              setPlaying(false);
              setPlaybackError(true);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setPlaybackError(false);
              setPlaying(true);
            }}
            className="group/play absolute inset-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/45 focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
            aria-label={
              playbackError ? `Retry ${video.title}` : `Play ${video.title}`
            }
          >
            <VideoThumbnail
              src={video.thumbnailPath}
              alt={video.title}
              sizes="(max-width: 1024px) 88vw, 420px"
              videoSrc={video.videoPath}
              className="object-contain"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brown/30 via-brown/5 to-white/10 transition group-hover/play:from-brown/24" />
            {playbackError ? (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-brown/72 px-6 text-center">
                <span className="text-sm font-medium text-white">
                  This video could not be played.
                </span>
                {viewMode === "admin" && (
                  <span className="text-xs text-white/80">
                    Re-upload it from the editor as an MP4 so it plays in every
                    browser.
                  </span>
                )}
                <span className="rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-brown">
                  Try again
                </span>
              </span>
            ) : (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/45 bg-paper/26 text-blush-deep/90 shadow-lg shadow-forest/8 ring-1 ring-white/25 backdrop-blur-xl transition group-hover/play:scale-105 group-hover/play:bg-paper/38 group-hover/play:text-forest">
                  <span className="translate-x-0.5 text-2xl leading-none">
                    ▶
                  </span>
                </span>
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
