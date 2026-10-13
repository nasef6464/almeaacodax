import mongoose from 'mongoose';
import { LiveReservationModel, LiveResourceRevisionModel } from '../../../models/LiveReservation.js';
import { LiveHostModel } from '../../../models/LiveHost.js';
import { LiveSessionModel } from '../../../models/LiveSession.js';
import { LessonModel } from '../../../models/Lesson.js';
import { NotificationDeliveryModel } from '../../../models/NotificationDelivery.js';
import type { SessionActor } from './contracts.js';

export const fail = (message: string, statusCode = 400): never => { throw Object.assign(new Error(message), { statusCode }); };

export async function reserveSession(actor: SessionActor, item: any, transaction: mongoose.ClientSession) {
  const resources = [{ key: `teacher:${item.teacherId}`, capacity: 1 }];
  if (item.hostId) {
    const host = await LiveHostModel.findById(item.hostId).session(transaction).lean();
    if (!host?.enabled || host.provider !== item.provider) fail('حساب الاستضافة غير متاح');
    if (item.hostingMode === 'teacher_account' && (host!.ownerType !== 'teacher' || host!.ownerId !== item.teacherId)) fail('حساب الاستضافة لا يخص المدرس', 403);
    if (item.hostingMode === 'platform_account' && host!.ownerType !== 'platform') fail('اختر حساب المنصة');
    if (actor.role !== 'admin' && host!.ownerType === 'teacher' && host!.ownerId !== actor.id) fail('حساب الاستضافة غير مصرح', 403);
    resources.push({ key: `host:${item.hostId}`, capacity: host!.capacity });
    item.hostCapacityVerified = Boolean(host!.connected);
  } else { item.hostCapacityVerified = false; }
  for (const resource of resources.sort((a,b) => a.key.localeCompare(b.key))) {
    await LiveResourceRevisionModel.findOneAndUpdate({ _id: resource.key }, { $inc: { revision: 1 } }, { upsert: true, session: transaction });
    const overlaps = await LiveReservationModel.find({ resourceKey: resource.key, sessionId: { $ne: String(item._id) }, startAt: { $lt: item.endAt }, endAt: { $gt: item.startAt } }).session(transaction).lean();
    // Count peak concurrent occupancy, not total intersecting reservations.
    const events = overlaps.flatMap(r => [[Math.max(+new Date(r.startAt), +new Date(item.startAt)), 1], [Math.min(+new Date(r.endAt), +new Date(item.endAt)), -1]]);
    let used = 0;
    for (const [,delta] of events.sort((a,b) => a[0]-b[0] || a[1]-b[1])) {
      used += delta; if (used >= resource.capacity) fail('الموعد يتعارض مع حصة أخرى للمدرس أو المضيف', 409);
    }
  }
  await LiveReservationModel.deleteMany({ sessionId: String(item._id) }).session(transaction);
  await LiveReservationModel.insertMany(resources.map(r => ({ resourceKey: r.key, sessionId: String(item._id), startAt: item.startAt, endAt: item.endAt })), { session: transaction });
}

export async function withSessionTransaction<T>(action: (transaction: mongoose.ClientSession) => Promise<T>): Promise<T> {
  await Promise.all([LiveSessionModel.init(),LessonModel.init(),LiveReservationModel.init(),LiveResourceRevisionModel.init(),NotificationDeliveryModel.init()]);
  // Concurrent first-use upserts can raise duplicate key rather than a transient label.
  for (let retry = 0; retry < 4; retry++) {
    const transaction = await mongoose.startSession();
    try { return (await transaction.withTransaction(() => action(transaction), { maxCommitTimeMS: 10000 })) as T; }
    catch (error: any) { if (error?.code !== 11000 || retry === 3) throw error; }
    finally { await transaction.endSession(); }
  }
  return fail('تعذر تثبيت الموعد، أعد المحاولة', 409);
}
