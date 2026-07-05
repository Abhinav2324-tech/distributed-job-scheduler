# Design Decisions

This document explains the non-obvious engineering choices in this project — the
*why* behind the schema, the concurrency model, and the architecture. For *what*
each endpoint does, see `openapi.yaml` / the Swagger UI. For *how* to run it, see
`README.md`.

## 1. Atomic job claiming

This is the single most important correctness property in the system: two
worker processes must never be able to claim the same job.

**The query is one statement, not a transaction wrapping two.** A common
approach is `BEGIN; SELECT ... FOR UPDATE SKIP LOCKED; UPDATE ...; COMMIT;`.
Instead, `packages/db/src/claim.ts` folds the select and the update into a
single CTE chain ending in `UPDATE ... FROM (...) RETURNING`. A single
statement is atomic in Postgres by construction, so there's no explicit
transaction to wrap, and no extra network round trip.

**Why `FOR UPDATE OF j` (not the joined queue row).** Scoping the lock to the
job row specifically — rather than letting it implicitly extend to the joined
`queues` row — matters: without `OF j`, two workers claiming from the *same*
queue would lock each other out of the queue row and needlessly skip valid
candidates, even though they want different job rows.

**Why the `claimable` CTE is `MATERIALIZED`.** This was found empirically, not
reasoned out in advance. Postgres 12+ will otherwise inline a CTE into the
outer `UPDATE`'s query plan; under concurrent writes this triggers
`EvalPlanQual` re-checking, which can re-evaluate the `FOR UPDATE SKIP LOCKED`
subquery per-row and return the same physical row to more than one caller. A
concurrency test with 20 simulated workers claiming from a 100-job pool
returned 200 total results — roughly half duplicates — before adding
`MATERIALIZED`. See `packages/db/src/__tests__/claim.test.ts` for the
regression test that pins this behavior.

**Why eligibility is re-checked inside `claimable`, redundantly with
`ranked`/`eligible`.** The `ranked` and `eligible` CTEs compute job status
against a snapshot taken *before* the row lock is acquired. Without restating
`WHERE status IN ('QUEUED','SCHEDULED') AND (run_at IS NULL OR run_at <=
now())` at the same query level as `FOR UPDATE`, Postgres's concurrent-update
recheck can hand back a row that another transaction already claimed and
committed in the gap between the snapshot and the lock attempt. Empirically,
without this re-check, 1–3% of claims under high concurrency returned a job
that had already gone to a different worker.

**maxConcurrency is a soft cap, deliberately.** The `running_counts`/`capacity`
CTEs read the current in-flight count per queue to bound how many more jobs
can be claimed, but that read isn't itself locked — under heavy concurrent
claiming the cap could be exceeded by a small margin in rare interleavings.
This is a throttle-precision trade-off, not a double-claim safety violation:
the no-two-callers-get-the-same-job guarantee above is independent of it and
holds regardless.

**Why the query only `RETURNING`s `id`, then re-fetches through Prisma.** Raw
`$queryRaw` results come back with the database's snake_case column names and
untyped values, not Prisma's camelCase model shape. Re-fetching the claimed
IDs through the normal Prisma Client API avoids hand-mapping every column and
guarantees correctly-typed `Date`s and enums, at the cost of one extra
(indexed, primary-key) query.

## 2. Retry, backoff, and the dead letter queue

**A job is never left resting at `FAILED`.** The claim query only ever selects
`QUEUED` or `SCHEDULED` rows. So a job awaiting retry must transition straight
to `SCHEDULED` (with `runAt`/`nextRetryAt` set to the backoff delay) to remain
reclaimable — there's no separate "retry queue" or scheduler; the same claim
query that picks up delayed jobs picks up retries, because they're the same
kind of row. Once retries are exhausted, `DEAD_LETTER` is the real terminal
state, paired with a `DeadLetterEntry` row (see `apps/worker/src/retry.ts`).

**Backoff strategy and retry limits are snapshotted onto the Job at creation
time, not read live from the Queue's `RetryPolicy`.** If an operator edits a
queue's retry policy while jobs are in flight, those jobs must keep executing
under the contract they were created with — not silently change behavior
mid-execution. This is a deliberate denormalization (the same values also
live on `RetryPolicy` for reuse across queues/scheduled jobs), traded for
execution-time correctness.

**The dead letter queue is a thin marker, not a data copy.** `DeadLetterEntry`
stores only `reason`, `finalError`, and timestamps — `Job` remains the single
source of truth for payload, execution history, and logs. This avoids two
copies of the same job ever being able to disagree with each other.

## 3. Schema and tenancy

**Tenancy chain (`Organization → Project → Queue → Job`) is fully normalized
(3NF)** — no repeated group columns, every fact lives in exactly one place.

**Cascade rules are asymmetric on purpose, not uniform:**
- `Organization → User/Project`: `Cascade`. Deleting an org is a full teardown.
- `Project → Queue`: `Cascade` at the FK level, but the API never issues a hard
  delete for "delete project" — it sets `archivedAt` and propagates that
  archive flag to child queues in application code. The `Cascade` FK exists
  only for the rare genuine admin purge of an empty, already-archived project.
- `Queue → Job`: **`Restrict`**. This is the actual safety net: a queue with
  any job history cannot be hard-deleted even if something upstream tries to
  cascade from `Project` down. Queues are archived, never dropped, once they
  have history.
