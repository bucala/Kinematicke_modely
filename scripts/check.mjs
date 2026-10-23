import { spawnSync } from 'node:child_process';
import { manifest, root } from './manifest.mjs';

// Syntax check of every JavaScript source listed in project-files.json.
const { javascript } = await manifest();
for (const file of javascript) {
  const result = spawnSync(process.execPath, ['--check', file], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) { console.error(`Syntaktická chyba: ${file}`); process.exit(result.status || 1); }
}
console.log(`Syntax je v poriadku (${javascript.length} súborov).`);
