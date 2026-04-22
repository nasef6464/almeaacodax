
export enum Role {
    STUDENT = 'student',
    TEACHER = 'teacher',
    ADMIN = 'admin',
    SUPERVISOR = 'supervisor',
    PARENT = 'parent'
}

export type LessonType = 'video' | 'quiz' | 'file' | 'assignment' | 'text' | 'live_youtube' | 'zoom' | 'google_meet' | 'teams';

export interface InteractiveQuestion {
    id: string;
    timestamp: number; // in seconds
    questionId?: string; // Reference to question bank
    inlineQuestion?: {
        text: string;
        options: string[];
        correctOptionIndex: number;
    };
    mustPass: boolean;
    actionOnFail: 'rewatch' | 'continue';
    rewatchTimestamp?: number; // where to go back if failed
}

export interface Lesson {
    id: string;
    title: string;
    description?: string;
    pathId?: string;
    subjectId?: string;
    sectionId?: string;
    type: LessonType;
    duration: string;
    isCompleted: boolean;
    content?: string; // For text/article lessons
    videoUrl?: string;
    videoSource?: 'upload' | 'youtube' | 'vimeo';
    interactiveQuestions?: InteractiveQuestion[];
    quizId?: string;
    fileUrl?: string;
    assignmentDetails?: string; // For assignments
    meetingUrl?: string; // For live sessions
    meetingDate?: string;
    isLocked?: boolean;
    accessControl?: 'public' | 'enrolled' | 'specific_groups';
    allowedGroupIds?: string[];
    order: number; // For drag and drop ordering
    skillIds: string[]; // LINKING LESSON TO SKILLS
}

export interface Module {
    id: string;
    title: string;
    order: number;
    lessons: Lesson[];
}

export interface CourseFile {
    id: string;
    title: string;
    type: 'pdf' | 'doc' | 'image';
    url: string;
    size: string;
}

export interface CourseQA {
    id: string;
    question: string;
    answer?: string;
    user: string;
    date: string;
}

export interface Course {
    id: string;
    title: string;
    thumbnail: string;
    instructor: string;
    price: number;
    currency: string;
    duration: number; // hours
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    rating: number;
    progress: number; // 0-100
    category: string;
    subject?: string;
    features: string[];
    description?: string;
    instructorBio?: string;
    modules?: Module[];
    syllabus?: any[];
    isPurchased?: boolean;
    isPackage?: boolean;
    packageType?: 'courses' | 'videos' | 'tests';
    originalPrice?: number;
    includedCourses?: string[];
    studentCount?: number;
    weeksCount?: number;
    previewVideoUrl?: string;
    files?: CourseFile[];
    qa?: CourseQA[];
    // Advanced LMS Features
    isPublished?: boolean;
    prerequisiteCourseIds?: string[];
    dripContentEnabled?: boolean;
    certificateEnabled?: boolean;
    fakeRating?: number;
    fakeStudentsCount?: number;
    skills?: string[]; // Array of skill IDs
}

export interface ScheduleItem {
    id: string;
    day: string;
    subject: string;
    duration: string;
    status: 'completed' | 'in-progress' | 'upcoming';
    isLive?: boolean;
}

export interface CategoryPath {
    id: string;
    name: string;
    color?: string;
    icon?: string;
    iconUrl?: string; // Added for custom icon uploads
    iconStyle?: 'default' | 'modern' | 'minimal' | 'playful'; // Added for varying designs
    showInNavbar?: boolean;
    showInHome?: boolean;
    isActive?: boolean; // To hide/show paths completely
    parentPathId?: string; // To nest paths under other paths
    description?: string;
}

export interface CategoryLevel {
    id: string;
    pathId: string;
    name: string;
}

export interface SubjectSettings {
    showCourses?: boolean;
    showSkills?: boolean;
    showBanks?: boolean;
    showTests?: boolean;
    showLibrary?: boolean;
    lockSkillsForNonSubscribers?: boolean;
    lockBanksForNonSubscribers?: boolean;
    lockTestsForNonSubscribers?: boolean;
    lockLibraryForNonSubscribers?: boolean;
}

export interface CategorySubject {
    id: string;
    pathId: string;
    levelId?: string;
    name: string;
    icon?: string;
    color?: string;
    iconUrl?: string; // Added for custom subject icons
    iconStyle?: 'default' | 'modern' | 'minimal' | 'playful'; // Added for varying designs
    settings?: SubjectSettings;
}

export interface CategorySection {
    id: string;
    subjectId: string;
    name: string;
}

// Nested Skill Structure for UI (Skills Tree)
export interface NestedSubSkill {
    id: string;
    name: string;
    description: string;
    isLocked: boolean;
    progress?: number;
    lessons: Lesson[];
    quizzes: { id: string; title: string; questionCount: number; isCompleted?: boolean }[];
}

export interface Topic {
    id: string;
    subjectId: string;
    title: string;
    parentId?: string | null; // null or undefined for main topics
    order: number;
    lessonIds: string[]; // attached lessons from library
    quizIds: string[]; // attached quizzes from quiz center
}

export interface NestedSkill {
    id: string;
    name: string;
    description: string;
    isLocked: boolean;
    progress?: number;
    pathId?: string;
    subjectId?: string;
    sectionId?: string;
    subSkills: NestedSubSkill[];
}

