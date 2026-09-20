import fs from 'node:fs';
import {ScopedBridge,JevRouter,runTask} from '../src/index.mjs';
const args=process.argv.slice(2);
function argument(name){const i=args.indexOf(name);if(i<0||!args[i+1])throw new Error(`Missing ${name}`);return args[i+1];}
const task=JSON.parse(fs.readFileSync(argument('--task'),'utf8'));
const config=JSON.parse(fs.readFileSync(argument('--config'),'utf8'));
if(!task.expectedUrl&&!task.expectedText&&!Object.keys(task.expectedFields??{}).length)throw new Error('An independent expected URL, text or field value is required');
const bridge=new ScopedBridge(config),events=[],start=Date.now();
const stages=[...(task.hostStages??[])];
const result=await runTask({goal:task.goal,observer:bridge,executor:bridge,router:new JevRouter({apiKey:process.env.TYPESAFE_API_KEY}),maxDecisions:16,timeoutMs:90000,
  planner:stages.length?async()=>{const goal=stages.shift();return goal?{goal}:null;}:undefined,
  verify:s=>(!task.expectedUrl||s.facts?.url===task.expectedUrl)&&(!task.expectedText||s.facts?.text?.includes(task.expectedText))&&Object.entries(task.expectedFields??{}).every(([name,value])=>s.facts?.fields?.[name]===value),
  onEvent:e=>events.push(e)});
const finalState=await bridge.observe().catch(()=>null);
fs.writeFileSync(argument('--output'),JSON.stringify({result,wallMs:Date.now()-start,events,finalFacts:finalState?.facts},null,2));
console.log(JSON.stringify({status:result.status,verified:result.verified,elapsedMs:result.elapsedMs,stats:result.stats,url:finalState?.facts?.url,reason:result.reason??result.checkpoint?.reason}));
if(!result.verified)process.exitCode=1;
