// Rendered support comes from the same ordered floor regions as movement.
const at = (regions, x, z) => regions.find(r => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ);
// Check the whole footprint against ordered floor precedence, including region seams.
export function supportedFloor(regions, x, z, halfX = 0, halfZ = 0) {
  const centre = at(regions, x, z);
  if (!centre) return null;
  const xs = [x-halfX, x+halfX, ...regions.flatMap(r=>[r.minX,r.maxX]).filter(v=>v>x-halfX && v<x+halfX)].sort((a,b)=>a-b);
  const zs = [z-halfZ, z+halfZ, ...regions.flatMap(r=>[r.minZ,r.maxZ]).filter(v=>v>z-halfZ && v<z+halfZ)].sort((a,b)=>a-b);
  const samples = a => [...a, ...a.slice(1).map((v,i)=>(v+a[i])/2)];
  for (const px of samples(xs)) for (const pz of samples(zs)) if (at(regions,px,pz)?.y !== centre.y) return null;
  return centre;
}
export function floorPatches(regions) {
  const xs = [...new Set(regions.flatMap(r => [r.minX, r.maxX]))].sort((a,b)=>a-b);
  const zs = [...new Set(regions.flatMap(r => [r.minZ, r.maxZ]))].sort((a,b)=>a-b);
  const patches = [];
  for (let zi=0; zi<zs.length-1; zi++) {
    let last;
    for (let xi=0; xi<xs.length-1; xi++) {
      const source=at(regions,(xs[xi]+xs[xi+1])/2,(zs[zi]+zs[zi+1])/2);
      if (!source) { last=null; continue; }
      if(last && last.y===source.y && last.maxX===xs[xi]) last.maxX=xs[xi+1];
      else { last={minX:xs[xi],maxX:xs[xi+1],minZ:zs[zi],maxZ:zs[zi+1],y:source.y}; patches.push(last); }
    }
  }
  return patches;
}
export function boundarySegments(patches) {
  const xs=[...new Set(patches.flatMap(r=>[r.minX,r.maxX]))].sort((a,b)=>a-b);
  const zs=[...new Set(patches.flatMap(r=>[r.minZ,r.maxZ]))].sort((a,b)=>a-b);
  const edges=[];
  for(const r of patches) {
    if(r.y<6) continue;
    for(const [nx,nz] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const axis=nx?zs:xs, min=nx?r.minZ:r.minX,max=nx?r.maxZ:r.maxX;
      const cuts=axis.filter(v=>v>=min&&v<=max);
      for(let i=0;i<cuts.length-1;i++) {
        const mid=(cuts[i]+cuts[i+1])/2;
        const x=nx?(nx<0?r.minX:r.maxX):mid, z=nz?(nz<0?r.minZ:r.maxZ):mid;
        const neighbor=at(patches,x+nx*.01,z+nz*.01);
        if(!neighbor || neighbor.y<r.y-1.05) edges.push({x,z,nx,nz,y:r.y,length:cuts[i+1]-cuts[i]});
      }
    }
  }
  // Join coplanar edges so structural corners do not become a forest of posts.
  const groups=new Map();
  for(const e of edges) {
    const key=[e.nx,e.nz,e.y,e.nx?e.x:e.z].join(':');
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(e);
  }
  const joined=[];
  for(const group of groups.values()) {
    group.sort((a,b)=>(a.nx?a.z:a.x)-(b.nx?b.z:b.x));
    let last;
    for(const e of group) {
      const centre=e.nx?'z':'x';
      if(last && Math.abs(last[centre]+last.length/2-(e[centre]-e.length/2))<1e-6){
        const start=last[centre]-last.length/2; last.length+=e.length; last[centre]=start+last.length/2;
      } else { last={...e}; joined.push(last); }
    }
  }
  return joined;
}
export function boundsVisible(b,p,radius) {
  const dx=Math.max(b.minX-p.x,0,p.x-b.maxX),dz=Math.max(b.minZ-p.z,0,p.z-b.maxZ);
  const dy=Math.max(b.minY-(p.y??0),0,(p.y??0)-b.maxY);
  return Math.hypot(dx,dz)<=radius && dy<=12;
}
export function entityBounds(entity) {
  const bounds={minX:Infinity,minY:Infinity,minZ:Infinity,maxX:-Infinity,maxY:-Infinity,maxZ:-Infinity};
  for(const render of entity.findComponents?.('render')||[]) for(const mesh of render.meshInstances||[]) {
    const a=mesh.aabb;if(!a)continue;
    for(const [axis,upper] of [['x','X'],['y','Y'],['z','Z']]) {
      bounds[`min${upper}`]=Math.min(bounds[`min${upper}`],a.center[axis]-a.halfExtents[axis]);
      bounds[`max${upper}`]=Math.max(bounds[`max${upper}`],a.center[axis]+a.halfExtents[axis]);
    }
  }
  if(!Number.isFinite(bounds.minX)) {
    const p=entity.getPosition();return {minX:p.x,maxX:p.x,minY:p.y,maxY:p.y,minZ:p.z,maxZ:p.z};
  }
  return bounds;
}

