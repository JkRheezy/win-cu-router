import {runTask} from '../src/index.mjs';
// A runnable contract demonstration, not a Jev accuracy or GUI benchmark.
let value='waiting', calls=0;
const observer={async observe(){return{revision:value,app:'Offline fixture',summary:value,actions:[{id:'apply',description:'Apply the prepared local value',kind:'click',requiresApproval:false}]};}};
const router={async choose(){calls++;return calls===1?{route:'delegate',reason:'needs_plan'}:{route:'act',actionId:'apply'};}};
const executor={async execute(){value='finished';}};
const result=await runTask({goal:'Finish the local fixture',observer,executor,router,verify:s=>s.summary==='finished',planner:async checkpoint=>({goal:'Apply the prepared value to complete the fixture'})});
console.log(JSON.stringify({demo:'Jev-shaped mock router -> host planner -> local executor',...result},null,2));
if(!result.verified)process.exitCode=1;
