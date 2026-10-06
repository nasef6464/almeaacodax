// eslint-disable-next-line @typescript-eslint/no-explicit-any
import { useStore } from '../store/useStore';
import { B2BPackage, Course, Group, Quiz, QuizResult, Role, User } from '../types';
type _SimUser = User & { schoolName?: string; phone?: string; academicStage?: string; classNumber?: string };
type _SimCourse = Course & { [key: string]: unknown };
type _SimSubscription = { plan: 'free'; purchasedCourses: string[]; purchasedPackages: string[] };
const _freeSub: _SimSubscription = { plan: 'free', purchasedCourses: [], purchasedPackages: [] };
type _SimQuiz = Omit<Quiz, 'settings'> & { settings?: Partial<Quiz['settings']>; authorId?: string; timeLimit?: number };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type _SimB2BPackage = any;

export interface SimulationSummary {
  admin: { name: string; email: string; schoolsCount: number; packagesCount: number };
  supervisor: { name: string; email: string; schoolName: string; directedQuizzesCount: number };
  teacher: { name: string; email: string; coursesCount: number; questionsCount: number };
  student: { name: string; email: string; completedQuizzesCount: number; weakSkills: string[] };
  parent: { name: string; email: string; linkedStudentName: string };
}

export const injectCompleteHumanE2ESimulation = (): SimulationSummary => {
  const store = useStore.getState();

  // 1. Define Core Entity IDs
  const schoolId = 'g_school_alrowad';
  const classId = 'g_class_101_quant';
  const adminId = 'u_admin_master';
  const supervisorId = 'u_sup_sarah';
  const teacherId = 'u_teach_ahmed';
  const studentId = 'u_stud_omar';
  const parentId = 'u_parent_fahad';

  const mockQuizId = 'q_directed_super_b2b_2026';
  const mockCourseId = 'c_qudrat_masterclass_2026';

  // 2. Create the 5 Interconnected Users
  const simulatedUsers: _SimUser[] = [
    {
      id: adminId,
      name: 'د. عبد الله المنصور (مدير النظام)',
      email: 'admin.master@almeaa.edu.sa',
      role: Role.ADMIN,
      avatar: '',
      points: 0,
      badges: [],
      subscription: _freeSub,
      schoolName: 'مجموعة مدارس الرواد النموذجية',
    },
    {
      id: supervisorId,
      name: 'أ. سارة العتيبي (المشرف الأكاديمي)',
      email: 'supervisor.sarah@almeaa.edu.sa',
      role: Role.SUPERVISOR,
      avatar: '',
      points: 0,
      badges: [],
      subscription: _freeSub,
      schoolName: 'مدرسة الرواد الثانوية',
      schoolId: schoolId,
    },
    {
      id: teacherId,
      name: 'م. أحمد الخالد (معلم القدرات والكمي)',
      email: 'teacher.ahmed@almeaa.edu.sa',
      role: Role.TEACHER,
      avatar: '',
      points: 0,
      badges: [],
      subscription: _freeSub,
      schoolName: 'مدرسة الرواد الثانوية',
      schoolId: schoolId,
    },
    {
      id: studentId,
      name: 'عمر فهد السالم (طالب قدرات)',
      email: 'omar.student@almeaa.edu.sa',
      role: Role.STUDENT,
      avatar: '',
      subscription: _freeSub,
      schoolName: 'مدرسة الرواد الثانوية',
      schoolId: schoolId,
      groupIds: [classId],
      academicStage: 'high_school',
      classNumber: 'grade_3',
      points: 3850,
      badges: ['بطل الكمي', 'المواظب الأسبوعي', 'مبتكر الهندسة'],
    },
    {
      id: parentId,
      name: 'الشيخ فهد السالم (ولي الأمر)',
      email: 'fahad.parent@almeaa.edu.sa',
      role: Role.PARENT,
      avatar: '',
      points: 0,
      badges: [],
      subscription: _freeSub,
      phone: '0509988776',
    },
  ];

  // 3. Create School & Class Hierarchy (Groups)
  const simulatedGroups: Group[] = [
    {
      id: schoolId,
      name: 'مدرسة الرواد الثانوية النموذجية',
      type: 'SCHOOL',
      ownerId: adminId,
      supervisorIds: [supervisorId],
      studentIds: [studentId, 'u_stud_peer1', 'u_stud_peer2', 'u_stud_peer3'],
      courseIds: [mockCourseId],
      createdAt: Date.now() - 86400000 * 30,
    },
    {
      id: classId,
      name: 'فصل الموهوبين - قسم القدرات الكمية (3/أ)',
      type: 'CLASS',
      parentId: schoolId,
      ownerId: supervisorId,
      supervisorIds: [supervisorId],
      studentIds: [studentId, 'u_stud_peer1', 'u_stud_peer2', 'u_stud_peer3'],
      courseIds: [mockCourseId],
      createdAt: Date.now() - 86400000 * 15,
    },
  ];

  // 4. Peer Students for Leaderboard & Class Analytics
  const peerUsers: _SimUser[] = [
    { id: 'u_stud_peer1', name: 'أحمد محمود', role: Role.STUDENT, email: 'peer1@almeaa.edu.sa', avatar: '', points: 0, badges: [], subscription: _freeSub },
    { id: 'u_stud_peer2', name: 'سارة عبد الله', role: Role.STUDENT, email: 'peer2@almeaa.edu.sa', avatar: '', points: 0, badges: [], subscription: _freeSub },
    { id: 'u_stud_peer3', name: 'خالد التميمي', role: Role.STUDENT, email: 'peer3@almeaa.edu.sa', avatar: '', points: 0, badges: [], subscription: _freeSub },
  ];

  // 5. Create Teacher's Course & Lessons
  const simulatedCourse: _SimCourse = {
    thumbnail: '',
    progress: 0,
    id: mockCourseId,
    title: 'الدورة الشاملة لتأسيس وتكتيكات القدرات الكمية 2026',
    description: 'دورة تأسيسية متكاملة تضمن لك الوصول لدرجة +95 في القسم الكمي مع نماذج محاكية حديثة.',
    instructor: 'م. أحمد الخالد',
    price: 399,
    currency: 'ر.س',
    duration: 35,
    level: 'Intermediate',
    rating: 4.95,
    category: 'القدرات',
    subject: 'sub_quant',
    features: ['شرح مهارات الجبر والهندسة', 'اختبارات موجهة أسبوعية', 'متابعة مباشرة مع المشرف'],
    isPurchased: true,
    modules: [
      {
        id: 'm_quant_1',
        title: 'الوحدة الأولى: أساسيات الجبر وتكتيكات الحل السريع',
        order: 1,
        lessons: [
          {
            id: 'les_algebra_1',
            title: 'قوانين الأسس والجذور وسرعة التبسيط',
            type: 'video',
            duration: '22:00',
            isCompleted: true,
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            order: 1,
            skillIds: ['sk_algebra_basics'],
          },
          {
            id: 'les_geometry_1',
            title: 'مهارات الهندسة وتطبيقات فيثاغورس',
            type: 'video',
            duration: '30:00',
            isCompleted: false,
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            order: 2,
            skillIds: ['sk_geometry_basics'],
          },
        ],
      },
    ],
  };

  // 6. Create Supervisor's Directed Central Quiz (Exam Hall Test)
  const simulatedQuiz: _SimQuiz = {
    id: mockQuizId,
    title: 'الاختبار المحاكي الموجه - مهارات القدرات الكمية (الفصل الأول)',
    description: 'اختبار محاكي قياسي مصمم من المشرف الأكاديمي لقياس جاهزية الطالب في الجبر والهندسة.',
    pathId: 'p_qudrat',
    subjectId: 'sub_quant',
    mode: 'central',
    targetGroupIds: [classId],
    targetUserIds: [studentId],
    questionIds: ['q_geo_1', 'q_alg_1', 'q_alg_2', 'q_stat_1'],
    timeLimit: 20,
    isPublished: true,
    createdAt: Date.now() - 86400000 * 2,
    authorId: supervisorId,
    placement: 'mock',
    access: { type: 'free' },
    settings: {},
  } as _SimQuiz;

  // 7. Create Student Exam Results for Analytics & Leaderboard
  const simulatedResults: QuizResult[] = [
    {
      userId: studentId,
      quizId: mockQuizId,
      quizTitle: 'الاختبار المحاكي الموجه - مهارات القدرات الكمية (الفصل الأول)',
      score: 85,
      totalQuestions: 10,
      correctAnswers: 8,
      wrongAnswers: 2,
      unanswered: 0,
      timeSpent: '14:20',
      date: new Date(Date.now() - 86400000).toISOString(),
      skillsAnalysis: [
        { skill: 'الجبر والمعادلات', mastery: 90, status: 'strong', recommendation: 'استمرار في حل التمارين المتقدمة' },
        { skill: 'الهندسة والمساحات', mastery: 55, status: 'weak', recommendation: 'مراجعة قوانين الدائرة المثلثات' },
        { skill: 'التناسب والنسب المئوية', mastery: 80, status: 'average', recommendation: 'تعزيز مهارات المسائل الكلامية' },
      ],
      questionReview: [
        { questionId: 'q_alg_1', text: 'إذا كان 2^x = 8 فإن قيمة x تساوي:', options: ['2', '3', '4', '8'], correctOptionIndex: 1, selectedOptionIndex: 1, isCorrect: true },
        { questionId: 'q_geo_1', text: 'مساحة مربع طول قطره 6 سم تساوي:', options: ['12', '18', '36', '24'], correctOptionIndex: 1, selectedOptionIndex: 0, isCorrect: false, explanation: 'المساحة = 0.5 * مربع القطر = 0.5 * 36 = 18' },
      ],
    },
    {
      userId: 'u_stud_peer1',
      quizId: mockQuizId,
      quizTitle: 'الاختبار المحاكي الموجه - مهارات القدرات الكمية (الفصل الأول)',
      score: 95,
      totalQuestions: 10,
      correctAnswers: 9,
      wrongAnswers: 1,
      unanswered: 0,
      timeSpent: '11:15',
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      skillsAnalysis: [{ skill: 'الجبر والمعادلات', mastery: 100, status: 'strong' }],
    },
    {
      userId: 'u_stud_peer2',
      quizId: mockQuizId,
      quizTitle: 'الاختبار المحاكي الموجه - مهارات القدرات الكمية (الفصل الأول)',
      score: 72,
      totalQuestions: 10,
      correctAnswers: 7,
      wrongAnswers: 3,
      unanswered: 0,
      timeSpent: '16:40',
      date: new Date(Date.now() - 86400000 * 3).toISOString(),
      skillsAnalysis: [{ skill: 'الهندسة والمساحات', mastery: 60, status: 'average' }],
    },
    {
      userId: 'u_stud_peer3',
      quizId: mockQuizId,
      quizTitle: 'الاختبار المحاكي الموجه - مهارات القدرات الكمية (الفصل الأول)',
      score: 60,
      totalQuestions: 10,
      correctAnswers: 6,
      wrongAnswers: 4,
      unanswered: 0,
      timeSpent: '18:00',
      date: new Date(Date.now() - 86400000 * 4).toISOString(),
      skillsAnalysis: [{ skill: 'الهندسة والمساحات', mastery: 40, status: 'weak' }],
    },
  ];

  // 8. Create B2B Packages for Admin
  const simulatedPackages: _SimB2BPackage[] = [
    {
      id: 'pkg_b2b_school_unlimited',
      title: 'باقة المدارس الكبرى الشاملة (B2B Enterprise)',
      description: 'باقة مخصصة للمدارس تتيح حسابات غير محدودة للطلاب والمشرفين والمعلمين مع تحليلات ذكية.',
      targetRole: Role.SUPERVISOR,
      features: ['تحليلات المهارات المتقدمة', 'قاعة الاختبارات الموجهة', 'دعم فني خاص', 'تقارير أولياء الأمور'],
      allowedContentTypes: ['tests', 'courses'],
      maxUsers: 500,
      price: 4999,
      durationDays: 365,
      createdAt: Date.now(),
    } as _SimB2BPackage,
  ];


  // 9. Update Store State atomically
  const currentUsers = store.users.filter((u) => !simulatedUsers.some((su) => su.id === u.id) && !peerUsers.some((pu) => pu.id === u.id));
  const currentGroups = store.groups.filter((g) => !simulatedGroups.some((sg) => sg.id === g.id));
  const currentQuizzes = store.quizzes.filter((q) => q.id !== mockQuizId);
  const currentCourses = store.courses.filter((c) => c.id !== mockCourseId);
  const currentResults = store.examResults.filter((r) => r.quizId !== mockQuizId);
  const currentPackages = store.b2bPackages.filter((p) => p.id !== 'pkg_b2b_school_unlimited');

  useStore.setState({
    users: [...simulatedUsers, ...peerUsers, ...currentUsers],
    groups: [...simulatedGroups, ...currentGroups],
    quizzes: [simulatedQuiz as unknown as Quiz, ...currentQuizzes],
    courses: [simulatedCourse, ...currentCourses],
    examResults: [...simulatedResults, ...currentResults],
    b2bPackages: [...simulatedPackages, ...currentPackages],
    user: simulatedUsers[3], // Default active logged-in user is Student (Omar) for immediate testing
  });

  return {
    admin: { name: simulatedUsers[0].name, email: simulatedUsers[0].email, schoolsCount: 1, packagesCount: 1 },
    supervisor: { name: simulatedUsers[1].name, email: simulatedUsers[1].email, schoolName: simulatedGroups[0].name, directedQuizzesCount: 1 },
    teacher: { name: simulatedUsers[2].name, email: simulatedUsers[2].email, coursesCount: 1, questionsCount: 4 },
    student: { name: simulatedUsers[3].name, email: simulatedUsers[3].email, completedQuizzesCount: 1, weakSkills: ['الهندسة والمساحات'] },
    parent: { name: simulatedUsers[4].name, email: simulatedUsers[4].email, linkedStudentName: simulatedUsers[3].name },
  };
};
