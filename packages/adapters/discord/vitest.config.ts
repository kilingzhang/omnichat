import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "integration/**/*.test.ts"],
    exclude: [
      "node_modules/",
      "dist/",
      "**/*.d.ts",
    ],
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.test.ts",
        "**/*.d.ts",
        "src/__mocks__/**",
        "src/test-setup.ts",
      ],
    },
    resolveSnapshotPath: (base, path) => {
      return path + '.snap';
    },
  },
  resolve: {
    alias: {
      '@omnichat/discord': path.resolve(__dirname, './src'),
    },
  },
});
