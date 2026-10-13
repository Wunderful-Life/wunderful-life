import { SectionSurface } from "@/components/ui/SectionSurface";

export const metadata = {
  title: "Terms of Use",
};

export default function Page() {
  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-16 sm:px-6">
      <SectionSurface tone="ivory" motifs="edges" />
      <article className="relative z-10 mx-auto max-w-3xl">
        <p className="font-label text-sm font-semibold tracking-[0.2em] text-sage-deep uppercase">
          Legal
        </p>
        <h1 className="mt-2 font-serif text-4xl sm:text-5xl">Terms of Use</h1>
        <p className="mt-2 text-sm text-ink/60">Effective October 13, 2026</p>
        <section className="mt-6">
          <h2 className="font-serif text-xl text-ink">Agreement</h2>
          <p className="mt-2 leading-relaxed text-ink/80">By using this site, you agree to these terms.</p>
        </section>
        <section className="mt-6">
          <h2 className="font-serif text-xl text-ink">Purpose</h2>
          <p className="mt-2 leading-relaxed text-ink/80">This site showcases my content-creation services. Nothing here is an offer or a contract. Any project is governed by a separate written agreement.</p>
        </section>
        <section className="mt-6">
          <h2 className="font-serif text-xl text-ink">Ownership</h2>
          <p className="mt-2 leading-relaxed text-ink/80">All content is © Emily Wunder or used with permission. This includes text, photos, videos, and design. Client brand names and logos belong to their owners and are shown only to identify past work. Showing them doesn&apos;t mean those brands endorse me. You may not copy, download, or reuse content without my written permission.</p>
        </section>
        <section className="mt-6">
          <h2 className="font-serif text-xl text-ink">Testimonials</h2>
          <p className="mt-2 leading-relaxed text-ink/80">Testimonials are from real clients and reflect their own experiences. Results vary.</p>
        </section>
        <section className="mt-6">
          <h2 className="font-serif text-xl text-ink">Statistics</h2>
          <p className="mt-2 leading-relaxed text-ink/80">Industry figures are from the sources cited and are for general information only.</p>
        </section>
        <section className="mt-6">
          <h2 className="font-serif text-xl text-ink">No warranties</h2>
          <p className="mt-2 leading-relaxed text-ink/80">The site is provided &quot;as is.&quot; I&apos;m not liable for damages arising from its use, to the extent the law allows.</p>
        </section>
        <section className="mt-6">
          <h2 className="font-serif text-xl text-ink">Links</h2>
          <p className="mt-2 leading-relaxed text-ink/80">I&apos;m not responsible for third-party sites, including Instagram.</p>
        </section>
        <section className="mt-6">
          <h2 className="font-serif text-xl text-ink">Law</h2>
          <p className="mt-2 leading-relaxed text-ink/80">These terms are governed by the laws of the Commonwealth of Virginia.</p>
        </section>
        <section className="mt-6">
          <h2 className="font-serif text-xl text-ink">Contact</h2>
          <p className="mt-2 leading-relaxed text-ink/80"><a href="mailto:wunderful.life.777@gmail.com" className="underline">wunderful.life.777@gmail.com</a></p>
        </section>
      </article>
    </div>
  );
}
