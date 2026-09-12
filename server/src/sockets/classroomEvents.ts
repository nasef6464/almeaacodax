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
) => {
  // Session-room and class-room subscribers can overlap (for example, a student
  // that stays subscribed to its class after joining the live session). Keep the
  // class-wide lifecycle event on a distinct contract so one socket can never
  // receive two different payload shapes under the same event name.
  const publicEvent = event === "session:ended" ? "classroom:ended" : event;
  return io?.to(`class:${classId}`).emit(publicEvent, payload);
};

