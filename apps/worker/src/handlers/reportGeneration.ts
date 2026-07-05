import type { JobHandler } from "./types";
import { simulateWork } from "./types";

export const reportGenerationHandler: JobHandler = async (payload, ctx) => {
  await ctx.log(`Generating report with payload: ${JSON.stringify(payload)}`);
  await simulateWork({ minMs: 1000, maxMs: 3000, failureChance: 0.15 });
  await ctx.log("Report generated");
};
