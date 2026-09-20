import path from 'node:path';
import readline from 'node:readline';
import {spawn} from 'node:child_process';
import {root,writeJson} from './workflow-state.mjs';
import {requestedProjectPath,summarizeHooks} from './hook-status.mjs';
const args=process.argv.slice(2),index=args.indexOf('--cwd');
if(index>=0&&!args[index+1])throw Error('--cwd requires the configured project path');
const cwd=requestedProjectPath(index>=0?args[index+1]:process.cwd());
const child=spawn(process.env.WIN_CU_CODEX??'codex',['app-server','--stdio'],{cwd,stdio:['pipe','pipe','pipe'],windowsHide:true});
const pending=new Map();let sequence=0;
const lines=readline.createInterface({input:child.stdout});
function fail(error){for(const p of pending.values()){clearTimeout(p.timer);p.reject(error);}pending.clear();}
child.on('error',fail);child.on('exit',()=>fail(Error('Codex app-server exited')));
child.stdin.on('error',fail);
// Do not publish global config diagnostics or transcripts in this narrow check.
child.stderr.resume();
lines.on('line',line=>{let m;try{m=JSON.parse(line);}catch{return;}const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);if(m.error)p.reject(Error(m.error.message??'Codex RPC failed'));else p.resolve(m);}});
function rpc(method,params){return new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(Error('Codex status query timed out'));},15000);pending.set(id,{resolve,reject,timer});child.stdin.write(JSON.stringify({id,method,params})+'\n');});}
try{
  await rpc('initialize',{clientInfo:{name:'win_cu_router_hook_check',version:'0.1.0'},capabilities:{experimentalApi:true}});
  child.stdin.write(JSON.stringify({method:'initialized'})+'\n');
  const response=await rpc('hooks/list',{cwds:[cwd]});
  const result=summarizeHooks(cwd,response);
  writeJson(path.join(root,'.local/workflow/hooks-status.json'),result);
  console.log(JSON.stringify(result,null,2));if(!result.ready)process.exitCode=1;
}finally{lines.close();child.stdin.end();child.kill();fail(Error('Status query closed'));}
