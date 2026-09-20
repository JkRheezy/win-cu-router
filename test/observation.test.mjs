import test from 'node:test';
import assert from 'node:assert/strict';
import {CuaObservation,observationText} from '../src/index.mjs';

test('text projection excludes images, executable refs and local bindings',()=>{
  const raw={source:'trycua',tool:'get_window_state',ok:true,epoch:3,data:{elements:[{role:'Edit',label:'Draft',value:'hello',element_token:'private-token',frame:{x:1,y:2}}],screenshot:'secret-image'},content:[{type:'image',data:'secret-image'}],gaps:[]};
  const view=observationText(raw);
  assert.match(view.text,/hello/);assert.doesNotMatch(view.text,/private-token|secret-image|frame/);
  assert.equal(view.sourceEpoch,3);
  assert.equal(observationText(raw,{maxChars:10}).truncated,true);
  assert.equal(raw.data.elements[0].element_token,'private-token');
});

test('browser scope and continuation are sent through the authenticated observer',async()=>{
  let sent;
  const observer=new CuaObservation({url:'http://127.0.0.1:1234',token:'test-only',fetchImpl:async(url,options)=>{
    sent={url,...options};return {ok:true,json:async()=>({ok:true,data:{snapshot:{complete:false,continuation:'next'}}})};
  }});
  const result=await observer.browser({target_id:'bound',tab_id:'tab'},{continuation:'current',scope_ref:'p2:7'});
  assert.equal(sent.headers.Authorization,'Bearer test-only');
  assert.deepEqual(JSON.parse(sent.body),{tool:'get_browser_state',args:{snapshot_format:'semantic_v2',continuation:'current',scope_ref:'p2:7',target_id:'bound',tab_id:'tab'}});
  assert.equal(result.data.snapshot.continuation,'next');
});
