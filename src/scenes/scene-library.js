/* ================= کتابخانهٔ صحنه‌ها ================= */
(function(root){
  const scenes=Object.freeze({
    'scene-01':root.OpeningScene01
  });
  root.SceneLibrary=Object.freeze({
    getScene(id){return scenes[id]||null;},
    hasScene(id){return !!scenes[id];}
  });
})(globalThis);
