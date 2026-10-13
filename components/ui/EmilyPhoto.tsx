import type { ReactNode } from "react";
import Image from "next/image";
import { shouldBypassImageOptimizer } from "@/lib/media/urls";
import {
  resolveAboutPhotoFrame,
  resolveAboutPhotoShowShadow,
  type AboutPhoto,
  type AboutPhotoFrame,
} from "@/lib/site/types";

const PHOTO_FRAME_GRADIENT = "from-lavender/55 via-lavender/22 to-cream";

type EmilyPhotoSize = "sm" | "md" | "lg" | "xl" | "hero" | "gallery" | "panel";

type EmilyPhotoProps = {
  photo: AboutPhoto;
  size?: EmilyPhotoSize;
  className?: string;
  /** Override for captions sitting on a dark surface instead of cream. */
  captionClassName?: string;
};

const sizeClasses: Record<EmilyPhotoSize, string> = {
  sm: "w-[160px] max-w-full",
  md: "w-[260px] max-w-full sm:w-[290px]",
  lg: "w-[280px] max-w-full sm:w-[340px] xl:w-[400px]",
  xl: "w-[320px] max-w-full sm:w-[420px] xl:w-[480px]",
  hero: "w-full max-w-full sm:max-w-[min(100%,480px)] xl:max-w-[min(100%,560px)]",
  gallery: "w-full max-w-md mx-auto sm:max-w-none",
  panel: "w-[150px] max-w-full sm:w-[180px]",
};

const polaroidPadClasses: Record<EmilyPhotoSize, string> = {
  sm: "p-2",
  md: "p-2",
  lg: "p-2.5",
  xl: "p-3",
  hero: "p-3 sm:p-4",
  gallery: "p-2.5 sm:p-3",
  panel: "p-2",
};

const imageSizes: Record<EmilyPhotoSize, string> = {
  sm: "160px",
  md: "290px",
  lg: "340px",
  xl: "480px",
  hero: "(max-width: 640px) 360px, (max-width: 1024px) 480px, 640px",
  gallery: "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  panel: "(max-width: 640px) 150px, 180px",
};

type ShapedFrame = Exclude<AboutPhotoFrame, "polaroid">;

/** Height as a percentage of width. Padding, not aspect-ratio: Safari drops aspect-ratio and a fill image then covers the page. */
const shapedFramePadding: Record<ShapedFrame, string> = {
  arch: "133.333%",
  oval: "125%",
  circle: "100%",
  rounded: "125%",
  square: "100%",
};

const shapedWindowClasses: Record<ShapedFrame, string> = {
  arch: "rounded-t-full",
  oval: "rounded-full",
  circle: "rounded-full",
  rounded: "rounded-3xl",
  square: "rounded-2xl",
};

const POLAROID_SHADOW =
  "shadow-[0_10px_24px_-6px_rgba(61,55,46,0.3),0_3px_8px_-2px_rgba(61,55,46,0.12)]";

const SHAPED_FRAME_SHADOW: Record<ShapedFrame, string> = {
  arch: "shadow-[0_14px_26px_-8px_rgba(61,55,46,0.32),0_5px_12px_-3px_rgba(61,55,46,0.14)]",
  oval: "shadow-[0_12px_26px_-6px_rgba(61,55,46,0.3),0_4px_10px_-2px_rgba(61,55,46,0.14)]",
  circle: "shadow-[0_12px_26px_-6px_rgba(61,55,46,0.3),0_4px_10px_-2px_rgba(61,55,46,0.14)]",
  rounded: POLAROID_SHADOW,
  square: POLAROID_SHADOW,
};

function PhotoCaption({
  caption,
  className = "text-ink/90",
}: {
  caption: string;
  className?: string;
}) {
  return (
    <figcaption
      className={`font-label mt-3 w-full text-center text-xs tracking-wide break-words sm:text-sm ${className}`}
    >
      {caption}
    </figcaption>
  );
}

function PhotoMedia({
  photo,
  size,
}: {
  photo: AboutPhoto;
  size: EmilyPhotoSize;
}) {
  if (photo.imagePath) {
    return (
      <Image
        src={photo.imagePath}
        alt={photo.caption}
        fill
        sizes={imageSizes[size]}
        decoding="async"
        unoptimized={shouldBypassImageOptimizer(photo.imagePath)}
        className="object-cover object-[center_22%]"
      />
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
      <span className="font-display text-4xl text-brown/25 sm:text-5xl">E</span>
      <p className="text-[10px] leading-snug text-brown/50 sm:text-xs">
        Photo placeholder
      </p>
    </div>
  );
}

function PhotoWindow({
  paddingTop,
  className,
  children,
}: {
  paddingTop: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <div className={`emily-photo-window relative w-full overflow-hidden ${className}`}>
      <div className="w-full" style={{ paddingTop }} />
      <div className="absolute inset-0">{children}</div>
    </div>
  );
}

function PolaroidPhoto({
  photo,
  size,
  className,
  captionClassName,
}: {
  photo: AboutPhoto;
  size: EmilyPhotoSize;
  className: string;
  captionClassName?: string;
}) {
  const showShadow = resolveAboutPhotoShowShadow(photo.showShadow);

  return (
    <figure
      className={`max-w-full ${sizeClasses[size]} ${polaroidPadClasses[size]} rotate-[var(--photo-rotate)] rounded-sm border border-white/90 bg-paper ${showShadow ? POLAROID_SHADOW : ""} ring-1 ring-lavender/20 ${className}`}
      style={{ ["--photo-rotate" as string]: `${photo.rotate}deg` }}
    >
      <PhotoWindow
        paddingTop="125%"
        className={`rounded-sm bg-gradient-to-br ${PHOTO_FRAME_GRADIENT}`}
      >
        <PhotoMedia photo={photo} size={size} />
      </PhotoWindow>
      {photo.showCaption !== false ? (
        <PhotoCaption caption={photo.caption} className={captionClassName} />
      ) : null}
    </figure>
  );
}

function ShapedPhoto({
  photo,
  size,
  frame,
  className,
  captionClassName,
}: {
  photo: AboutPhoto;
  size: EmilyPhotoSize;
  frame: ShapedFrame;
  className: string;
  captionClassName?: string;
}) {
  const showShadow = resolveAboutPhotoShowShadow(photo.showShadow);

  return (
    <figure className={`max-w-full ${sizeClasses[size]} ${className}`}>
      <PhotoWindow
        paddingTop={shapedFramePadding[frame]}
        className={`bg-gradient-to-br ${PHOTO_FRAME_GRADIENT} ${shapedWindowClasses[frame]} ${
          showShadow ? SHAPED_FRAME_SHADOW[frame] : ""
        }`}
      >
        <PhotoMedia photo={photo} size={size} />
      </PhotoWindow>
      {photo.showCaption !== false ? (
        <PhotoCaption caption={photo.caption} className={captionClassName} />
      ) : null}
    </figure>
  );
}

export function EmilyPhoto({
  photo,
  size = "md",
  className = "",
  captionClassName,
}: EmilyPhotoProps) {
  const frame = resolveAboutPhotoFrame(photo.frame);

  switch (frame) {
    case "polaroid":
      return (
        <PolaroidPhoto
          photo={photo}
          size={size}
          className={className}
          captionClassName={captionClassName}
        />
      );
    case "arch":
    case "oval":
    case "circle":
    case "rounded":
    case "square":
      return (
        <ShapedPhoto
          photo={photo}
          size={size}
          frame={frame}
          className={className}
          captionClassName={captionClassName}
        />
      );
    default: {
      const _exhaustive: never = frame;
      return _exhaustive;
    }
  }
}
