import path from 'node:path';

// Keep the user's project spelling. Resolving a junction can change the
// source-path identity that Codex uses for a hook's local trust record.
export function requestedProjectPath(cwd){return path.resolve(cwd);}
export function summarizeHooks(requestedPath,response){
  const key=p=>process.platform==='win32'?path.resolve(p).toLowerCase():path.resolve(p);
  const scope=response?.result?.data?.find(d=>key(d.cwd)===key(requestedPath));
  if(!scope)throw Error('Codex did not return the requested project scope');
  const hooks=scope.hooks.filter(h=>h.source==='project').map(h=>({event:h.eventName,enabled:h.enabled,trust:h.trustStatus,definitionHash:h.currentHash}));
  const expected=['sessionStart','stop'];
  const ready=expected.every(event=>hooks.some(h=>h.event===event&&h.enabled===true&&h.trust==='trusted'))&&!scope.errors.length;
  return {schemaVersion:1,checkedAt:new Date().toISOString(),requestedPath,loaded:hooks.length,ready,hooks,warnings:scope.warnings,errors:scope.errors,automaticExecution:'not_proven_by_status_query'};
}
