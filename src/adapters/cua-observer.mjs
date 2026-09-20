import {ScopedBridge} from './bridge.mjs';

/** Observation is independent of the task's action policy and chosen executor. */
export class CuaObservation extends ScopedBridge {
  capabilities(){return this.request('/capabilities');}
  restartSession(){return this.request('/restart-session',{});}
  read(tool,args={}){return this.request('/observe',{tool,args});}
  windows(args={}){return this.read('list_windows',args);}
  window(identity,options={}){return this.read('get_window_state',{...options,...identity});}
  screenshot(identity,options={}){return this.window(identity,{...options,include_accessibility_tree:false,include_screenshot:true});}
  bindBrowser(identity){return this.read('get_browser_state',identity);}
  browser(target,options={}){return this.read('get_browser_state',{snapshot_format:'semantic_v2',...options,...target});}
  zoom(identity,rect){return this.read('zoom',{...rect,...identity});}
  verify(identity,expect,options={}){return this.read('verify_state',{...options,...identity,expect});}
}

/** Text-only, bounded projection. Raw content/images are for the host, never Jev. */
export function observationText(envelope,{maxChars=12000}={}) {
  if(!Number.isInteger(maxChars)||maxChars<1||maxChars>100000)throw new Error('Invalid text budget');
  const data=envelope.data??{};
  const nodes=data.elements??[...(data.refs??[]),...(data.content_refs??[])];
  const text=JSON.stringify({source:envelope.source,tool:envelope.tool,ok:envelope.ok,
    page:data.page,windowTitle:data.window_title,
    nodes:nodes.map(n=>({role:n.role,label:n.label??n.name,value:n.value,enabled:n.enabled,states:n.states,visibility:n.visibility,actions:n.actions})),
    gaps:envelope.gaps?.map(g=>({code:g.code})),coverage:data.snapshot??{total:data.total_element_count,returned:data.returned_element_count}});
  return {text:text.slice(0,maxChars),truncated:text.length>maxChars,sourceEpoch:envelope.epoch};
}
