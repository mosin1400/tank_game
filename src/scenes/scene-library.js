/* ================= کتابخانهٔ صحنه‌ها ================= */
(function(root){
  const scenes=Object.freeze({
    'scene-01':root.OpeningScene01,
    'scene-02':root.SoftGroundScene02
  });
  root.SceneLibrary=Object.freeze({
    getScene(id){return scenes[id]||null;},
    hasScene(id){return !!scenes[id];}
  });
})(globalThis);
