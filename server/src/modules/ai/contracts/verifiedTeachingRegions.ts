export type TeachingRegion = {id:string;label:string;x:number;y:number;width:number;height:number};
export type VerifiedTeachingRegions = {sourceKey:string;approved:boolean;items:TeachingRegion[]};
const object=(v:unknown):v is Record<string,any>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const unit=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=1;
/** Staff-only source binding. Public learner DTOs receive an opaque digest instead. */
export function teachingRegionSourceKey(q:Record<string,any>|null|undefined):string|null {
  if(!q||typeof q.imageUrl!=='string'||!/^https:\/\/[^\s<>]+$/.test(q.imageUrl))return null;
  const hash=String(q.sourceMeta?.imageHash||'');const version=q.sourceMeta?.imageVersion;
  const revision=/^[a-f0-9]{32,128}$/i.test(hash)?hash:(typeof version==='number'&&Number.isFinite(version)&&version>0?String(version):'');
  return revision?JSON.stringify([q.imageUrl,revision]):null;
}
export function validateTeachingRegions(value:unknown):VerifiedTeachingRegions|null {
  if(!object(value)||Object.keys(value).some(k=>!['sourceKey','approved','items'].includes(k))||typeof value.sourceKey!=='string'||value.sourceKey.length>3000||typeof value.approved!=='boolean'||!Array.isArray(value.items)||value.items.length>4||(value.approved&&(!value.items.length||!value.sourceKey)))return null;
  const ids=new Set<string>();const items:TeachingRegion[]=[];
  for(const a of value.items) {
    if(!object(a)||Object.keys(a).some(k=>!['id','label','x','y','width','height'].includes(k))||typeof a.id!=='string'||!/^r[A-Za-z0-9_-]{1,24}$/.test(a.id)||ids.has(a.id)||typeof a.label!=='string'||a.label.length>80||![a.x,a.y,a.width,a.height].every(unit)||a.width<=0||a.height<=0||a.x+a.width>1||a.y+a.height>1)return null;
    ids.add(a.id);items.push({id:a.id,label:a.label,x:a.x,y:a.y,width:a.width,height:a.height});
  }
  return {sourceKey:value.sourceKey,approved:value.approved,items};
}
export function approvedTeachingRegions(q:Record<string,any>|null|undefined):VerifiedTeachingRegions|null {
  const raw=q?.aiContext?.teachingRegions;
  const regions=validateTeachingRegions(typeof raw?.toObject==='function'?raw.toObject():raw);
  return regions?.approved&&regions.sourceKey===teachingRegionSourceKey(q)?regions:null;
}
/** Preserve editable regions but invalidate approval on image replacement, including API-only edits. */
export function invalidateStaleTeachingRegions<T extends Record<string,any>>(q:T):T {
  const regions=q.aiContext?.teachingRegions;
  return regions?.approved&&!approvedTeachingRegions(q)?{...q,aiContext:{...q.aiContext,teachingRegions:{...regions,approved:false}}}:q;
}
