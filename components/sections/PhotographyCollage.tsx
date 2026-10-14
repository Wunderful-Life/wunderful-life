"use client";

import dynamic from "next/dynamic";
import { useLayoutEffect, useRef, useState } from "react";
import { AdminEditButton } from "@/components/admin/AdminEditButton";
import { useAdminView } from "@/components/admin/AdminViewProvider";
import { SectionButterfly } from "@/components/ui/ButterflyFlight";
import { DeferredMount } from "@/components/ui/DeferredMount";
import { DecorMotifs } from "@/components/ui/DecorMotifs";
import {
  StaggerChildren,
  StaggerItem,
  type RevealVariant,
} from "@/components/ui/motion";
import {
  COLLAGE_GRID_CLASS,
  COLLAGE_TILE_FRAME_CLASS,
  CollageTileMedia,
  SHAPE_SPAN,
} from "@/components/sections/photography-collage-shared";

const SortablePhotographyGrid = dynamic(
  () =>
    import("@/components/sections/SortablePhotographyGrid").then(
      (module) => module.SortablePhotographyGrid,
    ),
  { ssr: false },
);

const COLLAGE_REVEALS: RevealVariant[] = ["fadeUp", "fadeLeft", "fadeRight"];

type TitleLayout = "auto" | "stack";

function usePhotographyTitleFit(label: string) {
  const shellRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [layout, setLayout] = useState<TitleLayout>("auto");

  useLayoutEffect(() => {
    const shell = shellRef.current;
    const grid = gridRef.current;
    const measure = measureRef.current;
    if (!shell || !grid || !measure) return;

    const update = () => {
      const wordLength = measure.offsetWidth;
      const gridHeight = grid.clientHeight;
      setLayout(wordLength + 16 <= gridHeight ? "auto" : "stack");
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(shell);
    observer.observe(grid);
    observer.observe(measure);

    const fonts = document.fonts;
    if (fonts?.ready) {
      void fonts.ready.then(update);
    }

    return () => observer.disconnect();
  }, [label]);

  return { shellRef, gridRef, measureRef, layout };
}

export function PhotographyCollage() {
  const { site, viewMode, openSiteEditor } = useAdminView();
  const isAdminView = viewMode === "admin";
  const photos = site.photography.photos;
  const label = site.photography.label;
  const { shellRef, gridRef, measureRef, layout } = usePhotographyTitleFit(label);

  if (photos.length === 0) return null;

  return (
    <section
      id="photography"
      aria-labelledby="photography-heading"
      className="photography-about-band scroll-section-anchor relative overflow-hidden px-4 pt-8 pb-16 sm:px-6 sm:pt-10 sm:pb-20"
    >
      <DecorMotifs preset="right" />
      <AdminEditButton section="photography" label="Edit photos" />
      <SectionButterfly flight="photography" />
      <SectionButterfly flight="photographyAccent" />
      <SectionButterfly flight="photographyLow" />

      <div ref={shellRef} className="photography-shell relative z-10">
        <span ref={measureRef} className="photography-word-measure" aria-hidden>
          {label}
        </span>
        <div className="photography-frame" data-title-layout={layout}>
          <h2 id="photography-heading" className="photography-word photography-word-left">
            {label}
          </h2>
          <div className="photography-center">
            {isAdminView && (
              <p className="mx-auto mb-3 max-w-md text-center text-sm text-brown/80">
                Drag photos to reorder. They flow left to right, top to bottom.
                Click a photo to edit.
              </p>
            )}
            <div ref={gridRef} className="min-h-[28rem] sm:min-h-[36rem]">
              <DeferredMount>
                {isAdminView ? (
                  <SortablePhotographyGrid
                    photos={photos}
                    onEdit={(photoId) =>
                      openSiteEditor("photography", {
                        kind: "photography-photo",
                        photoId,
                      })
                    }
                  />
                ) : (
                  <StaggerChildren className={COLLAGE_GRID_CLASS}>
                    {photos.map((photo, index) => (
                      <StaggerItem
                        key={photo.id}
                        variant={COLLAGE_REVEALS[index % COLLAGE_REVEALS.length] ?? "fadeUp"}
                        className={`${SHAPE_SPAN[photo.shape]} min-h-0 min-w-0 overflow-hidden`}
                      >
                        <div className={COLLAGE_TILE_FRAME_CLASS}>
                          <CollageTileMedia photo={photo} />
                        </div>
                      </StaggerItem>
                    ))}
                  </StaggerChildren>
                )}
              </DeferredMount>
            </div>
          </div>
          <p className="photography-word photography-word-right" aria-hidden>
            {label}
          </p>
        </div>
      </div>
    </section>
  );
}
