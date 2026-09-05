export function installDressing(rt) {
  const { state, ui, pc, canvas, mats } = rt;
  const WORLD_BOUNDS = rt.WORLD_BOUNDS;
  const WORLD_COLLIDERS = rt.WORLD_COLLIDERS;
  const FLOOR_REGIONS = rt.FLOOR_REGIONS;
  const ROUTE_SEGMENTS = rt.ROUTE_SEGMENTS;
  const ENVIRONMENT_PLACEMENTS = rt.ENVIRONMENT_PLACEMENTS;
  const STREET_HOUSE_BAYS = rt.STREET_HOUSE_BAYS;
  const TALL_HOUSE_BAYS = rt.TALL_HOUSE_BAYS;
  const SETBACK_HOUSE_BAYS = rt.SETBACK_HOUSE_BAYS;
  const LANDMARKS = rt.LANDMARKS;
  const STREET_HOUSE_MODEL_KEYS = rt.STREET_HOUSE_MODEL_KEYS;
  const UPPER_HOUSE_MODEL_KEYS = rt.UPPER_HOUSE_MODEL_KEYS;
  const UPPER_HOUSE_FRONTS = rt.UPPER_HOUSE_FRONTS;
  const GROUND_ALIGNED_MODELS = rt.GROUND_ALIGNED_MODELS;
  const STREET_SURFACE_Y = rt.STREET_SURFACE_Y;
  const CHARACTER_GROUND_LIFT = rt.CHARACTER_GROUND_LIFT;
  const floorHeightAt = rt.floorHeightAt;
  const STORY = rt.STORY;
  const STORY_VOICE_LINES = rt.STORY_VOICE_LINES;
  const EFFECT_URLS = rt.EFFECT_URLS;
  const TUTORIAL_STEPS = rt.TUTORIAL_STEPS;
  const PLAYABLE_PHASES = rt.PLAYABLE_PHASES;
  const MODEL_URLS = rt.MODEL_URLS;
  const CHAPTER_CONFIG = rt.CHAPTER_CONFIG;
  const ChapterSimulation = rt.ChapterSimulation;
  const CHARACTER_ANIMATIONS = rt.CHARACTER_ANIMATIONS;
  const PHASE_DETAILS = rt.PHASE_DETAILS;
  const UI_MESSAGES = rt.UI_MESSAGES;
  const assetUrl = rt.assetUrl;
  const chapterAssetRevision = rt.chapterAssetRevision;
  const angleDifference = rt.angleDifference;
  const targetLineBlocked = rt.targetLineBlocked;
  const safeWebSocketEndpoint = rt.safeWebSocketEndpoint;
  const CHARACTER_ANIMATION_SPEEDS = rt.CHARACTER_ANIMATION_SPEEDS;
  const characterStateGraph = rt.characterStateGraph;
  const animationSpeeds = rt.animationSpeeds;
  const t = rt.t;
  const sendParent = rt.sendParent;
  const strings = rt.strings;
  const localizedMessage = rt.localizedMessage;
  const clearInput = rt.clearInput;
  const queuePressed = rt.queuePressed;

  function createSunEmblem(x, y, z, facing = 0) {
    const root = new pc.Entity("Mounted sun emblem");
    state.app.root.addChild(root);root.setPosition(x,y,z);root.setEulerAngles(0,facing,0);
    const emblem = rt.primitive("cylinder", "Gold sun emblem", [0,0,0], [.34,.055,.34], mats.gold,root);
    emblem.setLocalEulerAngles(90,0,0);
    for(let ray=0;ray<8;ray++) {
      const angle=ray*Math.PI/4;
      const spoke=rt.primitive("box","Sun ray",[Math.cos(angle)*.3,Math.sin(angle)*.3,0],[.15,.03,.03],mats.gold,root);
      spoke.setLocalEulerAngles(0,0,ray*45);
    }
  }

  function createBunting(z, height, paletteOffset = 0, left = -9.5, right = 9.5) {
    if (!state.pennantMesh)
      state.pennantMesh = pc.createMesh(
        state.app.graphicsDevice,
        [-0.5, 0.42, 0, 0.5, 0.42, 0, 0, -0.58, 0],
        {
          normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
          uvs: [0, 0, 1, 0, 0.5, 1],
          indices: [0, 1, 2],
        },
      );
    const points = [];
    for (let index = 0; index < 13; index += 1) {
      const progress = index / 12;
      points.push(
        new pc.Vec3(
          left + progress * (right-left),
          height - Math.sin(progress * Math.PI) * 0.64,
          z,
        ),
      );
    }
    for (let index = 0; index < points.length - 1; index += 1) {
      const cord = rt.primitive(
        "box",
        "Sagging festival cord",
        [0, 0, 0],
        [0.015, 0.015, 1],
        mats.wood,
      );
      cord.castShadows = false;
      rt.boxBetweenLocal(
        cord,
        state.app.root,
        points[index],
        points[index + 1],
        0.015,
      );
    }
    for (let index = 0; index < 11; index += 1) {
      const anchor = points[index + 1];
      const pennant = new pc.Entity("Triangular festival pennant");
      const instance = new pc.MeshInstance(
        state.pennantMesh,
        mats.buntingPalette[
          (index + paletteOffset) % mats.buntingPalette.length
        ],
      );
      pennant.addComponent("render", { meshInstances: [instance] });
      state.app.root.addChild(pennant);
      pennant.setPosition(anchor.x, anchor.y - 0.23, anchor.z);
      pennant.setLocalScale(0.46, 0.52, 1);
      pennant.setEulerAngles(0, 0, (index + paletteOffset) % 2 ? 6 : -6);
      pennant.render.castShadows = false;
      pennant.render.receiveShadows = true;
    }
  }

  function createRegionalSkyline() {
    // The only street span is fixed to the two existing arrival facades.
    // Upper spans anchor to the retained boundary frontages, above the deck.
    createBunting(16.1, 5.4, 0, -10.45, 10.45);
    for (const x of [6,18]) rt.primitive('cylinder','Festival cord anchor',[x,9.82,-41],[.09,.8,.09],mats.wood);
    createBunting(-41, 10.15, 1, 6.0, 18.0);

  }

  function decorateTurnWalls() {
    if (rt.ENVIRONMENT_REVAMP?.mode === "arrival-candidate") return;
    for (const [z, columns, motifX, textileColor] of [
      [-3.67, [-9.1, -6.5, -3.9, -1.3, 1.2], -5.2, mats.turquoise],
      [-17.87, [-1.15, 1.7, 4.55, 7.4, 9.95], 4.45, mats.magenta],
    ]) {
      for (const x of [columns[1], columns[3]]) {
        const cloth = rt.primitive(
          "box",
          "Dyed turn-wall textile",
          [x, 0.86, z - 0.03],
          [1.08, 1.08, 0.035],
          textileColor,
        );
        cloth.castShadows = false;
      }
      createSunEmblem(motifX, 1.02, z - 0.08);
    }
  }

  function createDoorwayLandmark() {
    const landmark = LANDMARKS.doorway;
    if (!landmark) return;
    for (const spec of landmark.primitives || []) {
      const entity = rt.primitive(
        spec.type,
        spec.name,
        spec.position,
        spec.scale,
        mats[spec.material] || mats.stone,
      );
      entity.castShadows = !/runner|dome|crown/i.test(spec.name);
      entity.receiveShadows = true;
      rt.registerDoorEntity(entity, spec.name, spec.position);
    }
    if (landmark.sunEmblem) createSunEmblem(...landmark.sunEmblem);
    for (const [x, y, z, facing] of landmark.torches || [])
      rt.createWallTorch(x, y, z, facing);
    const fillSpec = landmark.fireFill;
    if (!fillSpec) return;
    const fill = new pc.Entity("Doorway fire fill");
    fill.addComponent("light", {
      type: "omni",
      color: new pc.Color(1, 0.48, 0.24),
      intensity: fillSpec.intensity,
      range: fillSpec.range,
      castShadows: false,
    });
    fill.setPosition(...fillSpec.position);
    rt.registerFireLight(fill, fillSpec.intensity, 4.2);
    state.app.root.addChild(fill);
  }

  rt.createSunEmblem = createSunEmblem;
  rt.createBunting = createBunting;
  rt.createRegionalSkyline = createRegionalSkyline;
  rt.decorateTurnWalls = decorateTurnWalls;
  rt.createDoorwayLandmark = createDoorwayLandmark;
}
