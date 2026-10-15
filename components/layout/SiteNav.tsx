"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatedButton } from "@/components/ui/AnimatedButton";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { SectionLink } from "@/components/ui/SectionLink";
import { useSiteContent } from "@/components/admin/AdminViewProvider";
import type { HeroLink } from "@/lib/site/types";

function isContactLink(link: HeroLink) {
  return link.href.replace(/\/$/, "").endsWith("#contact");
}

export function SiteNav() {
  const site = useSiteContent();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        headerRef.current &&
        !headerRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    // Wait a tick so the opening click cannot dismiss the menu immediately.
    const timeout = window.setTimeout(() => {
      document.addEventListener("pointerdown", handlePointerDown);
    }, 0);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const isActive = (link: HeroLink) =>
    link.activePathPrefix
      ? pathname.startsWith(link.activePathPrefix)
      : false;

  return (
    <header
      ref={headerRef}
      className="glass-header relative z-10 border-b border-white/55"
    >
      <div className="flex w-full items-center justify-between gap-4 px-4 py-2.5 sm:px-6 lg:px-8">
        <SectionLink
          href="/"
          className="group flex min-w-0 shrink items-center gap-2.5 sm:gap-3"
        >
          <BrandLogo
            alt=""
            sizes="56px"
            loading="eager"
            className="h-12 w-auto shrink-0 transition duration-200 group-hover:opacity-80 sm:h-14"
          />
          <span className="flex min-w-0 flex-col">
            <span className="font-display text-lg font-semibold text-ink transition-colors group-hover:text-forest">
              {site.fullName}
            </span>
            <span className="text-xs tracking-widest text-ink/60 uppercase">
              {site.brand}
            </span>
          </span>
        </SectionLink>

        <nav className="ml-auto hidden shrink-0 items-center gap-6 lg:flex">
          {site.heroLinks.map((link) =>
            isContactLink(link) ? (
              <AnimatedButton key={link.href} href={link.href} variant="nav">
                {link.label}
              </AnimatedButton>
            ) : (
              <SectionLink
                key={link.href}
                href={link.href}
                className={`whitespace-nowrap text-sm font-medium transition-colors hover:text-forest ${
                  isActive(link) ? "text-forest" : "text-ink/85"
                }`}
              >
                {link.label}
              </SectionLink>
            ),
          )}
        </nav>

        <button
          type="button"
          className="relative z-10 ml-auto inline-flex min-h-11 shrink-0 items-center rounded-lg border border-white/50 bg-white/50 px-3 text-sm text-ink lg:hidden"
          aria-expanded={menuOpen}
          aria-controls="site-nav-menu"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => setMenuOpen((open) => !open)}
        >
          Menu
        </button>
      </div>

      <nav
        id="site-nav-menu"
        hidden={!menuOpen}
        className="border-t border-white/30 bg-paper/80 lg:hidden"
      >
        <div className="flex flex-col gap-1 px-4 py-3 sm:px-6">
          {site.heroLinks.map((link) =>
            isContactLink(link) ? (
              <AnimatedButton
                key={link.href}
                href={link.href}
                variant="nav"
                className="mt-1 min-h-11 px-4"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </AnimatedButton>
            ) : (
              <SectionLink
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-ink hover:bg-white/20 hover:text-forest"
              >
                {link.label}
              </SectionLink>
            ),
          )}
        </div>
      </nav>
    </header>
  );
}
