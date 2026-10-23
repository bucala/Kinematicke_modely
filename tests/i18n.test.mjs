import test from 'node:test';
import assert from 'node:assert/strict';
import '../i18n.js';

const L = globalThis.KinmoI18n;

test('Translation never rewrites parts of words, so model names stay intact', () => {
  assert.equal(L.translate('Výstupné rameno', 'en'), 'Výstupné rameno');
  assert.equal(L.translate('Skryť Výstupné rameno', 'en'), 'Hide Výstupné rameno');
  assert.equal(L.translate('Pracovný priestor · Výstupné rameno', 'de'), 'Arbeitsbereich · Výstupné rameno');
});

test('Patterns translate numbers and keep verbatim file names', () => {
  assert.equal(L.translate('4 väzieb · 1 stupeň voľnosti', 'en'), '4 constraints · 1 degree of freedom');
  assert.equal(L.translate('Aktuálny pohľad, najviac 2 000 × 4 000 px, bez externého servera.', 'de'), 'Aktuelle Ansicht, höchstens 2 000 × 4 000 px, ohne externen Server.');
  assert.equal(L.translate('Súbor rameno-v2.kinmo bol pripravený na stiahnutie.', 'en'), 'File rameno-v2.kinmo is ready to download.');
  assert.equal(L.translate('4 prvkov · Aktuálny projekt · Výsuv a kulisa', 'en'), '4 elements · Current project · Slide and slot');
});

test('missing() reports exactly the parts left in Slovak', () => {
  assert.deepEqual(L.missing('Zobraziť prvky', 'en'), []);
  assert.deepEqual(L.missing('Skryť Výstupné rameno', 'en'), ['Výstupné rameno']);
  assert.deepEqual(L.missing('Súbor a.kinmo bol pripravený na stiahnutie.', 'de'), []);
  assert.deepEqual(L.missing('Úplne nový text', 'en'), ['Úplne nový text']);
  assert.deepEqual(L.missing('Úplne nový text', 'sk'), []);
});
