(function(global){
  'use strict';

  var BASE='assets/models/characters/core/soldier-base.glb?v=20260828-combat-v3';
  var MOTION='assets/models/characters/animation/character-motion.glb?v=20260828-combat-v3';
  var VARIANTS='assets/models/characters/textures/variants/manifest.json';
  var CHARACTER_TARGET_HEIGHT=1.82;
  var CHARACTER_SOURCE_HEIGHT=184.094467;
  var CHARACTER_WORLD_SCALE=CHARACTER_TARGET_HEIGHT/CHARACTER_SOURCE_HEIGHT;
  var deps=null,cache=null,instances=[];

  function configure(next){
    if(!next||!next.THREE||typeof next.loadGltf!=='function'||typeof next.cloneScene!=='function'){
      throw new Error('CharacterManager.configure requires THREE, loadGltf and cloneScene');
    }
    deps=next;cache=null;instances=[];
  }

  function normalizeClips(clips){
    return (clips||[]).map(function(clip){
      var copy=typeof clip.clone==='function'?clip.clone():clip;
      copy.name=copy.name.replace(/_soldier_(?:mixamo_)?rig$/,'').replace(/^.*\|/,'');
      if(Array.isArray(copy.tracks)){
        copy.tracks=copy.tracks.filter(function(track){return /\.quaternion$/.test(track.name||'');});
      }
      return copy;
    });
  }

  function preload(){
    if(!deps)throw new Error('CharacterManager is not configured');
    if(cache)return cache;
    cache=Promise.all([
      global.CharacterRoster.load('assets/models/characters/manifests/character-roster.json?v=20260828-combat-v3'),deps.loadGltf(BASE),deps.loadGltf(MOTION),
      global.fetch(VARIANTS).then(function(r){if(!r.ok)throw new Error('Failed texture variant manifest');return r.json();})
    ]).then(function(values){
      return {base:values[1].scene,clips:normalizeClips(values[2].animations),variants:values[3],textures:Object.create(null)};
    }).catch(function(error){cache=null;throw error;});
    return cache;
  }

  function loadTexture(asset,variantId){
    var variant=asset.variants.variants[variantId];
    if(!variant)return Promise.resolve(null);
    if(!asset.textures[variantId]){
      asset.textures[variantId]=new deps.THREE.TextureLoader().loadAsync(variant.albedo).then(function(texture){
        texture.colorSpace=deps.THREE.SRGBColorSpace;texture.flipY=false;return texture;
      });
    }
    return asset.textures[variantId];
  }

  function applyTexture(model,texture){
    if(!texture||typeof model.traverse!=='function')return;
    model.traverse(function(object){
      if(!object.isMesh)return;
      object.castShadow=true;object.receiveShadow=true;
      var materials=Array.isArray(object.material)?object.material:[object.material];
      materials=materials.map(function(material){
        if(!material||!material.map||!/(?:sov_soldier_0|soldier)/i.test(material.map.name||''))return material;
        var clone=material.clone();clone.map=texture;clone.needsUpdate=true;return clone;
      });
      object.material=Array.isArray(object.material)?materials:materials[0];
    });
  }

  function createProcedural(model){
    if(!deps.THREE.Euler||!deps.THREE.Quaternion||typeof model.getObjectByName!=='function')return null;
    var bones={chest:model.getObjectByName('mixamorig:Spine2'),neck:model.getObjectByName('mixamorig:Neck'),
      head:model.getObjectByName('mixamorig:Head'),jaw:null};
    var state={time:0,lookX:0,lookY:0,recoil:0,talking:false};
    var q=new deps.THREE.Quaternion(),e=new deps.THREE.Euler();
    function add(bone,x,y,z){if(!bone)return;e.set(x,y,z,'XYZ');q.setFromEuler(e);bone.quaternion.multiply(q);}
    return {
      update:function(dt){
        state.time+=dt;state.recoil=Math.max(0,state.recoil-dt*5.5);
        add(bones.chest,Math.sin(state.time*1.7)*.009-state.recoil*.035,0,0);
        add(bones.neck,state.lookY*.16,state.lookX*.22,0);
        add(bones.head,state.lookY*.1,state.lookX*.14,0);
        if(state.talking)add(bones.jaw,Math.max(0,Math.sin(state.time*15))*.11,0,0);
      },
      setLook:function(x,y){state.lookX=Math.max(-1,Math.min(1,+x||0));state.lookY=Math.max(-1,Math.min(1,+y||0));},
      setTalking:function(value){state.talking=!!value;},
      recoil:function(amount){state.recoil=Math.max(state.recoil,amount===undefined?1:+amount||0);}
    };
  }

  function attachWeapon(model,weaponId){
    if(!weaponId||!global.WeaponModels||typeof model.getObjectByName!=='function')return null;
    var hand=model.getObjectByName('mixamorig:RightHand');
    if(!hand)return null;
    var weapon=global.WeaponModels.create(weaponId,deps.THREE);
    if(!weapon)return null;
    weapon.position.set(.02,.04,.08);
    weapon.rotation.set(-Math.PI/2,0,Math.PI/2);
    hand.add(weapon);
    return weapon;
  }

  function spawnCharacter(id,position,options){
    options=options||{};
    var group=new deps.THREE.Group();
    position=position||{};group.position.set(position.x||0,position.y||0,position.z||0);
    group.rotation.y=options.yaw||0;group.userData.characterRole=id;
    if(options.movement&&Array.isArray(options.movement.waypoints)&&options.movement.waypoints.length){
      group.userData.movement={
        waypoints:options.movement.waypoints.map(function(point){return {x:+point.x||0,z:+point.z||0};}),
        speed:Math.max(.1,+options.movement.speed||2.5),state:options.movement.state||'run',
        delay:Math.max(0,+options.movement.startDelay||0),index:0,loop:options.movement.loop!==false
      };
    }
    if(options.parent)options.parent.add(group);
    group.ready=preload().then(function(asset){
      var rosterId=options.rosterId||id,entry=global.CharacterRoster.get(rosterId);
      var model=deps.cloneScene(asset.base);
      var scale=entry.appearance.bodyScale||[1,1,1];
      var uniformScale=CHARACTER_WORLD_SCALE*scale[2];
      group.scale.set(uniformScale,uniformScale,uniformScale);
      group.add(model);
      var weapon=attachWeapon(model,options.weapon);
      var variantId=asset.variants.roles[rosterId];
      return loadTexture(asset,variantId).then(function(texture){
        applyTexture(model,texture);
        var mixer=new deps.THREE.AnimationMixer(model);
        var animation=global.AnimationManager.create({mixer:mixer,clips:asset.clips,initial:options.initialState||entry.defaultState,THREE:deps.THREE,root:model});
        var procedural=createProcedural(model);
        group.userData.model=model;group.userData.animation=animation;group.userData.procedural=procedural;
        group.userData.weapon=weapon;
        if(global.CharacterCombat)global.CharacterCombat.register(group,{faction:entry.faction==='ash'?'enemy':'allied'});
        if(global.TacticalCommand)global.TacticalCommand.register(group,{allied:entry.faction!=='ash'});
        if(global.CharacterNavigation&&options.movement){
          global.CharacterNavigation.register(group,{behavior:'run-to-cover',speed:options.movement.speed,startDelay:options.movement.startDelay});
          group.userData.smartNavigation=true;
        }
        instances.push(group);return group;
      });
    }).catch(function(error){group.userData.loadError=error;console.error('[CharacterManager]',id,error);return group;});
    return group;
  }

  function updateMovement(actor,dt){
    var movement=actor.userData.movement,animation=actor.userData.animation;
    if(!movement||!movement.waypoints.length||!animation)return;
    if(movement.delay>0){movement.delay=Math.max(0,movement.delay-dt);return;}
    animation.setState(movement.state,.18);
    var remaining=movement.speed*dt,guard=0;
    while(remaining>0&&guard++<movement.waypoints.length+1){
      var target=movement.waypoints[movement.index];
      var dx=target.x-actor.position.x,dz=target.z-actor.position.z;
      var distance=Math.hypot(dx,dz);
      if(distance<.001){
        if(movement.index===movement.waypoints.length-1&&!movement.loop)return;
        movement.index=(movement.index+1)%movement.waypoints.length;continue;
      }
      actor.rotation.y=Math.atan2(dx,dz);
      var step=Math.min(distance,remaining);
      actor.position.x+=dx/distance*step;actor.position.z+=dz/distance*step;remaining-=step;
      if(step<distance)return;
      if(movement.index===movement.waypoints.length-1&&!movement.loop)return;
      movement.index=(movement.index+1)%movement.waypoints.length;
    }
  }

  function update(dt){
    instances.forEach(function(actor){
      var animation=actor.userData.animation,procedural=actor.userData.procedural;
      if(!actor.userData.smartNavigation)updateMovement(actor,dt);
      if(animation)animation.update(dt);
      if(procedural)procedural.update(dt);
    });
    if(global.CharacterNavigation)global.CharacterNavigation.update(dt);
  }

  function removeWithin(parent){
    instances=instances.filter(function(actor){
      var current=actor,inside=false;
      while(current){if(current===parent){inside=true;break;}current=current.parent;}
      if(inside&&actor.userData.animation)actor.userData.animation.dispose();
      if(inside&&global.TacticalCommand)global.TacticalCommand.unregister(actor);
      return !inside;
    });
    if(global.CharacterCombat)global.CharacterCombat.removeWithin(parent);
    if(global.CharacterNavigation)global.CharacterNavigation.removeWithin(parent);
  }

  global.CharacterManager=Object.freeze({configure:configure,preload:preload,spawnCharacter:spawnCharacter,update:update,removeWithin:removeWithin});
})(globalThis);
