/* ================= صحنهٔ ۰۲: خاک نرم ================= */
(function(root){
  const freezeTree=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freezeTree);Object.freeze(value);}return value;};
  root.SoftGroundScene02=freezeTree({
    id:'scene-02',
    playerSpawn:[-78,0,86],
    zones:[
      {id:'causeway',title:'خاکریز نخست',objective:'پمپ‌خانه و کمین خاکریز را پاکسازی کن',bounds:[-104,-28,42,116]},
      {id:'timber-crossing',title:'گذرگاه الواری',objective:'ضدزره پنهان را پیش از شکستن سد متوقف کن',bounds:[-25,42,-30,76]},
      {id:'broken-lock',title:'آب‌بند شکسته',objective:'کاروان را از آب‌بند تا خروجی عبور بده',bounds:[45,142,-112,18]}
    ],
    convoyPath:[
      {id:'m02-truck-1',start:[-70,0,78],stops:[[-42,0,62],[15,0,30],[104,0,-48]]},
      {id:'m02-truck-2',start:[-79,0,70],stops:[[-50,0,56],[8,0,24],[96,0,-40]]},
      {id:'m02-truck-3',start:[-87,0,63],stops:[[-58,0,50],[1,0,18],[89,0,-33]]}
    ],
    checkpoints:[
      {id:'m02-causeway',zone:'causeway',player:[-78,0,86]},
      {id:'m02-timber',zone:'timber-crossing',player:[-14,0,58]},
      {id:'m02-lock',zone:'broken-lock',player:[58,0,10]}
    ],
    encounters:[
      {id:'pump-scout-a',zone:'causeway',type:'light',position:[-40,0,42],stationary:true},
      {id:'pump-scout-b',zone:'causeway',type:'light',position:[-21,0,58],stationary:false},
      {id:'timber-guard',zone:'timber-crossing',type:'medium',position:[38,0,8],stationary:true,hp:360},
      {id:'reeds-flanker',zone:'timber-crossing',type:'light',position:[30,0,-14],stationary:false},
      {id:'lock-medium',zone:'broken-lock',type:'medium',position:[100,0,-35],stationary:false,hp:430},
      {id:'lock-flanker',zone:'broken-lock',type:'light',position:[82,0,-70],stationary:false}
    ],
    landmarks:{
      fuelYard:[-54,0,64],railSiding:[-67,0,46],canalBridge:[14,0,30],burnedOrchard:[42,0,22],
      watchTower:[50,0,3],generator:[-42,0,47],exitGate:[108,0,-48],pumpHouse:[-45,0,48],
      timberCrossing:[14,0,30],brokenLock:[61,0,-4],reedTower:[53,0,2]
    },
    cinematicDialogue:[
      {speaker:'راوی',text:'رهان زیر مه خوابیده؛ اما گل، هر چرخ را به خود می‌کشد.'},
      {speaker:'رامین',text:'کامیون جلو در خاک نرم نشسته. پمپ‌خانه را بگیر تا راه خاکریز باز شود.'},
      {speaker:'سارا',text:'دشمن پشت نی‌زار روی گذرگاه نشسته؛ کنار زره حرکت کنید.'},
      {speaker:'فرمانده',text:'تانک پیش می‌رود. کاروان فقط وقتی حرکت می‌کند که مسیر امن باشد.'},
      {speaker:'راوی',text:'هدف: ستون را از مرداب رهان به آب‌بند خروجی برسان.'}
    ],
    cinematicBeats:[{id:'m02-intro',duration:5},{id:'m02-crossing',duration:4},{id:'m02-lock',duration:4},{id:'m02-outro',duration:6}]
  });
})(globalThis);
