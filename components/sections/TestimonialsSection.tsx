"use client";

import { isSampleTestimonial } from "@/lib/site/normalize";
import { AdminEditButton } from "@/components/admin/AdminEditButton";
import { SectionButterfly } from "@/components/ui/ButterflyFlight";
import { SectionReveal, StaggerChildren, StaggerItem } from "@/components/ui/motion";
import { TestimonialCloud } from "@/components/ui/TestimonialCloud";
import { useAdminView } from "@/components/admin/AdminViewProvider";
import { sectionText } from "@/lib/sectionText";
import { MAX_TESTIMONIALS } from "@/lib/site/types";

const CLOUD_SLOT = [
  "testimonial-cloud-slot-a",
  "testimonial-cloud-slot-b",
  "testimonial-cloud-slot-c",
  "testimonial-cloud-slot-d",
] as const;

export function TestimonialsSection() {
  const { site, viewMode } = useAdminView();
  const text = sectionText.contact;
  const hiddenFromVisitors = !site.testimonials.visible;

  const quotes = site.testimonials.items
    .filter(
      (item) =>
        item.quote.trim() &&
        (process.env.NODE_ENV === "development" || !isSampleTestimonial(item)),
    )
    .slice(0, MAX_TESTIMONIALS);

  if (hiddenFromVisitors && viewMode !== "admin") {
    return null;
  }

  return (
    <section
      id="testimonials"
      className="scroll-section-anchor relative overflow-hidden px-4 pt-8 pb-20 sm:px-6 sm:pt-10 sm:pb-24"
    >
      <AdminEditButton section="testimonials" label="Edit quotes" />
      <SectionButterfly flight="testimonials" />
      <SectionButterfly flight="testimonialsLow" />
      <div className="relative z-10 mx-auto max-w-6xl">
        {hiddenFromVisitors && (
          <SectionReveal variant="fadeUp" className="mx-auto mb-6 max-w-xl rounded-full border border-forest/20 bg-paper/80 px-5 py-2 text-center text-sm font-medium text-forest shadow-sm backdrop-blur-md">
            Hidden from regular view. Toggle this on in the admin editor when
            testimonials are ready.
          </SectionReveal>
        )}

        <SectionReveal variant="fadeUp" className="mx-auto max-w-3xl text-center">
          <h2 className={`font-didone text-3xl font-black tracking-tight sm:text-5xl ${text.heading}`}>
            {site.testimonials.heading}
          </h2>
        </SectionReveal>

        <StaggerChildren
          className={`testimonial-cloud-drift mx-auto mt-10 max-w-6xl${quotes.length === 1 ? " testimonial-cloud-drift-solo" : ""}`}
        >
          {quotes.map((testimonial, index) => (
            <StaggerItem
              key={testimonial.id}
              className="testimonial-cloud-row"
              variant={index % 2 === 0 ? "fadeLeft" : "fadeRight"}
            >
              <div className={`testimonial-cloud-slot ${CLOUD_SLOT[index] ?? CLOUD_SLOT[0]}`}>
                <TestimonialCloud flip={index % 2 === 1}>
                  <blockquote className="font-serif text-base leading-snug text-forest sm:text-lg">
                    &ldquo;{testimonial.quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-3 border-t border-brown/10 pt-2">
                    <p className="font-semibold text-ink">{testimonial.name}</p>
                    <p className="mt-1 text-sm text-muted">{testimonial.role}</p>
                  </figcaption>
                </TestimonialCloud>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}
