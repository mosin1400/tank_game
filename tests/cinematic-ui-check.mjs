import assert from 'node:assert/strict';
import fs from 'node:fs';
const css=fs.readFileSync(new URL('../styles/game.css',import.meta.url),'utf8');
for(const selector of ['#hud','#sticks','#btnFire','#btnMG','#tacticalCommands','#dmg','#dmgdir']){
  assert.match(css,new RegExp(`body\\.cinematic[^{}]*${selector.replace('#','\\#')}[^{}]*\\{[^}]*display\\s*:\\s*none\\s*!important`, 's'),
    `${selector} must be completely hidden during the opening cinematic`);
}
assert.doesNotMatch(css,/body\.cinematic[^{}]*#cinematicSubtitle[^{}]*\{[^}]*display\s*:\s*none/,
  'cinematic subtitles must remain visible while all gameplay UI is hidden');
console.log('cinematic-ui-check: PASS');
