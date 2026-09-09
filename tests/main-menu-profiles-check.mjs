import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const html=read('game.html');
const profileUi=read('src/profile/profile-ui.js');
const profileStore=read('src/profile/profile-store.js');
const campaignMap=read('src/ui/campaign-map.js');

assert.match(html,/id="btnProfileToggle"/,'main menu needs a compact profile toggle');
assert.match(html,/id="menuProfileSlots"/,'main menu needs profile slots');
assert.match(html,/id="btnMenuProfileCreate"/,'main menu needs profile creation');
assert.doesNotMatch(html,/id="btnMenuProfileRename"/,'renaming must happen from the profile itself');
assert.match(profileUi,/function renderMenuProfileSlots\(/,'main menu must render saved profiles');
assert.match(profileUi,/dblclick/,'profile cards must support double-click rename');
assert.match(profileUi,/function toggleMenuProfiles\(/,'the compact profile icon must open and close the panel');
assert.match(profileUi,/function continueMenuProfile\(/,'main menu must launch selected profile');
assert.match(profileStore,/function renameProfile\(/,'profile store must support renaming');
assert.match(profileStore,/function deleteProfile\(/,'profile store must support deletion');
assert.match(profileStore,/function appendProfile\(/,'profile store must allow growing beyond a fixed slot count');
assert.doesNotMatch(profileStore,/stored\.length===3/,'saved profiles must no longer be capped at three slots');
assert.match(campaignMap,/profilesButton\.addEventListener\('click',showMainMenu\)/,'map profile control must return to the main menu');

console.log('main menu profile checks passed');
