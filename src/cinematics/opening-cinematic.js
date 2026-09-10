(function(global){
  'use strict';

  var STARTS=[0,2.8,5.8,8.6,11.2];
  var END_TIME=13.8;
  var BEATS=[
    {speaker:'راوی',text:'سرو زیر آتش است؛ اما مسیر کاروان هنوز باز مانده.'},
    {speaker:'دیده‌بان',text:'بمب‌افکن‌ها از روی خط آهن برمی‌گردند. نیروها، به پناه بروید!'},
    {speaker:'فرمانده',text:'تفنگ‌ها آماده؛ هیچ‌کس در محوطهٔ باز نماند.'},
    {speaker:'فرمانده',text:'تانک پیشاپیش می‌رود. کاروان پشت سر ما حرکت می‌کند.'},
    {speaker:'راوی',text:'هدف: شکستن محاصره و رساندن کاروان به دروازهٔ خروج.'}
  ];
  var configured=null;
  var active=null;

  function noop(){}
  function number(value,fallback){return typeof value==='number'&&isFinite(value)?value:fallback;}
  function point(value,fallback){
    value=Array.isArray(value)?value:fallback;
    return {x:number(value[0],0),y:number(value[1],0),z:number(value[2],0)};
  }
  function add(base,x,y,z){return {x:base.x+x,y:base.y+y,z:base.z+z};}
  function clonePoint(value){return {x:value.x,y:value.y,z:value.z};}
  function lerp(a,b,t){return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t};}
  function smoothstep(value){value=Math.max(0,Math.min(1,value));return value*value*(3-2*value);}
  function apiFrom(value){
    value=value||{};
    return {
      setSubtitle:typeof value.setSubtitle==='function'?value.setSubtitle:noop,
      clearSubtitle:typeof value.clearSubtitle==='function'?value.clearSubtitle:noop,
      lockControls:typeof value.lockControls==='function'?value.lockControls:noop,
      setMusicDuck:typeof value.setMusicDuck==='function'?value.setMusicDuck:noop,
      onComplete:typeof value.onComplete==='function'?value.onComplete:noop,
      onBeat:typeof value.onBeat==='function'?value.onBeat:noop
    };
  }
  function makePoses(layout){
    var landmarks=layout.landmarks||{};
    var fuel=point(landmarks.fuelYard,layout.playerSpawn||[0,0,0]);
    var rail=point(landmarks.railSiding,[fuel.x-30,0,fuel.z-30]);
    var convoy=point(layout.convoyPath&&layout.convoyPath[0]&&layout.convoyPath[0].start,[fuel.x+8,0,fuel.z+6]);
    var tank=point(layout.playerSpawn,[fuel.x-8,0,fuel.z+14]);
    var exit=point(landmarks.exitGate,[tank.x+50,0,tank.z-50]);
    return [
      {position:add(fuel,-25,13,20),lookAt:add(fuel,4,2,-2),fov:46},
      {position:add(rail,18,8,17),lookAt:add(rail,-8,1,-4),fov:42},
      {position:add(convoy,-13,5,10),lookAt:add(convoy,5,1,-3),fov:38},
      {position:add(tank,-9,4,11),lookAt:add(tank,0,1.7,0),fov:34},
      {position:add(tank,0,3.6,8.5),lookAt:add(exit,0,1.5,0),fov:46}
    ];
  }
  function applyBeat(index){
    if(!active||index===active.beat)return;
    active.beat=index;
    var beat=active.beats[index]||BEATS[index];
    active.api.setSubtitle(beat.text,beat.speaker);
    active.api.onBeat(beat,index,STARTS[index]);
  }
  function cleanup(state){
    if(!state||state.cleaned)return;
    state.cleaned=true;
    state.api.clearSubtitle();
    state.api.setMusicDuck(1);
    state.api.lockControls(false);
  }
  function finish(notify){
    var state=active;
    if(!state||state.finished)return false;
    state.finished=true;
    active=null;
    cleanup(state);
    if(notify)state.api.onComplete();
    return true;
  }
  function beatAt(time){
    for(var index=STARTS.length-1;index>0;index--)if(time>=STARTS[index])return index;
    return 0;
  }
  function cameraPose(){
    if(!active)return null;
    var index=active.beat;
    var next=Math.min(index+1,active.poses.length-1);
    var span=(STARTS[next]||END_TIME)-STARTS[index];
    var progress=next===index?1:(active.elapsed-STARTS[index])/Math.max(.001,span);
    var t=smoothstep(progress);
    var from=active.poses[index],to=active.poses[next];
    return {position:lerp(from.position,to.position,t),lookAt:lerp(from.lookAt,to.lookAt,t),fov:from.fov+(to.fov-from.fov)*t};
  }
  function start(layout){
    if(!layout||typeof layout!=='object')return false;
    if(active)finish(false);
    var api=apiFrom(configured);
    active={api:api,layout:layout,poses:makePoses(layout),beats:Array.isArray(layout.cinematicDialogue)&&layout.cinematicDialogue.length===BEATS.length?layout.cinematicDialogue:BEATS,elapsed:0,beat:-1,cleaned:false,finished:false};
    api.lockControls(true);
    api.setMusicDuck(.55);
    applyBeat(0);
    return true;
  }
  function update(dt){
    if(!active)return false;
    active.elapsed+=Math.max(0,number(dt,0));
    if(active.elapsed>=END_TIME)return finish(true);
    applyBeat(beatAt(active.elapsed));
    return true;
  }
  function skip(){return finish(true);}
  function requestSkip(event){
    if(!active||!event)return false;
    var type=event.type||'';
    var key=event.key||event.code||'';
    var accepted=(type==='keydown'&&(key==='Escape'||key==='Space'||key===' '))||
      (type==='click'&&(event.button===undefined||event.button===0))||type==='touchstart'||type==='touchend';
    if(!accepted)return false;
    if(typeof event.preventDefault==='function')event.preventDefault();
    return skip();
  }
  function dispose(){return finish(false);}
  function reset(){return finish(false);}
  function snapshot(){return active?{elapsed:active.elapsed,beat:active.beat,beatStart:STARTS[active.beat]}:null;}
  function configure(api){configured=api||{};return controller;}

  var controller={configure:configure,start:start,update:update,skip:skip,requestSkip:requestSkip,dispose:dispose,reset:reset,isActive:function(){return !!active;},cameraPose:cameraPose,snapshot:snapshot};
  global.OpeningCinematic=controller;
})(globalThis);
