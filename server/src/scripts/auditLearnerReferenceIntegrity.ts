import mongoose from "mongoose";
import { connectToDatabase } from "../config/db.js";
import { QuestionModel } from "../models/Question.js";
import { QuizModel } from "../models/Quiz.js";
import { TopicModel } from "../models/Topic.js";
import { getQuizQuestionIds } from "../modules/quizzes/application/quizQuestionSelection.js";
import { buildDocumentsByIdsQuery, uniqueStrings } from "../modules/quizzes/infrastructure/quizDocumentQuery.js";
import { isQuestionContentUsable } from "../modules/quizzes/presentation/questionPresentation.js";

type QuizAudit = {
  quizId: string;
  title: string;
  totalRefs: number;
  resolvedRefs: number;
  usableRefs: number;
  missingIds: string[];
  unusableIds: string[];
};

const aliasVariants = (value: unknown) => {
  const id = String(value || "").trim();
  if (!id) return [];
  const withoutCopySuffix = id.replace(/_copy(?:_\d+)?$/i, "");
  return uniqueStrings(withoutCopySuffix && withoutCopySuffix !== id ? [id, withoutCopySuffix] : [id]);
};

async function run() {
  await connectToDatabase();

  try {
    const quizzes = await QuizModel.find({
      isPublished: true,
      showOnPlatform: { $ne: false },
      approvalStatus: "approved",
    }).lean();

    const referencedQuestionIds = uniqueStrings(
      quizzes.flatMap((quiz: any) => getQuizQuestionIds(quiz).map(String)),
    );

    const questions = referencedQuestionIds.length
      ? await QuestionModel.find(buildDocumentsByIdsQuery(referencedQuestionIds))
          .select("id text imageUrl options type")
          .lean()
      : [];

    const resolvedByAlias = new Map<string, any>();
    questions.forEach((question: any) => {
      const aliases = uniqueStrings([
        question.id ? String(question.id) : "",
        question._id ? String(question._id) : "",
      ]);
      aliases.forEach((alias) => {
        aliasVariants(alias).forEach((variant) => resolvedByAlias.set(variant, question));
      });
    });

    const resolveQuestion = (questionId: unknown) => {
      for (const variant of aliasVariants(questionId)) {
        const resolved = resolvedByAlias.get(variant);
        if (resolved) return resolved;
      }
      return null;
    };

    const quizAudits: QuizAudit[] = quizzes.map((quiz: any) => {
      const refs = getQuizQuestionIds(quiz);
      const missingIds: string[] = [];
      const unusableIds: string[] = [];
      let resolvedRefs = 0;
      let usableRefs = 0;

      refs.forEach((questionId: string) => {
        const question = resolveQuestion(questionId);
        if (!question) {
          missingIds.push(questionId);
          return;
        }
        resolvedRefs += 1;
        if (isQuestionContentUsable(question)) {
          usableRefs += 1;
        } else {
          unusableIds.push(questionId);
        }
      });

      return {
        quizId: String(quiz.id || quiz._id || ""),
        title: String(quiz.title || ""),
        totalRefs: refs.length,
        resolvedRefs,
        usableRefs,
        missingIds,
        unusableIds,
      };
    });

    const quizByAlias = new Map<string, QuizAudit>();
    quizzes.forEach((quiz: any, index) => {
      const audit = quizAudits[index];
      uniqueStrings([
        quiz.id ? String(quiz.id) : "",
        quiz._id ? String(quiz._id) : "",
      ]).forEach((alias) => quizByAlias.set(alias, audit));
    });

    const topics = await TopicModel.find({ showOnPlatform: { $ne: false } })
      .select("id title pathId subjectId quizIds")
      .lean();

    const brokenTopicQuizRefs = topics.flatMap((topic: any) =>
      (Array.isArray(topic.quizIds) ? topic.quizIds : []).flatMap((quizId: unknown) => {
        const normalizedQuizId = String(quizId || "").trim();
        if (!normalizedQuizId) return [];

        const audit = quizByAlias.get(normalizedQuizId);
        if (!audit) {
          return [{
            topicId: String(topic.id || topic._id || ""),
            topicTitle: String(topic.title || ""),
            quizId: normalizedQuizId,
            reason: "quiz_missing_or_not_learner_published",
          }];
        }
        if (audit.usableRefs === 0) {
          return [{
            topicId: String(topic.id || topic._id || ""),
            topicTitle: String(topic.title || ""),
            quizId: normalizedQuizId,
            reason: "quiz_has_zero_usable_questions",
          }];
        }
        return [];
      }),
    );

    const affectedQuizzes = quizAudits.filter(
      (item) => item.missingIds.length > 0 || item.unusableIds.length > 0,
    );
    const zeroUsableQuizzes = quizAudits.filter((item) => item.usableRefs === 0);

    console.log(JSON.stringify({
      mode: "READ_ONLY_AUDIT",
      database: mongoose.connection.name,
      totals: {
        publishedLearnerQuizzes: quizzes.length,
        referencedQuestionIds: referencedQuestionIds.length,
        resolvedQuestionDocuments: questions.length,
        affectedQuizzes: affectedQuizzes.length,
        zeroUsableQuizzes: zeroUsableQuizzes.length,
        visibleTopics: topics.length,
        brokenTopicQuizRefs: brokenTopicQuizRefs.length,
      },
      affectedQuizzes: affectedQuizzes.slice(0, 100),
      zeroUsableQuizzes: zeroUsableQuizzes.slice(0, 100),
      brokenTopicQuizRefs: brokenTopicQuizRefs.slice(0, 100),
    }, null, 2));

    if (affectedQuizzes.length > 0 || brokenTopicQuizRefs.length > 0) {
      process.exitCode = 2;
    }
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error("Learner reference integrity audit failed", error);
  process.exitCode = 1;
});
