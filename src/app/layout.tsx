import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import { ThemeScript } from "@/components/ThemeScript";
import DocumentSync from "@/components/DocumentSync";
import LoadingScreen from "@/components/LoadingScreen";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import SkipLink from "@/components/SkipLink";
import { t } from "@/lib/i18n";

// Bundled at build time, so a third-party stylesheet never blocks first paint.
const baloo = Baloo_2({
  subsets: ["latin", "latin-ext"],
  weight: ["700", "800"],
  variable: "--font-baloo",
  display: "swap",
});
const nunito = Nunito({
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Queens 4 My Queen",
  description: t("es", "app.description"),
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // ThemeScript rewrites lang and class before hydration, from values the
    // prerender cannot know.
    <html
      lang="es"
      suppressHydrationWarning
      className={`${baloo.variable} ${nunito.variable}`}
    >
      <head>
        <ThemeScript />
        <link rel="preload" as="image" href="/assets/figures/dino.png" />
        <link rel="preload" as="image" href="/assets/figures/dog.png" />
        <link rel="preload" as="image" href="/assets/figures/cow.png" />
        <link rel="preload" as="image" href="/assets/figures/potato.png" />
        <link rel="preload" as="image" href="/assets/figures/starwars.png" />
      </head>
      <body className="antialiased text-slate-900 dark:text-slate-100">
        <DocumentSync />
        <ServiceWorkerRegistrar />
        <LoadingScreen />
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
