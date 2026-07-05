import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/test-utils/setup.ts"],
    testTimeout: 15000,
    hookTimeout: 15000,
    // All test files share one live Postgres database, and each test
    // resets it with TRUNCATE in beforeEach. Running files in parallel
    // would let one file's truncate wipe another file's in-progress data,
    // so files must run serially against the shared DB.
    fileParallelism: false,
  },
});
