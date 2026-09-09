import type { Server as HttpServer } from "http";
import { createAdapter } from "@socket.io/redis-adapter";
import { Server } from "socket.io";
import { env } from "../config/env.js";
import { createRedisClient, createRedisDuplicate, isRedisConfigured } from "../config/redis.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { GroupModel } from "../models/Group.js";
import { isStaffRole } from "../services/visibility.js";

const configuredSocketOrigins = env.CORS_ALLOWED_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const socketOrigins = Array.from(new Set([env.CLIENT_URL, ...configuredSocketOrigins]));

// Routes (e.g. classroom-sessions.routes.ts) need to push events after
// validating and saving a REST request — they never trust an event coming
// directly from a client socket for anything that changes state. This is
// the single shared handle they use to do that.
let ioInstance: Server | null = null;
export function getIo(): Server | null {
  return ioInstance;
}

export function classroomRoom(sessionId: string) {
  return `classroom:${sessionId}`;
}

export function createSocketServer(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: socketOrigins,
      credentials: true,
    },
  });

  if (isRedisConfigured()) {
    const pubClient = createRedisClient("socket-pub");
    const subClient = createRedisDuplicate("socket-sub");
    if (pubClient && subClient) {
      io.adapter(createAdapter(pubClient, subClient));
      console.info("[socket] Redis adapter enabled");
    }
  } else if (env.NODE_ENV === "production") {
    console.warn("[socket] Redis adapter disabled because REDIS_URL is not configured");
  }

  io.on("connection", (socket) => {
    socket.on("workspace:join", (workspaceId: string) => {
      socket.join(workspaceId);
    });

    // Smart classroom session room join. Auth is re-verified here (JWT,
    // same as REST requireAuth) rather than trusted from the handshake —
    // a socket connection can outlive a single page and roles can change.
    socket.on("classroom:join", async (payload: { sessionId?: string; token?: string }, ack?: (res: unknown) => void) => {
      try {
        const sessionId = String(payload?.sessionId || "");
        const token = String(payload?.token || "");
        if (!sessionId || !token) return ack?.({ ok: false, error: "missing_params" });

        const authUser = verifyAccessToken(token);
        if (!authUser) return ack?.({ ok: false, error: "unauthorized" });

        // Students may only listen on a session for a class they belong to;
        // staff (teacher/supervisor/admin) may listen on any session they
        // are allowed to see. Membership itself is enforced authoritatively
        // by the REST endpoints — this check just prevents an unrelated
        // student from eavesdropping on another class's live room.
        if (!isStaffRole(authUser.role)) {
          const { ClassroomSessionModel } = await import("../models/ClassroomSession.js");
          const session = await ClassroomSessionModel.findById(sessionId).select("groupId").lean();
          if (!session) return ack?.({ ok: false, error: "not_found" });
          const isMember = await GroupModel.findOne({ _id: session.groupId, studentIds: authUser.id })
            .select("_id")
            .lean();
          if (!isMember) return ack?.({ ok: false, error: "forbidden" });
        }

        socket.join(classroomRoom(sessionId));
        ack?.({ ok: true });
      } catch {
        ack?.({ ok: false, error: "unauthorized" });
      }
    });

    socket.on("disconnect", () => {
      // reserved for audit/events later
    });
  });

  ioInstance = io;
  return io;
}
