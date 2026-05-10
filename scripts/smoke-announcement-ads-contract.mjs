import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const checks = [
  ['types.ts', ['AnnouncementAd', 'AnnouncementAudience', 'ctaUrl', 'audience']],
  ['server/src/models/AnnouncementAd.ts', ['AnnouncementAdModel', 'imageUrl', 'ctaLabel', 'priority']],
  [
    'server/src/routes/content.routes.ts',
    [
      'announcementAdSchema',
      'announcementAdUpdateSchema',
      'const payload = announcementAdUpdateSchema.parse(req.body)',
      'announcement-ads',
      'announcementAds',
    ],
  ],
  ['services/api.ts', ['createAnnouncementAd', 'updateAnnouncementAd', 'deleteAnnouncementAd', 'announcementAds']],
  ['services/adapter.ts', ['normalizeAnnouncementAd', 'announcementAds']],
  ['store/useStore.ts', ['announcementAds', 'createAnnouncementAd', 'updateAnnouncementAd', 'deleteAnnouncementAd']],
  ['components/AnnouncementAdsOverlay.tsx', ['إغلاق الإعلان', 'DISMISSED_KEY', 'goToTarget', 'visibleAds']],
  ['dashboards/admin/AnnouncementAdsManager.tsx', ['إدارة الإعلانات', 'إعلان جديد', 'handleImageUpload', 'audienceLabels']],
  ['dashboards/admin/AdminDashboard.tsx', ['AnnouncementAdsManager', 'announcement-ads', 'Megaphone']],
  ['App.tsx', ['AnnouncementAdsOverlay', 'announcementAds: contentResult.value.announcementAds']],
  ['server/src/services/learningBackup.ts', ['announcementAds', 'AnnouncementAdModel']],
];

for (const [file, needles] of checks) {
  const source = read(file);
  for (const needle of needles) {
    assert(source.includes(needle), `${file} is missing ${needle}`);
  }
}

const videoPlayer = read('components/CustomVideoPlayer.tsx');
assert(videoPlayer.includes('questionBank.find'), 'Video player must resolve timed questions from the question bank');

const lessonManager = read('dashboards/admin/builders/UnifiedLessonBuilder.tsx');
assert(
  lessonManager.includes('اختيار من بنك الأسئلة') && lessonManager.includes('questionId') && lessonManager.includes('interactiveQuestions'),
  'Lesson manager must keep question-bank references for interactive video questions',
);

console.log('announcement ads and video question-bank contract ok');
