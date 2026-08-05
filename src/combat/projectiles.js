/* ================= گلوله‌ها و آیتم‌ها ================= */
function initBullets(){
  const bulletGeo=new THREE.CylinderGeometry(0.05,0.05,0.6,8); bulletGeo.rotateX(Math.PI/2);
  for(let i=0;i<70;i++){
    const m=new THREE.Mesh(bulletGeo,matShellP); m.visible=false; scene.add(m);
    const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:texGlow,blending:THREE.AdditiveBlending,
      depthWrite:false,transparent:true,opacity:0.9}));
    glow.scale.set(0.9,0.9,1); m.add(glow);
    bullets.push({mesh:m,vel:new THREE.Vector3(),life:0,owner:'',kind:'shell',dmg:0,
      splash:0,expl:0.7,gravity:0,trailT:0,active:false});
  }
}
function spawnBullet(pos,dir,speed,owner,dmg,kind,opts={}){
  const b=bullets.find(o=>!o.active); if(!b)return;
  b.active=true; b.owner=owner; b.kind=kind; b.dmg=dmg; b.life=2.8;
  b.splash=opts.splash||0; b.expl=opts.expl||0.7; b.gravity=opts.gravity||0; b.trailT=0;
  b.mesh.visible=true; b.mesh.position.copy(pos); b.srcPos=pos.clone();
  b.vel.copy(dir).multiplyScalar(speed);
  b.mesh.material=kind==='mg'?matMG:(kind==='rocket'?matRocket:(owner==='player'?matShellP:matShellE));
  b.mesh.scale.setScalar(kind==='mg'?0.5:(kind==='rocket'?1.1:1));
  b.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),dir);
}
const PU={
  ammo:{color:'#c9d18a',sym:'مهمات',label:'مهمات',fs:34},
  repair:{color:'#74d06c',sym:'✚',label:'تعمیر زره',fs:62},
  rapid:{color:'#6ab4ff',sym:'⚡',label:'شلیک سریع',fs:62},
  power:{color:'#ffb03a',sym:'★',label:'قدرت دوبرابر',fs:62},
};
function initPUTex(){
  for(const k in PU){
    const c=document.createElement('canvas'); c.width=c.height=128;
    const g=c.getContext('2d');
    const gr=g.createRadialGradient(64,64,4,64,64,62);
    gr.addColorStop(0,hexA(PU[k].color,0.95)); gr.addColorStop(1,hexA(PU[k].color,0));
    g.fillStyle=gr; g.fillRect(0,0,128,128);
    g.font=`700 ${PU[k].fs}px Vazirmatn, Tahoma`; g.textAlign='center'; g.textBaseline='middle';
    g.fillStyle='#ffffff'; g.shadowColor='rgba(0,0,0,.7)'; g.shadowBlur=8;
    g.fillText(PU[k].sym,64,66);
    puTex[k]=new THREE.CanvasTexture(c); puTex[k].colorSpace=THREE.SRGBColorSpace;
  }
}
function spawnPowerup(forceKind){
  let kind=forceKind;
  if(!kind){
    const r=Math.random();
    kind=r<0.35?'ammo':(r<0.6?'repair':(r<0.8?'rapid':'power'));
  }
  const a=Math.random()*Math.PI*2,d=rand(18,85);
  const x=clamp(player.pos.x+Math.cos(a)*d,-BOUND+5,BOUND-5);
  const z=clamp(player.pos.z+Math.sin(a)*d,-BOUND+5,BOUND-5);
  const g=new THREE.Group(); g.position.set(x,0,z);
  mkBox(g,0.7,0.7,0.7,matOlive,0,0.4,0);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:puTex[kind],transparent:true,depthWrite:false}));
  sp.scale.set(1.8,1.8,1); sp.position.y=1.7; g.add(sp);
  scene.add(g);
  powerups.push({kind,root:g,sp,x,z,t:rand(0,6)});
}
function applyBuff(pu){
  const p=new THREE.Vector3(pu.x,0,pu.z);
  sPickup();
  spawnFlash(p.clone().setY(1.2),2.4);
  if(pu.kind==='repair'){
    player.hp=Math.min(100,player.hp+35);
    floatText('✚ +۳۵ زره',p,'#8fe08a');
  }else if(pu.kind==='ammo'){
    WEAPONS.forEach(w=>w.ammo=Math.min(w.max,w.ammo+Math.ceil(w.max*0.35)));
    floatText('مهمات رسید',p,'#e0e8b0');
    addFeed('مهمات دریافت شد');
  }else if(pu.kind==='rapid'){ buffRapid=12; floatText('⚡ شلیک سریع',p,'#8ecbff'); }
  else{ buffPower=12; floatText('★ قدرت دوبرابر',p,'#ffcf80'); }
}

