import assert from "node:assert/strict";
import test from "node:test";
import { keepArrivalCandidateLegacyPlacement } from "./build.js";
import worldLayout from "../world-layout.json" with { type: "json" };

test("the visible stair retaining wall survives arrival-candidate culling", () => {
  const revamp = worldLayout.environmentRevamp;
  for (const x of [3, 5, 7, 9])
    assert.equal(
      keepArrivalCandidateLegacyPlacement(
        "Wall_Plaster_Straight",
        [x, 0, -18.02, 0, 1],
        revamp,
      ),
      true,
      `stair boundary module at x=${x} was culled`,
    );
  assert.equal(
    keepArrivalCandidateLegacyPlacement(
      "Wall_Plaster_Straight",
      [1, 0, -7, 90, 1],
      revamp,
    ),
    false,
    "unrelated legacy wall should remain culled",
  );
});

test('both openable doors and their child meshes stay out of static batches', async () => {
  const { installBuild } = await import('./build.js');
  const root={};
  const doors=worldLayout.doors.filter(d=>d.openFromPhase).map(d=>({name:d.entity,dwarkaDynamicDoor:true,parent:root}));
  const renders=doors.map(door=>({entity:{name:'door mesh',parent:door}}));
  const streamed={entity:{name:'streamed crate',dwarkaStreamedEnvironment:true,parent:root}};
  const wall={entity:{name:'static wall',parent:root}};
  root.findComponents=()=>[...renders,streamed,wall];
  const rt={state:{app:{root,batcher:{addGroup:()=>({id:9})}}},pc:{},ui:{},mats:{}};
  installBuild(rt);rt.batchStaticEnvironment();
  for(const render of renders) assert.equal(render.batchGroupId,undefined,'moving door was baked');
  assert.equal(wall.batchGroupId,9);
  assert.equal(streamed.batchGroupId,undefined,'streaming a prop must not dirty the permanent scenery batch');
});
