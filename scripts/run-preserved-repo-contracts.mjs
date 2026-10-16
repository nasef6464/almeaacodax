import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const files=JSON.parse(readFileSync(new URL('./preserved-repo-contracts.json',import.meta.url),'utf8'));
for(const file of files){const r=spawnSync(process.execPath,[file],{encoding:'utf8',maxBuffer:10*1024*1024});if(r.error||r.status!==0){process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||String(r.error||''));process.exit(r.status||1);}}
console.log('PASS retained repository contracts: '+files.length);
