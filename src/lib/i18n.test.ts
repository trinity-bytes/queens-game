import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  detectBrowserLocale,
  getInitialLocale,
  getLanguageOptions,
  getRegionName,
  getVictoryMessage,
  messageKeys,
  normalizeLocale,
  t,
} from "./i18n";

function stubBrowser(languages: string[], stored: string | null = null) {
  vi.stubGlobal("window", {});
  vi.stubGlobal("navigator", { languages, language: languages[0] });
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => (key === LOCALE_STORAGE_KEY ? stored : null),
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("messages", () => {
  it.each(SUPPORTED_LOCALES)("%s has every key the default locale has", (locale) => {
    expect(messageKeys(locale)).toEqual(messageKeys(DEFAULT_LOCALE));
  });

  it("falls back to the key when no language has the message", () => {
    expect(t("es", "no.such.key")).toBe("no.such.key");
  });
});

describe("supported languages", () => {
  it("offers English and Spanish only", () => {
    expect(SUPPORTED_LOCALES).toEqual(["en", "es"]);
    expect(getLanguageOptions()).toEqual([
      { value: "en", label: "English" },
      { value: "es", label: "Español" },
    ]);
  });

  it("defaults to English", () => {
    expect(DEFAULT_LOCALE).toBe("en");
  });

  it.each([
    ["es-AR", "es"],
    ["ES", "es"],
    ["en-GB", "en"],
    ["ko", null],
    ["zh-CN", null],
    ["pt-BR", null],
    ["tr", null],
    [null, null],
  ])("normalizes %s to %s", (value, expected) => {
    expect(normalizeLocale(value)).toBe(expected);
  });
});

describe("detectBrowserLocale", () => {
  it("is English where there is no browser", () => {
    expect(detectBrowserLocale()).toBe("en");
  });

  it.each([
    [["es-MX", "en"], "es"],
    [["en-US", "es"], "en"],
    [["fr-FR", "es-ES"], "es"],
    [["fr-FR", "de"], "en"],
    [["pt-BR"], "en"],
    [[], "en"],
  ])("reads %j as %s", (languages, expected) => {
    stubBrowser(languages);
    expect(detectBrowserLocale()).toBe(expected);
  });
});

describe("getInitialLocale", () => {
  it("prefers the language the player chose over the system's", () => {
    stubBrowser(["en-US"], "es");
    expect(getInitialLocale()).toBe("es");
  });

  it("goes back to the system language when the stored one was removed", () => {
    stubBrowser(["es-ES"], "pt");
    expect(getInitialLocale()).toBe("es");
  });

  it("is English when neither the stored nor the system language is available", () => {
    stubBrowser(["ko-KR"], "zh-CN");
    expect(getInitialLocale()).toBe("en");
  });
});

describe("per-language text", () => {
  it.each(SUPPORTED_LOCALES)("%s has its own region names and victory message", (locale) => {
    expect(getRegionName(locale, 0)).toBe(locale === "en" ? "sky" : "cielo");
    expect(getVictoryMessage(locale, "dino", null).length).toBeGreaterThan(0);
  });
});
