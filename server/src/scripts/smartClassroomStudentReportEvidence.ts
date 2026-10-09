import assert from "node:assert/strict";

type AuditRequest = (endpoint: string, options?: { method?: string; token?: string; body?: unknown }) => Promise<{ status: number; body: any }>;
type ClassroomEvidenceContext = { sessionId: string; teacherToken: string; studentToken: string; studentCount: number };

export async function verifyActivitySubmission(request: AuditRequest, input: ClassroomEvidenceContext & { studentId: string; q2: string; q3: string }) {
  const { sessionId, teacherToken, studentToken, studentCount, studentId, q2, q3 } = input;
  const finalizedAnswers = await request(`/classroom/sessions/${sessionId}/submit`, {
    method: "POST", token: studentToken,
    body: { answers: [{ questionId: q2, selectedOptionIndex: 2 }, { questionId: q3, selectedOptionIndex: 0 }] },
  });
  assert.equal(finalizedAnswers.status, 200, JSON.stringify(finalizedAnswers.body));
  const liveSubmission = await request(`/classroom/sessions/${sessionId}/aggregate?view=live`, { token: teacherToken });
  assert.equal(liveSubmission.status, 200);
  assert.equal(liveSubmission.body.submissionSummary.submittedCount, 1);
  assert.equal(liveSubmission.body.submissionSummary.joinedCount, studentCount);
  assert.equal(liveSubmission.body.submissionSummary.submitted[0].studentId, studentId);
  assert.equal((await request(`/classroom/sessions/${sessionId}/aggregate?view=live`, { token: studentToken })).status, 403);

}

export async function verifySavedStudentEvidence(request: AuditRequest, input: ClassroomEvidenceContext & { schoolId: string; report: any }) {
  const { sessionId, teacherToken, studentToken, studentCount, schoolId, report } = input;
  assert.equal(report.students.length, studentCount);
  assert.ok(report.students.every((student: any) => student.publishedQuestions === 3 && Array.isArray(student.skills)), "Earlier ended batches must remain in the student report");
  assert.equal(report.studentEvidenceComplete, true);
  const savedReport = await request(`/classroom/sessions/${sessionId}/aggregate?view=report`, { token: teacherToken });
  assert.equal(savedReport.status, 200);
  assert.deepEqual(savedReport.body.report, report);
  assert.equal((await request(`/classroom/sessions/${sessionId}/aggregate?view=report`, { token: studentToken })).status, 403);
  const compactHistory = await request(`/classroom/teacher/history?schoolId=${schoolId}&view=summary`, { token: teacherToken });
  assert.equal(compactHistory.status, 200);
  assert.ok(compactHistory.body.sessions.every((report: any) => report.students === undefined));
}
