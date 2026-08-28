(function(global){
  'use strict';

  var cachedThree=null;
  var cached=null;

  function cacheFor(THREE){
    if(cached && cachedThree===THREE)return cached;
    if(!THREE || typeof THREE.Group!=='function' || typeof THREE.Mesh!=='function' ||
      typeof THREE.BoxGeometry!=='function' || typeof THREE.CylinderGeometry!=='function' ||
      typeof THREE.MeshStandardMaterial!=='function'){
      throw new Error('WeaponModels.create requires Three group, mesh, geometry and material constructors');
    }
    cachedThree=THREE;
    cached={
      steel:new THREE.MeshStandardMaterial({color:0x293137,metalness:0.82,roughness:0.39}),
      wood:new THREE.MeshStandardMaterial({color:0x28170f,metalness:0.04,roughness:0.52}),
      box:new THREE.BoxGeometry(1,1,1),
      cylinder:new THREE.CylinderGeometry(1,1,1,10),
      ring:new THREE.TorusGeometry?new THREE.TorusGeometry(1,.16,6,10):new THREE.CylinderGeometry(1,1,.16,10),
      sphere:THREE.SphereGeometry?new THREE.SphereGeometry(1,8,6):new THREE.CylinderGeometry(1,1,1,8)
    };
    return cached;
  }

  function transform(node,position,scale,rotation){
    if(node.position && typeof node.position.set==='function')node.position.set(position[0],position[1],position[2]);
    if(node.scale && typeof node.scale.set==='function')node.scale.set(scale[0],scale[1],scale[2]);
    if(rotation && node.rotation && typeof node.rotation.set==='function')node.rotation.set(rotation[0],rotation[1],rotation[2]);
    return node;
  }

  function part(THREE,resources,group,name,geometry,material,position,scale,rotation){
    var mesh=new THREE.Mesh(geometry,material);
    mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;
    group.add(transform(mesh,position,scale,rotation));
    return mesh;
  }

  function ppSh(THREE,resources){
    var group=new THREE.Group();
    group.name='weapon-ppsh41';
    part(THREE,resources,group,'weapon-ppsh41-stock',resources.box,resources.wood,[0,-.025,-.19],[.072,.075,.42]);
    part(THREE,resources,group,'weapon-ppsh41-stock-grip',resources.box,resources.wood,[0,-.10,-.015],[.060,.15,.085],[-.35,0,0]);
    part(THREE,resources,group,'weapon-ppsh41-receiver',resources.box,resources.steel,[0,.018,.07],[.082,.078,.28]);
    part(THREE,resources,group,'weapon-ppsh41-shroud',resources.cylinder,resources.steel,[0,.018,.30],[.037,.037,.36],[Math.PI/2,0,0]);
    part(THREE,resources,group,'weapon-ppsh41-barrel',resources.cylinder,resources.steel,[0,.018,.30],[.016,.016,.43],[Math.PI/2,0,0]);
    part(THREE,resources,group,'weapon-ppsh41-shroud-vent-a',resources.box,resources.steel,[.037,.042,.28],[.014,.014,.19]);
    part(THREE,resources,group,'weapon-ppsh41-shroud-vent-b',resources.box,resources.steel,[-.037,.042,.28],[.014,.014,.19]);
    part(THREE,resources,group,'weapon-ppsh41-muzzle',resources.cylinder,resources.steel,[0,.018,.495],[.046,.046,.07],[Math.PI/2,0,0]);
    part(THREE,resources,group,'weapon-ppsh41-drum',resources.cylinder,resources.steel,[0,-.085,.11],[.115,.115,.045],[Math.PI/2,0,0]);
    part(THREE,resources,group,'weapon-ppsh41-trigger-guard',resources.ring,resources.steel,[0,-.10,-.005],[.045,.06,.70],[Math.PI/2,0,0]);
    part(THREE,resources,group,'weapon-ppsh41-trigger',resources.box,resources.steel,[0,-.108,.02],[.012,.052,.012],[-.35,0,0]);
    part(THREE,resources,group,'weapon-ppsh41-rear-sight',resources.box,resources.steel,[0,.078,.00],[.032,.035,.018]);
    part(THREE,resources,group,'weapon-ppsh41-front-sight',resources.box,resources.steel,[0,.070,.455],[.018,.040,.014]);
    return group;
  }

  function mosin(THREE,resources){
    var group=new THREE.Group();
    group.name='weapon-mosin';
    part(THREE,resources,group,'weapon-mosin-stock',resources.box,resources.wood,[0,-.025,-.04],[.068,.072,.92]);
    part(THREE,resources,group,'weapon-mosin-handguard',resources.box,resources.wood,[0,.018,.36],[.057,.052,.34]);
    part(THREE,resources,group,'weapon-mosin-receiver',resources.box,resources.steel,[0,.028,-.14],[.074,.070,.19]);
    part(THREE,resources,group,'weapon-mosin-barrel',resources.cylinder,resources.steel,[0,.034,.56],[.024,.024,.82],[Math.PI/2,0,0]);
    part(THREE,resources,group,'weapon-mosin-bolt-handle',resources.sphere,resources.steel,[.070,.035,-.105],[.027,.027,.027]);
    part(THREE,resources,group,'weapon-mosin-bolt-stem',resources.cylinder,resources.steel,[.042,.035,-.105],[.012,.012,.070],[0,Math.PI/2,0]);
    part(THREE,resources,group,'weapon-mosin-rear-sight',resources.box,resources.steel,[0,.078,.09],[.034,.032,.043]);
    part(THREE,resources,group,'weapon-mosin-front-sight',resources.box,resources.steel,[0,.065,.94],[.017,.041,.016]);
    part(THREE,resources,group,'weapon-mosin-sling-front',resources.ring,resources.steel,[0,-.075,.50],[.032,.032,.22],[Math.PI/2,0,0]);
    part(THREE,resources,group,'weapon-mosin-sling-rear',resources.ring,resources.steel,[0,-.075,-.37],[.032,.032,.22],[Math.PI/2,0,0]);
    return group;
  }

  function create(type,THREE){
    if(type===null || type===undefined || type==='')return null;
    var resources=cacheFor(THREE);
    if(type==='ppsh41')return ppSh(THREE,resources);
    if(type==='mosin')return mosin(THREE,resources);
    throw new Error('Unknown character weapon: '+type);
  }

  global.WeaponModels=Object.freeze({create:create});
})(globalThis);
