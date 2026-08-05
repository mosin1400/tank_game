/* ================= تانک‌ها ================= */
function buildT34(variant){
  const v=variant||'t34-85';
  /* رنگ‌های متفاوت برای هر مدل */
  const hullMat=(v==='t34-76'?mat({map:texOlive,color:0x6a7345,roughness:0.82,metalness:0.12})
    :(v==='is2'?mat({map:texOlive,color:0x4a5236,roughness:0.85,metalness:0.14})
    :(v==='su85'?mat({map:texOlive,color:0x555d3e,roughness:0.84,metalness:0.13}):matOlive)));
  const root=new THREE.Group();
  mkBox(root,2.46,0.55,5.2,matRust,0,0.955,0);
  mkBox(root,2.4,0.45,4.4,hullMat,0,1.455,-0.2);
  mkPlate(root,2.4,0.08,1.68,2.05,1.16,2.95,hullMat);
  mkPlate(root,2.4,0.08,1.16,2.95,0.68,2.55,hullMat);
  mkPlate(root,2.4,0.08,1.68,-2.45,1.05,-2.95,hullMat);
  mkPlate(root,2.4,0.08,1.05,-2.95,0.68,-2.55,matRust);
  mkBox(root,2.4,0.06,1.55,hullMat,0,1.71,-1.68);
  for(const s of[-1,1]){
    mkBox(root,0.6,0.045,6.0,hullMat,s*1.32,1.42,0);
    mkPlate(root,0.6,0.04,1.42,3.0,1.12,3.32,hullMat,s*1.32);
    mkPlate(root,0.6,0.04,1.42,-3.0,1.14,-3.32,hullMat,s*1.32);
  }
  mkBox(root,0.52,0.035,0.85,matDark,-0.55,1.755,-1.7);
  mkBox(root,0.52,0.035,0.85,matDark,0.55,1.755,-1.7);
  mkCyl(root,0.24,0.24,0.045,hullMat,0,1.765,-2.1,0,0,0,22);
  const h=new THREE.Group(); h.position.set(0.55,1.43,2.57); h.rotation.x=0.524; root.add(h);
  mkCyl(h,0.3,0.3,0.05,hullMat,0,0.02,0,0,0,0,24);
  mkBox(h,0.16,0.06,0.12,matDark,0,0.07,0.16);
  { const lamp=new THREE.Group(); const n=new THREE.Vector3(0,-0.77,0.64).normalize();
    lamp.position.set(0.72,0.906,2.8); lamp.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),n);
    root.add(lamp);
    mkCyl(lamp,0.088,0.094,0.08,hullMat,0,0,0.01,Math.PI/2,0,0,14); }
  for(const s of[-1,1]){
    mkCyl(root,0.26,0.26,1.0,hullMat,s*0.8,1.99,-2.15,Math.PI/2,0,0,20);
    mkBox(root,0.1,0.34,0.12,matDark,s*0.8,1.83,-1.85);
    mkBox(root,0.1,0.34,0.12,matDark,s*0.8,1.83,-2.45);
  }
  const turret=new THREE.Group(); turret.position.set(0,1.64,0.1); root.add(turret);
  if(v==='su85'){
    /* SU-85: بدون برجک، توپ روی بدنه */
    mkBox(turret,1.4,0.45,2.2,hullMat,0,0.22,0.4);
    mkPlate(turret,1.4,0.06,0.45,0.75,0.08,1.4,hullMat);
  }else{
    const prof=v==='is2'
      ? [[0.05,0],[0.65,0],[0.95,0.08],[1.0,0.22],[0.95,0.4],[0.7,0.58],[0.4,0.7],[0,0.78]].map(p=>new THREE.Vector2(p[0],p[1]))
      : (v==='t34-76'
        ? [[0.05,0],[0.45,0],[0.7,0.06],[0.78,0.18],[0.74,0.34],[0.6,0.48],[0.4,0.58],[0.2,0.64],[0,0.68]].map(p=>new THREE.Vector2(p[0],p[1]))
        : [[0.05,0],[0.55,0],[0.86,0.06],[0.95,0.18],[0.92,0.34],[0.8,0.5],[0.6,0.62],[0.35,0.7],[0,0.73]].map(p=>new THREE.Vector2(p[0],p[1])));
    const body=new THREE.Mesh(new THREE.LatheGeometry(prof,40),matCast);
    body.scale.set(1,1,v==='is2'?1.25:1.18); body.castShadow=body.receiveShadow=true; turret.add(body);
    const bustle=mkSph(turret,1,matCast,0,0.38,-0.95,18,10); bustle.scale.set(0.62,0.34,0.45);
    mkBox(turret,0.86,0.62,0.44,matCast,0,0.38,1.26);
    mkCyl(turret,0.32,0.34,0.86,matCast,0,0.38,1.3,0,0,Math.PI/2,16);
  }
  const gun=new THREE.Group(); gun.position.set(0,0.38,1.35); turret.add(gun);
  /* طول و کالیبر توپ بر اساس مدل */
  const gunLen=v==='t34-76'?2.1:(v==='is2'?3.4:(v==='su85'?3.2:2.95));
  const gunR=v==='is2'?0.082:(v==='su85'?0.07:(v==='t34-76'?0.048:0.06));
  mkCyl(gun,gunR*1.4,gunR*1.5,0.75,hullMat,0,0,0.42,Math.PI/2,0,0,14);
  mkCyl(gun,gunR*0.8,gunR,gunLen,hullMat,0,0,0.75+gunLen/2,Math.PI/2,0,0,14);
  mkCyl(gun,gunR*1.1,gunR*1.1,0.13,hullMat,0,0,0.75+gunLen,Math.PI/2,0,0,14);
  const gunTip=new THREE.Object3D(); gunTip.position.set(0,0,0.75+gunLen+0.1); gun.add(gunTip);
  const mgTip=new THREE.Object3D(); mgTip.position.set(0.24,0,1.05); gun.add(mgTip);
  mkCyl(turret,0.02,0.02,0.6,matDark,0.24,0.38,1.72,Math.PI/2,0,0,8);
  if(v!=='su85'){
    const cup=new THREE.Group(); cup.position.set(-0.45,0,-0.35); turret.add(cup);
    mkCyl(cup,0.26,0.27,0.24,matCast,0,0.78,0,0,0,0,20);
    const dome=mkSph(cup,0.255,matCast,0,0.9,0,14,8); dome.scale.set(1,0.5,1);
    mkCyl(turret,0.3,0.3,0.07,matCast,0.5,0.68,-0.3,0,0,0,20);
    mkCyl(turret,0.27,0.27,0.05,hullMat,0.5,0.735,-0.3,0,0,0,20);
  }
  mkCyl(turret,0.005,0.005,0.95,matDark,0.66,1.02,-0.79,-0.18,0,-0.22,6);
  const wheelInfo=buildRunningGear(root);
  return {root,turret,gun,gunTip,mgTip,wheelInfo,variant:v};
}
function buildRunningGear(root){
  const axisX=g=>{g.rotateZ(Math.PI/2);return g;};
  const wheelPos=[];
  for(const s of[-1,1])for(const z of[-2.3,-1.15,0,1.15,2.3,3.05])
    wheelPos.push(new THREE.Vector3(s*1.28,0.42,z));
  const info={wheelPos,steel:null,rubber:null,ready:false};
  const steelGeo=mergeGeometries([
    axisX(new THREE.CylinderGeometry(0.42,0.42,0.055,20)).translate(0.062,0,0),
    axisX(new THREE.CylinderGeometry(0.42,0.42,0.055,20)).translate(-0.062,0,0),
    axisX(new THREE.CylinderGeometry(0.135,0.135,0.17,12)),
    axisX(new THREE.CylinderGeometry(0.05,0.125,0.06,10)).translate(0.115,0,0),
  ]);
  const rubGeo=axisX(new THREE.CylinderGeometry(0.365,0.365,0.1,20));
  const st=new THREE.InstancedMesh(steelGeo,matOlive,wheelPos.length);
  const rb=new THREE.InstancedMesh(rubGeo,matDark,wheelPos.length);
  const dm=new THREE.Object3D();
  wheelPos.forEach((p,i)=>{dm.position.copy(p);dm.rotation.set(0,0,0);dm.updateMatrix();
    st.setMatrixAt(i,dm.matrix); rb.setMatrixAt(i,dm.matrix);});
  st.castShadow=rb.castShadow=true; root.add(st,rb);
  info.steel=st; info.rubber=rb;
  const pts=[[3.52,0.42],[3.38,0.75],[3.05,0.9],[2.2,0.91],[1.2,0.895],[0,0.89],
    [-1.2,0.895],[-2.2,0.91],[-3.05,0.9],[-3.38,0.75],[-3.52,0.42],[-3.3,0.1],
    [-2.2,0.055],[-1.1,0.045],[0,0.04],[1.1,0.045],[2.2,0.055],[3.3,0.1]]
    .map(p=>new THREE.Vector3(0,p[1],p[0]));
  const curve=new THREE.CatmullRomCurve3(pts,true,'catmullrom',0.5);
  const per=curve.getLength(),N=Math.round(per/0.175),L=per/N;
  const linkGeo=mergeGeometries([
    new THREE.BoxGeometry(0.46,0.055,L*1.04),
    new THREE.BoxGeometry(0.46,0.05,0.04).translate(0,-0.05,L*0.25),
    new THREE.BoxGeometry(0.06,0.11,0.085).translate(0,0.08,0),
    new THREE.BoxGeometry(0.05,0.08,L*0.9).translate(0.255,-0.008,0),
    new THREE.BoxGeometry(0.05,0.08,L*0.9).translate(-0.255,-0.008,0),
  ]);
  const XB=new THREE.Vector3(1,0,0);
  for(const s of[-1,1]){
    const lk=new THREE.InstancedMesh(linkGeo,matRust,N);
    const tint=new THREE.Color();
    for(let i=0;i<N;i++){
      const u=i/N,p=curve.getPointAt(u),tg=curve.getTangentAt(u).normalize();
      const YB=new THREE.Vector3().crossVectors(tg,XB);
      dm.position.set(s*1.28,p.y,p.z);
      dm.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(XB,YB,tg));
      dm.updateMatrix(); lk.setMatrixAt(i,dm.matrix);
      tint.setHSL(0.07+Math.random()*0.04,0.3,0.78+Math.random()*0.27);
      lk.setColorAt(i,tint);
    }
    if(lk.instanceColor)lk.instanceColor.needsUpdate=true;
    lk.castShadow=lk.receiveShadow=true; root.add(lk);
  }
  info.ready=true;
  return info;
}
