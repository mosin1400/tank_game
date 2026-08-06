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
  function buildRailWagon(parent,handle,x,z,rotation=0){
    const wagon=new THREE.Group(); wagon.position.set(x,0,z); wagon.rotation.y=rotation;
    const wood=industrialMaterial(0,1,{roughness:.84}),steel=industrialMaterial(0,1,{metalness:.68,roughness:.42});
    mkBox(wagon,3.4,.45,11,steel,0,.78,0); mkBox(wagon,3.05,2.25,8.5,wood,0,2.02,0);
    for(const side of[-1,1])mkBox(wagon,.18,2.7,8.9,steel,side*1.62,2.25,0);
    for(const zWheel of[-3.6,3.6])for(const xWheel of[-1.55,1.55])mkCyl(wagon,.62,.62,.32,matDark,xWheel,.58,zWheel,0,Math.PI/2,0,12);
    mkBox(wagon,.3,.25,1.1,steel,0,.86,-5.7); mkBox(wagon,.3,.25,1.1,steel,0,.86,5.7);
    parent.add(wagon); handle.addCollider({type:'aabb',x,z,hw:5.7,hd:2.1,h:3.6}); return wagon;
  }
  function buildFuelDepotDetails(parent,center){
    const [x,,z]=center,drum=industrialMaterial(0,0,{metalness:.45,roughness:.5}),crate=industrialMaterial(0,1,{roughness:.85});
    for(const [dx,dz] of [[-14,9],[-12,12],[-9,10],[17,-3],[20,-6]]){
      const barrel=new THREE.Mesh(new THREE.CylinderGeometry(.48,.55,1.35,12),drum);barrel.position.set(x+dx,.68,z+dz);barrel.castShadow=barrel.receiveShadow=true;parent.add(barrel);
    }
    for(const [dx,dz] of [[11,5],[14,5],[12,7],[-17,-3]])mkBox(parent,1.15,1.05,1.15,crate,x+dx,.55,z+dz,0);
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
    addBox(78,.16,1.1,railMaterial,-78,.12,44,-.12); addBox(78,.16,1.1,railMaterial,-78,.12,48,-.12);
    for(let x=-114;x<=-42;x+=5)addBox(.35,.18,5,matTrunk,x,.1,46,-.12);
    const [fuelX,,fuelZ]=layout.landmarks.fuelYard;
    for(const offset of [[-10,4],[-3,-2],[6,3]]){
      const tank=new THREE.Mesh(new THREE.CylinderGeometry(3.3,3.3,7,20),industrialMaterial(0,0,{metalness:.5,roughness:.42}));
      tank.rotation.z=Math.PI/2; tank.position.set(fuelX+offset[0],3.2,fuelZ+offset[1]); tank.castShadow=tank.receiveShadow=true; group.add(tank);
    }
    addBox(13,5,9,industrialMaterial(0,0,{metalness:.28,roughness:.64}),fuelX+14,2.5,fuelZ-9,.1);
    addBox(15,.25,10,industrialMaterial(0,0,{metalness:.55,roughness:.42}),fuelX+14,5.2,fuelZ-9,.1);
    buildFuelDepotDetails(group,layout.landmarks.fuelYard);
    buildRailWagon(group,handle,-96,46,Math.PI/2);
    buildRailWagon(group,handle,-84,46,Math.PI/2);
    buildRailWagon(group,handle,-72,46,Math.PI/2);
    const [bridgeX,,bridgeZ]=layout.landmarks.canalBridge;
    addBox(56,.04,8,mat({color:0x253c40,roughness:1}),bridgeX,.01,bridgeZ+14,-.5);
    addBox(8,.4,14,matTrunk,bridgeX,.25,bridgeZ,0);
    const [towerX,,towerZ]=layout.landmarks.watchTower;
    for(const [dx,dz] of [[-2,-2],[2,-2],[-2,2],[2,2]])mkCyl(group,.18,.22,8,matTrunk,towerX+dx,4,towerZ+dz,0,0,0,6);
    addBox(3.4,.3,3.4,matDark,towerX,8,towerZ,0); addBox(4,.18,4,matRoof,towerX,8.4,towerZ,0);
    const [generatorX,,generatorZ]=layout.landmarks.generator;
    addBox(2.2,1.2,1.6,matGray,generatorX,0.6,generatorZ,.2);
    const [exitX,,exitZ]=layout.landmarks.exitGate;
    addBox(.4,3,.4,matTrunk,exitX-4,1.5,exitZ,0); addBox(.4,3,.4,matTrunk,exitX+4,1.5,exitZ,0); addBox(4,.22,.35,matTrunk,exitX,2.2,exitZ,0);
    for(const [x,z,r] of [[fuelX+7,fuelZ-5,7],[bridgeX,bridgeZ,5],[towerX,towerZ,5],[generatorX,generatorZ,2],[exitX,exitZ,4]])handle.addCollider({type:'circle',x,z,r});
    for(const [x,z] of [[fuelX-4,fuelZ+9],[fuelX+5,fuelZ+12],[towerX-8,towerZ+5]]){
      const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:texGlow,color:fireMaterial.color,transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending}));
      glow.position.set(x,2,z); glow.scale.set(5,6,1); group.add(glow);
    }
  }
  function configure(next){configured=next||null;}
  function clearActive(){
    if(!active)return;
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
  root.SceneBuilder=Object.freeze({configure,loadForMission,clearActive,getActive:()=>active});
})(globalThis);
