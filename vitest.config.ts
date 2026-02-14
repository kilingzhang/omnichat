import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["**/src/**/*.test.ts"],
    exclude: [
      "node_modules/",
      "dist/",
      "**/*.d.ts",
      "**/node_modules/zod/**",
    ],
    env: loadEnv("", process.cwd(), ""),
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/*.d.ts",
        "**/types/**",
        "packages/examples/**",
      ],
      // Coverage thresholds - aim for 80% overall
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
    // Test timeout
    testTimeout: 10000,
    // Hook timeout
    hookTimeout: 10000,
  },
});
