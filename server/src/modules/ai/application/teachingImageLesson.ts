import {compileCompactTeachingPlan,compactTeachingSchema,type CompactTeachingMode} from './compactTeachingPlan.js';
import {validateTeachingImageStoryboard,type TeachingImageIdentity,type TeachingStoryboardV2} from '../contracts/teachingImageStoryboard.js';
import {teachingImageIdentity} from './teachingImageIdentity.js';
import type {TeachingImageBytes} from '../infrastructure/teachingQuestionImage.js';
import {compileNativeTeachingMarks,nativeTeachingMarkSchema,teachingImageInstruction} from './teachingImageGrounding.js';
export {teachingImageInstruction} from './teachingImageGrounding.js';
type Expected={mode:CompactTeachingMode;language?:'ar-SA'|'en-US';trustedAnswer?:string};

export function eligibleTeachingImageIdentity(request:{boardMode?:string;helpLevel:string;imageVersion?:string;boardContext?:string},question:Record<string,any>|null,enabled:boolean,currentSource:boolean) {
  if(!enabled || !currentSource || request.boardMode!=='storyboard_v2' || request.helpLevel!=='steps' || request.boardContext) return null;
  const identity=teachingImageIdentity(question);
  return identity && request.imageVersion===identity.version ? identity : null;
}
export function teachingImageSchema(mode:CompactTeachingMode,language?:'ar-SA'|'en-US') {
  const base=compactTeachingSchema(mode,language);
  const sceneId={type:'string',enum:mode==='lesson'?['given','solution']:['given']};
  return {...base,properties:{...base.properties,marks:nativeTeachingMarkSchema(sceneId)},required:[...base.required,'marks']};
}

export async function generateTeachingImageLesson<T extends {text:string;imageSentToProvider?:boolean}>(input:{
  identity:TeachingImageIdentity;prompt:string;fallback:string;expected:Expected;
  loadImage:()=>Promise<TeachingImageBytes|null>;callVision:(prompt:string,image:TeachingImageBytes)=>Promise<T>;
}):Promise<{text:string;storyboard:TeachingStoryboardV2|null;call:T|null;imageSentToProvider:boolean}> {
  const fallback={text:input.fallback,storyboard:null,call:null,imageSentToProvider:false};
  const bytes=await input.loadImage();if(!bytes)return fallback;
  let call:T;
  const prompt=input.prompt.replace('لا تكتب scenes أو actions أو IDs.','لا تكتب scenes أو actions؛ أضف sceneId داخل marks فقط.')
    .replace('استهدف أقل من 250 توكن كي تكتمل الاستجابة داخل حد 450.','استهدف أقل من700 توكن بما فيها الإشارات، ضمن الحد900.');
  try {call=await input.callVision(prompt+'\n'+teachingImageInstruction,bytes);}catch{return fallback;}
  try {
    const parsed=JSON.parse(call.text);const base=compileCompactTeachingPlan(parsed,input.expected);
    if(base){
      const marks=compileNativeTeachingMarks(parsed.marks);
      const storyboard=validateTeachingImageStoryboard({...base,version:2,image:{...input.identity,marks}});
      if(storyboard)return {text:storyboard.scenes.map(s=>s.narration).join('\n'),storyboard,call,imageSentToProvider:!!call.imageSentToProvider};
    }
  }catch{/* malformed provider output uses trusted reference only */}
  return {...fallback,call,imageSentToProvider:!!call.imageSentToProvider};
}
