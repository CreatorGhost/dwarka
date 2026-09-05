export const CHARACTER_ANIMATIONS = Object.freeze({
  idle: "Idle_Loop",
  walk: "Walk_Loop",
  jog: "Jog_Fwd_Loop",
  sprint: "Sprint_Loop",
  enemyWalk: "Walk_Loop",
  melee: "Sword_Attack",
  dodge: "Roll",
  hit: "Hit_Chest",
  down: "Death01",
  aim: "Bow_Aim_Loop",
  fire: "Bow_Release",
  archerWarn: "Bow_Aim_Loop",
  bruteWarn: "Heavy_Overhead",
  interact: "Interact",
});

const NPC_DETAIL_RENDER_NODES = new Set([
  "Eyes",
  "Eyebrows",
  "Male_Ranger_Acc_Pauldron",
  "Male_Ranger_Arms_Bracer",
  "Male_Ranger_Body_Belt_1",
  "Male_Ranger_Body_Belt_2",
]);

export function keepCharacterRenderDetail(rootName, nodeName) {
  return (
    rootName === "Vrishaketu" ||
    rootName === "Chitra" ||
    !NPC_DETAIL_RENDER_NODES.has(nodeName)
  );
}

export function animationSpeeds(config) {
  return Object.freeze({
    idle: 1,
    walk: 1,
    jog: 1,
    sprint: 1.12,
    enemyWalk: 1,
    melee: 1,
    dodge: config.feel.dodgeClipSeconds / config.feel.dodgeActionSeconds,
    hit: 1,
    down: 1,
    aim: 1,
    fire: 1,
    archerWarn: 1,
    bruteWarn: 1,
    interact: 1,
  });
}

export function enemyWalkPlaybackSpeed(actualSpeed) {
  return Math.max(0.68, Math.min(1.48, actualSpeed / 1.55));
}

export function characterStateGraph() {
  const actionStates = [
    "idle",
    "enemyWalk",
    "melee",
    "dodge",
    "hit",
    "down",
    "fire",
    "archerWarn",
    "bruteWarn",
    "interact",
  ].map((name) => ({
    name,
    loop: ![
      "melee",
      "dodge",
      "hit",
      "down",
      "fire",
      "bruteWarn",
      "interact",
    ].includes(name),
    speed: 1,
  }));
  return {
    layers: [
      {
        name: "Base",
        states: [
          { name: "START" },
          {
            name: "locomotion",
            loop: true,
            blendTree: {
              type: "1D",
              parameter: "locomotionSpeed",
              syncAnimations: true,
              children: [
                { name: "idle", point: 0 },
                { name: "walk", point: 1.8 },
                { name: "jog", point: 4.5 },
                { name: "sprint", point: 6.5 },
              ],
            },
          },
          ...actionStates,
        ],
        transitions: [{ from: "START", to: "locomotion", time: 0 }],
      },
      {
        name: "Upper body aim",
        weight: 0,
        states: [{ name: "START" }, { name: "upperAim", loop: true }],
        transitions: [{ from: "START", to: "upperAim", time: 0 }],
      },
    ],
    parameters: { locomotionSpeed: { type: "FLOAT", value: 0 } },
  };
}