export function buildArchitecture(rt) {
  const {mats,pc,state,FLOOR_REGIONS:regions}=rt;
  const patches=floorPatches(regions), edges=boundarySegments(patches);
  const box=(name,p,s,m)=>rt.primitive('box',name,p,s,m);
  const surfaceMaterials=new Map();
  function surfaceMaterial(base,r) {
    const width=r.maxX-r.minX,depth=r.maxZ-r.minZ;
    const key=[base.id,width,depth,r.minX,r.minZ].join(':');
    if(!surfaceMaterials.has(key)) {
      const mat=base.clone(); mat.diffuseMapTiling=new pc.Vec2(width/3,depth/3);
      mat.diffuseMapOffset=new pc.Vec2(r.minX/3,r.minZ/3); mat.update();surfaceMaterials.set(key,mat);
    }
    return surfaceMaterials.get(key);
  }
  for(const r of patches) {
    const w=r.maxX-r.minX,d=r.maxZ-r.minZ,thickness=r.y>=6?.4:.18;
    const deck=box('Authored floor deck',[(r.minX+r.maxX)/2,r.y+rt.STREET_SURFACE_Y-thickness/2,(r.minZ+r.maxZ)/2],[w,thickness,d],surfaceMaterial(r.y>=6?mats.roofStone:mats.roadSand,r));
    deck.castShadows=false;
    if(r.y>0) box('Terrace supporting masonry',[(r.minX+r.maxX)/2,(r.y-thickness)/2,(r.minZ+r.maxZ)/2],[w,r.y-thickness,d],mats.houseOchre);
  }
  for(const e of edges) {
    const pos=[e.x+e.nx*.17,e.y+.38,e.z+e.nz*.17];
    const dims=e.nx?[.28,.76,e.length]:[e.length,.76,.28];
    box('Terrace edge parapet',pos,dims,mats.houseLime);
    box('Terrace edge coping',[pos[0],e.y+.8,pos[2]],e.nx?[.4,.12,e.length]:[e.length,.12,.4],mats.stoneLight);
  }
  let pavilion=0;
  for(const e of edges) {
    if(e.length<5)continue;
    for(let along=-e.length/2+2.5;along<e.length/2-1.8;along+=7.5) {
      const x=e.x+e.nz*along+e.nx*2.15,z=e.z+e.nx*along+e.nz*2.15;
      const w=e.nx?3.6:4.2,d=e.nx?4.2:3.6;
      // These masses stand outside every playable floor, including lower paths.
      if(regions.some(r=>x+w/2>r.minX && x-w/2<r.maxX && z+d/2>r.minZ && z-d/2<r.maxZ))continue;
      const height=3.4+(pavilion%3)*.55,top=e.y+height;
      box('Upper town pavilion',[x,top/2,z],[w,top,d],[mats.houseLime,mats.houseOchre,mats.houseRose][pavilion%3]);
      box('Pavilion carved cornice',[x,top-.25,z],[w+.22,.22,d+.22],mats.stoneLight);
      box('Pavilion flat roof',[x,top+.08,z],[w+.28,.26,d+.28],mats.roofStone);
      const front=[x-e.nx*(w/2+.016),e.y+1.65,z-e.nz*(d/2+.016)];
      box('Pavilion recessed jali',front,e.nx?[.04,1.55,1.25]:[1.25,1.55,.04],mats.windowRecess);
      for(const t of [-.4,0,.4])box('Jali carved upright',[front[0]+e.nz*t-e.nx*.04,front[1],front[2]+e.nx*t-e.nz*.04],e.nx?[.08,1.55,.055]:[.055,1.55,.08],mats.stoneLight);
      if(pavilion%3===0) {
        box('Pavilion shrine drum',[x,top+.46,z],[1.45,.5,1.45],mats.stoneLight);
        rt.primitive('sphere','Pavilion shrine dome',[x,top+.96,z],[1.8,.8,1.8],mats.stoneLight);
        rt.primitive('cylinder','Pavilion shrine finial',[x,top+1.5,z],[.075,.55,.075],mats.gold);
      }
      pavilion++;
    }
  }
  // Retain the exact solid frontages while replacing disjoint pointed-arch kit pieces.
  for (const c of rt.WORLD_COLLIDERS.filter(c=>c[6]==='Wall_Plaster_Straight')) {
    const [minX,maxX,minZ,maxZ]=c,w=maxX-minX,d=maxZ-minZ,x=(minX+maxX)/2,z=(minZ+maxZ)/2;
    box('Solid carved upper frontage',[x,7.75,z],[w,3.5,d],mats.houseOchre);
    box('Upper frontage cornice',[x,9.42,z],[w,.16,d],mats.stoneLight);
    const horizontal=w>d,length=horizontal?w:d;
    for(let t=-length/2+1.3;t<length/2-.7;t+=2.6) for(const sign of [-1,1]) {
      const px=horizontal?x+t:x+sign*(w/2+.006),pz=horizontal?z+sign*(d/2+.006):z+t;
      box('Upper frontage jali recess',[px,7.95,pz],horizontal?[1,1.3,.012]:[.012,1.3,1],mats.windowRecess);
      for(const offset of [-.32,0,.32]) box('Upper frontage carved jali',[px+(horizontal?offset:sign*.012),7.95,pz+(horizontal?sign*.012:offset)],horizontal?[.045,1.3,.035]:[.035,1.3,.045],mats.stoneLight);
    }
  }
  // Rectilinear toranas use the measured existing post footprints; the opening stays clear.
  for (const ids of [['torana-left','torana-right'],['gate-torana-left','gate-torana-right']]) {
    const posts=ids.map(id=>rt.WORLD_COLLIDERS.find(c=>c[5]===id));
    if(posts.some(c=>!c))continue;
    for(const c of posts) box('Solid torana stone post',[(c[0]+c[1])/2,7.35,(c[2]+c[3])/2],[c[1]-c[0],2.7,c[3]-c[2]],mats.stoneLight);
    const minX=Math.min(...posts.map(c=>c[0])),maxX=Math.max(...posts.map(c=>c[1])),minZ=Math.min(...posts.map(c=>c[2])),maxZ=Math.max(...posts.map(c=>c[3]));
    box('Carved torana lintel',[(minX+maxX)/2,8.83,(minZ+maxZ)/2],[maxX-minX,.26,maxZ-minZ],mats.stoneLight);
  }
  state.architectureEvidence={patches,edges,pavilions:pavilion};
}

