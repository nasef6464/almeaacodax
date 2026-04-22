import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env } from "../config/env.js";

export function createSocketServer(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.on("workspace:join", (workspaceId: string) => {
      socket.join(workspaceId);
    });

    socket.on("disconnect", () => {
      // reserved for audit/events later
    });
  });

  return io;
}
