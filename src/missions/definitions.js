/* ================= پالت‌ها، سلاح‌ها، ماموریت‌ها ================= */
const PALETTES={
  day:{sun:0xffe9c4,sunI:2.4,fog:0xcfc4a8,fogFar:240,sky:0xffffff,hemi:0.7,exp:1.1},
  dusk:{sun:0xffa468,sunI:2.1,fog:0xd8b090,fogFar:220,sky:0xffcf9e,hemi:0.55,exp:1.05},
  dawn:{sun:0xffc8c0,sunI:1.9,fog:0xc9b4ae,fogFar:220,sky:0xffd9cf,hemi:0.6,exp:1.05},
  night:{sun:0x8fa8d8,sunI:1.05,fog:0x2e3444,fogFar:170,sky:0x5a6a8a,hemi:0.34,exp:0.95},
};
function applyPalette(key){
  const p=PALETTES[key]||PALETTES.day;
  sun.color.set(p.sun); sun.intensity=p.sunI;
  scene.fog.color.set(p.fog); scene.fog.far=p.fogFar;
  skyMat.color.set(p.sky);
  hemi.intensity=p.hemi;
  renderer.toneMappingExposure=p.exp;
}
const WEAPONS=[
  {name:'توپ ۸۵',dmg:40,reload:1.3,spd:150,max:80,unlock:0,splash:0,spread:0.004,expl:1.1,snd:1,recoil:0.16,kick:2.4},
  {name:'توپ ۵۷',dmg:24,reload:0.55,spd:195,max:170,unlock:3,splash:0,spread:0.003,expl:0.8,snd:1.5,recoil:0.1,kick:1.5},
  {name:'هویتزر ۱۲۲',dmg:115,reload:3.4,spd:105,max:30,unlock:7,splash:5.5,spread:0.012,expl:1.7,snd:0.5,recoil:0.3,kick:4.6},
  {name:'کاتیوشا',dmg:32,reload:2.6,spd:85,max:48,unlock:12,splash:2.6,spread:0.055,expl:1.0,snd:0,recoil:0.12,kick:1.2,salvo:6,rocket:true},
];
WEAPONS.forEach(w=>{w.ammo=w.max;w.reloadLeft=0;});
function weaponUnlocked(i){ return WEAPONS[i].unlock<=(prog.u-1); }
function selectWeapon(i){
  if(!weaponUnlocked(i)||state!=='play')return;
  if(curWeapon===i)return;
  curWeapon=i; salvoLeft=0; sClick(); refreshWeaponSlots();
}
function buildWeaponSlots(){
  weaponsEl.innerHTML='';
  WEAPONS.forEach((w,i)=>{
    const d=document.createElement('div');
    d.className='wslot';
    d.innerHTML=`<div class="wtop"><span class="wk">${faNum(i+1)}${weaponUnlocked(i)?'':' 🔒'}</span>
      <span class="wa">۰</span></div><div class="wn">${w.name}</div>
      <div class="wr"><div class="wrf"></div></div>`;
    d.addEventListener('click',()=>selectWeapon(i));
    weaponsEl.appendChild(d);
    w.el=d; w.elAmmo=d.querySelector('.wa'); w.elReload=d.querySelector('.wrf');
  });
  refreshWeaponSlots();
}
function refreshWeaponSlots(){
  WEAPONS.forEach((w,i)=>{
    w.el.classList.toggle('active',i===curWeapon);
    w.el.classList.toggle('locked',!weaponUnlocked(i));
  });
}
const CAMPS=['پیشروی در دشت','شهر سوخته','ضدحمله','سقوط قلعه'];
const TLABEL={destroy:'انهدام',survive:'بقا',waves:'دفع موج',boss:'باس',assault:'حمله به کمپین'};
const MISSIONS=[

 {n:'نخستین برخورد',d:'گشت زرهی دشمن در دشت دیده شده است. آن‌ها را منهدم کن.',t:'destroy',v:2,p:'day',c:1},
 {n:'پاکسازی دشت',d:'منطقه را از زره‌پوش‌های دشمن پاک کن.',t:'destroy',v:9,p:'day',c:1},
 {n:'شکارچی تانک',d:'دشمن نیروی بیشتری فرستاده است. پاداش فتح: توپ ۵۷ میلی‌متری.',t:'destroy',v:4,p:'day',c:1},
 {n:'دفاع از ارتفاعات',d:'موضعیت را در برابر پاتک دشمن حفظ کن.',t:'survive',v:12,p:'day',c:1},
 {n:'غول آهنی',d:'یک تانک سنگین فرماندهی ظاهر شده است. نابودش کن!',t:'boss',v:1,p:'day',c:1,bossHp:650},
 {n:'ورود به شهر',d:'دشمن در شهر سوخته سنگر گرفته است.',t:'destroy',v:10,p:'dusk',c:2},
 {n:'آتش در خیابان',d:'موج‌های دشمن را از خیابان‌ها بیرون بران. پاداش فتح: هویتزر ۱۲۲.',t:'waves',v:4,p:'dusk',c:2},
 {n:'کمین در غروب',d:'به کمپین دشمن حمله کن و تانک‌های پارک‌شده را نابود کن.',t:'assault',v:6,p:'dusk',c:2},
 {n:'مقاومت پل',d:'پل را تا رسیدن نیروی کمکی نگه دار.',t:'survive',v:100,p:'dusk',c:2},
 {n:'رئیس شهر',d:'فرمانده زرهی شهر را پیدا و منهدم کن.',t:'boss',v:1,p:'dusk',c:2,bossHp:900},
 {n:'نفوذ به کمپین',d:'کمپین اصلی دشمن در دوردست! به آن برس و منهدمش کن.',t:'assault',v:8,p:'dawn',c:3},
 {n:'طوفان آتش',d:'پنج موج پیاپی! پاداش فتح: راکت‌انداز کاتیوشا.',t:'waves',v:5,p:'dawn',c:3},
 {n:'زره در برابر زره',d:'تانک‌های سنگین دشمن در راه‌اند.',t:'destroy',v:16,p:'dawn',c:3},
 {n:'خط آتش',d:'تا آخرین نفس در خط آتش بمان.',t:'survive',v:120,p:'dawn',c:3},
 {n:'قلعه متحرک',d:'نخستین قلعه متحرک دشمن. زرهش را با هویتزر بشکاف!',t:'boss',v:1,p:'dawn',c:3,bossHp:1300,bossScale:1.5,bossName:'قلعه متحرک'},
 {n:'نفوذ به قلعه',d:'شب. قلعه. و انبوه زره‌پوش‌ها.',t:'destroy',v:16,p:'night',c:4},
 {n:'راهرو مرگ',d:'شش موج در تاریکی شب.',t:'waves',v:6,p:'night',c:4},
 {n:'آخرین زره‌پوش‌ها',d:'بقایای لشکر زرهی دشمن اینجا جمع شده‌اند.',t:'destroy',v:20,p:'night',c:4},
 {n:'شب سوزان',d:'تا سپیده‌دم دوام بیاور.',t:'survive',v:140,p:'night',c:4},
 {n:'نبرد نهایی',d:'«اژدهای آهنی»؛ نبرد آخر آغاز است.',t:'boss',v:1,p:'night',c:4,bossHp:1900,bossScale:1.6,bossName:'اژدهای آهنی'},
];
let prog={u:1,s:{}};
try{ const j=localStorage.getItem('t34war_v2'); if(j)prog=JSON.parse(j); }catch(e){}
function saveProg(){ try{ localStorage.setItem('t34war_v2',JSON.stringify(prog)); }catch(e){} }
const mDiff=i=>1+i*0.13;
function objectiveText(m){
  if(m.t==='assault')return `حمله به کمپین و انهدام ${faNum(m.v)} هدف`;
  if(m.t==='destroy')return `انهدام ${faNum(m.v)} تانک دشمن`;
  if(m.t==='survive')return `بقا به مدت ${faNum(m.v)} ثانیه`;
  if(m.t==='waves')return `دفع ${faNum(m.v)} موج دشمن`;
  return `انهدام ${m.bossName||'ببر آهنی'}`;
}

