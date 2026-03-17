import { Queue } from "bullmq";
import { getRedis, isRedisEnabled } from "../config/redis.js";

let queues = null;

export const getQueues = () => {
  if (queues) return queues;
  if (!isRedisEnabled()) return null;
  const connection = getRedis();
  if (!connection) return null;

  queues = {
    notifications: new Queue("chatflex_notifications", { connection }),
    integrations: new Queue("chatflex_integrations", { connection }),
  };
  return queues;
};

export const enqueueNotificationEmail = async (payload, opts = {}) => {
  const q = getQueues();
  if (!q) return { queued: false };
  const job = await q.notifications.add("send_email", payload, {
    removeOnComplete: true,
    removeOnFail: 1000,
    attempts: 5,
    backoff: { type: "exponential", delay: 2000 },
    ...opts,
  });
  return { queued: true, jobId: job.id };
};

export const enqueueIntegrationDispatch = async (payload, opts = {}) => {
  const q = getQueues();
  if (!q) return { queued: false };
  const job = await q.integrations.add("dispatch_event", payload, {
    removeOnComplete: true,
    removeOnFail: 2000,
    attempts: 8,
    backoff: { type: "exponential", delay: 3000 },
    ...opts,
  });
  return { queued: true, jobId: job.id };
};

