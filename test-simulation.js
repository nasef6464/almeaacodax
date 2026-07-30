import { create } from 'zustand';

// Mock types and store to test our logic
const useStore = create((set) => ({
    user: { id: 'admin', role: 'supervisor' },
    groups: [],
    users: [],
    quizzes: [],
    examResults: []
}));

// Simulate the injection logic
const injectB2BSimulation = () => {
    const store = useStore.getState();
    const currentUser = store.user;

    const mockGroupId = 'g_mock_b2b_1';
    
    // 1. Group
    const newGroup = {
        id: mockGroupId,
        name: 'فصل الموهوبين (محاكاة)',
        type: 'CLASS',
        ownerId: 'admin',
        supervisorIds: [currentUser.id, 'sup1'],
        studentIds: [currentUser.id, 'stu1', 'stu2', 'stu3', 'stu4'],
    };
    useStore.setState({ groups: [newGroup] });

    // 2. Users
    const mockUsers = [
        { id: 'stu1', name: 'أحمد محمود', role: 'student' },
        { id: 'stu2', name: 'سارة خالد', role: 'student' },
        { id: 'stu3', name: 'عمر فهد', role: 'student' },
        { id: 'stu4', name: 'ريم علي', role: 'student' },
    ];
    useStore.setState({ users: mockUsers });

    // 3. Quiz
    const mockQuizId = 'q_mock_b2b_directed_1';
    const newQuiz = {
        id: mockQuizId,
        title: 'اختبار تجريبي شامل (قاعة الاختبارات)',
        mode: 'central',
        targetGroupIds: [mockGroupId],
        placement: 'mock'
    };
    useStore.setState({ quizzes: [newQuiz] });

    // 4. Results
    const mockResults = [
        { userId: 'stu1', quizId: mockQuizId, score: 90, date: new Date().toISOString() },
        { userId: 'stu2', quizId: mockQuizId, score: 70, date: new Date().toISOString() },
        { userId: 'stu3', quizId: mockQuizId, score: 40, date: new Date().toISOString() }
    ];
    useStore.setState({ examResults: mockResults });

    // 5. Update user
    useStore.setState({ user: { ...currentUser, groupIds: [mockGroupId] } });
};

console.log("=== STARTING SIMULATION TEST ===");
console.log("Initial state:", useStore.getState().quizzes.length, "quizzes");
injectB2BSimulation();

const state = useStore.getState();
console.log("=== AFTER INJECTION ===");
console.log("Groups:", state.groups.length);
console.log("Mock Group Students:", state.groups[0].studentIds.length);
console.log("Quizzes:", state.quizzes.length);
console.log("Directed Quiz Name:", state.quizzes[0].title);
console.log("Results for Quiz:", state.examResults.filter(r => r.quizId === 'q_mock_b2b_directed_1').length);
console.log("Leaderboard Top Score:", Math.max(...state.examResults.map(r => r.score)));

// Simulate Quizzes.tsx logic for Directed Tests
const directedQuizzes = state.quizzes.filter(quiz => {
    const hasExplicitTargets = (quiz.targetGroupIds || []).length > 0;
    return quiz.mode === 'central' || hasExplicitTargets;
});
console.log("Student Quizzes Tab - Directed Tests found:", directedQuizzes.length);
console.log("Is student in target group?", directedQuizzes[0].targetGroupIds.some(id => state.user.groupIds.includes(id)));

console.log("=== SIMULATION TEST SUCCESSFUL ===");
