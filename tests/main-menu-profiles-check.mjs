import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('game.html');
const profileUi=read('src/profile/profile-ui.js');
const profileStore=read('src/profile/profile-store.js');

assert.match(html,/id="menuProfileSlots"/,'main menu needs profile slots');
assert.match(html,/id="btnMenuProfileCreate"/,'main menu needs profile creation');
assert.match(html,/id="btnMenuProfileRename"/,'main menu needs rename control');
assert.match(profileUi,/function renderMenuProfileSlots\(/,'main menu must render saved profiles');
assert.match(profileUi,/function continueMenuProfile\(/,'main menu must launch selected profile');
assert.match(profileStore,/function renameProfile\(/,'profile store must support renaming');
assert.match(profileStore,/function deleteProfile\(/,'profile store must support deletion');

console.log('main menu profile checks passed');