- `Worker → Job.claimedBy` / `JobExecution.worker`: `SetNull`. Purging a
  worker record (e.g. after long-term cleanup) must not delete job history —
  only its claim/attribution pointer.
- `ScheduledJob → Job`: `SetNull`. Deleting a cron definition keeps the jobs
  it already spawned as historical fact.
- `RetryPolicy → Queue/ScheduledJob`: `SetNull`. Falls back to the job-creation
  defaults if the shared policy is later removed.

**`Worker.queueNames` is a string array, not a join table.** Which queues a
worker process polls is operational configuration for that process (an
environment variable at boot), not a referential fact requiring FK integrity —
a worker can legitimately be configured for a queue name before that queue
exists, or after it's archived.

**Indexes are chosen to match actual query shapes**, not added speculatively:
`Job(queueId, status, runAt)` supports the claim query directly;
`Job(nextRetryAt)` and `Job(runAt)` support delayed-job promotion;
`ScheduledJob(isActive, nextRunAt)` supports the cron-tick sweep;
`Worker(status, lastHeartbeatAt)` and `WorkerHeartbeat(workerId, heartbeatAt)`
support dead-worker detection. A partial index (`WHERE status IN ('QUEUED',
'SCHEDULED')`) would be more selective in production, but Prisma's schema DSL
doesn't support partial indexes — that refinement would need a hand-written
SQL migration and was left out of scope for this project's size.

## 4. Worker lifecycle

**Heartbeats are a separate append-only table (`WorkerHeartbeat`), not just a
column update on `Worker`.** `Worker.lastHeartbeatAt` gives fast liveness
checks; the heartbeat history table gives an audit trail of load over time
without overwriting it. A background sweeper marks workers `DEAD` once their
heartbeat gap exceeds a threshold, and releases any jobs still marked
`CLAIMED`/`RUNNING` under that worker back to `QUEUED`.

**Graceful shutdown drains before dying.** On `SIGTERM`, the worker stops
claiming new jobs, marks itself `DRAINING`, waits up to a configurable grace
period for in-flight jobs to finish, and only then releases anything still
running back to its queue and marks itself `DEAD`. This was verified against
real Docker containers rather than assumed, since Windows doesn't deliver a
native `SIGTERM` to a locally-run Node process the same way a Linux container
does.

**Workers are not org-scoped in the schema.** A worker fleet is shared
operational infrastructure (which physical/container processes are polling
which queues), not tenant data — so `GET /api/workers` intentionally returns
the whole fleet rather than filtering by the caller's organization.

## 5. Real-time updates (Socket.IO)

**Job status changes happen in the worker process, which holds no socket
connection of its own.** Rather than introducing a cross-process event bus
(Redis pub/sub, etc.) just to notify the dashboard, the API runs a lightweight
ticker (`apps/api/src/jobs/realtimeBroadcaster.ts`) that polls for what
changed since its last tick and re-broadcasts it over the sockets it does
hold, scoped to `org:{orgId}` rooms. This trades a small fixed polling
interval (default 2s) for architectural simplicity — no new infrastructure
dependency, and correctness doesn't depend on delivery ordering across
processes.

**Socket auth happens at the handshake, not per-event.** The JWT is verified
once when the client connects (`io.use(...)` middleware in
`apps/api/src/lib/socket.ts`), and the socket is joined to its org's room at
that point — every subsequent broadcast is scoped by room membership rather
than re-checked per message.

## 6. Deployment-specific trade-offs

These exist only because of free-tier hosting constraints, not because
they're the "correct" architecture — see the inline comments in `render.yaml`
and `apps/worker/src/index.ts` for the exact mechanism.

**The worker deploys as a "Web Service" on Render, not a "Background Worker."**
Render's free plan only offers the Web Service type; Background Workers
require a paid plan. The worker binds `$PORT` with a trivial HTTP listener
solely to satisfy that platform requirement — it plays no part in job
processing, which still happens entirely through the existing poll loop. The
listener is a no-op locally and in docker-compose, where `PORT` is never set.
On a paid plan, this reduces to changing one line (`type: web` → `type:
worker`) in `render.yaml`.

**Both the free Render and Vercel deployments idle down after inactivity.**
Render's free web services spin down after ~15 minutes without traffic and
take up to a minute to wake on the next request; this is a hosting-tier
characteristic, not an application bug.

## 7. What's deliberately out of scope

Called out explicitly so it reads as a decision, not an oversight:

- **Multi-org membership per user.** A `User` belongs to exactly one
  `Organization`. Supporting a user across multiple orgs would need a join
  table and a currently-active-org concept in the JWT/session — reasonable
  for a real product, unnecessary for this assignment's scope.
- **Refresh-token rotation.** Auth uses a single signed JWT with an
  expiration; there's no refresh-token flow. Acceptable for a project of this
  scope; would be a requirement before any real production use.
- **A dedicated `Batch` aggregate table.** Batch-submitted jobs share a
  `batchId` string on `Job` for grouping/filtering, but there's no separate
  `Batch` row tracking aggregate status (e.g. "12 of 50 complete"). That
  aggregate is computed on read (`GROUP BY batchId`) rather than maintained
  incrementally.
- **Per-job priority override.** Priority is a property of the `Queue`, not
  overridable per individual `Job`. A job can be reprioritized only by moving
  queues.
