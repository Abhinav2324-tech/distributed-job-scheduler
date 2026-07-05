import "dotenv/config";
import { afterAll, beforeEach } from "vitest";
import { prisma } from "../index";

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
