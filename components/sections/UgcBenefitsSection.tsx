"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AdminEditButton } from "@/components/admin/AdminEditButton";
import { SectionButterfly } from "@/components/ui/ButterflyFlight";
import { DecorMotifs } from "@/components/ui/DecorMotifs";
import { SectionReveal, StaggerChildren, StaggerItem } from "@/components/ui/motion";
import { useSiteContent } from "@/components/admin/AdminViewProvider";
import { statSource, type StatSource } from "@/lib/site/statSources";

/** Rotating tones for the circular stat cards, however many there are. */
const STAT_TONES = ["light", "paper", "dark"] as const;

/**
 * The UGC explainer and proof points, merged from the former "What Is UGC?"
 * and "Why UGC?" sections into one anchor.
 */
export function UgcBenefitsSection() {
  const site = useSiteContent();
  const { whatIsUgc, ugcBenefits } = site;

  return (
    <section
      id="ugc"
      aria-labelledby="ugc-heading"
      className="ugc-benefits-section scroll-section-anchor relative overflow-hidden px-4 pt-10 pb-16 sm:px-6 sm:pt-16 sm:pb-20"
    >
      <DecorMotifs preset="scatter" tone="paper" />
      <AdminEditButton section="ugc" label="Edit UGC" tone="light" />
      <SectionButterfly flight="ugc" />
      <SectionButterfly flight="ugcTrailing" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <SectionReveal variant="fadeUp" className="mx-auto max-w-2xl text-center">
          <h2
            id="ugc-heading"
            className="font-didone text-3xl font-black tracking-tight text-paper sm:text-5xl"
          >
            {whatIsUgc.heading}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-paper/85 sm:mt-4 sm:text-base">
            {whatIsUgc.body}
          </p>
        </SectionReveal>

        {ugcBenefits.stats.length > 0 && (
          <StaggerChildren className="mx-auto mt-7 grid max-w-4xl grid-cols-3 items-start gap-2 sm:mt-10 sm:gap-6">
            {ugcBenefits.stats.map((stat, index) => {
              const source = statSource(stat.value);
              return (
              <StaggerItem key={stat.id} variant="fadeUp" className="min-w-0">
                <article className="ugc-stat">
                  <div
                    className={`ugc-stat-card ugc-stat-card-${STAT_TONES[index % STAT_TONES.length]}`}
                  >
                    <p className="ugc-stat-value font-serif leading-none">
                      {stat.value}
                    </p>
                  </div>
                  <p className="ugc-stat-label">{source?.label ?? stat.label}</p>
                </article>
              </StaggerItem>
              );
            })}
          </StaggerChildren>
        )}

        <div className="mt-8 grid gap-6 lg:mt-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-14">
          <SectionReveal variant="fadeLeft" className="text-center lg:text-left">
            <p className="font-label text-[0.65rem] font-semibold tracking-[0.2em] text-paper/80 uppercase sm:text-xs">
              {ugcBenefits.calloutLabel}
            </p>
            <p className="mt-2 font-serif text-5xl leading-none text-paper sm:mt-3 sm:text-7xl">
              {ugcBenefits.calloutValue}
            </p>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-paper/85 lg:mx-0 sm:mt-4 sm:text-base">
              {ugcBenefits.calloutBody}
            </p>
          </SectionReveal>

          <SectionReveal
            variant="fadeRight"
            delay={0.12}
            className="ugc-benefits-card rounded-[1.5rem] border border-paper/40 p-5 text-ink shadow-xl sm:rounded-[2rem] sm:p-8"
          >
            <h3 className="font-serif text-xl text-forest sm:text-3xl">
              {ugcBenefits.benefitsHeading}
            </h3>
            <ul className="mt-4 grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4">
              {ugcBenefits.benefits.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-start gap-3 text-sm leading-relaxed"
                >
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest text-xs text-paper"
                  >
                    ✓
                  </span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </SectionReveal>
        </div>
      </div>

      <UgcSourcesButton
        sources={ugcBenefits.stats.flatMap((stat) => {
          const source = statSource(stat.value);
          return source ? [{ value: stat.value, source }] : [];
        })}
      />
    </section>
  );
}

function UgcSourcesButton({
  sources,
}: {
  sources: { value: string; source: StatSource }[];
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (sources.length === 0) return null;

  return (
    <div ref={rootRef} className="absolute right-4 bottom-4 z-40 sm:right-6 sm:bottom-6">
      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Sources"
          className="absolute right-0 bottom-full mb-2 w-72 rounded-2xl border border-forest/15 bg-paper p-4 text-left text-ink shadow-xl"
        >
          <ul className="flex flex-col gap-3">
            {sources.map(({ value, source }) => (
              <li key={value}>
                <a
                  href={source.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm leading-snug underline decoration-forest/30 underline-offset-2 hover:text-forest"
                >
                  <span className="font-semibold">{value}</span>
                  {" · "}
                  {source.sourceName}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center rounded-full border border-paper/40 bg-forest-deep/70 px-3 py-1.5 font-label text-[11px] font-semibold tracking-[0.12em] text-paper uppercase shadow-sm backdrop-blur-md transition hover:bg-forest-deep"
      >
        Sources
      </button>
    </div>
  );
}
