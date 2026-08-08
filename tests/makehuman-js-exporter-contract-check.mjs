import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const exporter = await readFile(new URL('../tools/characters/makehuman-js-exporter.html', import.meta.url), 'utf8');
const boot = await readFile(new URL('../src/boot.js', import.meta.url), 'utf8');
const notice = await readFile(new URL('../tools/characters/makehuman-js-license.md', import.meta.url), 'utf8');

assert.match(exporter, /makehuman\.Human/, 'exporter must instantiate makehuman-js');
assert.match(exporter, /setGender\(1\)/, 'exporter must constrain the source character to male');
assert.match(exporter, /vardan-male-base\.obj/, 'exporter must produce the expected Mixamo source filename');
assert.match(exporter, /makehuman-data-package\/package\/public\/data/, 'exporter must use the local MakeHuman data cache');
assert.match(notice, /AGPL-3\.0/, 'license notice must retain AGPL terms');
assert.doesNotMatch(boot, /three-r82|makehuman-js/i, 'legacy generator dependencies must never enter game boot');

console.log('makehuman-js-exporter-contract-check: PASS');
