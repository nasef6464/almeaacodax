import type { SessionActor } from './contracts.js';
export function canAccessSession(actor: SessionActor | undefined, session: any, courseEntitled = false): boolean {
  if (actor?.role === 'admin') return true;
  if (actor?.role === 'teacher' && actor.id === session.teacherId) return true;
  const audience = session.audience;
  if (audience?.kind === 'private') return Boolean(actor && actor.id === audience.studentId);
  if (audience?.kind === 'course') return Boolean(actor && courseEntitled);
  if (audience?.kind === 'group') return Boolean(actor && audience.groupIds?.some((id: string) => actor.groupIds?.includes(id)));
  return audience?.kind === 'public';
}
export function participantPayload(actor: SessionActor | undefined, payload: any, courseEntitled = false) {
  const { hostUrl: _host, ...safe } = payload;
  if (canAccessSession(actor, payload, courseEntitled)) return safe;
  const { meetingUrl: _meeting, recordingUrl: _recording, joinInstructions: _instructions, ...publicFields } = safe;
  return publicFields;
}
export const privateLessonAllowed = (lesson: any, actor?: SessionActor) => {
  if (!lesson.bookingId && !lesson.privateStudentId && !String(lesson.id || '').startsWith('live_conv_')) return true;
  return actor?.role === 'admin' || Boolean(actor && (lesson.privateStudentId === actor.id || (actor.role === 'teacher' && lesson.assignedTeacherId === actor.id)));
};
export function stripCanonicalMeetingLinks(lesson: any) {
  if (!lesson.sessionId && !lesson.bookingId && !lesson.privateStudentId) return lesson;
  const { meetingUrl: _meeting, recordingUrl: _recording, joinInstructions: _instructions, ...safe } = lesson;
  return safe;
}
export function projectCourseLiveLinks(course: any) {
  return { ...course, modules: (course.modules || []).map((module:any)=>({...module,lessons:(module.lessons||[]).filter((lesson:any)=>!lesson.bookingId && !lesson.privateStudentId).map(stripCanonicalMeetingLinks)})) };
}
