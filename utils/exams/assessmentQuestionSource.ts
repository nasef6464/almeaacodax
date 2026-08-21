import { api } from '../../services/api';
import type { Question } from '../../types';

export type AssessmentQuestionFilters = {
  pathId?: string;
  subjectId?: string;
  sectionId?: string;
  skillId?: string;
  search?: string;
  approvalStatus?: string;
};

export type AssessmentQuestionPageRequest = AssessmentQuestionFilters & {
  page?: number;
  limit?: number;
};

export type AssessmentQuestionPage = {
  questions: Question[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
};

export type AssessmentQuestionCollection = {
  questions: Question[];
  total: number;
};

export type AssessmentQuestionHydration = {
  questions: Question[];
  missingIds: string[];
  duplicateIds: string[];
};

type QuestionPageResponse = {
  data?: unknown[];
  pagination?: {
    total?: number;
    page?: number;
    totalPages?: number;
    hasNext?: boolean;
  };
};

export type AssessmentQuestionSourceClient = {
  getQuestionsPaginated: (params: {
    page?: number;
    limit?: number;
    ids?: string;
    pathId?: string;
    subject?: string;
    sectionId?: string;
    skillId?: string;
    search?: string;
    approvalStatus?: string;
    noTotal?: boolean;
  }) => Promise<QuestionPageResponse>;
};

// Must stay aligned with questionListQuerySchema.limit.max(100) on the API.
const MAX_PAGE_LIMIT = 100;
const DEFAULT_PAGE_LIMIT = MAX_PAGE_LIMIT;
const HYDRATE_CHUNK_SIZE = MAX_PAGE_LIMIT;

export const normalizeAssessmentQuestion = (value: unknown): Question => {
  const question = (value || {}) as Record<string, unknown>;
  return {
    ...question,
    id: String(question.id || question._id || ''),
    text: String(question.text || ''),
    options: Array.isArray(question.options) ? question.options.map(String) : [],
    correctOptionIndex: Number(question.correctOptionIndex ?? 0),
    explanation: question.explanation ? String(question.explanation) : '',
    videoUrl: question.videoUrl ? String(question.videoUrl) : undefined,
    imageUrl: question.imageUrl ? String(question.imageUrl) : undefined,
    skillIds: Array.isArray(question.skillIds) ? question.skillIds.map(String) : [],
    pathId: question.pathId ? String(question.pathId) : undefined,
    subject: String(question.subject || question.subjectId || ''),
    sectionId: question.sectionId ? String(question.sectionId) : undefined,
    difficulty: (question.difficulty || 'Medium') as Question['difficulty'],
    type: (question.type || 'mcq') as Question['type'],
  } as Question;
};

const uniqueWithDuplicates = (ids: string[]) => {
  const unique: string[] = [];
  const seen = new Set<string>();
  const duplicateIds = new Set<string>();

  ids.forEach((rawId) => {
    const id = String(rawId || '').trim();
    if (!id) return;
    if (seen.has(id)) {
      duplicateIds.add(id);
      return;
    }
    seen.add(id);
    unique.push(id);
  });

  return { unique, duplicateIds: Array.from(duplicateIds) };
};

const chunk = <T>(items: T[], size: number) => {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

export const createAssessmentQuestionSource = (client: AssessmentQuestionSourceClient) => ({
  /**
   * المصدر القانوني للبحث داخل بنك الأسئلة. البحث Paginated ولا يفترض أن أول
   * 100/300 سؤال يمثل البنك كله.
   */
  async searchPage(request: AssessmentQuestionPageRequest = {}): Promise<AssessmentQuestionPage> {
    const page = Math.max(1, Number(request.page || 1));
    const limit = Math.max(1, Math.min(MAX_PAGE_LIMIT, Number(request.limit || DEFAULT_PAGE_LIMIT)));
    const response = await client.getQuestionsPaginated({
      page,
      limit,
      pathId: request.pathId,
      subject: request.subjectId,
      sectionId: request.sectionId,
      skillId: request.skillId,
      search: request.search,
      approvalStatus: request.approvalStatus,
    });

    const questions = (Array.isArray(response?.data) ? response.data : [])
      .map(normalizeAssessmentQuestion)
      .filter((question) => Boolean(question.id));
    const total = Number(response?.pagination?.total ?? questions.length);
    const resolvedPage = Math.max(1, Number(response?.pagination?.page ?? page));
    const totalPages = Math.max(1, Number(response?.pagination?.totalPages ?? (Math.ceil(total / limit) || 1)));
    const hasNext = Boolean(response?.pagination?.hasNext ?? resolvedPage < totalPages);

    return { questions, total, page: resolvedPage, totalPages, hasNext };
  },

  /**
   * Compatibility collection loader for runtime callers that still expect the
   * whole current scope in memory. It follows server pagination until the end,
   * with no fixed page-count cap. New large-bank UIs should prefer searchPage().
   */
  async loadAll(request: AssessmentQuestionFilters = {}): Promise<AssessmentQuestionCollection> {
    const byId = new Map<string, Question>();
    let requestedPage = 1;
    let total = 0;

    while (true) {
      const result = await this.searchPage({ ...request, page: requestedPage, limit: MAX_PAGE_LIMIT });
      result.questions.forEach((question) => byId.set(question.id, question));
      total = result.total;

      if (!result.hasNext || result.page >= result.totalPages) break;

      const nextPage = result.page + 1;
      // Defensive guard against a malformed pagination response returning the
      // same/previous page forever. This is not a bank-size cap.
      if (nextPage <= requestedPage) break;
      requestedPage = nextPage;
    }

    return {
      questions: Array.from(byId.values()),
      total,
    };
  },

  /**
   * يجلب الأسئلة المختارة سابقًا بالـIDs مباشرة، حتى لو لم تكن في الصفحة أو
   * الفلتر الحالي. لا يفرض approvalStatus هنا حتى يمكن إظهار بيانات اختبار قديم
   * وتشخيص السؤال الذي تغيّرت حالته بدل إخفائه بصمت.
   */
  async hydrateByIds(ids: string[]): Promise<AssessmentQuestionHydration> {
    const { unique, duplicateIds } = uniqueWithDuplicates(ids);
    if (unique.length === 0) {
      return { questions: [], missingIds: [], duplicateIds };
    }

    const byId = new Map<string, Question>();
    for (const idsChunk of chunk(unique, HYDRATE_CHUNK_SIZE)) {
      const response = await client.getQuestionsPaginated({
        page: 1,
        limit: idsChunk.length,
        ids: idsChunk.join(','),
        noTotal: true,
      });
      (Array.isArray(response?.data) ? response.data : [])
        .map(normalizeAssessmentQuestion)
        .filter((question) => Boolean(question.id))
        .forEach((question) => byId.set(question.id, question));
    }

    const questions = unique.map((id) => byId.get(id)).filter(Boolean) as Question[];
    const missingIds = unique.filter((id) => !byId.has(id));
    return { questions, missingIds, duplicateIds };
  },

  /**
   * Validation غير مدمرة: تعيد كل ما أمكن حله مع missing/duplicate diagnostics.
   * صلاحية المحتوى النهائية والنشر تبقى مسؤولية Backend integrity guard.
   */
  async validateSelection(ids: string[]): Promise<AssessmentQuestionHydration> {
    return this.hydrateByIds(ids);
  },
});

export const assessmentQuestionSource = createAssessmentQuestionSource(api);
