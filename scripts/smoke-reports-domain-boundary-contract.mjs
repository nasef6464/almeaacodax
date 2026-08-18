import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const reports = read('pages/Reports.tsx');
const domain = read('pages/Reports/reportDomain.ts');
const roleContract = read('scripts/smoke-reports-role-contract.mjs');
const globalJourneyContract = read('scripts/smoke-global-student-journey-contract.mjs');

const checks = [];

function check(name, assertion) {
  try {
    assertion();
    checks.push({ name, status: 'PASS' });
  } catch (error) {
    checks.push({ name, status: 'FAIL', details: error instanceof Error ? error.message : String(error) });
  }
}

function assertIncludes(source, fragment, message) {
  if (!source.includes(fragment)) throw new Error(message || `Missing fragment: ${fragment}`);
}

function assertNotIncludes(source, fragment, message) {
  if (source.includes(fragment)) throw new Error(message || `Unexpected fragment: ${fragment}`);
}

check('Reports delegates shared contracts and pure helpers to reportDomain', () => {
  assertIncludes(reports, "from './Reports/reportDomain';");
  assertIncludes(reports, 'type ScopedAnalyticsOverview');
  assertIncludes(reports, 'type StudentReportPeriod');
  assertIncludes(reports, 'filterStudentReportPeriod');
  assertIncludes(reports, 'buildDirectedQuizManagerLink');
  assertIncludes(reports, 'getReportMasteryTone');
  assertNotIncludes(reports, 'interface ScopedAnalyticsOverview {');
  assertNotIncludes(reports, "type StudentReportPeriod = 'month' | 'quarter' | 'all';");
  assertNotIncludes(reports, 'const buildDirectedQuizManagerLink = (context?:');
  assertNotIncludes(reports, 'const getReportMasteryTone = (mastery: number) =>');
});

check('reportDomain owns stable report contracts and utility behavior', () => {
  assertIncludes(domain, 'export interface ScopedAnalyticsOverview');
  assertIncludes(domain, 'export interface ScopedQuizResult');
  assertIncludes(domain, 'export interface StudentAggregatedSkill');
  assertIncludes(domain, "export type StudentReportPeriod = 'month' | 'quarter' | 'all';");
  assertIncludes(domain, 'export const filterStudentReportPeriod');
  assertIncludes(domain, 'export const buildSkillSessionLink');
  assertIncludes(domain, 'export const buildDirectedQuizManagerLink');
  assertIncludes(domain, 'export const getReportMasteryTone');
  assertIncludes(domain, 'export const scoreTone');
  assertIncludes(domain, 'export interface SkillRecommendation');
  assertIncludes(domain, 'export interface SmartRemediationPlan');
});

check('reportDomain remains pure and independent from React, store, API, browser and XLSX', () => {
  assertNotIncludes(domain, "from 'react'");
  assertNotIncludes(domain, 'useStore');
  assertNotIncludes(domain, "from '../../services/api'");
  assertNotIncludes(domain, 'api.');
  assertNotIncludes(domain, 'window.');
  assertNotIncludes(domain, 'document.');
  assertNotIncludes(domain, 'loadXlsx');
});

check('existing source contracts follow the new reporting ownership', () => {
  assertIncludes(roleContract, "../pages/Reports/reportDomain.ts");
  assertIncludes(globalJourneyContract, "../pages/Reports/reportDomain.ts");
});

check('domain extraction materially reduces Reports without creating a new hotspot', () => {
  const reportLines = reports.split('\n').length;
  const domainLines = domain.split('\n').length;
  if (domainLines > 260) throw new Error(`reportDomain exceeded 260 lines: ${domainLines}`);
  if (reportLines <= domainLines) throw new Error(`Unexpected Reports/domain sizes: Reports=${reportLines}, domain=${domainLines}`);
});

const failed = checks.filter((item) => item.status === 'FAIL');
const result = {
  phase: 'reports-domain-boundary',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  reportsLines: reports.split('\n').length,
  domainLines: domain.split('\n').length,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) process.exit(1);
