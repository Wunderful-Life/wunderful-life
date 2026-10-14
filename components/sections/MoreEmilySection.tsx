"use client";

import { AdminEditButton } from "@/components/admin/AdminEditButton";
import { SectionButterfly } from "@/components/ui/ButterflyFlight";
import { DeferredMount } from "@/components/ui/DeferredMount";
import { SectionReveal, StaggerChildren, StaggerItem } from "@/components/ui/motion";
import { EmilyPhoto } from "@/components/ui/EmilyPhoto";
import { SectionSurface } from "@/components/ui/SectionSurface";
import { useSiteContent } from "@/components/admin/AdminViewProvider";
import { sectionText } from "@/lib/sectionText";

export function MoreEmilySection() {
  const site = useSiteContent();
  const text = sectionText.about;
  const galleryPhotos = site.about.photos
    .slice(2)
    .filter((photo) => photo.imagePath);

  if (galleryPhotos.length === 0) {
    return null;
  }

  return (
    <section
      id="more-emily"
      className="scroll-section-anchor relative overflow-hidden px-4 pt-16 pb-20 sm:px-6 sm:pt-20 sm:pb-24"
    >
      <SectionSurface tone="sage" motifs="scatter" />
      <SectionButterfly flight="aboutFar" />
      <SectionButterfly flight="aboutGalleryCompanion" />
      <AdminEditButton section="photos" label="Edit My vibe" />
      <div className="relative z-10 mx-auto max-w-5xl">
        <SectionReveal variant="fadeUp" className="text-center">
          <h2 className={`font-didone text-3xl font-black tracking-tight sm:text-5xl ${text.heading}`}>
            {site.about.galleryHeading}
          </h2>
        </SectionReveal>
        <DeferredMount className="min-h-[20rem] sm:min-h-[24rem]">
          <StaggerChildren className="mx-auto mt-8 grid w-full min-w-0 max-w-5xl grid-cols-2 justify-items-center gap-x-6 gap-y-10 sm:mt-10 sm:gap-x-10 lg:grid-cols-4">
            {galleryPhotos.map((photo, index) => (
              <StaggerItem
                key={photo.id}
                variant={
                  index % 4 === 0
                    ? "fadeLeft"
                    : index % 4 === 3
                      ? "fadeRight"
                      : "fadeUp"
                }
                className="w-full min-w-0 max-w-[260px] sm:max-w-[290px]"
              >
                <EmilyPhoto photo={photo} size="md" className="mx-auto" />
              </StaggerItem>
            ))}
          </StaggerChildren>
        </DeferredMount>
      </div>
    </section>
  );
}
