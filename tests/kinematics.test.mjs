import test from 'node:test';
import '../engine.js';
import './cases.js';

for (const { name, run } of globalThis.KinematicsTestCases) {
  test(name, run);
}
