/* ================= صحنهٔ ۰۱: آتش در سرو ================= */
(function(root){
  const freezeTree=value=>{
    if(value&&typeof value==='object'&&!Object.isFrozen(value)){
      Object.values(value).forEach(freezeTree); Object.freeze(value);
    }
    return value;
  };
  root.OpeningScene01=freezeTree({
    id:'scene-01',
    playerSpawn:[-76,0,92],
    zones:[
      {id:'yard',title:'بیداری در آتش',objective:'مریم و کاروان را از حیاط سوخت خارج کن',bounds:[-112,42,28,126]},
      {id:'broken-road',title:'جادهٔ شکسته',objective:'کاروان را از کانال و باغ سوخته عبور بده',bounds:[-18,104,-28,92]},
      {id:'watch-hill',title:'چشم روی تپه',objective:'چشم دشمن را خاموش و گذرگاه خروج را نگه دار',bounds:[62,166,-110,28]}
    ],
    convoyPath:[
      {id:'truck-1',start:[-68,0,82],stops:[[-42,0,62],[18,0,28],[118,0,-42]]},
      {id:'truck-2',start:[-77,0,74],stops:[[-50,0,55],[10,0,22],[110,0,-35]]},
      {id:'truck-3',start:[-86,0,67],stops:[[-58,0,49],[2,0,16],[102,0,-28]]}
    ],
    checkpoints:[
      {id:'m01-yard',zone:'yard',player:[-76,0,92]},
      {id:'m01-road',zone:'broken-road',player:[-12,0,72]},
      {id:'m01-hill',zone:'watch-hill',player:[68,0,8]}
    ],
    encounters:[
      {id:'yard-scout-a',zone:'yard',type:'light',position:[-26,0,86],stationary:false},
      {id:'yard-scout-b',zone:'yard',type:'light',position:[-16,0,58],stationary:true},
      {id:'road-ambush-a',zone:'broken-road',type:'light',position:[42,0,54],stationary:true},
      {id:'road-ambush-b',zone:'broken-road',type:'medium',position:[53,0,4],stationary:false},
      {id:'hill-commander',zone:'watch-hill',type:'medium',position:[114,0,-18],stationary:true,hp:430}
    ],
    landmarks:{
      fuelYard:[-68,0,78],railSiding:[-98,0,40],canalBridge:[12,0,30],burnedOrchard:[45,0,46],
      watchTower:[126,0,-60],generator:[108,0,-46],exitGate:[118,0,-38]
    },
    cinematicBeats:[
      {id:'m01-intro',duration:5},{id:'m01-road-transition',duration:4},
      {id:'m01-hill-transition',duration:4},{id:'m01-outro',duration:6}
    ]
  });
})(globalThis);
