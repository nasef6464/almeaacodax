import { UserModel } from '../../../models/User.js';
import { QuizResultModel } from '../../../models/QuizResult.js';
import { schoolAssessmentAudienceStages, schoolAssessmentResultEvidenceStages } from './schoolAssessmentAudienceEvidence.js';
export async function readSchoolAssessmentFilteredLearners(targetPredicate: Record<string, unknown>, quizId: string, query: {
    page: number;
    limit: number;
    status: string;
    search: string;
}) {
    const stages = schoolAssessmentAudienceStages(targetPredicate, true);
    if (query.search) {
        const literal = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        stages.push({ $match: { $or: [{ name: { $regex: literal, $options: 'i' } }, { _id: { $regex: literal, $options: 'i' } }] } });
    }
    const cursor = UserModel.aggregate([...stages, { $sort: { name: 1, _id: 1 } }]).allowDiskUse(true).cursor({ batchSize: 250 });
    let total = 0;
    const learners: any[] = [];
    async function consume(roster: any[]) {
        const identities = roster.map(row => String(row._id));
        const base = schoolAssessmentResultEvidenceStages(quizId, identities, query.status === 'not_completed' ? {} : { id: 1, score: 1, passed: 1, date: 1, attemptNumber: 1 });
        if (query.status === 'not_completed') {
            const [known] = await QuizResultModel.aggregate([...base, { $group: { _id: null, ids: { $push: '$_id' } } }]).allowDiskUse(true);
            const completed = new Set(known?.ids || []);
            for (const student of roster) {
                if (completed.has(String(student._id)))
                    continue;
                const position = total++;
                if (position < (query.page - 1) * query.limit || learners.length >= query.limit)
                    continue;
                learners.push({ studentId: String(student._id), name: student.name ?? student._id, result: null });
            }
            return;
        }
        const slots = query.limit - learners.length;
        const selected: any[] = slots > 0 ? [{ $set: { position: { $indexOfArray: [identities, '$_id'] } } }, { $sort: { position: 1 } }, { $skip: Math.max(0, (query.page - 1) * query.limit - total) }, { $limit: slots }] : [{ $match: { _id: { $in: [] } } }];
        const [data] = await QuizResultModel.aggregate([...base, ...(query.status === 'needs_support' ? [{ $match: { 'evidence.passed': false } }] : []), { $facet: { count: [{ $count: 'total' }], learners: selected } }]).allowDiskUse(true);
        total += data.count[0]?.total || 0;
        const names = new Map(roster.map(row => [String(row._id), row.name ?? row._id]));
        for (const row of data.learners) {
            const result = row.evidence;
            learners.push({ studentId: String(row._id), name: names.get(String(row._id)), result: { id: String(result.id ?? result._id), score: result.score, passed: result.passed, date: result.date, attemptNumber: result.attemptNumber } });
        }
    }
    let batch: any[] = [];
    try {
        for await (const student of cursor) {
            batch.push(student);
            if (batch.length === 250) {
                await consume(batch);
                batch = [];
            }
        }
        if (batch.length)
            await consume(batch);
    }
    finally {
        await cursor.close();
    }
    return { learners, pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
}
