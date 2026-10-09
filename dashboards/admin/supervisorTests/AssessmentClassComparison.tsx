import React from 'react';
import type { Group, QuizResult, User } from '../../../types';
import { studentBelongsToReportGroup } from './assessmentReportEvidence';

export const assessmentClassSummaries = (groups: Group[], students: User[], targetIds: string[], results: QuizResult[]) =>
  groups.filter(group => group.type === 'CLASS').map(group => {
    const ids = new Set([
      ...(group.studentIds || []).filter(id => targetIds.includes(id)),
      ...students.filter(student => targetIds.includes(student.id) && studentBelongsToReportGroup(student, group)).map(student => student.id),
    ]);
    const evidence = results.filter(result => result.userId && ids.has(result.userId));
    const participants = new Set(evidence.map(result => result.userId)).size;
    return { id: group.id, name: group.name, targeted: ids.size, participants,
      average: evidence.length ? Math.round(evidence.reduce((sum, result) => sum + result.score, 0) / evidence.length) : null };
  }).filter(row => row.targeted > 0).sort((a, b) => (a.average ?? Infinity) - (b.average ?? Infinity));

export const AssessmentClassComparison = ({ groups, students, targetIds, results }: { groups: Group[]; students: User[]; targetIds: string[]; results: QuizResult[] }) => {
  const rows = assessmentClassSummaries(groups, students, targetIds, results);
  if (!rows.length) return null;
  return <section className="rounded-2xl border border-gray-100 bg-white p-4">
    <h3 className="font-bold text-gray-900">مقارنة الفصول في الاختبارات المحددة</h3>
    <p className="my-2 text-xs text-gray-500">مرتبة بحسب متوسط أحدث المحاولات المحملة. عدم المشاركة لا يُحسب درجة صفر؛ راعِ نسبة المشاركة قبل الحكم على الفصل.</p>
    <div className="overflow-x-auto"><table className="w-full text-right text-sm"><thead><tr><th className="p-2">الفصل</th><th>شارك / مستهدف</th><th>متوسط الدرجة</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.id} className="border-t border-gray-100"><td className="p-2">{row.name}</td><td>{row.participants} / {row.targeted}</td><td>{row.average === null ? 'لم يختبر بعد' : `${row.average}%`}</td></tr>)}</tbody>
    </table></div>
  </section>;
};
