import type { JobHandler } from "./types";
import { simulateWork } from "./types";

export const emailHandler: JobHandler = async (payload, ctx) => {
  await ctx.log(`Sending email with payload: ${JSON.stringify(payload)}`);
  await simulateWork({ minMs: 200, maxMs: 800, failureChance: 0.1 });
  await ctx.log("Email sent");
};
