(function(global){
  'use strict';

  function finite(value,fallback){return typeof value==='number'&&isFinite(value)?value:fallback;}
  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
  function rounded(value){return Math.round(value*1e12)/1e12;}

  function moduleHealth(modules,name){return clamp(finite(modules&&modules[name],1),0,1);}
  function initialize(tank){
    if(!tank)throw new Error('TankDamage.initialize requires a tank');
    tank.modules={
      tracks:moduleHealth(tank.modules,'tracks'),
      engine:moduleHealth(tank.modules,'engine'),
      turret:moduleHealth(tank.modules,'turret')
    };
    refreshModifiers(tank);
    return tank.modules;
  }

  function tankRoot(tank){return tank.root||tank;}
  function localPoint(tank,worldPoint){
    var root=tankRoot(tank);
    if(root&&typeof root.worldToLocal==='function'&&worldPoint&&typeof worldPoint.clone==='function'){
      return root.worldToLocal(worldPoint.clone());
    }
    var position=(root&&root.position)||tank.position||tank.pos||{x:0,y:0,z:0};
    var dx=finite(worldPoint&&worldPoint.x,0)-finite(position.x,0);
    var dy=finite(worldPoint&&worldPoint.y,0)-finite(position.y,0);
    var dz=finite(worldPoint&&worldPoint.z,0)-finite(position.z,0);
    var yaw=finite(root&&root.rotation&&root.rotation.y,finite(tank.yaw,0));
    var cosine=Math.cos(yaw),sine=Math.sin(yaw);
    return {x:dx*cosine-dz*sine,y:dy,z:dx*sine+dz*cosine};
  }

  function boundsFor(tank){
    var source=tank.moduleBounds||(tank.userData&&tank.userData.moduleBounds)||{};
    return {
      halfWidth:Math.max(.1,finite(source.halfWidth,1.5)),
      halfLength:Math.max(.1,finite(source.halfLength,3)),
      trackHeight:finite(source.trackHeight,.8),
      turretHeight:finite(source.turretHeight,1.2)
    };
  }

  function classifyHit(tank,worldPoint){
    if(!tank||!worldPoint)throw new Error('TankDamage.classifyHit requires tank and worldPoint');
    var point=localPoint(tank,worldPoint),bounds=boundsFor(tank);
    if(point.z<=-bounds.halfLength/3)return 'engine';
    if(point.y<=bounds.trackHeight&&Math.abs(point.x)>=bounds.halfWidth*.45)return 'tracks';
    if(point.y>=bounds.turretHeight&&Math.abs(point.x)<=bounds.halfWidth*.75)return 'turret';
    return 'hull';
  }

  function refreshModifiers(tank){
    var modules=tank.modules||initialize(tank);
    var modifiers={speed:1,reload:1,traverse:1};
    if(modules.tracks<.35)modifiers.speed=Math.min(modifiers.speed,.45);
    if(modules.engine<.35){modifiers.speed=Math.min(modifiers.speed,.55);modifiers.reload=1.35;}
    if(modules.turret<.35)modifiers.traverse=.4;
    tank.moduleModifiers=modifiers;
    tank.userData=tank.userData||{};
    tank.userData.moduleModifiers=modifiers;
    return modifiers;
  }

  function apply(tank,module,damage){
    if(!tank)throw new Error('TankDamage.apply requires a tank');
    if(!tank.modules)initialize(tank);
    if(module!=='tracks'&&module!=='engine'&&module!=='turret'&&module!=='hull'){
      throw new Error('Unknown tank module: '+module);
    }
    if(module!=='hull'){
      tank.modules[module]=rounded(clamp(tank.modules[module]-Math.max(0,finite(damage,0)),0,1));
    }
    var modifiers=refreshModifiers(tank);
    return {module:module,health:module==='hull'?null:tank.modules[module],modifiers:modifiers};
  }

  function modifiers(tank){
    if(!tank.modules)initialize(tank);
    return refreshModifiers(tank);
  }

  global.TankDamage=Object.freeze({initialize:initialize,classifyHit:classifyHit,apply:apply,modifiers:modifiers});
})(globalThis);
