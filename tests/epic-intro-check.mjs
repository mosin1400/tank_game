import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('game.html');
const runtime=read('src/core/runtime.js');
const screens=read('src/ui/screens.js');

assert.match(html,/id="epicIntro"/,'an epic logo splash must exist');
assert.match(html,/id="mainMenu"/,'a separate main menu must exist');
assert.match(html,/id="loadingVideo"/,'the loading screen must use the supplied video');
assert.doesNotMatch(html,/id="menuVideo"/,'the main menu must not use the loading video');
assert.match(html,/id="btnMainSettings"/,'the main menu must expose settings');
assert.match(screens,/['"]mainMenu['"]/,'the screen router must know the main menu');
assert.match(runtime,/EpicIntro\.markLoaded\(\)/,'runtime must release the intro only after boot completes');
assert.doesNotMatch(runtime,/showProfileSelect\(\);\s*\n\s*step\('آماده نبرد!'/,'boot must not jump directly into profile selection');

const intro=read('src/ui/epic-intro.js');
assert.match(intro,/MIN_LOADER_MS/,'loader must have a minimum cinematic duration');
assert.match(intro,/showMainMenu\(\)/,'intro must enter the new main menu');

console.log('epic intro structure checks passed');
