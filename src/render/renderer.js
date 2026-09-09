/* ================= هسته ================= */
function initCore(){
  const app=document.getElementById('app');
  try{ renderer=new THREE.WebGLRenderer({antialias:true}); }
  catch(e){ throw new Error('WebGL روی این دستگاه/مرورگر فعال نیست. شتاب‌دهنده گرافیک یا مرورگر دیگر را امتحان کنید.'); }
  renderer.setPixelRatio(Math.min(devicePixelRatio,isCoarse?1.5:2));
  renderer.setSize(innerWidth,innerHeight);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.1;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  app.appendChild(renderer.domElement);
  renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());

  scene=new THREE.Scene();
  scene.fog=new THREE.Fog(0xcfc4a8,60,240);
  camera=new THREE.PerspectiveCamera(46,innerWidth/innerHeight,0.1,650);
  camera.position.set(0,6.5,-16);

  try{
    const pmrem=new THREE.PMREMGenerator(renderer);
    scene.environment=pmrem.fromScene(new RoomEnvironment(),0.04).texture;
  }catch(e){ console.warn('env',e); }

  if(EffectComposer&&!isCoarse){
    try{
      composer=new EffectComposer(renderer);
      composer.setPixelRatio(renderer.getPixelRatio());
      composer.setSize(innerWidth,innerHeight);
      composer.addPass(new RenderPass(scene,camera));
      composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),0.55,0.65,0.82));
    }catch(e){ composer=null; console.warn('bloom',e); }
  }

  hemi=new THREE.HemisphereLight(0xcfd9e2,0x58503f,0.7);
  scene.add(hemi);
  sun=new THREE.DirectionalLight(0xffe9c4,2.4);
  sun.position.set(40,55,25); sun.castShadow=true;
  const SH=isCoarse?1024:2048;
  sun.shadow.mapSize.set(SH,SH);
  sun.shadow.camera.left=-55; sun.shadow.camera.right=55;
  sun.shadow.camera.top=55; sun.shadow.camera.bottom=-55;
  sun.shadow.camera.near=5; sun.shadow.camera.far=170;
  sun.shadow.bias=-0.0004; sun.shadow.normalBias=0.03;
  scene.add(sun,sun.target);
  maxAniso=Math.min(renderer.capabilities.getMaxAnisotropy(),isCoarse?4:8);
  if(typeof GameSettings!=='undefined')GameSettings.apply();
}

/* ================= بافت‌ها و متریال‌ها ================= */
function canvasTexture(size,painter,repeat){
  const c=document.createElement('canvas'); c.width=c.height=size;
  painter(c.getContext('2d'),size);
  const t=new THREE.CanvasTexture(c);
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  if(repeat)t.repeat.set(repeat[0],repeat[1]);
  t.anisotropy=maxAniso; t.colorSpace=THREE.SRGBColorSpace; return t;
}
function hexA(hex,a){const n=parseInt(hex.slice(1),16);
  return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;}
