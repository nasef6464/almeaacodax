import type { Server } from "socket.io";
let io: Server | null = null;
export const setClassroomSocketServer = (server: Server) => { io = server; };
export const emitClassroomEvent = (
  sessionId: string,
  event: "question:published" | "response:updated" | "session:ended" | "classroom:started",
  payload: Record<string, unknown>,
) => {
  const normalizedSessionId = String(sessionId || "").trim();
  if (!normalizedSessionId) return;

  // A classroom session room is shared by the teacher and joined students.
  // Ending the session is therefore only a lifecycle notification here; the
  // finalized report must be fetched through the authorized HTTP API instead
  // of being broadcast to every socket in the room.
  if (event === "session:ended") {
    return io?.to(`classroom:${normalizedSessionId}`).emit(event, {
      sessionId: normalizedSessionId,
      status: "ended",
    });
  }

  return io?.to(`classroom:${normalizedSessionId}`).emit(event, payload);
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
  return io?.to(`class:${classId}`).emit(publicEvent, payload);
};
