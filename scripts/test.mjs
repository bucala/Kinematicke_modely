import { spawnSync } from 'node:child_process';
import { manifest, root } from './manifest.mjs';

// Runs every tests/*.test.mjs listed in project-files.json; extra arguments go to node --test.
const { nodeTests } = await manifest();
const result = spawnSync(process.execPath, ['--test', ...process.argv.slice(2), ...nodeTests], { cwd: root, stdio: 'inherit' });
process.exit(result.status ?? 1);
