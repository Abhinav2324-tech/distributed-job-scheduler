import { afterAll, beforeEach } from "vitest";
import { prisma } from "@jobscheduler/db";

// Table names (matches @@map(...) in packages/db/prisma/schema.prisma).
// TRUNCATE ... CASCADE ignores per-column ON DELETE actions (including the
// RESTRICT on jobs -> queues), so this works even though normal deletes
// through the app would be blocked.
const TABLES = [
  "dead_letter_entries",
  "job_logs",
  "job_executions",
  "jobs",
  "scheduled_jobs",
  "worker_heartbeats",
  "workers",
  "queues",
  "retry_policies",
  "projects",
  "users",
  "organizations",
];

export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.join(", ")} RESTART IDENTITY CASCADE;`);
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});
