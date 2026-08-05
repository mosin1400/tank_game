# Campaign Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 20-stage list with the approved data-driven 40-stage campaign, persisted per local profile and presented on the country map, while preserving every playable capability currently in the game.

**Architecture:** Keep the ordered classic-script runtime, but add a `campaign/` data layer and a `profile/` persistence layer before changing UI or mission runtime. `CAMPAIGN_MISSIONS` is the single source of truth; the map, briefing, progress, air-state, cinematics and legacy mission adapter consume it. Existing `MISSIONS`, weapons, controls, effects, pause, mute and the three cheat shortcuts remain available through a compatibility adapter while richer objective modes are introduced incrementally.

**Tech Stack:** Static browser JavaScript, Three.js 0.160.0, Web Audio API, HTML, CSS, localStorage, PowerShell regression checks, local Python HTTP server.

## Global Constraints

- Preserve desktop/mobile controls, pause, mute, synthesized effects, mission music, local/offline Three.js, weapons, visual effects, saving and both unlock/reset cheat shortcuts.
- Use Persian player-visible text and the olive palette `#e6ead1`, `#aab668`, `#8a9a4e`.
- The campaign contains exactly 40 ordered missions and exactly 40 live map nodes; no status text is baked into the map artwork.
- Existing `t34war_v2` progress must migrate safely rather than be silently discarded.
- The M20 cinematic is skippable from its first frame and its essential briefing is repeated at M21.
- Enemy airstrikes must show a warning and a valid cover response; friendly air support is limited and never completes a mission by itself.
- Use test-first changes and one focused Git commit per completed task.

---

## File map

| Path | Responsibility |
| --- | --- |
| `src/campaign/mission-data.js` | Immutable 40-record campaign roster derived from the approved specification. |
| `src/campaign/campaign-state.js` | Mission lookup, progress status, effect gating and legacy objective adaptation. |
| `src/profile/profile-store.js` | Three-slot profile schema, migration, load/save/reset operations. |
| `src/profile/profile-ui.js` | Entry screen and profile-slot rendering/selection. |
| `src/ui/campaign-map.js` | 40 live circular map nodes, keyboard/touch selection and status classes. |
| `src/ui/mission-briefing.js` | Lower map briefing panel and launch handoff. |
| `src/ui/briefing-cinematics.js` | Skippable M20 cinematic state and replay-safe summary. |
| `src/combat/air-operations.js` | Warning timer, cover test, enemy sortie scheduling and bounded friendly support. |
| `styles/profile.css` | Entry/profile screen styles. |
| `styles/campaign-map.css` | Map, mission node, briefing and cinematic styles. |
| `tests/campaign-foundation-check.ps1` | Static structural regression check runnable without network. |

## Task 1: Create the campaign regression harness

**Files:**
- Create: `tests/campaign-foundation-check.ps1`
- Modify: none

**Consumes:** Existing `src/boot.js`, `src/missions/definitions.js`, `game.html`.

**Produces:** `Invoke-CampaignFoundationCheck -Root <path>` which exits nonzero with a useful assertion name.

- [ ] **Step 1: Write the failing test**

Create this test skeleton before campaign files exist:

```powershell
param([string]$Root = (Resolve-Path "$PSScriptRoot/.."))
$ErrorActionPreference = 'Stop'
function Assert-True([bool]$Condition, [string]$Name) {
  if (-not $Condition) { throw "CHECK FAILED: $Name" }
  "PASS: $Name"
}
$campaign = Join-Path $Root 'src/campaign/mission-data.js'
Assert-True (Test-Path $campaign) 'campaign data file exists'
$raw = Get-Content $campaign -Raw
Assert-True (($raw -split "id:'M").Count -eq 41) 'contains forty mission ids'
```

- [ ] **Step 2: Run it to verify it fails**

Run: `powershell -ExecutionPolicy Bypass -File tests/campaign-foundation-check.ps1`

Expected: `CHECK FAILED: campaign data file exists`.

- [ ] **Step 3: Complete checks for all foundation contracts**

Extend the same script with these exact assertions after the roster assertion:

