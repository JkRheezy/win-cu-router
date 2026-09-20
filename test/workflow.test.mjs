import test from 'node:test';
import assert from 'node:assert/strict';
import {stopFeedback} from '../scripts/workflow-policy.mjs';
const state={baseline:{fingerprint:'old',codeFingerprint:'code-old'},fingerprint:'new',codeFingerprint:'code-new'};
test('old passing checks cannot certify changed source',()=>{
  assert.equal(stopFeedback({}, {...state,verification:{passed:true,fingerprint:'old',fullCodeVerified:true}}).decision,'block');
  assert.deepEqual(stopFeedback({}, {...state,verification:{passed:true,fingerprint:'new',fullCodeVerified:true}}),{});
});
test('docs-only checks cannot certify code changes',()=>{
  assert.equal(stopFeedback({}, {...state,verification:{passed:true,fingerprint:'new',fullCodeVerified:false}}).decision,'block');
  assert.deepEqual(stopFeedback({}, {...state,codeFingerprint:'code-old',verification:{passed:true,fingerprint:'new',fullCodeVerified:false}}),{});
});
test('feedback continues at most once and respects an explicit stop',()=>{
  assert.equal(stopFeedback({},state).decision,'block');
  assert.equal(stopFeedback({stop_hook_active:true},state).decision,undefined);
  assert.deepEqual(stopFeedback({last_assistant_message:'已停止，等待你的下一步指示。'},state),{});
});
test('unchanged or unattached sessions do not require unrelated work',()=>{
  assert.deepEqual(stopFeedback({}, {...state,fingerprint:'old'}),{});
  assert.deepEqual(stopFeedback({}, {...state,baseline:null}),{});
});
