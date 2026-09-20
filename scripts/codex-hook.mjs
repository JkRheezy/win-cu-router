import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {root,fingerprint,codeFingerprint,readJson,writeJson,verificationPath} from './workflow-state.mjs';
import {stopFeedback} from './workflow-policy.mjs';
let raw='';for await(const chunk of process.stdin)raw+=chunk;
const input=JSON.parse(raw||'{}');
const cwd=fs.realpathSync(input.cwd??process.cwd()),actualRoot=fs.realpathSync(root);
if(cwd!==actualRoot&&!cwd.startsWith(actualRoot+path.sep)){console.log('{}');}else{
  const id=crypto.createHash('sha256').update(String(input.session_id??'manual')).digest('hex').slice(0,24);
  const file=path.join(root,'.local/workflow/sessions',id+'.json');
  const event=input.hook_event_name;
  if(event==='SessionStart'){
    writeJson(file,{fingerprint:fingerprint(),codeFingerprint:codeFingerprint()});
    console.log(JSON.stringify({hookSpecificOutput:{hookEventName:'SessionStart',additionalContext:'Read AGENTS.md and docs/WORKFLOW.md in win-cu-router. Use task acceptance evidence and REVIEW.md. Existing authorization covers routine edits; no automatic publishing or extra model calls.'}}));
  }else if(event==='Stop'){
    console.log(JSON.stringify(stopFeedback(input,{baseline:readJson(file),fingerprint:fingerprint(),codeFingerprint:codeFingerprint(),verification:readJson(verificationPath)})));
  }else console.log('{}');
}
