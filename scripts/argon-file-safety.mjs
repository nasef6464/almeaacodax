import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const blocked=new Set(['.git','.github','.codex','.agents','.ssh','.aws','.vercel','node_modules','dist','scratch','output','audit-evidence']);
const inside=(root,target)=>{const rel=path.relative(root,target);return rel!==''&&!path.isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+path.sep);};
export function safeArgonPath(root,input){
 if(typeof input!=='string'||!input.trim()||input.includes('\0'))throw Error('Invalid file path');
 const raw=input.trim().replace(/\\/g,'/');if(path.posix.isAbsolute(raw)||path.win32.isAbsolute(raw))throw Error('Absolute paths are forbidden');
 if(['scripts/argon-create-pr.mjs','scripts/argon-file-safety.mjs','scripts/argon-executor.mjs','scripts/test-argon-file-safety.mjs'].includes(raw.toLowerCase()))throw Error('Executor control files cannot be modified by model output');
 const parts=raw.split('/');if(parts.some(p=>p==='..'||p==='.'||!p||blocked.has(p.toLowerCase())||p.startsWith('.')))throw Error('Protected path');
 const name=parts.at(-1).toLowerCase();if(name.startsWith('.')||/^(?:credentials|secrets?|tokens?|passwords?)(?:[.-]|$)/i.test(name)||/(?:^|[-.])(?:credentials|secrets?)(?:[.-]|$)/i.test(name)||/(?:^|\/)package-lock\.json$/i.test(raw)||/\.(?:pem|key|p12|pfx)$/i.test(name))throw Error('Sensitive file');
 if(!/\.(?:ts|tsx|js|jsx|mjs|cjs|json|md|css|html|yml|yaml|txt|svg|sql)$/i.test(name))throw Error('Only source text files may be edited');
 const realRoot=fs.realpathSync(root),full=path.resolve(realRoot,...parts);if(!inside(realRoot,full))throw Error('Outside repository');
 let current=realRoot;for(const part of parts){current=path.join(current,part);if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw Error('Symlink paths are forbidden');}
 let probe=full;while(!fs.existsSync(probe))probe=path.dirname(probe);
 const realProbe=fs.realpathSync(probe);if(realProbe!==realRoot&&!inside(realRoot,realProbe))throw Error('Symlink escapes repository');
 if(fs.existsSync(full)&&!fs.statSync(full).isFile())throw Error('Only files may be changed');
 return {full,relative:path.relative(realRoot,full).replace(/\\/g,'/')};
}
export function assertArgonClean(root){if(execFileSync('git',['status','--porcelain','--untracked-files=normal'],{cwd:root,encoding:'utf8'}).trim())throw Error('Working tree must be clean before applying an AI task');}
export function argonPlan(root,result){
 if(!result||typeof result!=='object')throw Error('Invalid task plan');const writes=result.filesToWrite||[],deletes=result.filesToDelete||[];
 if(!Array.isArray(writes)||!Array.isArray(deletes)||writes.length+deletes.length>50)throw Error('Invalid or excessive file plan');
 const seen=new Set();const prepare=(input)=>{const item=safeArgonPath(root,input);if(seen.has(item.relative))throw Error('Duplicate file plan');seen.add(item.relative);return item;};
 const preparedWrites=writes.map(item=>{if(typeof item?.content!=='string'||Buffer.byteLength(item.content)>1024*1024)throw Error('Invalid file content');return {...prepare(item.path),content:item.content};});
 const preparedDeletes=deletes.map(input=>{const item=prepare(input);execFileSync('git',['--literal-pathspecs','ls-files','--error-unmatch','--',item.relative],{cwd:root,stdio:'pipe'});return item;});
 return {writes:preparedWrites,deletes:preparedDeletes,changedPaths:[...seen]};
}
