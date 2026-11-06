import type { Metadata } from "next";
import { DEFAULT_LOCALE, t } from "@/lib/i18n";

export const SITE_URL = "https://queens.jahattrinidad.com";
export const SITE_NAME = "Queens 4 My Queen";
export const SITE_TITLE = `${SITE_NAME} · Logic puzzle`;
export const SITE_DESCRIPTION = t(DEFAULT_LOCALE, "app.description");
export const SHARE_IMAGE = "/og-image.png";

/** Every page a crawler should find. The sitemap is built from this list. */
export const PUBLIC_PAGES = ["/", "/leaderboard", "/tutorial", "/credits"];

/**
 * Canonical and share tags for one page. Next replaces openGraph and twitter
 * whole rather than merging them with the root layout, so each page needs all of it.
 */
export function pageMetadata(path: string, title?: string): Metadata {
  const shareTitle = title ? `${title} · ${SITE_NAME}` : SITE_TITLE;

  return {
    ...(title && { title }),
    description: SITE_DESCRIPTION,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      siteName: SITE_NAME,
      locale: DEFAULT_LOCALE,
      title: shareTitle,
      description: SITE_DESCRIPTION,
      images: [
        {
          url: SHARE_IMAGE,
          width: 1200,
          height: 630,
          alt: "Queens 4 My Queen: a solved board with one crown in every coloured region",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: shareTitle,
      description: SITE_DESCRIPTION,
      images: [SHARE_IMAGE],
    },
  };
}
