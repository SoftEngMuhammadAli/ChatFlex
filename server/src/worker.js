import dotenv from "dotenv";
dotenv.config();

import { Worker } from "bullmq";
import { getRedis, isRedisEnabled } from "./config/redis.js";
import { logger } from "./config/logger.js";
import { sendNotificationEmailNow } from "./services/notification.service.js";
import { dispatchIntegrationEventNow } from "./services/integration.service.js";

const start = async () => {
  if (!isRedisEnabled()) {
    logger.warn("Worker not started: REDIS_URL not configured");
    return;
  }

  const connection = getRedis();
  if (!connection) {
    logger.error("Worker not started: Redis client init failed");
    return;
  }

  const notificationsWorker = new Worker(
    "chatflex_notifications",
    async (job) => {
      if (job.name === "send_email") {
        return sendNotificationEmailNow(job.data);
      }
      return null;
    },
    { connection },
  );

  const integrationsWorker = new Worker(
    "chatflex_integrations",
    async (job) => {
      if (job.name === "dispatch_event") {
        const { workspaceId, event, payload } = job.data || {};
        return dispatchIntegrationEventNow({ workspaceId, event, payload });
      }
      return null;
    },
    { connection },
  );

  notificationsWorker.on("failed", (job, err) => {
    logger.warn(
      { jobId: job?.id, queue: "notifications", err: err?.message },
      "Worker job failed",
    );
  });
  integrationsWorker.on("failed", (job, err) => {
    logger.warn(
      { jobId: job?.id, queue: "integrations", err: err?.message },
      "Worker job failed",
    );
  });

  logger.info("Worker started");
};

start().catch((err) => {
  logger.error({ err: err?.message }, "Worker crashed");
  process.exit(1);
});

