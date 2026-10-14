import { SubjectModel } from "../../../models/Subject.js";
import { SectionModel } from "../../../models/Section.js";

/** Read labels used by the frozen analysis, including historical quiz fallbacks. */
export const readQuizSubmissionTaxonomy = async (skills: any[], quiz: any) => {
  const subjectIds = [...new Set(skills.map(skill => String(skill.subjectId || quiz.subjectId || "")).filter(Boolean))];
  const sectionIds = [...new Set(skills.map(skill => String(skill.sectionId || quiz.sectionId || "")).filter(Boolean))];
  const [subjects, sections] = await Promise.all([
    subjectIds.length ? SubjectModel.find({ _id: { $in: subjectIds } }) : [],
    sectionIds.length ? SectionModel.find({ _id: { $in: sectionIds } }) : [],
  ]);
  return { subjects, sections };
};
