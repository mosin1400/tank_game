# Shared Soldier Animation and Game Integration Design

## Chosen Approach

Use offline retargeting and baking. The CC0 Quaternius clips are sampled in Blender and converted once to animation tracks targeting the downloaded soldier's original 97-bone skeleton. The browser loads the baked clips and never performs per-frame skeleton retargeting. The model's original skeleton, skin weights, rigid equipment attachments, meshes, and UVs remain unchanged.

Two alternatives are rejected: runtime retargeting is slower and harder to validate, and replacing the downloaded skeleton with the Mixamo skeleton violates the approved preservation requirement.

## Motion Layers

- Baked library clips: idle, walk, run, aim, fall, talk, point, repair, driver-sit, rifle-reload, and hit-react.
- Runtime aliases cover roster states such as crouch-walk, radio, binoculars, brace, hatch-idle, and rifle-aim without duplicating large source data.
- Procedural overlays run after `AnimationMixer.update`: breathing on the chest/spine, target-looking on neck/head, recoil on spine/arms, simple jaw motion while talking, and small environment reactions.
- Crossfades remain configurable and one-shot states return to the requested locomotion state.

## Character Runtime

- Load `soldier-base.glb` once and clone it with Three.js `SkeletonUtils.clone` for each actor.
- Load `character-motion.glb` once and share its clips across clones.
- Clone materials per character before swapping the uniform texture so one actor cannot recolor another.
- Preserve all 22 roster IDs, roles, body scales, factions, dialogue metadata, and gameplay states.
- Replace scene-one primitive story actors with async model placeholders that keep their original transforms and colliders.

## Texture Variants

Create nine 1024px source-detail-preserving uniform variants: six unique main-character palettes and three secondary faction/occupation palettes. Skin, face, dirt, stitching, equipment, UVs, and source texture detail remain intact. Each of the 22 roster entries references a valid variant manifest entry.

## Validation Gates

- Structural: original 97 bones, original eight skinned meshes, eight rigid equipment meshes, no helper Icosphere, no embedded base-model actions.
- Motion: every baked clip has finite keyframes and targets only existing original-skeleton bones.
- Visual offline: contact sheets for idle, walk, run, aim, and fall at representative frames; reject exploding limbs, detached gear, ground drift, missing textures, and camera framing errors.
- Visual browser: operation-one screenshots show the new actors in the actual scene with distinct palettes; console must contain no character-loader or animation errors.
- Old models and exclusive MakeHuman/wardrobe generation files are removed only after all gates pass. The Universal Animation Library archive and extracted source remain untouched.

