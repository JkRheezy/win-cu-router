import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {root,fingerprint,codeFingerprint,verificationPath,writeJson,readJson} from './source-files.mjs';
const docsOnly=process.argv.includes('--docs'),before=fingerprint(),beforeCode=codeFingerprint(),previous=readJson(verificationPath);
const py=process.env.WIN_CU_PYTHON??(fs.existsSync(path.join(root,'.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python'))?path.join(root,'.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python'):'python');
const steps=docsOnly?[]:[['javascript',process.execPath,['--test',...fs.readdirSync(path.join(root,'test')).filter(f=>f.endsWith('.test.mjs')).map(f=>'test/'+f)]],['python',py,['-m','unittest','discover','-s','python','-p','test_*.py']]];
if(!docsOnly)steps.push(['github',process.execPath,['--test','.github/tests/workflows.test.mjs']]);
steps.push(['docs',process.execPath,['scripts/check-docs.mjs']],['release',process.execPath,['scripts/check-release.mjs']]);
if(!docsOnly)steps.push(['package',py,['scripts/smoke-package.py']]);
const checks=[];fs.mkdirSync(path.join(root,'.local/workflow'),{recursive:true});
for(const [name,command,args] of steps){
  const start=Date.now(),r=spawnSync(command,args,{cwd:root,encoding:'utf8',timeout:120000,windowsHide:true,env:{...process.env,PYTHONUTF8:'1'}});
  fs.writeFileSync(path.join(root,'.local/workflow',name+'.log'),(r.stdout??'')+(r.stderr??'')+(r.error?.message??''));
  checks.push({name,exitCode:r.status??1,elapsedMs:Date.now()-start});console.log(`${name}: ${r.status===0?'PASS':'FAIL'}`);
}
const after=fingerprint(),code=codeFingerprint();
const fullCodeVerified=!docsOnly?checks.filter(c=>['javascript','python'].includes(c.name)).every(c=>c.exitCode===0):previous?.fullCodeVerified===true&&previous?.codeFingerprint===code;
const record={schemaVersion:1,recordedAt:new Date().toISOString(),commit:process.env.GITHUB_SHA??null,profile:docsOnly?'docs':'full',fingerprint:after,codeFingerprint:code,fullCodeVerified,unchangedDuringRun:before===after&&beforeCode===code,checks};
record.passed=record.unchangedDuringRun&&checks.every(c=>c.exitCode===0);
writeJson(verificationPath,record);console.log(JSON.stringify({passed:record.passed,profile:record.profile,fullCodeVerified,report:'.local/workflow/verification.json'}));if(!record.passed)process.exitCode=1;
