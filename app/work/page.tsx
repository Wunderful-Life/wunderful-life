import { WorkPageClient } from "@/components/work/WorkPageClient";
import { SectionSurface } from "@/components/ui/SectionSurface";
import { sectionText } from "@/lib/sectionText";
import { getSiteContent } from "@/lib/site";
import { getVideos } from "@/lib/videos/load";

export const metadata = {
  title: "Work",
};

export default async function WorkPage() {
  const site = await getSiteContent();
  const videos = await getVideos();
  const text = sectionText.services;

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-16 sm:px-6">
      <SectionSurface tone="ivory" motifs="edges" />
      <div className="relative z-10 mx-auto max-w-6xl">
        <p className="font-label text-sm font-semibold tracking-[0.2em] text-sage-deep uppercase">
          Portfolio
        </p>
        <h1 className={`mt-2 font-serif text-4xl sm:text-5xl ${text.heading}`}>
          {site.name}&apos;s UGC Work
        </h1>
        <p className={`mt-4 max-w-2xl ${text.body}`}>
          A curated library of Emily&apos;s UGC videos, laid out for easy browsing.
          Press play to watch a clip here, or open a card for the full details.
        </p>
        <WorkPageClient initialVideos={videos} />
      </div>
    </div>
  );
}
