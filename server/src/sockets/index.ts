import type { Server as HttpServer } from "http";
import { createAdapter } from "@socket.io/redis-adapter";
import { Server } from "socket.io";
import { env } from "../config/env.js";
import { createRedisClient, createRedisDuplicate, isRedisConfigured } from "../config/redis.js";
import { UserModel } from "../models/User.js";
import { GroupModel } from "../models/Group.js";
import { ClassroomSessionModel } from "../models/ClassroomSession.js";
import { TeachingAssignmentModel } from "../models/TeachingAssignment.js";
import { resolveClassroomSupervisorScope } from "../modules/schools/application/classroomSupervisorReport.js";
import { requireSchoolDirectorCapability } from "../modules/schools/application/schoolDirectorAccess.js";
import { resolveSchoolEntitlement } from "../modules/schools/application/schoolEntitlementResolver.js";
import { resolveSchoolContexts } from "../modules/schools/application/schoolContextResolver.js";
import { verifyAccessToken } from "../utils/jwt.js";
import { AUTH_COOKIE_NAME } from "../utils/authCookie.js";
import { canJoinAuthorizedWorkspace } from "./workspaceAuthorization.js";
import { classroomStaffRoom, classroomStudentsRoom, setClassroomSocketServer } from "./classroomEvents.js";

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

const resolveSessionIssuedAt = (tokenUser: { sessionIssuedAt?: number; iat?: number }) => {
  const preciseIssuedAt = Number(tokenUser.sessionIssuedAt || 0);
  if (Number.isFinite(preciseIssuedAt) && preciseIssuedAt > 0) return preciseIssuedAt;

  const jwtIssuedAtSeconds = Number(tokenUser.iat || 0);
  if (Number.isFinite(jwtIssuedAtSeconds) && jwtIssuedAtSeconds > 0) return jwtIssuedAtSeconds * 1000;
  return 0;
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
      const currentUser = await UserModel.findById(tokenUser.id).select("id _id role isActive schoolId groupIds +sessionInvalidBefore").lean();
      if (!currentUser || currentUser.isActive === false) return next(new Error("Authentication required"));

      const invalidBefore = Number((currentUser as any).sessionInvalidBefore || 0);
      if (invalidBefore > 0 && resolveSessionIssuedAt(tokenUser) < invalidBefore) {
        return next(new Error("Authentication required"));
      }

      const currentUserId = String((currentUser as any).id || currentUser._id);
      const currentRole = String(currentUser.role);
      const legacySchoolId = currentUser.schoolId ? String(currentUser.schoolId) : null;
      const contexts = await resolveSchoolContexts({ id: currentUserId, role: currentRole, schoolId: legacySchoolId });
      let roleSchoolIds = Array.from(new Set(
        contexts
          .filter((context) => context.role === currentRole)
          .map((context) => String(context.schoolId))
          .filter(Boolean),
      ));

      // Student/teacher realtime access is part of the commercial Smart Classroom
      // module. A valid school membership must not keep Socket.IO rooms alive after
      // the module is removed or the school contract expires.
      if (currentRole === "student" || currentRole === "teacher") {
        const entitlementChecks = await Promise.all(
          roleSchoolIds.map(async (schoolId) => ({
            schoolId,
            allowed: (await resolveSchoolEntitlement(schoolId, "SMART_CLASSROOM")).allowed,
          })),
        );
        roleSchoolIds = entitlementChecks.filter((entry) => entry.allowed).map((entry) => entry.schoolId);
      }

      const authorizedLegacySchoolId = legacySchoolId && roleSchoolIds.includes(legacySchoolId)
        ? legacySchoolId
        : null;
      const runtimeGroupIds = Array.isArray(currentUser.groupIds) ? currentUser.groupIds.map(String) : [];

      socket.data.authUser = {
        id: currentUserId,
        role: currentRole,
        schoolId: authorizedLegacySchoolId,
        schoolIds: roleSchoolIds,
        // Student class rooms drive auto-discovery. Do not keep stale class-room
        // authorization when an explicit school membership or module entitlement
        // has been revoked.
        groupIds: currentRole === "student" && !authorizedLegacySchoolId ? [] : runtimeGroupIds,
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
        async canTeacherOwnClassroom(userId, schoolId, classId) {
          return Boolean(await TeachingAssignmentModel.exists({
            teacherId: userId,
            schoolId,
            classId,
            status: "active",
          }));
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
          const entitlement = await resolveSchoolEntitlement(schoolId, "SMART_CLASSROOM");
          if (!entitlement.allowed) return false;
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
      const normalizedWorkspaceId = String(workspaceId).trim();
      const classroomMatch = normalizedWorkspaceId.match(/^classroom:([a-zA-Z0-9_-]{1,128})$/);
      if (classroomMatch) {
        // The generic room remains the authorization handshake only. Events
        // are delivered through role-separated audiences so a student's answer
        // cannot produce a device-wide student fan-out.
        const audienceRoom = socket.data.authUser?.role === "student"
          ? classroomStudentsRoom(classroomMatch[1])
          : classroomStaffRoom(classroomMatch[1]);
        socket.join(audienceRoom);
      }
      if (typeof acknowledge === "function") acknowledge({ ok: true });
    });

    socket.on("workspace:leave", (workspaceId: unknown) => {
      const normalizedWorkspaceId = typeof workspaceId === "string" ? workspaceId.trim() : "";
      const classroomMatch = normalizedWorkspaceId.match(/^classroom:([a-zA-Z0-9_-]{1,128})$/);
      socket.leave(normalizedWorkspaceId);
      if (classroomMatch) {
        socket.leave(socket.data.authUser?.role === "student"
          ? classroomStudentsRoom(classroomMatch[1])
          : classroomStaffRoom(classroomMatch[1]));
      }
    });

    socket.on("disconnect", () => {
      // reserved for audit/events later
    });
  });

  return io;
}
