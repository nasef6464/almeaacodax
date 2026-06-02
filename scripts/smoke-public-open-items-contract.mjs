import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function includes(path, text) {
  const content = read(path);
  assert(content.includes(text), `${path} must include: ${text}`);
}

includes('components/MainLayout.tsx', 'to="/about"');
includes('components/MainLayout.tsx', 'to="/contact"');
includes('components/MainLayout.tsx', 'to="/faq"');
includes('components/MainLayout.tsx', 'to="/privacy"');
includes('components/MainLayout.tsx', 'to="/terms"');

includes('App.tsx', 'path="/about"');
includes('App.tsx', 'path="/contact"');
includes('App.tsx', 'path="/faq"');
includes('App.tsx', 'path="/privacy"');
includes('App.tsx', 'path="/terms"');

includes('pages/StaticInfoPage.tsx', "title: 'من نحن'");
includes('pages/StaticInfoPage.tsx', "title: 'تواصل معنا'");
includes('pages/StaticInfoPage.tsx', "title: 'الأسئلة الشائعة'");
includes('pages/StaticInfoPage.tsx', "title: 'سياسة الخصوصية'");
includes('pages/StaticInfoPage.tsx', "title: 'الشروط والأحكام'");

includes('pages/Blog.tsx', 'aria-label={`فتح المقال ${entry.title}`}');
includes('pages/Cart.tsx', 'إتمام الدفع الآن');
includes('pages/Cart.tsx', 'شراء الآن');
includes('pages/QuizPage.tsx', 'التالي');
includes('pages/QuizPage.tsx', 'السابق');

console.log('Public open-items contract passed: footer, static info pages, blog links, cart checkout, and quiz navigation are covered.');
