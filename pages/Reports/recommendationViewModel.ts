import type {
    CategorySection,
    CategorySubject,
    Lesson,
    LibraryItem,
    Question,
    Quiz,
    Skill,
    Topic,
} from '../../types';
import { matchesEntityId } from '../../utils/entityIds';
import { buildFoundationActionLink } from '../../utils/skillActionLinks';
import { displayText, type SkillRecommendation } from './reportDomain';

export interface SkillRecommendationCatalog {
    allSkills: Skill[];
    lessons: Lesson[];
    quizzes: Quiz[];
    libraryItems: LibraryItem[];
    questions: Question[];
    topics: Topic[];
    subjects: CategorySubject[];
    sections: CategorySection[];
}

export const buildSkillRecommendation = (
    skill: { skill?: string; skillId?: string } | undefined,
    catalog: SkillRecommendationCatalog,
): SkillRecommendation => {
    if (!skill) return {};

    const {
        allSkills,
        lessons,
        quizzes,
        libraryItems,
        questions,
        topics,
        subjects,
        sections,
    } = catalog;

    const resolvedSkill = skill.skillId
        ? allSkills.find((item) => item.id === skill.skillId || (item as any)._id === skill.skillId)
        : allSkills.find((item) => displayText(item.name) === displayText(skill.skill));

    if (!resolvedSkill) return {};

    const resolvedSkillId = resolvedSkill.id || (resolvedSkill as any)._id;
    const recommendationPathId = resolvedSkill.pathId;
    const recommendationSubjectId = resolvedSkill.subjectId;
    const recommendationSectionId = resolvedSkill.sectionId;

    // 1. Direct sub-topic lookup from foundation topics
    const directTopic = topics.find((topic) =>
        topic.showOnPlatform !== false &&
        (matchesEntityId(topic, `topic_sub_${resolvedSkillId}`) ||
         (topic.parentId && displayText(topic.title) === displayText(resolvedSkill.name) && (!recommendationSubjectId || topic.subjectId === recommendationSubjectId)) ||
         (topic.quizIds || []).some((qid) => matchesEntityId({ id: qid }, `quiz_drill_${resolvedSkillId}`)))
    );

    // 2. Direct drill quiz lookup
    const directDrill = quizzes.find((quiz) =>
        quiz.showOnPlatform !== false &&
        quiz.isPublished !== false &&
        (!quiz.approvalStatus || quiz.approvalStatus === 'approved') &&
        (matchesEntityId(quiz, `quiz_drill_${resolvedSkillId}`) ||
         quiz.skillIds?.includes(resolvedSkillId))
    );

    const recommendedLesson = lessons.find(
        (lesson) =>
            lesson.skillIds?.includes(resolvedSkillId) &&
            lesson.showOnPlatform !== false &&
            (!lesson.approvalStatus || lesson.approvalStatus === 'approved'),
    );
    const recommendedQuiz = directDrill || quizzes.find((quiz) =>
        quiz.showOnPlatform !== false &&
        quiz.isPublished !== false &&
        (!quiz.approvalStatus || quiz.approvalStatus === 'approved') &&
        (
            quiz.questionIds?.some((questionId) =>
                questions.find((question) => question.id === questionId)?.skillIds?.includes(resolvedSkillId),
            ) || quiz.skillIds?.includes(resolvedSkillId)
        ),
    );
    const recommendedResource = libraryItems.find(
        (item) =>
            item.skillIds?.includes(resolvedSkillId) &&
            item.showOnPlatform !== false &&
            (!item.approvalStatus || item.approvalStatus === 'approved'),
    );

    const scoredFoundationTopics = recommendationPathId && recommendationSubjectId
        ? topics
            .filter((topic) =>
                topic.pathId === recommendationPathId &&
                topic.subjectId === recommendationSubjectId &&
                topic.showOnPlatform !== false,
            )
            .map((topic) => {
                const topicHasLesson = recommendedLesson
                    ? (topic.lessonIds || []).some((lessonId) => matchesEntityId(recommendedLesson, lessonId))
                    : false;
                const topicHasQuiz = recommendedQuiz
                    ? (topic.quizIds || []).some((quizId) => matchesEntityId(recommendedQuiz, quizId))
                    : false;
                const topicMatchesSkill = matchesEntityId(topic, resolvedSkillId) || matchesEntityId(topic, `topic_sub_${resolvedSkillId}`);
                const topicMatchesSection = Boolean(recommendationSectionId && topic.sectionId === recommendationSectionId);
                const linkedContentScore =
                    (topicHasLesson ? 60 : 0) +
                    (topicHasQuiz ? 55 : 0) +
                    (topicMatchesSkill ? 80 : 0) +
                    (topicMatchesSection ? 35 : 0);

                return {
                    topic,
                    score: linkedContentScore + (topic.parentId ? 4 : 0),
                };
            })
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score)
        : [];

    const recommendedTopic = directTopic || scoredFoundationTopics[0]?.topic;
    const targetTopicId = recommendedTopic?.id || (resolvedSkillId ? `topic_sub_${resolvedSkillId}` : undefined);

    const actionContext = {
        pathId: recommendationPathId,
        subjectId: recommendationSubjectId,
        skillId: resolvedSkillId,
        topicId: targetTopicId,
        lessonId: recommendedLesson?.id,
        quizId: recommendedQuiz?.id,
    };
    const lessonLink = buildFoundationActionLink(actionContext, 'lessons');
    const foundationTrainingLink = buildFoundationActionLink(actionContext, 'quizzes');
    const foundationTopicLink = lessonLink;

    return {
        lessonTitle: displayText(recommendedLesson?.title),
        lessonLink,
        lessonTopicTitle: displayText(recommendedTopic?.title || resolvedSkill.name),
        foundationTopicLink,
        quizTitle: displayText(recommendedQuiz?.title || recommendedTopic?.title),
        quizLink: foundationTrainingLink || (recommendedQuiz?.id ? `/quiz/${recommendedQuiz.id}` : undefined),
        resourceTitle: displayText(recommendedResource?.title),
        resourceUrl: recommendedResource?.url,
        subjectName: recommendationSubjectId
            ? displayText(subjects.find((item) => item.id === recommendationSubjectId)?.name)
            : undefined,
        sectionName: recommendationSectionId
            ? displayText(sections.find((item) => item.id === recommendationSectionId)?.name)
            : undefined,
        actionText:
            recommendedLesson && recommendedQuiz
                ? 'ابدأ بالشرح أولًا ثم نفّذ اختبارًا قصيرًا لقياس التحسن.'
                : recommendedLesson
                    ? 'هذه المهارة تحتاج مراجعة شرحها قبل أي تدريب إضافي.'
                    : recommendedQuiz
                        ? 'هذه المهارة جاهزة لتدريب علاجي مباشر عبر الاختبار المقترح.'
                        : recommendedResource
                            ? 'راجع الملف الداعم ثم ارجع لتكرار التدريب على نفس المهارة.'
                            : 'أعد المحاولة عبر اختبار ساهر مخصص لهذه المهارة.',
    };
};
