(function(global){
  'use strict';

  var smoke=[];
  var dependencies={};

  function finite(value,fallback){return typeof value==='number'&&isFinite(value)?value:fallback;}
  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
  function copyPoint(point){return {x:finite(point&&point.x,0),y:finite(point&&point.y,0),z:finite(point&&point.z,0)};}
  function configure(next){dependencies=next||{};return api;}

  function registerSmoke(options){
    options=options||{};
    var volume={
      position:copyPoint(options.position),
      radius:Math.max(.01,finite(options.radius,1)),
      density:clamp(finite(options.density,1),0,1),
      life:Math.max(0,finite(options.life,1))
    };
    smoke.push(volume);
    return volume;
  }

  function linePenetration(a,b,volume){
    var dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z;
    var lengthSquared=dx*dx+dy*dy+dz*dz;
    if(lengthSquared<=1e-12)return 0;
    var ox=a.x-volume.position.x,oy=a.y-volume.position.y,oz=a.z-volume.position.z;
    var projection=-(ox*dx+oy*dy+oz*dz)/lengthSquared;
    projection=clamp(projection,0,1);
    var cx=ox+dx*projection,cy=oy+dy*projection,cz=oz+dz*projection;
    var distanceSquared=cx*cx+cy*cy+cz*cz;
    var radiusSquared=volume.radius*volume.radius;
    if(distanceSquared>=radiusSquared)return 0;
    return Math.sqrt(1-distanceSquared/radiusSquared);
  }

  function visibilityBetween(a,b){
    if(!a||!b)return 1;
    var visibility=1;
    for(var i=0;i<smoke.length;i++){
      var penetration=linePenetration(a,b,smoke[i]);
      if(penetration>0)visibility*=Math.exp(-2*smoke[i].density*penetration);
    }
    return clamp(visibility,0,1);
  }

  function suppressNear(point,radius,amount){
    var combat=dependencies.characterCombat||global.CharacterCombat;
    if(!combat||typeof combat.suppressNear!=='function')return 0;
    return combat.suppressNear(point,Math.max(0,finite(radius,0)),Math.max(0,finite(amount,0)));
  }

  function update(dt){
    dt=Math.max(0,finite(dt,0));
    for(var i=smoke.length-1;i>=0;i--){
      smoke[i].life-=dt;
      if(smoke[i].life<=0)smoke.splice(i,1);
    }
    return smoke.length;
  }

  function dot(a,b){return a.x*b.x+a.y*b.y+a.z*b.z;}
  function magnitude(vector){return Math.sqrt(dot(vector,vector));}
  function normalized(vector){
    var length=magnitude(vector);
    return length>1e-12?{x:vector.x/length,y:vector.y/length,z:vector.z/length}:null;
  }
  function reflected(velocity,normal){
    var unitNormal=normalized(normal);
    if(!unitNormal)return null;
    var scale=2*dot(velocity,unitNormal);
    return {x:velocity.x-scale*unitNormal.x,y:velocity.y-scale*unitNormal.y,z:velocity.z-scale*unitNormal.z};
  }
  function resolveRicochet(impact,random){
    impact=impact||{};
    if(impact.material!=='steel'||impact.ricocheted||!impact.velocity||!impact.normal)return null;
    var incidence=finite(impact.incidence,null);
    if(incidence===null){
      var velocityDirection=normalized(impact.velocity),normalDirection=normalized(impact.normal);
      if(!velocityDirection||!normalDirection)return null;
      incidence=Math.abs(dot(velocityDirection,normalDirection));
    }
    if(incidence>=.25)return null;
    var chance=1-clamp(incidence,0,.25)/.25;
    var roll=typeof random==='function'?random():Math.random();
    if(roll>=chance)return null;
    var nextVelocity=reflected(impact.velocity,impact.normal);
    if(!nextVelocity)return null;
    nextVelocity.x*=.45;nextVelocity.y*=.45;nextVelocity.z*=.45;
    return {
      kind:'ricochet',
      velocity:nextVelocity,
      damage:Math.max(0,finite(impact.damage,0))*.3,
      life:Math.min(.8,Math.max(0,finite(impact.life,.8))),
      ricocheted:true
    };
  }

  function reset(){var count=smoke.length;smoke=[];return count;}

  var api={configure:configure,registerSmoke:registerSmoke,visibilityBetween:visibilityBetween,
    suppressNear:suppressNear,update:update,resolveRicochet:resolveRicochet,reset:reset};
  global.CombatAwareness=Object.freeze(api);
})(globalThis);
