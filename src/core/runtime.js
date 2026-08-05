
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
    EffectComposer=null,RenderPass=null,UnrealBloomPass=null;
let renderer=null,scene=null,camera=null,composer=null,hemi=null,sun=null,fxLight=null;
let maxAniso=4;
let texOlive,texCast,texRust,texGray,texGround,texWall,texSky,texSmoke,texGlow;
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
const smokeSprites=[],flashes=[],craters=[],rings=[],debris=[],floats=[];
const bullets=[],enemies=[],wrecks=[],wreckObs=[],pendingFx=[],powerups=[];
let craterCursor=0,shake=0,dmgAlpha=0,fovKick=0,timeScale=1;
let player=null;
let state='menu',paused=false,score=0,kills=0;
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
  try{
    EffectComposer=(await import('three/addons/postprocessing/EffectComposer.js')).EffectComposer;
    RenderPass=(await import('three/addons/postprocessing/RenderPass.js')).RenderPass;
    UnrealBloomPass=(await import('three/addons/postprocessing/UnrealBloomPass.js')).UnrealBloomPass;
  }catch(e){ console.warn('Bloom غیرفعال:',e); }
  window.__libsLoaded=true;

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
  step('جلوه‌های انفجار، گلوله‌ها و آیتم‌ها…',82); await frame();
  initFXPools(); initBullets(); initPUTex();

  step('سلاح‌ها و سامانه ماموریت‌ها…',92); await frame();
  const campaignUiReady=initDom(); buildWeaponSlots();
  if(campaignUiReady)showProfileSelect(); else showMenu();

  step('آماده نبرد!',100);
  animate();
  setTimeout(()=>document.getElementById('loading').classList.add('done'),400);
}catch(err){
  console.error(err);
  window.__showError((err&&err.message)||String(err),
    (err&&err.stack)?String(err.stack).split('\n').slice(0,2).join(' | ').slice(0,240):'');
}
};
