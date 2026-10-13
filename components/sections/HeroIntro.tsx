"use client";

import Image from "next/image";
import { AdminEditButton } from "@/components/admin/AdminEditButton";
import { useSiteContent } from "@/components/admin/AdminViewProvider";
import { SectionButterfly } from "@/components/ui/ButterflyFlight";
import { HeroEntrance } from "@/components/ui/motion";
import { SectionSurface } from "@/components/ui/SectionSurface";
import { shouldBypassImageOptimizer } from "@/lib/media/urls";

const HERO_CREATOR_FALLBACK = {
  src: "/hero/creator-placeholder.webp",
  width: 900,
  height: 1350,
} as const;

const HILL_LAYERS = [
  {
    id: "far",
    opacity: 0.28,
    d: "M0.0,210.0 C26.7 203.0 103.3 170.0 160.0 168.0 C216.7 166.0 276.7 201.0 340.0 198.0 C403.3 195.0 470.0 151.7 540.0 150.0 C610.0 148.3 686.7 189.3 760.0 188.0 C833.3 186.7 906.7 144.0 980.0 142.0 C1053.3 140.0 1126.7 174.0 1200.0 176.0 C1273.3 178.0 1353.3 155.0 1420.0 154.0 C1486.7 153.0 1570.0 167.3 1600.0 170.0 L1600,600 L0,600 Z",
  },
  {
    id: "mid",
    opacity: 0.44,
    d: "M0.0,318.0 C31.7 311.3 123.3 277.3 190.0 278.0 C256.7 278.7 325.0 323.7 400.0 322.0 C475.0 320.3 556.7 270.0 640.0 268.0 C723.3 266.0 816.7 311.0 900.0 310.0 C983.3 309.0 1060.0 264.0 1140.0 262.0 C1220.0 260.0 1303.3 295.7 1380.0 298.0 C1456.7 300.3 1563.3 279.7 1600.0 276.0 L1600,600 L0,600 Z",
  },
  {
    id: "near",
    opacity: 0.6,
    d: "M0.0,448.0 C36.7 442.0 140.0 410.3 220.0 412.0 C300.0 413.7 386.7 458.7 480.0 458.0 C573.3 457.3 680.0 410.0 780.0 408.0 C880.0 406.0 986.7 444.3 1080.0 446.0 C1173.3 447.7 1253.3 419.7 1340.0 418.0 C1426.7 416.3 1556.7 433.0 1600.0 436.0 L1600,600 L0,600 Z",
  },
] as const;

function HeroHillSilhouettes() {
  return (
    <div
      aria-hidden
      className="hero-intro-silhouettes absolute inset-x-0 z-0"
    >
      {HILL_LAYERS.map((layer) => (
        <div
          key={layer.id}
          data-hill={layer.id}
          className="hero-intro-silhouette-layer"
        >
          <svg
            viewBox="0 60 1600 520"
            preserveAspectRatio="none"
            className="block"
          >
            <path d={layer.d} fill="currentColor" opacity={layer.opacity} />
          </svg>
        </div>
      ))}
    </div>
  );
}

function heroNameLines(fullName: string, name: string) {
  const first = name.trim() || "Emily";
  const last = fullName
    .trim()
    .split(/\s+/)
    .filter((part) => part.toLowerCase() !== first.toLowerCase())
    .join(" ");
  return { first, last: last || "Wunder" };
}

function HeroLockup({
  as: Tag,
  first,
  second,
  className,
  delay = 0,
}: {
  as: "h1" | "p";
  first: string;
  second: string;
  className: string;
  delay?: number;
}) {
  return (
    <Tag className={className}>
      <HeroEntrance
        as="span"
        variant="fadeLeft"
        delay={delay}
        className="-translate-y-[7px] block font-serif text-[clamp(1.45rem,7vw,4.6rem)] text-sage-deep"
      >
        {first}
      </HeroEntrance>
      <HeroEntrance
        as="span"
        variant="fadeRight"
        delay={delay + 0.1}
        className="-mt-1 block font-cooper text-[clamp(1.75rem,10.5vw,7.5rem)] text-forest uppercase"
      >
        {second}
      </HeroEntrance>
    </Tag>
  );
}

function HeroForestBelt({ subtitle }: { subtitle: string }) {
  return (
    <div
      className="hero-intro-belt relative z-20 overflow-hidden"
      aria-hidden={subtitle ? undefined : true}
    >
      <SectionSurface tone="forest" motifs="none" />
      {subtitle ? (
        <HeroEntrance
          variant="fadeUp"
          delay={0.48}
          className="relative z-10 w-full"
        >
          <p className="hero-intro-belt-copy text-center font-editorial text-paper">
            {subtitle}
          </p>
        </HeroEntrance>
      ) : null}
    </div>
  );
}

export function HeroIntro() {
  const site = useSiteContent();
  const services = site.hero.services.filter((service) => service.trim());
  const creatorImage = site.hero.creatorImagePath ?? HERO_CREATOR_FALLBACK.src;
  const subtitle = site.hero.subtitle.trim();
  const { first: nameFirst, last: nameLast } = heroNameLines(
    site.fullName,
    site.name,
  );

  return (
    <section
      className={`hero-intro relative${
        subtitle ? " hero-intro--belt-copy" : ""
      }`}
    >
      <AdminEditButton section="hero" label="Edit hero" />
      <div className="hero-intro-visual">
        <SectionButterfly flight="intro" />
        <SectionButterfly flight="introCompanion" />
        <HeroHillSilhouettes />
        <div
          aria-hidden
          className="absolute inset-0 z-0 bg-gradient-to-b from-paper via-paper/45 to-transparent"
        />

        {services.length > 0 ? (
          <HeroEntrance
            variant="fadeDown"
            delay={0.06}
            className="relative z-20 w-full min-w-0"
          >
            <p className="hero-intro-services flex w-full min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 px-3 font-label text-[clamp(0.7rem,2.4vw,1.45rem)] font-medium tracking-[0.06em] text-brown sm:gap-x-4 sm:px-4 sm:tracking-[0.16em]">
              {services.map((service, index) => (
                <span key={`${service}-${index}`} className="contents">
                  {index > 0 ? (
                    <span aria-hidden className="text-sage-deep">
                      |
                    </span>
                  ) : null}
                  <span>{service}</span>
                </span>
              ))}
            </p>
          </HeroEntrance>
        ) : null}

        <div className="hero-intro-stage">
          <div className="hero-intro-composer">
            <div className="hero-intro-creator-slot">
              <div className="hero-intro-creator-image">
                <Image
                  key={creatorImage}
                  src={creatorImage}
                  alt={`${site.fullName} in the hero`}
                  width={HERO_CREATOR_FALLBACK.width}
                  height={HERO_CREATOR_FALLBACK.height}
                  preload
                  sizes="(max-height: 40rem) and (orientation: landscape) 40vw, (min-width: 1024px) 28rem, 90vw"
                  unoptimized={shouldBypassImageOptimizer(creatorImage)}
                  className="block h-full w-auto max-w-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div aria-hidden className="hero-intro-title-scrim" />

        <HeroLockup
          as="h1"
          first={nameFirst}
          second={nameLast}
          delay={0.16}
          className="hero-intro-lockup hero-intro-title"
        />
      </div>

      <HeroForestBelt subtitle={subtitle} />
    </section>
  );
}
