import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import mongoose from "mongoose";

import apiRoutes from "./routes/index.js";
import connectDB from "./config/db.js";
import { setupSocket } from "./socketHandler.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
import { handleStripeWebhook } from "./controllers/billing.controller.js";
import { User } from "./models/index.js";
import { startWorkflowScheduler } from "./services/workflow.service.js";
import { requestLogger, logger } from "./config/logger.js";
import { pingRedis } from "./config/redis.js";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Fix __dirname (ES Modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultClientOrigin = process.env.CLIENT_URL || "http://localhost:5173";
const allowedOrigins = String(process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);

/* =========================
   MIDDLEWARES
========================= */

app.set("trust proxy", 1);

app.use(requestLogger);

app.use(
  helmet({
    contentSecurityPolicy: false, // dashboard/widget are separate apps; CSP is managed at the edge
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(compression());

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isDashboardOrigin =
    !origin ||
    origin === defaultClientOrigin ||
    (origin && allowedOrigins.includes(origin));

  return cors({
    origin: (_origin, callback) => callback(null, true),
    credentials: Boolean(isDashboardOrigin),
  })(req, res, next);
});

// Stripe Webhook needs raw body - register it BEFORE express.json()
app.post(
  "/api/v1/billing/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook,
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* =========================
   ROUTES
========================= */

// Health Check
app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "ChatFlex Monolith API is running !",
  });
});

app.get("/healthz", async (_req, res) => {
  const redis = await pingRedis();
  return res.status(200).json({
    ok: true,
    service: "chatflex-api",
    redis,
    timestamp: new Date().toISOString(),
  });
});

app.get("/readyz", async (_req, res) => {
  const redis = await pingRedis();
  const mongoReady = mongoose.connection.readyState === 1;

  const ok = redis.ok && mongoReady;
  return res.status(ok ? 200 : 503).json({
    ok,
    mongo: { ok: mongoReady },
    redis,
    timestamp: new Date().toISOString(),
  });
});

// Static files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.set("json spaces", 2);

// Public widget script hosting
app.use("/widget", express.static(path.join(__dirname, "../public")));

// API Routes
app.use("/api/v1", apiRoutes);

// Swagger Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/* =========================
   ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
  const statusCode =
    err.statusCode || (err.name === "ValidationError" ? 400 : 500);
  const message = err.message || "Something went wrong on the server";

  logger.error(
    {
      reqId: req.id,
      errType: err.name,
      statusCode,
      stack:
        String(process.env.NODE_ENV || "").toLowerCase() === "development"
          ? err.stack
          : undefined,
    },
    message,
  );

  return res.status(statusCode).json({
    success: false,
    error: {
      type: err.name,
      message: message,
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    },
  });
});

/* =========================
   SOCKET + SERVER SETUP
========================= */

// Create HTTP server from Express
const httpServer = createServer(app);

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: (_origin, callback) => callback(null, true),
    credentials: true,
  },
});
app.set("io", io);

// Setup socket handlers
setupSocket(io);

/* =========================
   START SERVER
========================= */
const startServer = async () => {
  try {
    // 1️⃣ Connect DB
    await connectDB();

    // Normalize existing avatar URLs (remove accidental whitespace).
    await User.updateMany({ profilePictureUrl: { $type: "string" } }, [
      {
        $set: {
          profilePictureUrl: { $trim: { input: "$profilePictureUrl" } },
        },
      },
    ]);

    startWorkflowScheduler({
      intervalMs: Number(process.env.WORKFLOW_INTERVAL_MS || 60 * 1000),
    });

    // 2️⃣ Start HTTP + Socket Server
    httpServer.listen(PORT, () => {
      logger.info(
        {
          env: process.env.NODE_ENV,
          port: PORT,
          apiBase: `/api/v1`,
        },
        "ChatFlex server started",
      );
    });
  } catch (error) {
    logger.error({ err: error?.message }, "Failed to start server");
    process.exit(1);
  }
};

startServer();

export default app;
