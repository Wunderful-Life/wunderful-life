"use client";

import { useEffect, useRef, useState } from "react";
import { useAdminView } from "@/components/admin/AdminViewProvider";
import { VideoThumbnail } from "@/components/ui/VideoThumbnail";
import type { PortfolioVideo } from "@/lib/videos/types";

type DetailVideoPlayerProps = {
  video: PortfolioVideo;
};

export function DetailVideoPlayer({ video }: DetailVideoPlayerProps) {
  const { viewMode } = useAdminView();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [playbackError, setPlaybackError] = useState(false);

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

  return (
    <div className="flex w-full justify-center">
      <div className="detail-video-frame overflow-hidden rounded-[1.75rem] border-[3.75px] border-sage-deep bg-forest-deep shadow-[0_16px_36px_rgba(51,81,61,0.16)]">
        <div className="detail-video-ratio relative w-full">
        {playing && !playbackError ? (
          <video
            ref={videoRef}
            src={video.videoPath}
            controls
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full bg-forest-deep object-cover"
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
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-forest-deep/20 via-transparent to-transparent" />
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
    </div>
  );
}
