import { parseExpression } from "cron-parser";
import { badRequest } from "./errors";

export function computeNextRunAt(cronExpression: string, from: Date): Date {
  try {
    const interval = parseExpression(cronExpression, { currentDate: from });
    return interval.next().toDate();
  } catch {
    throw badRequest(`Invalid cron expression: "${cronExpression}"`);
  }
}