// Give imported street houses a carved-plaster front, using the existing solid
// ground footprint. Doors in the fortification and rescue assemblies are separate.
export function adaptStreetHouse(rt, entity, bounds, index) {
  const { mats } = rt;
  const collider=rt.WORLD_COLLIDERS.find(c=>c[6]===entity.name &&
    Math.abs((c[0]+c[1])/2-(bounds.minX+bounds.maxX)/2)<.7 &&
    Math.abs((c[2]+c[3])/2-(bounds.minZ+bounds.maxZ)/2)<.7);
  const minX=collider?.[0]??bounds.minX,maxX=collider?.[1]??bounds.maxX;
  const minZ=collider?.[2]??bounds.minZ,maxZ=collider?.[3]??bounds.maxZ;
  const x=(minX+maxX)/2,z=(minZ+maxZ)/2,w=maxX-minX,d=maxZ-minZ;
  const upperFloors=rt.FLOOR_REGIONS.filter(r=>r.y>bounds.minY+1 && minX<r.maxX && maxX>r.minX && minZ<r.maxZ && maxZ>r.minZ);
  const base=bounds.minY,top=Math.min(bounds.maxY-.12,...upperFloors.map(r=>r.y-.25)),height=top-base;
  const root=new rt.pc.Entity(`${entity.name} carved street facade`);rt.state.app.root.addChild(root);
  const box=(name,p,s,m)=>rt.primitive('box',name,p,s,m,root);
  // Replace the imported front silhouette rather than layering coincident walls.
  for(const render of entity.findComponents('render')) render.enabled=false;
  box('Carved plaster house body',[x,(base+top)/2,z],[w,height,d],[mats.houseLime,mats.houseOchre,mats.houseRose][index%3]);
  for(const y of [base+.24,base+height*.48,top-.16])
    box('House sandstone string course',[x,y,z],[w,.16,d],mats.stoneLight);
  box('House flat roof coping',[x,top+.02,z],[w,.22,d],mats.roofStone);
  for(const [nx,nz,length] of [[-1,0,d],[1,0,d],[0,-1,w],[0,1,w]]) {
    const faceX=x+nx*w/2,faceZ=z+nz*d/2;
    const count=Math.max(1,Math.floor(length/2.15));
    for(let col=0;col<count;col++) for(const y of [base+1.75,base+height*.71]) {
      const along=(col-(count-1)/2)*1.9;
      const px=faceX+nz*along,pz=faceZ+nx*along;
      box('House recessed jali',[px+nx*.008,y,pz+nz*.008],nx?[.016,1.45,.9]:[.9,1.45,.016],mats.windowRecess);
      for(const t of [-.3,0,.3])
        box('House carved jali upright',[px+nz*t+nx*.025,y,pz+nx*t+nz*.025],nx?[.055,1.45,.045]:[.045,1.45,.055],mats.stoneLight);
      for(const dy of [-.76,0,.76])
        box('House carved window rail',[px+nx*.025,y+dy,pz+nz*.025],nx?[.055,.055,1]:[1,.055,.055],mats.stoneLight);
    }
  }
  if(index%3===0 && upperFloors.length===0) {
    box('Street shrine roof drum',[x,top+.4,z],[1.55,.6,1.55],mats.stoneLight);
    rt.primitive('sphere','Street shrine roof dome',[x,top+.93,z],[1.85,.75,1.85],mats.stoneLight,root);
    rt.primitive('cylinder','Street shrine finial',[x,top+1.52,z],[.075,.5,.075],mats.gold,root);
  }
  // The permanent facade and all its trim are batched once after asset creation.
  for(const render of root.findComponents('render')) if(rt.state.staticBatchGroup) render.batchGroupId=rt.state.staticBatchGroup.id;
  entity.dwarkaFacadeRoot=root;
}
