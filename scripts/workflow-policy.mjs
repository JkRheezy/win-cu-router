/** Completion feedback is bounded; it never grants permissions or certifies a live CU task. */
export function stopFeedback(input,{baseline,fingerprint,codeFingerprint,verification}){
  if(/已停止|已暂停|按.*要求.*停止|\b(stopped|paused)\b/i.test(input.last_assistant_message??''))return {};
  if(!baseline||baseline.fingerprint===fingerprint)return {};
  const codeChanged=baseline.codeFingerprint!==codeFingerprint;
  const ready=verification?.passed===true&&verification.fingerprint===fingerprint&&(!codeChanged||verification.fullCodeVerified===true);
  if(ready)return {};
  if(input.stop_hook_active)return {systemMessage:'Current source is not covered by a passing verification record. Report that limitation; the hook will not create another continuation.'};
  return {decision:'block',reason:'This project changed after the session began. Run npm run '+(codeChanged?'verify':'verify:docs')+', fix concrete failures, and report verification limits. Respect any user instruction to stop. This hook requests at most one continuation.'};
}
