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
        ? allSkills.find((item) => item.id === skill.skillId)
        : allSkills.find((item) => displayText(item.name) === displayText(skill.skill));

    if (!resolvedSkill) return {};

    const recommendedLesson = lessons.find(
        (lesson) =>
            lesson.skillIds?.includes(resolvedSkill.id) &&
            lesson.showOnPlatform !== false &&
            (!lesson.approvalStatus || lesson.approvalStatus === 'approved'),
    );
    const recommendedQuiz = quizzes.find((quiz) =>
        quiz.showOnPlatform !== false &&
        quiz.isPublished !== false &&
        (!quiz.approvalStatus || quiz.approvalStatus === 'approved') &&
        (
            quiz.questionIds?.some((questionId) =>
                questions.find((question) => question.id === questionId)?.skillIds?.includes(resolvedSkill.id),
            ) || quiz.skillIds?.includes(resolvedSkill.id)
        ),
    );
    const recommendedResource = libraryItems.find(
        (item) =>
            item.skillIds?.includes(resolvedSkill.id) &&
            item.showOnPlatform !== false &&
            (!item.approvalStatus || item.approvalStatus === 'approved'),
    );

    const recommendationPathId = resolvedSkill.pathId;
    const recommendationSubjectId = resolvedSkill.subjectId;
    const recommendationSectionId = resolvedSkill.sectionId;
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
                const topicMatchesSkill = matchesEntityId(topic, resolvedSkill.id);
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

    const recommendedTopic = scoredFoundationTopics[0]?.topic;
    const buildFoundationTopicLink = (content: 'lessons' | 'quizzes') =>
        recommendationPathId && recommendationSubjectId
            ? (() => {
                const params = new URLSearchParams({ subject: recommendationSubjectId });
                params.set('tab', 'skills');

                if (recommendedTopic?.id) {
                    params.set('topic', recommendedTopic.id);
                    params.set('content', content);
                }

                return `/category/${recommendationPathId}?${params.toString()}`;
            })()
            : undefined;

    const lessonLink = buildFoundationTopicLink('lessons');
    const foundationTrainingLink = recommendedTopic
        ? buildFoundationTopicLink('quizzes')
        : undefined;
    const foundationTopicLink = recommendedTopic
        ? buildFoundationTopicLink('lessons')
        : undefined;

    return {
        lessonTitle: displayText(recommendedLesson?.title),
        lessonLink,
        lessonTopicTitle: displayText(recommendedTopic?.title),
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
