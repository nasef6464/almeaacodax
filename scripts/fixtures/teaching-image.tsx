import React from 'react';
import {createRoot} from 'react-dom/client';
import {TeachingBoard} from '../../components/results/teaching/TeachingBoard';
import {useTeachingPlayback} from '../../components/results/teaching/useTeachingPlayback';
import {boardAt} from '../../components/results/teaching/boardState';
import type {TeachingStoryboardV2} from '../../server/src/modules/ai/contracts/teachingImageStoryboard';
const examples=['Geometry','Fraction','Table','Arabic','No image'];
class Utterance{constructor(public text:string){}}
(window as any).SpeechSynthesisUtterance=Utterance;
Object.defineProperty(window,'speechSynthesis',{value:{getVoices:()=>[{lang:'ar-SA',localService:true}],speak:(s:any)=>{(window as any).speech=s;},pause(){},resume(){},cancel(){}},configurable:true});
function Demo(){
 const [index,setIndex]=React.useState(0),[version,setVersion]=React.useState('version1'),[manual,setManual]=React.useState<{scene:number;elapsed:number}|null>(null);
 const url='https://fixture.images/questions/v2/'+index+'.png';
 const plan=React.useMemo<TeachingStoryboardV2>(()=>({version:2,language:'ar-SA',scenes:[{id:'given',narration:'نحدد المعطى.',actions:[{type:'write',id:'g',kind:'formula',content:'6'}]},{id:'solution',narration:'نكتب المساحة.',actions:[{type:'write',id:'a',kind:'formula',content:'6 \\times 4=24'}]}],...(index===4?{}:{image:{url,version:'version1',marks:[{id:'m1',sceneId:'given',kind:'box',x:.1,y:.2,width:.4,height:.3},{id:'m2',sceneId:'solution',kind:'ellipse',x:.55,y:.2,width:.3,height:.4},{id:'m3',sceneId:'solution',kind:'arrow',from:{x:.7,y:.7},to:{x:.3,y:.4}}]}})}),[index,url]);
 const playback=useTeachingPlayback(plan,true,true,false);
 const position=manual||{scene:playback.sceneIndex,elapsed:playback.elapsedMs};
 (window as any).imageMotion={elapsed:playback.elapsedMs};
 return <main className="mx-auto max-w-2xl p-2"><nav className="flex flex-wrap gap-2">{examples.map((s,i)=><button key={s} onClick={()=>{setIndex(i);setManual(null);setVersion('version1');}}>{s}</button>)}</nav>
 <button onClick={playback.toggle}>{playback.playing?'Pause':'Play'}</button>
 <button onClick={()=>{playback.pause();setManual({scene:0,elapsed:125});}}>Half</button>
 <button onClick={()=>{playback.pause();setManual({scene:1,elapsed:500});}}>All</button>
 <button onClick={()=>setVersion(v=>v==='version1'?'other':'version1')}>Version</button>
 <TeachingBoard elements={manual?boardAt(plan,position.scene,position.elapsed,true):playback.elements} narration={plan.scenes[position.scene].narration} language="ar-SA"
 question={{text:'مثال اصطناعي: أوجد مساحة الشكل.',...(index===4?{}:{imageUrl:url,teachingImageVersion:version})}}
 imagePlayback={{plan,sceneIndex:position.scene,elapsedMs:position.elapsed}}/></main>;
}
createRoot(document.getElementById('root')!).render(<Demo/>);
