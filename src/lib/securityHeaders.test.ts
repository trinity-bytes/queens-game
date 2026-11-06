import { describe, expect, it } from "vitest";
import headers from "../../public/_headers?raw";

describe("static security headers", () => {
  it("lets canvas-confetti start its worker, which it does from a blob URL", () => {
    expect(headers).toMatch(/worker-src 'self' blob:;/);
  });

  it("keeps the app out of other sites' frames", () => {
    expect(headers).toMatch(/frame-ancestors 'none'/);
  });
});
