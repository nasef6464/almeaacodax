import cookieParser from "cookie-parser";
import compression from "compression";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  const allowedOrigins = new Set([
    env.CLIENT_URL,
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "https://almeaacodax.vercel.app",
  ]);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Origin is not allowed by CORS"));
      },
      credentials: true,
    }),
  );
  app.use(helmet());
  app.use(compression());
  app.use(requestLogger);
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 600,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: "Too many requests, please try again shortly" },
    }),
  );
  app.use(
    ["/api/auth/login", "/api/auth/register", "/api/auth/forgot-password", "/api/auth/reset-password"],
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: "Too many authentication attempts, please try again later" },
    }),
  );
  app.use(
    ["/api/quizzes/*/submit", "/api/ai/*", "/api/payments/*", "/api/auth/me/redeem-access-code"],
    rateLimit({
      windowMs: 60 * 1000,
      limit: 60,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: "Too many requests, please slow down" },
    }),
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());

  app.get("/", (_req, res) => {
    res.json({
      service: "The Hundred Platform API",
      status: "running",
    });
  });

  app.use("/api", apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
