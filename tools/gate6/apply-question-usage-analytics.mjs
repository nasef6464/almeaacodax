import { readFile, writeFile } from "node:fs/promises";

const file = new URL("../../dashboards/admin/QuestionBankManager.tsx", import.meta.url);
let source = await readFile(file, "utf8");

const replaceOnce = (label, before, after) => {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing transform anchor: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`Ambiguous transform anchor: ${label}`);
  source = `${source.slice(0, first)}${after}${source.slice(first + before.length)}`;
};

replaceOnce(
  "analytics type import",
  "import { api } from '../../services/api';",
  "import { api } from '../../services/api';\nimport type { QuestionUsageMetric } from '../../services/apiGroups/questionsApi';",
);

replaceOnce(
  "analytics state",
  "  const [questionsRefreshKey, setQuestionsRefreshKey] = useState(0);",
  "  const [questionsRefreshKey, setQuestionsRefreshKey] = useState(0);\n  const [questionUsageById, setQuestionUsageById] = useState<Record<string, QuestionUsageMetric>>({});\n  const [isLoadingQuestionUsage, setIsLoadingQuestionUsage] = useState(false);\n  const [questionUsageError, setQuestionUsageError] = useState<string | null>(null);",
);

replaceOnce(
  "analytics load effect",
  "  const displayedQuestions = pagedQuestions ?? filteredQuestions;\n  const refreshPagedQuestions = () => setQuestionsRefreshKey((key) => key + 1);",
  `  const displayedQuestions = pagedQuestions ?? filteredQuestions;\n  const refreshPagedQuestions = () => setQuestionsRefreshKey((key) => key + 1);\n\n  useEffect(() => {\n    let active = true;\n    const questionIds = Array.from(\n      new Set(\n        displayedQuestions\n          .map((question) => String(question.id || (question as Question & { _id?: string })._id || '').trim())\n          .filter(Boolean),\n      ),\n    ).slice(0, 100);\n\n    if (questionIds.length === 0) {\n      setQuestionUsageById({});\n      setQuestionUsageError(null);\n      setIsLoadingQuestionUsage(false);\n      return () => {\n        active = false;\n      };\n    }\n\n    setIsLoadingQuestionUsage(true);\n    setQuestionUsageError(null);\n\n    void api.getQuestionUsageAnalytics(questionIds)\n      .then((response) => {\n        if (!active) return;\n        const nextMetrics: Record<string, QuestionUsageMetric> = {};\n        (response.data || []).forEach((metric) => {\n          const aliases = metric.aliases?.length ? metric.aliases : [metric.questionId];\n          aliases.filter(Boolean).forEach((alias) => {\n            nextMetrics[String(alias)] = metric;\n          });\n        });\n        setQuestionUsageById(nextMetrics);\n      })\n      .catch((error) => {\n        if (!active) return;\n        setQuestionUsageById({});\n        setQuestionUsageError(error instanceof Error ? error.message : 'تعذر تحميل مؤشرات استخدام الأسئلة الآن.');\n      })\n      .finally(() => {\n        if (active) setIsLoadingQuestionUsage(false);\n      });\n\n    return () => {\n      active = false;\n    };\n  }, [displayedQuestions]);`,
);

replaceOnce(
  "analytics error notice",
  "      <div className=\"bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden\">",
  `      {questionUsageError && (\n        <div className=\"rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700\">\n          تعذر تحميل مؤشرات الاستخدام لهذه الصفحة الآن. إدارة الأسئلة نفسها ما زالت متاحة: {questionUsageError}\n        </div>\n      )}\n\n      <div className=\"bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden\">`,
);

replaceOnce(
  "analytics table header",
  "                <th className=\"px-6 py-4 text-sm font-bold text-gray-600\">الصعوبة</th>\n                <th className=\"px-6 py-4 text-sm font-bold text-gray-600\">الحالة</th>",
  "                <th className=\"px-6 py-4 text-sm font-bold text-gray-600\">الصعوبة</th>\n                <th className=\"px-6 py-4 text-sm font-bold text-gray-600\">الاستخدام والأداء</th>\n                <th className=\"px-6 py-4 text-sm font-bold text-gray-600\">الحالة</th>",
);

replaceOnce(
  "analytics row metric",
  "                const hasMediaPreview = Boolean(question.imageUrl) || hasInlineMedia;\n                return (",
  "                const hasMediaPreview = Boolean(question.imageUrl) || hasInlineMedia;\n                const questionIdentity = String(question.id || (question as Question & { _id?: string })._id || '');\n                const usageMetric = questionUsageById[questionIdentity];\n                return (",
);

replaceOnce(
  "analytics row cell",
  `                    <td className=\"px-6 py-4\">\n                      <span\n                        className={\`px-2 py-1 rounded-full text-xs font-bold \${\n                          question.difficulty === 'Easy'\n                            ? 'bg-emerald-50 text-emerald-600'\n                            : question.difficulty === 'Medium'\n                              ? 'bg-amber-50 text-amber-600'\n                              : 'bg-red-50 text-red-600'\n                        }\`}\n                      >\n                        {difficultyLabel(question.difficulty)}\n                      </span>\n                    </td>\n                    <td className=\"px-6 py-4\">\n                      <span className={\`px-2 py-1 rounded-full text-xs font-bold \${statusMeta.className}\`}>{statusMeta.label}</span>\n                    </td>`,
  `                    <td className=\"px-6 py-4\">\n                      <span\n                        className={\`px-2 py-1 rounded-full text-xs font-bold \${\n                          question.difficulty === 'Easy'\n                            ? 'bg-emerald-50 text-emerald-600'\n                            : question.difficulty === 'Medium'\n                              ? 'bg-amber-50 text-amber-600'\n                              : 'bg-red-50 text-red-600'\n                        }\`}\n                      >\n                        {difficultyLabel(question.difficulty)}\n                      </span>\n                    </td>\n                    <td className=\"px-6 py-4\">\n                      {usageMetric ? (\n                        <div className=\"min-w-[150px] space-y-1 text-xs font-bold text-gray-600\">\n                          <div>المحاولات: <span className=\"text-gray-900\">{usageMetric.attempts.toLocaleString('ar-EG')}</span></div>\n                          <div>الدقة: <span className=\"text-gray-900\">{usageMetric.accuracyPercent === null ? 'لا توجد بيانات' : \`\${usageMetric.accuracyPercent}%\`}</span></div>\n                          <div>متوسط الوقت: <span className=\"text-gray-900\">{usageMetric.averageTimeSeconds === null ? 'لا توجد بيانات' : \`\${usageMetric.averageTimeSeconds} ث\`}</span></div>\n                        </div>\n                      ) : (\n                        <span className=\"text-xs font-bold text-gray-400\">\n                          {isLoadingQuestionUsage ? 'جارٍ التحميل...' : 'لا توجد محاولات'}\n                        </span>\n                      )}\n                    </td>\n                    <td className=\"px-6 py-4\">\n                      <span className={\`px-2 py-1 rounded-full text-xs font-bold \${statusMeta.className}\`}>{statusMeta.label}</span>\n                    </td>`,
);

replaceOnce(
  "empty table colspan",
  "                  <td colSpan={5} className=\"px-6 py-8 text-center text-gray-500\">",
  "                  <td colSpan={6} className=\"px-6 py-8 text-center text-gray-500\">",
);

await writeFile(file, source, "utf8");
console.log("Applied Gate 6 question usage analytics UI patch.");
