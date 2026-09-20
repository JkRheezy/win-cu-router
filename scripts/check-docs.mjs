import fs from 'node:fs';
import path from 'node:path';
import {root,sourceFiles} from './source-files.mjs';
const errors=[];
for(const file of sourceFiles().filter(f=>f.endsWith('.md'))){
  const body=fs.readFileSync(path.join(root,file),'utf8').replace(/```[^\n]*\n[\s\S]*?```/g,'');
  for(const match of body.matchAll(/\[[^\]\n]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)){
    const raw=match[1];if(/^[a-z][a-z0-9+.-]*:/i.test(raw)||raw.startsWith('#'))continue;
    const [target]=decodeURIComponent(raw).split('#');const abs=path.resolve(root,path.dirname(file),target);
    if(!abs.startsWith(root+path.sep)||!fs.existsSync(abs))errors.push(`${file}: missing local link ${raw}`);
  }
}
const evidence=path.join(root,'docs/evidence/local-validation-2026-09-21.json');
if(fs.existsSync(evidence)){
  const data=JSON.parse(fs.readFileSync(evidence,'utf8'));const ids=new Set(data.records.map(r=>r.id));
  for(const id of ['E01','E02','E03','E04','E05','E06','E07','E08','E09'])if(!ids.has(id))errors.push('Missing evidence '+id);
}else errors.push('Missing public validation evidence');
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log('Documentation links and evidence index passed. External URLs and factual claims still require human review.');
