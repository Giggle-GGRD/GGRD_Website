import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appJs = readFileSync(path.join(rootDir, 'js', 'app.js'), 'utf8');
const require = createRequire(import.meta.url);
const config = require(path.join(rootDir, 'js', 'presale-config.js'));

test('presale config centralizuje kluczowe adresy i ABI', () => {
  assert.equal(config.presaleAddress, '0xd8983534dd3c369d85127f6C9B85d98768139387');
  assert.equal(config.defaultPayTokenAddress, '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d');
  assert.equal(config.saleTokenAddress, '0xA0d5663d57b7D7EF975D2F02BcAEaf5c94c671f9');
  assert.ok(config.presaleAbi.includes('function currentStageId() view returns (uint8)'));
  assert.ok(config.presaleAbi.includes('function stageConfig(uint8 stageId) view returns (uint256 allocation, uint256 priceScaled, uint256 walletCap, uint256 sold, uint256 raised)'));
  assert.ok(config.presaleAbi.includes('function buy(uint256 payIn) external'));
  assert.ok(config.erc20Abi.includes('function decimals() view returns (uint8)'));
});

test('runtime widgetu nie zawiera starych fallbacków i błędnych założeń o 18 decimals dla pay tokena', () => {
  const forbiddenSnippets = [
    'const STAGES =',
    'contract not yet deployed',
    'loadContractState',
    "parseUnits(value, 18)",
    '$1.4M hardcap',
    'stages 1–25',
  ];

  forbiddenSnippets.forEach((snippet) => {
    assert.equal(appJs.includes(snippet), false, `Forbidden snippet still present: ${snippet}`);
  });

  assert.match(appJs, /ethers\.parseUnits\(value, state\.presale\.payTokenDecimals\)/);
  assert.match(appJs, /window\.GGRDPresaleConfig/);
  assert.match(appJs, /presale\.stageConfig\(stageId\)/);
});
