import React from 'react';
import type {TeachingImageMark,TeachingStoryboardV2} from '../../../server/src/modules/ai/contracts/teachingImageStoryboard';
import {WhiteboardHand} from './WhiteboardHand';

function ImageMark({mark,progress}:{mark:TeachingImageMark;progress:number}) {
  const path=React.useRef<SVGPathElement>(null);const [tip,setTip]=React.useState({x:0,y:0});
  const d=React.useMemo(()=>{
    if(mark.kind==='arrow')return `M${mark.from.x*1000} ${mark.from.y*1000} L${mark.to.x*1000} ${mark.to.y*1000}`;
    const x=mark.x*1000,y=mark.y*1000,w=mark.width*1000,h=mark.height*1000;
    return mark.kind==='box'?`M${x} ${y} h${w} v${h} h${-w} Z`:
      `M${x+w} ${y+h/2} a${w/2} ${h/2} 0 1 1 ${-w} 0 a${w/2} ${h/2} 0 1 1 ${w} 0`;
  },[mark]);
  React.useLayoutEffect(()=>{
    const node=path.current;if(!node)return;
    const measure=()=>{const p=node.getPointAtLength(node.getTotalLength()*progress),r=node.ownerSVGElement!.getBoundingClientRect();setTip({x:p.x*r.width/1000,y:p.y*r.height/1000});};
    measure();const observer=new ResizeObserver(measure);observer.observe(node.ownerSVGElement!);return()=>observer.disconnect();
  },[progress,d]);
  return <><svg data-testid="teaching-image-mark" data-progress={progress} aria-hidden="true" viewBox="0 0 1000 1000" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible text-cyan-600" fill="none">
    <path ref={path} d={d} pathLength="1" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeDasharray="1" strokeDashoffset={1-progress} strokeLinecap="round" strokeLinejoin="round" />
    {mark.kind==='arrow'&&progress===1&&<path d={`M${mark.to.x*1000-10} ${mark.to.y*1000-10} L${mark.to.x*1000} ${mark.to.y*1000} L${mark.to.x*1000-10} ${mark.to.y*1000+10}`} transform={`rotate(${Math.atan2(mark.to.y-mark.from.y,mark.to.x-mark.from.x)*180/Math.PI} ${mark.to.x*1000} ${mark.to.y*1000})`} stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" />}
  </svg>{progress>0&&progress<1&&<WhiteboardHand {...tip}/>}</>;
}
export function TeachingImageOverlay({plan,sceneIndex,elapsedMs,expectedImageVersion,imageUrl}:{plan:TeachingStoryboardV2;sceneIndex:number;elapsedMs:number;expectedImageVersion?:string;imageUrl?:string}) {
  if(!plan.image || plan.image.version!==expectedImageVersion || plan.image.url!==imageUrl)return null;
  let ordinal=0;
  return <div data-testid="teaching-image-overlay" className="pointer-events-none absolute inset-0" aria-hidden="true">{plan.image.marks.map(mark=>{
    const scene=plan.scenes.findIndex(s=>s.id===mark.sceneId);if(scene<0||scene>sceneIndex)return null;
    const progress=scene<sceneIndex?1:Math.max(0,Math.min(1,(elapsedMs-ordinal++*250)/250));
    return progress>0?<ImageMark key={mark.id} mark={mark} progress={progress}/>:null;
  })}</div>;
}
