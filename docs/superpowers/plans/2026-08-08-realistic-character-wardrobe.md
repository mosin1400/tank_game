# Realistic Character Wardrobe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every visible primitive outfit part on the six main characters with a licensed, fitted, skinned 1940s military wardrobe, starting with a fully reviewed commander.

**Architecture:** A licensed WWII soldier asset is retained as an attribution-tracked donor. Blender preparation scripts normalize donor pieces into stable garment names; a separate fitting module conforms those garments to each MakeHuman body and transfers the existing Mixamo weights. The current character builder consumes only normalized garments and exports animation-free GLBs, while Blender and Three.js checks reject primitives, stale builds, bad placement, skin explosions, and missing PBR textures.

**Tech Stack:** Blender 4.2 Python API, MakeHuman JS OBJ sources, Mixamo 65-bone rig, glTF/GLB 2.0, Three.js, Node-compatible contract tests.

## Global Constraints

- Art direction is a fictional Eastern-European army inspired by the 1940s; real historical insignia must not be included.
- Only donor assets with an explicit CC0 or CC-BY license may enter the pipeline.
- The original six faces, bodies, IDs, and 65-bone Mixamo skeleton remain unchanged.
- Every final GLB contains a body, undershirt, base trousers, outer uniform, footwear, role headgear, belt, and role equipment.
- No visible hat, belt, bag, jacket, trousers, or footwear may be a raw Cube, Sphere, or Torus primitive.
- Main-character triangle budget is 20,000–40,000 triangles including wardrobe and equipment.
- PBR textures are at most 2048×2048 and shared where practical.
- Exported vertices use at most four bone weights; base GLBs contain no animation actions.
- Commander must pass visual and deformation review before the remaining five characters are generated.

---

## File Map

- `assets/licenses/character-wardrobe.json`: machine-readable donor attribution and redistribution record.
- `tools/raw-character/donor/russian-soldier/`: ignored original Sketchfab download and extracted source files.
- `tools/characters/audit-wardrobe-donor.py`: inventory and license/source guard for downloaded donor files.
- `tools/characters/prepare-wwii-wardrobe.py`: Blender cleanup, piece extraction, naming, PBR material preservation, and normalized donor GLB export.
- `tools/characters/wardrobe_fitter.py`: reusable garment alignment, shrinkwrap, weight transfer, clipping margin, and export helpers.
- `tools/characters/build-rigged-character-cast.py`: orchestrates body/rig loading and delegates wardrobe work to `wardrobe_fitter.py`.
- `assets/models/characters/wardrobe/wwii-russian-donor.glb`: cleaned normalized wardrobe source.
- `assets/models/characters/core/*.glb`: six final game-ready main-character outputs.
- `tools/characters/render-character-turntable.py`: front, three-quarter, side, and posed contact-sheet renderer.
- `tests/character-wardrobe-license-check.mjs`: attribution/source contract.
- `tests/verify-wwii-donor.py`: normalized donor geometry/material contract.
- `tests/verify-rigged-glbs.py`: final wardrobe, skeleton, scale, placement, primitive, and deformation checks.
- `tests/character-asset-contract-check.mjs`: browser-facing manifest/path contract.

---

### Task 1: Acquire and Record the Licensed WWII Donor

**Files:**
- Create: `assets/licenses/character-wardrobe.json`
- Create locally: `tools/raw-character/donor/russian-soldier/original-download.*`
- Test: `tests/character-wardrobe-license-check.mjs`

**Interfaces:**
- Consumes: Sketchfab model `russian-soldier-16037daadcfe4715a4ebce0f2fc6f675` by Chernov-Egor.
- Produces: license manifest entry `{id, title, author, sourceUrl, license, attribution, retrievedAt, rawDirectory}` and one extracted supported 3D source file.

- [ ] **Step 1: Write the failing license test**

