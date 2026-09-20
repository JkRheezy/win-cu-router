/** Persistent orchestration. Jev is the default decision maker.
 * A host planner may return a new stage goal, never new permissions or code.
 */
export async function runTask({goal, observer, executor, router, verify, planner,
  maxDecisions=12, maxHandoffs=2, timeoutMs=60000, approvedActions=[], onEvent=()=>{}}) {
  if(typeof goal!=='string'||!goal.trim()||typeof verify!=='function') throw new Error('Goal and independent verifier are required');
  if(!Number.isInteger(maxDecisions)||maxDecisions<1||maxDecisions>100||!Number.isInteger(maxHandoffs)||maxHandoffs<0||maxHandoffs>5||!Number.isFinite(timeoutMs)||timeoutMs<=0) throw new Error('Invalid execution budget');
  const started=performance.now(), history=[], approvals=new Set(approvedActions);
  const stats={decisions:0,actions:0,handoffs:0,reads:0};
  let stage=goal, snapshot, handoffReason;
  const elapsed=()=>Math.round(performance.now()-started);
  const finish=(status,extra={})=>({status,goal,stage,stats:{...stats},elapsedMs:elapsed(),...extra});
  async function read() {
    const s=await observer.observe();stats.reads++;
    if(!s||typeof s.revision!=='string'||typeof s.summary!=='string'||!Array.isArray(s.actions)||s.actions.length>64) throw new Error('Invalid observation');
    const ids=new Set();
    for(const a of s.actions){if(typeof a.id!=='string'||typeof a.description!=='string'||ids.has(a.id)||typeof a.requiresApproval!=='boolean')throw new Error('Invalid action contract');ids.add(a.id);}
    return s;
  }
  function checkpoint(reason){return {reason,goal,stage,summary:snapshot?.summary??'',actions:snapshot?.actions?.map(a=>({id:a.id,description:a.description}))??[],history:[...history]};}
  async function delegate(reason) {
    stats.handoffs++;const cp=checkpoint(reason);onEvent({type:'handoff',checkpoint:cp});
    if(!planner||stats.handoffs>maxHandoffs) return finish('handoff',{checkpoint:cp});
    const next=await planner(cp);
    if(!next||typeof next.goal!=='string'||!next.goal.trim()||Object.keys(next).some(k=>k!=='goal'))return finish('handoff',{checkpoint:cp});
    stage=next.goal;snapshot=await read();return null;
  }
  try {
    snapshot=await read();
    for(let i=0;i<maxDecisions;i++) {
      if(elapsed()>timeoutMs)return finish('budget');
      if(await verify(snapshot,goal))return finish('done',{verified:true});
      const offered={...snapshot,actions:snapshot.actions.filter(a=>!a.requiresApproval||approvals.has(a.id))};
      if(!offered.actions.length){const r=await delegate('no_authorized_actions');if(r)return r;continue;}
      const decision=await router.choose({goal:stage,snapshot:offered,history});stats.decisions++;
      onEvent({type:'decision',decision,elapsedMs:elapsed()});
      if(elapsed()>timeoutMs)return finish('budget');
      if(decision.route==='delegate'){const r=await delegate(decision.reason??'jev_requested');if(r)return r;continue;}
      if(decision.route==='refresh'){snapshot=await read();continue;}
      if(decision.route==='complete'){
        snapshot=await read();if(await verify(snapshot,goal))return finish('done',{verified:true});
        const r=await delegate('completion_not_verified');if(r)return r;continue;
      }
      const selected=offered.actions.find(a=>a.id===decision.actionId);
      if(decision.route!=='act'||!selected)throw new Error('Router selected an unavailable operation');
      const fresh=await read();
      if(fresh.revision!==snapshot.revision){snapshot=fresh;onEvent({type:'replan',reason:'state_changed'});continue;}
      const current=fresh.actions.find(a=>a.id===selected.id);
      if(!current||current.requiresApproval&&!approvals.has(current.id))throw new Error('Action authorization changed');
      if(elapsed()>timeoutMs)return finish('budget');
      const before=fresh.revision, actionStart=performance.now();
      try {await executor.execute(current,fresh);stats.actions++;}
      catch {
        snapshot=await read();
        if(await verify(snapshot,goal))return finish('done',{verified:true,note:'Input returned an error; the goal was independently verified.'});
        return finish('handoff',{checkpoint:checkpoint('input_outcome_unknown')});
      }
      snapshot=await read();history.push(current.description);
      onEvent({type:'action',actionId:current.id,elapsedMs:Math.round(performance.now()-actionStart)});
      if(await verify(snapshot,goal))return finish('done',{verified:true});
      if(snapshot.revision===before)return finish('handoff',{checkpoint:checkpoint('action_not_verified')});
    }
    return finish('budget');
  } catch(error){handoffReason=error.message;return finish('error',{reason:handoffReason});}
}
