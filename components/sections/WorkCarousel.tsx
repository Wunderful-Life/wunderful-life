"use client";

import { AdminEditButton } from "@/components/admin/AdminEditButton";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { DeferredMount } from "@/components/ui/DeferredMount";
import { SectionButterfly } from "@/components/ui/ButterflyFlight";
import { PhoneMarquee } from "@/components/phone/PhoneMarquee";
import { SectionSurface } from "@/components/ui/SectionSurface";
import { SectionReveal } from "@/components/ui/motion";
import { useSiteContent } from "@/components/admin/AdminViewProvider";
import { sectionText } from "@/lib/sectionText";
import { uniqueVideosById } from "@/lib/videos/sort";
import type { PortfolioVideo } from "@/lib/videos/types";

type WorkCarouselProps = {
  featuredVideos: PortfolioVideo[];
};

/** Featured phone carousel with a forest title panel on the sage wash. */
export function WorkCarousel({ featuredVideos }: WorkCarouselProps) {
  const site = useSiteContent();
  const visibleVideos = uniqueVideosById(featuredVideos);

  if (visibleVideos.length === 0) return null;

  return (
    <div className="relative min-h-[28rem] overflow-hidden pt-8 pb-16 sm:min-h-[32rem] sm:pt-10 sm:pb-20">
      <SectionSurface tone="sage" motifs="scatter" />
      <SectionButterfly flight="workBand" />
      <SectionButterfly flight="workMarquee" />
      <AdminEditButton target="portfolio" label="Edit videos" />

      <div className="relative z-10">
        <SectionReveal variant="fadeUp" className="mx-auto mb-8 w-fit max-w-[calc(100%-2rem)] sm:mb-10">
          <div className="relative overflow-hidden rounded-[2rem] px-7 py-3.5 text-center shadow-[0_12px_32px_rgba(35,57,42,0.18)] sm:px-10 sm:py-4">
            <SectionSurface tone="forest" motifs="none" />
            <h2
              id="work-heading"
              className="relative z-10 font-didone pb-1 text-4xl font-black tracking-tight text-balance text-paper sm:text-6xl"
            >
              {site.work.heading}
            </h2>
          </div>
        </SectionReveal>

        <DeferredMount className="min-h-[24rem] sm:min-h-[28rem]">
          <PhoneMarquee
            videos={visibleVideos}
            emptyClassName={sectionText.work.empty}
            captionClasses={sectionText.work.caption}
          />
        </DeferredMount>

        <SectionReveal
          variant="fadeUp"
          delay={0.15}
          className="mt-10 flex justify-center px-4"
        >
          <AnimatedButton href="/work" variant="inverse">
            <span className="leading-none">
              See All of {site.name}&apos;s Work
            </span>
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-honey font-body text-lg leading-none text-forest transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5 sm:size-10"
            >
              →
            </span>
          </AnimatedButton>
        </SectionReveal>
      </div>
    </div>
  );
}
