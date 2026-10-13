import {
  MAX_BRANDS,
  MAX_COLLAGE_TILES,
  MAX_STATS_PHOTOS,
  MAX_TESTIMONIALS,
  isAboutPhotoFrame,
  resolveAboutPhotoShowShadow,
  type AboutPhoto,
  type AboutPhotoFrame,
  type BrandItem,
  type CollagePhoto,
  type CollagePhotoShape,
  type GridPhoto,
  type ServiceItem,
  type HeroIntroServices,
  type SiteContent,
  type StatItem,
} from "@/lib/site/types";

const DEFAULT_CTA_HEADLINE = "Let's work together";
const DEFAULT_CTA_EMAIL_LABEL = "email@email.com";

function defaultHeroSubtitle(name: string): string {
  return `I'm ${name} — the face behind the frame. Brands hire me for deliverables; they remember me for the personality.`;
}

const DEFAULT_HERO_TITLE_LINE = "Emily";
const DEFAULT_HERO_TITLE_ACCENT = "Wunder";
const DEFAULT_HERO_SERVICES: HeroIntroServices = [
  "UGC",
  "Social Media",
  "Marketing",
];

const DEFAULT_STATS_BANNER: SiteContent["statsBanner"] = {
  visible: true,
  showPhotos: true,
  items: [
    { id: "instagram", value: "10k", label: "Instagram" },
    { id: "tiktok", value: "9k", label: "Tiktok" },
    { id: "reach", value: "300k", label: "Avg. Reach" },
    { id: "engagement", value: "9.5%", label: "Avg. Engagement" },
  ],
  photos: [],
};

const DEFAULT_WORK: SiteContent["work"] = {
  heading: "My most recent videos",
};

const DEFAULT_PHOTOGRAPHY_LABEL = "photography";

/** Repeating rhythm applied to collage tiles that have no shape saved yet. */
const COLLAGE_SHAPE_CYCLE: CollagePhotoShape[] = [
  "tall",
  "square",
  "square",
  "wide",
  "square",
  "tall",
  "wide",
  "square",
  "square",
  "tall",
];

const DEFAULT_COLLAGE_PHOTOS: CollagePhoto[] = COLLAGE_SHAPE_CYCLE.map(
  (shape, index) => ({
    id: `collage-${index + 1}`,
    alt: `Photography collage image ${index + 1}`,
    shape,
  }),
);

const DEFAULT_BRANDS: SiteContent["brands"] = {
  visible: true,
  heading: "Brands I've worked with",
  items: [
  ],
};

const DEFAULT_WHAT_IS_UGC: SiteContent["whatIsUgc"] = {
  heading: "What Is UGC?",
  body: "UGC, or user-generated content, is brand content made to feel like it came from a real customer, creator, or everyday experience. It blends strategy with natural storytelling, helping people understand how a product fits into real life without feeling like a traditional ad.",
};

const DEFAULT_UGC_BENEFITS: SiteContent["ugcBenefits"] = {
  eyebrow: "The power of real stories",
  stats: [
    {
      id: "authentic",
      value: "2.4×",
      label: "more likely to call UGC authentic than brand-created content",
    },
    {
      id: "trustworthy",
      value: "73%",
      label: "of shoppers say UGC increases their purchasing confidence",
    },
    {
      id: "influences",
      value: "79%",
      label: "of people say UGC highly impacts their purchasing decisions",
    },
  ],
  calloutLabel: "Did you know?",
  calloutValue: "93%",
  calloutBody:
    "of marketers say authentic content performs better than traditional brand-made content.",
  benefitsEyebrow: "UGC benefits",
  benefitsHeading: "Content that feels like a recommendation.",
  benefits: [
    "Builds trust with real stories",
    "Creates natural engagement",
    "Boosts conversions across channels",
    "Makes your brand feel human",
    "Authentic by design — the product lives in a believable moment",
    "Ready for organic social, paid ads, product pages, and launches",
  ],
};

