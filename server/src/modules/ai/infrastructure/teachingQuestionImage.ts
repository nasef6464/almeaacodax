import type { TeachingImageIdentity } from '../contracts/teachingImageStoryboard.js';
export type TeachingImageBytes = { data: string; mimeType:'image/png'|'image/jpeg'|'image/webp' };
type Policy = { approvedBaseUrl:string; maxBytes:number; timeoutMs:number };
const mimeOf = (b:Buffer): TeachingImageBytes['mimeType'] | null =>
  b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ? 'image/png' :
  b.length>=3 && b[0]===255 && b[1]===216 && b[2]===255 ? 'image/jpeg' :
  b.length>=12 && b.toString('ascii',0,4)==='RIFF' && b.toString('ascii',8,12)==='WEBP' ? 'image/webp' : null;

/** No arbitrary learner URL, redirects, disk persistence, decoding, or unlimited body buffering. */
export async function loadTeachingQuestionImage(identity:TeachingImageIdentity,policy:Policy,fetchImpl:typeof fetch=fetch):Promise<TeachingImageBytes|null> {
  let url:URL; let base:URL;
  try {
    url=new URL(identity.url);base=new URL(policy.approvedBaseUrl);
    const host=base.hostname.toLowerCase();
    if (base.protocol!=='https:' || /localhost|\.local$|\.internal$|[:\[\]]/.test(host) || /^\d+(?:\.\d+){3}$/.test(host) ||
      url.origin!==base.origin || url.username || url.password || url.search || url.hash ||
      /%|\\|\/\.{1,2}(?:\/|$)/.test(identity.url.slice(identity.url.indexOf('://')+3)) ||
      !url.pathname.startsWith(base.pathname.replace(/\/$/,'')+'/questions/')) return null;
  } catch { return null; }
  const controller=new AbortController();let reader:ReadableStreamDefaultReader<Uint8Array>|undefined;
  let timer:ReturnType<typeof setTimeout>|undefined;
  const read=async():Promise<TeachingImageBytes|null>=>{
    const response=await fetchImpl(url,{redirect:'manual',signal:controller.signal});
    const declared=Number(response.headers.get('content-length')||0);
    if (response.status!==200 || response.redirected || !response.body || !Number.isFinite(declared) || declared<0 || declared>policy.maxBytes) return null;
    const mime=response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
    if (!['image/png','image/jpeg','image/webp'].includes(mime||'')) return null;
    reader=response.body.getReader();const chunks:Uint8Array[]=[];let count=0;
    while (true) {
      const {done,value}=await reader.read();if(done) break;
      count+=value.byteLength;if(count>policy.maxBytes) return null;chunks.push(value);
    }
    const bytes=Buffer.concat(chunks,count);const actual=mimeOf(bytes);
    return actual && actual===mime ? {data:bytes.toString('base64'),mimeType:actual} : null;
  };
  try {
    return await Promise.race([read(),new Promise<null>(resolve=>{timer=setTimeout(()=>{controller.abort();resolve(null);},policy.timeoutMs);})]);
  } catch { return null; }
  finally {if(timer)clearTimeout(timer);controller.abort();void reader?.cancel().catch(()=>{});}
}
