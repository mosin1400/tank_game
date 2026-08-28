(function(global){
  'use strict';

  var YAW_LIMIT=145*Math.PI/180;
  var MIN_PITCH=-8*Math.PI/180;
  var MAX_PITCH=22*Math.PI/180;
  var PRECISION_RATE=1.3;
  var TRACK_RATE=2.4;
  var CAMERA_SMOOTHING=12;
  var active=null;

  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
  function finite(value,fallback){return typeof value==='number' && isFinite(value)?value:fallback;}
  function wrapAngle(value){
    while(value>Math.PI)value-=Math.PI*2;
    while(value<-Math.PI)value+=Math.PI*2;
    return value;
  }

  function create(options){
    options=options||{};
    if(typeof options.getPlayer!=='function')throw new Error('TankAiming.configure requires getPlayer');

    var THREE=options.THREE||null;
    var getPlayer=options.getPlayer;
    var getAimPoint=typeof options.getAimPoint==='function'?options.getAimPoint:function(){return null;};
    var yaw=0;
    var pitch=0;
    var precision=false;
    var cameraState=null;

    function player(){return getPlayer()||null;}
    function synchronize(){
      var tank=player();
      if(!tank)return;
      if(tank.turret && tank.turret.rotation)tank.turret.rotation.y=yaw;
      if(tank.gun && tank.gun.rotation)tank.gun.rotation.x=-pitch;
    }
    function setAngles(nextYaw,nextPitch){
      yaw=clamp(finite(nextYaw,yaw),-YAW_LIMIT,YAW_LIMIT);
      pitch=clamp(finite(nextPitch,pitch),MIN_PITCH,MAX_PITCH);
      synchronize();
      return {yaw:yaw,pitch:pitch};
    }
    function arrowAxis(input,positive,negative){return (input[positive]?1:0)-(input[negative]?1:0);}
    function driveAxes(input){
      var arrowThrottle=arrowAxis(input,'up','down');
      var arrowTurn=arrowAxis(input,'left','right');
      var throttle=finite(input.throttle,arrowThrottle);
      var turn=finite(input.turn,arrowTurn);
      if(precision){
        throttle=clamp(throttle-arrowThrottle,-1,1);
        turn=clamp(turn-arrowTurn,-1,1);
        if(typeof input.wasdThrottle==='number')throttle=clamp(input.wasdThrottle,-1,1)*0.35;
        if(typeof input.wasdTurn==='number')turn=clamp(input.wasdTurn,-1,1)*0.35;
      }
      return {throttle:throttle,turn:turn,arrowThrottle:arrowThrottle,arrowTurn:arrowTurn};
    }
    function trackAim(dt){
      var tank=player();
      var aim=getAimPoint();
      if(!tank || !aim)return;
      var position=tank.pos || (tank.root&&tank.root.position);
      if(!position)return;
      var hullYaw=finite(tank.yaw,tank.root&&tank.root.rotation?tank.root.rotation.y:0);
      var target=wrapAngle(Math.atan2(aim.x-position.x,aim.z-position.z)-hullYaw);
      var delta=wrapAngle(target-yaw);
      yaw=clamp(yaw+clamp(delta,-TRACK_RATE*dt,TRACK_RATE*dt),-YAW_LIMIT,YAW_LIMIT);
    }
    function vector(x,y,z){return new THREE.Vector3(x,y,z);}
    function barrelTarget(){
      var tank=player();
      if(!THREE || !tank || !tank.gun || typeof THREE.Vector3!=='function' || typeof THREE.Quaternion!=='function')return null;
      var gun=tank.gun;
      var position=vector(0,0,0);
      var quaternion=new THREE.Quaternion();
      if(typeof gun.getWorldPosition==='function')gun.getWorldPosition(position);
      else if(gun.position)position.copy(gun.position);
      else return null;
      if(typeof gun.getWorldQuaternion==='function')gun.getWorldQuaternion(quaternion);
      else if(gun.quaternion && typeof quaternion.copy==='function')quaternion.copy(gun.quaternion);
      else return null;
      var direction=vector(0,0,1);
      if(typeof direction.applyQuaternion==='function')direction.applyQuaternion(quaternion);
      if(typeof direction.normalize==='function')direction.normalize();
      var camera=position.clone().addScaledVector(direction,-0.65);
      camera.y+=0.38;
      return {position:camera,lookAt:position.clone().addScaledVector(direction,80)};
    }
    function updateCamera(dt){
      var target=barrelTarget();
      if(!target)return;
      var fov=precision?24:46;
      if(!cameraState){
        cameraState={position:target.position,lookAt:target.lookAt,fov:fov};
        return;
      }
      var alpha=1-Math.exp(-CAMERA_SMOOTHING*Math.max(0,finite(dt,0)));
      cameraState.position.lerp(target.position,alpha);
      cameraState.lookAt.lerp(target.lookAt,alpha);
      cameraState.fov+=(fov-cameraState.fov)*alpha;
    }
    function update(dt,input){
      dt=Math.max(0,finite(dt,0));
      input=input||{};
      var traverseDt=dt*clamp(finite(input.traverseScale,1),0,1);
      precision=!!input.shift;
      var axes=driveAxes(input);
      if(precision){
        yaw+=axes.arrowTurn*PRECISION_RATE*traverseDt;
        pitch+=axes.arrowThrottle*PRECISION_RATE*traverseDt;
      }else trackAim(traverseDt);
      setAngles(yaw,pitch);
      updateCamera(dt);
      return {precision:precision,yaw:yaw,pitch:pitch,throttle:axes.throttle,turn:axes.turn};
    }
    function cameraPose(){
      if(!cameraState)updateCamera(0);
      if(!cameraState)return null;
      return {
        position:cameraState.position.clone(),
        lookAt:cameraState.lookAt.clone(),
        fov:cameraState.fov,
        shakeScale:precision?0.2:1
      };
    }
    function reset(){
      precision=false;
      setAngles(yaw,0);
      updateCamera(0);
      if(cameraState)cameraState.fov=46;
      return {precision:precision,yaw:yaw,pitch:pitch};
    }

    var tank=player();
    if(tank && tank.turret && tank.turret.rotation)yaw=clamp(finite(tank.turret.rotation.y,0),-YAW_LIMIT,YAW_LIMIT);
    if(tank && tank.gun && tank.gun.rotation)pitch=clamp(-finite(tank.gun.rotation.x,0),MIN_PITCH,MAX_PITCH);
    synchronize();
    return {setAngles:setAngles,yaw:function(){return yaw;},pitch:function(){return pitch;},update:update,cameraPose:cameraPose,reset:reset};
  }
  function requireActive(){
    if(!active)throw new Error('TankAiming is not configured');
    return active;
  }
  global.TankAiming={
    configure:function(options){active=create(options);return active;},
    update:function(dt,input){return requireActive().update(dt,input);},
    cameraPose:function(){return requireActive().cameraPose();},
    reset:function(){return requireActive().reset();},
    setAngles:function(yaw,pitch){return requireActive().setAngles(yaw,pitch);},
    yaw:function(){return requireActive().yaw();},
    pitch:function(){return requireActive().pitch();}
  };
})(globalThis);
