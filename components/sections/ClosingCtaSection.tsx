"use client";

import { normalizeHref } from "@/lib/site/normalize";
import { motion } from "framer-motion";
import Image from "next/image";
import { AdminEditButton } from "@/components/admin/AdminEditButton";
import { useAdminView, useSiteContent } from "@/components/admin/AdminViewProvider";
import { BrandLogo, SIGNATURE } from "@/components/ui/BrandLogo";
import { SectionButterfly } from "@/components/ui/ButterflyFlight";
import { EmilyPhoto } from "@/components/ui/EmilyPhoto";
import { SectionSurface } from "@/components/ui/SectionSurface";
import { SectionReveal } from "@/components/ui/motion";

/**
 * "Let's work together" in Bodoni Moda 14pt Black with tracking-tight.
 * Other headlines use a wider per-letter estimate so a longer line still fits.
 */
const DEFAULT_HEADLINE_EM = 9.479;

function closingHeadlineFontSize(headline: string): string {
  const normalized = headline.trim().replace(/\u2019/g, "'");
  const em =
    normalized === "Let's work together"
      ? DEFAULT_HEADLINE_EM
      : Math.max(normalized.length, 1) * 0.64;
  const preferred = (92 / em).toFixed(3);
  return `clamp(1.6rem, ${preferred}cqi, 6rem)`;
}

function splitClosingBody(body: string): { lead: string; closer: string } | null {
  const mark = body.lastIndexOf("?");
  if (mark < 0) return null;
  const lead = body.slice(0, mark + 1).trim();
  const closer = body.slice(mark + 1).trim();
  if (!lead || !closer) return null;
  return { lead, closer };
}

function InstagramIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 sm:h-6 sm:w-6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="3.6" />
      <path d="M17.35 6.75h.01" />
    </svg>
  );
}

export function ClosingCtaSection() {
  const site = useSiteContent();
  const { viewMode } = useAdminView();
  const { closingCta, social } = site;
  const showPhoto =
    closingCta.showPhoto &&
    (Boolean(closingCta.photo.imagePath) || viewMode === "admin");
  const bodyLines = splitClosingBody(closingCta.body);

  return (
    <section
      id="contact"
      aria-labelledby="closing-cta-heading"
      className="scroll-section-anchor relative overflow-hidden px-4 pt-16 pb-8 sm:px-6 sm:pt-24 sm:pb-10"
    >
      <SectionSurface tone="ivory" motifs="scatter" />
      <SectionButterfly flight="closing" />
      <SectionButterfly flight="closingAccent" />
      <SectionButterfly flight="closingFar" />
      <AdminEditButton section="cta" label="Edit CTA" />

      <SectionReveal
        variant="slideFromLeft"
        duration={0.9}
        className={`relative z-10 mx-auto grid w-full min-w-0 max-w-5xl items-center gap-10 sm:gap-14 ${
          showPhoto
            ? "lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]"
            : "justify-items-center"
        }`}
      >
        {showPhoto ? (
          <div className="mx-auto w-full min-w-0 max-w-xs lg:max-w-none">
            <EmilyPhoto photo={closingCta.photo} size="lg" />
          </div>
        ) : null}

        <div
          className={`w-full min-w-0 max-w-full [container-type:inline-size] ${
            showPhoto ? "text-center lg:text-left" : "text-center"
          }`}
        >
          <h2
            id="closing-cta-heading"
            style={{ fontSize: closingHeadlineFontSize(closingCta.headline) }}
            className="mx-auto max-w-full pb-1 font-didone font-black tracking-tight whitespace-nowrap text-forest"
          >
            {closingCta.headline}
          </h2>
          <p
            className={`mx-auto mt-5 max-w-md text-sm leading-relaxed text-balance text-ink/80 sm:text-base${
              showPhoto ? " lg:mx-0" : " md:max-w-none"
            }`}
          >
            {bodyLines ? (
              <>
                <span>{bodyLines.lead}</span>
                <span className="md:hidden"> </span>
                <span className="md:block">{bodyLines.closer}</span>
              </>
            ) : (
              closingCta.body
            )}
          </p>

          <div
            className={`mt-8 flex max-w-full flex-wrap items-center justify-center gap-3 sm:gap-4${
              showPhoto ? " lg:justify-start" : ""
            }`}
          >
            <motion.a
              href={normalizeHref(social.email)}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex max-w-full items-center justify-center rounded-full bg-forest px-5 py-3.5 text-center font-label text-sm font-semibold tracking-[0.03em] text-paper underline underline-offset-4 shadow-lg transition hover:bg-forest-deep sm:px-8 sm:text-base"
            >
              {closingCta.emailLabel}
            </motion.a>

            <motion.a
              href={normalizeHref(social.instagram)}
              aria-label="Open Instagram"
              whileHover={{ scale: 1.06, y: -2 }}
              whileTap={{ scale: 0.96 }}
              className="inline-flex aspect-square shrink-0 items-center justify-center rounded-full border border-forest/25 bg-paper/80 p-3.5 text-forest shadow-sm backdrop-blur-sm transition hover:border-forest/50 hover:bg-paper"
            >
              <InstagramIcon />
            </motion.a>
          </div>

          <div
            className={`mx-auto mt-9 w-[min(100%,16.5rem)] sm:mt-10 sm:w-[min(100%,20rem)] lg:mt-12 lg:w-[min(100%,22.5rem)]${
              showPhoto ? " lg:mx-0 lg:ml-1" : ""
            }`}
          >
            <figure className="mx-auto w-[83.5%] px-1 pt-2">
              <Image
                src={SIGNATURE.src}
                alt="Emily Wunden"
                width={SIGNATURE.width}
                height={SIGNATURE.height}
                sizes="(max-width: 640px) 13.75rem, (max-width: 1024px) 16.25rem, 18.5rem"
                className="h-auto w-full origin-center -rotate-1 mix-blend-multiply"
              />
            </figure>

            <figure className="mt-2 sm:mt-3">
              <BrandLogo
                alt={site.fullName || "Logo"}
                sizes="(max-width: 640px) 16.5rem, (max-width: 1024px) 20rem, 22.5rem"
                className="h-auto w-full"
              />
            </figure>
          </div>
        </div>
      </SectionReveal>
    </section>
  );
}
