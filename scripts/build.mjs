import { mkdir, copyFile, writeFile, readFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fusionArchive } from './archive.mjs';
import { manifest, noCacheHeaders } from './manifest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root, 'dist');
// dist contains generated output only; remove retired assets from previous builds.
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
const files = await manifest(root);
for (const file of files.web) {
  await mkdir(path.dirname(path.join(destination, file)), { recursive: true });
  await copyFile(path.join(root, file), path.join(destination, file));
}
await writeFile(path.join(destination, '_headers'), `${(await readFile(path.join(root, '_headers'), 'utf8')).trimEnd()}\n\n${noCacheHeaders(files.web)}\n`);
// One content version for scripts and CSS prevents mixing a cached UI with a newer skin.
const packageInfo = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
let revision = process.env.KINMO_REVISION || process.env.WORKERS_CI_COMMIT_SHA || process.env.GITHUB_SHA;
if (!revision) {
  try { revision = execFileSync('git', ['rev-parse', 'HEAD'], {cwd:root,stdio:['ignore','pipe','ignore']}).toString().trim(); }
  catch { revision = 'local'; }
}
await writeFile(path.join(destination, 'build-info.js'), `globalThis.KinmoBuild = Object.freeze(${JSON.stringify({version:process.env.KINMO_VERSION||packageInfo.version,revision,platform:process.env.KINMO_PLATFORM||'web',builtAt:new Date().toISOString()})});`);
const html = await readFile(path.join(destination, 'index.html'), 'utf8');
const references = [...html.matchAll(/(?:src|href)="\.\/([^"?]+\.(?:js|css))"/g)].map(match => match[1]);
const versionHash = createHash('sha256');
for (const file of references) versionHash.update(await readFile(path.join(destination, file)));
const version = versionHash.digest('hex').slice(0, 12);
await writeFile(path.join(destination, 'index.html'), html.replace(/((?:src|href)="\.\/[^"?]+\.(?:js|css))"/g, `$1?v=${version}"`));
await mkdir(path.join(destination, 'cad'), { recursive: true });
await writeFile(path.join(destination, 'cad', 'KinmoFusion.zip'), await fusionArchive(root));
console.log('Hotovo. Statická aplikácia je pripravená v priečinku dist/.');
