import fs from 'node:fs';
import path from 'node:path';

const targetPath = path.resolve('pages/Quizzes.tsx');
let source = fs.readFileSync(targetPath, 'utf8');

const installedMarker = 'data-testid="student-assigned-barcode-tests"';
const insertionMarker = '      {/* Directed Tests (Exam Hall) Section */}';

if (source.includes(installedMarker)) {
  console.log('Assigned barcode tests section already present; no changes needed.');
  process.exit(0);
}

const markerCount = source.split(insertionMarker).length - 1;
if (markerCount !== 1) {
  throw new Error(`Expected exactly one directed-tests insertion marker, found ${markerCount}.`);
}

const block = `      {user.role === 'student' && !isAttemptsView && (assignedBarcodeTestsLoading || assignedBarcodeTests.length > 0) ? (\n        <section\n          data-testid="student-assigned-barcode-tests"\n          className="rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-sky-50 p-5 shadow-sm"\n        >\n          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">\n            <div>\n              <h2 className="text-lg font-black text-gray-900">اختبارات مباشرة موجهة لك</h2>\n              <p className="mt-1 text-xs font-bold leading-6 text-gray-500">\n                اختبارات QR أو باركود أرسلها لك المعلم أو المشرف مباشرة.\n              </p>\n            </div>\n            <span className="self-start rounded-full bg-white px-3 py-1 text-xs font-black text-cyan-700 shadow-sm sm:self-auto">\n              {assignedBarcodeTestsLoading ? 'جاري التحديث…' : String(assignedBarcodeTests.length) + ' اختبار'}\n            </span>\n          </div>\n\n          {assignedBarcodeTestsLoading ? (\n            <div className="rounded-xl border border-cyan-100 bg-white/80 px-4 py-5 text-sm font-bold text-gray-500">\n              جاري تحميل الاختبارات الموجهة…\n            </div>\n          ) : (\n            <div className="grid gap-3 md:grid-cols-2">\n              {assignedBarcodeTests.map((test) => (\n                <div key={test.id || test.slug} className="rounded-xl border border-cyan-100 bg-white p-4 shadow-sm">\n                  <div className="flex items-start justify-between gap-3">\n                    <div className="min-w-0">\n                      <div className="font-black text-gray-900">{test.title}</div>\n                      {test.description ? (\n                        <p className="mt-1 line-clamp-2 text-xs font-bold leading-5 text-gray-500">{test.description}</p>\n                      ) : null}\n                    </div>\n                    <span className="shrink-0 rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-black text-cyan-700">\n                      {test.testKind === 'mock' ? 'محاكي' : 'مباشر'}\n                    </span>\n                  </div>\n\n                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-gray-500">\n                    {typeof test.questionCount === 'number' ? <span>{test.questionCount} سؤال</span> : null}\n                    {test.settings?.timeLimit ? <span>{test.settings.timeLimit} دقيقة</span> : null}\n                  </div>\n\n                  <Link\n                    to={'/barcode-test/' + encodeURIComponent(test.slug)}\n                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-cyan-800"\n                  >\n                    <Target size={16} />\n                    دخول الاختبار\n                  </Link>\n                </div>\n              ))}\n            </div>\n          )}\n        </section>\n      ) : null}\n\n`;

source = source.replace(insertionMarker, `${block}${insertionMarker}`);

if (!source.includes(installedMarker)) throw new Error('Barcode section marker missing after edit.');
if (!source.includes('api.listAssignedPublicBarcodeTests()')) throw new Error('Assigned barcode API loader disappeared.');
if (!source.includes("to={'/barcode-test/' + encodeURIComponent(test.slug)}")) throw new Error('Barcode route action missing after edit.');
if (!source.includes('اختبارات مباشرة موجهة لك')) throw new Error('Student-facing barcode heading missing after edit.');

fs.writeFileSync(targetPath, source, 'utf8');
console.log('Installed assigned barcode tests section in student quiz center.');
