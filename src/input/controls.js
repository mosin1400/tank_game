/* ================= ورودی و برخورد ================= */
const keys={};
let fireHeld=false,mgHeld=false,btnFireDown=false,btnMGDown=false;
const vecShim=(x,y,z)=>({x,y,z,isVector3:true,set(a,b,c){this.x=a;this.y=b;this.z=c;return this;},copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;},addScaledVector(v,s){this.x+=v.x*s;this.y+=v.y*s;this.z+=v.z*s;return this;}});
let aimPoint=vecShim(0,0,40);
const stickMove={id:null,bx:0,by:0,vx:0,vy:0,el:null,knob:null};
const stickAim={id:null,bx:0,by:0,vx:0,vy:0,el:null,knob:null};
function issueTacticalCommand(command){
  const live=enemies.filter(e=>!e.dead),target=live.length?live.reduce((best,e)=>Math.hypot(e.root.position.x-player.pos.x,e.root.position.z-player.pos.z)<Math.hypot(best.root.position.x-player.pos.x,best.root.position.z-player.pos.z)?e:best).root:aimPoint;
  return TacticalCommand.issue(command,target);
}
function initDom(){
  uiScore=document.getElementById('uiScore'); uiMission=document.getElementById('uiMission');
  uiFoes=document.getElementById('uiFoes'); uiKills=document.getElementById('uiKills');
  objEl=document.getElementById('obj');
  hpFill=document.getElementById('hpfill'); reloadFill=document.getElementById('reloadfill');
  msgEl=document.getElementById('msg'); dmgEl=document.getElementById('dmg');
  dmgdirEl=document.getElementById('dmgdir');
  feedEl=document.getElementById('feed'); radar=document.getElementById('radar');
  rctx=radar.getContext('2d');
  buffRapidEl=document.getElementById('buffRapid'); buffPowerEl=document.getElementById('buffPower');
  bossFillEl=document.getElementById('bossFill');
  hitEl=document.getElementById('hitmark'); bannerEl=document.getElementById('banner');
  weaponsEl=document.getElementById('weapons');
  stickMove.el=document.getElementById('stickMove'); stickMove.knob=document.getElementById('knobMove');
  stickAim.el=document.getElementById('stickAim'); stickAim.knob=document.getElementById('knobAim');

  addEventListener('keydown',e=>{
    if(typeof OpeningCinematic!=='undefined'&&OpeningCinematic.isActive()&&OpeningCinematic.requestSkip(e))return;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
    keys[e.code]=true;
    if(e.code==='Space')fireHeld=true;
    if(e.code==='KeyE')mgHeld=true;
    if(e.code==='KeyP'&&state==='play')togglePause();
    if(e.code==='KeyM')toggleMute();
    if(e.code==='Digit1')selectWeapon(0);
    if(e.code==='Digit2')selectWeapon(1);
    if(e.code==='Digit3')selectWeapon(2);
    if(e.code==='Digit4')selectWeapon(3);
    if(state==='play'&&['F1','F2','F3'].includes(e.code)){
      e.preventDefault();issueTacticalCommand(e.code==='F1'?'cover':e.code==='F2'?'attack':'retreat');
    }
  });
  addEventListener('keydown',e=>{
    if(e.ctrlKey&&e.shiftKey&&e.altKey&&(e.key==='r'||e.key==='R'||e.code==='KeyR')){
      e.preventDefault();
      location.reload();
    }
  });
  addEventListener('keyup',e=>{
    keys[e.code]=false;
    if(e.code==='Space')fireHeld=false;
    if(e.code==='KeyE')mgHeld=false;
  });
  const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
  addEventListener('mousemove',e=>{
    if(isCoarse)return;
    ndc.set(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);
    ray.setFromCamera(ndc,camera);
    const t=(1.2-ray.ray.origin.y)/ray.ray.direction.y;
    if(t>0)aimPoint.copy(ray.ray.origin).addScaledVector(ray.ray.direction,t);
  });
  renderer.domElement.addEventListener('mousedown',e=>{
    if(typeof OpeningCinematic!=='undefined'&&OpeningCinematic.isActive()){
      OpeningCinematic.requestSkip({type:'click',button:e.button,preventDefault:()=>e.preventDefault()});return;
    }
    if(state!=='play')return;
    if(e.button===0)fireHeld=true;
    if(e.button===2)mgHeld=true;
  });
  addEventListener('mouseup',e=>{
    if(e.button===0&&!btnFireDown)fireHeld=false;
    if(e.button===2&&!btnMGDown)mgHeld=false;
  });
  function stickUpdate(st,cx,cy){
    let dx=(cx-st.bx)/52,dy=(cy-st.by)/52;
    const l=Math.hypot(dx,dy); if(l>1){dx/=l;dy/=l;}
    st.vx=dx; st.vy=-dy;
    st.knob.style.transform=`translate(calc(-50% + ${dx*30}px), calc(-50% + ${dy*30}px))`;
  }
  function stickEnd(st){st.id=null;st.vx=st.vy=0;st.el.style.display='none';}
  addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse'||state!=='play'||paused)return;
    if(e.target.closest('#btnFire')||e.target.closest('#btnMG')||
       e.target.closest('.sqbtn')||e.target.closest('.wslot'))return;
    const st=e.clientX<innerWidth*0.5?stickMove:stickAim;
    if(st.id!==null)return;
    st.id=e.pointerId; st.bx=e.clientX; st.by=e.clientY;
    st.el.style.display='block';
    st.el.style.left=(e.clientX-58)+'px'; st.el.style.top=(e.clientY-58)+'px';
    st.knob.style.transform='translate(-50%,-50%)';
  });
  addEventListener('pointermove',e=>{
    for(const st of[stickMove,stickAim])if(st.id===e.pointerId)stickUpdate(st,e.clientX,e.clientY);
  });
  const endStick=e=>{for(const st of[stickMove,stickAim])if(st.id===e.pointerId)stickEnd(st);};
  addEventListener('pointerup',endStick); addEventListener('pointercancel',endStick);
  const btnFire=document.getElementById('btnFire'),btnMG=document.getElementById('btnMG');
  btnFire.addEventListener('pointerdown',e=>{e.stopPropagation();btnFireDown=true;fireHeld=true;});
  btnFire.addEventListener('pointerup',e=>{e.stopPropagation();btnFireDown=false;fireHeld=false;});
  btnMG.addEventListener('pointerdown',e=>{e.stopPropagation();btnMGDown=true;mgHeld=true;});
  btnMG.addEventListener('pointerup',e=>{e.stopPropagation();btnMGDown=false;mgHeld=false;});

  const profileUiAvailable=initProfileUI(),campaignMapAvailable=initCampaignMapUI();
  document.getElementById('btnBackList').addEventListener('click',showCampaignMap);
  document.getElementById('btnLaunch').addEventListener('click',()=>{initAudio();startEngine();startMission(briefIdx);});
  document.getElementById('btnNext').addEventListener('click',()=>startMission(Math.min(MISSIONS.length-1,curMission.idx+1)));
  document.getElementById('btnVicList').addEventListener('click',showCampaignMap);
  document.getElementById('btnRetry').addEventListener('click',()=>startMission(curMission.idx));
  document.getElementById('btnOvList').addEventListener('click',showCampaignMap);
  document.getElementById('btnResume').addEventListener('click',togglePause);
  document.getElementById('btnRestart').addEventListener('click',()=>{paused=false;document.body.classList.remove('paused');startMission(curMission.idx);});
  document.getElementById('btnQuit').addEventListener('click',()=>{paused=false;showCampaignMap();});
  document.getElementById('btnPause').addEventListener('click',togglePause);
  document.getElementById('btnMute').addEventListener('click',toggleMute);

  addEventListener('resize',()=>{
    camera.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
    if(composer)composer.setSize(innerWidth,innerHeight);
  });
  [['cmdCover','cover'],['cmdAttack','attack'],['cmdRetreat','retreat']].forEach(([id,command])=>{
    const button=document.getElementById(id);if(button)button.addEventListener('click',e=>{e.stopPropagation();if(state==='play')issueTacticalCommand(command);});
  });
  addEventListener('touchstart',e=>{
    if(typeof OpeningCinematic!=='undefined'&&OpeningCinematic.isActive())OpeningCinematic.requestSkip(e);
  },{passive:false});
  return profileUiAvailable&&campaignMapAvailable;
}
function pointHitsCollider(pos,o,padding=0){
  if(o.type==='circle')return Math.hypot(pos.x-o.x,pos.z-o.z)<=o.r+padding;
  const angle=o.type==='obb'?(o.ry||0):0,cos=Math.cos(angle),sin=Math.sin(angle);
  const dx=pos.x-o.x,dz=pos.z-o.z;
  const lx=cos*dx-sin*dz,lz=sin*dx+cos*dz;
  return Math.abs(lx)<=o.hw+padding&&Math.abs(lz)<=o.hd+padding;
}
function resolveCollisions(pos,r,isPlayer,selfE){
  const pushC=(cx,cz,cr)=>{
    const dx=pos.x-cx,dz=pos.z-cz,d=Math.hypot(dx,dz),m=r+cr;
    if(d<m&&d>0.001){pos.x=cx+dx/d*m;pos.z=cz+dz/d*m;}
  };
  const pushBox=(o,angle=0)=>{
    const cos=Math.cos(angle),sin=Math.sin(angle),dx=pos.x-o.x,dz=pos.z-o.z;
    let lx=cos*dx-sin*dz,lz=sin*dx+cos*dz;
    const cx=clamp(lx,-o.hw,o.hw),cz=clamp(lz,-o.hd,o.hd);
    const ox=lx-cx,oz=lz-cz,d=Math.hypot(ox,oz);
    if(d>=r)return;
    if(d>0.001){lx=cx+ox/d*r;lz=cz+oz/d*r;}
    else{
      const left=Math.abs(lx+o.hw),right=Math.abs(o.hw-lx);
      const back=Math.abs(lz+o.hd),front=Math.abs(o.hd-lz);
      const edge=Math.min(left,right,back,front);
      if(edge===left)lx=-o.hw-r;
      else if(edge===right)lx=o.hw+r;
      else if(edge===back)lz=-o.hd-r;
      else lz=o.hd+r;
    }
    pos.x=o.x+cos*lx+sin*lz; pos.z=o.z-sin*lx+cos*lz;
  };
  for(const o of staticObs){
    if(o.type==='circle')pushC(o.x,o.z,o.r);
    else pushBox(o,o.type==='obb'?(o.ry||0):0);
  }
  for(const w of wreckObs)pushC(w.x,w.z,w.r);
  for(const t of trees)if(t.alive)pushC(t.x,t.z,0.55);
  for(const e of enemies)if(e!==selfE&&!e.dead)pushC(e.root.position.x,e.root.position.z,e.radius+0.2);
  if(!isPlayer)pushC(player.pos.x,player.pos.z,2.3);
  pos.x=clamp(pos.x,-BOUND,BOUND); pos.z=clamp(pos.z,-BOUND,BOUND);
}