export function installAnimation(rt) {
  const { state, ui, pc, canvas, mats } = rt;
  const WORLD_BOUNDS = rt.WORLD_BOUNDS;
  const WORLD_COLLIDERS = rt.WORLD_COLLIDERS;
  const FLOOR_REGIONS = rt.FLOOR_REGIONS;
  const ROUTE_SEGMENTS = rt.ROUTE_SEGMENTS;
  const ENVIRONMENT_PLACEMENTS = rt.ENVIRONMENT_PLACEMENTS;
  const STREET_HOUSE_BAYS = rt.STREET_HOUSE_BAYS;
  const TALL_HOUSE_BAYS = rt.TALL_HOUSE_BAYS;
  const SETBACK_HOUSE_BAYS = rt.SETBACK_HOUSE_BAYS;
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

  function groundAnimatedCharacter(root, dt) {
    if (!root?.enabled || !root.dwarkaVisual) return;
    const position = root.getPosition();
    const floorY =
      Number(root.dwarkaFloorY) || floorHeightAt(position.x, position.z);
    const baseY = floorY + CHARACTER_GROUND_LIFT * (root.dwarkaScale || 1);
    root.setPosition(position.x, baseY, position.z);
    const footwear = (root.dwarkaFootwearMeshInstances ||= root.dwarkaVisual
      .findComponents("render")
      .filter((render) => /Feet/.test(render.entity.name))
      .flatMap((render) => render.meshInstances || []));
    if (footwear.length === 0) return;
    const currentOffset = Number(root.dwarkaGroundOffset) || 0;
    const minimum = Math.min(
      ...footwear.map(
        (instance) => instance.aabb.center.y - instance.aabb.halfExtents.y,
      ),
    );
    const uncorrectedMinimum = minimum;
    const targetOffset = pc.math.clamp(
      floorY + STREET_SURFACE_Y - uncorrectedMinimum,
      -0.025,
      0.11,
    );
    const blend = 1 - Math.exp(-Math.min(0.05, Math.max(0, dt)) * 24);
    root.dwarkaGroundOffset = pc.math.lerp(currentOffset, targetOffset, blend);
    root.setPosition(position.x, baseY + root.dwarkaGroundOffset, position.z);
  }

  function locomotionPlaybackSpeed(animation, actualSpeed) {
    if (!(actualSpeed > 0)) return CHARACTER_ANIMATION_SPEEDS[animation] || 1;
    if (animation === "walk")
      return pc.math.clamp((1.02 * actualSpeed) / 4.5, 0.68, 1.28);
    if (animation === "sprint")
      return pc.math.clamp((1.12 * actualSpeed) / 6.5, 0.9, 1.4);
    if (animation === "enemyWalk")
      return enemyWalkPlaybackSpeed(actualSpeed);
    return CHARACTER_ANIMATION_SPEEDS[animation] || 1;
  }
  function setupModelAnimation(model) {
    if (!model || !state.animationTracks.Idle_Loop) return;
    if (model.dwarkaAnimationReady) return;
    if (!model.anim) {
      model.addComponent("anim", { activate: false });
      model.anim.loadStateGraph(characterStateGraph());
    }
    for (const [stateName, clipName] of Object.entries(CHARACTER_ANIMATIONS))
      if (state.animationTracks[clipName])
        model.anim.assignAnimation(stateName, state.animationTracks[clipName]);
    for (const [node, clipName] of [
      ["idle", "Idle_Loop"],
      ["walk", "Walk_Loop"],
      ["jog", "Jog_Fwd_Loop"],
      ["sprint", "Sprint_Loop"],
    ])
      if (state.animationTracks[clipName])
        model.anim.baseLayer.assignAnimation(
          `locomotion.${node}`,
          state.animationTracks[clipName],
        );
    const upperBody = model.anim.findAnimationLayer("Upper body aim");
    if (upperBody && state.animationTracks.Bow_Aim_Loop) {
      upperBody.assignAnimation("upperAim", state.animationTracks.Bow_Aim_Loop);
      const spine =
        model.findByName("spine_02") ||
        model.findByName("spine_01") ||
        model.findByName("Spine");
      if (spine) upperBody.mask = { [spine.path]: { children: true } };
      upperBody.play("upperAim");
    }
    if (model.anim.activate) {
      model.dwarkaAnimationReady = true;
      return;
    }
    model.anim.activate = true;
    model.anim.enabled = true;
    model.anim.baseLayer.transition("locomotion", 0);
    model.anim.playing = true;
    model.anim.baseLayer.play();
    model.dwarkaAnimationReady = true;
  }

  function setupCharacterAnimation(root) {
    if (!root) return;
    setupModelAnimation(root.dwarkaVisual);
    if (root.dwarkaVisual?.anim && !root.dwarkaAnimState)
      root.dwarkaAnimState = "idle";
  }

  function setCharacterAnimation(root, desired, actualSpeed = null) {
    if (!root?.dwarkaVisual) return;
    setupCharacterAnimation(root);
    const anim = root.dwarkaVisual.anim;
    if (anim)
      anim.speed = Number.isFinite(actualSpeed)
        ? locomotionPlaybackSpeed(desired, actualSpeed)
        : CHARACTER_ANIMATION_SPEEDS[desired] || 1;
    const isPlayer = root.name === "Vrishaketu";
    const playerLocomotion =
      isPlayer &&
      ["idle", "walk", "jog", "sprint", "locomotion", "aim"].includes(desired);
    if (anim && playerLocomotion) {
      anim.setFloat("locomotionSpeed", Math.max(0, Number(actualSpeed) || 0));
    }
    if (anim && isPlayer) {
      const upperBody = (root.dwarkaUpperBodyAimLayer ||=
        anim.findAnimationLayer("Upper body aim"));
      if (upperBody)
        upperBody.weight = desired === "aim" && !state.paused ? 1 : 0;
    }
    const baseDesired = playerLocomotion ? "locomotion" : desired;
    if (
      root.dwarkaAnimState === desired ||
      (!CHARACTER_ANIMATIONS[desired] && desired !== "locomotion")
    )
      return;
    if (anim)
      anim.baseLayer.transition(baseDesired, desired === "down" ? 0.05 : 0.12);
    root.dwarkaAnimState = desired;
    root.dwarkaAnimStartedAt = performance.now();
  }

  function upgradeCharacter(root) {
    if (!root) return;
    if (root.dwarkaUpgraded) {
      rt.ensureCharacterEquipment(root);
      return;
    }
    const model = rt.instantiateModel(
      root.dwarkaModelKey,
      `${root.name} outfit`,
      [0, 0, 0],
      root.dwarkaScale,
      180,
      root,
    );
    if (!model) return;
    root.dwarkaUpgraded = true;
    root.dwarkaVisual = model;
    if (root.name === "skirmisher" || root.name.startsWith("Family")) {
      for (const render of model.findComponents("render")) for (const instance of render.meshInstances || []) {
        if (!/peasant|ranger/i.test(instance.material?.name || "")) continue;
        const cloth=instance.material.clone();
        cloth.diffuse=new pc.Color(...(root.name === "skirmisher" ? [.55,.16,.12] : [.21,.56,.5]));
        cloth.update();instance.material=cloth;
      }
    }
    for (const render of model.findComponents("render"))
      if (!keepCharacterRenderDetail(root.name, render.entity.name))
        render.enabled = false;
    root.dwarkaFootwearMeshInstances = null;
    root.dwarkaUpperBodyAimLayer = null;
    root.children
      .filter((child) => child.tags?.has("greybox"))
      .forEach((child) => child.destroy());
    rt.ensureCharacterEquipment(root);
    setupCharacterAnimation(root);
  }

  function applyAnimationFreeze(frozen) {
    for (const root of state.characterRoots) {
      const anim = root.dwarkaVisual?.anim;
      if (!anim) continue;
      if (frozen) {
        if (root.dwarkaAnimationSpeedBeforeFreeze === undefined)
          root.dwarkaAnimationSpeedBeforeFreeze = anim.speed;
        anim.speed = 0;
        if (state.paused && root.dwarkaUpperBodyAimLayer)
          root.dwarkaUpperBodyAimLayer.weight = 0;
      } else if (root.dwarkaAnimationSpeedBeforeFreeze !== undefined) {
        anim.speed = root.dwarkaAnimationSpeedBeforeFreeze;
        root.dwarkaAnimationSpeedBeforeFreeze = undefined;
      }
    }
  }

  rt.groundAnimatedCharacter = groundAnimatedCharacter;
  rt.locomotionPlaybackSpeed = locomotionPlaybackSpeed;
  rt.setupModelAnimation = setupModelAnimation;
  rt.setupCharacterAnimation = setupCharacterAnimation;
  rt.setCharacterAnimation = setCharacterAnimation;
  rt.applyAnimationFreeze = applyAnimationFreeze;
  rt.upgradeCharacter = upgradeCharacter;
}
