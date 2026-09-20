import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=process.argv.slice(2),i=args.indexOf('--dest');
if(i>=0&&!args[i+1])throw new Error('--dest requires a skill directory');
const target=path.resolve(i<0?path.join(process.env.CODEX_HOME??path.join(os.homedir(),'.codex'),'skills','win-cu-router'):args[i+1]);
const source=path.join(root,'skills','win-cu-router');
if(path.basename(target)!=='win-cu-router'||target===source||source.startsWith(target+path.sep))throw new Error('Choose a separate win-cu-router skill directory');
fs.mkdirSync(path.dirname(target),{recursive:true});
if(fs.existsSync(target)){
  const backup=path.join(path.dirname(target),'.backups',`win-cu-router-${Date.now()}`);
  fs.mkdirSync(path.dirname(backup),{recursive:true});fs.renameSync(target,backup);
}
fs.cpSync(source,target,{recursive:true});
fs.writeFileSync(path.join(target,'INSTALLATION.md'),`# Local installation\n\nProject directory: ${root}\n\nRead the project's README.md and docs/HOST.md before use.\nThis file is machine-local and must not be included in a public release.\n`);
console.log(JSON.stringify({installed:target,project:root,available:'next turn'}));
