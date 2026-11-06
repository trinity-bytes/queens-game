import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES, messageKeys } from "./i18n";

describe("messages", () => {
  it.each(SUPPORTED_LOCALES)("%s has every key the default locale has", (locale) => {
    expect(messageKeys(locale)).toEqual(messageKeys("es"));
  });
});
