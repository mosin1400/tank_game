# Realistic Asset and Surface-Damage Overhaul

## Goal

Replace the visibly primitive human and convoy models, correct the railway at real-world scale, introduce distinct professional tank materials, and make projectile impacts leave material-specific damage on nearly every solid surface. Preserve all existing gameplay capabilities and keep the browser build performant.

## Scope decomposition

This overhaul is implemented as four independently testable subprojects in this order:

1. Male character asset and animation pipeline.
2. Railway and convoy vehicle rebuild.
3. Segment-based projectile impacts and persistent surface damage.
4. Tank material families and damage integration.

Each subproject produces a playable M01 before the next begins. No subproject may delete the existing mission controller, weapons, profile flow, campaign state or legacy mission modes.

## 1. Male characters and narrative conversion

### Narrative conversion

Every named story character, visible model, spoken line, subtitle and role is male. Existing female-coded characters are replaced consistently rather than only changing their meshes:

| Previous | Replacement | Role |
|---|---|---|
| نازی رستمی | نادر رستمی | T-34 commander |
| سارا امانی | سروش امانی | signals and reconnaissance specialist |
| مریم | مهران | lead convoy driver |
| آذر | آراد | radio operator and observer |
| سارا تالی | شاهین تالی | local guide and resistance-network leader |

All source, story documents, mission text, cinematic subtitles and runtime messages are scanned so an obsolete name or contradictory pronoun cannot remain. The player profile name remains user-controlled.

### Asset source and license

The base male body, face and core clothing are generated from MakeHuman core assets. MakeHuman states that exported models and core graphical assets are CC0 and may be used in closed-source and commercial games:

- https://static.makehumancommunity.org/makehuman/faq/can_i_sell_models_created_with_makehuman.html
- https://static.makehumancommunity.org/about/license.html

Animation clips use Mixamo only under Adobe's published permission for royalty-free use in video games:

- https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html

Mixamo requires an Adobe ID and may require the user to complete sign-in/download. If automated access is unavailable, implementation pauses at that acquisition step and provides the exact character and animation export settings; it does not substitute an unlicensed model. Raw source downloads and final optimized files are recorded in `docs/credits/assets.md` with source, license, acquisition date and modifications.

### Runtime format and quality budget

- Final delivery format: GLB 2.0 with embedded skeleton and named animation clips.
- One shared humanoid skeleton and material layout for all M01 men.
- Visual variants use male faces, skin tones, headwear, uniform colors and equipment without duplicating the full mesh unnecessarily.
- Target budget: 18k–35k visible triangles per near character, 2K texture set for hero characters, 1K for background crew, and a low-detail fallback under 8k triangles.
- Required clips: `idle`, `walk`, `run`, `point`, `radio`, `binoculars`, `driver-sit` and `brace`.
- `THREE.GLTFLoader` loads the model once; clones share assets. `THREE.AnimationMixer` owns animation playback and cross-fades. All mixers, cloned skeletons and GPU resources are disposed with the active scene.
- M01 characters remain non-combatants. The enemy observer is removed by the tower event, not by infantry damage.

## 2. Railway and convoy rebuild

### Root cause and rail geometry

The current scene uses a four-metre rail gauge while wagon wheel centres are about 2.76 metres apart. Consequently the wagon transforms may share an angle yet the wheels cannot sit on the rails. The replacement uses one authoritative `RailFrame` and real-world proportions:

- Gauge: 1.435 metres.
- Both rails, ballast, sleepers, fasteners, signals, bogies, wheelsets and wagon bodies derive from the same frame.
- Wheel tread centres match the gauge; flanges sit inside the rail heads.
- A stationary shunting locomotive, tank wagon, box wagon and flat wagon form a believable depot consist.
- Every render transform and OBB collider derives from the same placement data. Independent wagon yaw or lateral coordinates are forbidden.

### Convoy trucks

The current moving trucks are two boxes and four cylinders. They are replaced with a reusable 6×4 period-inspired cargo truck containing bonnet, radiator, cab, glazing, mirrors, fenders, lamps, fuel tank, chassis, cargo bed and canvas cover.

- Six wheels rotate from travelled distance; front wheels steer toward the path tangent.
- The chassis pitches/rolls subtly from terrain sampling.
- Convoy movement follows a smoothed curve with acceleration, braking, minimum spacing and obstacle stopping instead of linear point-to-point sliding.
- A seated male driver is attached to each cab using the shared character asset.
- Truck health, protected-convoy rules, checkpoints and all three existing routes remain intact.

## 3. Projectile impacts and surface damage

### Hit detection

