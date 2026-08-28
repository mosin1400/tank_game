import fs from 'node:fs/promises';
import vm from 'node:vm';

const source=await fs.readFile(new URL('../src/render/renderer.js',import.meta.url),'utf8');
const gradient=()=>({addColorStop(){}});
const drawingContext={
  fillStyle:'',strokeStyle:'',globalAlpha:1,lineCap:'',lineWidth:1,
  createRadialGradient:gradient,createLinearGradient:gradient,
  fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){}
};
class Texture{
  constructor(path){this.path=path;this.repeat={x:1,y:1,set:(x,y)=>{this.repeat.x=x;this.repeat.y=y;}};}
}
class CanvasTexture extends Texture{constructor(canvas){super('canvas');this.canvas=canvas;}}
class TextureLoader{load(path){return new Texture(path);}}
class Material{constructor(options){Object.assign(this,options);}}
const THREE={CanvasTexture,TextureLoader,MeshStandardMaterial:Material,RepeatWrapping:1,SRGBColorSpace:2};
const context=vm.createContext({
  THREE,document:{createElement:()=>({width:0,height:0,getContext:()=>drawingContext})},maxAniso:8,
  texOlive:null,texCast:null,texRust:null,texGray:null,texGround:null,texWall:null,texSky:null,texSmoke:null,texGlow:null,texTankSteel:null,
  matOlive:null,matCast:null,matRust:null,matGray:null,matGrayL:null,matGrayH:null,matPz1:null,matPz2:null,matPz3:null,matPz4:null,
  matDark:null,matChar:null,matRoof:null,matTrunk:null,matLeaf:null,matRock:null,matHill:null,matBag:null,matShellP:null,matShellE:null,matRocket:null,matMG:null,
  console,Math
});
vm.runInContext(`${source};makeTextures();makeMaterials();`,context);
if(context.texGround.path!=='assets/images/m01-muddy-ground.png')throw new Error(`generated muddy ground texture is not loaded: ${context.texGround.path}`);
if(context.texGround.repeat.x!==48||context.texGround.repeat.y!==48)throw new Error('ground texture repeat must be tuned for battlefield scale');
if(!context.matOlive.map||context.matOlive.map.path!=='assets/images/tank-worn-olive-steel.png')throw new Error('player tank does not use worn steel texture');
for(const key of ['matPz1','matPz2','matPz3','matPz4'])if(context[key].map!==context.matOlive.map)throw new Error(`${key} must share the optimized tank texture`);
const colors=new Set(['matPz1','matPz2','matPz3','matPz4'].map(key=>context[key].color));
if(colors.size!==4)throw new Error('campaign tank recognition tints must remain distinct');
console.log('PASS: generated ground and tank textures are wired into runtime materials');
