import { SectionSurface } from "@/components/ui/SectionSurface";

export const metadata = {
  title: "Privacy Policy",
};

export default function Page() {
  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-16 sm:px-6">
      <SectionSurface tone="ivory" motifs="edges" />
      <article className="relative z-10 mx-auto max-w-3xl">
        <p className="font-label text-sm font-semibold tracking-[0.2em] text-sage-deep uppercase">
          Legal
        </p>
        <h1 className="mt-2 font-serif text-4xl sm:text-5xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-ink/60">Effective October 13, 2026</p>
        <section className="mt-6">
          <h2 className="font-serif text-xl text-ink">Who runs this site</h2>
          <p className="mt-2 leading-relaxed text-ink/80">This site is run by Emily Wunder (&quot;I,&quot; &quot;me&quot;), a content creator offering UGC services.</p>
        </section>
        <section className="mt-6">
          <h2 className="font-serif text-xl text-ink">What I collect</h2>
          <p className="mt-2 leading-relaxed text-ink/80">This site has no forms, accounts, or tracking. It doesn&apos;t set cookies for visitors and doesn&apos;t run analytics. If you email me at <a href="mailto:wunderful.life.777@gmail.com" className="underline">wunderful.life.777@gmail.com</a>, I receive your name, your email address, and whatever you write. I use that only to reply and to discuss work together.</p>
        </section>
        <section className="mt-6">
          <h2 className="font-serif text-xl text-ink">Service providers</h2>
          <p className="mt-2 leading-relaxed text-ink/80">The site is hosted by Vercel. Its content is stored with Supabase, and its images and videos are served by Cloudflare. These providers may process basic technical data, such as IP addresses, to deliver the site. Links to Instagram and embedded Instagram posts are governed by Instagram&apos;s own privacy policy.</p>
        </section>
        <section className="mt-6">
          <h2 className="font-serif text-xl text-ink">Sharing</h2>
          <p className="mt-2 leading-relaxed text-ink/80">I don&apos;t sell or share your information, except when the law requires it.</p>
        </section>
        <section className="mt-6">
          <h2 className="font-serif text-xl text-ink">Retention</h2>
          <p className="mt-2 leading-relaxed text-ink/80">I keep emails only as long as needed for our conversation or business records.</p>
        </section>
        <section className="mt-6">
          <h2 className="font-serif text-xl text-ink">Your choices</h2>
          <p className="mt-2 leading-relaxed text-ink/80">Email me to ask what I have or to have it deleted.</p>
        </section>
        <section className="mt-6">
          <h2 className="font-serif text-xl text-ink">Children</h2>
          <p className="mt-2 leading-relaxed text-ink/80">This site is for businesses. It isn&apos;t directed at anyone under 13.</p>
        </section>
        <section className="mt-6">
          <h2 className="font-serif text-xl text-ink">Changes</h2>
          <p className="mt-2 leading-relaxed text-ink/80">If I add analytics or a contact form, I&apos;ll update this page first.</p>
        </section>
        <section className="mt-6">
          <h2 className="font-serif text-xl text-ink">Contact</h2>
          <p className="mt-2 leading-relaxed text-ink/80"><a href="mailto:wunderful.life.777@gmail.com" className="underline">wunderful.life.777@gmail.com</a></p>
        </section>
      </article>
    </div>
  );
}