const DEFAULT_SERVICES: SiteContent["services"] = {
  eyebrow: "What I offer",
  heading: "Services",
  subtitle:
    "What Emily delivers — plus the creative, airy, nature-driven personality your audience will remember.",
  items: [
    {
      id: "tiktok-reels",
      title: "TikTok & Reels",
      description:
        "Short-form vertical video with strong hooks, trending audio, and that effortless Emily energy brands remember.",
    },
    {
      id: "instagram",
      title: "Instagram Content",
      description:
        "Static posts, carousels, and Stories with an airy, nature-driven look that still converts.",
    },
    {
      id: "testimonial",
      title: "Testimonials",
      description:
        "Talking-head UGC that builds trust — warm, honest, and unmistakably me on camera.",
    },
    {
      id: "unboxing",
      title: "Unboxing & Demos",
      description:
        "Product-first content with creative girl charm — polished enough for ads, real enough to relate.",
    },
  ],
};

const DEFAULT_TESTIMONIALS: SiteContent["testimonials"] = {
  visible: true,
  eyebrow: "Social Proof",
  heading: "Kind Words",
  // Only real client testimonials belong here. Sample copy lives in
  // DEV_SAMPLE_TESTIMONIALS and is never shown in production.
  items: [],
};

/** Placeholder testimonials for local development only. */
const DEV_SAMPLE_TESTIMONIALS: SiteContent["testimonials"]["items"] = [
  {
    id: "dev-sample-1",
    quote: "Sample testimonial for local development.",
    name: "Sample Brand Partner",
    role: "Dev placeholder",
  },
];

const SAMPLE_TESTIMONIAL_NAMES = new Set([
  "sample brand partner",
  "example client",
  "sample studio lead",
  "example shop owner",
]);

const SAMPLE_TESTIMONIAL_QUOTES = [
  "emily brought such a warm, natural presence",
  "the creative direction was thoughtful, on-brand",
  "booking emily was simple, and the turnaround",
  "her delivery felt like a friend sharing a find",
];

/** True for placeholder testimonials that must never render publicly. */
export function isSampleTestimonial(item: { name?: string; quote?: string }): boolean {
  const name = (item.name ?? "").trim().toLowerCase();
  const quote = (item.quote ?? "").trim().toLowerCase();
  if (SAMPLE_TESTIMONIAL_NAMES.has(name)) return true;
  if (/^(sample|example)\b/.test(name)) return true;
  return SAMPLE_TESTIMONIAL_QUOTES.some((sample) => quote.startsWith(sample));
}

const ALLOW_SAMPLE_TESTIMONIALS = process.env.NODE_ENV === "development";

