import test from 'node:test';
import '../engine.js';
import '../double-drawer.js';
import '../editor.js';
import '../interaction.js';
import '../workbench.js';
import '../magic-import.js';
import '../physics.js';
import '../slot-outline.js';
import '../exports.js';
import './cases.js';
import './editor-cases.js';
import './interaction-cases.js';
import './workbench-cases.js';
import './magic-import-cases.js';
import './physics-cases.js';
import './export-cases.js';

for (const { name, run } of globalThis.KinematicsTestCases) {
  test(name, run);
}
