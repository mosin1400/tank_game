/* ================= جلوه‌ها ================= */
function effectDetail(){return globalThis.effectDetail||'full';}
function spawnFire(p,n,spd,life){
  n=Math.ceil(n*(typeof qualityEffectsScale==='number'?qualityEffectsScale:1));if(n<1)return;
  for(let i=0;i<n;i++){
    const k=fireCursor; fireCursor=(fireCursor+1)%FIRE_N;
    firePos[k*3]=p.x+rand(-0.4,0.4); firePos[k*3+1]=p.y+rand(0,0.6); firePos[k*3+2]=p.z+rand(-0.4,0.4);
    const a=Math.random()*Math.PI*2,e=Math.random()*Math.PI-Math.PI/2,v=rand(1,spd);
    fireVel[k*3]=Math.cos(a)*Math.cos(e)*v; fireVel[k*3+1]=Math.sin(e)*v+rand(1,3); fireVel[k*3+2]=Math.sin(a)*Math.cos(e)*v;
    fireLife[k]=rand(0.35,life);
    if(effectDetail()==='full'&&i%3===0){
      const flame=flameSprites.find(item=>item.life<=0);
      if(flame){
        flame.life=flame.max=rand(Math.max(.28,life*.55),Math.max(.5,life));
        flame.seed=Math.random()*Math.PI*2;flame.flicker=rand(.82,1.18);
        flame.base=rand(.55,1.05);flame.s.position.set(firePos[k*3],firePos[k*3+1],firePos[k*3+2]);
        flame.s.scale.set(flame.base*.9,flame.base*1.7,1);flame.s.material.opacity=.9;flame.s.visible=true;
        const lamp=flameLights.find(item=>item.life<=0);
        if(lamp){lamp.life=flame.life;lamp.anchor=flame.s;lamp.flicker=flame.flicker;lamp.light.position.copy(flame.s.position);lamp.light.intensity=5.5*flame.base;}
      }
    }
  }
}
function spawnSmoke(p,n,opts={}){
  const minimal=effectDetail()==='minimal';
  n=Math.ceil(n*(typeof qualityEffectsScale==='number'?qualityEffectsScale:1));
  // دودزای تاکتیکی حتی در کیفیت کم باید پوشش بازی‌پذیرش را حفظ کند؛ فقط یک اسپرایت سبک می‌گیرد.
  if(minimal&&opts.gameplay)n=Math.max(1,n);
  else if(minimal||n<1)return;
  if(typeof CombatAwareness!=='undefined'&&(opts.opacity||.4)>=.4&&(n>=2||opts.gameplay)){
    CombatAwareness.registerSmoke({position:p,radius:Math.max(1.5,Math.sqrt(n)*1.2),density:Math.min(1,opts.opacity||.4),life:opts.maxLife||2.4});
  }
  for(let i=0;i<n;i++){
    const sm=smokeSprites.find(o=>o.life<=0); if(!sm)return;
    sm.life=sm.max=rand(1.2,opts.maxLife||2.4);
    sm.s.position.set(p.x+rand(-0.5,0.5),p.y+rand(0,0.5),p.z+rand(-0.5,0.5));
    sm.vy=rand(1.2,opts.vy||2.6); sm.grow=rand(1.4,2.6);
    sm.base=opts.opacity||0.4;
    sm.s.scale.set(rand(0.8,1.6),rand(0.8,1.6),1);
    sm.s.material.color.set(opts.color||0x9a9a92);
    sm.s.material.opacity=0; sm.s.visible=true;
  }
}
function spawnFlash(p,scale){
  if(effectDetail()==='minimal')scale=Math.min(scale,.72);
  const f=flashes.find(o=>o.life<=0); if(!f)return;
  f.life=0.16; f.s.position.copy(p); f.s.scale.set(scale,scale,1);
  f.s.material.opacity=1; f.s.visible=true;
}
function flashLight(p,i){const muzzleLightScale=globalThis.muzzleLightScale==null?1:globalThis.muzzleLightScale;fxLight.position.copy(p);fxLight.intensity=i*muzzleLightScale;}
function addCrater(p,size){
  const c=craters[craterCursor]; craterCursor=(craterCursor+1)%craters.length;
  c.visible=true; c.position.set(p.x,0.03,p.z);
  c.scale.set(size,1,size); c.rotation.y=Math.random()*Math.PI*2;
}
function spawnRing(p,size){
  const r=rings.find(o=>o.life<=0); if(!r)return;
  r.life=0.38; r.size=size; r.m.visible=true; r.m.position.set(p.x,0.06,p.z);
}
function spawnDebris(p,n){
  if(effectDetail()==='minimal')return;
  if(effectDetail()==='compact')n=Math.min(2,n);
  for(let i=0;i<n;i++){
    const d=debris.find(o=>o.life<=0); if(!d)return;
    d.life=rand(0.8,1.5); d.m.visible=true;
    d.m.position.set(p.x+rand(-0.5,0.5),p.y+rand(0,0.5),p.z+rand(-0.5,0.5));
    d.vel.set(rand(-6,6),rand(4,12),rand(-6,6));
    d.rot.set(rand(-8,8),rand(-8,8),rand(-8,8));
  }
}
function floatText(text,pos,color='#ffe9a8'){
  const f=floats.find(o=>o.life<=0); if(!f)return;
  const g=f.c.getContext('2d');
  g.clearRect(0,0,256,128);
  g.font='700 52px Vazirmatn, Tahoma';
  g.textAlign='center'; g.textBaseline='middle';
  g.shadowColor='rgba(0,0,0,.85)'; g.shadowBlur=12;
  g.fillStyle=color; g.fillText(text,128,64);
  f.s.material.map.needsUpdate=true;
  f.s.position.copy(pos); f.s.position.y+=2.8;
  f.life=1.15; f.s.visible=true; f.s.material.opacity=1;
}
function distToPlayer(p){ return Math.hypot(p.x-player.pos.x,p.z-player.pos.z); }
function explode(p,size,opts={}){
  if(effectDetail()==='minimal'){
    spawnFlash(p,Math.min(1.15,1.5*size));
    if(size>=.9&&!opts.noCrater)addCrater(p,Math.min(1.2,1.1*size));
    shake=Math.min(1.2,shake+size*.2);sBoom(clamp(1.1/(1+((opts.dist!=null)?opts.dist:distToPlayer(p))*.012),.06,1)*size,size);return;
  }
  spawnFire(p,Math.round(28*size),7*size+5,0.9);
  spawnSmoke(p,Math.round(5*size),{opacity:0.5,vy:2.2+size,maxLife:2.6,color:opts.smoke||0x77736a});
  spawnFlash(p,3.2*size);
  flashLight(p.clone().add(new THREE.Vector3(0,1.2,0)),70*size);
  if(size>=0.9){ spawnRing(p,size); spawnDebris(p,Math.round(8*size)); }
  if(size>=0.9&&!opts.noCrater)addCrater(p,1.3*size);
  shake=Math.min(2.4,shake+size*0.55);
  fovKick=Math.min(6,fovKick+size*1.1);
  const d=(opts.dist!=null)?opts.dist:distToPlayer(p);
  sBoom(clamp(1.1/(1+d*0.012),0.06,1)*size,size);
}
let smokeScreenCooldown=0;
function deploySmokeScreen(){
  if(!player||smokeScreenCooldown>0||state!=='play')return false;
  const fwd=new THREE.Vector3(Math.sin(player.yaw),0,Math.cos(player.yaw));
  const p=player.pos.clone().addScaledVector(fwd,13);p.y=.35;
  for(let i=0;i<5;i++){const q=p.clone();q.x+=rand(-3,3);q.z+=rand(-3,3);spawnSmoke(q,5,{opacity:.72,vy:2.1,maxLife:5.2,color:0x78766d,gameplay:true});}
  spawnFlash(p,2.1);smokeScreenCooldown=13;showMsg('پردهٔ دود فعال شد.',1300);return true;
}
function initFXPools(){
  for(let i=0;i<FIRE_N;i++)firePos[i*3+1]=-999;
  fireGeo=new THREE.BufferGeometry();
  fireGeo.setAttribute('position',new THREE.BufferAttribute(firePos,3));
  fireGeo.setAttribute('color',new THREE.BufferAttribute(fireCol,3));
  firePoints=new THREE.Points(fireGeo,new THREE.PointsMaterial({size:0.55,vertexColors:true,
    blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));
  firePoints.frustumCulled=false; scene.add(firePoints);
  for(let i=0;i<Math.min(isCoarse?42:70,globalThis.effectSpritePool||70);i++){
    const m=new THREE.SpriteMaterial({map:texSmoke,transparent:true,depthWrite:false,opacity:0});
    const s=new THREE.Sprite(m); s.visible=false; scene.add(s);
    smokeSprites.push({s,life:0,max:1,vy:1,grow:1,base:0.5});
  }
  for(let i=0;i<(effectDetail()==='full'?Math.min(isCoarse?30:54,globalThis.effectSpritePool||54):0);i++){
    const material=new THREE.SpriteMaterial({map:texGlow,color:0xff8a28,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0});
    const s=new THREE.Sprite(material);s.visible=false;scene.add(s);flameSprites.push({s,life:0,max:1,base:1,seed:0,flicker:1});
  }
  for(let i=0;i<(effectDetail()==='full'?Math.min(isCoarse?5:10,Math.ceil((globalThis.effectSpritePool||54)/6)):0);i++){
    const light=new THREE.PointLight(0xff8b35,0,8,2);scene.add(light);flameLights.push({light,life:0,anchor:null,flicker:1});
  }
  for(let i=0;i<10;i++){
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:texGlow,blending:THREE.AdditiveBlending,
      depthWrite:false,transparent:true,opacity:0}));
    s.visible=false; scene.add(s); flashes.push({s,life:0});
  }
  fxLight=new THREE.PointLight(0xffa545,0,40,2); scene.add(fxLight);
  const cg=new THREE.CircleGeometry(1,18); cg.rotateX(-Math.PI/2);
  for(let i=0;i<22;i++){
    const m=new THREE.Mesh(cg,new THREE.MeshBasicMaterial({color:0x221d14,transparent:true,opacity:0.75}));
    m.visible=false; m.position.y=0.03; scene.add(m); craters.push(m);
  }
  const rg=new THREE.RingGeometry(0.92,1,40); rg.rotateX(-Math.PI/2);
  for(let i=0;i<8;i++){
    const m=new THREE.Mesh(rg,new THREE.MeshBasicMaterial({color:0xffd9a0,transparent:true,opacity:0,
      blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
    m.visible=false; scene.add(m); rings.push({m,life:0,size:1});
  }
  for(let i=0;i<26;i++){
    const m=new THREE.Mesh(new THREE.BoxGeometry(rand(0.1,0.22),rand(0.08,0.16),rand(0.12,0.24)),matChar);
    m.visible=false; scene.add(m);
    debris.push({m,vel:new THREE.Vector3(),rot:new THREE.Vector3(),life:0});
  }
  for(let i=0;i<10;i++){
    const c=document.createElement('canvas'); c.width=256; c.height=128;
    const tx=new THREE.CanvasTexture(c); tx.colorSpace=THREE.SRGBColorSpace;
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tx,transparent:true,depthWrite:false}));
    s.visible=false; s.scale.set(5,2.5,1); scene.add(s);
    floats.push({s,c,life:0});
  }
}