function mottle(g,s,n,r0,r1,cols,a0,a1){
  for(let i=0;i<n;i++){
    const x=Math.random()*s,y=Math.random()*s,r=r0+Math.random()*(r1-r0);
    const gr=g.createRadialGradient(x,y,0,x,y,r);
    const c=cols[(Math.random()*cols.length)|0];
    gr.addColorStop(0,hexA(c,a0+Math.random()*(a1-a0))); gr.addColorStop(1,hexA(c,0));
    g.fillStyle=gr; g.fillRect(x-r,y-r,r*2,r*2);
  }
}
function speckle(g,s,n,cols,a0,a1,sz0,sz1){
  for(let i=0;i<n;i++){
    g.globalAlpha=a0+Math.random()*(a1-a0);
    g.fillStyle=cols[(Math.random()*cols.length)|0];
    const w=sz0+Math.random()*(sz1-sz0);
    g.fillRect(Math.random()*s,Math.random()*s,w,w*(0.6+Math.random()*0.8));
  } g.globalAlpha=1;
}
function scratches(g,s,n,col,a0,a1,l0,l1,w){
  g.lineCap='round';
  for(let i=0;i<n;i++){
    g.strokeStyle=col; g.globalAlpha=a0+Math.random()*(a1-a0); g.lineWidth=w||1;
    const x=Math.random()*s,y=Math.random()*s,an=Math.random()*Math.PI*2,l=l0+Math.random()*(l1-l0);
    g.beginPath(); g.moveTo(x,y); g.lineTo(x+Math.cos(an)*l,y+Math.sin(an)*l); g.stroke();
  } g.globalAlpha=1;
}
function chips(g,s,n){
  for(let i=0;i<n;i++){
    const x=Math.random()*s,y=Math.random()*s;
    g.fillStyle=Math.random()<0.45?'rgba(124,88,52,0.9)':'rgba(162,156,138,0.95)';
    const k=1+(Math.random()*3|0);
    for(let j=0;j<k;j++){g.beginPath();
      g.arc(x+(Math.random()*8-4),y+(Math.random()*8-4),0.8+Math.random()*2.6,0,6.283);g.fill();}
  }
}
function paintOlive(g,s){
  g.fillStyle='#59613e'; g.fillRect(0,0,s,s);
  mottle(g,s,26,50,150,['#767e52','#3d4430','#68714a','#4a5236'],0.10,0.22);
  speckle(g,s,6000,['#6b734b','#494f35','#7b8357','#3f4631'],0.04,0.14,1,2.2);
  scratches(g,s,50,'rgba(200,196,178,1)',0.10,0.32,8,44,1); chips(g,s,42);
}
function paintCast(g,s){
  g.fillStyle='#545c3a'; g.fillRect(0,0,s,s);
  mottle(g,s,70,8,34,['#6d7550','#3c4330','#7c8459','#474f35'],0.12,0.26);
  speckle(g,s,5000,['#676f49','#434a33','#757d53'],0.05,0.16,1,2); chips(g,s,26);
}
function paintRust(g,s){
  g.fillStyle='#453829'; g.fillRect(0,0,s,s);
  mottle(g,s,36,25,95,['#5d452e','#6e4a2a','#33271c','#77502f','#8a5a33'],0.16,0.34);
  speckle(g,s,7000,['#5d452e','#6e4a2a','#33271c','#96683c'],0.06,0.22,1,2.4);
  scratches(g,s,40,'rgba(168,150,120,1)',0.08,0.24,6,36,1);
}
function paintGray(g,s){
  g.fillStyle='#585850'; g.fillRect(0,0,s,s);
  mottle(g,s,30,40,130,['#6b6b60','#43433c','#75756a','#4e4e46'],0.12,0.24);
  speckle(g,s,6000,['#63635a','#484841','#707065'],0.05,0.15,1,2.2);
  scratches(g,s,45,'rgba(190,188,178,1)',0.08,0.28,8,42,1); chips(g,s,38);
}
function paintGround(g,s){
  g.fillStyle='#6e6852'; g.fillRect(0,0,s,s);
  mottle(g,s,30,30,110,['#7d7660','#5b5644','#7a6f57','#655f4a','#857d64'],0.12,0.26);
  speckle(g,s,8000,['#7d7660','#5b5644','#8a8371','#4f4a3a'],0.05,0.18,1,2.4);
  speckle(g,s,600,['#5f6b42','#6d7a4c'],0.10,0.26,1,2);
}
function paintWall(g,s){
  g.fillStyle='#8b8577'; g.fillRect(0,0,s,s);
  mottle(g,s,16,30,90,['#9a9484','#716c5e','#7f7a6b'],0.14,0.26);
  for(let row=0;row<4;row++)for(let col=0;col<4;col++){
    const wx=18+col*62,wy=16+row*62;
    g.fillStyle=Math.random()<0.25?'#3a3a34':'#23261f'; g.fillRect(wx,wy,32,38);
    g.fillStyle='rgba(20,20,18,.5)'; g.fillRect(wx,wy,32,6);
  }
  g.fillStyle='rgba(40,36,28,.35)';
  for(let i=0;i<14;i++)g.fillRect(Math.random()*s,Math.random()*s*0.4,3+Math.random()*5,40+Math.random()*90);
  speckle(g,s,2500,['#7a756a','#635f54','#918c7d'],0.05,0.16,1,2);
}
function paintSky(g,s){
  const gr=g.createLinearGradient(0,0,0,s);
  gr.addColorStop(0,'#7291b4'); gr.addColorStop(0.45,'#a8b6bd');
  gr.addColorStop(0.62,'#cdc6a9'); gr.addColorStop(1,'#d9c9a6');
  g.fillStyle=gr; g.fillRect(0,0,s,s);
}
function radialTex(size,stops){
  const c=document.createElement('canvas'); c.width=c.height=size;
  const g=c.getContext('2d');
  const gr=g.createRadialGradient(size/2,size/2,0,size/2,size/2,size/2);
  stops.forEach(st=>gr.addColorStop(st[0],st[1]));
  g.fillStyle=gr; g.fillRect(0,0,size,size);
  const t=new THREE.CanvasTexture(c); t.colorSpace=THREE.SRGBColorSpace; return t;
}
function loadRepeatTexture(path,repeat){
  const texture=new THREE.TextureLoader().load(path);
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(repeat[0],repeat[1]);texture.anisotropy=maxAniso;texture.colorSpace=THREE.SRGBColorSpace;
  return texture;
}
function makeTextures(){
  texOlive=canvasTexture(512,paintOlive);
  texCast=canvasTexture(512,paintCast);
  texRust=canvasTexture(512,paintRust);
  texGray=canvasTexture(512,paintGray);
  texGround=loadRepeatTexture('assets/images/m01-muddy-ground.png',[48,48]);
  texTankSteel=loadRepeatTexture('assets/images/tank-worn-olive-steel.png',[2.5,2.5]);
  texWall=canvasTexture(256,paintWall);
  texSky=canvasTexture(512,paintSky);
  texSmoke=radialTex(128,[[0,'rgba(255,255,255,.6)'],[0.4,'rgba(255,255,255,.35)'],[1,'rgba(255,255,255,0)']]);
  texGlow=radialTex(128,[[0,'rgba(255,240,200,1)'],[0.25,'rgba(255,180,80,.85)'],[0.6,'rgba(255,110,40,.28)'],[1,'rgba(255,90,30,0)']]);
}
function mat(o){ return new THREE.MeshStandardMaterial(Object.assign({envMapIntensity:0.45},o)); }
function makeMaterials(){
  matOlive=mat({map:texTankSteel,bumpMap:texTankSteel,bumpScale:0.045,color:0xb5bb91,roughness:0.82,metalness:0.12});
  matCast=mat({map:texTankSteel,bumpMap:texTankSteel,bumpScale:0.075,color:0x8c9669,roughness:0.86,metalness:0.10});
  matRust=mat({map:texRust,bumpMap:texRust,bumpScale:0.12,roughness:0.95,metalness:0.2});
  matGray=mat({map:texGray,bumpMap:texGray,bumpScale:0.05,roughness:0.8,metalness:0.18});
  matGrayL=mat({map:texGray,color:0xc6c6ba,roughness:0.78,metalness:0.2});
  matGrayH=mat({map:texGray,color:0x87877e,roughness:0.82,metalness:0.22});
  matPz1=mat({map:texTankSteel,bumpMap:texTankSteel,bumpScale:.035,color:0xc9c0a6,roughness:0.82,metalness:0.18});
  matPz2=mat({map:texTankSteel,bumpMap:texTankSteel,bumpScale:.04,color:0x8a8666,roughness:0.84,metalness:0.20});
  matPz3=mat({map:texTankSteel,bumpMap:texTankSteel,bumpScale:.045,color:0x55574a,roughness:0.86,metalness:0.22});
  matPz4=mat({map:texTankSteel,bumpMap:texTankSteel,bumpScale:.05,color:0x3a3832,roughness:0.88,metalness:0.26});
  matDark=mat({color:0x2b2d26,roughness:0.9,metalness:0.15});
  matChar=mat({color:0x272219,roughness:0.97,metalness:0.05});
  matRoof=mat({color:0x4a463c,roughness:0.95});
  matTrunk=mat({color:0x4a3826,roughness:0.95});
  matLeaf=mat({color:0x3e4a2c,roughness:0.95});
  matRock=mat({color:0x77705f,roughness:0.95});
  matHill=mat({color:0x6a6450,roughness:1});
  matBag=mat({color:0x8a7a58,roughness:0.95});
  matShellP=new THREE.MeshStandardMaterial({color:0xffd27a,emissive:0xffb347,emissiveIntensity:2.6});
  matShellE=new THREE.MeshStandardMaterial({color:0xff9a5a,emissive:0xff7030,emissiveIntensity:2.6});
  matRocket=new THREE.MeshStandardMaterial({color:0xffb0a0,emissive:0xff8050,emissiveIntensity:2.4});
  matMG=new THREE.MeshStandardMaterial({color:0xfff0a0,emissive:0xffdf70,emissiveIntensity:2.6});
}
function makeWorldSkin(){
  skyMat=new THREE.MeshBasicMaterial({map:texSky,side:THREE.BackSide,fog:false,depthWrite:false});
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(310,32,20),skyMat));
  ground=new THREE.Mesh(new THREE.CircleGeometry(300,72),
    mat({map:texGround,bumpMap:texGround,bumpScale:0.05,roughness:1}));
  ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; scene.add(ground);
  flare=new THREE.Sprite(new THREE.SpriteMaterial({map:texGlow,blending:THREE.AdditiveBlending,
    depthWrite:false,transparent:true,opacity:0.5,fog:false}));
  flare.position.set(160,100,85); flare.scale.set(48,48,1); scene.add(flare);
  moteGeo=new THREE.BufferGeometry();
  motePos=new Float32Array(MOTE_N*3);
  for(let i=0;i<MOTE_N;i++){
    motePos[i*3]=rand(-35,35); motePos[i*3+1]=rand(0.3,7); motePos[i*3+2]=rand(-35,35);
  }
  moteGeo.setAttribute('position',new THREE.BufferAttribute(motePos,3));
  motes=new THREE.Points(moteGeo,new THREE.PointsMaterial({size:0.12,color:0xffe9c0,
    transparent:true,opacity:0.4,blending:THREE.AdditiveBlending,depthWrite:false}));
  motes.frustumCulled=false; scene.add(motes);
}

/* ================= ساخت اشکال ================= */
function mkBox(p,w,h,d,m,x,y,z,rx=0,ry=0,rz=0){
  const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
  o.position.set(x,y,z); o.rotation.set(rx,ry,rz);
  o.castShadow=o.receiveShadow=true; p.add(o); return o;
}
function mkCyl(p,rt,rb,h,m,x,y,z,rx=0,ry=0,rz=0,seg=16){
  const o=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),m);
  o.position.set(x,y,z); o.rotation.set(rx,ry,rz);
  o.castShadow=o.receiveShadow=true; p.add(o); return o;
}
function mkSph(p,r,m,x,y,z,ws=20,hs=12){
  const o=new THREE.Mesh(new THREE.SphereGeometry(r,ws,hs),m);
  o.position.set(x,y,z); o.castShadow=o.receiveShadow=true; p.add(o); return o;
}
function mkPlate(p,w,th,yA,zA,yB,zB,m,x=0){
  const dy=yB-yA,dz=zB-zA;
  return mkBox(p,w,th,Math.hypot(dy,dz),m,x,(yA+yB)/2,(zA+zB)/2,-Math.atan2(dy,dz),0,0);
}

