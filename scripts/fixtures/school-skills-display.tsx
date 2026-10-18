import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import {ClassSkillGapsRadar} from '../../components/classroom/ClassSkillGapsRadar';
import {ClassroomQuestionFilterBar,type ClassroomFilterState} from '../../components/classroom/ClassroomQuestionFilterBar';
function Fixture(){const[filters,setFilters]=useState<ClassroomFilterState>({pathId:'',subjectId:'',sectionId:'',skillId:'',difficulty:'',search:''});return <MemoryRouter><main dir="rtl" className="mx-auto max-w-5xl p-3"><div data-testid="filters"><ClassroomQuestionFilterBar filters={filters} onChange={setFilters} onReset={()=>setFilters({pathId:'',subjectId:'',sectionId:'',skillId:'',difficulty:'',search:''})} totalCount={9} filteredCount={9}/></div><ClassSkillGapsRadar schoolId="school" assignments={[{assignmentId:'a',classId:'c',className:'الفصل الأول'}]}/></main></MemoryRouter>;}createRoot(document.getElementById('root')!).render(<Fixture/>);
