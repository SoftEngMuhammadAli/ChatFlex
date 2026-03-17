import pino from "pino";
import pinoHttp from "pino-http";
import { randomUUID } from "crypto";

const isProd = String(process.env.NODE_ENV || "").toLowerCase() === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.body.password",
      "req.body.token",
      "req.body.refreshToken",
    ],
    remove: true,
  },
});

export const requestLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = String(req.headers["x-request-id"] || "").trim();
    const id = existing || randomUUID();
    res.setHeader("x-request-id", id);
    return id;
  },
  customLogLevel: function (req, res, err) {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  serializers: {
    req(req) {
      return {
        id: req.id,
        method: req.method,
        url: req.url,
        remoteAddress: req.remoteAddress,
        remotePort: req.remotePort,
      };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
  },
});

