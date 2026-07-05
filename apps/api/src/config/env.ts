import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  JWT_EXPIRES_IN: z.string().default("1d"),
  LOG_LEVEL: z.string().default("info"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  CRON_TICK_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  DEAD_WORKER_THRESHOLD_MS: z.coerce.number().int().positive().default(15000),
  DEAD_WORKER_SWEEP_INTERVAL_MS: z.coerce.number().int().positive().default(10000),
  REALTIME_BROADCAST_INTERVAL_MS: z.coerce.number().int().positive().default(2000),
});

// Render (and other PaaS) inject PORT rather than our own API_PORT name.
if (!process.env.API_PORT && process.env.PORT) {
  process.env.API_PORT = process.env.PORT;
}

export const env = envSchema.parse(process.env);
