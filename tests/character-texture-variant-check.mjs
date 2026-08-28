import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const manifestPath = path.join(root, 'assets/models/characters/textures/variants/manifest.json');
assert.ok(fs.existsSync(manifestPath), 'texture variant manifest is missing');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert.equal(manifest.schemaVersion, 1);
assert.equal(Object.keys(manifest.roles).length, 22, 'all 22 roster roles need a texture variant');
assert.equal(Object.keys(manifest.variants).length, 9, 'expected nine reusable visual variants');

const hashes = new Set();
for (const [variantId, variant] of Object.entries(manifest.variants)) {
  assert.match(variant.albedo, /^assets\/models\/characters\/textures\/variants\/[a-z0-9-]+\.png$/);
  const absolute = path.join(root, variant.albedo);
  assert.ok(fs.existsSync(absolute), `${variantId}: missing albedo`);
  const bytes = fs.readFileSync(absolute);
  assert.ok(bytes.length > 32_000, `${variantId}: suspiciously small texture`);
  assert.equal(bytes.subarray(1, 4).toString('ascii'), 'PNG', `${variantId}: invalid PNG`);
  assert.equal(bytes.readUInt32BE(16), 1024, `${variantId}: width must be 1024`);
  assert.equal(bytes.readUInt32BE(20), 1024, `${variantId}: height must be 1024`);
  hashes.add(crypto.createHash('sha256').update(bytes).digest('hex'));
}
assert.equal(hashes.size, 9, 'all nine albedos must have distinct pixel content');

for (const [roleId, variantId] of Object.entries(manifest.roles)) {
  assert.ok(manifest.variants[variantId], `${roleId}: unknown variant ${variantId}`);
}

console.log('character-texture-variant-check: PASS');