/** Strip a stray leading "#" in front of an absolute URL ("#https://..." -> "https://..."). */
export function normalizeHref(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed.replace(/^#+(?=(https?:|mailto:)\/?\/?)/i, "");
}

function defaultAboutPhotoFrame(index: number): AboutPhotoFrame {
  if (index === 0) return "arch";
  if (index === 1) return "oval";
  return "polaroid";
}

function normalizeAboutPhotoFrame(
  value: unknown,
  index: number,
): AboutPhotoFrame {
  return isAboutPhotoFrame(value) ? value : defaultAboutPhotoFrame(index);
}

const DEFAULT_FOURTH_GALLERY_PHOTO: AboutPhoto = {
  id: "ugc-moment",
  caption: "New UGC moment — upload Emily's fourth gallery photo here",
  showCaption: true,
  showShadow: true,
  rotate: 3,
  frame: "polaroid",
};

/** Public navbar order, matching homepage section flow. */
const CANONICAL_HERO_LINKS: SiteContent["heroLinks"] = [
  { label: "About Me", href: "/#about" },
  {
    label: "My Work",
    href: "/work",
    emphasis: "primary",
    activePathPrefix: "/work",
  },
  { label: "Services", href: "/#services" },
  { label: "Testimonials", href: "/#testimonials" },
  { label: "What is UGC", href: "/#ugc" },
  { label: "Contact", href: "/#contact" },
];

type SiteContentInput = Omit<
  SiteContent,
  | "about"
  | "statsBanner"
  | "work"
  | "photography"
  | "brands"
  | "whatIsUgc"
  | "ugcBenefits"
  | "closingCta"
  | "services"
  | "testimonials"
  | "hero"
> & {
  about: Omit<SiteContent["about"], "galleryHeading" | "subtitle"> & {
    galleryHeading?: string;
    subtitle?: string;
  };
  statsBanner?: Partial<SiteContent["statsBanner"]>;
  work?: Partial<SiteContent["work"]>;
  photography?: Partial<SiteContent["photography"]>;
  brands?: Partial<SiteContent["brands"]>;
  whatIsUgc?: Partial<SiteContent["whatIsUgc"]>;
  ugcBenefits?: Partial<SiteContent["ugcBenefits"]>;
  closingCta?: Partial<SiteContent["closingCta"]> & {
    /** Superseded by `photo`; still read so old saves migrate. */
    videoPath?: string;
    posterPath?: string;
  };
  /** Legacy saves stored a bare service array. */
  services?: ServiceItem[] | Partial<SiteContent["services"]>;
  testimonials?: Partial<SiteContent["testimonials"]>;
  hero?: Partial<SiteContent["hero"]>;
  /** Superseded by `photography`; still read so old saves migrate. */
  homePhotoGrid?: { photos?: GridPhoto[] };
  /** Superseded by `closingCta`. */
  contact?: { headline?: string; body?: string };
};

function defaultAboutSubtitle(name: string): string {
  return `Meet ${name} — creative, aesthetic, and unapologetically myself.`;
}

function defaultCtaBody(name: string): string {
  return `Want content that converts and a creator brands actually want to work with again? Hi — I'm ${name}. Let's chat.`;
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function slugId(value: string, fallback: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
}

const DEFAULT_CTA_PHOTO: AboutPhoto = {
  id: "cta-photo",
  caption: "",
  showCaption: true,
  showShadow: true,
  rotate: 0,
  frame: "rounded",
};

function normalizeCtaPhoto(
  photo: Partial<AboutPhoto> | undefined,
  posterFallback?: string,
): AboutPhoto {
  const imagePath = photo?.imagePath || posterFallback;
  return {
    id: text(photo?.id, DEFAULT_CTA_PHOTO.id),
    caption: typeof photo?.caption === "string" ? photo.caption : "",
    showCaption: photo?.showCaption !== false,
    showShadow: resolveAboutPhotoShowShadow(photo?.showShadow),
    rotate:
      typeof photo?.rotate === "number" && Number.isFinite(photo.rotate)
        ? photo.rotate
        : DEFAULT_CTA_PHOTO.rotate,
    frame: isAboutPhotoFrame(photo?.frame)
      ? photo.frame
      : DEFAULT_CTA_PHOTO.frame,
    ...(imagePath ? { imagePath } : {}),
  };
}

function normalizeFramedPhoto(
  photo: Partial<AboutPhoto>,
  index: number,
  idFallback: string,
): AboutPhoto {
  return {
    id: text(photo.id, idFallback),
    caption: typeof photo.caption === "string" ? photo.caption : "",
    showCaption: photo.showCaption !== false,
    showShadow: resolveAboutPhotoShowShadow(photo.showShadow),
    rotate:
      typeof photo.rotate === "number" && Number.isFinite(photo.rotate)
        ? photo.rotate
        : 0,
    frame: normalizeAboutPhotoFrame(photo.frame, index),
    ...(photo.imagePath ? { imagePath: photo.imagePath } : {}),
  };
}

function normalizeAboutPhotos(photos: AboutPhoto[]): AboutPhoto[] {
  const normalized = photos.map((photo, index) =>
    normalizeFramedPhoto(photo, index, `about-${index + 1}`),
  );

  if (
    normalized.length < 6 &&
    !normalized.some((photo) => photo.id === DEFAULT_FOURTH_GALLERY_PHOTO.id)
  ) {
    return [...normalized, DEFAULT_FOURTH_GALLERY_PHOTO];
  }

  return normalized;
}

function normalizeHeroServices(value: unknown): HeroIntroServices {
  if (!Array.isArray(value)) return [...DEFAULT_HERO_SERVICES];

  return [
    typeof value[0] === "string" ? value[0] : DEFAULT_HERO_SERVICES[0],
    typeof value[1] === "string" ? value[1] : DEFAULT_HERO_SERVICES[1],
    typeof value[2] === "string" ? value[2] : DEFAULT_HERO_SERVICES[2],
  ];
}

function normalizeHeroLinks(): SiteContent["heroLinks"] {
  return CANONICAL_HERO_LINKS.map((link) => ({ ...link }));
}

/**
 * An explicitly empty array is respected so the admin can clear a list; only a
 * missing or malformed value falls back to the seeded defaults.
 */
function normalizeStatsPhotos(photos: unknown): AboutPhoto[] {
  if (!Array.isArray(photos)) return [];

  return photos
    .map((item, index): AboutPhoto | null => {
      if (!item || typeof item !== "object") return null;
      return normalizeFramedPhoto(
        item as Partial<AboutPhoto>,
        index,
        `reach-${index + 1}`,
      );
    })
    .filter((photo): photo is AboutPhoto => photo !== null)
    .slice(0, MAX_STATS_PHOTOS);
}

function normalizeStats(
  items: unknown,
  fallback: StatItem[],
  idPrefix: string,
): StatItem[] {
  if (!Array.isArray(items)) return fallback;

  return items
    .map((item, index): StatItem | null => {
      if (!item || typeof item !== "object") return null;
      const stat = item as Partial<StatItem>;
      const label = text(stat.label, "");
      const value = text(stat.value, "");
      if (!label && !value) return null;

      return {
        id: text(stat.id, `${idPrefix}-${index + 1}`),
        value,
        label,
      };
    })
    .filter((item): item is StatItem => item !== null);
}

function normalizeCollagePhotos(
  photos: unknown,
  legacyGrid: GridPhoto[] | undefined,
): CollagePhoto[] {
  if (Array.isArray(photos) && photos.length > 0) {
    return photos
      .map((item, index): CollagePhoto | null => {
        if (!item || typeof item !== "object") return null;
        const photo = item as Partial<CollagePhoto>;
        const shape: CollagePhotoShape =
          photo.shape === "tall" || photo.shape === "wide" || photo.shape === "square"
            ? photo.shape
            : COLLAGE_SHAPE_CYCLE[index % COLLAGE_SHAPE_CYCLE.length];

        return {
          id: text(photo.id, `collage-${index + 1}`),
          alt: text(photo.alt, `Photography collage image ${index + 1}`),
          shape,
          ...(photo.imagePath ? { imagePath: photo.imagePath } : {}),
        };
      })
      .filter((photo): photo is CollagePhoto => photo !== null)
      .slice(0, MAX_COLLAGE_TILES);
  }

  // Migration: carry the old 8-slot home grid (and any uploads) into the collage.
  if (Array.isArray(legacyGrid) && legacyGrid.length > 0) {
    return legacyGrid
      .map((photo, index) => ({
        id: text(photo.id, `collage-${index + 1}`),
        alt: text(photo.alt, `Photography collage image ${index + 1}`),
        shape: COLLAGE_SHAPE_CYCLE[index % COLLAGE_SHAPE_CYCLE.length],
        ...(photo.imagePath ? { imagePath: photo.imagePath } : {}),
      }))
      .slice(0, MAX_COLLAGE_TILES);
  }

  return DEFAULT_COLLAGE_PHOTOS;
}

function normalizeBrands(items: unknown): BrandItem[] {
  if (!Array.isArray(items)) return DEFAULT_BRANDS.items;

  return items
    .map((item, index): BrandItem | null => {
      if (!item || typeof item !== "object") return null;
      const brand = item as Partial<BrandItem>;
      const name = text(brand.name, "");
      if (!name) return null;
      // Never show unfilled placeholder brands ("Brand 1", "Brand 3", ...).
      if (/^brand\s*\d+$/i.test(name)) return null;

      return {
        id: text(brand.id, slugId(name, `brand-${index + 1}`)),
        name,
        ...(brand.logoPath ? { logoPath: brand.logoPath } : {}),
        ...(brand.url ? { url: brand.url } : {}),
      };
    })
    .filter((brand): brand is BrandItem => brand !== null)
    .slice(0, MAX_BRANDS);
}

function normalizeStringList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const normalized = value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeServiceItems(items: unknown): ServiceItem[] {
  if (!Array.isArray(items)) return DEFAULT_SERVICES.items;

  const normalized = items
    .map((item, index): ServiceItem | null => {
      if (!item || typeof item !== "object") return null;
      const service = item as Partial<ServiceItem>;
      const title = text(service.title, "");
      const description = text(service.description, "");
      if (!title && !description) return null;

      return {
        id: text(service.id, slugId(title, `service-${index + 1}`)),
        title,
        description,
      };
    })
    .filter((service): service is ServiceItem => service !== null);

  return normalized.length > 0 ? normalized : DEFAULT_SERVICES.items;
}

function normalizeServices(
  raw: SiteContentInput["services"],
): SiteContent["services"] {
  if (Array.isArray(raw)) {
    return {
      eyebrow: DEFAULT_SERVICES.eyebrow,
      heading: DEFAULT_SERVICES.heading,
      subtitle: DEFAULT_SERVICES.subtitle,
      items: normalizeServiceItems(raw),
    };
  }

  if (raw && typeof raw === "object") {
    return {
      eyebrow: text(raw.eyebrow, DEFAULT_SERVICES.eyebrow),
      heading: text(raw.heading, DEFAULT_SERVICES.heading),
      subtitle: text(raw.subtitle, DEFAULT_SERVICES.subtitle),
      items: normalizeServiceItems(raw.items),
    };
  }

  return DEFAULT_SERVICES;
}

export function normalizeSiteContent(raw: SiteContentInput): SiteContent {
  const statsBanner = raw.statsBanner ?? {};
  const work = raw.work ?? {};
  const photography = raw.photography ?? {};
  const brands = raw.brands ?? {};
  const whatIsUgc = raw.whatIsUgc ?? {};
  const ugcBenefits = raw.ugcBenefits ?? {};
  const closingCta = raw.closingCta ?? {};
  const testimonials = raw.testimonials ?? DEFAULT_TESTIMONIALS;

  return {
    fullName: raw.fullName,
    name: raw.name,
    brand: raw.brand,
    tagline: raw.tagline,
    hero: {
      subtitle: text(raw.hero?.subtitle, defaultHeroSubtitle(raw.name)),
      titleLine: text(raw.hero?.titleLine, DEFAULT_HERO_TITLE_LINE),
      titleAccent: text(raw.hero?.titleAccent, DEFAULT_HERO_TITLE_ACCENT),
      services: normalizeHeroServices(raw.hero?.services),
      ...(raw.hero?.videoPath ? { videoPath: raw.hero.videoPath } : {}),
      ...(raw.hero?.posterPath ? { posterPath: raw.hero.posterPath } : {}),
      ...(raw.hero?.creatorImagePath
        ? { creatorImagePath: raw.hero.creatorImagePath }
        : {}),
    },
    statsBanner: {
      visible:
        typeof statsBanner.visible === "boolean"
          ? statsBanner.visible
          : DEFAULT_STATS_BANNER.visible,
      showPhotos: statsBanner.showPhotos !== false,
      items: normalizeStats(
        statsBanner.items,
        DEFAULT_STATS_BANNER.items,
        "stat",
      ),
      photos: normalizeStatsPhotos(statsBanner.photos),
    },
    about: {
      headline: raw.about.headline,
      subtitle: text(raw.about.subtitle, defaultAboutSubtitle(raw.name)),
      galleryHeading: text(
        raw.about.galleryHeading,
        `A little more ${raw.name}`,
      ),
      paragraphs: raw.about.paragraphs,
      photos: normalizeAboutPhotos(raw.about.photos),
    },
    work: {
      heading: text(work.heading, DEFAULT_WORK.heading),
    },
    photography: {
      label: text(photography.label, DEFAULT_PHOTOGRAPHY_LABEL),
      photos: normalizeCollagePhotos(
        photography.photos,
        raw.homePhotoGrid?.photos,
      ),
    },
    brands: {
      visible:
        typeof brands.visible === "boolean"
          ? brands.visible
          : DEFAULT_BRANDS.visible,
      heading: text(brands.heading, DEFAULT_BRANDS.heading),
      items: normalizeBrands(brands.items),
    },
    whatIsUgc: {
      heading: text(whatIsUgc.heading, DEFAULT_WHAT_IS_UGC.heading),
      body: text(whatIsUgc.body, DEFAULT_WHAT_IS_UGC.body),
    },
    ugcBenefits: {
      eyebrow: text(ugcBenefits.eyebrow, DEFAULT_UGC_BENEFITS.eyebrow),
      stats: normalizeStats(
        ugcBenefits.stats,
        DEFAULT_UGC_BENEFITS.stats,
        "ugc-stat",
      ),
      calloutLabel: text(
        ugcBenefits.calloutLabel,
        DEFAULT_UGC_BENEFITS.calloutLabel,
      ),
      calloutValue: text(
        ugcBenefits.calloutValue,
        DEFAULT_UGC_BENEFITS.calloutValue,
      ),
      calloutBody: text(
        ugcBenefits.calloutBody,
        DEFAULT_UGC_BENEFITS.calloutBody,
      ),
      benefitsEyebrow: text(
        ugcBenefits.benefitsEyebrow,
        DEFAULT_UGC_BENEFITS.benefitsEyebrow,
      ),
      benefitsHeading: text(
        ugcBenefits.benefitsHeading,
        DEFAULT_UGC_BENEFITS.benefitsHeading,
      ),
      benefits: normalizeStringList(
        ugcBenefits.benefits,
        DEFAULT_UGC_BENEFITS.benefits,
      ),
    },
    heroLinks: normalizeHeroLinks(),
    closingCta: {
      headline: text(closingCta.headline, DEFAULT_CTA_HEADLINE),
      body: text(
        closingCta.body ?? raw.contact?.body,
        defaultCtaBody(raw.name),
      ),
      emailLabel: text(closingCta.emailLabel, DEFAULT_CTA_EMAIL_LABEL),
      showPhoto: closingCta.showPhoto !== false,
      photo: normalizeCtaPhoto(closingCta.photo, closingCta.posterPath),
    },
    social: raw.social
      ? {
          ...raw.social,
          email: normalizeHref(raw.social.email),
          instagram: normalizeHref(raw.social.instagram),
        }
      : raw.social,
    services: normalizeServices(raw.services),
    testimonials: {
      visible:
        typeof testimonials.visible === "boolean"
          ? testimonials.visible
          : DEFAULT_TESTIMONIALS.visible,
      eyebrow: text(testimonials.eyebrow, DEFAULT_TESTIMONIALS.eyebrow),
      heading: text(testimonials.heading, DEFAULT_TESTIMONIALS.heading),
      items: (Array.isArray(testimonials.items)
        ? testimonials.items
            .map((testimonial, index) => ({
              id: text(testimonial.id, `testimonial-${index + 1}`),
              quote: text(testimonial.quote, ""),
              name: text(testimonial.name, ""),
              role: text(testimonial.role, ""),
            }))
            .filter(
              (testimonial) =>
                ALLOW_SAMPLE_TESTIMONIALS || !isSampleTestimonial(testimonial),
            )
            .slice(0, MAX_TESTIMONIALS)
        : ALLOW_SAMPLE_TESTIMONIALS
          ? DEV_SAMPLE_TESTIMONIALS
          : DEFAULT_TESTIMONIALS.items),
    },
  };
}
