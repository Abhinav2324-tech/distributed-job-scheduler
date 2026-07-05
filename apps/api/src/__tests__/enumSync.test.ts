import { describe, expect, it } from "vitest";
import {
  JobStatus as PrismaJobStatus,
  BackoffStrategy as PrismaBackoffStrategy,
  WorkerStatus as PrismaWorkerStatus,
  ExecutionStatus as PrismaExecutionStatus,
  LogLevel as PrismaLogLevel,
  UserRole as PrismaUserRole,
} from "@jobscheduler/db";
import {
  JOB_STATUSES,
  BACKOFF_STRATEGIES,
  WORKER_STATUSES,
  EXECUTION_STATUSES,
  LOG_LEVELS,
  USER_ROLES,
} from "@jobscheduler/shared";

// packages/shared mirrors the Prisma enums as plain string literals so
// apps/web never bundles @prisma/client (see packages/shared/src/index.ts).
// This test is the tripwire that catches the two definitions drifting apart.
describe("packages/shared enum mirrors stay in sync with Prisma schema", () => {
  it("JobStatus", () => {
    expect(JOB_STATUSES.slice().sort()).toEqual(Object.values(PrismaJobStatus).sort());
  });
  it("BackoffStrategy", () => {
    expect(BACKOFF_STRATEGIES.slice().sort()).toEqual(Object.values(PrismaBackoffStrategy).sort());
  });
  it("WorkerStatus", () => {
    expect(WORKER_STATUSES.slice().sort()).toEqual(Object.values(PrismaWorkerStatus).sort());
  });
  it("ExecutionStatus", () => {
    expect(EXECUTION_STATUSES.slice().sort()).toEqual(Object.values(PrismaExecutionStatus).sort());
  });
  it("LogLevel", () => {
    expect(LOG_LEVELS.slice().sort()).toEqual(Object.values(PrismaLogLevel).sort());
  });
  it("UserRole", () => {
    expect(USER_ROLES.slice().sort()).toEqual(Object.values(PrismaUserRole).sort());
  });
});
