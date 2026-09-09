(function(global){
  'use strict';
  var key='t34.settings.v1';
  var presets={low:{pixelRatio:1,shadows:false,bloom:false,effects:.07,label:'کم'},medium:{pixelRatio:1.25,shadows:true,bloom:false,effects:.65,label:'متوسط'},high:{pixelRatio:1.55,shadows:true,bloom:true,effects:.82,label:'زیاد'},cinematic:{pixelRatio:2,shadows:true,bloom:true,effects:1,label:'سینمایی'}};
  var state={quality:'high',auto:true,showFps:true,shake:1,fov:46,volume:1};
  var fps={elapsed:0,frames:0,value:60,lowFor:0};
  function load(){try{Object.assign(state,JSON.parse(localStorage.getItem(key)||'{}'));}catch(error){}return state;}
  function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch(error){}}
  function apply(){
    var preset=presets[state.quality]||presets.high;
    global.qualityEffectsScale=preset.effects;
    if(typeof renderer==='undefined'||!renderer)return state;
    renderer.setPixelRatio(Math.min(devicePixelRatio,preset.pixelRatio));renderer.setSize(innerWidth,innerHeight);
    renderer.shadowMap.enabled=preset.shadows;
    if(global.composer){composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(innerWidth,innerHeight);if(composer.passes&&composer.passes[1])composer.passes[1].enabled=preset.bloom;}
    return state;
  }
  function setQuality(value){if(!presets[value])return false;state.quality=value;save();apply();render();return true;}
  function sampleFrame(dt){
    fps.elapsed+=dt;fps.frames++;
    if(fps.elapsed<.8)return;
    fps.value=Math.round(fps.frames/fps.elapsed);fps.frames=0;fps.elapsed=0;
    if(state.auto&&fps.value<42){fps.lowFor+=.8;if(fps.lowFor>2.4){var next=state.quality==='cinematic'?'high':state.quality==='high'?'medium':state.quality==='medium'?'low':'low';if(next!==state.quality)setQuality(next);fps.lowFor=0;}}
    else fps.lowFor=Math.max(0,fps.lowFor-.8);
    render();
  }
  function render(){
    var root=document.getElementById('settingsPanel');if(!root)return;
    root.querySelectorAll('[data-quality]').forEach(function(button){button.classList.toggle('active',button.dataset.quality===state.quality);});
    var auto=root.querySelector('#setAuto'),fpsEl=root.querySelector('#setFps');if(auto)auto.checked=state.auto;if(fpsEl)fpsEl.textContent='FPS: '+fps.value;
  }
  function init(){
    load();apply();
    if(document.getElementById('settingsPanel'))return;
    var root=document.createElement('section');root.id='settingsPanel';root.className='settings-panel';root.hidden=true;
    root.innerHTML='<div class="settings-card"><div class="settings-head"><b>تنظیمات عملیات</b><button id="closeSettings">×</button></div><div class="settings-row"><span>کیفیت گرافیک</span><div class="settings-options">'+Object.keys(presets).map(function(id){return '<button data-quality="'+id+'">'+presets[id].label+'</button>';}).join('')+'</div></div><label class="settings-row"><span>بهینه‌سازی خودکار</span><input id="setAuto" type="checkbox"></label><div class="settings-row"><span>شدت لرزش</span><input id="setShake" type="range" min="0" max="1" step=".1" value="'+state.shake+'"></div><div class="settings-row"><span>میدان دید</span><input id="setFov" type="range" min="40" max="60" step="1" value="'+state.fov+'"></div><div class="settings-row"><span>صدای کلی</span><input id="setVolume" type="range" min="0" max="1" step=".05" value="'+state.volume+'"></div><button id="setFullscreen" class="bigbtn ghost">تمام‌صفحه</button><div id="setFps" class="settings-fps"></div><p>کلیدها: Ctrl حرکت دقیق · Alt نگاه آزاد · C دوربین · Z علامت هدف · G دودزا · F1–F4 فرمان جوخه</p></div>';
    document.body.appendChild(root);root.querySelectorAll('[data-quality]').forEach(function(button){button.addEventListener('click',function(){setQuality(button.dataset.quality);});});
    root.querySelector('#setAuto').addEventListener('change',function(e){state.auto=e.target.checked;save();});
    root.querySelector('#setShake').addEventListener('input',function(e){state.shake=+e.target.value;save();});
    root.querySelector('#setFov').addEventListener('input',function(e){state.fov=+e.target.value;save();});
    root.querySelector('#setVolume').addEventListener('input',function(e){state.volume=+e.target.value;if(typeof master!=='undefined'&&master)master.gain.value=.5*state.volume;if(typeof musicPlayer!=='undefined'&&musicPlayer)musicPlayer.volume=.18*state.volume;save();});
    root.querySelector('#setFullscreen').addEventListener('click',function(){if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen().catch(function(){});});
    root.querySelector('#closeSettings').addEventListener('click',toggle);render();
  }
  function toggle(){var root=document.getElementById('settingsPanel');if(!root)return;root.hidden=!root.hidden;render();}
  global.GameSettings=Object.freeze({init:init,toggle:toggle,apply:apply,setQuality:setQuality,sampleFrame:sampleFrame,get:function(){return state;},presets:presets});
})(globalThis);
