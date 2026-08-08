(function(global){
  'use strict';

  var DEFAULT_FADE=0.2;

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
    if(!clips[initial])throw new Error('Missing initial animation state: '+initial);
    var actions=Object.create(null);
    Object.keys(clips).forEach(function(name){ actions[name]=options.mixer.clipAction(clips[name]); });
    var current=null;
    var currentName=null;
    var paused=false;
    var disposed=false;

    function start(action){
      action.enabled=true;
      if(typeof action.reset==='function')action.reset();
      if(typeof action.play==='function')action.play();
    }

    function setState(name,seconds){
      if(disposed || !actions[name] || name===currentName)return false;
      var next=actions[name];
      var fade=typeof seconds==='number' && isFinite(seconds) && seconds>=0 ? seconds : DEFAULT_FADE;
      start(next);
      if(current && typeof current.crossFadeTo==='function')current.crossFadeTo(next,fade,true);
      current=next;
      currentName=name;
      return true;
    }

    start(actions[initial]);
    current=actions[initial];
    currentName=initial;

    return {
      get disposed(){return disposed;},
      state:function(){return currentName;},
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
