import { Router } from "express";
import mongoose from "mongoose";

export const healthRouter = Router();

const serviceStartedAt = Date.now();

const readyStateLabels: Record<number, string> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

function getDatabaseHealth() {
  const readyState = mongoose.connection.readyState;
  return {
    status: readyStateLabels[readyState] || "unknown",
    readyState,
    ok: readyState === 1,
  };
}

function getRuntimeHealth() {
  const commit =
    process.env.RENDER_GIT_COMMIT ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GIT_COMMIT_SHA ||
    process.env.COMMIT_SHA ||
    "";

  return {
    service: "The Hundred Platform API",
    environment: process.env.NODE_ENV || "development",
    version: process.env.APP_VERSION || process.env.npm_package_version || "0.1.0",
    commit: commit ? commit.slice(0, 12) : undefined,
    uptimeSeconds: Math.round(process.uptime()),
    startedAt: new Date(serviceStartedAt).toISOString(),
    timestamp: new Date().toISOString(),
  };
}

healthRouter.get("/live", (_req, res) => {
  res.json({
    status: "ok",
    ...getRuntimeHealth(),
  });
});

healthRouter.get("/ready", (_req, res) => {
  const database = getDatabaseHealth();
  const status = database.ok ? "ok" : "degraded";
  res.status(database.ok ? 200 : 503).json({
    status,
    database,
    checks: {
      database: database.ok ? "pass" : "fail",
    },
    ...getRuntimeHealth(),
  });
});

healthRouter.get("/", (_req, res) => {
  const database = getDatabaseHealth();
  res.status(database.ok ? 200 : 503).json({
    status: database.ok ? "ok" : "degraded",
    database: database.status,
    checks: {
      database: database.ok ? "pass" : "fail",
    },
    ...getRuntimeHealth(),
  });
});
