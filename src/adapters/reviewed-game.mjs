/** Supervised game experiment. The host must inspect every returned screenshot
 * and supply a new bounded observation. This is not automatic visual perception.
 */
export function reviewedGame({sky,window,router}) {
  if(window?.title!=='Slay the Spire 2'||!window.id)throw new Error('Expected the selected Slay the Spire 2 window');
  let revision=0, observation=null, offered=null;
  const history=[];
  function point(p,shot){return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.y>=0&&p.x<shot.width&&p.y<shot.height;}
  return {
    publish({state,summary,actions}) {
      offered=null;observation=null;revision++;
      const shot=state?.screenshots?.[0];
      if(state?.window?.id!==window.id||!shot?.id||!shot.width||!shot.height||typeof summary!=='string'||!Array.isArray(actions)||!actions.length||actions.length>30)throw new Error('Invalid reviewed game observation');
      const ids=new Set();
      for(const action of actions){
        if(typeof action.id!=='string'||ids.has(action.id)||typeof action.description!=='string')throw new Error('Invalid action');ids.add(action.id);
        if(action.kind==='click'?!point(action.at,shot):action.kind==='drag'?!point(action.from,shot)||!point(action.to,shot):true)throw new Error('Unobserved or unsupported input');
      }
      observation={revision:String(revision),app:'Slay the Spire 2',summary,actions:structuredClone(actions),shot,window:state.window};
    },
    async choose(goal) {
      if(!observation)throw new Error('Host must inspect and publish a new observation');
      const current=observation;
      const decision=await router.choose({goal,snapshot:{...current,actions:current.actions.map(a=>({id:a.id,description:a.description,requiresApproval:false}))},history});
      if(current!==observation)throw new Error('Observation changed during decision');
      const action=current.actions.find(a=>a.id===decision.actionId);
      if(decision.route==='act'&&!action)throw new Error('Unknown action');
      offered=Object.freeze({revision:current.revision,decision,action});return offered;
    },
    async execute(proposal) {
      if(proposal!==offered||!observation||proposal.revision!==observation.revision||proposal.decision.route!=='act')throw new Error('Proposal is not current or needs handoff');
      const current=observation,action=proposal.action;
      observation=null;offered=null; // consume before input; never retry ambiguity
      const start=performance.now();
      if(action.kind==='click')await sky.click({window:current.window,screenshotId:current.shot.id,...action.at});
      else await sky.drag({window:current.window,screenshotId:current.shot.id,from_x:action.from.x,from_y:action.from.y,to_x:action.to.x,to_y:action.to.y});
      const inputMs=Math.round(performance.now()-start);
      const state=await sky.get_window_state({window:current.window,include_screenshot:true,include_text:false});
      history.push(action.description);
      return {state,inputMs,apiMs:proposal.decision.latencyMs,actionId:action.id};
    },
    history(){return [...history];},
  };
}
