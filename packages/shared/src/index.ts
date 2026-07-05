// Plain string-literal mirrors of the Prisma enums in packages/db/schema.prisma.
// These are NOT re-exported from @jobscheduler/db on purpose: that package
// pulls in @prisma/client, which uses Node built-ins (fs, native engine
// binaries) that break when bundled for the browser. apps/web imports this
// package directly, so it must stay dependency-free of @prisma/client.
// apps/api has a test asserting these values stay in sync with the real
// Prisma enums (see apps/api/src/__tests__/enumSync.test.ts).
export const JOB_STATUSES = [
  "QUEUED",
  "SCHEDULED",
  "CLAIMED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "DEAD_LETTER",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const BACKOFF_STRATEGIES = ["FIXED", "LINEAR", "EXPONENTIAL"] as const;
export type BackoffStrategy = (typeof BACKOFF_STRATEGIES)[number];

export const WORKER_STATUSES = ["ALIVE", "DRAINING", "DEAD"] as const;
export type WorkerStatus = (typeof WORKER_STATUSES)[number];

export const EXECUTION_STATUSES = ["RUNNING", "COMPLETED", "FAILED"] as const;
export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

export const LOG_LEVELS = ["DEBUG", "INFO", "WARN", "ERROR"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export const USER_ROLES = ["ADMIN", "MEMBER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

// ---------------------------------------------------------------------------
// Example job handler types. The worker's handler registry is pluggable
// (apps/worker/src/handlers) - this union is just the demo set wired up
// out of the box. Adding a real handler means adding a string here and a
// matching entry in the registry, nothing else.
// ---------------------------------------------------------------------------
export const DEMO_JOB_TYPES = ["email", "report-generation", "data-sync"] as const;
export type DemoJobType = (typeof DEMO_JOB_TYPES)[number];

// ---------------------------------------------------------------------------
// Consistent REST error shape
// ---------------------------------------------------------------------------
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// ---------------------------------------------------------------------------
// Pagination (offset-based - see design-decisions.md for the justification)
// ---------------------------------------------------------------------------
export interface OffsetPaginationQuery {
  page?: number;
  pageSize?: number;
}

export interface OffsetPaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

// ---------------------------------------------------------------------------
// WebSocket event contract shared between apps/api (emitter) and apps/web
// (listener)
// ---------------------------------------------------------------------------
export const WS_EVENTS = {
  JOB_UPDATED: "job:updated",
  QUEUE_STATS: "queue:stats",
  WORKER_UPDATED: "worker:updated",
} as const;

export interface JobUpdatedEvent {
  jobId: string;
  queueId: string;
  status: string;
  updatedAt: string;
}

export interface QueueStatsEvent {
  queueId: string;
  queued: number;
  running: number;
  failed: number;
  completedLastHour: number;
}

export interface WorkerUpdatedEvent {
  workerId: string;
  status: string;
  currentJobCount: number;
  lastHeartbeatAt: string;
}
