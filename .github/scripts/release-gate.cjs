const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

module.exports = async ({github, context}) => {
  const {releaseProblems} = await import(pathToFileURL(path.resolve('scripts/sdlc-policy.mjs')).href);
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
