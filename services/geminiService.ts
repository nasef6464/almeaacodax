import { SkillGap, LearningRecommendation } from "../types";
import { api } from "./api";

export const getChatResponse = async (message: string): Promise<string> => {
  try {
    const response = await api.aiChat({ message });
    return response.text || "عذرًا، لم أستطع فهم السؤال. جرّب صياغته بطريقة أبسط.";
  } catch {
    return "عذرًا، أواجه ضغطًا حاليًا. اكتب سؤالك مرة أخرى بعد قليل.";
  }
};

export const generateStudyPlan = async (weaknesses: string[]): Promise<string> => {
  try {
    const response = await api.aiStudyPlan({ weaknesses });
    return JSON.stringify({ steps: response.steps || [] });
  } catch {
    return JSON.stringify({
      steps: ["راجع الفكرة الأساسية", "حل تدريبًا قصيرًا", "أعد اختبارًا مصغرًا"],
    });
  }
};

export const explainQuestion = async (
  questionText: string,
  studentAnswer: string,
  correctAnswer: string,
): Promise<string> => {
  const message = `اشرح لي ببساطة لماذا إجابتي "${studentAnswer}" ليست الأنسب في السؤال "${questionText}"، ولماذا الإجابة الصحيحة هي "${correctAnswer}".`;
  return getChatResponse(message);
};

export const generateLearningPath = async (skills: SkillGap[]): Promise<LearningRecommendation[]> => {
  const targetSkills = skills.filter((skill) => skill.status === "weak" || skill.status === "average");
  if (targetSkills.length === 0) return [];

  try {
    const response = await api.aiLearningPath({ skills: targetSkills });
    return Array.isArray(response) ? (response as LearningRecommendation[]) : buildLearningFallback(targetSkills);
  } catch {
    return buildLearningFallback(targetSkills);
  }
};

export const generateQuizQuestion = async (topic: string): Promise<any> => {
  try {
    return await api.aiQuestion({ topic });
  } catch {
    return {
      question: `سؤال تدريبي في ${topic}: ما الاختيار الصحيح؟`,
      options: ["الاختيار الأول", "الاختيار الثاني", "الاختيار الثالث", "الاختيار الرابع"],
      correctIndex: 0,
      explanation: "هذا سؤال مبدئي. راجع السؤال قبل نشره للطلاب.",
    };
  }
};

export const generateCourseSummary = async (courseTitle: string): Promise<string> => {
  try {
    const response = await api.aiCourseSummary({ courseTitle });
    return response.text || "شرح الدورة غير متوفر حاليًا.";
  } catch {
    return "شرح الدورة غير متوفر حاليًا.";
  }
};

const buildLearningFallback = (skills: SkillGap[]): LearningRecommendation[] =>
  skills.slice(0, 3).map((skill, index) => ({
    id: `rec_${index + 1}`,
    type: index === 1 ? "quiz" : "lesson",
    title: `مراجعة ${skill.skill}`,
    duration: index === 1 ? "10 دقائق" : "15 دقيقة",
    reason: `لأن مستوى الإتقان يحتاج دعمًا في ${skill.skill}.`,
    skillTargeted: skill.skill,
    priority: skill.status === "weak" ? "high" : "medium",
    actionLabel: index === 1 ? "ابدأ التدريب" : "ابدأ الدرس",
    link: "/dashboard",
  }));
