import { QuestionModel } from "../../../models/Question.js";

const uniqueStrings = (values: Array<string | undefined | null>) =>
  [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];

export async function resolveQuizSkillIds(questionIds: string[]) {
  if (questionIds.length === 0) return [];

  const questions = await QuestionModel.find({ id: { $in: questionIds } }).select("skillIds");
  return [...new Set(questions.flatMap((question) => question.skillIds || []).filter(Boolean))];
}

export function getQuizQuestionIds(quiz: any) {
  const mockSections = Array.isArray(quiz?.mockExam?.sections) ? quiz.mockExam.sections : [];
  const mockQuestionIds = quiz?.mockExam?.enabled === true
    ? mockSections.flatMap((section: any) => Array.isArray(section?.questionIds) ? section.questionIds.map(String) : [])
    : [];
  const regularQuestionIds = Array.isArray(quiz?.questionIds) ? quiz.questionIds.map(String) : [];
  return uniqueStrings((mockQuestionIds.length > 0 ? mockQuestionIds : regularQuestionIds).filter(Boolean));
}
