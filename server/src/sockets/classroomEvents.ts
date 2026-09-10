import type { Server } from "socket.io";
let io: Server | null = null;
export const setClassroomSocketServer = (server: Server) => { io = server; };
export const emitClassroomEvent = (sessionId: string, event: "question:published" | "response:updated" | "session:ended", payload: Record<string, unknown>) => io?.to(`classroom:${sessionId}`).emit(event, payload);
