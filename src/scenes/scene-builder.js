/* ================= سازندهٔ لایه‌های صحنه ================= */
(function(root){
  let active=null,configured=null;
  const INDUSTRIAL_ATLAS='assets/images/m01-industrial-material-atlas.png';
  function industrialMaterial(column,row,options={}){
    const map=new THREE.TextureLoader().load(INDUSTRIAL_ATLAS);
    map.colorSpace=THREE.SRGBColorSpace; map.wrapS=map.wrapT=THREE.RepeatWrapping;
    map.repeat.set(.5,.5); map.offset.set(column*.5,row*.5);
    return mat(Object.assign({map,roughness:.72,metalness:.2},options));
  }
  function buildFuelDepotDetails(parent,center){
    const [x,,z]=center,drum=industrialMaterial(0,0,{metalness:.45,roughness:.5}),crate=industrialMaterial(0,1,{roughness:.85});
    const drumClusters=[[-17,-9],[14,8]];
    for(const [baseX,baseZ] of drumClusters)for(let row=0;row<3;row++)for(let col=0;col<4;col++){
      const barrel=markProp(new THREE.Mesh(new THREE.CylinderGeometry(.48,.55,1.35,12),drum),'fuel-drum');
      barrel.position.set(x+baseX+col*1.1,.68,z+baseZ+row*1.05);barrel.castShadow=barrel.receiveShadow=true;parent.add(barrel);
    }
    for(const [baseX,baseZ] of [[9,-14],[-20,4],[17,-4]])for(let row=0;row<2;row++)for(let col=0;col<3;col++)
      markProp(mkBox(parent,1.15,1.05,1.15,crate,x+baseX+col*1.18,.55+row*1.03,z+baseZ+(col%2)*.12,0),'cargo-crate');
  }
  function railPoint(frame,distance,lateral=0){
    const cos=Math.cos(frame.yaw),sin=Math.sin(frame.yaw);
    return {x:frame.x+cos*distance+sin*lateral,z:frame.z-sin*distance+cos*lateral,ry:frame.yaw};
  }
  function computeRailLayout(options){
    const frame={x:options.x,z:options.z,yaw:options.yaw||0};
    const length=options.length||80,gauge=options.gauge||4;
    const rails=[railPoint(frame,0,-gauge/2),railPoint(frame,0,gauge/2)];
    const sleepers=[];
    for(let distance=-length/2;distance<=length/2+.001;distance+=2.6)sleepers.push(railPoint(frame,distance,0));
    const wagons=(options.wagonOffsets||[]).map(distance=>Object.assign({distance},railPoint(frame,distance,0)));
    return {frame,length,gauge,rails,sleepers,wagons};
  }
  function buildRailWagon(parent,placement,materials,variant='box'){
    const wagon=new THREE.Group(); wagon.position.set(placement.x,0,placement.z); wagon.rotation.y=placement.ry; parent.add(wagon);
    wagon.userData.railWagon=variant;
    mkBox(wagon,12,.55,3.5,materials.frame,0,.65,0);
    if(variant==='tanker'){
      mkCyl(wagon,1.35,1.35,9.6,materials.body,0,2.05,0,0,0,Math.PI/2,20);
      mkBox(wagon,9.2,.1,.45,materials.frame,0,3.38,0);
    }else if(variant==='flat'){
      mkBox(wagon,11.4,.32,3.25,materials.deck,0,1.05,0);
      for(const x of[-4.2,0,4.2])mkBox(wagon,2.4,1.25,2.7,materials.cargo,x,1.82,0);
    }else{
      mkBox(wagon,10.8,2.65,3.2,materials.body,0,2.2,0);
      for(const x of[-4.3,4.3])mkBox(wagon,.12,1.9,2.5,materials.frame,x,2.25,0);
    }
    for(const x of[-4.2,4.2])for(const z of[-1.38,1.38])mkCyl(wagon,.45,.45,.18,materials.wheel,x,.42,z,Math.PI/2,0,0,12);
    return wagon;
  }
  function markProp(object,kind){object.userData.sceneProp=kind;return object;}
  const STORY_ROSTER={
    'convoy-crew-a':'vardan-rifleman','convoy-crew-b':'vardan-tanker',
    'depot-worker-a':'vardan-engineer','depot-worker-b':'vardan-rifleman',observer:'shahin-tali'
  };
  const STORY_WEAPONS={
    'convoy-crew-a':'ppsh41','convoy-crew-b':'mosin','depot-worker-a':'mosin',
    'depot-worker-b':'ppsh41',observer:'mosin'
  };
  function buildStoryCharacter(parent,role,x,z,yaw,animationState,movement){
    const actor=typeof CharacterManager!=='undefined'
      ?CharacterManager.spawnCharacter(role,{x,y:0,z},{parent,rosterId:STORY_ROSTER[role]||role,yaw:yaw||0,initialState:animationState,movement,weapon:STORY_WEAPONS[role]||'mosin'})
      :new THREE.Group();
    if(!actor.parent){actor.position.set(x,0,z);actor.rotation.y=yaw||0;parent.add(actor);}
    actor.userData.actorRole=role;
    return actor;
  }
  function buildFence(parent,x,z,length,yaw,material){
    const fence=markProp(new THREE.Group(),'fence');fence.position.set(x,0,z);fence.rotation.y=yaw||0;parent.add(fence);
    for(let d=-length/2;d<=length/2+.01;d+=2.5)mkBox(fence,.14,1.8,.14,material,d,.9,0);
    mkBox(fence,length,.1,.1,material,0,.65,0);mkBox(fence,length,.1,.1,material,0,1.35,0);
    return fence;
  }
  function buildSandbags(parent,x,z,yaw,count=5){
    const wall=markProp(new THREE.Group(),'sandbags');wall.position.set(x,0,z);wall.rotation.y=yaw||0;parent.add(wall);
    for(let i=0;i<count;i++)mkBox(wall,.95,.34,.48,matBag,(i-(count-1)/2)*.88,.18,0);
    for(let i=0;i<count-1;i++)mkBox(wall,.95,.34,.48,matBag,(i-(count-2)/2)*.88,.5,0);
    return wall;
  }
  function buildUtilityTruck(parent,x,z,yaw){
    const truck=markProp(new THREE.Group(),'parked-truck');truck.position.set(x,0,z);truck.rotation.y=yaw||0;parent.add(truck);
    mkBox(truck,2.2,1.15,2.2,matGray,0,1.15,1.25);mkBox(truck,2.35,.55,4.1,matRust,0,.72,-1);
    mkBox(truck,2.1,1.25,2.55,matBag,0,1.45,-1.05);
    for(const z0 of[-2.25,.9])for(const side of[-1,1])mkCyl(truck,.48,.48,.22,matDark,side*1.12,.48,z0,0,0,Math.PI/2,12);
    return truck;
  }
  function buildBurnedTree(parent,x,z,scale=1){
    const tree=markProp(new THREE.Group(),'burned-tree');tree.position.set(x,0,z);tree.rotation.y=(x*z)%2;parent.add(tree);
    mkCyl(tree,.16*scale,.3*scale,3.4*scale,matTrunk,0,1.7*scale,0,0,0,.08,7);
    mkCyl(tree,.07*scale,.12*scale,1.8*scale,matTrunk,.35*scale,2.7*scale,0,0,0,-.75,6);
    mkCyl(tree,.06*scale,.1*scale,1.5*scale,matTrunk,-.35*scale,2.4*scale,.05,0,0,.85,6);
    return tree;
  }
  function buildLamp(parent,x,z){
    const lamp=markProp(new THREE.Group(),'yard-lamp');lamp.position.set(x,0,z);parent.add(lamp);
    mkCyl(lamp,.07,.1,4.8,matDark,0,2.4,0,0,0,0,8);mkBox(lamp,.65,.16,.38,matGray,.25,4.65,0);
    return lamp;
  }
  function buildCableSpool(parent,x,z,yaw){
    const spool=markProp(new THREE.Group(),'cable-spool');spool.position.set(x,0,z);spool.rotation.y=yaw||0;parent.add(spool);
    mkCyl(spool,.9,.9,.14,matTrunk,-.52,.9,0,0,0,Math.PI/2,12);mkCyl(spool,.9,.9,.14,matTrunk,.52,.9,0,0,0,Math.PI/2,12);
    mkCyl(spool,.48,.48,1.1,matDark,0,.9,0,0,0,Math.PI/2,12);return spool;
  }
  function defaultDependencies(){
    return {
      createRoot:()=>new THREE.Group(),
      addRoot:sceneRoot=>scene.add(sceneRoot),
      removeRoot:sceneRoot=>scene.remove(sceneRoot),
      setLegacyVisible:visible=>setLegacyWorldVisible(visible),
      addCollider:collider=>staticObs.push(collider),
      removeCollider:collider=>{const index=staticObs.indexOf(collider);if(index>=0)staticObs.splice(index,1);},
      build:(layout,handle)=>buildOpeningScene(layout,handle)
    };
  }
  function buildOpeningScene(layout,handle){
    if(layout.id!=='scene-01')return;
    const group=handle.root;
    const addBox=(w,h,d,material,x,y,z,ry=0)=>mkBox(group,w,h,d,material,x,y,z,0,ry,0);
    const roadMaterial=industrialMaterial(1,1,{roughness:1});
    const mudMaterial=industrialMaterial(1,1,{roughness:1});
    const railMaterial=industrialMaterial(0,1,{metalness:.75,roughness:.3});
    const fireMaterial=mat({color:0x6a2814,roughness:.8});
    addBox(138,.08,7,roadMaterial,8,.04,38,-.54);
    addBox(70,.08,6,mudMaterial,73,.05,-14,-.7);
    const rail=computeRailLayout({x:-78,z:46,yaw:-.12,length:86,gauge:4,wagonOffsets:[-26,-8,12]});
    rail.rails.forEach(p=>addBox(rail.length,.18,.18,railMaterial,p.x,.2,p.z,p.ry));
    rail.sleepers.forEach(p=>addBox(.34,.16,6,matTrunk,p.x,.1,p.z,p.ry));
    const wagonMaterials={frame:matRust,body:industrialMaterial(0,0,{metalness:.52,roughness:.48}),deck:matTrunk,cargo:industrialMaterial(0,1,{roughness:.85}),wheel:matDark};
    rail.wagons.forEach((p,index)=>{
      buildRailWagon(group,p,wagonMaterials,['box','tanker','flat'][index]);
      handle.addCollider({type:'obb',x:p.x,z:p.z,hw:6.2,hd:2,ry:p.ry,h:3.8});
    });
    const [fuelX,,fuelZ]=layout.landmarks.fuelYard;
    for(const offset of [[-10,4],[-3,-2],[6,3]]){
      const tank=markProp(new THREE.Mesh(new THREE.CylinderGeometry(3.3,3.3,7,20),industrialMaterial(0,0,{metalness:.5,roughness:.42})),'fuel-tank');
      tank.rotation.z=Math.PI/2; tank.position.set(fuelX+offset[0],3.2,fuelZ+offset[1]); tank.castShadow=tank.receiveShadow=true; group.add(tank);
      handle.addCollider({type:'circle',x:fuelX+offset[0],z:fuelZ+offset[1],r:3.7,h:6.5,targetObject:tank,material:'steel',durability:260});
    }
    markProp(addBox(13,5,9,industrialMaterial(0,0,{metalness:.28,roughness:.64}),fuelX+14,2.5,fuelZ-9,.1),'depot-building');
    markProp(addBox(15,.25,10,industrialMaterial(0,0,{metalness:.55,roughness:.42}),fuelX+14,5.2,fuelZ-9,.1),'depot-roof');
    handle.addCollider({type:'obb',x:fuelX+14,z:fuelZ-9,hw:6.8,hd:4.8,ry:.1,h:5.4});
    buildFuelDepotDetails(group,layout.landmarks.fuelYard);
    for(const [x,z,yaw,length] of [[fuelX-25,fuelZ-3,Math.PI/2,18],[fuelX+1,fuelZ+18,0,22],[fuelX+25,fuelZ+5,Math.PI/2,15]]){
      const fence=buildFence(group,x,z,length,yaw,matRust);handle.addCollider({type:'obb',x,z,hw:length/2,hd:.22,ry:yaw,h:1.8,targetObject:fence,material:'light-metal',durability:24});
    }
    for(const [x,z] of [[fuelX-24,fuelZ-14],[fuelX+2,fuelZ+19],[fuelX+25,fuelZ-9],[fuelX-3,fuelZ-18],[fuelX+20,fuelZ+15],[fuelX-23,fuelZ+12]])buildLamp(group,x,z);
    for(const [x,z,yaw] of [[fuelX+25,fuelZ-14,.2],[fuelX-25,fuelZ+13,-.4]]){
      const truck=buildUtilityTruck(group,x,z,yaw);handle.addCollider({type:'obb',x,z,hw:1.45,hd:2.55,ry:yaw,h:2.2,targetObject:truck,material:'light-metal',durability:55});
    }
    for(const [x,z,yaw] of [[fuelX-18,fuelZ-1,.2],[fuelX+19,fuelZ+2,-.1],[fuelX+5,fuelZ-17,1.2]])buildCableSpool(group,x,z,yaw);
    for(const [x,z] of [[fuelX-14,fuelZ-2],[fuelX+13,fuelZ+9]])handle.addCollider({type:'obb',x,z,hw:2.1,hd:1.5,ry:0,h:2.2});
    const [bridgeX,,bridgeZ]=layout.landmarks.canalBridge;
    markProp(addBox(56,.04,8,mat({color:0x253c40,roughness:1}),bridgeX,.01,bridgeZ+14,-.5),'canal-water');
    markProp(addBox(8,.4,14,matTrunk,bridgeX,.25,bridgeZ,0),'bridge-deck');
    for(const side of[-1,1]){
      markProp(addBox(.28,1,14,matRust,bridgeX+side*3.75,.72,bridgeZ,0),'bridge-rail');
      handle.addCollider({type:'aabb',x:bridgeX+side*3.75,z:bridgeZ,hw:.3,hd:7,h:1.3});
    }
    for(const [x,z,yaw] of [[-3,58,-.55],[24,20,-.35],[41,6,.25],[73,-17,-.5],[96,-32,-.2]]){
      buildSandbags(group,x,z,yaw,5);handle.addCollider({type:'obb',x,z,hw:2.45,hd:.45,ry:yaw,h:.8});
    }
    for(const [x,z,s] of [[31,43,1.2],[39,38,.9],[47,34,1.15],[55,29,1],[61,22,.85],[69,15,1.05],[78,8,.95],[87,0,1.1]])buildBurnedTree(group,x,z,s);
    for(const [x,z] of [[-10,46],[3,40],[19,33],[34,19],[52,5],[79,-13]]){
      const rubble=markProp(new THREE.Group(),'rubble');rubble.position.set(x,0,z);group.add(rubble);
      for(let i=0;i<4;i++)mkBox(rubble,.55+i*.08,.25+i*.04,.45,matRock,(i-1.5)*.42,.15,(i%2-.5)*.45,0,(i*.7)%2,0);
    }
    const [towerX,,towerZ]=layout.landmarks.watchTower;
    for(const [dx,dz] of [[-2,-2],[2,-2],[-2,2],[2,2]])markProp(mkCyl(group,.18,.22,8,matTrunk,towerX+dx,4,towerZ+dz,0,0,0,6),'tower-leg');
    markProp(addBox(3.4,.3,3.4,matDark,towerX,8,towerZ,0),'tower-platform');markProp(addBox(4,.18,4,matRoof,towerX,8.4,towerZ,0),'tower-roof');
    handle.addCollider({type:'circle',x:towerX,z:towerZ,r:3,h:8.5});
    const [generatorX,,generatorZ]=layout.landmarks.generator;
    markProp(addBox(2.2,1.2,1.6,matGray,generatorX,0.6,generatorZ,.2),'generator');
    handle.addCollider({type:'obb',x:generatorX,z:generatorZ,hw:1.2,hd:.9,ry:.2,h:1.3});
    for(const [x,z,yaw] of [[towerX-7,towerZ+7,.1],[towerX+6,towerZ+7,-.25],[generatorX-5,generatorZ-3,.5],[generatorX+6,generatorZ+2,-.4],[111,-57,.1]]){
      buildSandbags(group,x,z,yaw,5);handle.addCollider({type:'obb',x,z,hw:2.45,hd:.45,ry:yaw,h:.8});
    }
    const [exitX,,exitZ]=layout.landmarks.exitGate;
    markProp(addBox(.4,3,.4,matTrunk,exitX-4,1.5,exitZ,0),'gate-post');markProp(addBox(.4,3,.4,matTrunk,exitX+4,1.5,exitZ,0),'gate-post');markProp(addBox(8.4,.22,.35,matTrunk,exitX,2.85,exitZ,0),'gate-beam');
    handle.addCollider({type:'circle',x:exitX-4,z:exitZ,r:.55,h:3});handle.addCollider({type:'circle',x:exitX+4,z:exitZ,r:.55,h:3});
    const panic=(points,delay,speed=2.8)=>({waypoints:points.map(([x,z])=>({x,z})),startDelay:delay,speed,state:'run'});
    const actors=[
      ['convoy-crew-a',fuelX+8,fuelZ+12,-.4,{},'aim',panic([[fuelX+15,fuelZ+17],[fuelX+20,fuelZ+11],[fuelX+12,fuelZ+8]],.25,3.1)],
      ['convoy-crew-b',fuelX-13,fuelZ+16,.8,{},'idle',panic([[fuelX-19,fuelZ+20],[fuelX-25,fuelZ+15],[fuelX-18,fuelZ+10]],.8,2.9)],
      ['depot-worker-a',fuelX-22,fuelZ-6,1.2,{coat:0x4f5247},'idle',panic([[fuelX-27,fuelZ-11],[fuelX-18,fuelZ-15],[fuelX-13,fuelZ-9]],1.35,2.7)],
      ['depot-worker-b',fuelX+23,fuelZ+7,-1,{coat:0x4f5247},'repair',panic([[fuelX+29,fuelZ+13],[fuelX+34,fuelZ+7],[fuelX+28,fuelZ+1]],1.7,2.8)]
    ];
    for(const [role,x,z,yaw,colors,animationState,movement] of actors){buildStoryCharacter(group,role,x,z,yaw,animationState,movement);}
    const observer=buildStoryCharacter(group,'observer',towerX,towerZ,Math.PI,'aim');observer.position.y=8.35;
    for(const [x,z] of [[fuelX-4,fuelZ+9],[fuelX+5,fuelZ+12],[towerX-8,towerZ+5]]){
      const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:texGlow,color:fireMaterial.color,transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending}));
      glow.position.set(x,2,z); glow.scale.set(5,6,1); group.add(glow);
    }
  }
  function configure(next){configured=next||null;}
  function clearActive(){
    if(!active)return;
    if(typeof CharacterManager!=='undefined')CharacterManager.removeWithin(active.root);
    active.colliders.forEach(collider=>active.deps.removeCollider(collider));
    active.deps.removeRoot(active.root);
    if(active.replacesLegacy&&active.deps.setLegacyVisible)active.deps.setLegacyVisible(true);
    active=null;
  }
  function loadForMission(mission){
    clearActive();
    const sceneId=mission&&(mission.sceneId||(mission.def&&mission.def.sceneId));
    const layout=sceneId&&SceneLibrary.getScene(sceneId);
    if(!layout)return null;
    const deps=configured||defaultDependencies();
    const handle={id:layout.id,root:deps.createRoot(),colliders:[],deps,replacesLegacy:layout.id==='scene-01',addCollider(collider){this.colliders.push(collider);deps.addCollider(collider);}};
    if(handle.replacesLegacy&&deps.setLegacyVisible)deps.setLegacyVisible(false);
    deps.addRoot(handle.root); deps.build(layout,handle); active=handle; return handle;
  }
  root.SceneBuilder=Object.freeze({configure,loadForMission,clearActive,getActive:()=>active,computeRailLayout});
})(globalThis);
