import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const [
  lessonBuilder,
  lessonModel,
  learningSchemas,
  envRuntime,
  productionEnvExample,
  hostingerEnvExample,
  environmentDocs,
  featureAudit,
  hostingerReadme,
  backupUploads,
] = await Promise.all([
  read('dashboards/admin/builders/UnifiedLessonBuilder.tsx'),
  read('server/src/models/Lesson.ts'),
  read('server/src/modules/content/http/learningContentSchemas.ts'),
  read('server/src/config/env.ts'),
  read('server/.env.production.example'),
  read('deploy/hostinger/env.backend.example'),
  read('docs/ENVIRONMENT.md'),
  read('docs/FEATURE_ACTIVATION_AUDIT.md'),
  read('deploy/hostinger/README.md'),
  read('scripts/backup-uploads.sh'),
]);

const assertIncludes = (source, expected, label) => {
  if (!source.includes(expected)) {
    throw new Error(`${label}: missing expected contract marker: ${expected}`);
  }
};

const assertExcludes = (source, forbidden, label) => {
  if (source.includes(forbidden)) {
    throw new Error(`${label}: forbidden stale capability claim/config remains: ${forbidden}`);
  }
};

assertIncludes(lessonBuilder, '<option value="upload">رابط مباشر / CDN</option>', 'lesson builder direct URL presentation');
assertIncludes(lessonBuilder, 'هذا المسار لا يرفع ملف فيديو إلى الخادم', 'lesson builder capability disclosure');
assertExcludes(lessonBuilder, '<option value="upload">رفع مباشر</option>', 'lesson builder fake direct-upload claim');

// Historical compatibility remains intact: the stored enum value is not renamed or migrated in O-01.
assertIncludes(lessonModel, 'enum: ["upload", "youtube", "vimeo"]', 'persisted lesson compatibility');
assertIncludes(learningSchemas, 'z.enum(["upload", "youtube", "vimeo"])', 'lesson API compatibility');

for (const [label, source] of [
  ['backend runtime env schema', envRuntime],
  ['server production env example', productionEnvExample],
  ['Hostinger backend env example', hostingerEnvExample],
]) {
  assertExcludes(source, 'MAX_UPLOAD_SIZE', label);
}
assertExcludes(envRuntime, 'UPLOAD_DIR', 'backend runtime env schema');
assertExcludes(productionEnvExample, 'UPLOAD_DIR=', 'server production env example');
assertExcludes(hostingerEnvExample, 'UPLOAD_DIR=', 'Hostinger backend env example');

assertIncludes(environmentDocs, 'stores lesson/library media references as URLs', 'environment media contract');
assertIncludes(environmentDocs, '`UPLOAD_DIR` is only an operations-script override', 'environment operations distinction');
assertIncludes(featureAudit, 'First-party binary upload ingestion is NOT IMPLEMENTED', 'feature activation classification');
assertExcludes(featureAudit, 'Uploads: ENABLED/PARTIAL', 'feature activation stale upload claim');
assertIncludes(hostingerReadme, 'does not expose first-party binary upload ingestion', 'Hostinger deployment contract');
assertIncludes(hostingerReadme, 'lesson media playback from configured direct/CDN/YouTube/Vimeo URLs', 'Hostinger verification contract');
assertExcludes(hostingerReadme, 'Upload failures: confirm `UPLOAD_DIR` ownership', 'Hostinger stale upload troubleshooting');

// Upload-directory backup/restore tooling remains available for deployments that separately own filesystem media.
assertIncludes(backupUploads, 'UPLOAD_DIR="${UPLOAD_DIR:-server/uploads}"', 'upload backup script override');

console.log('Gate 6 media reference contract: PASS');
