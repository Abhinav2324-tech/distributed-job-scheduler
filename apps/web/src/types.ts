import type { JobStatus, BackoffStrategy, WorkerStatus, ExecutionStatus, LogLevel } from "@jobscheduler/shared";

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  description: string | null;
  archivedAt: string | null;
  createdAt: string;
}

export interface RetryPolicy {
  id: string;
  projectId: string;
  name: string;
  maxRetries: number;
  backoffStrategy: BackoffStrategy;
  baseDelaySeconds: number;
  maxDelaySeconds: number;
}

export interface QueueStats {
  queued: number;
  running: number;
  completed: number;
  failed: number;
  deadLetter: number;
  completedLastHour?: number;
}

export interface Queue {
  id: string;
  projectId: string;
  name: string;
  priority: number;
  maxConcurrency: number;
  isPaused: boolean;
  archivedAt: string | null;
  retryPolicyId: string | null;
  createdAt: string;
  project?: { id: string; name: string; slug: string };
  stats?: QueueStats;
}

export interface Job {
  id: string;
  queueId: string;
  scheduledJobId: string | null;
  claimedByWorkerId: string | null;
  batchId: string | null;
  idempotencyKey: string | null;
  jobType: string;
  payload: unknown;
  status: JobStatus;
  runAt: string | null;
  retryCount: number;
  maxRetries: number;
  backoffStrategy: BackoffStrategy;
  baseDelaySeconds: number;
  maxDelaySeconds: number;
  nextRetryAt: string | null;
  claimedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
  queue?: { name: string };
}

export interface JobLog {
  id: string;
  jobExecutionId: string;
  timestamp: string;
  level: LogLevel;
  message: string;
}

export interface JobExecution {
  id: string;
  jobId: string;
  attemptNumber: number;
  workerId: string | null;
  status: ExecutionStatus;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  logs?: JobLog[];
}

export interface JobWithHistory extends Job {
  executions: JobExecution[];
  deadLetterEntry: DeadLetterEntry | null;
}

export interface DeadLetterEntry {
  id: string;
  jobId: string;
  reason: string;
  finalError: string | null;
  movedAt: string;
  resolvedAt: string | null;
  job?: Job;
}

export interface WorkerRow {
  id: string;
  hostname: string;
  pid: number;
  queueNames: string[];
  concurrency: number;
  currentJobCount: number;
  status: WorkerStatus;
  startedAt: string;
  lastHeartbeatAt: string;
  activeJobs: Array<{ id: string; jobType: string; queueId: string; status: string; startedAt: string | null }>;
}

export interface Overview {
  activeWorkers: number;
  deadWorkers: number;
  queueBacklog: number;
  runningCount: number;
  completedLastHour: number;
  failedLastHour: number;
  failureRatePercent: number;
  statusCounts: Record<JobStatus, number>;
  throughputSeries: Array<{ bucket: string; completed: number; failed: number }>;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}
