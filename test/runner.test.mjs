import test from 'node:test';
import assert from 'node:assert/strict';
import {runTask,JevRouter,createSkyExecutor} from '../src/index.mjs';
function fixture(){let state='initial', inputs=0;return{get inputs(){return inputs;},set state(s){state=s;},observer:{async observe(){return{revision:state,summary:state,app:'fixture',actions:[{id:'ok',description:'Apply',kind:'click',requiresApproval:false}]};}},executor:{async execute(){inputs++;state='done';}},verify:s=>s.summary==='done',router:{async choose(){return{route:'act',actionId:'ok'};}}};}
test('Jev first delegates, host returns a stage, then local actions resume',async()=>{
  const f=fixture();let calls=0;
  const router={async choose(){return++calls===1?{route:'delegate'}:{route:'act',actionId:'ok'};}};
  const result=await runTask({...f,router,goal:'Finish',planner:async()=>({goal:'Apply'})});
  assert.equal(result.verified,true);assert.equal(result.stats.handoffs,1);assert.equal(f.inputs,1);
});
test('missing planner returns a resumable checkpoint without an input',async()=>{
  const f=fixture();const result=await runTask({...f,goal:'Finish',router:{async choose(){return{route:'delegate'};}}});
  assert.equal(result.status,'handoff');assert.equal(f.inputs,0);assert.equal(result.checkpoint.summary,'initial');
});
test('unverified completion never becomes success',async()=>{
  const f=fixture();const result=await runTask({...f,goal:'Finish',router:{async choose(){return{route:'complete'};}}});
  assert.equal(result.status,'handoff');assert.equal(result.checkpoint.reason,'completion_not_verified');
});
test('interface changes discard the pending model choice before input',async()=>{
  const f=fixture();let calls=0;
  const router={async choose(){if(++calls===1)f.state='changed';return{route:'act',actionId:'ok'};}};
  const result=await runTask({...f,router,goal:'Finish'});
  assert.equal(result.verified,true);assert.equal(result.stats.decisions,2);assert.equal(f.inputs,1);
});
test('uncertain input is not replayed',async()=>{
  const f=fixture();let attempts=0;
  const result=await runTask({...f,goal:'Finish',executor:{async execute(){attempts++;throw Error('transport interrupted');}}});
  assert.equal(result.status,'handoff');assert.equal(attempts,1);assert.equal(result.checkpoint.reason,'input_outcome_unknown');
});
test('host planning cannot grant new permissions',async()=>{
  const f=fixture();const result=await runTask({...f,goal:'Finish',router:{async choose(){return{route:'delegate'};}},planner:async()=>({goal:'Continue',approvedActions:['delete']})});
  assert.equal(result.status,'handoff');assert.equal(f.inputs,0);
});
test('approval-required actions are removed before routing',async()=>{
  const f=fixture();const result=await runTask({...f,goal:'Finish',observer:{async observe(){return{revision:'1',summary:'initial',actions:[{id:'delete',description:'Delete',requiresApproval:true}]};}}});
  assert.equal(result.status,'handoff');assert.equal(result.stats.decisions,0);
});
test('Jev receives public descriptions without runtime bindings or approval grants',async()=>{
  let sent;
  const router=new JevRouter({apiKey:'test-only-placeholder',fetchImpl:async(_url,request)=>{sent=JSON.parse(request.body);return{ok:true,json:async()=>({answers:{next:{choice:'operation_0',confidence:0.9}}})};}});
  const result=await router.choose({goal:'Apply',snapshot:{app:'fixture',summary:'ready',actions:[{id:'ok',description:'Apply',binding:{private:'sensitive-local-binding'}}]}});
  assert.equal(result.actionId,'ok');assert.ok(!JSON.stringify(sent).includes('sensitive-local-binding'));
});
test('low confidence routes to host; unknown answer fails closed',async()=>{
  for(const [choice,confidence,outcome] of [['operation_0',0.2,'delegate'],['invented',0.99,'error']]){
    const router=new JevRouter({apiKey:'test-only-placeholder',fetchImpl:async()=>({ok:true,json:async()=>({answers:{next:{choice,confidence}}})})});
    const call=router.choose({goal:'Apply',snapshot:{summary:'ready',actions:[{id:'ok',description:'Apply'}]}});
    if(outcome==='error')await assert.rejects(call,/Invalid Jev/);else assert.equal((await call).route,outcome);
  }
});
test('official adapter refuses a moved window before sending input',async()=>{
  let inputs=0;const executor=createSkyExecutor({sky:{async click(){inputs++;}},window:{id:1},calibration:{bounds:{x:0,y:0,width:100,height:100},imageWidth:100,imageHeight:100}});
  await assert.rejects(executor.execute({kind:'click',binding:{rect:{x:10,y:10,w:20,h:20}}},{binding:{windowId:1,bounds:{x:1,y:0,width:100,height:100}}}),/Window changed/);
  assert.equal(inputs,0);
});
