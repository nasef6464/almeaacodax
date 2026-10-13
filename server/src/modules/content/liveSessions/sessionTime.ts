export function parseScheduledTime(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw Object.assign(new Error('الموعد يحتاج تأكيدًا'), { statusCode: 400 });
  const parsed = new Date(`${date}T${time}:00+03:00`);
  if (!Number.isFinite(parsed.getTime()) || new Date(parsed.getTime() + 3 * 3600000).toISOString().slice(0,10) !== date) throw Object.assign(new Error('الموعد غير صحيح'), { statusCode: 400 });
  return parsed.toISOString();
}
export function inJoinWindow(session: any, now = new Date(), early = 15, late = 30) {
  return session.state === 'confirmed' && now.getTime() >= new Date(session.startAt).getTime() - early * 60000 && now.getTime() <= new Date(session.endAt).getTime() + late * 60000;
}
