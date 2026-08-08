(function(global){
  'use strict';

  var UNDERSHIRT_COLOR='#817a63';
  var OUTFIT_COLORS={
    'ash-general':'#4d5154',
    'ash-rifle':'#585b58',
    'ash-elite':'#45494c',
    'ash-crew':'#615f57',
    'civilian-medic':'#79715d',
    'civilian-mechanic':'#665b46',
    'convoy-driver':'#6d6042',
    'rail-worker':'#756541',
    'resistance-leader':'#536344',
    'resistance-scout':'#4e603f'
  };

  function normalizeBoneName(name){
    return String(name||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  }

  function findBone(armature,names){
    if(!armature)throw new Error('CharacterWardrobe.createLayers requires an armature');
    var wanted=names.map(normalizeBoneName);
    var found=null;
    function inspect(node){
      if(found || !node)return;
      if(wanted.indexOf(normalizeBoneName(node.name))!==-1){found=node;return;}
      (node.children||[]).forEach(inspect);
    }
    names.some(function(name){
      if(typeof armature.getObjectByName!=='function')return false;
      var candidate=armature.getObjectByName(name);
      if(candidate){found=candidate;return true;}
      return false;
    });
    if(!found && typeof armature.traverse==='function')armature.traverse(inspect);
    if(!found)inspect(armature);
    if(!found && armature.skeleton && Array.isArray(armature.skeleton.bones)){
      armature.skeleton.bones.some(function(bone){
        if(wanted.indexOf(normalizeBoneName(bone.name))!==-1){found=bone;return true;}
        return false;
      });
    }
    if(!found)throw new Error('Character wardrobe could not find Mixamo bone: '+names[0]);
    return found;
  }

  function material(THREE,color,outfit,accentColor){
    var value=new THREE.MeshStandardMaterial({color:color,roughness:0.88,metalness:0});
    value.userData=value.userData||{};
    value.userData.outfit=outfit;
    value.userData.accentColor=accentColor;
    return value;
  }

  function mesh(THREE,name,size,materialValue){
    var layer=new THREE.Mesh(new THREE.BoxGeometry(size[0],size[1],size[2]),materialValue);
    layer.name=name;
    layer.castShadow=true;
    layer.receiveShadow=true;
    return layer;
  }

  function attach(bone,layer,position){
    if(!bone || typeof bone.add!=='function')throw new Error('Character wardrobe bone cannot accept clothing layers');
    if(layer.position && typeof layer.position.set==='function')layer.position.set(position[0],position[1],position[2]);
    else layer.position={x:position[0],y:position[1],z:position[2]};
    bone.add(layer);
    return layer;
  }

  function uniformColor(outfit){
    return OUTFIT_COLORS[outfit] || (outfit.indexOf('ash-')===0 ? '#575957' : '#667040');
  }

  function kitGear(gear){
    return (gear||[]).filter(function(item){return typeof item==='string' && item.length>0;});
  }

  function gearTarget(gear){
    if(/cap|helmet|headset/i.test(gear)){
      return {names:['mixamorig:Head','Head','head'],position:[0,0,0.10],size:[0.22,0.20,0.08]};
    }
    if(/vest|pack|bag|coat|smock|tunic|coveralls|field-kit/i.test(gear)){
      return {names:['mixamorig:Spine2','Spine2','spine_03','spine03'],position:[0.23,0.02,-0.04],size:[0.13,0.08,0.18]};
    }
    return {names:['mixamorig:RightHand','RightHand','right_hand','righthand'],position:[0.04,0,0],size:[0.10,0.06,0.16]};
  }

  function addVisibleUndershirtPieces(THREE,undershirt,outfit,accent){
    var base=material(THREE,UNDERSHIRT_COLOR,outfit,accent);
    var pieces=[
      ['wardrobe-undershirt-collar',[0.25,0.22,0.055],[0,0,0.275]],
      ['wardrobe-undershirt-hem',[0.34,0.21,0.05],[0,0,-0.275]],
      ['wardrobe-undershirt-sleeve-left',[0.10,0.20,0.23],[-0.225,0,0.04]],
      ['wardrobe-undershirt-sleeve-right',[0.10,0.20,0.23],[0.225,0,0.04]]
    ];
    pieces.forEach(function(piece){
      var layer=mesh(THREE,piece[0],piece[1],base);
      if(layer.position && typeof layer.position.set==='function')layer.position.set(piece[2][0],piece[2][1],piece[2][2]);
      else layer.position={x:piece[2][0],y:piece[2][1],z:piece[2][2]};
      undershirt.add(layer);
    });
  }

  function createLayers(THREE,entry,armature){
    if(!THREE || typeof THREE.Mesh!=='function' || typeof THREE.BoxGeometry!=='function' ||
      typeof THREE.MeshStandardMaterial!=='function')throw new Error('CharacterWardrobe.createLayers requires Three mesh constructors');
    if(!entry || !entry.appearance || typeof entry.appearance.outfit!=='string' ||
      typeof entry.appearance.accentColor!=='string')throw new Error('Character wardrobe requires roster appearance data');
    var outfit=entry.appearance.outfit;
    var accent=entry.appearance.accentColor;
    var spine=findBone(armature,['mixamorig:Spine2','Spine2','spine_03','spine03']);
    var undershirt=attach(spine,mesh(THREE,'wardrobe-undershirt',[0.34,0.20,0.46],
      material(THREE,UNDERSHIRT_COLOR,outfit,accent)),[0,0,0]);
    addVisibleUndershirtPieces(THREE,undershirt,outfit,accent);
    var uniform=attach(spine,mesh(THREE,'wardrobe-uniform-'+outfit,[0.38,0.24,0.50],
      material(THREE,uniformColor(outfit),outfit,accent)),[0,0,0.012]);
    var leftLeg=findBone(armature,['mixamorig:LeftUpLeg','LeftUpLeg','left_up_leg','leftupleg']);
    var rightLeg=findBone(armature,['mixamorig:RightUpLeg','RightUpLeg','right_up_leg','rightupleg']);
    var trousers={
      left:attach(leftLeg,mesh(THREE,'wardrobe-trouser-left',[0.17,0.20,0.52],
        material(THREE,uniformColor(outfit),outfit,accent)),[0,0,-0.16]),
      right:attach(rightLeg,mesh(THREE,'wardrobe-trouser-right',[0.17,0.20,0.52],
        material(THREE,uniformColor(outfit),outfit,accent)),[0,0,-0.16])
    };
    var gear=kitGear(entry.gear);
    var kit=null;
    var accessories=gear.map(function(item){
      var target=gearTarget(item);
      var piece=attach(findBone(armature,target.names),mesh(THREE,'wardrobe-kit-'+item,target.size,
        material(THREE,accent,outfit,accent)),target.position);
      if(!kit)kit=piece;
      return piece;
    });
    return {undershirt:undershirt,uniform:uniform,trousers:trousers,kit:kit,accessories:accessories};
  }

  global.CharacterWardrobe={createLayers:createLayers};
})(globalThis);
