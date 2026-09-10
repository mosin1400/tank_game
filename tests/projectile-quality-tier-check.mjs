import fs from 'node:fs';

const settings=fs.readFileSync('src/ui/settings.js','utf8');
const projectiles=fs.readFileSync('src/combat/projectiles.js','utf8');

if(!settings.includes("projectileDetail"))throw new Error('quality presets must publish a projectile detail tier');
if(!/low:.*projectileDetail:'glow'/.test(settings))throw new Error('Low quality must use glow-only shells');
if(!/medium:.*projectileDetail:'glow'/.test(settings))throw new Error('Medium quality must use glow-only shells');
if(!projectiles.includes('projectileDetail'))throw new Error('projectile mesh must react to the active detail tier');
if(!projectiles.includes("b.body.visible=!lightweight"))throw new Error('low-detail shells must hide heavy geometry');
if(!projectiles.includes("lightweight||kind==='mg'?0"))throw new Error('low-detail shells must disable projectile lights');

console.log('projectile-quality-tier-check: PASS');
