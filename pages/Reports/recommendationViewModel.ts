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
import { resolveFoundationSkillTarget } from '../../utils/foundationSkillTarget';
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
    skill: { skill?: string; skillId?: string; pathId?: string; subjectId?: string; sectionId?: string } | undefined,
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

    const target = resolveFoundationSkillTarget({
        skillId: skill.skillId,
        skillName: skill.skill,
        pathId: skill.pathId,
        subjectId: skill.subjectId,
        sectionId: skill.sectionId,
    }, allSkills, topics);

    const resolvedSkillId = target.skillId;
    if (!resolvedSkillId) return {};

    const recommendationPathId = target.pathId;
    const recommendationSubjectId = target.subjectId;
    const recommendationSectionId = target.sectionId;
    const directMappedTopic = target.topicId
        ? topics.find((topic) => matchesEntityId(topic, target.topicId!))
        : undefined;

    const scoredFoundationTopics = recommendationPathId && recommendationSubjectId
        ? topics
            .filter((topic) =>
                topic.pathId === recommendationPathId &&
                topic.subjectId === recommendationSubjectId &&
                topic.showOnPlatform !== false &&
                (target.kind !== 'sub' || Boolean(topic.parentId)),
            )
            .map((topic) => {
                const explicitSkillScore = topic.skillId === resolvedSkillId ? 120 : 0;
                const legacyIdScore = matchesEntityId(topic, `topic_sub_${resolvedSkillId}`) ? 90 : 0;
                const titleScore = displayText(topic.title) === displayText(target.skillName) ? 70 : 0;
                const sectionScore = recommendationSectionId && topic.sectionId === recommendationSectionId ? 30 : 0;
                return {
                    topic,
                    score: explicitSkillScore + legacyIdScore + titleScore + sectionScore,
                };
            })
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score)
        : [];

    const recommendedTopic = directMappedTopic || scoredFoundationTopics[0]?.topic;

    const approvedQuiz = (quiz: Quiz) =>
        quiz.showOnPlatform !== false &&
        quiz.isPublished !== false &&
        (!quiz.approvalStatus || quiz.approvalStatus === 'approved');

    const topicQuizIds = recommendedTopic?.quizIds || [];
    const directDrill = quizzes.find((quiz) =>
        approvedQuiz(quiz) &&
        (
            topicQuizIds.some((quizId) => matchesEntityId(quiz, quizId)) ||
            (quiz.learningPlacements || []).some((placement) =>
                placement.slot === 'foundation' &&
                Boolean(recommendedTopic) &&
                matchesEntityId(recommendedTopic!, placement.topicId)
            ) ||
            matchesEntityId(quiz, `quiz_drill_${resolvedSkillId}`) ||
            (target.kind !== 'sub' && quiz.skillIds?.includes(resolvedSkillId))
        )
    );

    const recommendedLesson = lessons.find(
        (lesson) =>
            (
                recommendedTopic?.lessonIds?.some((lessonId) => matchesEntityId(lesson, lessonId)) ||
                lesson.skillIds?.includes(resolvedSkillId)
            ) &&
            lesson.showOnPlatform !== false &&
            (!lesson.approvalStatus || lesson.approvalStatus === 'approved'),
    );

    const recommendedQuiz = directDrill || quizzes.find((quiz) =>
        approvedQuiz(quiz) &&
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

    const actionContext = {
        pathId: recommendationPathId,
        subjectId: recommendationSubjectId,
        skillId: resolvedSkillId,
        topicId: recommendedTopic?.id,
    };

    // For a subskill, both explanation and practice stay inside its exact foundation topic.
    // Explanation deliberately opens the topic (not one lesson) because a topic can contain multiple videos.
    const lessonLink = buildFoundationActionLink(actionContext, 'lessons');
    const foundationTrainingLink = buildFoundationActionLink(actionContext, 'quizzes');

    const mainSkillTrainingLink = target.kind === 'main' && recommendedQuiz?.id
        ? `/quiz/${encodeURIComponent(String(recommendedQuiz.id))}?source=training`
        : undefined;

    return {
        lessonTitle: displayText(recommendedLesson?.title),
        lessonLink: recommendedTopic ? lessonLink : undefined,
        lessonTopicTitle: displayText(recommendedTopic?.title || target.skillName),
        foundationTopicLink: recommendedTopic ? lessonLink : undefined,
        quizTitle: displayText(recommendedQuiz?.title || recommendedTopic?.title),
        quizLink: recommendedTopic && target.kind === 'sub' ? foundationTrainingLink : mainSkillTrainingLink,
        resourceTitle: displayText(recommendedResource?.title),
        resourceUrl: recommendedResource?.url,
        subjectName: recommendationSubjectId
            ? displayText(subjects.find((item) => item.id === recommendationSubjectId)?.name)
            : undefined,
        sectionName: recommendationSectionId
            ? displayText(sections.find((item) => item.id === recommendationSectionId)?.name)
            : undefined,
        actionText:
            recommendedTopic && target.kind === 'sub'
                ? 'افتح موضوع التأسيس المرتبط بالمهارة، راجع الشروح الموجودة داخله، ثم انتقل إلى تدريب المهارة الفرعية الجاهز.'
                : recommendedQuiz
                    ? 'ابدأ بالتدريب الجاهز المرتبط بهذه المهارة ثم أعد القياس.'
                    : recommendedResource
                        ? 'راجع الملف الداعم ثم ارجع للتدريب المرتبط بنفس المهارة.'
                        : 'راجع موضوع التأسيس المرتبط بالمهارة ثم أعد القياس.',
    };
};
