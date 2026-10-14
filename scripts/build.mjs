import { mkdir, copyFile, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fusionArchive } from './archive.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root, 'dist');
await mkdir(destination, { recursive: true });
for (const file of ['index.html', 'build-info.js', 'debug.js', 'native-client.js', 'app.js', 'advanced.js', 'usability.js', 'workflow.js', 'engine.js', 'double-drawer.js', 'editor.js', 'interaction.js', 'workbench.js', 'magic-import.js', 'magic-detection.js', 'context-menu.js', 'physics.js', 'slot-outline.js', 'scene-export.js', 'gif-export.js', 'exports.js', 'cad.js', 'styles.css', 'favicon.svg', '_headers', 'projects/dvojite-sklopeny-suflik-reference.png', ...['pdfmake.min.js', 'vfs_fonts.js', 'LICENSE', 'Roboto-LICENSE.txt', 'PROVENANCE.md'].map((file) => `vendor/pdfmake/${file}`)]) {
  await mkdir(path.dirname(path.join(destination, file)), { recursive: true });
  await copyFile(path.join(root, file), path.join(destination, file));
}
// One content version for scripts and CSS prevents mixing a cached UI with a newer skin.
const packageInfo = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
await writeFile(path.join(destination, 'build-info.js'), `globalThis.KinmoBuild = Object.freeze(${JSON.stringify({version:process.env.KINMO_VERSION||packageInfo.version,revision:process.env.KINMO_REVISION||'local',platform:process.env.KINMO_PLATFORM||'web',builtAt:new Date().toISOString()})});`);
const html = await readFile(path.join(destination, 'index.html'), 'utf8');
const references = [...html.matchAll(/(?:src|href)="\.\/([^"?]+\.(?:js|css))"/g)].map(match => match[1]);
const versionHash = createHash('sha256');
for (const file of references) versionHash.update(await readFile(path.join(destination, file)));
const version = versionHash.digest('hex').slice(0, 12);
await writeFile(path.join(destination, 'index.html'), html.replace(/((?:src|href)="\.\/[^"?]+\.(?:js|css))"/g, `$1?v=${version}"`));
await mkdir(path.join(destination, 'cad'), { recursive: true });
await writeFile(path.join(destination, 'cad', 'KinmoFusion.zip'), await fusionArchive(root));
console.log('Hotovo. Statická aplikácia je pripravená v priečinku dist/.');
