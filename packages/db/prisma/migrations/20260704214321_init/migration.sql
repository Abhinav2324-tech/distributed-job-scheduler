-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "BackoffStrategy" AS ENUM ('FIXED', 'LINEAR', 'EXPONENTIAL');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'SCHEDULED', 'CLAIMED', 'RUNNING', 'COMPLETED', 'FAILED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR');

-- CreateEnum
CREATE TYPE "WorkerStatus" AS ENUM ('ALIVE', 'DRAINING', 'DEAD');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retry_policies" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "backoff_strategy" "BackoffStrategy" NOT NULL DEFAULT 'EXPONENTIAL',
    "base_delay_seconds" INTEGER NOT NULL DEFAULT 30,
    "max_delay_seconds" INTEGER NOT NULL DEFAULT 3600,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retry_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queues" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "max_concurrency" INTEGER NOT NULL DEFAULT 5,
    "is_paused" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "retry_policy_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_jobs" (
    "id" TEXT NOT NULL,
    "queue_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cron_expression" TEXT NOT NULL,
    "job_type" TEXT NOT NULL,
    "payload_template" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "retry_policy_id" TEXT,
    "next_run_at" TIMESTAMP(3) NOT NULL,
    "last_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "queue_id" TEXT NOT NULL,
    "scheduled_job_id" TEXT,
    "claimed_by_worker_id" TEXT,
    "batch_id" TEXT,
    "idempotency_key" TEXT,
    "job_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "run_at" TIMESTAMP(3),
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL,
    "backoff_strategy" "BackoffStrategy" NOT NULL,
    "base_delay_seconds" INTEGER NOT NULL,
    "max_delay_seconds" INTEGER NOT NULL,
    "next_retry_at" TIMESTAMP(3),
    "claimed_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_executions" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "worker_id" TEXT,
    "status" "ExecutionStatus" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "duration_ms" INTEGER,
    "error_message" TEXT,

    CONSTRAINT "job_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_logs" (
    "id" TEXT NOT NULL,
    "job_execution_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,

    CONSTRAINT "job_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workers" (
    "id" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "pid" INTEGER NOT NULL,
    "queue_names" TEXT[],
    "concurrency" INTEGER NOT NULL,
    "current_job_count" INTEGER NOT NULL DEFAULT 0,
    "status" "WorkerStatus" NOT NULL DEFAULT 'ALIVE',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_heartbeat_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "worker_heartbeats" (
    "id" TEXT NOT NULL,
    "worker_id" TEXT NOT NULL,
    "heartbeat_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_job_count" INTEGER NOT NULL,

    CONSTRAINT "worker_heartbeats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dead_letter_entries" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "final_error" TEXT,
    "moved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "dead_letter_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_org_id_idx" ON "users"("org_id");

-- CreateIndex
CREATE INDEX "projects_org_id_idx" ON "projects"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_org_id_slug_key" ON "projects"("org_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "retry_policies_project_id_name_key" ON "retry_policies"("project_id", "name");

-- CreateIndex
CREATE INDEX "queues_project_id_idx" ON "queues"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "queues_project_id_name_key" ON "queues"("project_id", "name");

-- CreateIndex
CREATE INDEX "scheduled_jobs_is_active_next_run_at_idx" ON "scheduled_jobs"("is_active", "next_run_at");

-- CreateIndex
CREATE INDEX "jobs_queue_id_status_run_at_idx" ON "jobs"("queue_id", "status", "run_at");

-- CreateIndex
CREATE INDEX "jobs_next_retry_at_idx" ON "jobs"("next_retry_at");

-- CreateIndex
CREATE INDEX "jobs_run_at_idx" ON "jobs"("run_at");

-- CreateIndex
CREATE INDEX "jobs_batch_id_idx" ON "jobs"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_queue_id_idempotency_key_key" ON "jobs"("queue_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "job_executions_job_id_idx" ON "job_executions"("job_id");

-- CreateIndex
CREATE INDEX "job_executions_worker_id_idx" ON "job_executions"("worker_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_executions_job_id_attempt_number_key" ON "job_executions"("job_id", "attempt_number");

-- CreateIndex
CREATE INDEX "job_logs_job_execution_id_timestamp_idx" ON "job_logs"("job_execution_id", "timestamp");

-- CreateIndex
CREATE INDEX "workers_status_last_heartbeat_at_idx" ON "workers"("status", "last_heartbeat_at");

-- CreateIndex
CREATE INDEX "worker_heartbeats_worker_id_heartbeat_at_idx" ON "worker_heartbeats"("worker_id", "heartbeat_at");

-- CreateIndex
CREATE UNIQUE INDEX "dead_letter_entries_job_id_key" ON "dead_letter_entries"("job_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retry_policies" ADD CONSTRAINT "retry_policies_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queues" ADD CONSTRAINT "queues_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queues" ADD CONSTRAINT "queues_retry_policy_id_fkey" FOREIGN KEY ("retry_policy_id") REFERENCES "retry_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "queues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_jobs" ADD CONSTRAINT "scheduled_jobs_retry_policy_id_fkey" FOREIGN KEY ("retry_policy_id") REFERENCES "retry_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "queues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_scheduled_job_id_fkey" FOREIGN KEY ("scheduled_job_id") REFERENCES "scheduled_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_claimed_by_worker_id_fkey" FOREIGN KEY ("claimed_by_worker_id") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_executions" ADD CONSTRAINT "job_executions_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_executions" ADD CONSTRAINT "job_executions_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_logs" ADD CONSTRAINT "job_logs_job_execution_id_fkey" FOREIGN KEY ("job_execution_id") REFERENCES "job_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "worker_heartbeats" ADD CONSTRAINT "worker_heartbeats_worker_id_fkey" FOREIGN KEY ("worker_id") REFERENCES "workers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dead_letter_entries" ADD CONSTRAINT "dead_letter_entries_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
