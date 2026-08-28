(function(global){
  'use strict';

  var entries=[];
  var dependencies={};
  var fragmentCount=0;
  var DEFAULT_FRAGMENT_LIMIT=80;
  var WEAK_MATERIALS={wood:true,glass:true,'light-metal':true};

  function finite(value,fallback){return typeof value==='number'&&isFinite(value)?value:fallback;}
  function callback(name){return typeof dependencies[name]==='function'?dependencies[name]:null;}
  function find(value){
    for(var i=0;i<entries.length;i++){
      var entry=entries[i];
      if(entry===value||entry.object===value||entry.collider===value)return entry;
    }
    return null;
  }
  function configure(next){
    dependencies=next||{};
    fragmentCount=0;
    return api;
  }
  function register(spec){
    if(!spec||!spec.object)throw new Error('DestructibleRegistry.register requires object');
    if(!spec.collider)throw new Error('DestructibleRegistry.register requires collider');
    var existing=find(spec.object);
    if(existing)return existing;
    var material=String(spec.material||'concrete').toLowerCase();
    var durability=Math.max(0,finite(spec.durability,100));
    var entry={
      object:spec.object,
      collider:spec.collider,
      material:material,
      durability:durability,
      remaining:durability,
      breakable:typeof spec.breakable==='boolean'?spec.breakable:!!WEAK_MATERIALS[material],
      root:spec.root||null,
      broken:false
    };
    entries.push(entry);
    return entry;
  }
  function unregister(value){
    var entry=find(value);
    if(!entry)return false;
    entries.splice(entries.indexOf(entry),1);
    return true;
  }
  function emit(name){
    var fn=callback(name);
    if(fn)fn.apply(null,Array.prototype.slice.call(arguments,1));
  }
  function groundProfile(impact){
    var kind=impact.projectileKind||impact.weaponKind||'shell';
    if(kind==='shell')return {explosionSize:.45,craterSize:.7,dustCount:8};
    return {explosionSize:.18,craterSize:.28,dustCount:4};
  }
  function handleGround(impact){
    var profile=groundProfile(impact);
    emit('onGroundImpact',impact,profile);
    return {result:'crater',remaining:null,profile:profile};
  }
  function debrisCount(){
    var limit=Math.max(0,Math.floor(finite(dependencies.maxFragments,DEFAULT_FRAGMENT_LIMIT)));
    var available=Math.max(0,limit-fragmentCount);
    var random=typeof dependencies.random==='function'?dependencies.random:Math.random;
    var requested=4+Math.floor(Math.max(0,Math.min(.999999,finite(random(),.5)))*5);
    var count=Math.min(available,requested);
    fragmentCount+=count;
    return count;
  }
  function breakTarget(entry,impact){
    entry.broken=true;
    entry.remaining=0;
    if(entry.object)entry.object.visible=false;
    emit('removeCollider',entry.collider,entry);
    emit('onBreak',entry,impact,debrisCount());
    return {result:'break',remaining:0};
  }
  function handleImpact(value,impact){
    impact=impact||{};
    if(impact.kind==='ground'||(!value&&impact.material==='earth'))return handleGround(impact);
    var entry=find(value)||value;
    if(!entry||!entry.material)return {result:'ignored',remaining:null};
    if(entry.broken)return {result:'ignored',remaining:0};
    var damage=Math.max(0,finite(impact.damage,0));
    entry.remaining=Math.max(0,finite(entry.remaining,entry.durability)-damage);
    if(entry.breakable&&WEAK_MATERIALS[entry.material]&&entry.remaining<=0)return breakTarget(entry,impact);
    if(entry.material==='steel'||entry.material==='armor'){
      emit('onDent',entry,impact);
      return {result:'dent',remaining:entry.remaining};
    }
    if(entry.material==='fuel'){
      emit('onFuelHit',entry,impact);
      return {result:'fuel-hit',remaining:entry.remaining};
    }
    emit('onChip',entry,impact);
    return {result:'chip',remaining:entry.remaining};
  }
  function reset(){
    var count=entries.length;
    entries=[];
    fragmentCount=0;
    return count;
  }

  var api={configure:configure,register:register,unregister:unregister,handleImpact:handleImpact,reset:reset};
  global.DestructibleRegistry=Object.freeze(api);
})(typeof window!=='undefined'?window:globalThis);