```powershell
Assert-True (($raw -match "const CAMPAIGN_MISSIONS") -and ($raw -match "Object\.freeze")) 'mission roster is immutable'
Assert-True ((Get-Content (Join-Path $Root 'src/boot.js') -Raw) -match 'src/campaign/mission-data.js') 'boot loads campaign roster'
Assert-True ((Get-Content (Join-Path $Root 'src/boot.js') -Raw) -match 'src/profile/profile-store.js') 'boot loads profiles before screens'
Assert-True ((Get-Content (Join-Path $Root 'src/ui/campaign-map.js') -Raw) -match 'renderCampaignMap') 'map renderer exists'
Assert-True ((Get-Content (Join-Path $Root 'src/combat/air-operations.js') -Raw) -match 'scheduleAirStrike') 'air operation scheduler exists'
```

- [ ] **Step 4: Run the test**

Run: `powershell -ExecutionPolicy Bypass -File tests/campaign-foundation-check.ps1`

Expected: still fails at the first missing implementation assertion until later tasks.

- [ ] **Step 5: Commit the harness**

```powershell
git add tests/campaign-foundation-check.ps1
git commit -m "test: add campaign foundation regression harness"
```

## Task 2: Add the immutable 40-mission campaign data layer

**Files:**
- Create: `src/campaign/mission-data.js`, `src/campaign/campaign-state.js`
- Modify: `src/boot.js`, `src/missions/definitions.js`, `src/missions/director.js`, `src/ui/screens.js`, `src/input/controls.js`
- Test: `tests/campaign-foundation-check.ps1`

**Consumes:** `docs/superpowers/specs/2026-08-05-campaign-40-missions-design.md`.

**Produces:** `CAMPAIGN_MISSIONS`, `getCampaignMission(id)`, `getMissionStatus(id, profile)`, `getCampaignEffect(profile, effectId)`, and a compatibility `MISSIONS` array consumed by the existing director.

- [ ] **Step 1: Add failing data-shape assertions**

Append to the regression script:

