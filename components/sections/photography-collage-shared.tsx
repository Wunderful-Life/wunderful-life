import Image from "next/image";
import { shouldBypassImageOptimizer } from "@/lib/media/urls";
import type { CollagePhoto, CollagePhotoShape } from "@/lib/site/types";

/** Row/column spans that give the collage its irregular, scrapbook rhythm. */
export const SHAPE_SPAN: Record<CollagePhotoShape, string> = {
  square: "col-span-1 row-span-1",
  tall: "col-span-1 row-span-2",
  wide: "col-span-2 row-span-1",
};

export const COLLAGE_GRID_CLASS =
  "grid auto-rows-[minmax(0,7rem)] grid-flow-row-dense grid-cols-3 gap-2 sm:auto-rows-[minmax(0,9rem)] sm:grid-cols-4 sm:gap-3";

export const COLLAGE_TILE_FRAME_CLASS =
  "clipped-media-frame relative h-full w-full min-h-0 min-w-0 overflow-hidden rounded-2xl border border-white/60 bg-paper/40 shadow-sm";

export function CollageTileMedia({
  photo,
  showUploadHint = false,
}: {
  photo: CollagePhoto;
  showUploadHint?: boolean;
}) {
  if (photo.imagePath) {
    return (
      <Image
        src={photo.imagePath}
        alt={photo.alt}
        fill
        sizes="(max-width: 640px) 33vw, 25vw"
        decoding="async"
        unoptimized={shouldBypassImageOptimizer(photo.imagePath)}
        className="object-cover"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "cover",
        }}
      />
    );
  }

  return (
    <div className="flex h-full items-center justify-center bg-gradient-to-br from-paper/80 via-blush/25 to-lavender/25 p-3 text-center">
      {showUploadHint && (
        <p className="font-label text-[10px] font-semibold tracking-[0.14em] text-brown/70 uppercase">
          Upload photo
        </p>
      )}
    </div>
  );
}
