import { createHmac } from "node:crypto";
import { env } from "../../config/env.js";
import { ClassroomResponseModel } from "../../models/ClassroomResponse.js";
import { ClassroomParticipantModel } from "../../models/ClassroomParticipant.js";
import { ClassroomSessionModel } from "../../models/ClassroomSession.js";
import { emitClassroomEvent, emitClassroomEventToClass } from "../../sockets/classroomEvents.js";

export const hashClassroomPin = (pin: string) =>
  createHmac("sha256", env.JWT_SECRET).update(pin).digest("hex");

export const classroomSessionId = (doc: any) => String(doc.id || doc._id);

export async function safelyClosePreviousLiveSessions(
  schoolId: string,
  classId: string,
  excludeSessionId?: string,
) {
  const query: Record<string, any> = { schoolId, classId, status: "live" };
  if (excludeSessionId) query._id = { $ne: excludeSessionId };

  const liveSessions = await ClassroomSessionModel.find(query);
  for (const previous of liveSessions) {
    const sessionId = classroomSessionId(previous);
    const [responses, participants] = await Promise.all([
      ClassroomResponseModel.find({ sessionId }).lean(),
      ClassroomParticipantModel.countDocuments({ sessionId }),
    ]);
    const report = {
      sessionId,
      schoolId: previous.schoolId,
      classId: previous.classId,
      participantCount: participants,
      responseCount: responses.length,
      correctCount: responses.filter((response: any) => response.isCorrect).length,
      endedAt: new Date().toISOString(),
    };

    previous.status = "ended";
    previous.endedAt = new Date();
    previous.activeQuestionIndex = null;
    previous.reportSnapshot = report;
    await previous.save();

    emitClassroomEvent(sessionId, "session:ended", { report });
    emitClassroomEventToClass(previous.classId, "session:ended", { sessionId });
  }
}