```powershell
Assert-True (($raw -match "mapNode:'M01'") -and ($raw -match "mapNode:'M40'")) 'first and final map nodes exist'
Assert-True (($raw -match "sceneId:'scene-01'") -and ($raw -match "sceneId:'scene-40'")) 'every endpoint has a scene id'
Assert-True (($raw -match "airProfile:") -and ($raw -match "persistentEffect:")) 'air and persistent effect metadata exist'
$screensRaw=Get-Content (Join-Path $Root 'src/ui/screens.js') -Raw
$directorRaw=Get-Content (Join-Path $Root 'src/missions/director.js') -Raw
Assert-True (($screensRaw -match 'MISSIONS.length') -and ($directorRaw -match 'MISSIONS.length')) 'campaign UI and victory limits are data-driven'
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `powershell -ExecutionPolicy Bypass -File tests/campaign-foundation-check.ps1`

Expected: failure because the campaign roster does not yet exist.

- [ ] **Step 3: Author the roster and adapter**

Use one frozen record per M01–M40 from the approved design. Every record must conform to this exact shape; `runtime` remains deliberately compatible with the current director until dedicated objective controllers are added:

```javascript
const CAMPAIGN_MISSIONS=Object.freeze([
  Object.freeze({
    id:'M01',act:1,mapNode:'M01',title:'سوت آخر',
    briefing:'حمله با خروج آخرین قطار آغاز می‌شود؛ مسیر را نگه دار.',
    primaryObjective:{kind:'survive',value:70,label:'از قطار تا خروج محافظت کن'},
    optionalObjective:{kind:'protect',value:3,label:'سه کامیون را سالم نگه دار'},
    enemyRoster:['light','light','medium'],airProfile:'none',sceneId:'scene-01',
    weather:'rain',palette:'dusk',reward:{stars:3,label:'نشان نگهبان خط'},
    persistentEffect:null,runtime:{t:'survive',v:70,c:1}
  }),
]);
function getCampaignMission(id){ return CAMPAIGN_MISSIONS.find(m=>m.id===id)||null; }
function toLegacyMission(m){ return {n:m.title,d:m.briefing,t:m.runtime.t,v:m.runtime.v,p:m.palette,c:m.act,bossName:m.runtime.bossName,bossHp:m.runtime.bossHp}; }
const MISSIONS=CAMPAIGN_MISSIONS.map(toLegacyMission);
```

Add 39 further **individual** frozen literals, in this exact order and with the corresponding values from the approved campaign specification: `M02 خاک نرم`, `M03 پل یک‌نفره`, `M04 چراغ‌های خاموش`, `M05 مه بالای رهان`, `M06 دندان سنگی`, `M07 باند متروک`, `M08 انبار سرخ`, `M09 قطار بی‌صدا`, `M10 خروج از باران`, `M11 پل شیشه‌ای`, `M12 بازار سوخته`, `M13 کارخانه بی‌خواب`, `M14 چشم آسمان`, `M15 کانال سرد`, `M16 سایه برج‌ها`, `M17 باند دوم`, `M18 آتش پدافند`, `M19 سپر نوین`, `M20 ایستگاه صفر`, `M21 ریل برفی`, `M22 صدای درختان`, `M23 معدن خاموش`, `M24 گردنه کور`, `M25 آب سیاه`, `M26 ایستگاه شنود`, `M27 شبکه کور`, `M28 پل یخ‌زده`, `M29 دژ بیرونی`, `M30 ذخیره خاکستر`, `M31 راه آب`, `M32 دریچه سوم`, `M33 ستون فولاد`, `M34 تونل شماره هفت`, `M35 نشان سد`, `M36 آسمان باز`, `M37 دیوار آخر`, `M38 پنجره آبی`, `M39 فرمان وارن`, `M40 خط آهن آخر`. Each literal has every field demonstrated for M01; campaign effects are exactly `fuelCut` (M08), `airIntel` (M14), `flakBroken` (M18), `railOpen` (M20), `radarBlind` (M27), `supplyBurned` (M30), `damSignal` (M35), and `skyWindow` (M38).

In `campaign-state.js`, define the status contract:

```javascript
function getMissionStatus(id,profile){
  const index=CAMPAIGN_MISSIONS.findIndex(m=>m.id===id);
  if(index<0)return 'locked';
  if(profile.completed[id]?.stars===3)return 'perfected';
  if(profile.completed[id])return 'completed';
  return index===profile.unlockedIndex?'available':'locked';
}
function getCampaignEffect(profile,effectId){ return Boolean(profile.effects[effectId]); }
```

Add both new files after audio and before UI files in `src/boot.js`. Remove the old literal 20-record `MISSIONS` declaration while preserving palettes, weapon definitions, `objectiveText`, `mDiff` and existing global names.

Replace every campaign-length constant that controls progress or navigation with `MISSIONS.length`; do not alter unrelated gameplay timings such as the 20-second power-up interval. The required replacements are:

```javascript
// src/ui/screens.js
function totalStars(){ let n=0; for(let i=0;i<MISSIONS.length;i++)n+=prog.s[i]||0; return n; }
// all displayed maxima: MISSIONS.length and MISSIONS.length*3
// src/input/controls.js
document.getElementById('btnNext').addEventListener('click',()=>startMission(Math.min(MISSIONS.length-1,curMission.idx+1)));
// src/missions/director.js
prog.u=Math.max(prog.u,Math.min(MISSIONS.length,M.idx+2));
document.getElementById('btnNext').style.display=M.idx<MISSIONS.length-1?'':'none';
// src/ui/screens.js, Ctrl+Shift+Alt+E
prog.u=MISSIONS.length; for(var i=0;i<MISSIONS.length;i++)prog.s[i]=Math.max(prog.s[i]||0,3);
```

- [ ] **Step 4: Run data checks and syntax checks**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File tests/campaign-foundation-check.ps1
node --check src/campaign/mission-data.js
node --check src/campaign/campaign-state.js
```

Expected: all pass; the old director still sees a 40-record `MISSIONS` adapter.

- [ ] **Step 5: Commit the data layer**

```powershell
git add src/campaign src/missions/definitions.js src/missions/director.js src/ui/screens.js src/input/controls.js src/boot.js tests/campaign-foundation-check.ps1
git commit -m "feat: add forty-mission campaign data"
```

