import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // The project tsconfig uses `jsx: preserve` (for Next); the React plugin
  // applies the automatic JSX transform when running tests.
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // Globals are required for Testing Library's automatic DOM cleanup.
    globals: true,
    // Route/utility suites run in node; component suites opt into jsdom
    // with a `// @vitest-environment jsdom` docblock.
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
