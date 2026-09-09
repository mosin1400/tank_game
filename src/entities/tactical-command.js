(function(global){
  'use strict';

  var actors=[];
  var dependencies={navigation:null,onIssued:null};
  var supported={cover:true,attack:true,retreat:true,rally:true};

  function configure(options){
    options=options||{};
    dependencies.navigation=options.navigation||global.CharacterNavigation||null;
    dependencies.onIssued=typeof options.onIssued==='function'?options.onIssued:null;
    return api;
  }

  function find(actor){
    for(var i=0;i<actors.length;i++)if(actors[i].actor===actor)return actors[i];
    return null;
  }

  function inferAllied(actor,options){
    if(options&&typeof options.allied==='boolean')return options.allied;
    var data=actor&&actor.userData||{};
    if(typeof data.allied==='boolean')return data.allied;
    var faction=String(data.faction||'').toLowerCase();
    return faction==='allied'||faction==='vardan'||faction==='player';
  }

  function register(actor,options){
    if(!actor)throw new Error('TacticalCommand.register requires an actor');
    var entry=find(actor);
    if(!entry){entry={actor:actor,allied:false};actors.push(entry);}
    entry.allied=inferAllied(actor,options||{});
    return actor;
  }

  function unregister(actor){
    for(var i=0;i<actors.length;i++)if(actors[i].actor===actor){actors.splice(i,1);return true;}
    return false;
  }

  function navigator(){
    return dependencies.navigation||global.CharacterNavigation||null;
  }

  function issue(command,target){
    if(!supported[command])throw new Error('Unsupported tactical command: '+command);
    var navigation=navigator();
    if(!navigation)throw new Error('TacticalCommand requires CharacterNavigation');
    var count=0;
    actors.slice().forEach(function(entry){
      if(!entry.allied)return;
      if(command==='cover'){
        if(typeof navigation.requestCover!=='function')throw new Error('CharacterNavigation.requestCover is unavailable');
        navigation.requestCover(entry.actor,target||null,2);
      }else{
        if(typeof navigation.setCommand!=='function')throw new Error('CharacterNavigation.setCommand is unavailable');
        navigation.setCommand(entry.actor,command,target||null);
      }
      count++;
    });
    if(dependencies.onIssued)dependencies.onIssued(command,count,target||null);
    return count;
  }

  function reset(){
    var count=actors.length;
    actors=[];
    return count;
  }

  var api={configure:configure,register:register,unregister:unregister,issue:issue,reset:reset,supports:function(command){return !!supported[command];}};
  global.TacticalCommand=Object.freeze(api);
})(globalThis);