## Task 3: Replace one global save with three safe profile slots

**Files:**
- Create: `src/profile/profile-store.js`
- Modify: `src/missions/definitions.js`, `src/ui/screens.js`, `src/boot.js`
- Test: `tests/campaign-foundation-check.ps1`

**Consumes:** `CAMPAIGN_MISSIONS`, existing `t34war_v2` progress and cheat commands.

**Produces:** `createProfile(name)`, `loadProfile(slot)`, `saveActiveProfile()`, `resetActiveProgress()`, `activeProfile`, and a legacy migration that preserves stars/unlock count.

- [ ] **Step 1: Add a failing migration check**

Append:

```powershell
$profileRaw=Get-Content (Join-Path $Root 'src/profile/profile-store.js') -Raw
Assert-True ($profileRaw -match "const PROFILE_STORAGE_KEY='t34war_profiles_v1'") 'versioned profile storage key exists'
Assert-True ($profileRaw -match "localStorage.getItem\('t34war_v2'\)") 'legacy progress migration exists'
Assert-True ($profileRaw -match 'function saveActiveProfile\(') 'active profile save function exists'
```

- [ ] **Step 2: Run it to verify it fails**

Run: `powershell -ExecutionPolicy Bypass -File tests/campaign-foundation-check.ps1`

Expected: profile storage assertion fails.

- [ ] **Step 3: Implement the profile schema and migration**

```javascript
const PROFILE_STORAGE_KEY='t34war_profiles_v1';
let activeProfile=null,activeProfileSlot=-1;
function createProfile(name){
  return {version:1,name:name.trim().slice(0,20)||'فرمانده',unlockedIndex:0,
    completed:{},effects:{},lastMissionId:'M01',stars:0,score:0,playSeconds:0,difficulty:'standard'};
}
function migrateLegacyProgress(){
  const raw=localStorage.getItem('t34war_v2'); if(!raw)return null;
  const old=JSON.parse(raw); const p=createProfile('فرمانده');
  p.unlockedIndex=Math.min(39,Math.max(0,(old.u||1)-1));
  Object.keys(old.s||{}).forEach(i=>{const m=CAMPAIGN_MISSIONS[Number(i)];if(m)p.completed[m.id]={stars:Math.min(3,old.s[i]||0)};});
  return p;
}
```

Store exactly three nullable slots, migrate once only when no profile store exists, and retain `prog={u,s}` as a derived compatibility view. Change `saveProg()` so it writes the active profile and derived legacy view, never a separate competing source. Change unlock-all/reset-lock shortcuts to alter `activeProfile` then call `saveActiveProfile()`.

- [ ] **Step 4: Run checks**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File tests/campaign-foundation-check.ps1
node --check src/profile/profile-store.js
```

Expected: pass; migration clamps legacy unlocks to M40 and preserves recorded stars.

- [ ] **Step 5: Commit profiles**

```powershell
git add src/profile/profile-store.js src/missions/definitions.js src/ui/screens.js src/boot.js tests/campaign-foundation-check.ps1
git commit -m "feat: add safe local campaign profiles"
```

## Task 4: Build the professional entry and profile selection UI

**Files:**
- Create: `src/profile/profile-ui.js`, `styles/profile.css`
- Modify: `game.html`, `src/input/controls.js`, `src/ui/screens.js`, `src/boot.js`
- Test: `tests/campaign-foundation-check.ps1`

**Consumes:** profile-store API and campaign mission statuses.

**Produces:** title entry screen, three slot cards, new-profile confirmation, continue action and keyboard-accessible profile controls.

- [ ] **Step 1: Add failing DOM and style checks**

Append:

```powershell
$html=Get-Content (Join-Path $Root 'game.html') -Raw
Assert-True ($html -match 'id="profileSelect"') 'profile screen container exists'
Assert-True ((Get-Content (Join-Path $Root 'styles/profile.css') -Raw) -match '--olive-light:\s*#e6ead1') 'profile palette token exists'
```

- [ ] **Step 2: Run it to verify it fails**

Run: `powershell -ExecutionPolicy Bypass -File tests/campaign-foundation-check.ps1`

Expected: `profile screen container exists` fails.

- [ ] **Step 3: Implement accessible slots and title actions**

Insert `#profileSelect`, `#profileSlots`, `#profileName`, `#profileConfirm`, `#btnProfileContinue`, `#btnProfileNew` and `#btnProfileBack` into `game.html`. Each used slot card renders name, act, progress percentage, last mission, stars and play time. Render slots using this event contract:

