import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
const rootRequire = createRequire(new URL('../package.json', import.meta.url));
const serverRequire = createRequire(new URL('../server/package.json', import.meta.url));
export const mongoose = serverRequire('mongoose');
export function validateScaleMongoService(provided?: string) { if (!provided)
    return; const u = new URL(provided); if (u.protocol !== 'mongodb:' || u.hostname !== '127.0.0.1' || u.username || u.password)
    throw Error('Only disposable loopback Mongo service allowed'); }
export async function schoolScaleFixture() {
    const { MongoMemoryReplSet } = rootRequire('mongodb-memory-server-core');
    const dbName = 'school_scale_' + randomUUID().replaceAll('-', '');
    const provided = process.env.ASSESSMENT_TEST_MONGODB_URI;
    let repl: any, uri: string;
    validateScaleMongoService(provided);
    if (provided) {
        const u = new URL(provided);
        u.pathname = '/' + dbName;
        uri = u.toString();
    }
    else {
        repl = await MongoMemoryReplSet.create({ binary: { version: '7.0.14', downloadDir: 'scratch/live-mongo-binaries' }, replSet: { count: 1 }, instanceOpts: [{ args: ['--wiredTigerCacheSizeGB', '0.25', '--setParameter', 'diagnosticDataCollectionEnabled=false'], launchTimeout: 90000 }] });
        uri = repl.getUri(dbName);
    }
    try {
        if (!/^mongodb:\/\/127\.0\.0\.1:\d+\/school_scale_/.test(uri))
            throw Error('Disposable loopback database required');
        Object.assign(process.env, { NODE_ENV: 'test', MONGODB_URI: uri, JWT_SECRET: randomUUID() + randomUUID(), AI_PROVIDER: 'none', SENTRY_DSN: '', REDIS_URL: '', NOTIFICATION_QUEUE_ENABLED: 'false', NOTIFICATION_REALTIME_REDIS_ENABLED: 'false', RATE_LIMIT_REDIS_ENABLED: 'false', RATE_LIMIT_GLOBAL_LIMIT: '600', RATE_LIMIT_SHARED_SOURCE_LIMIT: '5000', RATE_LIMIT_SENSITIVE_LIMIT: '60', RATE_LIMIT_SENSITIVE_SOURCE_LIMIT: '600', GOOGLE_OAUTH_ENABLED: 'false', R2_UPLOAD_ENABLED: 'false', DEV_LOCAL_ADMIN_BYPASS: 'false', ALLOW_VERBAL26_APPLY: 'false' });
        await mongoose.connect(uri, { maxPoolSize: 10 });
        const [{ UserModel }, { GroupModel }, { QuizModel }, { QuizResultModel }, { PathModel }, { SubjectModel }, { SectionModel }, { SkillModel }, { QuestionModel }, { SchoolMembershipModel }, { SchoolContractModel }, { TeachingAssignmentModel }] = await Promise.all([
            import('../server/src/models/User.js'), import('../server/src/models/Group.js'), import('../server/src/models/Quiz.js'), import('../server/src/models/QuizResult.js'), import('../server/src/models/Path.js'), import('../server/src/models/Subject.js'), import('../server/src/models/Section.js'), import('../server/src/models/Skill.js'), import('../server/src/models/Question.js'), import('../server/src/models/SchoolMembership.js'), import('../server/src/models/SchoolContract.js'), import('../server/src/models/TeachingAssignment.js')
        ]);
        const { SchoolSkillEvidenceModel } = await import('../server/src/models/SchoolSkillEvidence.js');
        const { SchoolSkillAggregateModel } = await import('../server/src/models/SchoolSkillAggregate.js');
        const { SkillProgressModel } = await import('../server/src/models/SkillProgress.js');
        const { ReviewCardModel } = await import('../server/src/models/ReviewCard.js');
        await Promise.all([SchoolSkillEvidenceModel, SchoolSkillAggregateModel, SkillProgressModel, ReviewCardModel, UserModel, GroupModel, QuizModel, QuizResultModel, QuestionModel, SchoolMembershipModel, SchoolContractModel, TeachingAssignmentModel].map(m => m.init()));
        await PathModel.create({ _id: 'scale-path', name: 'Isolated scale path', isActive: true });
        for (const subject of ['math', 'science']) {
            await SubjectModel.create({ _id: 'scale-' + subject, pathId: 'scale-path', name: subject });
            await SectionModel.create({ _id: 'scale-' + subject + '-section', subjectId: 'scale-' + subject, name: subject });
            for (let i = 0; i < 2; i++)
                await SkillModel.create({ _id: `scale-${subject}-${i}`, name: `${subject} skill${i}`, pathId: 'scale-path', subjectId: 'scale-' + subject, sectionId: 'scale-' + subject + '-section' });
        }
        const questionIds = Array.from({ length: 20 }, (_, i) => 'scale-q' + i);
        await QuestionModel.create(questionIds.map((id, i) => { const subject = i < 10 ? 'math' : 'science'; return { id, pathId: 'scale-path', subjectId: 'scale-' + subject, subject: 'scale-' + subject, sectionId: 'scale-' + subject + '-section', skillIds: [`scale-${subject}-${Math.floor(i % 10 / 5)}`], text: '1 + 1 = ?', options: ['2', '3'], correctOptionIndex: 0, approvalStatus: 'approved' }; }));
        const schools: any[] = [];
        async function addSchool(size: number) {
            const n = schools.length;
            const school = await GroupModel.create({ name: 'Scale school ' + n, type: 'SCHOOL', ownerId: 'fixture-admin' });
            const schoolId = String(school._id);
            const ids = Array.from({ length: size }, () => new mongoose.Types.ObjectId());
            const classes = await GroupModel.create(Array.from({ length: Math.ceil(size / 25) }, (_, i) => ({ name: `Class${i}`, type: 'CLASS', parentId: schoolId, ownerId: 'fixture-admin', studentIds: ids.slice(i * 25, i * 25 + 25).map(String) })));
            const staff = await UserModel.create(['supervisor', 'teacher', 'school_admin'].map(role => ({ name: role + n, email: `${role}${n}@school-scale.invalid`, role, passwordHash: 'isolated-only', isActive: true, schoolId, groupIds: role === 'teacher' ? [String(classes[0]._id)] : [] })));
            const [supervisor, teacher, director] = staff;
            await SchoolMembershipModel.create(staff.map(s => ({ userId: String(s._id), schoolId, role: s.role, status: 'active', permissions: s.role === 'school_admin' ? ['SCHOOL_ASSESSMENTS_MANAGE', 'SCHOOL_REPORTS_AGGREGATE_VIEW', 'SCHOOL_REPORTS_DETAILED_VIEW'] : [] })));
            await SchoolContractModel.create({ schoolId, modules: ['SCHOOL_CORE', 'SCHOOL_ASSESSMENTS', 'SCHOOL_INTELLIGENCE'] });
            await TeachingAssignmentModel.create(['math', 'science'].map(subject => ({ schoolId, teacherId: String(teacher._id), classId: String(classes[0]._id), subjectId: 'scale-' + subject, status: 'active' })));
            const quizzes = await QuizModel.create(Array.from({ length: 5 }, (_, j) => ({ _id: `scale-quiz-${n}-${j}`, id: `scale-quiz-${n}-${j}`, title: `Scale mock ${n}-${j}`, pathId: 'scale-path', subjectId: 'scale-math', mode: 'central', quizKind: 'mock', targetGroupIds: [schoolId], ownerId: String(supervisor._id), createdBy: String(supervisor._id), isPublished: true, showOnPlatform: false, questionIds: [], mockExam: { enabled: true, sections: ['math', 'science'].map((subject, k) => ({ id: subject, title: subject, subjectId: 'scale-' + subject, questionIds: questionIds.slice(k * 10, k * 10 + 10), durationMinutes: 10 })) }, access: { type: 'free' }, settings: { maxAttempts: 1, passingScore: 60 } })));
            for (let start = 0; start < size; start += 250) {
                const slice = ids.slice(start, start + 250);
                await UserModel.collection.insertMany(slice.map((_id: any, j: number) => ({ _id, name: 'Student ' + String(start + j).padStart(5, '0'), email: `student-${n}-${start + j}@school-scale.invalid`, role: 'student', passwordHash: 'isolated-only', isActive: true, schoolId, groupIds: [String(classes[Math.floor((start + j) / 25)]._id)] })));
                const records: any[] = [], evidence: any[] = [], aggregates = new Map<string, any>(), progress = new Map<string, any>(), cards: any[] = [];
                for (let j = 0; j < slice.length; j++)
                    for (const q of quizzes)
                        for (let attempt = 1; attempt <= 2; attempt++) {
                            const correctPerSkill = attempt === 1 ? 5 : [0, 2, 3, 4, 5][(start + j) % 5], score = correctPerSkill * 20, date = new Date(Date.now() - (attempt === 1 ? 86400000 : 60000));
                            const skillsAnalysis = ['math', 'science'].flatMap(subject => [0, 1].map(k => ({ skillId: `scale-${subject}-${k}`, skill: `${subject} skill${k}`, pathId: 'scale-path', subjectId: 'scale-' + subject, sectionId: 'scale-' + subject + '-section', mastery: score, status: score >= 80 ? 'strong' : score >= 60 ? 'average' : 'weak', questionCount: 5, correctCount: correctPerSkill, level: 'main' })));
                            const resultId = new mongoose.Types.ObjectId();
                            for (const skill of skillsAnalysis) {
                                const scope = { schoolId, classId: '', userId: String(slice[j]), pathId: skill.pathId, subjectId: skill.subjectId, skillId: skill.skillId };
                                evidence.push({ ...scope, resultId: String(resultId), evidenceKey: [resultId, skill.pathId, skill.subjectId, skill.skillId].join('::'), skill: skill.skill, sectionId: skill.sectionId, questionCount: 5, correctCount: correctPerSkill, source: 'school', occurredAt: date, createdAt: date, updatedAt: date });
                                const key = scope.userId + '::' + skill.skillId, aggregate = aggregates.get(key) || { ...scope, skill: skill.skill, sectionId: skill.sectionId, totalEvidence: 0, totalCorrect: 0, attemptCount: 0, confidence: 100, level: 'main', trend: 'stable' };
                                aggregate.totalEvidence += 5;
                                aggregate.totalCorrect += correctPerSkill;
                                aggregate.attemptCount++;
                                aggregate.mastery = Math.round(100 * aggregate.totalCorrect / aggregate.totalEvidence);
                                aggregate.recentMastery = score;
                                aggregate.lastEvidenceAt = date;
                                aggregates.set(key, aggregate);
                                progress.set(key, { userId: scope.userId, skillId: skill.skillId, pathId: skill.pathId, subjectId: skill.subjectId, sectionId: skill.sectionId, skill: skill.skill, level: 'main', mastery: score, status: score >= 80 ? 'mastered' : score >= 60 ? 'average' : 'weak', attempts: 10, evidenceCount: 50, lastQuizId: String(q.id), lastAttemptAt: date, recentEvidence: [], recentEvidenceKeys: [] });
                            }
                            records.push({ _id: resultId, userId: String(slice[j]), quizId: String(q.id), quizTitle: q.title, schoolId, classId: '', learningContext: 'school_assessment', score, passed: score >= 60, attemptNumber: attempt, totalQuestions: 20, correctAnswers: correctPerSkill * 4, wrongAnswers: 20 - correctPerSkill * 4, unanswered: 0, date, createdAt: date, updatedAt: date, skillsAnalysis, subjectResults: ['math', 'science'].map(subject => ({ subjectId: 'scale-' + subject, subjectName: subject, total: 10, correct: correctPerSkill * 2, wrong: 10 - correctPerSkill * 2, unanswered: 0, score })), sectionResults: ['math', 'science'].map(subject => ({ sectionId: subject, sectionName: subject, subjectId: 'scale-' + subject, total: 10, correct: correctPerSkill * 2, wrong: 10 - correctPerSkill * 2, unanswered: 0, score })), questionReview: questionIds.map((id, k) => ({ questionId: id, questionText: 'frozen fixture ' + '.'.repeat(100), options: ['2', '3'], correctOptionIndex: 0, selectedOptionIndex: k % 5 < correctPerSkill ? 0 : 1, isCorrect: k % 5 < correctPerSkill })) });
                        }
                await QuizResultModel.collection.insertMany(records);
                await SchoolSkillEvidenceModel.collection.insertMany(evidence);
                await SchoolSkillAggregateModel.collection.insertMany([...aggregates.values()]);
                await SkillProgressModel.collection.insertMany([...progress.values()]);
                for (const id of slice)
                    for (let k = 0; k < 20; k++)
                        cards.push({ userId: String(id), questionId: questionIds[k], skillId: `scale-${k < 10 ? 'math' : 'science'}-${Math.floor(k % 10 / 5)}`, skillIds: [`scale-${k < 10 ? 'math' : 'science'}-${Math.floor(k % 10 / 5)}`], pathId: 'scale-path', subjectId: 'scale-' + (k < 10 ? 'math' : 'science'), reviewType: 'mastery_review', hasMistake: false, nextReviewDate: new Date(), easeFactor: 2.5, interval: 1, repetitions: 1 });
                await ReviewCardModel.collection.insertMany(cards);
            }
            const result = { schoolId, size, classes: classes.map(c => String(c._id)), ids: ids.map(String), supervisor, teacher, director, quizId: String(quizzes[0].id) };
            schools.push(result);
            return result;
        }
        await QuizModel.create({ _id: 'scale-live', id: 'scale-live', title: 'Concurrent submission fixture', pathId: 'scale-path', subjectId: 'scale-math', questionIds: questionIds.slice(0, 10), mode: 'central', quizKind: 'test', ownerId: 'fixture-admin', isPublished: false, showOnPlatform: false, settings: { maxAttempts: 1, randomizeQuestions: false, passingScore: 60 }, access: { type: 'free' } });
        const cleanup = async () => { if (mongoose.connection.db?.databaseName !== dbName)
            throw Error('Owned database identity changed; refuse cleanup'); await mongoose.connection.dropDatabase(); await mongoose.disconnect(); if (repl)
            await repl.stop({ doCleanup: true }); };
        return { uri, schools, addSchool, mongoCacheGB: repl ? 0.25 : null, models: { UserModel, GroupModel, QuizModel, QuizResultModel, SchoolSkillEvidenceModel, SchoolSkillAggregateModel, SkillProgressModel, ReviewCardModel }, async enableLive() { await QuizModel.updateOne({ _id: 'scale-live' }, { $set: { isPublished: true, approvalStatus: 'approved', targetGroupIds: [schools[0].schoolId], ownerId: String(schools[0].supervisor._id), createdBy: String(schools[0].supervisor._id) } }); }, close: cleanup };
    }
    catch (error) {
        if (mongoose.connection.db?.databaseName === dbName)
            await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
        if (repl)
            await repl.stop({ doCleanup: true });
        throw error;
    }
}
