import assert from 'node:assert/strict';
import { isolatedMongo } from './live-session-test-fixture.js';
import { bookingRequestSchema, serializeBooking } from '../server/src/modules/content/liveSessions/bookingRequests.js';
const base = { type: 'session_booked', title: 'جلسة اختبار', scheduledDate: '2026-10-20', scheduledTime: '16:00', requestKey: 'test-request-123' };
assert.equal(bookingRequestSchema.parse(base).bookingStatus, undefined);
assert.throws(() => bookingRequestSchema.parse({ ...base, bookingStatus: 'confirmed', userId: 'other' }));
assert.equal((bookingRequestSchema.parse({type:'quiz_complete',title:'legacy event',extra:'ignored'}) as any).extra,undefined);
assert.equal(bookingRequestSchema.parse({ ...base, pathId: 'stage-free' }).stageId, '');
for (const status of ['pending', 'confirmed', 'rejected', 'cancelled']) {
  const result = serializeBooking({ _id: 'saved-id', ...base, bookingStatus: status, userId: 'student', date: '2026-10-13' });
  assert.equal(result.id, 'saved-id'); assert.equal(result.bookingStatus, status);
  assert.equal(result.userId, 'student');
  assert.equal('adminNotes' in serializeBooking({ _id: 'saved', adminNotes: 'private admin note' }), false);
}
console.log('PASS request identity, statuses, stage-free target, forgery rejection and admin-note privacy');
const close = await isolatedMongo();
try {
  const { ActivityModel } = await import('../server/src/models/Activity.js');
  const { createBookingRequest } = await import('../server/src/modules/content/liveSessions/bookingRequests.js');
  await ActivityModel.init();
  const requests = await Promise.all(Array.from({ length: 6 }, () => createBookingRequest({ id: 'student' }, base)));
  assert.equal(new Set(requests.map(item => item.id)).size, 1);
  assert.equal(await ActivityModel.countDocuments(), 1);
  const other = await createBookingRequest({ id: 'other-student' }, base);
  assert.notEqual(other.id, requests[0].id);
  await ActivityModel.updateOne({ _id: requests[0].id }, { $set: { bookingStatus: 'confirmed' } });
  assert.equal((await createBookingRequest({ id: 'student' }, base)).bookingStatus, 'confirmed');
  assert.equal(await ActivityModel.countDocuments(), 2);
  console.log('PASS concurrent idempotent requests, separate owner and saved status on retry (isolated Mongo)');
} finally { await close(); }
