import type { User, Activity, QuestionAttempt, QuizResult, Question, Role, Group, Skill, CategoryPath, CategorySubject, CategorySection, B2BPackage, AccessCode, AnnouncementAd, Course, NestedSkill, LibraryItem, Quiz, Lesson, PackageContentType, StudyPlan, SkillProgress, CartItem } from '../types';

export interface AppState {
    user: User;
    users: User[];
    groups: Group[];
    b2bPackages: B2BPackage[];
    accessCodes: AccessCode[];
    announcementAds: AnnouncementAd[];
    
    // Core Content
    courses: Course[];
    questions: Question[];
    quizzes: Quiz[];
    lessons: Lesson[];
    topics: import('../types').Topic[];
    
    // Taxonomy & Skills
    paths: CategoryPath[];
    levels: import('../types').CategoryLevel[];
    subjects: CategorySubject[];
    sections: CategorySection[];
    skills: Skill[];
    nestedSkills: NestedSkill[];
    libraryItems: LibraryItem[];
    addLibraryItem: (item: LibraryItem) => void;
    updateLibraryItem: (id: string, item: Partial<LibraryItem>) => void;
    deleteLibraryItem: (id: string) => void;
    
    enrolledCourses: string[];
    enrolledPaths: string[];
    completedLessons: string[];
    examResults: QuizResult[];
    questionAttempts: QuestionAttempt[];
    favorites: string[];
    reviewLater: string[];
    recentActivity: Activity[];
    studyPlans: StudyPlan[];
    skillProgress: SkillProgress[];
    cartItems: CartItem[];
    
    // Actions
    hydrateUsers: (users: User[]) => void;
    hydrateCourses: (courses: Course[]) => void;
    hydrateQuestions: (questions: Question[]) => void;
    hydrateQuizzes: (quizzes: Quiz[]) => void;
    hydrateTaxonomy: (payload: {
        paths?: CategoryPath[];
        levels?: import('../types').CategoryLevel[];
        subjects?: CategorySubject[];
        sections?: CategorySection[];
        skills?: Skill[];
    }) => void;
    hydrateContentBootstrap: (payload: {
        topics?: import('../types').Topic[];
        lessons?: Lesson[];
        libraryItems?: LibraryItem[];
        groups?: Group[];
        b2bPackages?: B2BPackage[];
        accessCodes?: AccessCode[];
        announcementAds?: AnnouncementAd[];
        studyPlans?: StudyPlan[];
    }) => void;
    hydrateExamResults: (results: QuizResult[]) => void;
    hydrateSkillProgress: (items: SkillProgress[]) => void;
    hydrateQuestionAttempts: (attempts: QuestionAttempt[]) => void;
    enrollCourse: (courseId: string) => void;
    redeemAccessCode: (code: string) => Promise<void>;
    enrollPath: (pathId: string) => void;
    unenrollPath: (pathId: string) => void;
    markLessonComplete: (lessonId: string, courseId: string, lessonTitle: string) => void;
    saveExamResult: (result: QuizResult) => void;
    recordQuestionAttempt: (attempt: QuestionAttempt) => void;
    toggleFavorite: (questionId: string) => void;
    toggleReviewLater: (questionId: string) => void;
    addActivity: (activity: Omit<Activity, 'id' | 'date'>) => void;
    addToCart: (item: CartItem) => void;
    removeFromCart: (itemId: string, itemType?: CartItem['type']) => void;
    clearCart: () => void;
    cartCount: () => number;
    checkAccess: (contentId: string, isPremiumContent: boolean) => boolean;
    hasScopedPackageAccess: (contentType: PackageContentType, pathId?: string, subjectId?: string) => boolean;
    getMatchingPackage: (contentType: PackageContentType, pathId?: string, subjectId?: string) => B2BPackage | null;
    changeRole: (role: Role) => void;
    createStudyPlan: (plan: StudyPlan) => void;
    updateStudyPlan: (planId: string, data: Partial<StudyPlan>) => void;
    deleteStudyPlan: (planId: string) => void;
    archiveStudyPlan: (planId: string) => void;

    // Admin Actions
    addUser: (user: User) => void;
    updateUser: (userId: string, data: Partial<User>) => void;
    toggleUserStatus: (userId: string) => void;
    
    // Course Actions
    addCourse: (course: Course) => Promise<Course | null>;
    updateCourse: (courseId: string, data: Partial<Course>) => Promise<Course | null>;
    deleteCourse: (courseId: string) => Promise<void>;

