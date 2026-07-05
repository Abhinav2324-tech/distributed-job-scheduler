import type { JobHandler } from "./types";
import { emailHandler } from "./email";
import { reportGenerationHandler } from "./reportGeneration";
import { dataSyncHandler } from "./dataSync";

// Drop-in point for real handlers: add an entry here keyed by the job's
// `jobType` string. The poll/claim/execute loop (apps/worker/src/loop.ts,
// wired up in Phase 6) looks up the handler by this key and has no
// knowledge of what any individual handler does.
const registry = new Map<string, JobHandler>([
  ["email", emailHandler],
  ["report-generation", reportGenerationHandler],
  ["data-sync", dataSyncHandler],
]);

export function getHandler(jobType: string): JobHandler | undefined {
  return registry.get(jobType);
}

export function registerHandler(jobType: string, handler: JobHandler): void {
  registry.set(jobType, handler);
}
