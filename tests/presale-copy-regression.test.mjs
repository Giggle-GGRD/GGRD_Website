import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexHtml = readFileSync(path.join(rootDir, 'index.html'), 'utf8');

test('renderowana strona nie zawiera starej 30-stage copy', () => {
  const forbiddenPatterns = [
    /30-stage/i,
    /30 stages/i,
    /\$1\.4M/i,
    /240x/i,
    /\$0\.005/i,
    /\$1\.20/i,
    /unsold tokens/i,
    /burned permanently/i,
    /stages 1–25/i,
    /stages 26–30/i,
    /sell-out based/i,
  ];

  forbiddenPatterns.forEach((pattern) => {
    assert.doesNotMatch(indexHtml, pattern);
  });
});

test('strona ładuje scentralizowany presale config przed runtimeem widgetu', () => {
  assert.match(indexHtml, /<script src="js\/presale-config\.js" defer><\/script>/);
  assert.match(indexHtml, /<script src="js\/app\.js" defer><\/script>/);
});
