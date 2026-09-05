import assert from 'node:assert/strict';
import test from 'node:test';
import layout from '../world-layout.json' with {type:'json'};
import {floorPatches, boundarySegments, boundsVisible, supportedFloor} from './architecture.js';

const contains=(r,x,z)=>x>=r.minX&&x<=r.maxX&&z>=r.minZ&&z<=r.maxZ;
test('visible decks cover the complete authoritative floor without overlapping elevations',()=>{
 const patches=floorPatches(layout.floorRegions);
 for(let x=-27.75;x<28;x+=.5) for(let z=-57.75;z<34;z+=.5){
  const expected=layout.floorRegions.find(r=>contains(r,x,z));
  const actual=patches.filter(r=>contains(r,x,z));
  assert.equal(actual.length,expected?1:0,`surface coverage ${x},${z}`);
  if(expected) assert.equal(actual[0].y,expected.y,`surface elevation ${x},${z}`);
 }
});
test('upper boundary structures exclude joined floors and the staircase entrance',()=>{
 const edges=boundarySegments(floorPatches(layout.floorRegions));
 for(const edge of edges){
  const outside=layout.floorRegions.find(r=>contains(r,edge.x+edge.nx*.1,edge.z+edge.nz*.1));
  assert.ok(!outside||outside.y<edge.y-1.05,'boundary obstructs a connected floor');
 }
 assert.ok(!edges.some(e=>e.x===-6&&e.z===-16),'stair landing sealed');
});
test('a tall building remains visible from its roof level and culls only beyond its bounds',()=>{
 const bounds={minX:-26,maxX:-20,minY:0,maxY:12,minZ:-28,maxZ:-18};
 assert.equal(boundsVisible(bounds,{x:-20,y:6,z:-26},42),true);
 assert.equal(boundsVisible(bounds,{x:-20,y:6,z:80},42),false);
});

test('dressing support respects overlapping elevations and rejects holes and ledges',()=>{
 assert.equal(supportedFloor(layout.floorRegions,-9,-17,.36,.36)?.y,6);
 assert.equal(supportedFloor(layout.floorRegions,5,-29,.36,.36)?.y,6);
 assert.equal(supportedFloor(layout.floorRegions,-2.8,-9,.25,1.8),null);
 const regions=[{minX:0,maxX:1,minZ:0,maxZ:2,y:1},{minX:0,maxX:3,minZ:0,maxZ:3,y:0}];
 assert.equal(supportedFloor(regions,1.1,1,.5,.5),null,'lower overlapping region hides a step under the footprint');
});
test('authored brazier and ash elevations match authoritative floor support',()=>{
 for(const key of ['streetBraziers','routeBraziers','ashes','ruts']) for(const [x,y,z] of layout.surfaceDetails[key]) {
  assert.equal(supportedFloor(layout.floorRegions,x,z)?.y,y,`${key} at ${x},${z} is buried or floating`);
 }
});
test('large retained stall and cart placements have matching solid footprints',()=>{
 for(const key of ['Kenney_stall_green','Kenney_cart']) for(const [x,,z] of layout.placements[key]) {
  assert.ok(layout.colliders.some(c=>c.visual===key&&contains(c,x,z)),`${key} at ${x},${z} has no solid footprint`);
 }
});
