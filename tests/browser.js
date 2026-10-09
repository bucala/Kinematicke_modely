'use strict';
let passed = 0;
const failed = [];
for (const { name, run } of globalThis.KinematicsTestCases) {
  const item = document.createElement('li');
  item.textContent = name;
  try { run(); item.className = 'pass'; passed++; }
  catch (error) {
    item.className = 'fail';
    const message = document.createElement('pre');
    message.textContent = error.message;
    item.append(message); failed.push({ name, message: error.message });
  }
  document.getElementById('results').append(item);
}
const total = globalThis.KinematicsTestCases.length;
const summary = document.getElementById('summary');
summary.textContent = `${passed} / ${total} testov úspešných${failed.length ? ` · ${failed.length} zlyhaní` : ' · všetky kontroly splnené'}.`;
if (failed.length) { summary.style.background = '#fff0ea'; summary.style.color = '#a66051'; }
globalThis.KinematicsTestResult = { passed, total, failed };
