/* ================= سازندهٔ لایه‌های صحنه ================= */
(function(root){
  let active=null,configured=null;
  function defaultDependencies(){
    return {
      createRoot:()=>new THREE.Group(),
      addRoot:sceneRoot=>scene.add(sceneRoot),
      removeRoot:sceneRoot=>scene.remove(sceneRoot),
      addCollider:collider=>staticObs.push(collider),
      removeCollider:collider=>{const index=staticObs.indexOf(collider);if(index>=0)staticObs.splice(index,1);},
      build:(layout,handle)=>buildOpeningScene(layout,handle)
    };
  }
  function buildOpeningScene(layout,handle){
    if(layout.id!=='scene-01')return;
    const group=handle.root;
    const addBox=(w,h,d,material,x,y,z,ry=0)=>mkBox(group,w,h,d,material,x,y,z,0,ry,0);
    const roadMaterial=mat({color:0x49443a,roughness:1});
    const mudMaterial=mat({color:0x3d4032,roughness:1});
    const railMaterial=mat({color:0x36342f,metalness:.7,roughness:.35});
    const fireMaterial=mat({color:0x6a2814,roughness:.8});
    addBox(138,.08,7,roadMaterial,8,.04,38,-.54);
    addBox(70,.08,6,mudMaterial,73,.05,-14,-.7);
    addBox(78,.16,1.1,railMaterial,-78,.12,44,-.12); addBox(78,.16,1.1,railMaterial,-78,.12,48,-.12);
    for(let x=-114;x<=-42;x+=5)addBox(.35,.18,5,matTrunk,x,.1,46,-.12);
    const [fuelX,,fuelZ]=layout.landmarks.fuelYard;
    for(const offset of [[-10,4],[-3,-2],[6,3]]){
      const tank=new THREE.Mesh(new THREE.CylinderGeometry(3.3,3.3,7,16),mat({color:0x5d6c53,metalness:.45,roughness:.5}));
      tank.rotation.z=Math.PI/2; tank.position.set(fuelX+offset[0],3.2,fuelZ+offset[1]); tank.castShadow=tank.receiveShadow=true; group.add(tank);
    }
    addBox(13,5,9,mat({map:texWall}),fuelX+14,2.5,fuelZ-9,.1);
    addBox(15,.25,10,matRoof,fuelX+14,5.2,fuelZ-9,.1);
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
    active.deps.removeRoot(active.root); active=null;
  }
  function loadForMission(mission){
    clearActive();
    const layout=mission&&SceneLibrary.getScene(mission.sceneId);
    if(!layout)return null;
    const deps=configured||defaultDependencies();
    const handle={id:layout.id,root:deps.createRoot(),colliders:[],deps,addCollider(collider){this.colliders.push(collider);deps.addCollider(collider);}};
    deps.addRoot(handle.root); deps.build(layout,handle); active=handle; return handle;
  }
  root.SceneBuilder=Object.freeze({configure,loadForMission,clearActive,getActive:()=>active});
})(globalThis);
