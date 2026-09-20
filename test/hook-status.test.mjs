import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {requestedProjectPath,summarizeHooks} from '../scripts/hook-status.mjs';
const a=path.resolve('registered-project'),b=path.resolve('canonical-alias');
function scope(cwd,trust){return {cwd,warnings:[],errors:[],hooks:['sessionStart','stop'].map(eventName=>({eventName,source:'project',enabled:true,trustStatus:trust,currentHash:'example'}))};}
test('status remains scoped to the user project alias',()=>{
  const response={result:{data:[scope(b,'untrusted'),scope(a,'trusted')]}};
  assert.equal(requestedProjectPath(a),a);
  assert.equal(summarizeHooks(a,response).ready,true);
  assert.equal(summarizeHooks(b,response).ready,false);
});
test('enabled does not imply trusted and both required events must be present',()=>{
  assert.equal(summarizeHooks(a,{result:{data:[scope(a,'untrusted')]}}).ready,false);
  const s=scope(a,'trusted');s.hooks.pop();assert.equal(summarizeHooks(a,{result:{data:[s]}}).ready,false);
});
test('a different scope or a loader error cannot certify activation',()=>{
  assert.throws(()=>summarizeHooks(a,{result:{data:[scope(b,'trusted')]}}));
  const s=scope(a,'trusted');s.errors.push({message:'invalid configuration'});
  assert.equal(summarizeHooks(a,{result:{data:[s]}}).ready,false);
});
