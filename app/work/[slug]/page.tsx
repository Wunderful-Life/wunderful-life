import { notFound } from "next/navigation";
import { DetailVideoPlayer } from "@/components/work/DetailVideoPlayer";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { SectionReveal } from "@/components/ui/motion";
import { getVideo, getVideos } from "@/lib/videos/load";
import {
  formatDuration,
  platformLabel,
} from "@/lib/videos/types";

type WorkDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const videos = await getVideos();
  return videos.map((video) => ({ slug: video.slug }));
}

export async function generateMetadata({ params }: WorkDetailPageProps) {
  const { slug } = await params;
  const video = await getVideo(slug);
  if (!video) return { title: "Not Found" };
  return {
    title: video.title,
    description: video.hook,
  };
}

export default async function WorkDetailPage({ params }: WorkDetailPageProps) {
  const { slug } = await params;
  const video = await getVideo(slug);

  if (!video) notFound();

  const metadataItems = [
    video.brand.trim() ? { label: "Brand", value: video.brand } : null,
    { label: "Platform", value: platformLabel(video.platform) },
    video.durationSec > 0
      ? { label: "Duration", value: formatDuration(video.durationSec) }
      : null,
    video.hook.trim() ? { label: "Hook", value: video.hook } : null,
    video.cta.trim() ? { label: "CTA", value: video.cta } : null,
  ].filter((item): item is { label: string; value: string } => item !== null);

  return (
    <div className="section-wash-blush relative min-h-screen px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-5xl lg:max-w-6xl">
        <AnimatedButton href="/work" variant="ghost" className="mb-8">
          ← Back to Work
        </AnimatedButton>

        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <SectionReveal>
            <DetailVideoPlayer key={video.id} video={video} />
          </SectionReveal>

          <div>
            <SectionReveal delay={0.1}>
              <h1 className="font-display text-3xl text-brown sm:text-4xl">
                {video.title}
              </h1>
              {video.brand.trim() && (
                <p className="mt-2 text-lg text-muted">{video.brand}</p>
              )}
            </SectionReveal>

            {metadataItems.length > 0 && (
              <SectionReveal delay={0.15} className="mt-8 space-y-4">
                {metadataItems.map((item) => (
                  <article
                    key={item.label}
                    className="rounded-2xl border-2 border-brown/10 bg-white/70 p-4 backdrop-blur-sm"
                  >
                    <h2 className="font-label text-xs font-semibold tracking-[0.18em] text-blush-deep uppercase">
                      {item.label}
                    </h2>
                    <p className="mt-2 text-brown">{item.value}</p>
                  </article>
                ))}
              </SectionReveal>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
