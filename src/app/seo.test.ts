import { describe, expect, it } from "vitest";
import robots from "./robots";
import sitemap from "./sitemap";
import { pageMetadata, SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, t } from "@/lib/i18n";
import manifest from "../../public/manifest.json";

describe("crawler files", () => {
  it("allows every page and points to the sitemap", () => {
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/" },
      sitemap: `${SITE_URL}/sitemap.xml`,
    });
  });

  it("lists every public page", () => {
    expect(sitemap().map((entry) => entry.url)).toEqual([
      `${SITE_URL}/`,
      `${SITE_URL}/leaderboard`,
      `${SITE_URL}/tutorial`,
      `${SITE_URL}/credits`,
    ]);
  });
});

describe("pageMetadata", () => {
  it("gives a page its own title, canonical and share image", () => {
    const metadata = pageMetadata("/tutorial", "Cómo Jugar");

    expect(metadata.title).toBe("Cómo Jugar");
    expect(metadata.alternates?.canonical).toBe("/tutorial");
    expect(metadata.openGraph?.url).toBe("/tutorial");
    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({ url: "/og-image.png", width: 1200, height: 630 }),
    ]);
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("speaks the default language, the one the pages are prerendered in", () => {
    const metadata = pageMetadata("/");

    expect(metadata.openGraph).toMatchObject({ locale: DEFAULT_LOCALE });
    expect(metadata.description).toBe(t("en", "app.description"));
    expect(SITE_DESCRIPTION).toBe(t("en", "app.description"));
    expect(SITE_TITLE).toBe("Queens 4 My Queen · Logic puzzle");
    expect(manifest.description).toBe(t("en", "app.description"));
  });
});

describe("app.description", () => {
  it("describes the game in every language, since DocumentSync writes it to the head", () => {
    expect(t("es", "app.description")).toBe(
      "Coloca una reina por fila, columna y región sin que se toquen. Un puzzle de lógica para jugar gratis en el navegador, con tabla de líderes.",
    );
    const descriptions = SUPPORTED_LOCALES.map((locale) => t(locale, "app.description"));
    expect(new Set(descriptions).size).toBe(SUPPORTED_LOCALES.length);
    for (const description of descriptions) expect(description.length).toBeGreaterThan(40);
  });
});
