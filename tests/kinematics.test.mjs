import test from 'node:test';
import '../engine.js';
import '../double-drawer.js';
import '../editor.js';
import '../physics.js';
import '../exports.js';
import './cases.js';
import './editor-cases.js';
import './physics-cases.js';
import './export-cases.js';

for (const { name, run } of globalThis.KinematicsTestCases) {
  test(name, run);
}
