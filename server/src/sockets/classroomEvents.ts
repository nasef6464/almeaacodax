import type { Server } from "socket.io";
let io: Server | null = null;
export const setClassroomSocketServer = (server: Server) => { io = server; };
export const classroomStudentsRoom = (sessionId: string) => `classroom-students:${String(sessionId).trim()}`;
export const classroomStaffRoom = (sessionId: string) => `classroom-staff:${String(sessionId).trim()}`;

const emitToClassroomAudiences = (sessionId: string, event: string, payload: Record<string, unknown>) =>
  io?.to(classroomStudentsRoom(sessionId)).to(classroomStaffRoom(sessionId)).emit(event, payload);

export const emitClassroomEvent = (
  sessionId: string,
  event:
    | "question:published"
    | "response:updated"
    | "competition:updated"
    | "batch:ended"
    | "session:ended"
    | "classroom:started",
  payload: Record<string, unknown>,
) => {
  const normalizedSessionId = String(sessionId || "").trim();
  if (!normalizedSessionId) return;

  // Student devices and staff receive different audiences. In particular an
  // answer acknowledgement must never fan out to every student device.
  if (event === "session:ended") {
    return emitToClassroomAudiences(normalizedSessionId, event, {
      sessionId: normalizedSessionId,
      status: "ended",
    });
  }

  const scopedPayload = { ...payload, sessionId: normalizedSessionId };
  if (event === "response:updated") {
    return io?.to(classroomStaffRoom(normalizedSessionId)).emit(event, scopedPayload);
  }
  return emitToClassroomAudiences(normalizedSessionId, event, scopedPayload);
};

export const emitClassroomEventToClass = (
  classId: string,
  event: "classroom:started" | "session:ended",
  payload: Record<string, unknown>,
) => {
  // Session-room and class-room subscribers can overlap (for example, a student
  // that stays subscribed to its class after joining the live session). Keep the
  // class-wide lifecycle event on a distinct contract so one socket can never
  // receive two different payload shapes under the same event name.
  const publicEvent = event === "session:ended" ? "classroom:ended" : event;
  return io?.to(`class:${classId}`).emit(publicEvent, { ...payload, classId: String(classId) });
};
