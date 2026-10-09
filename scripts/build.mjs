import { mkdir, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root, 'dist');
await mkdir(destination, { recursive: true });
for (const file of ['index.html', 'app.js', 'engine.js', 'styles.css', 'favicon.svg', '_headers']) {
  await copyFile(path.join(root, file), path.join(destination, file));
}
console.log('Hotovo. Statická aplikácia je pripravená v priečinku dist/.');
