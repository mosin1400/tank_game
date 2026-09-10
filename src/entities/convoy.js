/* ================= کاروان محافظت‌شونده ================= */
(function(root){
  let active=[];
  const TRUCK_MODELS=['assets/models/vehicles/soviet-offroad.glb','assets/models/vehicles/soviet-offroad.glb','assets/models/vehicles/soviet-offroad.glb'];
  let truckModelCache=null;
  function preloadTruckModels(){
    if(truckModelCache)return truckModelCache;
    if(typeof GLTFLoader==='undefined')return Promise.reject(new Error('GLTFLoader is unavailable'));
    const loader=new GLTFLoader();
    truckModelCache=Promise.all(TRUCK_MODELS.map(path=>loader.loadAsync(path).then(asset=>asset.scene))).catch(error=>{truckModelCache=null;throw error;});
    return truckModelCache;
  }
  function attachVehicleModel(root,index,placeholder){
    preloadTruckModels().then(models=>{
      if(!root.parent||!models[index])return;
      const model=models[index].clone(true);model.name='convoy-jeep-model';model.rotation.y=0;model.updateMatrixWorld(true);
      const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),scale=4.45/Math.max(size.x,size.y,size.z,.01);model.scale.setScalar(scale);model.updateMatrixWorld(true);
      const aligned=new THREE.Box3().setFromObject(model);model.position.y-=aligned.min.y;
      model.traverse(object=>{if(!object.isMesh)return;object.castShadow=true;object.receiveShadow=true;});
      root.add(model);placeholder.visible=false;
    }).catch(error=>console.warn('Convoy vehicle model could not load',error));
  }
  function makeTruck(record,index){
    const g=new THREE.Group();
    const placeholder=new THREE.Group();placeholder.name='convoy-placeholder';g.add(placeholder);
    const body=mat({color:index===0?0x6f7d56:0x59684b,roughness:.75});
    mkBox(placeholder,1.8,1.05,3.8,body,0,.7,0); mkBox(placeholder,1.7,1.45,1.25,body,0,1.25,-1.18);
    for(const x of[-.92,.92])for(const z of[-1.25,1.25])mkCyl(placeholder,.42,.42,.26,matDark,x,.42,z,0,Math.PI/2,0,10);
    g.position.set(...record.start); scene.add(g);
    attachVehicleModel(g,index%TRUCK_MODELS.length,placeholder);
    return {id:record.id,root:g,stops:record.stops,stopIndex:0,hp:100,alive:true,reachedExit:false,radius:2.35,speed:5.2};
  }
  function create(path){dispose();active=path.map(makeTruck);return active;}
  function update(trucks,dt,act){
    for(const truck of trucks)if(truck.alive&&truck.stopIndex<=act){
      const target=truck.stops[truck.stopIndex]; if(!target)continue;
      const dx=target[0]-truck.root.position.x,dz=target[2]-truck.root.position.z,d=Math.hypot(dx,dz);
      if(d<.7){truck.stopIndex++;if(truck.stopIndex>=truck.stops.length)truck.reachedExit=true;continue;}
      truck.root.position.x+=dx/d*Math.min(d,truck.speed*dt);truck.root.position.z+=dz/d*Math.min(d,truck.speed*dt);truck.root.rotation.y=Math.atan2(dx,dz);
    }
  }
  function damage(truck,amount){if(!truck||!truck.alive)return;truck.hp-=amount;if(truck.hp<=0){truck.hp=0;truck.alive=false;truck.root.visible=false;}}
  function damageNear(pos,amount,radius=4){for(const truck of active)if(truck.alive&&Math.hypot(pos.x-truck.root.position.x,pos.z-truck.root.position.z)<radius)damage(truck,amount);}
  function dispose(){for(const truck of active)scene.remove(truck.root);active=[];}
  root.Convoy=Object.freeze({create,update,damage,damageNear,dispose,getActive:()=>active});
})(globalThis);
