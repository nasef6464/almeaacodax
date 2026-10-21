import { UserModel } from '../../../models/User.js';
import { QuizResultModel } from '../../../models/QuizResult.js';
import { schoolAssessmentAudienceStages } from './schoolAssessmentAudienceEvidence.js';
import { LEARNING_EVIDENCE_POLICY } from '../application/learningEvidencePolicy.js';
/** Bounded memory and one evidence aggregation per250 identities; classify before paging. */
export async function readLearningEvidencePopulation(authority: Record<string, unknown>, sourceScope: Record<string, unknown>, skillFilter: Record<string, unknown>, cutoff: Date, query: {
    page: number;
    limit: number;
    status?: string;
}) {
    const deadline = Date.now() + 20000;
    const remaining = () => {
        const ms = deadline - Date.now();
        if (ms <= 0)
            throw Error('operation exceeded time limit');
        return ms;
    };
    const summary = { unmeasured: 0, insufficient: 0, support: 0, developing: 0, ready: 0 };
    const students: any[] = [];
    let filteredTotal = 0;
    const skillStatus = { $switch: { branches: [{ case: { $gt: ['$incomplete', 0] }, then: 'insufficient' }, { case: { $lt: ['$questions', LEARNING_EVIDENCE_POLICY.minimumAnswers] }, then: 'insufficient' }, { case: { $lt: [{ $divide: ['$correct', { $max: ['$questions', 1] }] }, LEARNING_EVIDENCE_POLICY.supportBelow / 100] }, then: 'support' }, { case: { $gte: [{ $divide: ['$correct', { $max: ['$questions', 1] }] }, LEARNING_EVIDENCE_POLICY.readyFrom / 100] }, then: 'ready' }], default: 'developing' } };
    async function consume(roster: any[]) {
        const pageStart = (query.page - 1) * query.limit;
        const slots = query.limit - students.length;
        const identities = roster.map(row => String(row._id));
        const detailMatch = slots <= 0 || query.status === 'unmeasured' ? { _id: { $in: [] } } : query.status ? { status: query.status } : { _id: { $in: identities.slice(Math.max(0, pageStart - filteredTotal), Math.max(0, pageStart - filteredTotal) + slots) } };
        const detailStages: any[] = [{ $match: detailMatch },
            ...(query.status && query.status !== 'unmeasured' && slots > 0 ? [{ $set: { position: { $indexOfArray: [identities, '$_id'] } } }, { $sort: { position: 1 } }, { $skip: Math.max(0, pageStart - filteredTotal) }, { $limit: slots }] : []),
            { $project: { skills: { $slice: ['$skills', 24] } } }];
        const [data] = await QuizResultModel.aggregate([
            { $match: { ...sourceScope, userId: { $in: roster.map(row => String(row._id)) } } },
            { $set: { evidenceDate: { $convert: { input: '$date', to: 'date', onError: '$createdAt', onNull: '$createdAt' } } } }, { $match: { evidenceDate: { $gte: cutoff } } },
            { $sort: { evidenceDate: -1, createdAt: -1, _id: -1 } },
            { $group: { _id: { user: '$userId', quiz: '$quizId' }, quizId: { $first: '$quizId' }, skillsAnalysis: { $first: '$skillsAnalysis' }, evidenceDate: { $first: '$evidenceDate' } } },
            { $unwind: '$skillsAnalysis' }, { $match: skillFilter },
            { $group: { _id: { user: '$_id.user', quiz: '$quizId', skill: '$skillsAnalysis.skillId', level: '$skillsAnalysis.level', path: '$skillsAnalysis.pathId' }, evidence: { $first: '$skillsAnalysis' }, latestAt: { $first: '$evidenceDate' } } },
            { $set: { validCounts: { $and: [{ $isNumber: '$evidence.questionCount' }, { $isNumber: '$evidence.correctCount' }, { $gt: ['$evidence.questionCount', 0] }, { $gte: ['$evidence.correctCount', 0] }, { $lte: ['$evidence.correctCount', '$evidence.questionCount'] }] } } },
            { $group: { _id: { user: '$_id.user', skill: '$_id.skill', level: '$_id.level', path: '$_id.path' }, name: { $first: '$evidence.skill' }, questions: { $sum: { $cond: ['$validCounts', '$evidence.questionCount', 0] } }, correct: { $sum: { $cond: ['$validCounts', '$evidence.correctCount', 0] } }, incomplete: { $max: { $cond: ['$validCounts', 0, 1] } }, tests: { $sum: 1 }, latestAt: { $max: '$latestAt' } } },
            { $set: { status: skillStatus, accuracy: { $cond: [{ $and: [{ $gt: ['$questions', 0] }, { $eq: ['$incomplete', 0] }] }, { $round: [{ $multiply: [{ $divide: ['$correct', '$questions'] }, 100] }, 1] }, null] } } },
            { $project: { _id: 0, learnerId: '$_id.user', id: '$_id.skill', pathId: '$_id.path', level: '$_id.level', name: 1, questions: 1, correct: 1, tests: 1, latestAt: 1, status: 1, accuracy: 1 } }, { $sort: { accuracy: 1, id: 1 } },
            { $group: { _id: '$learnerId', skills: { $push: { id: '$id', pathId: '$pathId', level: '$level', name: '$name', questions: '$questions', correct: '$correct', tests: '$tests', latestAt: '$latestAt', status: '$status', accuracy: '$accuracy' } } } },
            { $set: { status: { $switch: { branches: [{ case: { $in: ['support', '$skills.status'] }, then: 'support' }, { case: { $in: ['insufficient', '$skills.status'] }, then: 'insufficient' }, { case: { $in: ['developing', '$skills.status'] }, then: 'developing' }], default: 'ready' } } } },
            { $facet: { statuses: [{ $project: { status: 1, skillCount: { $size: '$skills' } } }], details: detailStages } },
        ]).allowDiskUse(true).option({ maxTimeMS: remaining() });
        const byId = new Map<string, any>(data.statuses.map((row: any) => [String(row._id), row]));
        const details = new Map<string, any[]>(data.details.map((row: any) => [String(row._id), row.skills]));
        for (const learner of roster) {
            const measured = byId.get(String(learner._id));
            const status = (measured?.status || 'unmeasured') as keyof typeof summary;
            summary[status]++;
            if (query.status && status !== query.status)
                continue;
            const position = filteredTotal++;
            if (position < (query.page - 1) * query.limit || students.length >= query.limit)
                continue;
            students.push({ id: String(learner._id), name: learner.name, status, skillCount: measured?.skillCount || 0, skills: details.get(String(learner._id)) || [] });
        }
    }
    const cursor = UserModel.aggregate([...schoolAssessmentAudienceStages(authority, true), { $sort: { name: 1, _id: 1 } }]).allowDiskUse(true).option({ maxTimeMS: remaining() }).cursor({ batchSize: 250 });
    let batch: any[] = [];
    try {
        for await (const learner of cursor) {
            batch.push(learner);
            if (batch.length === 250) {
                await consume(batch);
                batch = [];
            }
        }
        if (batch.length)
            await consume(batch);
        remaining();
    }
    finally {
        await cursor.close();
    }
    return { summary, students, filteredTotal };
}