```js
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const manifest = JSON.parse(await readFile(new URL('../assets/licenses/character-wardrobe.json', import.meta.url), 'utf8'));
const donor = manifest.assets.find((asset) => asset.id === 'russian-soldier-16037daadcfe4715a4ebce0f2fc6f675');
assert.equal(donor.author, 'Chernov-Egor');
assert.equal(donor.license, 'CC-BY-4.0');
assert.match(donor.sourceUrl, /sketchfab\.com\/3d-models\/russian-soldier-16037da/);
assert.match(donor.attribution, /Chernov-Egor/);
const files = await readdir(`${root}/tools/raw-character/donor/russian-soldier`, { recursive: true });
assert.ok(files.some((name) => /\.(?:glb|gltf|fbx|obj)$/i.test(name)), 'download must include an importable model');
console.log('character-wardrobe-license-check: PASS');
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
$env:ELECTRON_RUN_AS_NODE='1'
& "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe" tests\character-wardrobe-license-check.mjs
```

Expected: FAIL because the manifest and donor directory do not exist.

- [ ] **Step 3: Download the exact donor and create the attribution manifest**

Download from:

```text
https://sketchfab.com/3d-models/russian-soldier-16037daadcfe4715a4ebce0f2fc6f675
```

Save/extract it under `tools/raw-character/donor/russian-soldier/`. Create:

```json
{
  "schemaVersion": 1,
  "assets": [
    {
      "id": "russian-soldier-16037daadcfe4715a4ebce0f2fc6f675",
      "title": "Russian soldier",
      "author": "Chernov-Egor",
      "sourceUrl": "https://sketchfab.com/3d-models/russian-soldier-16037daadcfe4715a4ebce0f2fc6f675",
      "license": "CC-BY-4.0",
      "attribution": "Russian soldier by Chernov-Egor, licensed under CC BY 4.0",
      "retrievedAt": "2026-08-08",
      "rawDirectory": "tools/raw-character/donor/russian-soldier"
    }
  ]
}
```

- [ ] **Step 4: Run the license test and verify GREEN**

Expected: `character-wardrobe-license-check: PASS`.

- [ ] **Step 5: Commit the license record and test**

```powershell
git add assets/licenses/character-wardrobe.json tests/character-wardrobe-license-check.mjs
git commit -m "chore: record licensed wwii wardrobe donor"
```

Do not commit the ignored original archive.

---

### Task 2: Audit and Normalize Donor Garments

**Files:**
- Create: `tools/characters/audit-wardrobe-donor.py`
- Create: `tools/characters/prepare-wwii-wardrobe.py`
- Create: `tests/verify-wwii-donor.py`
- Create: `assets/models/characters/wardrobe/wwii-russian-donor.glb`

**Interfaces:**
- Consumes: `tools/raw-character/donor/russian-soldier/` and the license manifest from Task 1.
- Produces: one GLB with standardized mesh names `wardrobe_jacket`, `wardrobe_trousers`, `wardrobe_boot_left`, `wardrobe_boot_right`, `wardrobe_belt`, `wardrobe_headgear`, and `wardrobe_role_kit`.

- [ ] **Step 1: Write the failing normalized-donor verifier**

```python
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[1]
TARGET = ROOT / "assets/models/characters/wardrobe/wwii-russian-donor.glb"
REQUIRED = {
    "wardrobe_jacket", "wardrobe_trousers", "wardrobe_boot_left",
    "wardrobe_boot_right", "wardrobe_belt", "wardrobe_headgear",
    "wardrobe_role_kit",
}
assert TARGET.is_file(), "normalized donor GLB is missing"
bpy.ops.import_scene.gltf(filepath=str(TARGET))
meshes = {obj.name: obj for obj in bpy.context.scene.objects if obj.type == "MESH"}
assert REQUIRED <= meshes.keys(), f"missing donor pieces: {sorted(REQUIRED - meshes.keys())}"
assert all(len(mesh.data.vertices) >= 24 for mesh in meshes.values()), "primitive or empty donor piece"
assert sum(len(mesh.data.polygons) for mesh in meshes.values()) * 2 <= 40_000, "donor exceeds triangle budget"
assert all(mesh.data.materials for mesh in meshes.values()), "donor piece lacks material"
assert any(material.use_nodes for mesh in meshes.values() for material in mesh.data.materials), "PBR nodes missing"
print("verify-wwii-donor: PASS")
```

