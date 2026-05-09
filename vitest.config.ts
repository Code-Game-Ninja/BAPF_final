import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html", "lcov"],
      include: ["lib/**", "app/api/**", "components/**"],
      exclude: [
        "lib/types/**",
        "components/ui/**",
        "**/*.d.ts",
        "**/index.ts",
      ],
      thresholds: {
        "lib/": {
          statements: 70,
          branches: 60,
          functions: 70,
          lines: 70,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
