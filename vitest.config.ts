import { defineConfig } from "vitest/config";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "test/e2e/**"],
  },
  define: {
    __SDK_VERSION__: JSON.stringify(pkg.version),
  },
});
