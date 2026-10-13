"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { PortfolioVideo } from "@/lib/videos/types";
import { sortVideos, uniqueVideosById } from "@/lib/videos/sort";
import { confirmLeaveDuringUpload } from "@/lib/admin/uploadGuard";
import { VideoForm } from "@/components/admin/VideoForm";
import { VideoList } from "@/components/admin/VideoList";
import { RevisionHistory } from "@/components/admin/RevisionHistory";

type AdminDashboardProps = {
  initialVideos: PortfolioVideo[];
  onVideosChange?: (videos: PortfolioVideo[]) => void;
  onUploadBusyChange?: (busy: boolean) => void;
};

type VideoView = "library" | "add";

const SECTIONS: { id: VideoView; label: string; hint: string }[] = [
  { id: "library", label: "All videos", hint: "Browse & manage" },
  { id: "add", label: "Add video", hint: "New upload" },
];

export function AdminDashboard({
  initialVideos,
  onVideosChange,
  onUploadBusyChange,
}: AdminDashboardProps) {
  const router = useRouter();
  const [videos, setVideos] = useState(() => uniqueVideosById(initialVideos));
  const [view, setView] = useState<VideoView>("library");
  const [editing, setEditing] = useState<PortfolioVideo | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  useEffect(() => {
    setVideos(uniqueVideosById(initialVideos));
  }, [initialVideos]);

  useEffect(() => {
    onUploadBusyChange?.(uploadBusy);
  }, [onUploadBusyChange, uploadBusy]);

  useEffect(() => {
    return () => onUploadBusyChange?.(false);
  }, [onUploadBusyChange]);

  const commitVideos = useCallback(
    (next: PortfolioVideo[]) => {
      const sorted = sortVideos(uniqueVideosById(next));
      setVideos(sorted);
      onVideosChange?.(sorted);
      return sorted;
    },
    [onVideosChange],
  );

  const handleUploadBusyChange = useCallback((busy: boolean) => {
    setUploadBusy(busy);
  }, []);

  const trySetView = (next: VideoView) => {
    if (!confirmLeaveDuringUpload(uploadBusy)) return;
    setView(next);
  };

  const handleSuccess = (video: PortfolioVideo) => {
    setUploadBusy(false);
    setVideos((current) => {
      const next = sortVideos(
        uniqueVideosById(
          current.some((item) => item.id === video.id)
            ? current.map((item) => (item.id === video.id ? video : item))
            : [...current, video],
        ),
      );
      onVideosChange?.(next);
      return next;
    });
    setEditing(null);
    setView("library");
    router.refresh();
  };

  const handleEdit = (video: PortfolioVideo) => {
    if (!confirmLeaveDuringUpload(uploadBusy)) return;
    setEditing(video);
    setView("library");
  };

  const handleCancelEdit = () => {
    if (!confirmLeaveDuringUpload(uploadBusy)) return;
    setEditing(null);
  };

  if (editing) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <VideoForm
          key={editing.id}
          initial={editing}
          onSuccess={handleSuccess}
          onCancel={handleCancelEdit}
          onUploadBusyChange={handleUploadBusyChange}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
      <nav
        aria-label="Video sections"
        className="max-w-full shrink-0 border-b border-brown/10 bg-cream/40 md:w-52 md:max-w-none md:border-r md:border-b-0 lg:w-56"
      >
        <div className="flex max-w-full flex-wrap gap-1 px-3 py-2 md:flex-col md:flex-nowrap md:gap-0.5 md:px-3 md:py-4">
          {SECTIONS.map((item) => {
            const selected = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => trySetView(item.id)}
                className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-left transition md:w-full md:px-3 md:py-2.5 ${
                  selected
                    ? "bg-forest text-paper"
                    : "text-ink hover:bg-white/80"
                }`}
              >
                {item.id === "add" ? (
                  <span
                    aria-hidden
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
                      selected
                        ? "bg-paper text-forest shadow-[0_1px_0_rgba(35,57,42,0.18)]"
                        : "bg-forest text-paper"
                    }`}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      className="block"
                    >
                      <path
                        d="M7 2.25v9.5M2.25 7h9.5"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                ) : null}
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span
                    className={`hidden text-xs md:block ${
                      selected ? "text-paper/75" : "text-muted"
                    }`}
                  >
                    {item.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-5">
          {view === "library" ? (
            <section className="space-y-4">
              <div>
                <h3 className="font-display text-lg text-brown">Video library</h3>
                <p className="mt-1 text-sm text-muted">
                  Thumbnails, platforms, and featured status at a glance.
                </p>
              </div>
              <VideoList
                videos={videos}
                onEdit={handleEdit}
                onChange={commitVideos}
              />
              <RevisionHistory<PortfolioVideo[]>
                endpoint="/api/videos/revisions"
                confirmLabel={(revision) =>
                  `Restore the video library to version ${revision.version} from ${new Date(revision.createdAt).toLocaleString()}? Your current library stays in history.`
                }
                emptyHint="History appears after this site is connected to Supabase."
                onRestored={(next) => {
                  commitVideos(next);
                  router.refresh();
                }}
              />
            </section>
          ) : (
            <section className="space-y-4">
              <div>
                <h3 className="font-display text-lg text-brown">Add video</h3>
                <p className="mt-1 text-sm text-muted">
                  Pick your files first — they upload while you fill in the details.
                </p>
              </div>
              <VideoForm
                key="new"
                embedded
                onSuccess={handleSuccess}
                onUploadBusyChange={handleUploadBusyChange}
              />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
