// ============================================================================
// VITEST CONFIG — unit tests for pure business logic (no DB, no network).
// The `@/*` alias mirrors jsconfig.json so tests import modules the same way
// the app does. Tests live in tests/ and run in a Node environment.
// ============================================================================

import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("./", import.meta.url));

export default defineConfig({
  // -- Pin root so a bare `npx vitest` from a parent dir can never walk into
  //    sibling projects under Downloads (each has its own test files). --
  root: projectRoot,
  resolve: {
    alias: {
      "@": projectRoot,
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    coverage: {
      provider: "v8",
      include: ["lib/engine/**", "lib/auth/plan.js", "lib/rag.js", "lib/data/plans.js"],
      reporter: ["text", "text-summary"],
    },
  },
});
