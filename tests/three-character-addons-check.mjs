import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const addons=path.join(root,'vendor/three/examples/jsm');
const required=[
  ['loaders/GLTFLoader.js',80_000],
  ['utils/SkeletonUtils.js',7_000],
];

for(const [relative,minBytes] of required){
  const file=path.join(addons,relative);
  assert.ok(fs.existsSync(file),`${relative} must be available to the local three/addons import map`);
  const source=fs.readFileSync(file,'utf8');
  assert.ok(source.length>minBytes,`${relative} is truncated`);
  for(const match of source.matchAll(/from\s+['"](\.\.?\/[^'"]+)['"]/g)){
    const dependency=path.resolve(path.dirname(file),match[1]);
    assert.ok(fs.existsSync(dependency),`${relative} has missing local dependency ${match[1]}`);
  }
}
console.log('three-character-addons-check: PASS');
