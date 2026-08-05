# Modular Game Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the single-file T-34/85 game into browser-native ES modules without removing or changing any gameplay capability.

**Architecture:** `game.html` remains the entry point and UI markup. `boot.js` preserves the local-Three.js/CDN fallback and loads `main.js` only after the import map is ready. `main.js` owns ordered initialization and the animation loop; domain modules receive a shared game context rather than relying on module-level execution order.

**Tech Stack:** Static HTML/CSS, browser ES modules, Three.js 0.160.0, Web Audio API, local Python HTTP server.

## Global Constraints

- Preserve all current missions, weapons, models, effects, controls, UI, progression, cheats, local/CDN fallback, and offline execution.
- Keep `game.html` as a supported entry point for `server.bat`.
- Do not add a bundler, framework, or network dependency.
- Move code mechanically before making behavior changes; browser-visible output must remain equivalent.

---

### Task 1: Establish modular entry points and styles

**Files:**
- Modify: `game.html`
- Create: `styles/game.css`, `src/boot.js`, `src/main.js`

- [ ] Extract the existing stylesheet verbatim into `styles/game.css`.
- [ ] Keep the existing HTML UI nodes and IDs in `game.html`; replace inline game startup with `src/boot.js`.
- [ ] Preserve local Three.js detection and CDN fallback in `src/boot.js`.
- [ ] Load `src/main.js` only after the import map is installed.
- [ ] Verify the entry point has no duplicate scripts or missing UI nodes.

### Task 2: Move pure configuration and shared utilities

**Files:**
- Create: `src/core/state.js`, `src/core/utils.js`, `src/missions/definitions.js`
- Modify: `src/main.js`

- [ ] Move palette, weapon, enemy-type, mission, and power-up definitions into data modules.
- [ ] Move number formatting, random generation, bounds, and clamping into utilities.
- [ ] Create one explicit mutable game context used by dependent modules.
- [ ] Verify mission and weapon counts remain 20 and 4.

### Task 3: Move renderer, materials, world, and entities

**Files:**
- Create: `src/render/renderer.js`, `src/render/materials.js`, `src/world/battlefield.js`, `src/entities/t34.js`, `src/entities/panzer.js`
- Modify: `src/main.js`

- [ ] Preserve initialization order: Three.js import → renderer → textures/materials → world → entity construction.
- [ ] Move procedural textures and materials after Three.js initialization.
- [ ] Move player and enemy model constructors without reducing meshes or variants.
- [ ] Verify no material is initialized before Three.js is ready.

### Task 4: Move gameplay systems

**Files:**
- Create: `src/audio/audio.js`, `src/combat/effects.js`, `src/combat/projectiles.js`, `src/combat/combat.js`, `src/missions/director.js`, `src/input/controls.js`, `src/ui/hud.js`, `src/ui/screens.js`
- Modify: `src/main.js`

- [ ] Preserve audio, controls, combat, power-ups, mission director, HUD, menus, persistence, pause, mute, and cheat behavior.
- [ ] Keep the post-victory spawn guard and health-bar fix in the enemy spawning path.
- [ ] Verify existing initialization and update ordering remains intact.

### Task 5: Asset organization and verification

**Files:**
- Move: `icon.png` to `assets/images/icon.png`; `music/*` to `assets/audio/*`; `three/*` to `vendor/three/*`
- Modify: `server.bat`, `راهنما-آفلاین.txt`, `src/boot.js`

- [ ] Update only paths affected by asset moves.
- [ ] Run static module-import, syntax, source-contract, and local-server smoke checks.
- [ ] Compare the complete mission/weapon/entity definitions with the original source.
- [ ] Commit the completed modular refactor on `refactor/modular-game`.
