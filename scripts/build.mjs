import { mkdir, copyFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { fusionArchive } from './archive.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root, 'dist');
await mkdir(destination, { recursive: true });
for (const file of ['index.html', 'app.js', 'engine.js', 'double-drawer.js', 'editor.js', 'interaction.js', 'workbench.js', 'magic-import.js', 'magic-detection.js', 'context-menu.js', 'physics.js', 'slot-outline.js', 'scene-export.js', 'gif-export.js', 'exports.js', 'cad.js', 'styles.css', 'favicon.svg', '_headers', 'projects/dvojite-sklopeny-suflik-reference.png', ...['pdfmake.min.js', 'vfs_fonts.js', 'LICENSE', 'Roboto-LICENSE.txt', 'PROVENANCE.md'].map((file) => `vendor/pdfmake/${file}`)]) {
  await mkdir(path.dirname(path.join(destination, file)), { recursive: true });
  await copyFile(path.join(root, file), path.join(destination, file));
}
await mkdir(path.join(destination, 'cad'), { recursive: true });
await writeFile(path.join(destination, 'cad', 'KinmoFusion.zip'), await fusionArchive(root));
console.log('Hotovo. Statická aplikácia je pripravená v priečinku dist/.');
