# Cinematic Tactical Campaign Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the existing T-34/85 game into a 40-mission cinematic tactical campaign while preserving every current mission, weapon, control, effect, and offline capability.

**Architecture:** The campaign becomes a data-driven layer on top of the existing mission director. A map UI renders 40 DOM mission nodes over `assets/images/campaign-map-v3.png`; mission state, stars, upgrades, and unlocks live in one versioned local-storage profile. Combat changes remain additive, so the current weapon, enemy, HUD, audio, and input systems stay valid.

**Tech Stack:** Static browser JavaScript, Three.js 0.160.0, Web Audio API, CSS, local Python server.

## Global Constraints

- Keep the 20 current missions available and add 20 new missions; do not replace or remove them.
- Keep desktop and mobile controls, existing save data, cheat shortcuts, offline Three.js, and all current weapons.
- Use the olive visual palette: `#e6ead1`, `#aab668`, `#8a9a4e`.
- Render all Persian text in HTML/CSS; no important text is baked into artwork.
- Use `campaign-map-v3.png` only as a background; mission states are interactive HTML buttons.

---

### Task 1: Campaign profile and 40-mission data

**Files:**
- Create: `src/campaign/campaign-data.js`, `src/campaign/profile.js`
- Modify: `src/missions/definitions.js`, `src/boot.js`
- Test: `tests/campaign-profile-check.ps1`

**Consumes:** Existing `MISSIONS`, `WEAPONS`, and the `t34war_v2` local-storage profile.

**Produces:** `CAMPAIGN_MISSIONS` with 40 ordered mission records and `loadCampaignProfile()` / `saveCampaignProfile(profile)`.

- [ ] Add 20 mission records without altering the first 20 records or weapon thresholds.
- [ ] Define four acts of ten missions: Border Advance, River and Capital, Forest and Highlands, Fortress Offensive.
- [ ] Store each mission's map position, chapter, objective type, briefing, reward, weather palette, and unlock condition.
- [ ] Migrate existing `t34war_v2` data to the new profile while retaining unlock count and earned stars.
- [ ] Verify exactly 40 mission records, 4 acts, and all 20 legacy records remain present.

### Task 2: Interactive campaign map

**Files:**
- Create: `src/ui/campaign-map.js`, `styles/campaign-map.css`
- Modify: `game.html`, `src/ui/screens.js`, `src/boot.js`
- Test: `tests/campaign-map-check.ps1`

**Consumes:** `CAMPAIGN_MISSIONS`, profile state, `campaign-map-v3.png`.

**Produces:** `showCampaignMap()` and 40 positioned mission buttons with locked, available, active, completed, and star states.

- [ ] Replace the mission-grid entry screen with a map container while retaining the existing mission brief screen.
- [ ] Position 40 accessible HTML buttons along the map route; button text uses mission number and state, never image text.
- [ ] Add map pan, keyboard focus, and touch drag without preventing mission-button taps.
- [ ] Show chapter title, selected mission details, stars, reward, and launch action in an olive command panel.
- [ ] Verify exactly 40 buttons render and selecting a legacy mission still opens its current briefing.

### Task 3: Semi-realistic tactical layer

**Files:**
- Create: `src/combat/armor.js`, `src/progression/upgrades.js`, `src/ui/hangar.js`
- Modify: `src/combat/combat.js`, `src/entities/player.js`, `src/ui/game-ui.js`, `src/ui/screens.js`
- Test: `tests/tactical-layer-check.ps1`

**Consumes:** Player state, weapon data, mission rewards, and profile data.

**Produces:** Direction-sensitive armor modifier, repair/ammunition economy, and a persistent upgrade selection screen.

- [ ] Add frontal, side, and rear armor modifiers without removing the existing health bar or damage system.
- [ ] Add five capped upgrades: armor integrity, engine response, loader speed, optics/radar clarity, and field repair capacity.
- [ ] Award one upgrade point only at defined campaign milestones and keep all existing weapon unlocks unchanged.
- [ ] Add a hangar/command screen between map and mission brief.
- [ ] Verify a new profile begins with baseline T-34 stats and legacy profiles load with baseline upgrades.

### Task 4: Mission and enemy variety

**Files:**
- Create: `src/missions/scenarios.js`, `src/entities/enemy-roles.js`
- Modify: `src/missions/director.js`, `src/entities/panzer.js`, `src/missions/definitions.js`
- Test: `tests/scenario-check.ps1`

**Consumes:** Campaign mission data and existing enemy entities.

**Produces:** Scenario callbacks and additive enemy roles: scout, anti-tank gun, artillery spotter, escort column, armored train, and fortress commander.

- [ ] Preserve destroy, survive, waves, assault, and boss mission types.
- [ ] Add convoy defense, bridge hold, artillery hunt, reconnaissance, breakthrough, and evacuation scenarios.
- [ ] Keep every spawned enemy blocked after victory through the existing mission-complete guard.
- [ ] Define chapter bosses with unique behavior rather than only higher health values.
- [ ] Verify all 40 missions resolve to a supported objective and cannot spawn enemies after completion.

### Task 5: Cinematic presentation

**Files:**
- Create: `src/world/weather.js`, `src/ui/briefing.js`, `src/audio/music.js`
- Modify: `src/world/battlefield.js`, `src/audio/audio.js`, `src/ui/game-ui.js`, `src/missions/director.js`
- Test: `tests/presentation-check.ps1`

**Consumes:** Mission palette, chapter, weather, and audio assets under `assets/audio/`.

**Produces:** Weather presets, pre-mission briefings, chapter transition cards, music selection, and non-destructive cinematic camera beats.

- [ ] Add rain, mist, dust, snow, and night presets as optional scene layers.
- [ ] Use existing music assets only after user interaction unlocks audio playback.
- [ ] Add mission-intro title cards and chapter-completion reports in Persian.
- [ ] Keep the existing HUD readable during all weather effects.
- [ ] Verify mute disables both synthesized effects and music.

### Task 6: Campaign balancing and release verification

**Files:**
- Create: `docs/campaign-mission-roster.md`, `tests/campaign-regression-check.ps1`
- Modify: `راهنما-آفلاین.txt`

**Consumes:** All campaign, map, tactical, scenario, and presentation modules.

**Produces:** A documented 40-mission roster and repeatable static regression checks.

- [ ] Document mission order, objective, reward, environment, and boss milestones.
- [ ] Verify local-server paths for all scripts, map image, music, and vendor Three.js resources.
- [ ] Verify 40 map nodes, 40 mission records, 4 acts, legacy-save migration, all weapon unlocks, both cheat shortcuts, and post-victory spawn prevention.
- [ ] Run the game through the first mission, a legacy mission, a new mission, a boss mission, mobile controls, mute, pause, victory, defeat, unlock-all, and reset-lock flows.
- [ ] Commit each finished task separately after its verification passes.
