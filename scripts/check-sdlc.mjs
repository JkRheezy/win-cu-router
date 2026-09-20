import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {root, sourceFiles, fingerprint, readJson} from './workflow-state.mjs';
import {reviewProblems} from './sdlc-policy.mjs';

const config = readJson(path.join(root, '.github/sdlc.json'));
if (!/^[a-z0-9][a-z0-9-]{0,80}$/.test(config?.change ?? '')) throw Error('Invalid active change');
const directory = 'docs/changes/' + config.change;
const reviewPath = directory + '/review.json';
const sourceFingerprint = fingerprint(sourceFiles().filter(f => f !== reviewPath));
if (process.argv.includes('--fingerprint')) {
  console.log(sourceFingerprint);
} else {
  const intent = readJson(path.join(root, directory, 'intent.json'));
  const plan = readJson(path.join(root, directory, 'plan.json'));
  const review = readJson(path.join(root, reviewPath));
  if (!/^[a-f0-9]{7,40}$/.test(plan?.baseCommit ?? '')) throw Error('Plan requires a concrete base commit');
  const git = args => execFileSync('git', args, {cwd: root, encoding: 'utf8', windowsHide: true}).split('\0').filter(Boolean);
  const changedPaths = [...new Set([
    ...git(['diff', '--name-only', '-z', plan.baseCommit, '--']),
    ...git(['ls-files', '--others', '--exclude-standard', '-z'])
  ])];
  const problems = reviewProblems({intent, plan, review, fingerprint: sourceFingerprint, changedPaths});
  if (problems.length) throw Error(problems.join('\n'));
  console.log(`SDLC review and ${intent.acceptance.length} acceptance mappings match source ${sourceFingerprint}. Review mode: ${review.mode}.`);
}
