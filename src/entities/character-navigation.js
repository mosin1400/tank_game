(function(global){
  'use strict';

  var entries=[];
  var dependencies={getObstacles:function(){return [];},getThreats:function(){return [];},getAllies:function(){return [];},getPlayer:function(){return null;}};
  var nextIndex=0;
  var TAU=Math.PI*2;

  function finite(value,fallback){return typeof value==='number'&&isFinite(value)?value:fallback;}
  function positionOf(value){return value&&(value.position||value.pos||value)||null;}
  function distance(a,b){var dx=a.x-b.x,dz=a.z-b.z;return Math.sqrt(dx*dx+dz*dz);}
  function wrap(angle){while(angle>Math.PI)angle-=TAU;while(angle<-Math.PI)angle+=TAU;return angle;}
  function contains(root,node){for(var current=node;current;current=current.parent)if(current===root)return true;return false;}
  function entryFor(actor){for(var i=0;i<entries.length;i++)if(entries[i].actor===actor)return entries[i];return null;}
  function listFrom(getter){try{var value=getter();return Array.isArray(value)?value:[];}catch(error){return [];}}

  function configure(next){
    next=next||{};
    dependencies={
      getObstacles:typeof next.getObstacles==='function'?next.getObstacles:function(){return [];},
      getThreats:typeof next.getThreats==='function'?next.getThreats:function(){return [];},
      getAllies:typeof next.getAllies==='function'?next.getAllies:function(){return [];},
      getPlayer:typeof next.getPlayer==='function'?next.getPlayer:function(){return null;}
    };
    return api;
  }

  function register(actor,options){
    if(!actor||!actor.position)throw new Error('CharacterNavigation.register requires an actor with a position');
    options=options||{};
    var entry=entryFor(actor);
    if(!entry){entry={actor:actor,index:nextIndex++,lastChoice:null};entries.push(entry);}
    entry.speed=Math.max(.1,finite(options.speed,2.8));
    entry.radius=Math.max(.1,finite(options.radius,.42));
    entry.behavior=options.behavior||entry.behavior||'hold';
    entry.followDistance=Math.max(2,finite(options.followDistance,entry.followDistance||5.5));
    entry.followSlot=Math.max(0,Math.floor(finite(options.followSlot,entry.index)));
    entry.delay=Math.max(0,finite(options.startDelay,0));
    entry.replan=0;
    actor.userData=actor.userData||{};
    actor.userData.navigation=entry;
    return actor;
  }

  function circleData(obstacle){
    var center=positionOf(obstacle.center||obstacle.position||obstacle);
    var radius=finite(obstacle.radius,finite(obstacle.r,NaN));
    return center&&isFinite(radius)?{center:center,radius:radius}:null;
  }
  function aabbData(obstacle){
    var min=obstacle.min,max=obstacle.max;
    var minX=finite(obstacle.minX,min&&finite(min.x,NaN));
    var maxX=finite(obstacle.maxX,max&&finite(max.x,NaN));
    var minZ=finite(obstacle.minZ,min&&finite(min.z,NaN));
    var maxZ=finite(obstacle.maxZ,max&&finite(max.z,NaN));
    return [minX,maxX,minZ,maxZ].every(isFinite)?{minX:minX,maxX:maxX,minZ:minZ,maxZ:maxZ}:null;
  }
  function obbData(obstacle){
    var center=positionOf(obstacle.center||obstacle.position),half=obstacle.halfSize||obstacle.halfExtents;
    if(!center||!half)return null;
    var hx=finite(half.x,finite(obstacle.halfWidth,NaN));
    var hz=finite(half.z,finite(obstacle.halfDepth,NaN));
    var yaw=finite(obstacle.yaw,obstacle.rotation&&finite(obstacle.rotation.y,0));
    return isFinite(hx)&&isFinite(hz)?{center:center,hx:hx,hz:hz,yaw:yaw}:null;
  }
  function pointBlocked(point,obstacle,padding){
    if(!obstacle)return false;
    var kind=String(obstacle.kind||obstacle.type||'').toLowerCase();
    var obb=(kind==='obb'||obstacle.halfSize||obstacle.halfExtents)&&obbData(obstacle);
    if(obb){
      var dx=point.x-obb.center.x,dz=point.z-obb.center.z,c=Math.cos(obb.yaw),s=Math.sin(obb.yaw);
      var localX=dx*c+dz*s,localZ=-dx*s+dz*c;
      return Math.abs(localX)<=obb.hx+padding&&Math.abs(localZ)<=obb.hz+padding;
    }
    var aabb=(kind==='aabb'||obstacle.min||isFinite(obstacle.minX))&&aabbData(obstacle);
    if(aabb)return point.x>=aabb.minX-padding&&point.x<=aabb.maxX+padding&&point.z>=aabb.minZ-padding&&point.z<=aabb.maxZ+padding;
    var circle=circleData(obstacle);
    return !!circle&&distance(point,circle.center)<=circle.radius+padding;
  }
  function segmentBlocked(start,end,radius){
    var obstacles=listFrom(dependencies.getObstacles);
    for(var i=0;i<obstacles.length;i++)for(var sample=1;sample<=8;sample++){
      var t=sample/8,point={x:start.x+(end.x-start.x)*t,z:start.z+(end.z-start.z)*t};
      if(pointBlocked(point,obstacles[i],radius))return true;
    }
    return false;
  }
  function lineBlocked(start,end){
    var obstacles=listFrom(dependencies.getObstacles);
    for(var i=0;i<obstacles.length;i++)for(var sample=1;sample<10;sample++){
      var t=sample/10;
      if(pointBlocked({x:start.x+(end.x-start.x)*t,z:start.z+(end.z-start.z)*t},obstacles[i],0))return true;
    }
    return false;
  }

  function threatPositions(entry){
    var threats=listFrom(dependencies.getThreats).map(positionOf).filter(Boolean);
    var source=positionOf(entry.source),target=positionOf(entry.target);
    if(source)threats.push(source);
    if(entry.command==='retreat'&&target)threats.push(target);
    return threats;
  }
  function separationPoints(actor){
    var seen=[],allies=listFrom(dependencies.getAllies);
    entries.forEach(function(entry){if(entry.actor!==actor&&allies.indexOf(entry.actor)===-1)allies.push(entry.actor);});
    allies.forEach(function(ally){
      if(!ally||ally===actor)return;
      var entry=entryFor(ally),point=entry&&entry.lastChoice||positionOf(ally);
      if(point)seen.push(point);
    });
    return seen;
  }

  function followTarget(entry){
    var tank;
    try{tank=dependencies.getPlayer();}catch(error){tank=null;}
    var center=positionOf(tank);
    if(!center)return null;
    var slots=[[-1,-1],[1,-1],[-1.45,-.3],[1.45,-.3],[0,-1.55]];
    var slot=slots[entry.followSlot%slots.length],yaw=finite(tank.yaw,tank.root&&tank.root.rotation?finite(tank.root.rotation.y,0):0);
    var right=slot[0]*entry.followDistance,back=slot[1]*entry.followDistance;
    return {x:center.x+Math.cos(yaw)*right+Math.sin(yaw)*back,z:center.z-Math.sin(yaw)*right+Math.cos(yaw)*back};
  }

  function chooseStep(actor,behavior,dt){
    var entry=entryFor(actor)||register(actor,{behavior:behavior});
    behavior=behavior||entry.behavior||'hold';
    if(behavior==='hold')return null;
    var start=actor.position,horizon=Math.max(.8,Math.min(1.2,finite(dt,.8)));
    var stride=entry.speed*horizon,threats=threatPositions(entry),allies=separationPoints(actor);
    var formation=behavior==='follow-player'?followTarget(entry):null;
    if(behavior==='follow-player'&&!formation)return null;
    if(formation&&distance(start,formation)<=1.15){entry.lastChoice=null;return null;}
    var currentYaw=actor.rotation?finite(actor.rotation.y,0):0;
    var best=null;
    for(var i=0;i<16;i++){
      var heading=-Math.PI+i*TAU/16;
      var candidate={x:start.x+Math.sin(heading)*stride,z:start.z+Math.cos(heading)*stride};
      if(segmentBlocked(start,candidate,entry.radius))continue;
      var score=-Math.abs(wrap(heading-currentYaw))*.8;
      var valid=true;
      for(var t=0;t<threats.length;t++){
        var before=distance(start,threats[t]),after=distance(candidate,threats[t]);
        if(after<before-1e-6){valid=false;break;}
        var delta=after-before;
        score+=delta*8;
        var length=Math.max(1e-6,before),toward=((threats[t].x-start.x)*Math.sin(heading)+(threats[t].z-start.z)*Math.cos(heading))/length;
        if(toward>0)score-=toward*20;
        if(lineBlocked(candidate,threats[t]))score+=5;
      }
      if(!valid)continue;
      for(var a=0;a<allies.length;a++){
        var gap=distance(candidate,allies[a]);
        if(gap<1.2){valid=false;break;}
        if(gap<2.4)score-=(2.4-gap)*12;
      }
      if(!valid)continue;
      if(formation)score-=distance(candidate,formation)*6;
      score+=Math.cos((i-entry.index*5)*TAU/16)*.001;
      if(!best||score>best.score)best={x:candidate.x,z:candidate.z,yaw:heading,state:behavior,score:score};
    }
    if(!best)return null;
    entry.lastChoice={x:best.x,z:best.z};
    return {x:best.x,z:best.z,yaw:best.yaw,state:best.state};
  }

  function requestCover(actor,source,urgency){
    var entry=entryFor(actor)||register(actor,{behavior:'run-to-cover'});
    entry.behavior='run-to-cover';entry.source=source||null;entry.urgency=Math.max(0,finite(urgency,1));entry.replan=0;
    return actor;
  }
  function setCommand(actor,command,target){
    var entry=entryFor(actor)||register(actor,{});
    entry.command=command||null;entry.target=target||null;
    entry.behavior=command==='cover'?'run-to-cover':command==='retreat'?'run-to-cover':command==='attack'?'attack':command==='rally'?'follow-player':entry.behavior;
    entry.replan=0;return actor;
  }
  function update(dt){
    dt=Math.max(0,finite(dt,0));
    entries.slice().forEach(function(entry){
      var actor=entry.actor;
      if(entry.delay>0){entry.delay=Math.max(0,entry.delay-dt);return;}
      if(entry.behavior==='hold')return;
      entry.replan-=dt;
      var target=entry.lastChoice;
      if(!target||entry.replan<=0||segmentBlocked(actor.position,target,entry.radius)){
        var choice=chooseStep(actor,entry.behavior,dt);
        if(!choice){
          var idle=actor.userData&&actor.userData.animation;
          if(entry.behavior==='follow-player'&&idle&&typeof idle.setState==='function')idle.setState('idle',.18);
          return;
        }
        target=choice;entry.replan=(entry.behavior==='follow-player'?.12:.35)+(entry.index%7)*.05;
      }
      var dx=target.x-actor.position.x,dz=target.z-actor.position.z,length=Math.sqrt(dx*dx+dz*dz);
      if(length<1e-4){entry.lastChoice=null;return;}
      var step=Math.min(length,entry.speed*dt),desired=Math.atan2(dx,dz);
      if(actor.rotation){var delta=wrap(desired-finite(actor.rotation.y,0)),turn=Math.min(Math.abs(delta),4.5*dt);actor.rotation.y=wrap(actor.rotation.y+(delta<0?-turn:turn));}
      actor.position.x+=dx/length*step;actor.position.z+=dz/length*step;
      var animation=actor.userData&&actor.userData.animation;
      if(animation&&typeof animation.setState==='function')animation.setState(entry.behavior==='attack'?'run':'run',.18);
    });
  }
  function removeWithin(root){
    var removed=0;
    entries=entries.filter(function(entry){var inside=contains(root,entry.actor);if(inside)removed++;return !inside;});
    return removed;
  }
  function reset(){var count=entries.length;entries=[];nextIndex=0;return count;}

  var api={configure:configure,register:register,chooseStep:chooseStep,requestCover:requestCover,
    setCommand:setCommand,update:update,removeWithin:removeWithin,reset:reset};
  global.CharacterNavigation=Object.freeze(api);
})(globalThis);
