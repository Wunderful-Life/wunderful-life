"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { VideoThumbnail } from "@/components/ui/VideoThumbnail";
import type { PortfolioVideo } from "@/lib/videos/types";

type WorkPageClientProps = {
  initialVideos: PortfolioVideo[];
};

type WorkVideoCardProps = {
  video: PortfolioVideo;
};

function WorkVideoCard({ video }: WorkVideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    void videoRef.current?.play().catch(() => undefined);
  }, [playing]);

  const title = video.title.trim() || "Untitled video";

  return (
    <article className="group relative isolate flex h-full w-full max-w-[320px] flex-col justify-self-center overflow-hidden rounded-[2rem] border border-white/55 bg-paper/76 p-3 shadow-xl shadow-blush/10 ring-1 ring-lavender/20 backdrop-blur-md transition hover:-translate-y-1 hover:border-blush/40 hover:shadow-blush/18">
      <Link
        href={`/work/${video.slug}`}
        className="absolute inset-0 z-10 rounded-[2rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/45 focus-visible:ring-inset"
      >
        <span className="sr-only">View details for {title}</span>
      </Link>
      <div className="pointer-events-none absolute -top-10 -right-8 h-24 w-24 rounded-full bg-blush/18 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-10 h-28 w-28 rounded-full bg-lavender/24 blur-2xl" />

      <div className="pointer-events-none relative z-20 aspect-[9/16] shrink-0 overflow-hidden rounded-[1.45rem] bg-brown/10">
        {playing ? (
          <video
            ref={videoRef}
            src={video.videoPath}
            controls
            playsInline
            preload="none"
            className="pointer-events-auto h-full w-full bg-black object-cover"
            onEnded={() => setPlaying(false)}
          />
        ) : (
          <>
            <VideoThumbnail
              src={video.thumbnailPath}
              alt={title}
              sizes="(max-width: 640px) 78vw, (max-width: 1024px) 42vw, 280px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brown/38 via-brown/5 to-white/10 transition group-hover:from-brown/30" />
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="pointer-events-auto absolute top-1/2 left-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-white/45 bg-paper/26 text-blush-deep/90 shadow-lg shadow-forest/8 ring-1 ring-white/25 backdrop-blur-xl transition hover:scale-105 hover:bg-paper/38 hover:text-forest focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/45"
              aria-label={`Play ${title}`}
            >
              <span className="translate-x-0.5 text-2xl leading-none" aria-hidden>
                ▶
              </span>
            </button>
          </>
        )}
      </div>

      <div className="relative flex flex-1 flex-col px-2 pt-4 pb-2">
        <h2 className="font-display text-2xl leading-tight text-forest">{title}</h2>
        {video.brand.trim() && (
          <p className="mt-1 text-sm font-medium text-ink/75">{video.brand}</p>
        )}
        {video.hook.trim() && (
          <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-brown/78">
            {video.hook}
          </p>
        )}

        <div className="mt-auto pt-5">
          <span className="inline-flex items-center rounded-full border border-forest/20 bg-blush/16 px-4 py-2 text-sm font-semibold text-forest transition group-hover:border-forest/35 group-hover:bg-blush/24">
            View Details
          </span>
        </div>
      </div>
    </article>
  );
}

export function WorkPageClient({ initialVideos }: WorkPageClientProps) {
  return (
    <div className="mt-12">
      {initialVideos.length === 0 ? (
        <p className="rounded-[2rem] border border-dashed border-forest/20 bg-paper/62 px-6 py-14 text-center text-muted shadow-lg shadow-blush/8 backdrop-blur-md">
          No videos yet. Check back soon for new work.
        </p>
      ) : (
        <div className="grid items-stretch gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {initialVideos.map((video) => (
            <WorkVideoCard key={video.id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}
