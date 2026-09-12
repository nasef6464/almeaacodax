import type { Server as HttpServer } from "http";
import { createAdapter } from "@socket.io/redis-adapter";
import { Server } from "socket.io";
import { env } from "../config/env.js";
import { createRedisClient, createRedisDuplicate, isRedisConfigured } from "../config/redis.js";
import { UserModel } from "../models/User.js";
import { GroupModel } from "../models/Group.js";
import { SchoolMembershipModel } from "../models/SchoolMembership.js";
import { ClassroomSessionModel } from "../models/ClassroomSession.js";
import { resolveClassroomSupervisorScope } from "../modules/schools/application/classroomSupervisorReport.js";
import { requireSchoolDirectorCapability } from "../modules/schools/application/schoolDirectorAccess.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { AUTH_COOKIE_NAME } from "../utils/authCookie.js";
import { canJoinAuthorizedWorkspace } from "./workspaceAuthorization.js";
import { setClassroomSocketServer } from "./classroomEvents.js";

const configuredSocketOrigins = env.CORS_ALLOWED_ORIGINS.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const socketOrigins = Array.from(new Set([env.CLIENT_URL, ...configuredSocketOrigins]));

const readSocketToken = (socket: { handshake: { auth?: Record<string, unknown>; headers: Record<string, string | string[] | undefined> } }) => {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string" && authToken.trim()) return authToken.trim();

  const authorization = socket.handshake.headers.authorization;
  const bearer = Array.isArray(authorization) ? authorization[0] : authorization;
  if (typeof bearer === "string" && bearer.startsWith("Bearer ")) return bearer.slice("Bearer ".length).trim();

  const rawCookie = socket.handshake.headers.cookie;
  const cookieHeader = Array.isArray(rawCookie) ? rawCookie[0] : rawCookie;
  const cookieToken = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_COOKIE_NAME}=`))
    ?.slice(AUTH_COOKIE_NAME.length + 1);
  return cookieToken ? decodeURIComponent(cookieToken) : "";
};

export function createSocketServer(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: socketOrigins,
      credentials: true,
    },
  });
  setClassroomSocketServer(io);

  io.use(async (socket, next) => {
    try {
      const token = readSocketToken(socket);
      if (!token) return next(new Error("Authentication required"));
      const tokenUser = verifyAccessToken(token);
      const currentUser = await UserModel.findById(tokenUser.id).select("id _id role isActive schoolId groupIds").lean();
      if (!currentUser || currentUser.isActive === false) return next(new Error("Authentication required"));

      const currentUserId = String((currentUser as any).id || currentUser._id);
      const currentRole = String(currentUser.role);
      const explicitMemberships = await SchoolMembershipModel.find({ userId: currentUserId, status: "active" }).select("schoolId role").lean();
      socket.data.authUser = {
        id: currentUserId,
        role: currentRole,
        schoolId: currentUser.schoolId ? String(currentUser.schoolId) : null,
        schoolIds: explicitMemberships
          .filter((membership: any) => String(membership.role) === currentRole)
          .map((membership: any) => String(membership.schoolId)),
        groupIds: Array.isArray(currentUser.groupIds) ? currentUser.groupIds.map(String) : [],
      };
      return next();
    } catch {
      return next(new Error("Authentication required"));
    }
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
    socket.on("workspace:join", async (workspaceId: unknown, acknowledge?: (result: { ok: boolean; error?: string }) => void) => {
      const allowed = await canJoinAuthorizedWorkspace(socket.data.authUser, workspaceId, {
        async findDirectlySupervisedGroupIds(userId) {
          const groups = await GroupModel.find({ supervisorIds: userId }).select("id _id").lean();
          return groups.map((group: any) => String(group.id || group._id));
        },
        async findClassroomSessionScope(sessionId) {
          const session = await ClassroomSessionModel.findById(sessionId).select("schoolId classId teacherId").lean() as any;
          return session ? { schoolId: String(session.schoolId), classId: String(session.classId), teacherId: String(session.teacherId) } : null;
        },
        async canSchoolDirectorViewClassroom(userId, schoolId) {
          return Boolean(await requireSchoolDirectorCapability(
            userId,
            schoolId,
            "SCHOOL_SMART_CLASSROOM_VIEW",
            "SMART_CLASSROOM",
          ));
        },
        async canSupervisorViewClassroom(userId, schoolId, classId) {
          const scope = await resolveClassroomSupervisorScope({
            id: userId,
            role: "supervisor",
            schoolId: socket.data.authUser?.schoolId || null,
          });
          return scope.all || scope.schoolIds.includes(schoolId) || scope.classIds.includes(classId);
        },
      });

      if (!allowed) {
        const result = { ok: false, error: "Workspace access denied" };
        if (typeof acknowledge === "function") acknowledge(result);
        else socket.emit("workspace:join:error", result);
        return;
      }

      socket.join(String(workspaceId).trim());
      if (typeof acknowledge === "function") acknowledge({ ok: true });
    });

    socket.on("disconnect", () => {
      // reserved for audit/events later
    });
  });

  return io;
}
