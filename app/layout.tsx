import type { Metadata, Viewport } from "next";
import {
  Bodoni_Moda,
  Bricolage_Grotesque,
  Calistoga,
  Cormorant_Garamond,
  DM_Sans,
  Fraunces,
  Instrument_Sans,
} from "next/font/google";
import { AdminModeBanner } from "@/components/admin/AdminModeBanner";
import { SiteNav } from "@/components/layout/SiteNav";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { HashScrollHandler } from "@/components/layout/HashScrollHandler";
import { SiteHeaderHeightSync } from "@/components/layout/SiteHeaderHeightSync";
import { AppProviders } from "@/components/layout/AppProviders";
import { isAdminAuthRequired } from "@/lib/auth";
import { getSiteContentRecord } from "@/lib/site";
import "./globals.css";

export const revalidate = 60;

export const viewport: Viewport = {
  themeColor: "#f7f3ec",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant",
  weight: ["500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const calistoga = Calistoga({
  variable: "--font-calistoga",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const bodoniModa = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});

export async function generateMetadata(): Promise<Metadata> {
  const { content: site } = await getSiteContentRecord();
  const title = `${site.fullName} · ${site.brand}`;
  return {
    title: {
      default: title,
      template: `%s · ${site.brand}`,
    },
    description: site.tagline,
    applicationName: site.brand,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      title: site.brand,
      statusBarStyle: "default",
    },
    formatDetection: {
      telephone: false,
    },
    other: {
      "mobile-web-app-capable": "yes",
    },
    openGraph: {
      title,
      description: site.tagline,
      siteName: site.brand,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: site.tagline,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const record = await getSiteContentRecord();
  const { content: site, version: siteVersion } = record;
  const initialAuthRequired = isAdminAuthRequired();

  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${dmSans.variable} ${fraunces.variable} ${instrumentSans.variable} ${cormorantGaramond.variable} ${calistoga.variable} ${bodoniModa.variable} h-full scroll-smooth`}
    >
      <body className="relative min-h-full flex flex-col bg-cream font-body antialiased">
        <AppProviders
          initialSite={site}
          initialSiteVersion={siteVersion}
          initialSiteUpdatedAt={record.updatedAt}
          initialContentStore={record.source}
          initialAuthenticated={false}
          initialAuthRequired={initialAuthRequired}
        >
          <HashScrollHandler />
          <div id="site-header" className="sticky top-0 z-50">
            <SiteNav />
            <AdminModeBanner />
            <SiteHeaderHeightSync />
          </div>
          <main className="relative z-10 flex-1">{children}</main>
          <SiteFooter />
        </AppProviders>
      </body>
    </html>
  );
}
