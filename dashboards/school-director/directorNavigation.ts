import type {DashboardNavItem,DashboardNavGroup} from '../../components/DashboardSectionNav';
export const directorNavGroups:DashboardNavGroup[]=[
  {label:'البداية',ids:['overview']},
  {label:'إدارة المدرسة',ids:['students','classes','teachers']},
  {label:'التعلم والمتابعة',ids:['learning-evidence','assessments','sessions','interventions','reports']},
  {label:'عمليات حساسة',ids:['transfer']},
];
export function directorNavItems(school:{permissions:string[];modules:string[]}):DashboardNavItem[] {
  const can=(permission:string,module?:string)=>school.permissions.includes(permission)&&(!module||school.modules.includes(module));
  return [
    {id:'overview',label:'الملخص العام',visible:can('SCHOOL_OVERVIEW_VIEW')},
    {id:'students',label:'الطلاب',visible:can('SCHOOL_STUDENTS_VIEW')},
    {id:'classes',label:'الفصول',visible:can('SCHOOL_CLASSES_MANAGE','SCHOOL_CORE')},
    {id:'teachers',label:'المعلمون والتكليفات',visible:can('SCHOOL_TEACHERS_ASSIGN','SCHOOL_CORE')},
    {id:'learning-evidence',label:'التعلم والجاهزية',visible:can('SCHOOL_REPORTS_DETAILED_VIEW','SCHOOL_INTELLIGENCE')},
    {id:'assessments',label:'اختبارات المدرسة',visible:can('SCHOOL_ASSESSMENTS_MANAGE','SCHOOL_ASSESSMENTS')},
    {id:'sessions',label:'الحصص الذكية',visible:can('SCHOOL_SMART_CLASSROOM_VIEW','SMART_CLASSROOM')},
    {id:'interventions',label:'الدعم والمهارات',visible:can('SCHOOL_INTERVENTIONS_VIEW','INTERVENTION_CENTER')||can('SCHOOL_INTERVENTIONS_MANAGE','INTERVENTION_CENTER')},
    {id:'reports',label:'التقارير والتصدير',visible:can('SCHOOL_REPORTS_DETAILED_VIEW','SCHOOL_INTELLIGENCE')||can('SCHOOL_REPORTS_EXPORT','EXECUTIVE_ANALYTICS')},
    {id:'transfer',label:'النقل بين المدارس',visible:can('SCHOOL_STUDENTS_TRANSFER_SCHOOL','SCHOOL_CORE')},
  ].filter(item=>item.visible).map(({visible,...item})=>item);
}
