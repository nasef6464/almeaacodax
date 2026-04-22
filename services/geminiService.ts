
import { GoogleGenAI, GenerateContentResponse, Chat, Type } from "@google/genai";
import { SkillGap, LearningRecommendation } from "../types";

// NOTE: Ideally, this API key should come from a backend proxy to secure it.
// For this frontend demo, we assume it's injected via env.
const apiKey = process.env.API_KEY || 'DEMO_KEY_PLACEHOLDER';

const ai = new GoogleGenAI({ apiKey });

// Chat Session Singleton
let chatSession: Chat | null = null;

export const getChatResponse = async (message: string): Promise<string> => {
    if (!chatSession) {
        chatSession = ai.chats.create({
            model: 'gemini-3-pro-preview',
            config: {
                systemInstruction: "You are a helpful and encouraging educational assistant for 'The Hundred' platform. Help students with their questions about Physics, Math, and general studies. Keep answers concise, friendly, and helpful.",
            }
        });
    }

    try {
        const result = await chatSession.sendMessage({ message });
        return (result as GenerateContentResponse).text || "I'm sorry, I couldn't understand that.";
    } catch (error: any) {
        if (error?.status !== 429 && !error?.message?.includes('429')) {
            console.warn("Gemini Chat Error:", error?.message || error);
        }
        return "عذراً، أواجه ضغطاً حالياً. يرجى المحاولة بعد قليل.";
    }
};

export const generateStudyPlan = async (weaknesses: string[]): Promise<string> => {
    try {
        const prompt = `
            Act as an educational advisor for a student.
            The student is weak in the following areas: ${weaknesses.join(', ')}.
            Provide a concise, 3-step study plan to improve these skills.
            Format the output as JSON with a "steps" array containing strings.
        `;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        return response.text || '[]';
    } catch (error: any) {
        if (error?.status !== 429 && !error?.message?.includes('429')) {
            console.warn("Gemini API Error:", error?.message || error);
        }
        return JSON.stringify({ steps: ["Review basic concepts", "Practice daily problems", "Take a mock test"] });
    }
};

export const explainQuestion = async (questionText: string, studentAnswer: string, correctAnswer: string): Promise<string> => {
    try {
        const prompt = `
            Explain why the answer '${studentAnswer}' is incorrect and why '${correctAnswer}' is correct for the question: "${questionText}".
            Keep the explanation simple and under 100 words.
        `;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text || "Explanation currently unavailable.";
    } catch (error: any) {
        if (error?.status !== 429 && !error?.message?.includes('429')) {
            console.warn("Gemini API Error:", error?.message || error);
        }
        return "Could not generate AI explanation at this time.";
    }
};

/**
 * Generates a personalized learning path based on skill gaps.
 */
export const generateLearningPath = async (skills: SkillGap[]): Promise<LearningRecommendation[]> => {
    // Filter for weak or average skills
    const targetSkills = skills.filter(s => s.status === 'weak' || s.status === 'average');
    
    if (targetSkills.length === 0) return [];

    const prompt = `
        Analyze these student skill gaps: ${JSON.stringify(targetSkills)}.
        
        Available Curriculum:
        1. Lesson: "Basics of Decimal Fractions" (Math, 15 min)
        2. Quiz: "Quadratic Equations Practice" (Algebra, 10 min)
        3. Video: "Understanding Plane Geometry" (Geometry, 20 min)
        4. Flashcards: "Physics Formulas" (Physics, 5 min)
        5. Lesson: "Advanced Integration" (Calculus, 30 min)

        Task: Recommend the 3 best next steps for this student.
        Output strictly valid JSON matching this schema:
        [
            {
                "id": "string",
                "type": "lesson" | "quiz" | "flashcard",
                "title": "string",
                "duration": "string",
                "reason": "string (e.g., 'Because your mastery in X is 45%')",
                "skillTargeted": "string",
                "priority": "high" | "medium",
                "actionLabel": "string (e.g., 'Start Lesson')",
                "link": "string"
            }
        ]
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        const text = response.text;
        if (!text) throw new Error("Empty response");
        
        return JSON.parse(text);

    } catch (error: any) {
        // Suppress rate limit errors from cluttering the console, just use fallback
        if (error?.status !== 429 && !error?.message?.includes('429')) {
            console.warn("Gemini Learning Path Error:", error?.message || error);
        }
        
        // Fallback Mock Data in case API fails or key is missing
        return [
            {
                id: 'rec_1',
                type: 'lesson',
                title: 'شرح مبسط للكسور العشرية',
                duration: '15 دقيقة',
                reason: 'نسبة إتقانك 45% في الكسور العشرية',
                skillTargeted: 'الكسور العشرية',
                priority: 'high',
                actionLabel: 'ابدأ الدرس',
                link: '/course/c_math_100/lesson/l1'
            },
            {
                id: 'rec_2',
                type: 'quiz',
                title: 'تحدي المعادلات التربيعية السريع',
                duration: '10 دقائق',
                reason: 'لتحسين مستواك المتوسط (62%)',
                skillTargeted: 'المعادلات التربيعية',
                priority: 'medium',
                actionLabel: 'بدء التحدي',
                link: '/quiz?topic=quadratic'
            },
            {
                id: 'rec_3',
                type: 'flashcard',
                title: 'مراجعة قوانين الهندسة',
                duration: '5 دقائق',
                reason: 'مراجعة سريعة للحفاظ على المستوى',
                skillTargeted: 'الهندسة المستوية',
                priority: 'medium',
                actionLabel: 'عرض البطاقات',
                link: '/flashcards/geometry'
            }
        ];
    }
};

export const generateQuizQuestion = async (topic: string): Promise<any> => {
    try {
        const prompt = `
            Generate a multiple-choice question about "${topic}" in Arabic.
            Provide the output in the following JSON format:
            {
                "question": "Question text here",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correctIndex": 0,
                "explanation": "Explanation of why the answer is correct"
            }
        `;

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        const text = response.text;
        return text ? JSON.parse(text) : null;

    } catch (error: any) {
        if (error?.status !== 429 && !error?.message?.includes('429')) {
            console.warn("Gemini Quiz Gen Error:", error?.message || error);
        }
        // Fallback mock
        return {
            question: "مثال: ما هي عاصمة المملكة العربية السعودية؟",
            options: ["الرياض", "جدة", "الدمام", "مكة"],
            correctIndex: 0,
            explanation: "الرياض هي العاصمة."
        };
    }
};

export const generateCourseSummary = async (courseTitle: string): Promise<string> => {
    try {
        const prompt = `
            Summarize the educational course titled "${courseTitle}" in 2-3 sentences in Arabic.
            Highlight key benefits.
        `;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text || "شرح الدورة غير متوفر حالياً.";
    } catch (error: any) {
        if (error?.status !== 429 && !error?.message?.includes('429')) {
            console.warn("Gemini Course Summary Error:", error?.message || error);
        }
        return "شرح الدورة غير متوفر حالياً.";
    }
};
