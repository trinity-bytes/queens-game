import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Tests run inside workerd against a real local D1, so the SQL, the foreign
 * keys and the triggers under test are the ones production executes.
 */
export default defineConfig(async () => {
  const migrations = await readD1Migrations("./migrations");

  return {
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: { bindings: { TEST_MIGRATIONS: migrations } },
      }),
    ],
    test: {
      include: ["api/**/*.test.ts", "src/**/*.test.ts"],
      setupFiles: ["./api/test/applyMigrations.ts"],
    },
  };
});
