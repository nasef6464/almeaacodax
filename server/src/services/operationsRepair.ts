import { PathModel } from "../models/Path.js";
import { QuizModel } from "../models/Quiz.js";
import { SubjectModel } from "../models/Subject.js";

export type OperationsRepairAction = "hide-empty-published-quizzes" | "hide-empty-active-paths";

export async function runOperationsRepair(action: OperationsRepairAction, apply = false) {
  if (action === "hide-empty-published-quizzes") {
    const targetQuizzes = await QuizModel.find({
      showOnPlatform: { $ne: false },
      isPublished: { $ne: false },
      $or: [{ questionIds: { $exists: false } }, { questionIds: { $size: 0 } }],
    }).lean();

    if (apply && targetQuizzes.length > 0) {
      await QuizModel.updateMany(
        { _id: { $in: targetQuizzes.map((quiz: any) => quiz._id) } },
        {
          $set: {
            showOnPlatform: false,
            isPublished: false,
            reviewerNotes: "أخفي تلقائيا من مركز التشخيص لأنه منشور بلا أسئلة.",
          },
        },
      );
    }

    return {
      action,
      applied: apply,
      affected: targetQuizzes.length,
      message: apply
        ? "تم إخفاء الاختبارات المنشورة بلا أسئلة عن الطلاب."
        : "سيتم إخفاء الاختبارات المنشورة بلا أسئلة عن الطلاب.",
      samples: targetQuizzes.slice(0, 8).map((quiz: any) => ({
        id: String(quiz.id || quiz._id),
        title: quiz.title,
      })),
    };
  }

  if (action === "hide-empty-active-paths") {
    const [paths, subjects] = await Promise.all([
      PathModel.find({ isActive: { $ne: false } }).lean(),
      SubjectModel.find().lean(),
    ]);
    const pathsWithSubjects = new Set(subjects.map((subject: any) => String(subject.pathId)));
    const targetPaths = paths.filter((path: any) => !pathsWithSubjects.has(String(path._id)));

    if (apply && targetPaths.length > 0) {
      await PathModel.updateMany(
        { _id: { $in: targetPaths.map((path: any) => path._id) } },
        {
          $set: {
            isActive: false,
            showInHome: false,
            showInNavbar: false,
          },
        },
      );
    }

    return {
      action,
      applied: apply,
      affected: targetPaths.length,
      message: apply
        ? "تم إخفاء المسارات النشطة التي لا تحتوي مواد."
        : "سيتم إخفاء المسارات النشطة التي لا تحتوي مواد.",
      samples: targetPaths.slice(0, 8).map((path: any) => ({
        id: String(path._id),
        title: path.name,
      })),
    };
  }

  throw new Error("Unsupported repair action");
}
