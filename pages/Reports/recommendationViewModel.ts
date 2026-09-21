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
import {
    buildFoundationSkillLink,
    buildSkillRecheckLink,
    resolveFoundationSkillTopic,
} from '../../utils/foundationSkillNavigation';
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
    const target = {
        skillId: resolvedSkillId,
        pathId: resolvedSkill.pathId,
        subjectId: resolvedSkill.subjectId,
        sectionId: resolvedSkill.sectionId,
        skillName: resolvedSkill.name,
    };

    const recommendedTopic = resolveFoundationSkillTopic(target, topics);
    const recommendedLesson = lessons.find(
        (lesson) =>
            lesson.skillIds?.includes(resolvedSkillId) &&
            lesson.showOnPlatform !== false &&
            (!lesson.approvalStatus || lesson.approvalStatus === 'approved'),
    );
    const directDrill = quizzes.find((quiz) =>
        quiz.showOnPlatform !== false &&
        quiz.isPublished !== false &&
        (!quiz.approvalStatus || quiz.approvalStatus === 'approved') &&
        (
            matchesEntityId(quiz, `quiz_drill_${resolvedSkillId}`) ||
            quiz.skillIds?.includes(resolvedSkillId)
        ),
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

    const lessonLink = buildFoundationSkillLink({ target, topics, content: 'lessons' });
    const quizLink =
        buildFoundationSkillLink({ target, topics, content: 'quizzes' }) ||
        (recommendedQuiz?.id ? `/quiz/${recommendedQuiz.id}` : undefined);
    const supportLink = buildFoundationSkillLink({ target, topics, content: 'support' });
    const recheckLink = buildSkillRecheckLink(target);

    return {
        lessonTitle: displayText(recommendedLesson?.title),
        lessonLink,
        lessonVideoUrl: recommendedLesson?.videoUrl,
        lessonTopicTitle: displayText(recommendedTopic?.title || resolvedSkill.name),
        foundationTopicLink: lessonLink,
        quizTitle: displayText(recommendedQuiz?.title || recommendedTopic?.title),
        quizLink,
        supportLink,
        recheckLink,
        resourceTitle: displayText(recommendedResource?.title),
        resourceUrl: recommendedResource?.url,
        subjectName: resolvedSkill.subjectId
            ? displayText(subjects.find((item) => item.id === resolvedSkill.subjectId)?.name)
            : undefined,
        sectionName: resolvedSkill.sectionId
            ? displayText(sections.find((item) => item.id === resolvedSkill.sectionId)?.name)
            : undefined,
        actionText:
            recommendedLesson && recommendedQuiz
                ? 'ابدأ بالشرح، ثم التدريب، ثم أعد القياس على نفس المهارة.'
                : recommendedLesson
                    ? 'راجع الشرح ثم انتقل إلى القياس القصير على نفس المهارة.'
                    : recommendedQuiz
                        ? 'ابدأ بالتدريب العلاجي ثم أعد القياس.'
                        : recommendedResource
                            ? 'راجع الملف الداعم ثم ارجع للتدريب والقياس.'
                            : 'ابدأ من موضوع التأسيس ثم نفّذ قياسًا قصيرًا.',
    };
};
