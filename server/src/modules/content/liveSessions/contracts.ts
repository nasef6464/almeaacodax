export type Provider = 'zoom' | 'google_meet' | 'teams' | 'live_youtube';
export type HostingMode = 'teacher_account' | 'platform_account' | 'manual_link';
export type SessionActor = { id: string; role: string; groupIds?: string[] };
export type SessionAudience = { kind: 'private'; studentId: string } | { kind: 'course'; courseId: string } | { kind: 'group'; groupIds: string[]; pathId?: string; stageId?: string } | { kind: 'public' };
export type SessionSource = { bookingId?: string; courseId?: string; lessonId?: string };
export type SessionState = 'confirmed' | 'cancelled' | 'completed';
export type SessionView = { id: string; title: string; source: SessionSource; audience: { kind: string }; provider: Provider; hostingMode: HostingMode; teacherId: string; teacherName: string; startAt: string; endAt: string; timeZone: string; state: SessionState; meetingReadiness: string; canJoin: boolean; hostCapacityVerified: boolean; hasRecording?: boolean; pathId?: string; levelId?: string; subjectId?: string; management?: { hostId: string; meetingUrl: string; recordingUrl: string; showRecording: boolean } };
