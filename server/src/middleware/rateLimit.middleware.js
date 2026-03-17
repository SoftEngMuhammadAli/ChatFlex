import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";
import { getRedis } from "../config/redis.js";

const resolveClientIp = (req) => {
  const forwarded = String(req.headers["x-forwarded-for"] || "").trim();
  if (forwarded) {
    const first = forwarded.split(",")[0];
    if (first) return first.trim();
  }
  return String(req.ip || req.connection?.remoteAddress || "unknown");
};

const buildLimiter = ({ windowMs, max, keyPrefix }) => {
  const points = Math.max(1, Number(max) || 60);
  const duration = Math.max(1, Math.ceil((Number(windowMs) || 60_000) / 1000));

  const redis = getRedis();
  if (redis) {
    return new RateLimiterRedis({
      storeClient: redis,
      keyPrefix: `rl:${keyPrefix}`,
      points,
      duration,
    });
  }

  return new RateLimiterMemory({
    keyPrefix: `rl:${keyPrefix}`,
    points,
    duration,
  });
};

export const createRateLimiter = ({
  windowMs = 60_000,
  max = 60,
  keyPrefix = "global",
} = {}) => {
  const limiter = buildLimiter({ windowMs, max, keyPrefix });

  return async (req, res, next) => {
    try {
      const key = `${keyPrefix}:${resolveClientIp(req)}`;
      await limiter.consume(key, 1);
      return next();
    } catch (rateLimiterRes) {
      const retryAfterSeconds = Math.max(
        1,
        Number(rateLimiterRes?.msBeforeNext || 1000) / 1000,
      );
      res.setHeader("Retry-After", String(Math.ceil(retryAfterSeconds)));
      return res.status(429).json({
        message: "Too many requests. Please try again later.",
      });
    }
  };
};
