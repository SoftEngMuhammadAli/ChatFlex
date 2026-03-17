import Redis from "ioredis";

let redis = null;
let redisInitAttempted = false;

const getRedisUrl = () => {
  const url = String(process.env.REDIS_URL || "").trim();
  return url || "";
};

export const isRedisEnabled = () => Boolean(getRedisUrl());

export const getRedis = () => {
  if (redis) return redis;
  if (redisInitAttempted) return null;
  redisInitAttempted = true;

  const url = getRedisUrl();
  if (!url) return null;

  redis = new Redis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    lazyConnect: true,
  });

  redis.on("error", () => {
    // Keep process alive; health/readiness will reflect redis availability.
  });

  return redis;
};

export const pingRedis = async () => {
  const client = getRedis();
  if (!client) return { enabled: false, ok: true };
  try {
    if (client.status === "wait") {
      await client.connect();
    }
    const result = await client.ping();
    return { enabled: true, ok: result === "PONG" };
  } catch (error) {
    return { enabled: true, ok: false, error: String(error?.message || "") };
  }
};

