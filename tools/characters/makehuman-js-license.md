# makehuman-js exporter notice

`makehuman-js` 0.1.3 by Mike Clark (wassname) is used only by `makehuman-js-exporter.html`, a development-time OBJ generator. It is licensed under AGPL-3.0; its source is acquired from the npm registry and kept under ignored `tools/cache/`.

The companion `makehuman-data` 0.0.2 is MakeHuman-derived data under AGPL-3.0. It is approximately 85 MB and is never part of the shipped browser game.

The production game remains on Three.js r160. The exporter loads Three.js r82 in its own development page because makehuman-js 0.1.3 requires removed r82 APIs (`Geometry`, `JSONLoader`, `XHRLoader` and `MultiMaterial`). No r82 script is included by `src/boot.js`.

When publishing this project, publish the source of this exporter and retain this notice plus the upstream AGPL notices.
