import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger";
import { env } from "./config/env";
import { healthRouter } from "./routes/health";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { authRouter } from "./modules/auth/auth.routes";
import { projectsRouter } from "./modules/projects/projects.routes";
import { queuesRouter } from "./modules/queues/queues.routes";
import { retryPoliciesRouter } from "./modules/retryPolicies/retryPolicies.routes";
import { jobsRouter, jobsRouterForQueue } from "./modules/jobs/jobs.routes";
import {
  scheduledJobsRouter,
  scheduledJobsRouterForQueue,
} from "./modules/scheduledJobs/scheduledJobs.routes";
import { deadLetterRouter } from "./modules/deadLetter/deadLetter.routes";
import { workersRouter } from "./modules/workers/workers.routes";
import { overviewRouter } from "./modules/overview/overview.routes";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());
  app.use(pinoHttp({ logger }));

  app.use(healthRouter);

  app.use("/api/auth", authRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/queues", queuesRouter);
  app.use("/api/retry-policies", retryPoliciesRouter);
  app.use("/api/queues/:queueId/jobs", jobsRouterForQueue);
  app.use("/api/jobs", jobsRouter);
  app.use("/api/queues/:queueId/scheduled-jobs", scheduledJobsRouterForQueue);
  app.use("/api/scheduled-jobs", scheduledJobsRouter);
  app.use("/api/dlq", deadLetterRouter);
  app.use("/api/workers", workersRouter);
  app.use("/api/overview", overviewRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