- [ ] **Step 2: Run the verifier and verify RED**

```powershell
& 'C:\Program Files\Blender Foundation\Blender 4.2\blender.exe' --background --python tests\verify-wwii-donor.py
```

Expected: FAIL with `normalized donor GLB is missing`.

- [ ] **Step 3: Implement the donor audit**

`audit-wardrobe-donor.py` must:

```python
SUPPORTED = {".glb", ".gltf", ".fbx", ".obj"}

def source_files(root: Path) -> list[Path]:
    return sorted(path for path in root.rglob("*") if path.suffix.lower() in SUPPORTED)

def inventory_scene() -> list[dict]:
    return [{
        "name": obj.name,
        "type": obj.type,
        "vertices": len(obj.data.vertices) if obj.type == "MESH" else 0,
        "materials": [material.name for material in obj.data.materials] if obj.type == "MESH" else [],
    } for obj in bpy.context.scene.objects]
```

It imports the largest supported source, writes `inventory.json` beside it, and exits nonzero if there is no mesh, no material, or more than 80,000 triangles.

- [ ] **Step 4: Implement deterministic donor normalization**

`prepare-wwii-wardrobe.py` must:

- remove donor armatures, body skin, eyes, weapons, cameras, lights, and historical insignia;
- separate joined geometry by loose parts and material slots;
- classify parts using normalized object/material keywords plus relative vertical bounds;
- rename the seven required outputs exactly;
- mirror a single boot only when the donor contains one boot mesh;
- join small belt pouches into `wardrobe_role_kit`;
- retain diffuse, normal, roughness, and metallic image nodes;
- fail rather than export if any required category is unresolved;
- export only the seven normalized meshes to `wwii-russian-donor.glb`.

Use these exact classifiers:

```python
KEYWORDS = {
    "wardrobe_jacket": ("jacket", "coat", "tunic", "uniform", "torso"),
    "wardrobe_trousers": ("trouser", "pants", "legs"),
    "wardrobe_boot_left": ("boot_l", "boot.left", "leftboot"),
    "wardrobe_boot_right": ("boot_r", "boot.right", "rightboot"),
    "wardrobe_belt": ("belt", "strap", "waist"),
    "wardrobe_headgear": ("helmet", "cap", "hat", "headgear"),
    "wardrobe_role_kit": ("pouch", "bag", "pack", "kit"),
}
```

When names do not match, use component centroids: headgear lies above 82% of model height, boots below 18%, trousers span 15–58%, jacket spans 42–82%, and belt intersects 45–58%. The script must print every classification with vertex count before export.

- [ ] **Step 5: Run audit, normalization, and verifier**

```powershell
& 'C:\Program Files\Blender Foundation\Blender 4.2\blender.exe' --background --python tools\characters\audit-wardrobe-donor.py
& 'C:\Program Files\Blender Foundation\Blender 4.2\blender.exe' --background --python tools\characters\prepare-wwii-wardrobe.py
& 'C:\Program Files\Blender Foundation\Blender 4.2\blender.exe' --background --python tests\verify-wwii-donor.py
```

Expected: inventory is printed and `verify-wwii-donor: PASS`.

- [ ] **Step 6: Commit normalized wardrobe tooling and output**

```powershell
git add tools/characters/audit-wardrobe-donor.py tools/characters/prepare-wwii-wardrobe.py tests/verify-wwii-donor.py assets/models/characters/wardrobe/wwii-russian-donor.glb
git commit -m "feat: normalize licensed wwii wardrobe donor"
```

---

### Task 3: Fit the Real Wardrobe to the Commander

**Files:**
- Create: `tools/characters/wardrobe_fitter.py`
- Modify: `tools/characters/build-rigged-character-cast.py`
- Modify: `tests/verify-rigged-glbs.py`
- Modify: `assets/models/characters/core/player-commander.glb`

