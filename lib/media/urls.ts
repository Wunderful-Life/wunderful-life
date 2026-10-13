/**
 * Uploaded stills are served through `/_next/image` so Vercel fetches each
 * source once, then serves cached WebP variants. Serving Supabase originals
 * directly burned the free egress quota on every page view. Only SVG bypasses
 * the optimizer, which cannot rasterize it.
 */
export function shouldBypassImageOptimizer(src: string): boolean {
  return src.split("?")[0].toLowerCase().endsWith(".svg");
}