export interface Skill {
    id: string;
    name: string;
    pathId: string;
    subjectId: string;
    sectionId: string;
    description?: string;
    lessonIds: string[]; // Lessons (videos/articles) that teach this skill
    questionIds: string[]; // Questions that test this skill
    createdAt: number;
}

export interface SkillGap {
    section?: string;
    skill: string;
    mastery: number; // 0-100 percentage
    status: 'weak' | 'average' | 'strong';
    recommendation?: string; // Action text like "Additional test available"
}

export interface QuizResult {
    quizId: string;
    quizTitle: string;
    score: number; // percentage
    totalQuestions: number;
    correctAnswers: number;
    wrongAnswers: number;
    unanswered: number;
    timeSpent: string;
    date: string;
    skillsAnalysis: SkillGap[];
}

export interface QuizHistoryItem {
    id: string;
    title: string;
    questionCount: number;
    courseName: string;
    passMark: number;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    firstAttempt: {
        score: number;
        time: string;
        date: string;
    };
    bestAttempt: {
        score: number;
        time: string;
        date: string;
    };
    improvement: number; // percentage change
    status: 'passed' | 'failed';
    skillsAnalysis: SkillGap[]; // For the detail view
}

export interface QuizSettings {
    showExplanations: boolean;
    showAnswers: boolean;
    maxAttempts: number;
    passingScore: number; // percentage
    timeLimit?: number; // in minutes
}

export interface QuizAccess {
    type: 'free' | 'paid' | 'private' | 'course_only';
    price?: number;
    allowedGroupIds?: string[];
}

export interface Quiz {
    id: string;
    title: string;
    description?: string;
    pathId: string;
    subjectId: string;
    sectionId?: string;
    type?: 'quiz' | 'bank'; // Added type for Training vs Simulated Test
    settings: QuizSettings;
    access: QuizAccess;
    questionIds: string[]; // References to Question bank
    createdAt: number;
    isPublished: boolean;
    skillIds?: string[];
}

export interface Question {
    id: string;
    text: string;
    options: string[];
    correctOptionIndex: number;
    explanation?: string;
    videoUrl?: string;
    imageUrl?: string;
    skillIds?: string[];
    pathId?: string; // Added to support Path selection
    subject: string;
    sectionId?: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    type: 'mcq' | 'true_false' | 'essay';
}

export interface QuestionAttempt {
    questionId: string;
    selectedOptionIndex: number;
    isCorrect: boolean;
    timeSpentSeconds: number;
    date: string;
}

export interface Activity {
    id: string;
    type: 'course_view' | 'lesson_complete' | 'quiz_complete' | 'skill_practice' | 'session_booked';
    title: string;
    date: string;
    link?: string;
}

export interface UserSubscription {
    plan: 'free' | 'premium';
    expiresAt?: string;
    purchasedCourses: string[];
    purchasedPackages: string[];
}

export interface User {
    id: string;
    name: string;
    email?: string;
    avatar: string;
    role: Role;
    points: number;
    badges: string[];
    subscription: UserSubscription;
    isActive?: boolean;
    schoolId?: string;
    groupIds?: string[];
}

export type GroupType = 'SCHOOL' | 'CLASS' | 'PRIVATE_GROUP';

export interface B2BPackage {
    id: string;
    schoolId: string;
    name: string;
    courseIds: string[];
    type: 'free_access' | 'discounted';
    discountPercentage?: number;
    maxStudents: number;
    status: 'active' | 'expired';
    createdAt: number;
}

export interface AccessCode {
    id: string;
    code: string;
    schoolId: string;
    packageId: string;
    maxUses: number;
    currentUses: number;
    expiresAt: number;
    createdAt: number;
}

export interface Group {
    id: string;
    name: string;
    type: GroupType;
    parentId?: string; // For classes belonging to a school
    ownerId: string;
    supervisorIds: string[];
    studentIds: string[];
    courseIds: string[];
    createdAt: number;
    metadata?: {
        description?: string;
        location?: string;
        settings?: any;
    };
    // Computed fields for analytics preparation
    totalStudents?: number;
    totalSupervisors?: number;
    totalCourses?: number;
    activityScore?: number;
    performanceScore?: number;
}

export interface NavItem {
    id: string;
    label: string;
    link: string;
    iconName?: string;
    children?: NavItem[];
}

export interface FavoriteQuestion {
    id: string;
    courseId: string;
    courseTitle: string;
    quizTitle: string;
    text: string;
    imageUrl?: string;
    videoUrl?: string; // YouTube Embed URL
    options: string[];
    correctOptionIndex: number;
    userSelectedOptionIndex?: number;
    explanation?: string;
    dateAdded: string;
}

export interface LibraryItem {
    id: string;
    title: string;
    size: string;
    downloads: number;
    type: 'pdf' | 'doc' | 'video';
    subjectId: string;
    url?: string;
}

// AI Learning Path Types
export interface LearningRecommendation {
    id: string;
    type: 'lesson' | 'quiz' | 'flashcard';
    title: string;
    duration: string; // e.g., "15 دقيقة"
    reason: string; // AI generated reason
    skillTargeted: string;
    priority: 'high' | 'medium' | 'low';
    actionLabel: string;
    link: string;
}
