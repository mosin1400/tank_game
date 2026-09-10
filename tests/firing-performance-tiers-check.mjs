import fs from 'node:fs';

const settings=fs.readFileSync('src/ui/settings.js','utf8');
const runtime=fs.readFileSync('src/core/runtime.js','utf8');
const projectiles=fs.readFileSync('src/combat/projectiles.js','utf8');
const effects=fs.readFileSync('src/combat/effects.js','utf8');

if(!/low:.*projectilePool:14.*effectDetail:'minimal'/.test(settings))throw new Error('low preset needs a minimal projectile and impact budget');
if(!/medium:.*projectilePool:28.*effectDetail:'compact'/.test(settings))throw new Error('medium preset needs a compact projectile and impact budget');
if(!settings.includes('prepare:prepare'))throw new Error('settings must prepare quality budgets before scene pools are built');
if(!runtime.includes('GameSettings.prepare();'))throw new Error('runtime must apply saved quality before creating projectile pools');
if(!projectiles.includes('globalThis.projectilePool'))throw new Error('projectile pool must obey active quality capacity');
if(!projectiles.includes('projectilePoolLimit'))throw new Error('projectile spawning must respect the active quality limit');
if(!effects.includes('function getEffectDetail()'))throw new Error('effects must use a private quality accessor, not a window property name');
if(effects.includes('function effectDetail()'))throw new Error('effect quality accessor must not collide with global.effectDetail');
if(!effects.includes("getEffectDetail()==='minimal'"))throw new Error('minimal quality must bypass heavy explosion work');
if(!effects.includes('muzzleLightScale'))throw new Error('impact lights must be scaled by quality tier');

console.log('firing-performance-tiers-check: PASS');
