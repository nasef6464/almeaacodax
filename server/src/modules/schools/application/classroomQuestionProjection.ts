export const projectClassroomQuestionForStudent = (question: { questionId: string; text: string; imageUrl?: string; options: string[]; type: string }, active: boolean) =>
  active ? { questionId: question.questionId, text: question.text, imageUrl: question.imageUrl || "", options: question.options, type: question.type } : null;
