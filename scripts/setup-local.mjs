import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {root} from './source-files.mjs';
const [major,minor]=process.versions.node.split('.').map(Number);
if(major<20||major===20&&minor<6)throw Error('Node 20.6+ required');
function run(command,args){const r=spawnSync(command,args,{cwd:root,stdio:'inherit',windowsHide:true});if(r.status!==0)throw Error('Environment setup failed');}
const py=path.join(root,'.venv',process.platform==='win32'?'Scripts/python.exe':'bin/python');
if(!fs.existsSync(py))run(process.env.WIN_CU_PYTHON??'python',['-m','venv','.venv']);
if(spawnSync(py,['-m','pip','--version'],{cwd:root,windowsHide:true,stdio:'ignore'}).status!==0)run(py,['-m','ensurepip','--upgrade']);
run(py,['-m','pip','install','-r','python/requirements.txt']);
console.log('Development environment ready. API keys and cua-driver must be supplied separately; no desktop service was started.');