**Interfaces:**
- Consumes: normalized donor mesh names from Task 2 and commander body/armature from the current builder.
- Produces: `fit_wardrobe(body: bpy.types.Object, armature: bpy.types.Object, role: str) -> list[bpy.types.Object]`.

- [ ] **Step 1: Extend the verifier before changing the builder**

Add commander assertions:

```python
primitive_meshes = [item for item in outfits if len(item.data.vertices) <= 24]
assert not primitive_meshes, f"visible primitive wardrobe remains: {[item.name for item in primitive_meshes]}"
required_real = {
    "outfit_jacket", "outfit_trousers", "outfit_boot_left", "outfit_boot_right",
    "outfit_belt", "outfit_headgear", "outfit_role_kit", "outfit_undershirt",
}
assert required_real <= {item.name for item in outfits}, "commander real wardrobe is incomplete"
assert all(any(mod.type == "ARMATURE" for mod in item.modifiers) for item in outfits), "wardrobe is not skinned"
```

- [ ] **Step 2: Run the verifier and verify RED**

Expected: FAIL because the current belt/headgear/kit are primitive meshes and required names are absent.

- [ ] **Step 3: Implement reusable garment fitting**

`wardrobe_fitter.py` must expose:

```python
DONOR = ROOT / "assets/models/characters/wardrobe/wwii-russian-donor.glb"

def fit_wardrobe(body, armature, role):
    pieces = import_normalized_donor(DONOR)
    align_to_body_landmarks(pieces, body)
    for piece in pieces:
        conform_to_body(piece, body, clearance=0.008)
        transfer_mixamo_weights(piece, body, armature)
        limit_vertex_influences(piece, maximum=4)
        piece.name = OUTPUT_NAMES[piece.name]
    apply_role_materials(pieces, role)
    return pieces
```

Alignment uses body world bounds for global scale, then vertex-group centroids for `Hips`, `Spine2`, `Head`, `LeftFoot`, and `RightFoot`. Conforming uses Shrinkwrap in `NEAREST_SURFACEPOINT` mode with positive offset, followed by corrective smoothing. Weight transfer uses `DATA_TRANSFER`, `data_types_verts={'VGROUP_WEIGHTS'}`, `vert_mapping='POLYINTERP_NEAREST'`, then an Armature modifier targeting the existing rig.

- [ ] **Step 4: Replace only the commander wardrobe path**

In `build-rigged-character-cast.py`, remove `create_outfit()` from the commander path and call:

```python
if role == "player-commander":
    from wardrobe_fitter import fit_wardrobe
    fit_wardrobe(character_mesh, armature, role)
else:
    create_outfit(armature, character_mesh, profile)
```

Keep the existing body, bind matrices, armature scale, metadata, and animation-free export unchanged.

- [ ] **Step 5: Rebuild commander and run the verifier**

