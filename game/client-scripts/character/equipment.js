export function installEquipment(rt) {
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

  function boxBetweenLocal(entity, parent, from, to, thickness) {
    const fromWorld = parent.getWorldTransform().transformPoint(from, new pc.Vec3());
    const toWorld = parent.getWorldTransform().transformPoint(to, new pc.Vec3());
    const middle = fromWorld.clone().add(toWorld).mulScalar(0.5);
    entity.setPosition(middle);
    entity.lookAt(toWorld);
    entity.setLocalScale(thickness, thickness, Math.max(0.001, fromWorld.distance(toWorld)));
  }

  function characterModelKey(name) {
    if (name === "Vrishaketu") return "Vrishaketu_Composite";
    if (name === "archer") return "Raider_Archer_Composite";
    if (name === "brute") return "Brute_Composite";
    if (name === "skirmisher" || name.startsWith("Family 2")) return "Male_Peasant_Composite";
    return "Female_Peasant_Composite";
  }

  function mountApprovedSword(root) {
    if (!root?.dwarkaSword || root.dwarkaSwordModel) return Boolean(root?.dwarkaSwordModel);
    const approved = rt.instantiateModel(
      "Sword_Bronze",
      `${root.name} approved sword`,
      [0, -0.03, 0],
      root.dwarkaSwordModelScale || 0.92,
      0,
      root.dwarkaSword,
    );
    if (!approved) return false;
    root.dwarkaSwordFallback.forEach((part) => part.destroy());
    root.dwarkaSwordFallback = [];
    root.dwarkaSwordModel = approved;
    return true;
  }

  function attachSword(root, label = "bronze blade", modelScale = 0.92) {
    if (root.dwarkaSword) {
      mountApprovedSword(root);
      return;
    }
    const model = root.dwarkaVisual;
    const rightHand = model?.findByName("hand_r") || root;
    const sword = new pc.Entity(`${root.name} ${label}`);
    rightHand.addChild(sword);
    sword.setLocalPosition(0, -0.08, -0.02);
    sword.setLocalEulerAngles(0, 0, 0);
    root.dwarkaSword = sword;
    root.dwarkaSwordModelScale = modelScale;
    root.dwarkaSwordFallback = [];
    if (!mountApprovedSword(root)) {
      root.dwarkaSwordFallback = [
        rt.primitive(
          "box",
          "Visible bronze blade",
          [0, 0.43, 0],
          [0.045, 0.45, 0.018],
          mats.steel,
          sword,
        ),
        rt.primitive("box", "Blade guard", [0, 0, 0], [0.22, 0.04, 0.06], mats.gold, sword),
        rt.primitive("cylinder", "Blade grip", [0, -0.11, 0], [0.04, 0.14, 0.04], mats.wood, sword),
      ];
    }
    const trail = rt.primitive(
      "box",
      "Blade motion trail",
      [0, 0.38, 0.045],
      [0.11, 0.76, 0.015],
      mats.weaponTrail,
      sword,
    );
    trail.castShadows = false;
    trail.enabled = false;
    root.dwarkaSwordTrail = trail;
  }

  function attachBow(root) {
    const model = root?.dwarkaVisual;
    if (!model || root.dwarkaBow) return;
    const leftHand = model.findByName("hand_l") || root;
    const bow = new pc.Entity(`${root.name} bow`);
    root.addChild(bow);
    root.dwarkaBowHand = leftHand;
    root.dwarkaBowDrawHand = model.findByName("hand_r");
    // The slight lateral recurve keeps the bow readable from the over-shoulder
    // camera; a depth-only curve appears as a rigid pole when seen downrange.
    const points = [
      new pc.Vec3(0, 0, 0),
      new pc.Vec3(-0.006, 0.24, -0.04),
      new pc.Vec3(-0.016, 0.46, -0.12),
      new pc.Vec3(-0.032, 0.67, -0.26),
      new pc.Vec3(-0.055, 0.86, -0.45),
    ];
    root.dwarkaBowLimbs = [];
    for (let index = 0; index < points.length - 1; index += 1) {
      for (const sign of [-1, 1]) {
        const from = new pc.Vec3(points[index].x, points[index].y * sign, points[index].z);
        const to = new pc.Vec3(
          points[index + 1].x,
          points[index + 1].y * sign,
          points[index + 1].z,
        );
        const entity = rt.primitive(
          "box",
          `Bow ${sign > 0 ? "upper" : "lower"} limb ${index + 1}`,
          [0, 0, 0],
          [0.03, 0.03, 0.25],
          mats.bowWood,
          bow,
        );
        entity.castShadows = false;
        root.dwarkaBowLimbs.push({
          entity,
          from,
          to,
          thickness: Math.max(0.026, 0.043 - index * 0.005),
        });
      }
    }
    const grip = rt.primitive(
      "box",
      "Leather bow grip",
      [0, 0, 0],
      [0.045, 0.17, 0.05],
      mats.bowGrip,
      bow,
    );
    grip.castShadows = false;
    for (const y of [-0.12, 0.12]) {
      const band = rt.primitive(
        "box",
        "Bow grip binding",
        [0, y, 0],
        [0.055, 0.024, 0.06],
        mats.gold,
        bow,
      );
      band.castShadows = false;
    }
    for (const y of [-0.86, 0.86]) {
      const nock = rt.primitive(
        "sphere",
        "Bronze bow nock",
        [-0.055, y, -0.45],
        [0.03, 0.035, 0.03],
        mats.gold,
        bow,
      );
      nock.castShadows = false;
    }
    const upperString = rt.primitive(
      "box",
      "Bow string upper",
      [0, 0, 0],
      [0.006, 0.006, 0.5],
      mats.bowCord,
      bow,
    );
    const lowerString = rt.primitive(
      "box",
      "Bow string lower",
      [0, 0, 0],
      [0.006, 0.006, 0.5],
      mats.bowCord,
      bow,
    );
    upperString.castShadows = false;
    lowerString.castShadows = false;
    const arrow = rt.primitive(
      "box",
      "Nocked arrow",
      [0, 0, 0],
      [0.018, 0.018, 0.55],
      mats.gold,
      bow,
    );
    arrow.castShadows = false;
    const arrowHead = rt.primitive(
      "sphere",
      "Nocked arrow head",
      [0, 0, 0],
      [0.032, 0.032, 0.032],
      mats.steel,
      bow,
    );
    arrowHead.castShadows = false;
    root.dwarkaBowStrings = [upperString, lowerString];
    root.dwarkaNockedArrow = arrow;
    root.dwarkaNockedArrowHead = arrowHead;
    bow.enabled = root.name !== "Vrishaketu";
    root.dwarkaBow = bow;
  }

  function ensureCharacterEquipment(root) {
    if (!root?.dwarkaVisual) return;
    if (root.name === "Vrishaketu") {
      attachSword(root);
      attachBow(root);
    } else if (root.name === "archer") attachBow(root);
    else if (root.name === "skirmisher") attachSword(root, "raider blade");
    else if (root.name === "brute") attachSword(root, "heavy bronze blade", 1.15);
  }

  function syncEquipmentSockets(root) {
    if (!root?.dwarkaBow?.enabled || !root.dwarkaBowHand) return;
    root.dwarkaBow.setPosition(root.dwarkaBowHand.getPosition());
    root.dwarkaBow.setEulerAngles(0, root.getEulerAngles().y, 0);
    const upper = new pc.Vec3(-0.055, 0.84, -0.43),
      lower = new pc.Vec3(-0.055, -0.84, -0.43);
    let pull = new pc.Vec3(0, 0.02, 0.48);
    for (const segment of root.dwarkaBowLimbs)
      boxBetweenLocal(segment.entity, root.dwarkaBow, segment.from, segment.to, segment.thickness);
    const drawing = ["aim", "fire", "archerWarn"].includes(root.dwarkaAnimState);
    if (drawing && root.dwarkaBowDrawHand) {
      const inverse = root.dwarkaBow.getWorldTransform().clone().invert();
      const localHand = inverse.transformPoint(root.dwarkaBowDrawHand.getPosition(), new pc.Vec3());
      // The retargeted draw pose owns the nock: following the wrist exactly
      // keeps both string halves and the arrow attached through every frame.
      // Axis-wise clamps made the pull look detached whenever the torso
      // rotated farther than the placeholder pistol pose used to allow.
      if ([localHand.x, localHand.y, localHand.z].every(Number.isFinite) && localHand.length() < 2)
        pull.copy(localHand);
    }
    const released =
      root.dwarkaAnimState === "fire" && performance.now() - (root.dwarkaAnimStartedAt || 0) > 170;
    if (released) pull.set(0, 0, 0);
    root.dwarkaBowPullWorld = root.dwarkaBow
      .getWorldTransform()
      .transformPoint(pull, new pc.Vec3());
    boxBetweenLocal(root.dwarkaBowStrings[0], root.dwarkaBow, upper, pull, 0.008);
    boxBetweenLocal(root.dwarkaBowStrings[1], root.dwarkaBow, lower, pull, 0.008);
    const arrowPull = new pc.Vec3(0, pc.math.clamp(pull.y, -0.12, 0.12), pull.z);
    const arrowEnd = new pc.Vec3(0, arrowPull.y, -0.88);
    boxBetweenLocal(root.dwarkaNockedArrow, root.dwarkaBow, arrowPull, arrowEnd, 0.018);
    root.dwarkaNockedArrow.enabled = drawing && !released;
    root.dwarkaNockedArrowHead.setLocalPosition(arrowEnd);
    root.dwarkaNockedArrowHead.enabled = drawing && !released;
  }

  function updateWeaponEffects(root) {
    if (!root) return;
    const elapsed = performance.now() - (root.dwarkaAnimStartedAt || 0);
    if (root.dwarkaSwordTrail)
      root.dwarkaSwordTrail.enabled =
        root.dwarkaAnimState === "melee" && elapsed >= 90 && elapsed <= 310;
  }

  rt.boxBetweenLocal = boxBetweenLocal;
  rt.characterModelKey = characterModelKey;
  rt.mountApprovedSword = mountApprovedSword;
  rt.attachSword = attachSword;
  rt.attachBow = attachBow;
  rt.ensureCharacterEquipment = ensureCharacterEquipment;
  rt.syncEquipmentSockets = syncEquipmentSockets;
  rt.updateWeaponEffects = updateWeaponEffects;
}
