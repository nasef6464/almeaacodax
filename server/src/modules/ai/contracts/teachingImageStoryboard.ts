import { validateTeachingStoryboard, type TeachingStoryboard } from './teachingStoryboard.js';

type Point = { x: number; y: number };
export type TeachingImageMark = { id: string; sceneId: string } & (
  { kind: 'box' | 'ellipse'; x: number; y: number; width: number; height: number } |
  { kind: 'arrow'; from: Point; to: Point });
export type TeachingImageIdentity = { url: string; version: string };
export type TeachingStoryboardV2 = Omit<TeachingStoryboard, 'version'> & {
  version: 2; image?: TeachingImageIdentity & { marks: TeachingImageMark[] };
};
export type TeachingPlan = TeachingStoryboard | TeachingStoryboardV2;
const obj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const unit = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;
const point = (v: unknown): v is Point => obj(v) && Object.keys(v).every(k => ['x','y'].includes(k)) && unit(v.x) && unit(v.y);
const id = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(v);

export function validateTeachingImageStoryboard(value: unknown): TeachingStoryboardV2 | null {
  if (!obj(value) || value.version !== 2) return null;
  const base = validateTeachingStoryboard({ ...value, version: 1 });
  if (!base) return null;
  const safe: TeachingStoryboardV2 = { ...base, version: 2 };
  const image = value.image;
  if (!obj(image) || typeof image.url !== 'string' || image.url.length > 2048 ||
    !/^https:\/\/[^\s<>]+$/.test(image.url) || typeof image.version !== 'string' ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(image.version) || !Array.isArray(image.marks) || image.marks.length > 4) return safe;
  const scenes = new Set(base.scenes.map(s => s.id)); const ids = new Set<string>();
  const marks: TeachingImageMark[] = [];
  for (const m of image.marks) {
    if (!obj(m) || !id(m.id) || ids.has(m.id) || !scenes.has(m.sceneId)) return safe;
    const allowed = m.kind === 'arrow' ? ['id','sceneId','kind','from','to'] : ['id','sceneId','kind','x','y','width','height'];
    if (Object.keys(m).some(k => !allowed.includes(k))) return safe;
    if (m.kind === 'arrow') {
      if (!point(m.from) || !point(m.to) || (m.from.x === m.to.x && m.from.y === m.to.y)) return safe;
      marks.push({ id:m.id,sceneId:m.sceneId,kind:'arrow',from:{...m.from},to:{...m.to} });
    } else if (m.kind === 'box' || m.kind === 'ellipse') {
      if (![m.x,m.y,m.width,m.height].every(unit) || m.width <= 0 || m.height <= 0 || m.x + m.width > 1 || m.y + m.height > 1) return safe;
      marks.push({ id:m.id,sceneId:m.sceneId,kind:m.kind,x:m.x,y:m.y,width:m.width,height:m.height });
    } else return safe;
    ids.add(m.id);
  }
  return { ...safe, image:{url:image.url,version:image.version,marks} };
}
export const validateTeachingPlan = (v: unknown): TeachingPlan | null => validateTeachingStoryboard(v) || validateTeachingImageStoryboard(v);
