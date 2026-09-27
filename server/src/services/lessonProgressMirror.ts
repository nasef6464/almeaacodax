import { LessonProgressModel } from "../models/LessonProgress.js";

type InteractiveVideoProgress = {
  courseId: string;
  lessonId: string;
  positionSeconds: number;
  answeredQuestionIds: string[];
  updatedAt: number;
};

type LessonProgressMirrorInput = {
  userId: string;
  completedLessons?: string[];
  interactiveVideoProgress?: InteractiveVideoProgress[];
};

export const mirrorLessonProgress = async ({
  userId,
  completedLessons,
  interactiveVideoProgress,
}: LessonProgressMirrorInput) => {
  const completedSet = completedLessons
    ? new Set(completedLessons.map(String).filter(Boolean))
    : null;

  if (completedSet) {
    await LessonProgressModel.updateMany(
      {
        userId,
        completed: true,
        ...(completedSet.size ? { lessonId: { $nin: Array.from(completedSet) } } : {}),
      },
      { $set: { completed: false }, $unset: { completedAt: 1 } },
    );
  }

  const byLesson = new Map<string, InteractiveVideoProgress>();
  for (const item of interactiveVideoProgress || []) {
    const lessonId = String(item.lessonId || "").trim();
    if (!lessonId) continue;
    const previous = byLesson.get(lessonId);
    if (!previous || item.updatedAt >= previous.updatedAt) {
      byLesson.set(lessonId, {
        ...item,
        lessonId,
        answeredQuestionIds: Array.from(new Set((item.answeredQuestionIds || []).map(String))),
      });
    }
  }

  const lessonIds = new Set<string>([
    ...(completedSet ? Array.from(completedSet) : []),
    ...Array.from(byLesson.keys()),
  ]);
  if (!lessonIds.size) return;

  const now = new Date();
  const operations = Array.from(lessonIds).map((lessonId) => {
    const video = byLesson.get(lessonId);
    const completed = completedSet?.has(lessonId);
    const set: Record<string, unknown> = {};
    const setOnInsert: Record<string, unknown> = { userId, lessonId };

    if (completedSet) {
      set.completed = Boolean(completed);
      if (completed) set.completedAt = now;
    }
    if (video) {
      set.courseId = String(video.courseId || "");
      set.positionSeconds = Math.max(0, Number(video.positionSeconds || 0));
      set.answeredQuestionIds = video.answeredQuestionIds;
      set.sourceUpdatedAt = Number(video.updatedAt || 0);
    }

    const update: Record<string, unknown> = { $set: set, $setOnInsert: setOnInsert };
    if (completedSet && !completed) update.$unset = { completedAt: 1 };

    return { updateOne: { filter: { userId, lessonId }, update, upsert: true } };
  });

  await LessonProgressModel.bulkWrite(operations, { ordered: false });
};
