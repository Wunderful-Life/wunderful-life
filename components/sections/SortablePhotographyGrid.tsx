"use client";

import { useCallback, useRef, useState } from "react";
import { useAdminView } from "@/components/admin/AdminViewProvider";
import { commitCollageOrder } from "@/components/admin/site-editor/commitCollageOrder";
import { moveItemTo } from "@/components/admin/site-editor/list";
import { useNativeSortable } from "@/components/admin/useNativeSortable";
import {
  COLLAGE_GRID_CLASS,
  COLLAGE_TILE_FRAME_CLASS,
  CollageTileMedia,
  SHAPE_SPAN,
} from "@/components/sections/photography-collage-shared";
import { toErrorMessage } from "@/lib/errors";
import type { CollagePhoto } from "@/lib/site/types";

type SortablePhotographyGridProps = {
  photos: CollagePhoto[];
  onEdit: (photoId: string) => void;
};

export function SortablePhotographyGrid({
  photos,
  onEdit,
}: SortablePhotographyGridProps) {
  const { site, setSite, siteVersion, setSiteVersion, setSiteUpdatedAt } =
    useAdminView();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const handleReorder = useCallback(
    (fromId: string, toId: string) => {
      if (busyRef.current) return;
      const fromIndex = photos.findIndex((photo) => photo.id === fromId);
      const toIndex = photos.findIndex((photo) => photo.id === toId);
      if (fromIndex === -1 || toIndex === -1) return;

      const nextPhotos = moveItemTo(photos, fromIndex, toIndex);
      if (nextPhotos === photos) return;

      busyRef.current = true;
      setBusy(true);
      setError(null);
      void commitCollageOrder({
        nextPhotos,
        currentSite: site,
        savedIds: new Set(site.photography.photos.map((photo) => photo.id)),
        siteVersion,
        setSite,
        setSiteVersion,
        setSiteUpdatedAt,
      })
        .catch((err) => {
          setError(toErrorMessage(err, "Failed to reorder photos."));
        })
        .finally(() => {
          busyRef.current = false;
          setBusy(false);
        });
    },
    [photos, setSite, setSiteUpdatedAt, setSiteVersion, site, siteVersion],
  );

  const { draggingId, overId, itemProps, consumeDidDrag } = useNativeSortable(
    handleReorder,
    { disabled: busy },
  );

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-xl bg-blush/15 px-4 py-2 text-center text-sm text-brown">
          {error}
        </p>
      )}
      <div className={COLLAGE_GRID_CLASS}>
        {photos.map((photo) => {
          const drag = itemProps(photo.id);
          const isDragging = draggingId === photo.id;
          const isOver = overId === photo.id && draggingId !== photo.id;

          return (
            <div key={photo.id} className={`${SHAPE_SPAN[photo.shape]} min-h-0 min-w-0 overflow-hidden`}>
              <button
                type="button"
                {...drag}
                aria-grabbed={isDragging}
                aria-label={`Edit ${photo.alt}`}
                onClick={() => {
                  if (consumeDidDrag()) return;
                  onEdit(photo.id);
                }}
                className={`${COLLAGE_TILE_FRAME_CLASS} group cursor-grab transition focus:outline-none focus-visible:ring-2 focus-visible:ring-forest/50 ${
                  isDragging
                    ? "cursor-grabbing opacity-50"
                    : isOver
                      ? "ring-2 ring-forest/50"
                      : ""
                } ${busy ? "pointer-events-none" : ""}`}
              >
                <CollageTileMedia photo={photo} showUploadHint />
                <span className="absolute inset-x-2 bottom-2 rounded-full border border-white/50 bg-paper/80 px-2 py-1 text-center font-label text-[10px] font-semibold tracking-[0.12em] text-forest uppercase opacity-0 backdrop-blur-md transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  Edit
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
