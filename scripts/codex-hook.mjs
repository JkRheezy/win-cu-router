// Optional host-tool shim. Public checkouts work without a maintainer toolkit.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configFile = path.join(project, '.local/dev-workflow.json');
const config = fs.existsSync(configFile) ? JSON.parse(fs.readFileSync(configFile, 'utf8')) : null;
if (!config?.home) console.log('{}');
else {
  const {runHook} = await import(pathToFileURL(path.join(config.home, 'scripts/hook.mjs')).href);
  await runHook({project});
}
