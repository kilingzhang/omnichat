import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/integration/**/*.test.ts"],
    exclude: [
      "node_modules/",
      "dist/",
      "**/*.d.ts",
    ],
    env: loadEnv("", process.cwd(), ""),
    testTimeout: 60000,
    hookTimeout: 60000,
    retry: 2,
  },
});
