(function(global){
  'use strict';

  var actors=[];
  var dependencies={};
  var timers=[];

  function finite(value,fallback){return typeof value==='number' && isFinite(value)?value:fallback;}
  function timeout(fn,delay,actor){
    var schedule=dependencies.setTimeout||global.setTimeout;
    if(typeof schedule!=='function')return null;
    var record={id:null,actor:actor,active:true};
    record.id=schedule(function(){
      if(!record.active)return;
      record.active=false;
      timers=timers.filter(function(timer){return timer!==record;});
      fn();
    },delay);
    if(record.active)timers.push(record);
    return record.id;
  }
  function cancelTimers(predicate){
    var cancel=dependencies.clearTimeout||global.clearTimeout;
    timers=timers.filter(function(timer){
      if(predicate && !predicate(timer))return true;
      timer.active=false;
      if(typeof cancel==='function')cancel(timer.id);
      return false;
    });
  }
  function contains(root,node){
    for(var current=node;current;current=current.parent)if(current===root)return true;
    return false;
  }
  function entryFor(actor){
    for(var i=0;i<actors.length;i++)if(actors[i].actor===actor)return actors[i];
    return null;
  }
  function configure(next){dependencies=next||{};return api;}
  function register(actor,options){
    if(!actor || !actor.position)throw new Error('CharacterCombat.register requires an actor with a position');
    options=options||{};
    var entry=entryFor(actor);
    if(!entry){entry={actor:actor};actors.push(entry);}
    entry.faction=options.faction||'allied';
    entry.radius=Math.max(.01,finite(options.radius,.42));
    entry.height=Math.max(.01,finite(options.height,1.8));
    return actor;
  }
  function segmentHit(start,end,entry){
    var actor=entry.actor,dx=end.x-start.x,dz=end.z-start.z;
    var ax=start.x-actor.position.x,az=start.z-actor.position.z;
    var a=dx*dx+dz*dz;
    if(a<=1e-12)return null;
    var b=2*(ax*dx+az*dz),c=ax*ax+az*az-entry.radius*entry.radius;
    var discriminant=b*b-4*a*c;
    if(discriminant<0)return null;
    var root=Math.sqrt(discriminant),t=(-b-root)/(2*a);
    if(t<0 || t>1)t=(-b+root)/(2*a);
    if(t<0 || t>1)return null;
    var y=start.y+(end.y-start.y)*t;
    if(y<actor.position.y || y>actor.position.y+entry.height)return null;
    var point={x:start.x+(end.x-start.x)*t,y:y,z:start.z+(end.z-start.z)*t};
    var distance=Math.sqrt(dx*dx+(end.y-start.y)*(end.y-start.y)+dz*dz)*t;
    return {kind:'character',actor:actor,target:actor,point:point,distance:distance,faction:entry.faction};
  }
  function traceSegment(start,end){
    if(!start || !end)return null;
    var closest=null;
    actors.forEach(function(entry){
      var hit=segmentHit(start,end,entry);
      if(hit && (!closest || hit.distance<closest.distance))closest=hit;
    });
    return closest;
  }
  function addSuppression(actor,amount){
    actor.userData=actor.userData||{};
    actor.userData.suppression=Math.max(0,finite(actor.userData.suppression,0)+Math.max(0,finite(amount,0)));
    return actor.userData.suppression;
  }
  function requestCover(actor,impact,amount){
    var point=impact&&impact.point||null;
    if(typeof dependencies.requestCover==='function')dependencies.requestCover(actor,point,amount);
    else if(actor.userData && typeof actor.userData.requestCover==='function')actor.userData.requestCover(point,amount);
    else if(global.CharacterNavigation && typeof global.CharacterNavigation.requestCover==='function'){
      global.CharacterNavigation.requestCover(actor,point,amount);
    }
  }
  function react(entry,impact,amount){
    var actor=entry.actor;
    cancelTimers(function(timer){return timer.actor===actor;});
    entry.reactionSerial=(entry.reactionSerial||0)+1;
    var reactionSerial=entry.reactionSerial;
    var animation=actor.userData&&actor.userData.animation;
    if(animation && typeof animation.setState==='function')animation.setState('hit-react',.05);
    addSuppression(actor,amount);requestCover(actor,impact,amount);
    timeout(function(){
      if(entryFor(actor)===entry && entry.reactionSerial===reactionSerial && actor.userData &&
        actor.userData.animation===animation && animation && typeof animation.setState==='function'){
        animation.setState('suppressed',.12);
      }
    },550,actor);
  }
  function applyHit(actor,impact){
    var entry=entryFor(actor),amount=impact&&impact.suppression;
    amount=finite(amount,(impact&&impact.kind==='shell')?8:2);
    if(!entry)throw new Error('CharacterCombat.applyHit requires a registered actor');
    actor.userData=actor.userData||{};
    if(entry.faction==='allied' || entry.faction==='ally' || entry.faction==='friendly'){
      react(entry,impact,amount);
      return {result:'suppressed',remaining:actor.userData.health};
    }
    var health=finite(actor.userData.health,100);
    health=Math.max(0,health-Math.max(0,finite(impact&&impact.damage,0)));
    actor.userData.health=health;
    addSuppression(actor,amount);
    return {result:health===0?'killed':'hit',remaining:health};
  }
  function suppressNear(point,radius,amount){
    if(!point)return 0;
    radius=Math.max(0,finite(radius,0));var affected=0;
    actors.forEach(function(entry){
      var position=entry.actor.position,dx=position.x-point.x,dz=position.z-point.z;
      if(dx*dx+dz*dz<=radius*radius){addSuppression(entry.actor,amount);affected++;}
    });
    return affected;
  }
  function removeWithin(root){
    var removed=0,departing=[];
    actors=actors.filter(function(entry){
      var inside=contains(root,entry.actor);
      if(inside){removed++;departing.push(entry.actor);}
      return !inside;
    });
    cancelTimers(function(timer){return departing.indexOf(timer.actor)!==-1;});
    return removed;
  }
  function reset(){var count=actors.length;actors=[];cancelTimers();return count;}

  var api={configure:configure,register:register,traceSegment:traceSegment,applyHit:applyHit,
    suppressNear:suppressNear,removeWithin:removeWithin,reset:reset};
  global.CharacterCombat=Object.freeze(api);
})(globalThis);
