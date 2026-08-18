import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

const reports = read('pages/Reports.tsx');
const domain = read('pages/Reports/reportDomain.ts');
const reportTypes = read('pages/Reports/reportTypes.ts');
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

check('Reports delegates shared contracts and pure helpers through reportDomain', () => {
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

check('reportTypes owns stable reporting contracts only', () => {
  assertIncludes(reportTypes, 'export interface ScopedAnalyticsOverview');
  assertIncludes(reportTypes, 'export interface ScopedQuizResult');
  assertIncludes(reportTypes, 'export interface StudentAggregatedSkill');
  assertIncludes(reportTypes, "export type StudentReportPeriod = 'month' | 'quarter' | 'all';");
  assertIncludes(reportTypes, 'export interface SkillRecommendation');
  assertIncludes(reportTypes, 'export interface SmartRemediationPlan');
  assertNotIncludes(reportTypes, 'export const ');
  assertNotIncludes(reportTypes, "from 'react'");
  assertNotIncludes(reportTypes, 'useStore');
  assertNotIncludes(reportTypes, "from '../../services/api'");
});

check('reportDomain is the compatibility facade and owns pure report behavior', () => {
  assertIncludes(domain, "from './reportTypes';");
  assertIncludes(domain, 'export type {');
  assertIncludes(domain, 'ScopedAnalyticsOverview,');
  assertIncludes(domain, 'StudentReportPeriod,');
  assertIncludes(domain, 'export const filterStudentReportPeriod');
  assertIncludes(domain, 'export const buildSkillSessionLink');
  assertIncludes(domain, 'export const buildDirectedQuizManagerLink');
  assertIncludes(domain, 'export const getReportMasteryTone');
  assertIncludes(domain, 'export const scoreTone');
  assertNotIncludes(domain, 'export interface ScopedAnalyticsOverview');
  assertNotIncludes(domain, 'export interface SkillRecommendation');
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

check('existing source contracts keep using the stable reportDomain facade', () => {
  assertIncludes(roleContract, "../pages/Reports/reportDomain.ts");
  assertIncludes(globalJourneyContract, "../pages/Reports/reportDomain.ts");
});

check('report support files remain bounded and smaller than Reports', () => {
  const reportLines = reports.split('\n').length;
  const domainLines = domain.split('\n').length;
  const typeLines = reportTypes.split('\n').length;
  if (domainLines > 170) throw new Error(`reportDomain exceeded 170 lines: ${domainLines}`);
  if (typeLines > 140) throw new Error(`reportTypes exceeded 140 lines: ${typeLines}`);
  if ((domainLines + typeLines) > 300) throw new Error(`Report support surface exceeded 300 lines: ${domainLines + typeLines}`);
  if (reportLines <= domainLines + typeLines) {
    throw new Error(`Unexpected Reports/support sizes: Reports=${reportLines}, support=${domainLines + typeLines}`);
  }
});

const failed = checks.filter((item) => item.status === 'FAIL');
const result = {
  phase: 'reports-domain-boundary',
  status: failed.length === 0 ? 'PASS' : 'FAIL',
  reportsLines: reports.split('\n').length,
  domainLines: domain.split('\n').length,
  typeLines: reportTypes.split('\n').length,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length > 0) process.exit(1);
