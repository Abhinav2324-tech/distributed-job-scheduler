import type { Prisma } from "@jobscheduler/db";

export interface JobHandlerContext {
  jobId: string;
  attemptNumber: number;
  log: (message: string) => Promise<void>;
}

export type JobHandler = (
  payload: Prisma.JsonValue,
  ctx: JobHandlerContext,
) => Promise<void>;

/** Simulates work with a delay and a chance of throwing, for demo handlers. */
export async function simulateWork(opts: {
  minMs: number;
  maxMs: number;
  failureChance: number;
}): Promise<void> {
  const duration = opts.minMs + Math.random() * (opts.maxMs - opts.minMs);
  await new Promise((resolve) => setTimeout(resolve, duration));
  if (Math.random() < opts.failureChance) {
    throw new Error("Simulated handler failure");
  }
}
