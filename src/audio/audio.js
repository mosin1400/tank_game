/* ================= صدا ================= */
let actx=null,master=null,muted=false,noiseB=null;
let engO=null,engO2=null,engG=null,engF=null;
function initAudio(){
  if(actx){actx.resume&&actx.resume();return;}
  try{
    actx=new (window.AudioContext||window.webkitAudioContext)();
    master=actx.createGain(); master.gain.value=0.5; master.connect(actx.destination);
    const len=actx.sampleRate*1.2;
    noiseB=actx.createBuffer(1,len,actx.sampleRate);
    const d=noiseB.getChannelData(0);
    for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
  }catch(e){}
}
function startEngine(){
  if(!actx||engO)return;
  engO=actx.createOscillator(); engO.type='sawtooth'; engO.frequency.value=36;
  engO2=actx.createOscillator(); engO2.type='square'; engO2.frequency.value=18;
  engF=actx.createBiquadFilter(); engF.type='lowpass'; engF.frequency.value=240;
  engG=actx.createGain(); engG.gain.value=0;
  engO.connect(engF); engO2.connect(engF); engF.connect(engG); engG.connect(master);
  engO.start(); engO2.start();
}
function updateEngine(){
  if(!engG||!player)return;
  const sp=Math.abs(player.speed);
  const on=state==='play'&&!player.dead&&!paused;
  const target=on?(0.05+sp*0.006):0;
  engG.gain.value+=(target-engG.gain.value)*0.08;
  engO.frequency.value=32+sp*6.5;
  engO2.frequency.value=16+sp*3.2;
  if(on&&engF)engF.frequency.value=180+sp*25;
}
function sFire(vol=1,tone=1){
  if(!actx||muted)return; const t0=actx.currentTime;
  const src=actx.createBufferSource(); src.buffer=noiseB;
  const f=actx.createBiquadFilter(); f.type='lowpass';
  f.frequency.setValueAtTime(2600,t0); f.frequency.exponentialRampToValueAtTime(180,t0+0.26);
  const g=actx.createGain(); g.gain.setValueAtTime(0.45*vol,t0);
  g.gain.exponentialRampToValueAtTime(0.001,t0+0.3);
  src.connect(f); f.connect(g); g.connect(master); src.start(t0); src.stop(t0+0.32);
  const o=actx.createOscillator(); o.type='sine';
  o.frequency.setValueAtTime(150*tone,t0); o.frequency.exponentialRampToValueAtTime(42*tone,t0+0.2);
  const og=actx.createGain(); og.gain.setValueAtTime(0.5*vol,t0);
  og.gain.exponentialRampToValueAtTime(0.001,t0+0.22);
  o.connect(og); og.connect(master); o.start(t0); o.stop(t0+0.24);
}
function sRocket(vol=1){
  if(!actx||muted)return; const t0=actx.currentTime;
  const src=actx.createBufferSource(); src.buffer=noiseB;
  const f=actx.createBiquadFilter(); f.type='bandpass';
  f.frequency.setValueAtTime(400,t0); f.frequency.exponentialRampToValueAtTime(1800,t0+0.3);
  const g=actx.createGain(); g.gain.setValueAtTime(0.3*vol,t0);
  g.gain.exponentialRampToValueAtTime(0.001,t0+0.35);
  src.connect(f); f.connect(g); g.connect(master); src.start(t0); src.stop(t0+0.4);
}
function sBoom(vol=1,big=1){
  if(!actx||muted)return; const t0=actx.currentTime,dur=0.9*big+0.3;
  const src=actx.createBufferSource(); src.buffer=noiseB; src.loop=true;
  const f=actx.createBiquadFilter(); f.type='lowpass';
  f.frequency.setValueAtTime(500,t0); f.frequency.exponentialRampToValueAtTime(55,t0+dur);
  const g=actx.createGain(); g.gain.setValueAtTime(0.7*vol,t0);
  g.gain.exponentialRampToValueAtTime(0.001,t0+dur);
  src.connect(f); f.connect(g); g.connect(master); src.start(t0); src.stop(t0+dur+0.05);
  const o=actx.createOscillator(); o.type='sine';
  o.frequency.setValueAtTime(85,t0); o.frequency.exponentialRampToValueAtTime(24,t0+dur*0.8);
  const og=actx.createGain(); og.gain.setValueAtTime(0.5*vol,t0);
  og.gain.exponentialRampToValueAtTime(0.001,t0+dur*0.85);
  o.connect(og); og.connect(master); o.start(t0); o.stop(t0+dur);
}
function sHit(vol=1){
  if(!actx||muted)return; const t0=actx.currentTime;
  const o=actx.createOscillator(); o.type='triangle';
  o.frequency.setValueAtTime(740,t0); o.frequency.exponentialRampToValueAtTime(180,t0+0.13);
  const g=actx.createGain(); g.gain.setValueAtTime(0.3*vol,t0);
  g.gain.exponentialRampToValueAtTime(0.001,t0+0.15);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0+0.16);
}
function sClick(){
  if(!actx||muted)return; const t0=actx.currentTime;
  const o=actx.createOscillator(); o.type='square'; o.frequency.value=950;
  const g=actx.createGain(); g.gain.setValueAtTime(0.1,t0);
  g.gain.exponentialRampToValueAtTime(0.001,t0+0.05);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0+0.06);
}
function sPickup(){
  if(!actx||muted)return; const t0=actx.currentTime;
  const o=actx.createOscillator(); o.type='sine';
  o.frequency.setValueAtTime(520,t0); o.frequency.setValueAtTime(880,t0+0.09);
  const g=actx.createGain(); g.gain.setValueAtTime(0.28,t0);
  g.gain.exponentialRampToValueAtTime(0.001,t0+0.22);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0+0.24);
}
function sMG(vol=1){
  if(!actx||muted)return; const t0=actx.currentTime;
  const src=actx.createBufferSource(); src.buffer=noiseB;
  const f=actx.createBiquadFilter(); f.type='highpass'; f.frequency.value=900;
  const g=actx.createGain(); g.gain.setValueAtTime(0.12*vol,t0);
  g.gain.exponentialRampToValueAtTime(0.001,t0+0.06);
  src.connect(f); f.connect(g); g.connect(master); src.start(t0); src.stop(t0+0.07);
}
function sVictory(){
  if(!actx||muted)return; const t0=actx.currentTime;
  [523,659,784].forEach((fq,i)=>{
    const o=actx.createOscillator(); o.type='sine'; o.frequency.value=fq;
    const g=actx.createGain();
    g.gain.setValueAtTime(0.0001,t0+i*0.13);
    g.gain.exponentialRampToValueAtTime(0.25,t0+i*0.13+0.03);
    g.gain.exponentialRampToValueAtTime(0.001,t0+i*0.13+0.4);
    o.connect(g); g.connect(master); o.start(t0+i*0.13); o.stop(t0+i*0.13+0.45);
  });
}

