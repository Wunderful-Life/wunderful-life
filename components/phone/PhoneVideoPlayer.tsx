"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PortfolioVideo } from "@/lib/videos/types";
import { VideoThumbnail } from "@/components/ui/VideoThumbnail";
import { useAdminView } from "@/components/admin/AdminViewProvider";
import { PhoneFrame } from "./PhoneFrame";

type CaptionClasses = {
  title?: string;
  brand?: string;
  link?: string;
};

const defaultCaptionClasses: Required<CaptionClasses> = {
  title: "text-sm font-semibold text-brown",
  brand: "text-xs text-muted",
  link: "text-xs font-medium text-blush-deep hover:underline",
};

type PhoneVideoPlayerProps = {
  video: PortfolioVideo;
  tilt?: number;
  size?: "sm" | "md" | "lg";
  activeId: string | null;
  onActivate: (id: string | null) => void;
  showTitle?: boolean;
  linkToDetail?: boolean;
  captionClasses?: CaptionClasses;
};

export function PhoneVideoPlayer({
  video,
  tilt = 0,
  size = "md",
  activeId,
  onActivate,
  showTitle = true,
  linkToDetail = true,
  captionClasses,
}: PhoneVideoPlayerProps) {
  const caption = { ...defaultCaptionClasses, ...captionClasses };
  const { viewMode } = useAdminView();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackError, setPlaybackError] = useState(false);
  const isPlaying = activeId === video.id;

  const handleActivate = useCallback(() => {
    setPlaybackError(false);
    onActivate(video.id);
  }, [onActivate, video.id]);

  const handleDeactivate = useCallback(() => {
    onActivate(null);
  }, [onActivate]);

  const playElement = useCallback((element: HTMLVideoElement | null) => {
    if (!element) return;
    const playPromise = element.play();
    if (playPromise) {
      void playPromise.catch(() => {
        setPlaybackError(true);
      });
    }
  }, []);

  // AnimatePresence waits for the thumbnail to exit before mounting the
  // player, so the effect below can run while videoRef is still null.
  const bindVideo = useCallback(
    (element: HTMLVideoElement | null) => {
      videoRef.current = element;
      if (element && isPlaying) playElement(element);
    },
    [isPlaying, playElement],
  );

  useEffect(() => {
    if (!isPlaying) return;
    playElement(videoRef.current);
  }, [isPlaying, playElement, video.videoPath]);

  useEffect(() => {
    if (!isPlaying) {
      setPlaybackError(false);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
    }
  }, [isPlaying]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (isPlaying) {
        handleDeactivate();
      } else {
        handleActivate();
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <PhoneFrame
        tilt={tilt}
        size={size}
        isActive={isPlaying}
      >
        <div className="relative h-full w-full">
          <AnimatePresence mode="wait">
            {!isPlaying ? (
              <motion.button
                key="thumb"
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={handleActivate}
                onKeyDown={handleKeyDown}
                className="group relative h-full w-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink/20"
                aria-label={`Play ${video.title}`}
              >
                <VideoThumbnail
                  src={video.thumbnailPath}
                  alt={video.title}
                  sizes="(max-width: 768px) 160px, 260px"
                  videoSrc={video.videoPath}
                />
                <div className="absolute inset-0 bg-brown/10 transition group-hover:bg-brown/5" />
                <div className="play-pulse absolute inset-0 flex items-center justify-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-brown shadow-lg">
                    ▶
                  </span>
                </div>
              </motion.button>
            ) : (
              <motion.div
                key="video"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black"
              >
                {playbackError ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
                    <p className="text-sm font-medium text-white">
                      This video could not be played.
                    </p>
                    {viewMode === "admin" && (
                      <p className="text-xs text-white/70">
                        Re-upload it from the editor as an MP4 so it plays in every
                        browser.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleDeactivate}
                      className="rounded-full bg-white/90 px-4 py-2 text-xs font-semibold text-brown"
                    >
                      Back
                    </button>
                  </div>
                ) : (
                  <video
                    ref={bindVideo}
                    src={video.videoPath}
                    controls
                    playsInline
                    preload="none"
                    className="h-full w-full object-cover"
                    onEnded={handleDeactivate}
                    onError={() => setPlaybackError(true)}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PhoneFrame>

      {showTitle && (
        <div className="max-w-[200px] text-center">
          <p className={caption.title}>{video.title}</p>
          <p className={caption.brand}>{video.brand}</p>
          {linkToDetail && (
            <Link
              href={`/work/${video.slug}`}
              className={`mt-1 inline-block ${caption.link}`}
            >
              View details
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
