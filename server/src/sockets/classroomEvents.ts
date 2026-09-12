import type { Server } from "socket.io";
let io: Server | null = null;
export const setClassroomSocketServer = (server: Server) => { io = server; };
export const emitClassroomEvent = (
  sessionId: string,
  event: "question:published" | "response:updated" | "session:ended" | "classroom:started",
  payload: Record<string, unknown>,
) => io?.to(`classroom:${sessionId}`).emit(event, payload);

export const emitClassroomEventToClass = (
  classId: string,
  event: "classroom:started" | "session:ended",
  payload: Record<string, unknown>,
) => io?.to(`class:${classId}`).emit(event, payload);