Fast projectiles use a segment from previous to next position each frame. The segment is tested against damageable meshes and gameplay colliders, preventing tunnelling through thin wagons and walls. A hit returns world position, surface normal, material class, owning object and penetration policy.

### Surface responses

| Surface | Persistent mark | Immediate effect | Structural response |
|---|---|---|---|
| Armoured metal | dark puncture/dent with raised rim | sparks, ricochet streak, smoke | no full hole unless weapon penetration exceeds armour |
| Thin metal | puncture with torn rim | sparks and fragments | penetrable; exit mark when energy remains |
| Wood | dark hole and splinter ring | wood chips and dust | thin panels can break into sections |
| Brick/concrete | chipped cavity | masonry fragments and dust | repeated hits enlarge a local damage state |
| Glass | radial crack | glass shards | pane becomes broken/transparent after threshold |
| Ground | crater/decal | soil spray | crater size follows shell energy |
| Sandbags/cloth | dark tear | fibre/dust puff | local tear mark; no expensive topology change |

Water, fire, smoke, UI sprites and tiny decorative particles do not receive holes. Story characters do not receive gore or visible wounds.

### Implementation strategy

Arbitrary runtime CSG on every hit is rejected because it is too expensive and unstable for a browser game. Nearly every solid surface instead receives a normal-aligned 3D impact decal with a shallow rim/cavity mesh. Thin pre-authored objects can swap to damaged mesh sections. This produces a visible hole from gameplay distance without rebuilding full mesh topology.

- Pools cap persistent marks by class and recycle the oldest mark: 120 metal, 80 masonry/wood and 40 glass/other marks on desktop; half on coarse/mobile devices.
- Marks are parented to the hit object so they move with trucks, tanks and wagons.
- Tank wrecks retain their marks until the wreck is removed.
- Scene cleanup removes all decals, fragments and listeners idempotently.

## 4. Professional tank materials

One repeated olive texture cannot distinguish every vehicle. The new material library provides authored PBR-style families while preserving gameplay readability:

- Player: deep worn olive, rain-darkened steel, mud around running gear and restrained edge wear.
- Early enemy: dusty field grey with brown oxidation and workshop repair panels.
- Mid enemy: desaturated sand/olive disruptive camouflage.
- Mountain enemy: chipped winter whitewash over dark steel.
- Elite/boss: soot-dark steel with heat discoloration and heavier weld detail.

Each family has albedo, normal and roughness data; metalness stays physically restrained because painted steel is not exposed metal everywhere. UV scale, dirt direction and wear intensity differ by hull, turret, running gear and gun. No real-world extremist symbols are introduced because the setting is fictional.

## Architecture

New focused modules are preferred over expanding `scene-builder.js` further:

- `src/assets/model-loader.js`: cached GLB loading, cloning and disposal.
- `src/entities/human-actors.js`: male variants, animation states and actor lifecycle.
- `src/entities/rail-consist.js`: rail frame, track modules, locomotive and wagon placement.
- `src/entities/convoy.js`: upgraded truck model and curve-following behavior.
- `src/combat/surface-damage.js`: segment hit contract, material response and decal pools.
- `src/render/tank-materials.js`: texture loading and tank material families.
- `src/scenes/scene-builder.js`: composes these modules and owns their cleanup; it no longer contains detailed human or rail mesh construction.
- `docs/credits/assets.md`: asset provenance and license ledger.

`boot.js` loads GLTFLoader and the modules before scene construction. Model load failure displays a recoverable error and uses a clearly marked temporary fallback only during development; production acceptance requires the real GLB.

## Testing and acceptance

- A repository-wide scan finds none of the replaced female character names or obsolete dialogue in runtime/story content.
- Every visible M01 human is a male skinned mesh using a shared rig and at least one active animation clip.
- Characters visibly cross-fade between animation states without snapping and are disposed on retry/quit.
- Rail gauge is 1.435; wheel tread centres lie on rail heads within 1 cm; all consist items share the rail frame.
- Convoy trucks have six wheels, a driver, steering animation, wheel rotation, smooth acceleration/braking and preserved mission health/state behavior.
- Segment collision catches a shell crossing a thin wall in one frame.
- Supported solid surfaces create the correct persistent mark and effect; pool caps prevent unbounded growth.
- Tanks use visibly distinct material families with albedo/normal/roughness maps and retain existing faction/mission recognition.
- All current tests remain green, new behavior is covered by red-green tests, and M01 can be started, retried, won and exited without duplicated models or leaked mixers.

## Delivery order

Implementation proceeds in four reviewable plans matching the scope decomposition. The first playable checkpoint converts the narrative and replaces M01 humans. The second fixes railway scale and convoy visuals. The third adds surface damage. The fourth finishes tank material families and conducts integrated visual/performance verification.
