import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  LOG_LEVEL: z.string().default("info"),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(5),
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
  WORKER_HEARTBEAT_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  WORKER_SHUTDOWN_GRACE_MS: z.coerce.number().int().positive().default(10000),
  // Comma-separated queue names; empty string means "poll all queues".
  WORKER_QUEUES: z
    .string()
    .default("")
    .transform((v) => (v.trim().length === 0 ? [] : v.split(",").map((s) => s.trim()))),
});

export const env = envSchema.parse(process.env);