Add a `--role` argument to the builder and run:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 4.2\blender.exe' --background --python tools\characters\build-rigged-character-cast.py -- --role player-commander
& 'C:\Program Files\Blender Foundation\Blender 4.2\blender.exe' --background --python tests\verify-rigged-glbs.py -- --role player-commander
```

Expected: commander PASS with zero primitive outfit meshes.

- [ ] **Step 6: Commit the fitted commander**

```powershell
git add tools/characters/wardrobe_fitter.py tools/characters/build-rigged-character-cast.py tests/verify-rigged-glbs.py assets/models/characters/core/player-commander.glb
git commit -m "feat: fit real wwii wardrobe to commander"
```

---

### Task 4: Add Visual and Deformation Approval Gates

**Files:**
- Create: `tools/characters/render-character-turntable.py`
- Modify: `tests/verify-rigged-glbs.py`
- Create: `tools/previews/wardrobe/player-commander-contact-sheet.png`

**Interfaces:**
- Consumes: commander GLB from Task 3.
- Produces: a four-panel contact sheet and automated extreme-pose bounds/finite-coordinate checks.

- [ ] **Step 1: Write the failing extreme-pose assertions**

For the commander, rotate `LeftArm`, `RightArm`, `LeftUpLeg`, and `RightUpLeg` by ±0.9 radians, evaluate the dependency graph, and assert:

```python
coords = [evaluated.matrix_world @ vertex.co for vertex in evaluated.data.vertices]
assert all(all(math.isfinite(component) for component in point) for point in coords), "non-finite posed vertex"
span = max((max(point[i] for point in coords) - min(point[i] for point in coords)) for i in range(3))
assert span < 2.5, f"posed mesh exploded: {span:.2f}m"
```

Also assert no garment/body intersection sample exceeds 2 cm at the shoulder, waist, knee, and ankle landmark groups.

- [ ] **Step 2: Run the verifier and verify RED**

Expected: FAIL until the new pose helper and garment sampling are implemented.

- [ ] **Step 3: Implement the turntable renderer**

Render orthographic views at yaw `0`, `45`, and `90` degrees plus one pose-stress view. Use Cycles CPU, 16 samples, 768×768 per panel, neutral gray background, and save a single 3072×768 PNG. The command is:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 4.2\blender.exe' --background --python tools\characters\render-character-turntable.py -- player-commander
```

- [ ] **Step 4: Run the pose verifier and inspect the contact sheet**

Reject the commander if any of these are visible: primitive geometry, floating belt/headgear, body penetration, missing texture, stretched fingers, exploded arms, or modern insignia.

- [ ] **Step 5: Commit the approval tooling**

```powershell
git add tools/characters/render-character-turntable.py tests/verify-rigged-glbs.py tools/previews/wardrobe/player-commander-contact-sheet.png
git commit -m "test: add wardrobe visual and deformation gates"
```

---

### Task 5: Extend the Approved Wardrobe to the Remaining Five Main Characters

**Files:**
- Modify: `tools/characters/wardrobe_fitter.py`
- Modify: `tools/characters/build-rigged-character-cast.py`
- Modify: `assets/models/characters/core/ramin.glb`
- Modify: `assets/models/characters/core/saman.glb`
- Modify: `assets/models/characters/core/nikan.glb`
- Modify: `assets/models/characters/core/shahin-tali.glb`
- Modify: `assets/models/characters/core/general-varen.glb`
- Modify: `tests/verify-rigged-glbs.py`

**Interfaces:**
- Consumes: the commander-approved fitter and normalized wardrobe.
- Produces: six consistently named, role-varied, non-primitive main-character GLBs.

- [ ] **Step 1: Add role-profile tests**

Require these embedded metadata values and outfit pieces:

```python
ROLE_WARDROBE = {
    "ramin": ("field-radio", "headset", "radio-pack"),
    "saman": ("tank-crew", "tanker-helmet", "tool-roll"),
    "nikan": ("observer", "field-cap", "binocular-case"),
    "shahin-tali": ("field-officer", "visor-cap", "field-notebook"),
    "general-varen": ("dark-general", "officer-cap", "leather-case"),
}
```

Every role must have the shared jacket/trousers/boots/belt plus the named headgear and role kit; meshes with 24 or fewer vertices fail.

- [ ] **Step 2: Run the verifier and verify RED**

Expected: FAIL on `ramin` because it still uses the procedural wardrobe.

- [ ] **Step 3: Implement role variants without duplicating geometry unnecessarily**

Add `ROLE_MATERIALS` and `ROLE_ACCESSORIES` to `wardrobe_fitter.py`. Use shared donor geometry, distinct material instances, and role-specific muted colors. General Varen receives a longer jacket deformation and darker material; tanker gear receives shorter jacket tails and padded headgear; no role receives historical insignia.

- [ ] **Step 4: Build and verify all six GLBs**

