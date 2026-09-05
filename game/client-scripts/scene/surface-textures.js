// Small, deterministic material maps. Metre-based tiling is assigned by the deck builder.
export function surfaceTexture(pc, device, kind) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;
  const c=canvas.getContext('2d');
  let seed=37;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  c.fillStyle=kind==='roof'?'#d0bda1':kind==='wood'?'#b49979':'#baa687';c.fillRect(0,0,256,256);
  for(let i=0;i<6500;i++){
    const a=.02+random()*.065;c.fillStyle=`rgba(${random()>.5?'255,246,223':'67,45,27'},${a})`;
    const x=random()*256,y=random()*256;c.fillRect(x,y,kind==='wood'?1:2,kind==='wood'?8+random()*30:1+random()*2);
  }
  if(kind==='roof'){
    c.strokeStyle='rgba(82,61,44,.32)';c.lineWidth=1.5;
    for(let row=0;row<4;row++){
      const y=row*64;c.beginPath();c.moveTo(0,y);c.lineTo(256,y);c.stroke();
      for(let x=(row%2)*64;x<=256;x+=128){c.beginPath();c.moveTo(x,y);c.lineTo(x,y+64);c.stroke();}
    }
  }
  const texture=new pc.Texture(device,{width:256,height:256,mipmaps:true});texture.setSource(canvas);
  texture.addressU=texture.addressV=pc.ADDRESS_REPEAT;texture.anisotropy=8;return texture;
}
export function flameTexture(pc,device){
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=256;
  const c=canvas.getContext('2d');
  const gradient=c.createLinearGradient(0,250,0,8);
  gradient.addColorStop(0,'rgba(255,238,161,0)');gradient.addColorStop(.08,'rgba(255,239,151,.95)');
  gradient.addColorStop(.3,'rgba(255,183,65,.95)');gradient.addColorStop(.7,'rgba(240,77,12,.7)');gradient.addColorStop(1,'rgba(245,63,10,0)');
  c.fillStyle=gradient;c.beginPath();c.moveTo(64,250);c.bezierCurveTo(5,218,49,168,43,111);c.bezierCurveTo(85,146,57,49,74,8);c.bezierCurveTo(72,91,111,166,102,203);c.bezierCurveTo(96,238,80,248,64,250);c.fill();
  const texture=new pc.Texture(device,{width:128,height:256,mipmaps:true});texture.setSource(canvas);
  texture.addressU=texture.addressV=pc.ADDRESS_CLAMP_TO_EDGE;return texture;
}
export function nightSkyTexture(pc,device) {
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=256;
  const c=canvas.getContext('2d'), g=c.createLinearGradient(0,0,0,256);
  g.addColorStop(0,'#07101f');g.addColorStop(.48,'#28394c');g.addColorStop(.56,'#233142');g.addColorStop(1,'#101824');
  c.fillStyle=g;c.fillRect(0,0,512,256);
  for(let i=0;i<85;i++) {
    const x=(i*137.508)%512,y=12+(i*i*7.13)%94;
    c.fillStyle=i%5?'rgba(204,219,231,.3)':'rgba(228,235,242,.6)';c.fillRect(x,y,i%5?.6:1,1);
  }
  const texture=new pc.Texture(device,{width:512,height:256,mipmaps:true});texture.setSource(canvas);return texture;
}
