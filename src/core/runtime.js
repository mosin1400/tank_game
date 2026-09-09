
window.__booted=true;
const isCoarse=matchMedia('(pointer:coarse)').matches||'ontouchstart' in window;
const faNum=n=>{const v=Math.round(Number(n));return (isNaN(v)?0:v).toLocaleString('fa-IR');};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rand=(a,b)=>a+Math.random()*(b-a);
const BOUND=280;
const frame=()=>new Promise(r=>requestAnimationFrame(()=>setTimeout(r,15)));
const ldStep=document.getElementById('ldStep'),ldFill=document.getElementById('ldFill');
const step=(t,p)=>{ ldStep.textContent=t; ldFill.style.width=p+'%'; };

/* ---------- متغیرهای سراسری (در بوت مقدار می‌گیرند) ---------- */
let THREE=null,mergeGeometries=null,RoomEnvironment=null,
    EffectComposer=null,RenderPass=null,UnrealBloomPass=null,GLTFLoader=null,cloneSkeleton=null;
let renderer=null,scene=null,camera=null,composer=null,hemi=null,sun=null,fxLight=null;
let maxAniso=4;
let texOlive,texCast,texRust,texGray,texGround,texWall,texSky,texSmoke,texGlow,texTankSteel;
let matOlive,matCast,matRust,matGray,matGrayL,matGrayH,matDark,matChar,matRoof,
    matTrunk,matLeaf,matRock,matHill,matBag,matShellP,matShellE,matRocket,matMG,
    matPz1,matPz2,matPz3,matPz4;
let skyMat=null,ground=null,flare=null;
let moteGeo=null,motePos=null,motes=null;
const MOTE_N=240,FIRE_N=isCoarse?220:360;
const firePos=new Float32Array(FIRE_N*3),fireCol=new Float32Array(FIRE_N*3);
const fireVel=new Float32Array(FIRE_N*3),fireLife=new Float32Array(FIRE_N);
let fireCursor=0,fireGeo=null,firePoints=null;
const staticObs=[],buildings=[],trees=[],farFires=[],clouds=[];
const smokeSprites=[],flameSprites=[],flameLights=[],flashes=[],craters=[],rings=[],debris=[],floats=[];
const bullets=[],enemies=[],wrecks=[],wreckObs=[],pendingFx=[],powerups=[];
let craterCursor=0,shake=0,dmgAlpha=0,fovKick=0,timeScale=1;
let player=null;
let state='menu',paused=false,score=0,kills=0;
let cinematicControlsLocked=false;
let buffRapid=0,buffPower=0,puSpawnT=12,comboN=0,comboT=0,deathT=0;
let bossRef=null,curMission=null,curWeapon=0,salvoLeft=0,salvoT=0,lastAmmoWarn=0;
let puTex={};
let rumbleT=rand(5,10);
let uiScore,uiMission,uiFoes,uiKills,objEl,hpFill,reloadFill,msgEl,dmgEl,feedEl,
    radar,rctx,buffRapidEl,buffPowerEl,bossFillEl,hitEl,bannerEl,weaponsEl;
let msgTimer=null,hitTimer=null;
const hudCache={};

