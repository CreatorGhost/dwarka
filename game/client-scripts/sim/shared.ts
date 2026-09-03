export { ChapterSimulation } from "../../server/src/chapter-1/simulation.ts";
export {
  DOOR_COLLIDERS,
  DOORS,
  doorColliderFromTransform,
  floorHeightAt as sharedFloorHeightAt,
  segmentBlocked,
} from "../../server/src/chapter-1/collision.ts";
export { default as CHAPTER_CONFIG } from "../../config/chapter-1.json" with { type: "json" };
