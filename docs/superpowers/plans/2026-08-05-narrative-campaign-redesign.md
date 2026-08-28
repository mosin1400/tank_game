# Narrative 40-Mission Campaign Redesign Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current mission campaign with a new authored 40-mission cinematic tactical story, presented through a professional profile-driven main menu, a country campaign map, bespoke mission scenes, and distinct vehicle/weapon designs.

**Architecture:** Story, mission, scene, vehicle, and campaign-map data are authored separately before gameplay code changes. The game loads one persistent player profile, then shows a campaign map whose circular HTML mission buttons open a briefing panel below the map. Each mission selects a dedicated 3D scene configuration from reusable world modules; each enemy class selects an explicit hull, turret, gun, armor, material, behavior, and boss identity.

**Tech Stack:** Static browser JavaScript, Three.js 0.160.0, Web Audio API, CSS, `assets/images/campaign-map-v3.png`, local Python server.

## Global Constraints

- The current campaign's 20 mission records will be replaced only after the new 40-mission roster, migration behavior, and acceptance tests are approved.
- Keep all platform capabilities: desktop/mobile controls, pause, mute, local/offline Three.js, saving, weapons, visual effects, audio effects, and cheat shortcuts.
- All player-visible copy is Persian and rendered by HTML/CSS; campaign-map artwork contains no text.
- Use the olive identity palette: `#e6ead1`, `#aab668`, `#8a9a4e`.
- Every mission has a narrative purpose, briefing, objective, setting, enemies, weather, reward, opening state, and end-state.
- Every vehicle and gun has an explicit design specification before its 3D implementation begins.

---

### Task 1: Story bible — approval gate before mission writing

**Files:**
- Create: `docs/story/world-bible.md`, `docs/story/character-bible.md`, `docs/story/campaign-arc.md`

**Produces:** A validated fictional country, war premise, player crew, antagonist, four-act story arc, tone guide, visual references, and ending.

- [ ] Define the fictional country, its terrain, capital, rail network, border region, river basin, mountain corridor, and final fortress.
- [ ] Define the player as the commander of one named T-34/85 and define the crew roles: commander, driver, gunner, loader, radio operator.
- [ ] Define the enemy command structure and one named antagonist whose decisions drive the whole campaign.
- [ ] Write four acts of ten missions with a beginning, escalation, midpoint reversal, climax, and epilogue.
- [ ] Define the emotional tone: grounded wartime tension, brotherhood, tactical pressure, and earned victories; avoid caricature and real-world political claims.
- [ ] Present the story bible for user approval. Do not write mission data until it is approved.

### Task 2: Authored 40-mission roster and briefings

**Files:**
- Create: `docs/story/mission-roster.md`, `src/campaign/mission-data.js`, `src/campaign/mission-dialogue.js`
- Modify: `src/missions/definitions.js`, `src/boot.js`

**Consumes:** Approved story bible.

**Produces:** Forty ordered mission records, each with Persian title, short briefing, commander dialogue, objective, success/failure outcome, scene ID, enemy roster, reward, and map position.

- [ ] Author 10 missions for each story act; no mission exists only as a kill-count variation.
- [ ] Use a controlled mix of defense, breakthrough, escort, reconnaissance, sabotage, rescue, artillery hunt, bridge crossing, urban combat, pursuit, boss, and final assault.
- [ ] Assign a story transition after missions 10, 20, 30, and 40.
- [ ] Assign every mission a 40-node map coordinate along the lower-left to upper-right advance route.
- [ ] Replace the old 20 mission data only after a static test confirms exactly 40 valid new records and every map node references one record.
- [ ] Preserve old saves by converting them to a new-profile introduction screen rather than silently corrupting them.

### Task 3: Professional entry menu and profile persistence

**Files:**
- Create: `src/profile/profile-store.js`, `src/profile/profile-ui.js`, `styles/profile.css`
- Modify: `game.html`, `src/ui/screens.js`, `src/boot.js`

**Consumes:** Campaign metadata and local storage.

**Produces:** A cinematic title/entry screen and local profile slots with campaign progress, play time, stars, selected difficulty, and last mission.

- [ ] Design a title screen using the olive palette, T-34 silhouette, campaign title, Continue, New Profile, Profile Select, Settings, and Credits controls.
- [ ] Create three local profile slots with an explicit name, progress percentage, act, last played mission, stars, and total score.
- [ ] Show a confirmation screen before replacing a used profile slot.
- [ ] Keep existing cheat shortcuts scoped to the currently active profile.
- [ ] Verify an empty browser starts a new profile and an existing profile resumes at its saved map node.

### Task 4: Country campaign map and briefing panel

**Files:**
- Create: `src/ui/campaign-map.js`, `src/ui/mission-briefing.js`, `styles/campaign-map.css`
- Modify: `game.html`, `src/ui/screens.js`, `src/boot.js`

**Consumes:** Active profile, mission roster, `assets/images/campaign-map-v3.png`.

