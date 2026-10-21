export const projectClassroomQuestionForStudent = (question: { questionId: string; text: string; imageUrl?: string; options: string[]; type: string; examType?:string;optionsEmbeddedInImage?:boolean }, active: boolean) =>
  active ? { questionId: question.questionId, text: question.text, imageUrl: question.imageUrl || "", options: question.options, type: question.type,
    ...(question.examType ? {examType:question.examType}:{}),
    ...(typeof question.optionsEmbeddedInImage==='boolean'?{optionsEmbeddedInImage:question.optionsEmbeddedInImage}:{}),
  } : null;
