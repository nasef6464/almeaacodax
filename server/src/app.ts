import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.CLIENT_URL,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "2mb" }));
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