**Produces:** One zoomable/pannable country map with 40 circular interactive mission buttons and a persistent lower briefing area.

- [ ] Render exactly 40 circular HTML buttons over the route; statuses are locked, available, active, completed, and perfected.
- [ ] Keep the route's start at the lower-left depot and final fortress at upper-right.
- [ ] When a button is selected, show title, act, objective, briefing, reward, enemy warning, weather, best result, and Launch control in the lower panel.
- [ ] Support mouse, keyboard, touch, safe-area insets, and small screens without hiding node states.
- [ ] Verify no mission state, title, or star is baked into the image; all status remains live UI data.

### Task 5: Dedicated 3D scene library

**Files:**
- Create: `src/scenes/scene-library.js`, `src/scenes/scene-builder.js`, `src/scenes/scene-layouts.js`, `src/world/weather.js`
- Modify: `src/world/battlefield.js`, `src/main.js`

**Consumes:** Each mission's scene ID, weather, time of day, and narrative staging data.

**Produces:** Forty dedicated scene definitions made from reusable high-quality terrain, town, bridge, rail, forest, river, trench, fortress, harbor, and industrial modules.

- [ ] Define a unique scene layout for every mission: terrain silhouette, key landmark, traversal lanes, cover, objective area, spawn lanes, sky, lighting, weather, and ambient sound.
- [ ] Build reusable environment modules so unique scenes do not duplicate geometry or textures needlessly.
- [ ] Give each act a coherent visual identity while ensuring every mission has a distinct tactical silhouette.
- [ ] Add rain, mist, dust, snow, dusk, and night only where story and readability support them.
- [ ] Verify each scene contains valid player spawn, objective space, collision geometry, enemy-spawn zones, and camera-safe bounds.

### Task 6: Vehicle, enemy, and weapon design library

**Files:**
- Create: `docs/design/vehicle-roster.md`, `docs/design/weapon-roster.md`, `src/entities/vehicle-library.js`, `src/entities/weapon-library.js`, `src/entities/enemy-roles.js`
- Modify: `src/entities/t34.js`, `src/entities/panzer.js`, `src/combat/projectiles.js`, `src/combat/combat.js`

**Consumes:** Story acts, enemy command structure, mission roster, and weapon rewards.

**Produces:** Distinct player/enemy vehicle models, visual gun variants, attack behaviors, armor profiles, sound signatures, and boss identities.

- [ ] Design the player T-34/85 as a named campaign tank with visible field modifications unlocked through story progression.
- [ ] Define each enemy as a separate vehicle family with its own hull, turret, gun, material palette, scale, mobility, weak point, attack pattern, and score/reward role.
- [ ] Define a model and firing behavior for every cannon, howitzer, rocket system, machine gun, anti-tank gun, and artillery threat used in the 40 missions.
- [ ] Define four named bosses with bespoke arenas and mechanics; bosses are not ordinary tanks with only increased hit points.
- [ ] Verify every mission enemy reference resolves to a vehicle and weapon specification.

### Task 7: Tactical systems and cinematic presentation

**Files:**
- Create: `src/combat/armor.js`, `src/progression/upgrades.js`, `src/ui/hangar.js`, `src/ui/briefing-cinematics.js`, `src/audio/music.js`
- Modify: `src/combat/combat.js`, `src/entities/player.js`, `src/audio/audio.js`, `src/ui/game-ui.js`, `src/missions/director.js`

**Consumes:** Profile, mission rewards, scene weather, vehicle stats, and existing audio assets.

**Produces:** Directional armor, field repair, bounded upgrades, chapter cinematics, mission intros/outros, and contextual music.

- [ ] Add front/side/rear armor logic without removing the current health, ammunition, reload, or power-up systems.
- [ ] Add a limited hangar upgrade system: armor, engine, loader, optics, and repair capacity.
- [ ] Introduce music after a user gesture and guarantee Mute disables synthesized effects and music.
- [ ] Add non-blocking briefing cards and chapter reports that never prevent pause, retry, or mobile controls.
- [ ] Verify all victory, defeat, pause, mute, unlock-all, reset-lock, and profile-save flows work for new and legacy profiles.

### Task 8: Campaign QA, balancing, and release

**Files:**
- Create: `tests/campaign-regression-check.ps1`, `docs/story/campaign-test-matrix.md`
- Modify: `راهنما-آفلاین.txt`

**Consumes:** All completed redesign modules.

**Produces:** A tested 40-mission release candidate and an offline-run guide that reflects the final file structure.

- [ ] Verify 40 mission records, 40 map buttons, 4 acts, 40 scene configurations, and every vehicle/weapon reference.
- [ ] Play through the first mission, one mission per act, every boss, one defeat, retry, profile change, mobile-control session, mute session, and reset-lock flow.
- [ ] Verify the completed mission state prevents every new enemy spawn after victory.
- [ ] Verify the server exposes every script, map image, audio file, and vendor Three.js file at HTTP 200.
- [ ] Commit each verified task independently and integrate only after the full regression matrix passes.
