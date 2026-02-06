import { defineConfig } from "vitest/config";
import pkg from "./package.json" with { type: "json" };

export default defineConfig({
  test: {
    include: ["test/e2e/**/*.e2e.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
  define: {
    __SDK_VERSION__: JSON.stringify(pkg.version),
  },
});
