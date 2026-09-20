import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const entries=['package.json','.gitattributes','.gitignore','.env.example','README.md','AGENTS.md','REVIEW.md','CONTRIBUTING.md','LICENSE','PROVENANCE.md','THIRD_PARTY_NOTICES.md','src','python','examples','docs','skills','scripts','test','.github','.githooks','.codex/config.toml','.codex/hooks.json','.codex/environments/environment.toml'];
export function sourceFiles(){
  const files=[];
  function walk(p){const abs=path.join(root,p);if(!fs.existsSync(abs))return;const stat=fs.lstatSync(abs);if(stat.isSymbolicLink())throw Error('Source symlink unsupported');if(stat.isDirectory()){for(const name of fs.readdirSync(abs))if(!['__pycache__','node_modules','.venv','.local','.git'].includes(name))walk(path.join(p,name));}else files.push(p.replaceAll('\\','/'));}
  entries.forEach(walk);return files.sort();
}
export function fingerprint(files=sourceFiles()){
  // Public sources are text. Git checkouts on different platforms must agree.
  const hash=crypto.createHash('sha256');for(const f of files){hash.update(f);hash.update('\0');hash.update(fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n'));hash.update('\0');}return hash.digest('hex');
}
export function codeFingerprint(){return fingerprint(sourceFiles().filter(f=>!f.endsWith('.md')&&!f.startsWith('docs/')));}
export const verificationPath=path.join(root,'.local/workflow/verification.json');
export function readJson(file){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return null;}}
export function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
