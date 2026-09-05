export function buildCivicDressing(rt) {
  const {mats,state,pc}=rt;
  const box=(n,p,s,m,parent)=>{const e=rt.primitive('box',n,p,s,m,parent);if(n.startsWith('Distant')) e.castShadows=false;return e;};
  const cylinder=(n,p,s,m,parent)=>{const e=rt.primitive('cylinder',n,p,s,m,parent);if(n.startsWith('Distant')) e.castShadows=false;return e;};
  // The well stays inside its original 2.3 m obstacle, with a real hollow shaft.
  for(let row=0;row<3;row++) for(let i=0;i<20;i++) {
    const a=(i+(row%2)*.5)*Math.PI/10;
    const stone=box('Arrival well masonry',[4+Math.sin(a)*.93,.19+row*.27,14+Math.cos(a)*.93],[.3,.255,.29],row%2?mats.stoneLight:mats.houseLime);
    stone.setEulerAngles(0,a*180/Math.PI,0);
  }
  cylinder('Well water in shaft',[4,.18,14],[1.52,.035,1.52],mats.windowRecess);
  for(const x of [3.08,4.92])box('Well timber upright',[x,1.22,14],[.14,2.36,.18],mats.wood);
  box('Well lifting crossbeam',[4,2.36,14],[2.1,.17,.22],mats.wood);
  cylinder('Well lowering rope',[4,1.58,14],[.027,1.4,.027],mats.sideMargin);
  // Fixtures use permanent facade bounds. Their brackets touch the masonry and
  // their housings sit above head height, outside the player collision volume.
  const stands=[];
  for(const c of rt.WORLD_COLLIDERS) {
    const [minX,maxX,minZ,maxZ,,id,visual]=c;
    if(!visual?.startsWith('RevampHouse') && visual!=='Wall_Plaster_Straight')continue;
    const y=visual==='Wall_Plaster_Straight'?6:0;
    const x=(minX+maxX)/2,z=(minZ+maxZ)/2;
    const candidates=[[minX,z,-1,0],[maxX,z,1,0],[x,minZ,0,-1],[x,maxZ,0,1]];
    const nearest=candidates.map(([px,pz,nx,nz])=>({px,pz,nx,nz,d:Math.min(...rt.ROUTE_SEGMENTS.filter(r=>r.y===y).map(r=>Math.hypot(px+nx-r.x,pz+nz-r.z)))})).sort((a,b)=>a.d-b.d)[0];
    if(stands.some(s=>Math.hypot(s[0]-nearest.px,s[1]-nearest.pz)<3))continue;
    stands.push([nearest.px,nearest.pz]);
    const {px,pz,nx,nz}=nearest;
    const root=new pc.Entity(`Mounted masonry lamp ${id}`);
    state.app.root.addChild(root);root.setPosition(px+nx*.2,y,pz+nz*.2);
    box('Lantern mounting bracket',[-nx*.1,2.76,-nz*.1],nx?[.4,.07,.07]:[.07,.07,.4],mats.iron,root);
    box('Lamp bronze housing',[0,2.76,0],[.32,.48,.32],mats.iron,root);
    const glass=rt.material([1,.58,.2],[1,.32,.035]);glass.emissiveIntensity=1.6;glass.update();
    box('Lantern luminous pane',[nx*.168,2.76,nz*.168],nx?[.022,.34,.24]:[.24,.34,.022],glass,root);
    const light=new pc.Entity('Attached lantern light');root.addChild(light);light.setLocalPosition(nx*.35,2.7,nz*.35);
    light.addComponent('light',{type:'omni',color:new pc.Color(1,.64,.31),intensity:.65,range:6,castShadows:false});
    rt.registerFireLight(light,.65,px+pz);
  }
  // Full-size cloth awnings are anchored by posts within the existing stall footprint.
  const stall=rt.WORLD_COLLIDERS.find(c=>c[5]==='upper-market-stall');
  if(stall) {
    const x=(stall[0]+stall[1])/2,z=(stall[2]+stall[3])/2;
    for(const side of [-1,1])box('Market stall canopy post',[x+side*.43,7.06,z],[.065,2.05,.065],mats.wood);
    box('Market stall woven canopy',[x,8.11,z],[.98,.065,.98],mats.magenta);
  }
  // Give the destination mass behind the authored door, outside the playable boundary.
  box('Palace rear hall',[12,11.6,-61.8],[17.2,11.2,7.4],mats.houseRose);
  box('Palace roof cornice',[12,17.2,-61.8],[17.8,.4,7.8],mats.stoneLight);
  box('Palace roof terrace',[12,17.45,-61.8],[17.5,.25,7.6],mats.roofStone);
  cylinder('Palace central drum',[12,18,-61.6],[3.4,1.0,3.4],mats.houseLime);
  rt.primitive('sphere','Palace central dome',[12,18.95,-61.6],[4,1.65,4],mats.stoneLight);
  cylinder('Palace dome finial',[12,20.1,-61.6],[.09,.9,.09],mats.gold);
  // Distant city masses replace the unrelated photographic tree horizon.
  for(let i=0;i<23;i++) {
    const a=i*Math.PI*2/23, radius=55+(i%3)*7;
    const x=Math.cos(a)*radius,z=-15+Math.sin(a)*radius,h=8+(i%5)*1.9;
    box('Distant city house',[x,h/2,z],[5+(i%3),h,5],i%2?mats.houseOchre:mats.houseLime);
    box('Distant city cornice',[x,h,z],[5.5+(i%3),.3,5.5],mats.stoneLight);
    if(i%4===0){cylinder('Distant shrine drum',[x,h+.5,z],[2,1,2],mats.houseRose);rt.primitive('sphere','Distant shrine dome',[x,h+1.3,z],[2.6,1.1,2.6],mats.stoneLight).castShadows=false;}
  }
}
