// Installed, not fetched by next/font/google: that download made the build
// depend on what Google answered, and some of its answers broke Turbopack.
import "@fontsource-variable/baloo-2/wght.css";
import "@fontsource-variable/nunito/wght.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ThemeScript } from "@/components/ThemeScript";
import DocumentSync from "@/components/DocumentSync";
import LoadingScreen from "@/components/LoadingScreen";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import SkipLink from "@/components/SkipLink";
import {
  pageMetadata,
  SHARE_IMAGE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/site";
import { SUPPORTED_LOCALES } from "@/lib/i18n";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  ...pageMetadata("/"),
  title: { default: SITE_TITLE, template: `%s · ${SITE_NAME}` },
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f0f9ff",
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  image: `${SITE_URL}${SHARE_IMAGE}`,
  applicationCategory: "GameApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript",
  inLanguage: SUPPORTED_LOCALES,
  isAccessibleForFree: true,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  author: { "@type": "Person", name: "Jahat Trinidad" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // ThemeScript rewrites lang and class before hydration, from values the
    // prerender cannot know.
    <html lang="es" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <link rel="preload" as="image" href="/assets/figures/dino.png" />
        <link rel="preload" as="image" href="/assets/figures/dog.png" />
        <link rel="preload" as="image" href="/assets/figures/cow.png" />
        <link rel="preload" as="image" href="/assets/figures/potato.png" />
        <link rel="preload" as="image" href="/assets/figures/starwars.png" />
      </head>
      <body className="antialiased text-slate-900 dark:text-slate-100">
        <script
          type="application/ld+json"
          // Escaped so no value can close the script tag.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
          }}
        />
        <DocumentSync />
        <ServiceWorkerRegistrar />
        <LoadingScreen />
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
