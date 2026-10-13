import { z } from 'zod';
import { ActivityModel } from '../../../models/Activity.js';

const activityFieldsSchema = z.object({
  type: z.enum(['course_view', 'lesson_complete', 'quiz_complete', 'skill_practice', 'session_booked']),
  title: z.string().min(2).max(240),
  link: z.string().max(300).optional().default(''),
  targetLabel: z.string().max(240).optional().default(''),
  scheduledDate: z.string().max(40).optional().default(''),
  scheduledTime: z.string().max(40).optional().default(''),
  notes: z.string().max(2000).optional().default(''),
  pathId: z.string().max(100).optional().default(''),
  stageId: z.string().max(100).optional().default(''),
  subjectId: z.string().max(100).optional().default(''),
  sectionId: z.string().max(100).optional().default(''),
  skillIds: z.array(z.string().max(100)).max(20).optional().default([]),
  courseId: z.string().max(100).optional().default(''),
  requestKey: z.string().min(8).max(100).optional(),
});
export const bookingRequestSchema = z.union([
  activityFieldsSchema.extend({type:z.literal('session_booked')}).strict(),
  activityFieldsSchema.extend({type:z.enum(['course_view','lesson_complete','quiz_complete','skill_practice'])}),
]);

export const serializeBooking = (activity: any, management = false) => ({
  id: String(activity._id), userId: activity.userId || '', type: activity.type,
  title: activity.title, date: activity.date, link: activity.link || '',
  targetLabel: activity.targetLabel || '', scheduledDate: activity.scheduledDate || '',
  scheduledTime: activity.scheduledTime || '', notes: activity.notes || '',
  bookingStatus: activity.bookingStatus || 'pending',
  assignedTeacherName: activity.assignedTeacherName || '', teacherId: activity.teacherId || '',
  sessionId: activity.sessionId || '', pathId: activity.pathId || '', stageId: activity.stageId || '',
  subjectId: activity.subjectId || '', sectionId: activity.sectionId || '',
  skillIds: activity.skillIds || [], courseId: activity.courseId || '', createdAt: activity.createdAt,
  ...(management ? { adminNotes: activity.adminNotes || '' } : {}),
});

export async function createBookingRequest(actor: { id: string }, input: unknown) {
  const payload = bookingRequestSchema.parse(input);
  const data = { ...payload, userId: actor.id, date: new Date().toISOString(), bookingStatus: 'pending' };
  if (payload.type !== 'session_booked' || !payload.requestKey) {
    return serializeBooking(await ActivityModel.create(data));
  }
  const key = { userId: actor.id, requestKey: payload.requestKey, type: 'session_booked' };
  await ActivityModel.init();
  try {
    const activity = await ActivityModel.findOneAndUpdate(key, { $setOnInsert: data }, { upsert: true, new: true, runValidators: true });
    return serializeBooking(activity);
  } catch (error: any) {
    if (error?.code !== 11000) throw error;
    const activity = await ActivityModel.findOne(key);
    if (!activity) throw error;
    return serializeBooking(activity);
  }
}
