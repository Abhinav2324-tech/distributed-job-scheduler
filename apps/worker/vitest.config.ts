import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./src/test-utils/setup.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
    // Tests share one live Postgres and reset it via TRUNCATE in beforeEach;
    // running test files in parallel would let one file's truncate wipe
    // another file's in-progress data.
    fileParallelism: false,
  },
});
