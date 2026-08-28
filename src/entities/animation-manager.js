(function(global){
  'use strict';

  var DEFAULT_FADE=0.2;
  var PLAYBACK_SPEEDS={'rifle-walk':0.58};
  var STATE_ALIASES={
    'crouch-walk':'walk','radio':'talk','binoculars':'aim','brace':'aim',
    'hatch-idle':'idle','rifle-aim':'aim'
  };

  function clipIndex(clips){
    var index=Object.create(null);
    (clips||[]).forEach(function(clip){
      if(clip && typeof clip.name==='string' && clip.name)index[clip.name]=clip;
    });
    return index;
  }

  function create(options){
    options=options||{};
    if(!options.mixer || typeof options.mixer.clipAction!=='function'){
      throw new Error('AnimationManager.create requires mixer.clipAction');
    }
    var clips=clipIndex(options.clips);
    var initial=options.initial||'idle';
    function resolve(name){return clips[name]?name:STATE_ALIASES[name];}
    var initialClip=resolve(initial);
    if(!initialClip||!clips[initialClip])throw new Error('Missing initial animation state: '+initial);
    var actions=Object.create(null);
    Object.keys(clips).forEach(function(name){ actions[name]=options.mixer.clipAction(clips[name]); });
    var current=null;
    var currentName=null;
    var paused=false;
    var disposed=false;

    function start(action,name){
      action.enabled=true;
      action.timeScale=PLAYBACK_SPEEDS[name]||1;
      if(typeof action.reset==='function')action.reset();
      if(typeof action.play==='function')action.play();
    }

    function setState(name,seconds){
      var resolved=resolve(name);
      if(disposed || !resolved || !actions[resolved] || name===currentName)return false;
      var next=actions[resolved];
      var fade=typeof seconds==='number' && isFinite(seconds) && seconds>=0 ? seconds : DEFAULT_FADE;
      start(next,resolved);
      if(current && typeof current.crossFadeTo==='function')current.crossFadeTo(next,fade,true);
      current=next;
      currentName=name;
      return true;
    }

    start(actions[initialClip],initialClip);
    current=actions[initialClip];
    currentName=initial;

    return {
      get disposed(){return disposed;},
      state:function(){return currentName;},
      actionTimeScale:function(name){var resolved=resolve(name);return resolved&&actions[resolved]?actions[resolved].timeScale:null;},
      setState:setState,
      pause:function(value){
        if(disposed)return false;
        paused=!!value;
        return true;
      },
      update:function(dt){
        if(disposed || paused || typeof dt!=='number' || !isFinite(dt) || dt<=0)return false;
        options.mixer.update(dt);
        return true;
      },
      dispose:function(){
        if(disposed)return false;
        disposed=true;
        if(typeof options.mixer.stopAllAction==='function')options.mixer.stopAllAction();
        Object.keys(actions).forEach(function(name){
          if(typeof actions[name].stop==='function')actions[name].stop();
        });
        current=null;
        currentName=null;
        return true;
      }
    };
  }

  global.AnimationManager={create:create};
})(globalThis);
