import {approvedTeachingRegions} from '../contracts/verifiedTeachingRegions.js';
import {teachingImageIdentity} from './teachingImageIdentity.js';
import {decodeQuestionTeachingPlan} from './questionTeachingPlan.js';
import {validateTeachingImageStoryboard} from '../contracts/teachingImageStoryboard.js';

/** No model coordinates, inference, image fetch or additional provider call. */
export function attachVerifiedTeachingRegions(text:string,request:{boardMode?:string;helpLevel:string;imageVersion?:string;boardContext?:string},question:Record<string,any>|null,currentSource:boolean):string {
  if(!currentSource||request.boardMode!=='storyboard_v2'||request.helpLevel!=='steps'||request.boardContext)return text;
  const regions=approvedTeachingRegions(question);const identity=teachingImageIdentity(question);
  if(!regions||!identity||request.imageVersion!==identity.version)return text;
  const base=decodeQuestionTeachingPlan(text).storyboard;
  if(!base||base.version!==1||!base.scenes.length)return text;
  const marks=regions.items.map((a,i)=>({id:'region'+i,sceneId:base.scenes[0].id,kind:'box',x:a.x,y:a.y,width:a.width,height:a.height}));
  const plan=validateTeachingImageStoryboard({...base,version:2,image:{...identity,marks}});
  return plan?.image?JSON.stringify(plan):text;
}
