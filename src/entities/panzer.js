const ETYPES={
  light:{hp:40,spd:[9,11],dmg:6,cd:[1.7,2.5],scale:0.82,stop:[22,30],score:80,name:'تانک سبک',tSpd:2.0},
  medium:{hp:75,spd:[5.5,7.5],dmg:9,cd:[2.6,4.2],scale:1,stop:[26,38],score:100,name:'تانک متوسط',tSpd:1.4},
  heavy:{hp:230,spd:[3.4,4.4],dmg:16,cd:[4.2,5.6],scale:1.16,stop:[30,42],score:200,name:'تانک سنگین',tSpd:0.9},
  boss:{hp:650,spd:[2.8,3.2],dmg:20,cd:[3.2,4.2],scale:1.38,stop:[32,40],score:1000,name:'ببر آهنی',tSpd:1.0},
};
/* ۴ متریال برای ۴ کمپین: خاکی → زیتونی → تیره → مشکی */
function buildPanzer(typeKey,variant){
  const heavy=(typeKey==='heavy'||typeKey==='boss');
  const light=(typeKey==='light');
  const v=variant||'pz4';
  const hm=(v==='pz1'?matPz1:(v==='pz2'?matPz2:(v==='pz3'?matPz3:matPz4)));
  const root=new THREE.Group();
  mkBox(root,2.5,0.55,4.4,hm,0,0.95,0);
  mkPlate(root,2.5,0.07,1.2,1.9,0.78,2.55,hm);
  mkBox(root,2.2,0.42,3.2,hm,0,1.32,-0.3);
  /* دامن‌های زرهی (Schürzen) روی Pz.IV و Panther */
  if(v==='pz4'||v==='panther')for(const s of[-1,1])mkBox(root,0.06,0.5,3.8,hm,s*1.38,1.1,0);
  const wheels=[];
  for(const s of[-1,1]){
    mkBox(root,0.07,0.85,4.7,matRust,s*1.52,0.5,0);
    mkBox(root,0.07,0.85,4.7,matRust,s*1.02,0.5,0);
    mkBox(root,0.57,0.09,4.7,matRust,s*1.27,0.93,0);
    mkBox(root,0.57,0.08,4.7,matRust,s*1.27,0.1,0);
    for(const z of[-1.6,-0.55,0.55,1.6])
      wheels.push(mkCyl(root,0.36,0.36,0.12,matDark,s*1.27,0.42,z,0,0,Math.PI/2,12));
    if(heavy)mkBox(root,0.08,0.5,3.4,hm,s*1.3,1.15,0);
  }
  const turret=new THREE.Group(); turret.position.set(0,1.56,-0.1); root.add(turret);
  if(heavy){
    /* Tiger: برجک مستطیلی بزرگ + دامن زرهی */
    mkBox(turret,1.85,0.62,2.15,hm,0,0.3,0);
    mkPlate(turret,1.85,0.07,0.6,0.9,0.15,1.4,hm);
    mkBox(turret,1.6,0.07,1.8,hm,0,0.64,-0.05);
  }else if(light){
    /* Pz.III: برجک کوچک گرد */
    mkBox(turret,1.25,0.48,1.6,hm,0,0.26,0);
    mkBox(turret,1.1,0.05,1.35,hm,0,0.53,-0.05);
  }else if(v==='panther'){
    /* Panther: برجک شیب‌دار با محافظ توپ بزرگ */
    mkBox(turret,1.45,0.5,1.95,hm,0,0.28,0);
    mkPlate(turret,1.45,0.06,0.55,0.78,0.14,1.25,hm);
    mkBox(turret,1.25,0.06,1.65,hm,0,0.58,-0.05);
  }else{
    /* Pz.IV: برجک کلاسیک */
    mkBox(turret,1.5,0.55,1.9,hm,0,0.28,0);
    mkPlate(turret,1.5,0.06,0.55,0.78,0.14,1.22,hm);
    mkBox(turret,1.32,0.06,1.62,hm,0,0.58,-0.05);
  }
  mkCyl(turret,0.22,0.24,0.18,hm,0.32,heavy?0.72:0.64,-0.45,0,0,0,12);
  const gun=new THREE.Group(); gun.position.set(0,0.32,0.82); turret.add(gun);
  mkBox(gun,0.55,0.42,0.3,hm,0,0,0.05);
  const gl=light?1.8:(v==='panther'?3.1:(heavy?3.4:2.6));
  const gr=heavy?0.07:(v==='panther'?0.062:0.05);
  mkCyl(gun,gr,gr+0.006,gl,hm,0,0,gl/2+0.05,Math.PI/2,0,0,12);
  mkCyl(gun,gr+0.028,gr+0.028,0.2,hm,0,0,gl+0.05,Math.PI/2,0,0,12);
  /* ترمز دهانه بزرگ روی Panther و Tiger */
  if(v==='panther'||heavy)mkCyl(gun,gr+0.04,gr+0.04,0.12,hm,0,0,gl+0.22,Math.PI/2,0,0,12);
  const gunTip=new THREE.Object3D(); gunTip.position.set(0,0,gl+0.2); gun.add(gunTip);
  const cfg=ETYPES[typeKey];
  root.scale.setScalar(cfg.scale);
  return {root,turret,gun,gunTip,wheels,type:typeKey,variant:v};
}
