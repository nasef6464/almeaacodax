import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFileSync, readdirSync } from 'node:fs';
import { build } from 'esbuild';
import { chromium } from 'playwright';

// Exercise the real extracted components with parent-owned state and actions.
const bundle = await build({
  stdin: {
    resolveDir: process.cwd(), loader: 'tsx', contents: `
import React from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {StaffDecisionPanel} from './pages/Reports/StaffDecisionPanel';
import {DirectedAssessmentReportPanel} from './pages/Reports/DirectedAssessmentReportPanel';
import {StaffRemediationPanel} from './pages/Reports/StaffRemediationPanel';
import {ScopedRecentAttemptsPanel} from './pages/Reports/ScopedRecentAttemptsPanel';
const root=createRoot(document.getElementById('root'));
window.calls=[];
const action=name=>()=>window.calls.push(name);
const skill={skill:'التناسب',mastery:25,affectedStudents:2,attempts:4};
const student={name:'طالب متابعة',averageScore:40,weakSkillCount:1};
const common={scopedAnalytics:{weakestSkills:[skill]},scopedLeadSkill:skill,scopedLeadStudent:student,scopedSmartRemediationLoading:false,buildScopedSmartRemediation:action('create')};
function Harness({role='supervisor',empty=false,pending=false,error=false,created=false}) {
 const [selected,setSelected]=React.useState('all');
 return <MemoryRouter><main dir="rtl">
 <StaffDecisionPanel {...common} user={{role}}
 weakestScopedGroup={{groupName:'الفصل الضعيف',averageScore:30,weakStudentCount:2,attempts:3}}
 strongestScopedGroup={{groupName:'الفصل القوي',averageScore:90,weakStudentCount:0,attempts:3}}
 institutionalReportHub={['student','parent'].includes(role)?null:{roleLabel:'المشرف',nextAction:'متابعة مهارة',targetLine:'طلاب الفصل',followUpLink:'/tests',studentsLink:'/students',alertLink:'/alerts',alertText:'تنبيه'}}
 scopedStudentFocusCards={empty?[]:[student]} scopedInterventionPlanCreated={created}
 scopedInterventionPlanError={error?'تعذر إنشاء الخطة':''} copiedInstitutionalAlert={created}
 canSendInterventionAlert={!empty} interventionAlertSending={pending} interventionAlertSent={created}
 interventionAlertError={error?'تعذر إرسال التنبيه':''}
 downloadPerformanceWorkbook={action('performance')} downloadScopedStudentsWorkbook={action('students')}
 copyInstitutionalAlert={action('alert-copy')} sendInterventionAlert={action('send')}/>
 <DirectedAssessmentReportPanel user={{role}} directedFollowUpOptions={[{id:'q1',title:'اختبار الكمي'}]}
 selectedFollowUpQuizId={selected} setSelectedFollowUpQuizId={value=>{window.calls.push('select:'+value);setSelected(value)}}
 directedQuizAnalysisResults={empty?[]:[{id:'r'}]} directedQuizSkillAnalysis={[skill]}
 directedQuizStudentAnalysis={[{result:{id:'r'},studentName:student.name,score:40,weakSkills:[skill]}]}
 directedQuizSummary={{title:selected==='q1'?'اختبار الكمي':'كل الاختبارات',attempts:1,averageScore:40,needsFollowUp:1}}
 downloadDirectedQuizAnalysisWorkbook={action('directed')}/>
 <section id="remediation"><StaffRemediationPanel {...common} scopedLeadSubject={null}
 scopedFollowUpSummary="ملخص المتابعة" scopedInterventionPlan={[]}
 scopedSmartRemediation={{title:'الخطة العلاجية',summary:'قياس بعد التدريب',steps:[]}}
 copiedScopedSummary={created} sharedScopedSummary={created} copyScopedSummary={action('summary-copy')}
 shareScopedSummary={action('share')} copyLeadStudentSummary={action('student-copy')}/></section>
 <ScopedRecentAttemptsPanel skills={[]} scopedAnalytics={{weakestStudents:[]}}
 scopedLatestResults={empty?[]:[{id:'recent',userId:'student-1',studentName:'طالب المحاولة',quizTitle:'قياس سابق',score:67,correctAnswers:2,totalQuestions:3,skillsAnalysis:[skill]}]}/>
 </main></MemoryRouter>;
}
window.renderFixture=props=>root.render(<Harness key={JSON.stringify(props)} {...props}/>);
window.renderFixture({});`
  }, bundle: true, write: false,
});
const server = createServer((_req, res) => res.end('<html><body><div id="root"></div></body></html>'));
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const styles = readdirSync('dist/assets').filter(file => file.endsWith('.css'));
  assert.ok(styles.length, 'Production build CSS is required for responsive verification');
  for (const file of styles) await page.addStyleTag({ content: readFileSync(`dist/assets/${file}`, 'utf8') });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const render = async props => {
    await page.evaluate(async props => {
      window.renderFixture(props);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }, props);
    await page.getByText('ملخص المتابعة', { exact: true }).waitFor();
  };
  for (const role of ['supervisor', 'teacher', 'school_admin', 'admin']) {
    await render({ role });
    await page.getByText('الفصل الضعيف', { exact: true }).waitFor();
    assert.equal(await page.getByText('الفصل القوي', { exact: true }).count(), 1);
    await page.getByTestId('directed-quiz-analysis-export').waitFor();
  }
  await page.locator('select').selectOption('q1');
  await page.getByText('طالب المحاولة', { exact: true }).waitFor();
  assert.equal(await page.getByText('67%', { exact: true }).count(), 1);
  const followUp = page.getByRole('link', { name: 'اختبار متابعة', exact: true }).last();
  assert.match(await followUp.getAttribute('href'), /targetUserId=student-1/);
  await page.getByText('اختبار الكمي', { exact: true }).last().waitFor();
  assert.equal(await page.locator('select').inputValue(), 'q1');
  for (const id of ['staff-intervention-create', 'staff-management-export', 'staff-students-export', 'staff-intervention-alert-send', 'directed-quiz-analysis-export']) {
    await page.getByTestId(id).click();
  }
  await page.getByRole('button', { name: 'نسخ تنبيه', exact: true }).click();
  await page.locator('#remediation').getByRole('button', { name: 'نسخ', exact: true }).first().click();
  await page.locator('#remediation').getByRole('button', { name: 'نسخ', exact: true }).nth(1).click();
  await page.locator('#remediation').getByRole('button', { name: 'مشاركة', exact: true }).click();
  assert.deepEqual(await page.evaluate(() => window.calls), ['select:q1', 'create', 'performance', 'students', 'send', 'directed', 'alert-copy', 'summary-copy', 'student-copy', 'share']);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow at ${width}px`);
  }
  await render({ pending: true, error: true });
  assert.equal(await page.getByTestId('staff-intervention-alert-send').isDisabled(), true);
  await page.getByRole('alert').getByText('تعذر إرسال التنبيه').waitFor();
  await page.getByRole('status').getByText('تعذر إنشاء الخطة').waitFor();
  await render({ created: true });
  await page.getByRole('status').getByText(/تم إنشاء خطة علاج/).waitFor();
  await page.getByRole('button', { name: 'تم الإرسال', exact: true }).waitFor();
  await render({ empty: true });
  for (const id of ['directed-quiz-analysis-export', 'staff-students-export', 'staff-intervention-alert-send']) {
    assert.equal(await page.getByTestId(id).isDisabled(), true);
  }
  await page.getByText(/لا توجد محاولات مسجلة لهذا الاختبار/).waitFor();
  await page.getByText(/لا توجد محاولات حديثة داخل هذا النطاق/).waitFor();
  for (const role of ['student', 'parent']) {
    await render({ role });
    assert.equal(await page.getByTestId('staff-intervention-create').count(), 0);
    assert.equal(await page.getByTestId('directed-quiz-analysis-export').count(), 0);
    assert.equal(await page.getByText('مركز متابعة مؤسسي', { exact: true }).count(), 0);
  }
  assert.deepEqual(errors, []);
  console.log('PASS actual staff panels: four staff roles, student/parent visibility, parent selector, nine action callbacks, pending/error/success, empty exports, zero page errors');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
