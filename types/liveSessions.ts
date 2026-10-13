export type { SessionView, Provider, HostingMode } from '../server/src/modules/content/liveSessions/contracts';
export interface LiveHost { id: string; label: string; provider: string; ownerId: string; ownerType: 'teacher' | 'platform'; capacity: number; enabled: boolean; connected: boolean }
export interface HostingPolicy { providers: string[]; hostingModes: string[]; defaultHostingMode: string; earlyJoinMinutes: number; lateJoinMinutes: number }
export interface LiveSessionInput { teacherId: string; provider: string; hostingMode: string; hostId: string; meetingUrl: string; meetingDate: string; duration: number }