```javascript
function renderProfileSlots(){
  profileSlotsEl.innerHTML='';
  listProfiles().forEach((profile,slot)=>{
    const button=document.createElement('button'); button.type='button';
    button.className='profile-slot'; button.disabled=!profile;
    button.dataset.slot=slot;
    button.textContent=profile?`${profile.name} · ${profile.stars} ستاره`:`جایگاه خالی ${faNum(slot+1)}`;
    button.addEventListener('click',()=>selectProfileSlot(slot));
    profileSlotsEl.appendChild(button);
  });
}
```

The title's Continue button loads `activeProfile.lastMissionId`, while New Profile requires an explicit confirmation before replacing a used slot. Do not remove the existing menu; make it the in-campaign menu reached after profile selection.

- [ ] **Step 4: Run checks and manual keyboard smoke test**

Run: `powershell -ExecutionPolicy Bypass -File tests/campaign-foundation-check.ps1`

Manual: tab through three slots; create a profile; reload the page; verify the slot shows the same name and zero-percent progress.

- [ ] **Step 5: Commit profile UI**

```powershell
git add game.html src/profile/profile-ui.js src/input/controls.js src/ui/screens.js src/boot.js styles/profile.css tests/campaign-foundation-check.ps1
git commit -m "feat: add professional profile entry screen"
```

## Task 5: Replace the mission grid with the live country map and lower briefing

**Files:**
- Create: `src/ui/campaign-map.js`, `src/ui/mission-briefing.js`, `styles/campaign-map.css`
- Modify: `game.html`, `src/ui/screens.js`, `src/input/controls.js`, `src/boot.js`
- Test: `tests/campaign-foundation-check.ps1`

**Consumes:** `CAMPAIGN_MISSIONS`, active profile, `assets/images/campaign-map-v3.png`.

**Produces:** exactly 40 circular mission buttons, selected-node state, lower briefing panel and launch action.

- [ ] **Step 1: Add a failing node-count and asset check**

Append:

```powershell
$mapRaw=Get-Content (Join-Path $Root 'src/ui/campaign-map.js') -Raw
Assert-True ($mapRaw -match 'CAMPAIGN_MISSIONS.forEach') 'map renders from campaign data'
Assert-True ($mapRaw -match 'campaign-map-v3.png') 'map uses approved artwork'
Assert-True ($mapRaw -match "className='map-node'") 'map node class is emitted'
Assert-True (Test-Path (Join-Path $Root 'assets/images/campaign-map-v3.png')) 'approved map asset exists'
```

- [ ] **Step 2: Run it to verify it fails**

Run: `powershell -ExecutionPolicy Bypass -File tests/campaign-foundation-check.ps1`

Expected: map renderer assertion fails.

- [ ] **Step 3: Implement map coordinates and briefing handoff**

Create an explicit 40-coordinate `MAP_NODE_POSITIONS` map, not random placement:

```javascript
const MAP_NODE_POSITIONS=Object.freeze({
  M01:[12,86],M02:[16,82],M03:[20,78],M04:[25,75],M05:[29,72],
  M06:[33,69],M07:[37,66],M08:[40,62],M09:[43,59],M10:[46,56],
  M11:[49,53],M12:[52,50],M13:[55,48],M14:[58,46],M15:[60,44],
  M16:[62,42],M17:[64,40],M18:[66,38],M19:[68,36],M20:[70,34],
  M21:[69,31],M22:[68,28],M23:[69,25],M24:[71,22],M25:[73,20],
  M26:[75,18],M27:[77,16],M28:[79,14],M29:[81,12],M30:[83,10],
  M31:[82,13],M32:[83,17],M33:[85,21],M34:[86,25],M35:[87,29],
  M36:[88,33],M37:[89,37],M38:[90,41],M39:[91,45],M40:[92,49]
});
```

