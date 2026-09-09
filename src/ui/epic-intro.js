(function(global){
  const INTRO_MS=2600;
  const MIN_LOADER_MS=4200;
  let started=false,loaded=false,loaderStartedAt=0,finishing=false;

  function finish(){
    if(finishing||!loaded||!loaderStartedAt)return;
    finishing=true;
    const remain=Math.max(0,MIN_LOADER_MS-(Date.now()-loaderStartedAt));
    setTimeout(()=>{
      const loader=document.getElementById('loading');
      if(loader)loader.classList.add('done');
      if(typeof showMainMenu==='function')showMainMenu();
    },remain);
  }
  function start(){
    if(started)return; started=true;
    const splash=document.getElementById('epicIntro');
    setTimeout(()=>{
      if(splash)splash.classList.add('out');
      loaderStartedAt=Date.now();
      finish();
    },INTRO_MS);
  }
  global.EpicIntro={start,markLoaded(){loaded=true;finish();}};
  start();
})(window);
