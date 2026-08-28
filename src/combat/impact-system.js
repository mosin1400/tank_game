(function(global){
  'use strict';

  var dependencies=null;
  var EPSILON=1e-9;
  var GROUND_Y=0.06;

  function finitePoint(point){
    return point&&Number.isFinite(point.x)&&Number.isFinite(point.y)&&Number.isFinite(point.z);
  }

  function segmentLength(start,end){
    var dx=end.x-start.x,dy=end.y-start.y,dz=end.z-start.z;
    return Math.sqrt(dx*dx+dy*dy+dz*dz);
  }

  function pointAt(start,end,t){
    return {
      x:start.x+(end.x-start.x)*t,
      y:start.y+(end.y-start.y)*t,
      z:start.z+(end.z-start.z)*t
    };
  }

  function isWithinHeight(point,collider){
    var height=typeof collider.h==='number'?collider.h:Infinity;
    return point.y>=0&&point.y<=height;
  }

  function makeColliderHit(start,end,t,normal,collider){
    var point=pointAt(start,end,t);
    if(!isWithinHeight(point,collider))return null;
    return {
      kind:collider.type,
      point:point,
      normal:normal,
      distance:segmentLength(start,end)*t,
      collider:collider,
      target:collider.target||null
    };
  }

  function localAabbHit(start,end,hw,hd){
    var dx=end.x-start.x,dz=end.z-start.z;
    var enter=0,exit=1,normal=null;
    var axes=[
      {origin:start.x,delta:dx,min:-hw,max:hw,near:{x:-1,y:0,z:0},far:{x:1,y:0,z:0}},
      {origin:start.z,delta:dz,min:-hd,max:hd,near:{x:0,y:0,z:-1},far:{x:0,y:0,z:1}}
    ];
    for(var i=0;i<axes.length;i++){
      var axis=axes[i];
      if(Math.abs(axis.delta)<EPSILON){
        if(axis.origin<axis.min||axis.origin>axis.max)return null;
        continue;
      }
      var t1=(axis.min-axis.origin)/axis.delta;
      var t2=(axis.max-axis.origin)/axis.delta;
      var n1=axis.near,n2=axis.far;
      if(t1>t2){
        var swapT=t1;t1=t2;t2=swapT;
        var swapN=n1;n1=n2;n2=swapN;
      }
      if(t1>enter){enter=t1;normal=n1;}
      if(t2<exit)exit=t2;
      if(enter>exit)return null;
    }
    if(exit<0||enter>1)return null;
    if(!normal){
      if(Math.abs(dx)>Math.abs(dz))normal={x:dx>0?-1:1,y:0,z:0};
      else if(Math.abs(dz)>EPSILON)normal={x:0,y:0,z:dz>0?-1:1};
      else return null;
    }
    return {t:Math.max(0,enter),normal:normal};
  }

  function segmentAabb(start,end,collider){
    var local=localAabbHit(
      {x:start.x-collider.x,y:start.y,z:start.z-collider.z},
      {x:end.x-collider.x,y:end.y,z:end.z-collider.z},
      collider.hw||0,collider.hd||0
    );
    return local?makeColliderHit(start,end,local.t,local.normal,collider):null;
  }

  function segmentObb(start,end,collider){
    var yaw=collider.ry||0,cos=Math.cos(yaw),sin=Math.sin(yaw);
    function toLocal(point){
      var x=point.x-collider.x,z=point.z-collider.z;
      return {x:x*cos+z*sin,y:point.y,z:-x*sin+z*cos};
    }
    var local=localAabbHit(toLocal(start),toLocal(end),collider.hw||0,collider.hd||0);
    if(!local)return null;
    var normal={
      x:local.normal.x*cos-local.normal.z*sin,
      y:0,
      z:local.normal.x*sin+local.normal.z*cos
    };
    return makeColliderHit(start,end,local.t,normal,collider);
  }

  function segmentCircle(start,end,collider){
    var dx=end.x-start.x,dz=end.z-start.z;
    var sx=start.x-collider.x,sz=start.z-collider.z;
    var a=dx*dx+dz*dz;
    if(a<EPSILON)return null;
    var radius=collider.r||0;
    var b=2*(sx*dx+sz*dz);
    var c=sx*sx+sz*sz-radius*radius;
    var discriminant=b*b-4*a*c;
    if(discriminant<0)return null;
    var root=Math.sqrt(discriminant);
    var t1=(-b-root)/(2*a),t2=(-b+root)/(2*a);
    var t=t1>=0&&t1<=1?t1:(t2>=0&&t2<=1?t2:null);
    if(t===null)return null;
    var point=pointAt(start,end,t);
    var nx=point.x-collider.x,nz=point.z-collider.z;
    var length=Math.sqrt(nx*nx+nz*nz);
    var normal=length>EPSILON?{x:nx/length,y:0,z:nz/length}:{x:-dx/Math.sqrt(a),y:0,z:-dz/Math.sqrt(a)};
    return makeColliderHit(start,end,t,normal,collider);
  }

  function segmentCollider(start,end,collider){
    if(!finitePoint(start)||!finitePoint(end)||!collider)return null;
    if(collider.type==='circle')return segmentCircle(start,end,collider);
    if(collider.type==='obb')return segmentObb(start,end,collider);
    if(collider.type==='aabb')return segmentAabb(start,end,collider);
    return null;
  }

  function segmentGround(start,end){
    if(!finitePoint(start)||!finitePoint(end)||!(start.y>GROUND_Y&&end.y<=GROUND_Y))return null;
    var t=(GROUND_Y-start.y)/(end.y-start.y);
    return {
      kind:'ground',
      point:pointAt(start,end,t),
      normal:{x:0,y:1,z:0},
      distance:segmentLength(start,end)*t,
      collider:null,
      target:null
    };
  }

  function configure(next){
    if(!next||typeof next.targets!=='function'){
      throw new Error('ImpactSystem.configure requires targets');
    }
    dependencies=next;
  }

  function trace(start,end,projectile){
    var hits=[];
    var colliders=dependencies?dependencies.targets(projectile):[];
    (colliders||[]).forEach(function(collider){
      var hit=segmentCollider(start,end,collider);
      if(hit)hits.push(hit);
    });
    var ground=segmentGround(start,end);
    if(ground)hits.push(ground);
    hits.sort(function(a,b){return a.distance-b.distance;});
    return hits[0]||null;
  }

  function resolve(projectile,hit){
    return dependencies&&typeof dependencies.onImpact==='function'?
      dependencies.onImpact(projectile,hit):hit;
  }

  function reset(){dependencies=null;}

  global.ImpactSystem={
    configure:configure,
    segmentCollider:segmentCollider,
    trace:trace,
    resolve:resolve,
    reset:reset
  };
})(typeof window!=='undefined'?window:globalThis);
