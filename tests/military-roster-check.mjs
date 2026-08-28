import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const roster=JSON.parse(await readFile(new URL(
  '../assets/models/characters/manifests/character-roster.json',import.meta.url
),'utf8'));

const civilians=roster.entries.filter(entry=>entry.faction==='civilian');
assert.deepEqual(civilians.map(entry=>entry.id),[],
  'campaign roster must not retain civilian characters');
assert.ok(roster.entries.every(entry=>entry.faction==='vardan'||entry.faction==='ash'),
  'every campaign character must belong to a military faction');

const source=await readFile(new URL('../src/assets/character-roster.js',import.meta.url),'utf8');
const context=vm.createContext({console});
vm.runInContext(source,context,{filename:'src/assets/character-roster.js'});
assert.equal(context.CharacterRoster.validate(roster),true,
  'the military-only manifest must satisfy the runtime contract');
const civilian=structuredClone(roster);
civilian.entries[0].faction='civilian';
assert.throws(()=>context.CharacterRoster.validate(civilian),/Invalid character faction/,
  'runtime validation must reject the removed civilian faction');

console.log('military-roster-check: PASS');
