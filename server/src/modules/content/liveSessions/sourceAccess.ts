import mongoose from 'mongoose';
import { CourseModel } from '../../../models/Course.js';
import { LessonModel } from '../../../models/Lesson.js';
import { hasCourseEntitlementFromState, loadEntitlementState } from '../../../services/entitlementPolicy.js';
import { withLearnerVisiblePaths } from '../../../services/visibility.js';
import { canAccessSession } from './sessionPolicy.js';
import type { SessionActor } from './contracts.js';

// One bounded read per content kind, rather than an entitlement query per card.
export async function loadSessionAccess(actor: SessionActor | undefined, items: any[]) {
  const courseIds=Array.from(new Set(items.filter(item=>item.audience.kind==='course').map(item=>String(item.audience.courseId))));
  const lessonIds=Array.from(new Set(items.filter(item=>!['course','private'].includes(item.audience.kind)).map(item=>String(item.source.lessonId))));
  const mongoLessonIds=lessonIds.filter(id=>mongoose.isValidObjectId(id));
  const [courses,lessons,state]=await Promise.all([
    courseIds.length ? CourseModel.find(await withLearnerVisiblePaths({_id:{$in:courseIds}},actor)).select('_id price pathId subjectId isPackage packageContentTypes approvalStatus isPublished showOnPlatform modules.lessons.id modules.lessons._id modules.lessons.type').lean():[],
    lessonIds.length ? LessonModel.find(await withLearnerVisiblePaths({$or:[{id:{$in:lessonIds}},{_id:{$in:mongoLessonIds}}]},actor)).select('_id id type approvalStatus showOnPlatform').lean():[],
    actor?.id && actor.role!=='admin' && courseIds.length ? loadEntitlementState(actor.id) : {user:null,grants:[]},
  ]);
  const sourceVisible=(item:any)=>{
    if(item.audience.kind==='private')return true;
    if(item.audience.kind==='course') {
      const course=courses.find(course=>String(course._id)===String(item.audience.courseId));
      const lesson=(course?.modules || []).flatMap((module:any)=>module.lessons||[]).find((lesson:any)=>String(lesson.id||lesson._id)===String(item.source.lessonId));
      return Boolean(course?.isPublished && course.showOnPlatform!==false && (!course.approvalStatus || course.approvalStatus==='approved') && lesson && ['zoom','google_meet','teams','live_youtube'].includes(lesson.type));
    }
    const lesson=lessons.find(lesson=>[String(lesson._id),String(lesson.id)].includes(String(item.source.lessonId)));
    return Boolean(lesson && lesson.showOnPlatform!==false && (!lesson.approvalStatus || lesson.approvalStatus==='approved') && ['zoom','google_meet','teams','live_youtube'].includes(lesson.type));
  };
  return {sourceVisible,allowed:(item:any)=>{
    if(!sourceVisible(item))return false;
    const course=courses.find(course=>String(course._id)===String(item.audience.courseId));
    return canAccessSession(actor,item,Boolean(course && hasCourseEntitlementFromState(state.user,course,state.grants)));
  }};
}
