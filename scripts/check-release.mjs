import fs from 'node:fs';
import path from 'node:path';
import {root,sourceFiles} from './source-files.mjs';
const files=sourceFiles();
const problems=[];
for(const file of files){
  if(/\.(exe|dll|pdb|zip|tgz|png|jpg|pyc)$/i.test(file))problems.push(file+': binary or private media');
  const content=fs.readFileSync(path.join(root,file),'utf8');
  if(/\bsk-[A-Za-z0-9_-]{20,}/.test(content))problems.push(file+': possible credential');
  if(/^(?:TYPESAFE_API_KEY|OPENAI_API_KEY|KIMI_API_KEY)[ \t]*=[ \t]*\S+/m.test(content))problems.push(file+': populated key assignment');
  if(/(?:[A-Za-z]:[\\/]Users[\\/](?!Public|USER)[^\\/\s]+|\/Users\/(?!USER)[^/\s]+)/i.test(content))problems.push(file+': developer machine path');
}
if(problems.length){console.error(problems.join('\n'));process.exitCode=1;}
else {fs.mkdirSync(path.join(root,'.local'),{recursive:true});fs.writeFileSync(path.join(root,'.local/public-files.json'),JSON.stringify(files.sort(),null,2));console.log(`Release allowlist checked: ${files.length} text files. No matched credential, private path or bundled binary. This heuristic is not a complete security or legal audit.`);}