Each node gets `aria-label`, `data-mission-id`, status class from `getMissionStatus`, and keyboard activation. `renderMissionBriefing(id)` must show act, story, primary objective, optional objective, enemy warning, weather, air warning, reward, best stars and the existing Launch button. On touch screens the map container pans with pointer events; desktop supports wheel zoom constrained between `1` and `1.65`.

- [ ] **Step 4: Run checks and map smoke test**

Run: `powershell -ExecutionPolicy Bypass -File tests/campaign-foundation-check.ps1`

Manual: open M01, confirm M02 is locked; complete M01; reload; confirm M02 becomes available and the lower panel updates without page navigation.

- [ ] **Step 5: Commit map UI**

```powershell
git add game.html src/ui/campaign-map.js src/ui/mission-briefing.js src/ui/screens.js src/input/controls.js src/boot.js styles/campaign-map.css tests/campaign-foundation-check.ps1 assets/images/campaign-map-v3.png
git commit -m "feat: add interactive forty-node campaign map"
```

## Task 6: Implement air operations and persistent campaign effects

**Files:**
- Create: `src/combat/air-operations.js`
- Modify: `src/missions/director.js`, `src/combat/combat.js`, `src/world/battlefield.js`, `src/ui/game-ui.js`, `src/ui/screens.js`, `src/boot.js`
- Test: `tests/campaign-foundation-check.ps1`

**Consumes:** mission `airProfile`, `persistentEffect`, active profile and static obstacle data.

**Produces:** `startAirOperations(mission)`, `updateAirOperations(dt)`, `scheduleAirStrike()`, `requestFriendlySupport(target)` and persistent effect application after victory.

- [ ] **Step 1: Add failing safety assertions**

Append:

```powershell
$airRaw=Get-Content (Join-Path $Root 'src/combat/air-operations.js') -Raw
Assert-True ($airRaw -match 'function isPlayerInAirCover\(') 'air cover test exists'
Assert-True ($airRaw -match 'warningLeft') 'air warning timer exists'
Assert-True ($airRaw -match 'supportCharges') 'friendly support is bounded'
```

- [ ] **Step 2: Run it to verify it fails**

Run: `powershell -ExecutionPolicy Bypass -File tests/campaign-foundation-check.ps1`

Expected: air operation file assertion fails.

- [ ] **Step 3: Implement fair enemy/friendly air interactions**

```javascript
let airState=null;
function startAirOperations(mission){
  airState={profile:mission.airProfile,warningLeft:0,nextStrike:mission.airProfile==='none'?Infinity:45,
    supportCharges:mission.reward?.friendlySupport?1:0,pendingStrike:false};
}
function isPlayerInAirCover(){
  return buildings.some(b=>b.h>=4&&Math.abs(player.pos.x-b.x)<b.hw&&Math.abs(player.pos.z-b.z)<b.hd) ||
    staticObs.some(o=>o.type==='aabb'&&o.h>=5&&Math.abs(player.pos.x-o.x)<o.hw&&Math.abs(player.pos.z-o.z)<o.hd);
}
function scheduleAirStrike(){ airState.warningLeft=5; airState.pendingStrike=true; showBanner('هشدار هوایی','به سقف، تونل یا پوشش سنگی بروید'); }
```

`updateAirOperations` may damage the player only after the five-second warning and must reduce/avoid damage in `isPlayerInAirCover()`. Friendly support spawns a visual flyover plus a bounded suppression explosion only on the selected enemy group; never invoke `missionVictory`. `applyMissionReward(mission, stars)` records `mission.persistentEffect` only when the optional objective is complete, then calls `saveActiveProfile()`.

- [ ] **Step 4: Run checks and a manual safety test**

Run: `powershell -ExecutionPolicy Bypass -File tests/campaign-foundation-check.ps1`

Manual: launch an air-profile mission; verify warning appears before damage; repeat while beneath a tall building; verify the exposed result loses more health; mute and pause during warning; verify both remain reliable.

