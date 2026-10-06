import { useStore } from '../store/useStore';
import { Group, Quiz, QuizResult, Role, User } from '../types';

export const injectB2BSimulation = () => {
    const store = useStore.getState();
    const currentUser = store.user;

    // 1. Create a mock group
    const mockGroupId = 'g_mock_b2b_1';
    const existingGroup = store.groups.find(g => g.id === mockGroupId);
    
    if (!existingGroup) {
        const newGroup: Group = {
            id: mockGroupId,
            name: 'فصل الموهوبين (محاكاة)',
            type: 'CLASS',
            ownerId: 'admin',
            supervisorIds: [currentUser.id, 'sup1'],
            studentIds: [currentUser.id, 'stu1', 'stu2', 'stu3', 'stu4'],
            courseIds: [],
            createdAt: Date.now()
        };
        useStore.setState({ groups: [...store.groups, newGroup] });
    } else {
        // Ensure current user is in the group as student and supervisor
        const updatedGroups = store.groups.map(g => {
            if (g.id === mockGroupId) {
                return {
                    ...g,
                    supervisorIds: Array.from(new Set([...g.supervisorIds, currentUser.id])),
                    studentIds: Array.from(new Set([...g.studentIds, currentUser.id]))
                };
            }
            return g;
        });
        useStore.setState({ groups: updatedGroups });
    }

    // 2. Create mock users
    const mockUsers: User[] = [
        { id: 'stu1', name: 'أحمد محمود', role: Role.STUDENT, email: 'stu1@mock.com', avatar: '', points: 0, badges: [], subscription: { plan: 'free' as const, purchasedCourses: [], purchasedPackages: [] } },
        { id: 'stu2', name: 'سارة خالد', role: Role.STUDENT, email: 'stu2@mock.com', avatar: '', points: 0, badges: [], subscription: { plan: 'free' as const, purchasedCourses: [], purchasedPackages: [] } },
        { id: 'stu3', name: 'عمر فهد', role: Role.STUDENT, email: 'stu3@mock.com', avatar: '', points: 0, badges: [], subscription: { plan: 'free' as const, purchasedCourses: [], purchasedPackages: [] } },
        { id: 'stu4', name: 'ريم علي', role: Role.STUDENT, email: 'stu4@mock.com', avatar: '', points: 0, badges: [], subscription: { plan: 'free' as const, purchasedCourses: [], purchasedPackages: [] } },
    ];
    const existingUserIds = new Set(store.users.map(u => u.id));
    const newUsers = mockUsers.filter(u => !existingUserIds.has(u.id));
    if (newUsers.length > 0) {
        useStore.setState({ users: [...store.users, ...newUsers] });
    }

    // 3. Create a Directed Quiz (Exam Hall Test)
    const mockQuizId = 'q_mock_b2b_directed_1';
    const existingQuiz = store.quizzes.find(q => q.id === mockQuizId);
    if (!existingQuiz) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newQuiz: any = {
            id: mockQuizId,
            title: 'اختبار تجريبي شامل (قاعة الاختبارات)',
            description: 'هذا الاختبار موجه لك خصيصاً من المشرف لتحديد مستواك في الكمي واللفظي.',
            pathId: 'p_qudrat',
            subjectId: 'sub_quant',
            mode: 'central',
            targetGroupIds: [mockGroupId],
            questionIds: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10'],
            timeLimit: 15,
            isPublished: true,
            createdAt: Date.now(),
            authorId: currentUser.id,
            placement: 'mock',
            settings: {},
            access: { type: 'free' },
        };
        useStore.setState({ quizzes: [newQuiz as import('../types').Quiz, ...store.quizzes] });
    }

    // 4. Create mock results for the analytics to show up
    const mockResults: QuizResult[] = [
        {
            userId: 'stu1',
            quizId: mockQuizId,
            quizTitle: 'اختبار تجريبي شامل (قاعة الاختبارات)',
            score: 90,
            totalQuestions: 10,
            correctAnswers: 9,
            wrongAnswers: 1,
            unanswered: 0,
            timeSpent: '10:00',
            date: new Date().toISOString(),
            skillsAnalysis: [{ skill: 'الجبر', mastery: 90, status: 'strong' }]
        },
        {
            userId: 'stu2',
            quizId: mockQuizId,
            quizTitle: 'اختبار تجريبي شامل (قاعة الاختبارات)',
            score: 70,
            totalQuestions: 10,
            correctAnswers: 7,
            wrongAnswers: 3,
            unanswered: 0,
            timeSpent: '12:00',
            date: new Date().toISOString(),
            skillsAnalysis: [{ skill: 'الجبر', mastery: 70, status: 'average' }]
        },
        {
            userId: 'stu3',
            quizId: mockQuizId,
            quizTitle: 'اختبار تجريبي شامل (قاعة الاختبارات)',
            score: 40,
            totalQuestions: 10,
            correctAnswers: 4,
            wrongAnswers: 6,
            unanswered: 0,
            timeSpent: '08:00',
            date: new Date().toISOString(),
            skillsAnalysis: [{ skill: 'الجبر', mastery: 40, status: 'weak', recommendation: 'يحتاج تأسيس' }]
        }
    ];

    const currentResults = store.examResults;
    const existingResultIds = new Set(currentResults.map(r => `${r.userId}_${r.quizId}`));
    const newResults = mockResults.filter(r => !existingResultIds.has(`${r.userId}_${r.quizId}`));
    
    if (newResults.length > 0) {
        useStore.setState({ examResults: [...newResults, ...currentResults] });
    }

    // Ensure current user's groups contain the mock group so they see the test
    if (!currentUser.groupIds?.includes(mockGroupId)) {
        useStore.setState({
            user: {
                ...currentUser,
                groupIds: [...(currentUser.groupIds || []), mockGroupId]
            }
        });
    }

    alert('تم حقن بيانات المحاكاة بنجاح! \n1. كطالب: اذهب لـ "مركز الاختبارات" لترى الاختبار الموجه.\n2. كمشرف: اذهب لـ "الاختبارات" لترى التحليلات ولوحة الشرف.');
};