```powershell
& 'C:\Program Files\Blender Foundation\Blender 4.2\blender.exe' --background --python tools\characters\build-rigged-character-cast.py
& 'C:\Program Files\Blender Foundation\Blender 4.2\blender.exe' --background --python tests\verify-rigged-glbs.py
```

Expected: six PASS lines, each with 65 bones, complete real wardrobe, no actions, and no primitive meshes.

- [ ] **Step 5: Render and inspect all six turntables**

```powershell
@('player-commander','ramin','saman','nikan','shahin-tali','general-varen') | ForEach-Object {
  & 'C:\Program Files\Blender Foundation\Blender 4.2\blender.exe' --background --python tools\characters\render-character-turntable.py -- $_
}
```

- [ ] **Step 6: Commit the complete main cast wardrobe**

```powershell
git add tools/characters/wardrobe_fitter.py tools/characters/build-rigged-character-cast.py tests/verify-rigged-glbs.py assets/models/characters/core/*.glb tools/previews/wardrobe/*.png
git commit -m "feat: complete realistic wardrobe for main cast"
```

---

### Task 6: Verify Browser Integration and Remove the Main-Cast Primitive Fallback

**Files:**
- Modify: `src/entities/character-wardrobe.js`
- Modify: `tests/character-wardrobe-check.mjs`
- Modify: `tests/character-asset-contract-check.mjs`

**Interfaces:**
- Consumes: embedded real wardrobe in the six main GLBs.
- Produces: `CharacterWardrobe.createLayers()` returns no generated box layers for `entry.tier === 'main'`, while secondary-character fallback remains intact.

- [ ] **Step 1: Write the failing main-tier runtime test**

```js
const mainEntry = {
  tier: 'main',
  appearance: { outfit: 'commander-field', accentColor: '#72652c' },
  gear: ['field-cap', 'command-map']
};
const mainLayers = CharacterWardrobe.createLayers(THREE, mainEntry, armature);
assert.deepEqual(mainLayers, { embedded: true, accessories: [] });
```

Keep the existing secondary-character assertions unchanged.

- [ ] **Step 2: Run the wardrobe test and verify RED**

```powershell
$env:ELECTRON_RUN_AS_NODE='1'
& "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe" tests\character-wardrobe-check.mjs
```

Expected: FAIL because main entries still receive generated boxes.

- [ ] **Step 3: Implement the embedded-main guard**

At the beginning of `createLayers` after input validation:

```js
if(entry.tier==='main')return {embedded:true,accessories:[]};
```

Do not remove secondary fallback clothing in this task.

- [ ] **Step 4: Run browser-facing contracts**

```powershell
$env:ELECTRON_RUN_AS_NODE='1'
& "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe" tests\character-wardrobe-check.mjs
& "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe" tests\character-asset-contract-check.mjs
& "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe" tests\character-roster-contract-check.mjs
```

Expected: all PASS.

- [ ] **Step 5: Run the game and inspect the commander in Three.js**

Start the existing local server, enter operation one, and verify one model per character, correct textures, no duplicate boxes, and no console errors. Capture the browser screenshot for the handoff.

- [ ] **Step 6: Commit browser integration**

```powershell
git add src/entities/character-wardrobe.js tests/character-wardrobe-check.mjs tests/character-asset-contract-check.mjs
git commit -m "fix: use embedded wardrobe for main characters"
```

---

## Final Verification

Run all wardrobe-specific checks from a clean Blender process:

```powershell
$env:ELECTRON_RUN_AS_NODE='1'
& "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe" tests\character-wardrobe-license-check.mjs
& "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe" tests\character-wardrobe-check.mjs
& "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe" tests\character-asset-contract-check.mjs
& 'C:\Program Files\Blender Foundation\Blender 4.2\blender.exe' --background --python tests\verify-wwii-donor.py
& 'C:\Program Files\Blender Foundation\Blender 4.2\blender.exe' --background --python tests\verify-rigged-glbs.py
```

Expected: every command exits zero, six main GLBs pass, and the reviewed commander/game screenshots show no primitive wardrobe, floating equipment, mesh explosion, or untextured garment.