- [ ] **Step 5: Commit air operations**

```powershell
git add src/combat/air-operations.js src/missions/director.js src/combat/combat.js src/world/battlefield.js src/ui/game-ui.js src/ui/screens.js src/boot.js tests/campaign-foundation-check.ps1
git commit -m "feat: add fair air operations and campaign effects"
```

## Task 7: Add the skippable midpoint cinematic and final foundation regression

**Files:**
- Create: `src/ui/briefing-cinematics.js`
- Modify: `game.html`, `src/ui/screens.js`, `src/audio/audio.js`, `src/input/controls.js`, `src/boot.js`, `راهنما-آفلاین.txt`
- Test: `tests/campaign-foundation-check.ps1`

**Consumes:** M20 completion, profile state, current mission music controls.

**Produces:** `showMidpointCinematic()`, `skipCinematic()`, a summary carried to M21, and a regression check covering 40 data records/map nodes/air/cinematic/profile loading.

- [ ] **Step 1: Add a failing cinematic assertion**

Append:

```powershell
$cineRaw=Get-Content (Join-Path $Root 'src/ui/briefing-cinematics.js') -Raw
Assert-True ($cineRaw -match 'function showMidpointCinematic\(') 'midpoint cinematic exists'
Assert-True ($cineRaw -match 'function skipCinematic\(') 'cinematic skip action exists'
Assert-True ($cineRaw -match 'M21') 'next mission summary is retained'
```

- [ ] **Step 2: Run it to verify it fails**

Run: `powershell -ExecutionPolicy Bypass -File tests/campaign-foundation-check.ps1`

Expected: cinematic file assertion fails.

- [ ] **Step 3: Implement the non-blocking cinematic**

```javascript
let cinematicOpen=false;
function showMidpointCinematic(){
  cinematicOpen=true; setMusicPaused(true);
  document.getElementById('midpointCinematic').classList.add('on');
  document.getElementById('btnSkipCinematic').focus();
}
function skipCinematic(){
  cinematicOpen=false; document.getElementById('midpointCinematic').classList.remove('on');
  activeProfile.midpointSeen=true; saveActiveProfile(); showMissions();
}
function getM21Summary(){ return 'دشمن سد کِهران را برای قطع آب و خط آهن آماده کرده است.'; }
```

Call it only after M20 victory transition, not before saving the completed mission. The overlay includes a skip button from initial render, `Escape` invokes the same function, and M21 briefing always displays `getM21Summary()`. Do not auto-play music; resume it only after the user launches M21. Update the offline guide with the local map and audio paths.

- [ ] **Step 4: Run all foundation checks and browser smoke matrix**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File tests/campaign-foundation-check.ps1
git diff --check
```

Manual matrix: create/load profile; migrate a legacy save; map node lock/unlock; M01 launch/retry/victory; M08 effect persistence; one airstrike in cover and exposed; M20 skip button and Escape; M21 summary; pause/mute/music; Ctrl+Shift+Alt+E and Ctrl+Shift+Alt+Q.

- [ ] **Step 5: Commit and document the foundation**

```powershell
git add game.html src/ui/briefing-cinematics.js src/ui/screens.js src/audio/audio.js src/input/controls.js src/boot.js tests/campaign-foundation-check.ps1 راهنما-آفلاین.txt
git commit -m "feat: add skippable campaign midpoint cinematic"
```

## Coverage self-review

- 40 authored mission records and map points: Tasks 2 and 5.
- Legacy-save safety and per-profile cheats: Task 3.
- Professional entry/profile experience: Task 4.
- Map lower briefing and live status: Task 5.
- Enemy air, limited friendly support and durable results: Task 6.
- M20 cinematic, music-safe skip and M21 recap: Task 7.
- Existing gameplay preservation: compatibility adapter in Task 2 and manual matrix in Task 7.

The next implementation plan deliberately starts after this foundation: unique scene layouts/weather, vehicle/weapon library, armor/upgrades, four boss arenas and full campaign balancing. Keeping it separate prevents simultaneous replacement of core runtime, UI and 3D world from creating untestable regressions.
