import type { JobHandler } from "./types";
import { simulateWork } from "./types";

export const dataSyncHandler: JobHandler = async (payload, ctx) => {
  await ctx.log(`Syncing data with payload: ${JSON.stringify(payload)}`);
  await simulateWork({ minMs: 500, maxMs: 2000, failureChance: 0.2 });
  await ctx.log("Data sync complete");
};
