const fs = require('node:fs');

function releaseProblems({branch, head, requestedVersion, packageVersion, runs}) {
  const problems = [];
  if (branch !== 'main') problems.push('Release must run on main');
  if (requestedVersion !== 'v' + packageVersion || !/^v\d+\.\d+\.\d+(?:-[a-z0-9.]+)?$/.test(requestedVersion)) problems.push('Version must match package.json');
  if (!runs.some(r => r.head_sha === head && r.head_branch === 'main' && r.event === 'push' && r.conclusion === 'success')) problems.push('No successful main push verification for this exact commit');
  return problems;
}

module.exports = async ({github, context}) => {
  const {owner, repo} = context.repo;
  const head = (await github.rest.git.getRef({owner, repo, ref: 'heads/main'})).data.object.sha;
  if (head !== context.sha) throw Error('main moved; verify and release its new commit');
  const runs = await github.paginate(github.rest.actions.listWorkflowRuns, {
    owner, repo, workflow_id: 'test.yml', head_sha: head, event: 'push', per_page: 100
  });
  const problems = releaseProblems({
    branch: context.ref.replace('refs/heads/', ''), head,
    requestedVersion: process.env.RELEASE_VERSION,
    packageVersion: JSON.parse(fs.readFileSync('package.json', 'utf8')).version,
    runs
  });
  if (problems.length) throw Error(problems.join('\n'));
};
module.exports.releaseProblems = releaseProblems;
