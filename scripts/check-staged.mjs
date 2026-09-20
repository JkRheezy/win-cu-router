import {execFileSync} from 'node:child_process';
import {root,sourceFiles} from './source-files.mjs';
const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'});
const files=git(['diff','--cached','--name-only','--diff-filter=ACMR','-z']).split('\0').filter(Boolean),allowed=new Set(sourceFiles());
for(const file of files){
  if(!allowed.has(file))throw Error('Staged file outside public source allowlist: '+file);
  const data=git(['show',':'+file]);
  if(/\bsk-[A-Za-z0-9_-]{20,}/.test(data)||/^(?:TYPESAFE_API_KEY|OPENAI_API_KEY|KIMI_API_KEY)[ \t]*=[ \t]*\S+/m.test(data))throw Error('Possible credential in staged file: '+file);
  if(/\.(exe|dll|zip|png|jpg|pyc)$/i.test(file))throw Error('Private/binary artifact staged: '+file);
}
console.log(`Staged source check passed: ${files.length} files. Pattern scan is not a complete secret audit.`);
