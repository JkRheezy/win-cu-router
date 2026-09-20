/** Artifact consistency checks; the authoring host still reviews meaning. */
export const requiredChecks = ['javascript', 'python', 'docs', 'release', 'package'];

export function reviewProblems({intent, plan, review, fingerprint, changedPaths}) {
  const problems = [];
  if (!intent?.goal || !Array.isArray(intent.acceptance) || !intent.acceptance.length) problems.push('Missing intent or acceptance criteria');
  if (!plan?.baseCommit || !Array.isArray(plan.allowedPaths) || !plan.allowedPaths.length) problems.push('Missing base commit or allowed paths');
  if (requiredChecks.some(name => !plan?.validation?.includes(name))) problems.push('Plan omits required verification');
  if (review?.schemaVersion !== 1 || review?.status !== 'accepted' || review?.change !== intent?.id) problems.push('Missing accepted review for this change');
  if (!['host_self_review', 'independent_review'].includes(review?.mode) || !review?.reviewer) problems.push('Review must identify reviewer and mode');
  if (review?.sourceFingerprint !== fingerprint) problems.push('Review is stale: source fingerprint differs');
  if (!Array.isArray(review?.findings) || review.findings.some(f => !['resolved', 'accepted_limit'].includes(f.disposition) || !f.detail)) problems.push('Unresolved or missing review findings');
  const criteria = intent?.acceptance ?? [];
  if (new Set(criteria.map(c => c.id)).size !== criteria.length) problems.push('Duplicate acceptance ids');
  for (const criterion of criteria) {
    const matches = (review?.acceptance ?? []).filter(a => a.id === criterion.id);
    const evidence = matches[0];
    if (matches.length !== 1 || evidence?.result !== 'accepted' || !evidence?.evidence?.trim() ||
        !evidence?.checks?.length || evidence.checks.some(c => !requiredChecks.includes(c))) problems.push('Missing acceptance evidence: ' + criterion.id);
  }
  for (const file of changedPaths) {
    if (!plan?.allowedPaths?.some(p => p.endsWith('/') ? file.startsWith(p) : file === p)) problems.push('Unexpected change: ' + file);
  }
  return problems;
}

export function releaseProblems({branch, head, requestedVersion, packageVersion, runs}) {
  const problems = [];
  if (branch !== 'main') problems.push('Release must run on main');
  if (requestedVersion !== 'v' + packageVersion || !/^v\d+\.\d+\.\d+(?:-[a-z0-9.]+)?$/.test(requestedVersion)) problems.push('Version must match package.json');
  if (!runs.some(r => r.head_sha === head && r.head_branch === 'main' && r.event === 'push' && r.conclusion === 'success')) problems.push('No successful main push verification for this exact commit');
  return problems;
}
