import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {safeArgonPath} from './argon-file-safety.mjs';
const run=(cmd,args)=>execFileSync(cmd,args,{stdio:'inherit'});
const runId=process.argv[2];if(!/^\d+$/.test(runId||''))throw Error('A GitHub run ID is required');
const meta=JSON.parse(fs.readFileSync('.argon_last_run.json','utf8'));if(!Array.isArray(meta.changedPaths)||meta.changedPaths.length>50)throw Error('Invalid changed paths');
const files=[...new Set(meta.changedPaths.map(p=>safeArgonPath(process.cwd(),p).relative))];if(!files.length)process.exit(0);
const title=String(meta.commitMessage||'chore(ai): apply reviewed task').replace(/[\r\n]/g,' ').slice(0,200);
const branch='codex/argon-task-'+runId;
run('git',['config','user.name','github-actions[bot]']);run('git',['config','user.email','github-actions[bot]@users.noreply.github.com']);
run('git',['checkout','-b',branch]);run('git',['--literal-pathspecs','add','--',...files]);
try{execFileSync('git',['diff','--cached','--quiet']);process.exit(0);}catch{}
run('git',['commit','-m',title]);run('gh',['auth','setup-git']);run('git',['push','origin',branch]);
const body=path.join(os.tmpdir(),'argon-pr-'+runId+'.md');fs.writeFileSync(body,'Automated task proposal for review.\n\n'+String(meta.taskPrompt||'')+'\n\n'+String(meta.explanation||''));
run('gh',['pr','create','--title',title,'--body-file',body,'--base','main','--head',branch]);
