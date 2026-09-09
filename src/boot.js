
(function(){
  function esc(s){ return String(s).replace(/[<>&]/g,function(c){
    return {'<':'&lt;','>':'&gt;','&':'&amp;'}[c]; }); }
  window.__showError=function(msg,detail){
    window.__errSeen=true;
    var box=document.getElementById('errbox');
    if(box){
      box.style.display='block';
      box.innerHTML='<b>⚠ خطا در آماده‌سازی</b>'+
        '<div class="erm">'+esc(msg||'خطای نامشخص')+'</div>'+
        (detail?'<div class="erd">'+esc(detail)+'</div>':'')+
        '<div class="erh">📋 همین متن خطا را کپی کن و برایم بفرست تا برطرفش کنم.</div>';
    }
    var t=document.getElementById('errToast');
    if(t){ t.textContent='⚠ '+(msg||'خطا'); t.classList.add('on');
      t.onclick=function(){ t.classList.remove('on'); }; }
    console.error('[T34]',msg,detail);
  };
  window.addEventListener('error',function(e){
    if(e.message && /importmap|import map/i.test(e.message)){
      window.__showError('مرورگر از Import Map پشتیبانی نمی‌کند؛ مرورگر را به‌روزرسانی کنید.',e.message);
      return;
    }
    window.__showError(e.message||'خطای اجرا',
      (e.filename?String(e.filename).split('/').pop():'')+':'+(e.lineno||''));
  });
  window.addEventListener('unhandledrejection',function(e){
    var r=e.reason;
    var m=(r&&r.message)?r.message:String(r);
    window.__showError(m,(r&&r.stack)?String(r.stack).split('\n')[0].slice(0,180):'');
  });

  function setStep(txt,pct){
    var s=document.getElementById('ldStep'); if(s)s.textContent=txt;
    var f=document.getElementById('ldFill'); if(f)f.style.width=pct+'%';
  }

  var CDNs=[
    'https://cdn.jsdelivr.net/npm/three@0.160.0',
    'https://unpkg.com/three@0.160.0',
    'https://fastly.jsdelivr.net/npm/three@0.160.0'
  ];
  function probe(url){
    var ctl=new AbortController();
    var to=setTimeout(function(){ ctl.abort(); },4000);
    return fetch(url,{mode:'no-cors',cache:'force-cache',signal:ctl.signal})
      .then(function(){ clearTimeout(to); return true; })
      .catch(function(){ clearTimeout(to); return false; });
  }
  async function probeLocal(url){
    try{
      var ctl=new AbortController();
      var to=setTimeout(function(){ ctl.abort(); },4000);
      var r=await fetch(url,{cache:'no-store',signal:ctl.signal});
      clearTimeout(to); return r.ok;
    }catch(e){ return false; }
  }
  async function pickCDN(){
    setStep('بررسی نسخه آفلاین محلی…',1);
    if(await probeLocal('vendor/three/build/three.module.min.js'))
      return {three:'vendor/three/build/three.module.min.js',addons:'vendor/three/examples/jsm/',label:'فایل‌های محلی (آفلاین)'};
    for(var i=0;i<CDNs.length;i++){
      setStep('بررسی اتصال به سرور دانلود '+(i+1)+' از '+CDNs.length+'…',2+i*2);
      if(await probe(CDNs[i]+'/build/three.module.min.js'))
        return {three:CDNs[i]+'/build/three.module.min.js',addons:CDNs[i]+'/examples/jsm/',label:CDNs[i]};
    }
    return {three:CDNs[0]+'/build/three.module.min.js',addons:CDNs[0]+'/examples/jsm/',label:CDNs[0]};
  }
  var BUILD_VERSION='20260909-menu-profiles-v1';
  var GAME_SCRIPTS=[
    'src/core/runtime.js','src/ui/settings.js','src/assets/character-roster.js','src/entities/animation-manager.js','src/entities/weapon-models.js','src/entities/character-combat.js','src/entities/character-navigation.js','src/entities/tactical-command.js','src/entities/character-manager.js','src/entities/tank-aiming.js','src/render/renderer.js','src/scenes/scene-01.js','src/scenes/scene-library.js','src/scenes/scene-builder.js','src/world/battlefield.js',
    'src/combat/effects.js','src/audio/audio.js','src/missions/definitions.js',
    'src/campaign/mission-data.js','src/campaign/campaign-state.js',
    'src/profile/profile-view-model.js','src/profile/profile-store.js','src/profile/profile-ui.js',
    'src/entities/t34.js','src/entities/panzer.js','src/entities/convoy.js','src/combat/destructible-registry.js','src/combat/combat-awareness.js','src/combat/tank-damage.js','src/combat/impact-system.js','src/combat/projectiles.js',
    'src/input/controls.js','src/combat/combat.js','src/cinematics/opening-cinematic.js','src/missions/operation-controller.js','src/missions/director.js',
    'src/entities/player.js','src/ui/game-ui.js','src/ui/epic-intro.js','src/ui/campaign-map-model.js',
    'src/ui/mission-briefing.js','src/ui/campaign-map.js','src/ui/screens.js','src/main.js'
  ];
  function loadGameScripts(i){
    if(i>=GAME_SCRIPTS.length)return;
    var s=document.createElement('script');
    s.src=GAME_SCRIPTS[i]+'?v='+BUILD_VERSION;
    s.onload=function(){loadGameScripts(i+1);};
    s.onerror=function(){window.__showError('بارگذاری فایل بازی ناموفق بود: '+GAME_SCRIPTS[i]);};
    document.body.appendChild(s);
  }
  async function boot(){
    if(!(HTMLScriptElement.supports && HTMLScriptElement.supports('importmap'))){
      window.__showError('مرورگر قدیمی است (Import Map پشتیبانی نمی‌شود). کروم یا فایرفاکس جدید نصب کنید.');
      return;
    }
    var src=await pickCDN();
    window.__cdnBase=src.label;
    if(!document.querySelector('script[type="importmap"]')){
      var im=document.createElement('script');
      im.type='importmap';
      im.textContent=JSON.stringify({imports:{'three':src.three,'three/addons/':src.addons}});
      document.head.appendChild(im);
    }
    loadGameScripts(0);
    setTimeout(function(){
      if(!window.__booted){
        window.__showError('اسکریپت بازی اصلاً اجرا نشد — احتمالاً دانلود کتابخانه مسدود یا بسیار کند است.',
          'سرور انتخابی: '+window.__cdnBase+' — فیلترشکن را تغییر دهید یا صفحه را رفرش کنید.');
      }
    },16000);
    setTimeout(function(){
      if(window.__booted && !window.__libsLoaded && !window.__errSeen){
        window.__showError('دانلود three.js بیش از حد طول کشیده. اینترنت کند است یا CDN فیلتر شده.',
          'سرور: '+window.__cdnBase);
      }
    },45000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
