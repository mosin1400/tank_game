(function(global){
  'use strict';

  var PUBLIC_CLIPS=[
    'idle','walk','run','crouch-walk','talk','point','radio','binoculars',
    'brace','driver-sit','hatch-idle','repair','rifle-aim','rifle-reload',
    'hit-react','fall'
  ];
  var VALID_KINDS={named:true,soldier:true,general:true};
  var VALID_FACTIONS={vardan:true,ash:true,civilian:true};
  var VALID_BODIES={lean:true,medium:true,heavy:true};
  var VALID_FACE_TIERS={full:true,simple:true};
  var EMPTY_LIST=Object.freeze([]);
  var dependencies={fetchJson:defaultFetchJson};
  var record={promise:null,data:null,index:null};

  function defaultFetchJson(url){
    if(typeof global.fetch!=='function'){
      return Promise.reject(new Error('Character roster fetch is not configured'));
    }
    return global.fetch(url).then(function(response){
      if(!response.ok){
        throw new Error('Failed to load character roster: '+url+' ('+response.status+')');
      }
      return response.json();
    });
  }

  function cloneJson(data){
    try{
      return JSON.parse(JSON.stringify(data));
    }catch(error){
      throw new Error('Character roster must be valid JSON data');
    }
  }

  function isPlainObject(value){
    return value!==null && typeof value==='object' && !Array.isArray(value);
  }

  function isNonEmptyString(value){
    return typeof value==='string' && value.length>0;
  }

  function isLocalAssetUrl(value){
    return isNonEmptyString(value) &&
      value.indexOf('assets/models/characters/')===0 &&
      value.charAt(0)!=='/' &&
      value.indexOf('..')===-1 &&
      value.indexOf('\\')===-1 &&
      !/^[a-z][a-z\d+.-]*:/i.test(value);
  }

  function sameArray(left,right){
    if(!Array.isArray(left) || left.length!==right.length)return false;
    for(var i=0;i<right.length;i++){
      if(left[i]!==right[i])return false;
    }
    return true;
  }

  function assertEntry(entry,clipSet){
    if(!isPlainObject(entry))throw new Error('Character roster entry must be an object');
    if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.id||'')){
      throw new Error('Invalid character role ID: '+String(entry.id));
    }
    if(!VALID_KINDS[entry.kind])throw new Error('Invalid character kind: '+entry.id);
    if(!VALID_FACTIONS[entry.faction])throw new Error('Invalid character faction: '+entry.id);
    if(!VALID_BODIES[entry.body])throw new Error('Invalid character body: '+entry.id);
    if(!VALID_FACE_TIERS[entry.faceTier])throw new Error('Invalid character faceTier: '+entry.id);
    if(!isLocalAssetUrl(entry.geometry))throw new Error('Invalid character geometry URL: '+entry.id);
    if(!isLocalAssetUrl(entry.motion))throw new Error('Invalid character motion URL: '+entry.id);
    if(!clipSet[entry.defaultState])throw new Error('Invalid character defaultState: '+entry.id);
    if(entry.fallback!==null && !isNonEmptyString(entry.fallback)){
      throw new Error('Invalid character fallback: '+entry.id);
    }
    if(entry.kind==='named' && entry.fallback!==null){
      throw new Error('Named character cannot use fallback: '+entry.id);
    }
    if(!Array.isArray(entry.gear) || entry.gear.some(function(item){
      return !isNonEmptyString(item);
    })){
      throw new Error('Invalid character gear: '+entry.id);
    }
  }

  function validateClone(data){
    if(!isPlainObject(data))throw new Error('Character roster must be an object');
    if(data.schemaVersion!==1)throw new Error('Unsupported character roster schema');
    if(!sameArray(data.motionClips,PUBLIC_CLIPS)){
      throw new Error('Invalid character motion clips');
    }
    if(!Array.isArray(data.entries))throw new Error('Character roster entries must be an array');

    var clipSet=Object.create(null);
    data.motionClips.forEach(function(clip){clipSet[clip]=true;});
    var byId=Object.create(null);
    data.entries.forEach(function(entry){
      assertEntry(entry,clipSet);
      if(byId[entry.id])throw new Error('Duplicate character role: '+entry.id);
      byId[entry.id]=entry;
    });
    data.entries.forEach(function(entry){
      if(entry.fallback===null)return;
      var fallback=byId[entry.fallback];
      if(!fallback)throw new Error('Unknown character fallback: '+entry.fallback);
      if(fallback===entry)throw new Error('Character role cannot fall back to itself: '+entry.id);
      if(fallback.kind!==entry.kind || fallback.faction!==entry.faction){
        throw new Error('Character fallback must share kind and faction: '+entry.id);
      }
    });
    return data;
  }

  function deepFreeze(value){
    if(value===null || typeof value!=='object' || Object.isFrozen(value))return value;
    Object.keys(value).forEach(function(key){deepFreeze(value[key]);});
    return Object.freeze(value);
  }

  function buildIndex(data){
    var byId=Object.create(null);
    var byKind=Object.create(null);
    Object.keys(VALID_KINDS).forEach(function(kind){byKind[kind]=[];});
    data.entries.forEach(function(entry){
      byId[entry.id]=entry;
      byKind[entry.kind].push(entry);
    });
    Object.keys(byKind).forEach(function(kind){Object.freeze(byKind[kind]);});
    return {byId:byId,byKind:byKind};
  }

  function requireLoaded(){
    if(!record.data)throw new Error('Character roster is not loaded');
  }

  function configure(next){
    if(!next || typeof next.fetchJson!=='function'){
      throw new Error('CharacterRoster.configure requires fetchJson');
    }
    dependencies={fetchJson:next.fetchJson};
  }

  function load(url){
    url=url||'assets/models/characters/manifests/character-roster.json';
    if(record.data)return Promise.resolve(record.data);
    if(record.promise)return record.promise;
    record.promise=Promise.resolve()
      .then(function(){return dependencies.fetchJson(url);})
      .then(function(incoming){
        var data=validateClone(cloneJson(incoming));
        deepFreeze(data);
        record.data=data;
        record.index=buildIndex(data);
        return data;
      })
      .catch(function(error){
        record.promise=null;
        throw error;
      });
    return record.promise;
  }

  function validate(data){
    validateClone(cloneJson(data));
    return true;
  }

  function get(id){
    requireLoaded();
    var entry=record.index.byId[id];
    if(!entry)throw new Error('Unknown character role: '+id);
    return entry;
  }

  function list(kind){
    requireLoaded();
    if(kind===undefined)return record.data.entries;
    return record.index.byKind[kind]||EMPTY_LIST;
  }

  function motionClips(){
    requireLoaded();
    return record.data.motionClips;
  }

  function reset(){
    record={promise:null,data:null,index:null};
  }

  global.CharacterRoster={
    configure:configure,
    load:load,
    validate:validate,
    get:get,
    list:list,
    motionClips:motionClips,
    reset:reset
  };
})(globalThis);
