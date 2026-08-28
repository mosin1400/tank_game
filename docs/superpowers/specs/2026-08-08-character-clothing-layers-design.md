# Character clothing layers

## Goal

Every one of the 22 male game roles is clothed.  The six principal men retain
their individual GLB bodies and receive an underwear/base-cloth layer below
their uniform.  The sixteen secondary roles share the real player rig and a
small modular wardrobe at runtime, rather than shipping sixteen near-identical
multi-megabyte GLBs.

## Layers

1. `undershirt`: a neutral, short-sleeve cloth mesh for every character. It
   is never disabled, so a bare body is never displayed.
2. `uniform`: role/faction-coloured tunic and trousers.
3. `kit`: optional role equipment such as a cap, pack, headset, map case or
   tool roll. No real-world political or military symbols are used.

## Data and runtime

The existing roster remains the source of truth for `outfit`, `accentColor`
and `gear`. A new wardrobe module maps those fields to Three.js accessory
builders. Main-character GLBs include all three layers offline. Secondary
roles build the same layers from shared primitive-based garment meshes only
when spawned, and attach them to the Mixamo skeleton.

## Verification

The Blender asset verifier requires every main GLB to include an
`outfit_undershirt` mesh. The roster contract requires every one of the 22
entries to select a non-empty outfit. The runtime wardrobe test proves an
undershirt and uniform are produced for a secondary role without mutating the
shared template.