    // Question Actions
    addQuestion: (question: Question) => Promise<Question>;
    updateQuestion: (questionId: string, data: Partial<Question>) => Promise<Question>;
    deleteQuestion: (questionId: string) => Promise<void>;

    // Quiz Actions
    addQuiz: (quiz: Quiz) => Promise<Quiz>;
    updateQuiz: (quizId: string, data: Partial<Quiz>) => Promise<Quiz>;
    deleteQuiz: (quizId: string) => void;

    // Lesson Actions
    addLesson: (lesson: Lesson) => void;
    updateLesson: (lessonId: string, data: Partial<Lesson>) => void;
    deleteLesson: (lessonId: string) => void;

    // Topic Actions
    addTopic: (topic: import('../types').Topic) => void;
    updateTopic: (topicId: string, data: Partial<import('../types').Topic>) => void;
    deleteTopic: (topicId: string) => void;
    
    // Group Actions
    createGroup: (group: Group) => void;
    createGroupAsync: (group: Group) => Promise<Group>;
    updateGroup: (groupId: string, data: Partial<Group>) => void;
    updateGroupAsync: (groupId: string, data: Partial<Group>) => Promise<Group>;
    deleteGroup: (groupId: string) => void;
    deleteGroupAsync: (groupId: string) => Promise<void>;
    assignStudentToGroup: (userId: string, groupId: string) => void;
    assignStudentToGroupAsync: (userId: string, groupId: string) => Promise<void>;
    removeStudentFromGroup: (userId: string, groupId: string) => void;
    removeStudentFromGroupAsync: (userId: string, groupId: string) => Promise<void>;
    assignSupervisorToGroup: (userId: string, groupId: string) => void;
    assignSupervisorToGroupAsync: (userId: string, groupId: string) => Promise<void>;
    removeSupervisorFromGroup: (userId: string, groupId: string) => void;
    removeSupervisorFromGroupAsync: (userId: string, groupId: string) => Promise<void>;
    assignTeacherToGroupAsync: (userId: string, groupId: string) => Promise<void>;
    removeTeacherFromGroupAsync: (userId: string, groupId: string) => Promise<void>;
    assignCourseToGroup: (courseId: string, groupId: string) => void;
    removeCourseFromGroup: (courseId: string, groupId: string) => void;

    // B2B Actions
    createB2BPackage: (pkg: B2BPackage) => void;
    createB2BPackageAsync: (pkg: B2BPackage) => Promise<B2BPackage>;
    updateB2BPackage: (id: string, data: Partial<B2BPackage>) => void;
    updateB2BPackageAsync: (id: string, data: Partial<B2BPackage>) => Promise<B2BPackage>;
    deleteB2BPackage: (id: string) => void;
    deleteB2BPackageAsync: (id: string) => Promise<void>;
    createAnnouncementAd: (ad: AnnouncementAd) => void;
    updateAnnouncementAd: (id: string, data: Partial<AnnouncementAd>) => void;
    deleteAnnouncementAd: (id: string) => void;
    createAccessCode: (code: AccessCode) => void;
    createAccessCodeAsync: (code: AccessCode) => Promise<AccessCode>;
    deleteAccessCode: (id: string) => void;
    deleteAccessCodeAsync: (id: string) => Promise<void>;

    // Taxonomy Actions
    addPath: (path: CategoryPath) => Promise<void>;
    updatePath: (pathId: string, data: Partial<CategoryPath>) => void;
    deletePath: (pathId: string) => void;
    addLevel: (level: import('../types').CategoryLevel) => void;
    updateLevel: (levelId: string, data: Partial<import('../types').CategoryLevel>) => void;
    deleteLevel: (levelId: string) => void;
    addSubject: (subject: CategorySubject) => void;
    updateSubject: (subjectId: string, data: Partial<CategorySubject>) => void;
    deleteSubject: (subjectId: string) => void;
    addSection: (section: CategorySection) => void;
    updateSection: (sectionId: string, data: Partial<CategorySection>) => void;
    deleteSection: (sectionId: string) => void;

    // Skill Actions
    createSkill: (skill: Skill) => void;
    updateSkill: (skillId: string, data: Partial<Skill>) => void;
    deleteSkill: (skillId: string) => void;
    linkSkillToLesson: (skillId: string, lessonId: string) => void;
    unlinkSkillFromLesson: (skillId: string, lessonId: string) => void;
    
    // Nested Skill Actions
    updateNestedSkills: (skills: NestedSkill[]) => void;

    // Library Actions
}
