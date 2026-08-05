/* ================= میدان نبرد ================= */
const enemyCamps=[];
let legacyWorldRoot=null;
function buildBattlefield(){
  legacyWorldRoot=new THREE.Group(); scene.add(legacyWorldRoot);
  const world=legacyWorldRoot;
  for(let i=0;i<13;i++){
    let x,z,ok=false,tries=0;
    while(!ok&&tries++<40){
      const a=Math.random()*Math.PI*2,d=rand(28,125);
      x=Math.cos(a)*d; z=Math.sin(a)*d; ok=true;
      if(Math.hypot(x,z)<22)ok=false;
      for(const b of buildings)if(Math.hypot(x-b.x,z-b.z)<b.hw*2+8)ok=false;
    }
    if(!ok)continue;
    const hw=rand(3.2,6),hd=rand(3.2,6),hh=rand(4.5,9.5);
    const wm=mat({map:texWall});
    const b=new THREE.Mesh(new THREE.BoxGeometry(hw*2,hh,hd*2),[wm,wm,matRoof,matRoof,wm,wm]);
    b.position.set(x,hh/2,z); b.rotation.y=Math.random()*Math.PI;
    b.castShadow=b.receiveShadow=true; world.add(b);
    buildings.push({x,z,hw:hw+0.4,hd:hd+0.4,h:hh});
    staticObs.push({type:'aabb',x,z,hw:hw+0.6,hd:hd+0.6,h:hh});
    for(let k=0;k<3;k++)
      mkBox(world,rand(0.6,1.6),rand(0.4,1),rand(0.6,1.6),matRock,
        x+rand(-hw-2,hw+2),0.3,z+rand(-hd-2,hd+2),0,Math.random()*3,0);
  }
  for(let i=0;i<38;i++){
    const a=Math.random()*Math.PI*2,d=rand(16,140);
    const x=Math.cos(a)*d,z=Math.sin(a)*d;
    if(buildings.some(b=>Math.abs(x-b.x)<b.hw+2.5&&Math.abs(z-b.z)<b.hd+2.5))continue;
    const t=new THREE.Group(); t.position.set(x,0,z);
    mkCyl(t,0.14,0.2,rand(1.6,2.6),matTrunk,0,1,0,0,0,0,8);
    mkSph(t,rand(1,1.8),matLeaf,0,rand(2.4,3.4),0,10,8);
    world.add(t); trees.push({x,z,root:t,alive:true});
  }
  for(let i=0;i<16;i++){
    const a=Math.random()*Math.PI*2,d=rand(18,138);
    const x=Math.cos(a)*d,z=Math.sin(a)*d,r=rand(0.7,1.7);
    const m=new THREE.Mesh(new THREE.IcosahedronGeometry(r,0),matRock);
    m.position.set(x,r*0.45,z); m.scale.y=0.6;
    m.rotation.set(Math.random(),Math.random()*3,Math.random());
    m.castShadow=m.receiveShadow=true; world.add(m);
    staticObs.push({type:'circle',x,z,r:r*0.8});
  }
  for(let c=0;c<4;c++){
    const a=Math.random()*Math.PI*2,d=rand(20,70);
    const x=Math.cos(a)*d,z=Math.sin(a)*d;
    const g=new THREE.Group(); g.position.set(x,0,z); g.rotation.y=Math.random()*3;
    for(let i=0;i<5;i++)mkBox(g,1,0.35,0.5,matBag,(i-2)*1.02,0.2,0);
    for(let i=0;i<4;i++)mkBox(g,1,0.35,0.5,matBag,(i-1.5)*1.02,0.55,0);
    world.add(g);
    staticObs.push({type:'aabb',x,z,hw:2.8,hd:0.7,h:0.9});
  }
  for(let i=0;i<10;i++){
    const a=i/10*Math.PI*2+rand(-0.2,0.2),d=rand(195,255);
    const m=new THREE.Mesh(new THREE.ConeGeometry(rand(35,65),rand(16,34),7),matHill);
    m.position.set(Math.cos(a)*d,0,Math.sin(a)*d); world.add(m);
  }
  for(const [fx,fz] of [[150,-170],[-175,-95],[70,195]]){
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:texGlow,blending:THREE.AdditiveBlending,
      depthWrite:false,transparent:true,opacity:0.7}));
    sp.position.set(fx,7,fz); sp.scale.set(30,22,1); world.add(sp); farFires.push(sp);
  }
  for(let i=0;i<8;i++){
    const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:texSmoke,transparent:true,
      depthWrite:false,opacity:rand(0.18,0.3),color:0xffffff,fog:false}));
    sp.position.set(rand(-260,260),rand(55,90),rand(-260,260));
    sp.scale.set(rand(70,120),rand(22,38),1); world.add(sp); clouds.push(sp);
  }
  /* علف‌ها */
  const grassGeo=new THREE.ConeGeometry(0.13,0.55,5);
  const grass=new THREE.InstancedMesh(grassGeo,mat({color:0xffffff,roughness:1}),700);
  const dm=new THREE.Object3D(),tc=new THREE.Color();
  let gi=0,guard=0;
  while(gi<700&&guard++<4000){
    const a=Math.random()*Math.PI*2,d=Math.sqrt(Math.random())*150;
    const x=Math.cos(a)*d,z=Math.sin(a)*d;
    if(buildings.some(b=>Math.abs(x-b.x)<b.hw+1&&Math.abs(z-b.z)<b.hd+1))continue;
    dm.position.set(x,0.22,z); dm.rotation.y=Math.random()*3;
    const sc=rand(0.6,1.5); dm.scale.set(sc,sc,sc);
    dm.updateMatrix(); grass.setMatrixAt(gi,dm.matrix);
    tc.setHSL(0.22+Math.random()*0.05,0.32,rand(0.22,0.36));
    grass.setColorAt(gi,tc); gi++;
  }
  world.add(grass);
    /* کمپین‌های دشمن: چادر، آتش، جعبه مهمات، تانک‌های پارک‌شده */
  for(let i=0;i<3;i++){
    const ang=i*Math.PI*2/3+rand(-0.2,0.2),d=rand(140,195);
    const cx=Math.cos(ang)*d,cz=Math.sin(ang)*d;
    const g=new THREE.Group(); g.position.set(cx,0,cz); g.rotation.y=rand(0,6.28);
    /* چادر فرماندهی */
    mkBox(g,3,2.2,4.5,matBag,0,1.1,0);
    mkBox(g,3.2,0.1,4.7,matDark,0,2.25,0);
    /* آتش کمپ */
    for(let k=0;k<3;k++){
      const fx=rand(-5,5),fz=rand(-5,5);
      mkBox(g,0.4,0.2,0.4,matTrunk,fx,0.1,fz);
      const fire=new THREE.Sprite(new THREE.SpriteMaterial({map:texGlow,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));
      fire.position.set(fx,0.7,fz); fire.scale.set(2.2,2.2,1); g.add(fire);
    }
    /* جعبه مهمات */
    for(let k=0;k<6;k++)mkBox(g,0.8,0.5,0.5,matDark,rand(-6,6),0.25,rand(-6,6));
    /* ۲ تانک پارک‌شده */
    for(let k=0;k<2;k++){
      const w=buildPanzer('medium','pz4');
      w.root.position.set(rand(-7,7),0,rand(-7,7));
      w.root.rotation.y=rand(0,6.28);
      w.root.traverse(o=>{if(o.isMesh)o.material=matChar;});
      g.add(w.root);
    }
    world.add(g);
    enemyCamps.push({x:cx,z:cz,root:g,alive:true});
    staticObs.push({type:'circle',x:cx,z:cz,r:6});
  }
}

