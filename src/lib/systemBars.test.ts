import { afterEach, describe, expect, it, vi } from "vitest";
import manifest from "../../public/manifest.json";
import { DEFAULT_THEME_COLOR, syncThemeColor } from "./systemBars";

function stubPage(themeBackground: string) {
  const metas = [{ setAttribute: vi.fn() }, { setAttribute: vi.fn() }];
  vi.stubGlobal("document", {
    documentElement: {},
    querySelectorAll: (selector: string) =>
      selector === 'meta[name="theme-color"]' ? metas : [],
  });
  vi.stubGlobal("getComputedStyle", () => ({
    getPropertyValue: (name: string) =>
      name === "--theme-bg" ? themeBackground : "",
  }));
  return metas;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("syncThemeColor", () => {
  it("paints the system bars with the page background, in every tag", () => {
    const metas = stubPage(" #130d03 ");

    syncThemeColor();

    for (const meta of metas) {
      expect(meta.setAttribute).toHaveBeenCalledWith("content", "#130d03");
    }
  });

  it("keeps the current colour when the stylesheet has not loaded", () => {
    const metas = stubPage("");

    syncThemeColor();

    for (const meta of metas) expect(meta.setAttribute).not.toHaveBeenCalled();
  });
});

describe("manifest", () => {
  it("launches on the default theme background", () => {
    expect(manifest.theme_color).toBe(DEFAULT_THEME_COLOR);
    expect(manifest.background_color).toBe(DEFAULT_THEME_COLOR);
  });
});