/* ================= بوت اصلی با نوار پیشرفت ================= */
window.startGame=async()=>{
try{
  step('بارگذاری موتور سه‌بعدی (three.js)…',7);
  THREE=await import('three');
  mergeGeometries=(await import('three/addons/utils/BufferGeometryUtils.js')).mergeGeometries;
  RoomEnvironment=(await import('three/addons/environments/RoomEnvironment.js')).RoomEnvironment;
  GLTFLoader=(await import('three/addons/loaders/GLTFLoader.js')).GLTFLoader;
  cloneSkeleton=(await import('three/addons/utils/SkeletonUtils.js')).clone;
  try{
    EffectComposer=(await import('three/addons/postprocessing/EffectComposer.js')).EffectComposer;
    RenderPass=(await import('three/addons/postprocessing/RenderPass.js')).RenderPass;
    UnrealBloomPass=(await import('three/addons/postprocessing/UnrealBloomPass.js')).UnrealBloomPass;
  }catch(e){ console.warn('Bloom غیرفعال:',e); }
  window.__libsLoaded=true;

  const characterLoader=new GLTFLoader();
  CharacterNavigation.configure({
    getObstacles:()=>staticObs.map(c=>c.type==='aabb'
      ?{kind:'aabb',minX:c.x-c.hw,maxX:c.x+c.hw,minZ:c.z-c.hd,maxZ:c.z+c.hd}
      :c.type==='obb'
        ?{kind:'obb',center:{x:c.x,z:c.z},halfSize:{x:c.hw,z:c.hd},yaw:c.ry||0}
        :{kind:'circle',position:{x:c.x,z:c.z},radius:c.r||.5}),
    getThreats:()=>enemies.filter(e=>!e.dead).map(e=>e.root.position),
    getPlayer:()=>player
  });
  CharacterManager.configure({
    THREE,
    loadGltf:url=>characterLoader.loadAsync(url),
    cloneScene:source=>cloneSkeleton(source)
  });
  step('بارگذاری شخصیت‌ها و حرکت‌های انسانی…',16); await CharacterManager.preload();

  step('ساخت صحنه، نور و دوربین…',22); await frame();
  initCore();

  step('نقاشی بافت‌ها (زره، زنگ، خاک)…',36); await frame();
  makeTextures(); makeMaterials(); makeWorldSkin();

  step('ساخت میدان نبرد: شهر، درخت، سنگر…',54); await frame();
  buildBattlefield();

  step('ساخت تانک فرمانده تی-۳۴…',70); await frame();
  player=buildT34();
  player.pos=new THREE.Vector3(0,0,0);
  player.yaw=0; player.speed=0; player.vel=new THREE.Vector3();
  player.hp=100; player.reload=0; player.recoil=0; player.wheelSpin=0;
  player.dead=false; player.mgT=0;
  scene.add(player.root);
  TankDamage.initialize(player);
  TankAiming.configure({THREE,getPlayer:()=>player,getAimPoint:()=>aimPoint});
  step('جلوه‌های انفجار، گلوله‌ها و آیتم‌ها…',82); await frame();
  initFXPools(); initBullets(); initPUTex();
  DestructibleRegistry.configure({
    maxFragments:isCoarse?36:80,
    removeCollider:collider=>{const i=staticObs.indexOf(collider);if(i>=0)staticObs.splice(i,1);},
    onDent:(entry,impact)=>{const p=new THREE.Vector3(impact.point.x,impact.point.y,impact.point.z);spawnDebris(p,2);spawnSmoke(p,1,{opacity:.22,maxLife:.45,color:0x4b4b45});},
    onBreak:(entry,impact,count)=>{const p=new THREE.Vector3(impact.point.x,impact.point.y,impact.point.z);spawnDebris(p,count);spawnSmoke(p,2,{opacity:.3,maxLife:1,color:0x74634d});},
    onChip:(entry,impact)=>spawnDebris(new THREE.Vector3(impact.point.x,impact.point.y,impact.point.z),2),
    onGroundImpact:(impact,profile)=>{const p=new THREE.Vector3(impact.point.x,.04,impact.point.z);addCrater(p,profile.craterSize);spawnSmoke(p,Math.max(1,profile.dustCount>>2),{opacity:.28,vy:1.1,maxLife:1.2,color:0x8f8268});}
  });
  CombatAwareness.configure({characterCombat:CharacterCombat});
  ImpactSystem.configure({targets:projectileImpactTargets,onImpact:resolveProjectileImpact});

  step('سلاح‌ها و سامانه ماموریت‌ها…',92); await frame();
  const campaignUiReady=initDom(); buildWeaponSlots();
  OpeningCinematic.configure({
    setSubtitle:(text,speaker)=>{const el=document.getElementById('cinematicSubtitle');if(el){el.innerHTML=`<b>${speaker}</b><span>${text}</span>`;el.classList.add('on');}},
    clearSubtitle:()=>{const el=document.getElementById('cinematicSubtitle');if(el)el.classList.remove('on');},
    lockControls:value=>{cinematicControlsLocked=!!value;document.body.classList.toggle('cinematic',!!value);},
    setMusicDuck:value=>{if(musicPlayer)musicPlayer.volume=.18*value;},
    onComplete:()=>showMsg('فرماندهی تانک در اختیار شماست.',2200)
  });
  TacticalCommand.configure({navigation:CharacterNavigation,onIssued:(command,count)=>showBanner('فرمان تاکتیکی',`${faNum(count)} نیرو فرمان ${command==='cover'?'پناه':command==='attack'?'حمله':command==='rally'?'تجمع کنار تانک':'عقب‌نشینی'} را دریافت کردند.`)});
  if(!campaignUiReady)console.warn('بخشی از رابط کمپین آماده نیست.');
  showProfileSelect();

  step('آماده نبرد!',100);
  animate();
  setTimeout(()=>document.getElementById('loading').classList.add('done'),400);
}catch(err){
  console.error(err);
  window.__showError((err&&err.message)||String(err),
    (err&&err.stack)?String(err.stack).split('\n').slice(0,2).join(' | ').slice(0,240):'');
}
};
