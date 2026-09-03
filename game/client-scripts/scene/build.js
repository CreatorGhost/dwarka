import { createObjectPool } from "../runtime/object-pool.js";

export function familyMemberTransforms(phase, anchor, familyStaging = {}) {
  const authored = familyStaging[phase]?.members;
  if (Array.isArray(authored) && authored.length === 2) return authored;
  return [
    { position: [anchor.x, anchor.y, anchor.z], yaw: -20 },
    { position: [anchor.x + 0.75, anchor.y, anchor.z], yaw: 20 },
  ];
}

export function installBuild(rt) {
  const { state, ui, pc, canvas, mats } = rt;
  const WORLD_BOUNDS = rt.WORLD_BOUNDS;
  const WORLD_COLLIDERS = rt.WORLD_COLLIDERS;
  const FLOOR_REGIONS = rt.FLOOR_REGIONS;
  const ROUTE_SEGMENTS = rt.ROUTE_SEGMENTS;
  const STREAMING = rt.STREAMING;
  const CHECKPOINT_LIGHTS = rt.CHECKPOINT_LIGHTS;
  const FAMILY_STAGING = rt.FAMILY_STAGING;
  const ENVIRONMENT_PLACEMENTS = rt.ENVIRONMENT_PLACEMENTS;
  const STREET_HOUSE_BAYS = rt.STREET_HOUSE_BAYS;
  const TALL_HOUSE_BAYS = rt.TALL_HOUSE_BAYS;
  const SETBACK_HOUSE_BAYS = rt.SETBACK_HOUSE_BAYS;
  const UPPER_HOUSE_STYLE = rt.UPPER_HOUSE_STYLE;
  const SURFACE_DETAILS = rt.SURFACE_DETAILS;
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

  const familyPools = [0, 1].map((index) =>
    createObjectPool({
      create: () => {
        const member = createCharacter(
          `Family ${index + 1}`,
          mats.family,
          0.68 + index * 0.08,
        );
        member.dwarkaFamilyPoolIndex = index;
        return member;
      },
      activate: (member, transform) => {
        member.dwarkaFloorY = transform.position[1];
        member.setPosition(
          transform.position[0],
          transform.position[1] + CHARACTER_GROUND_LIFT * member.dwarkaScale,
          transform.position[2],
        );
        member.setEulerAngles(0, transform.yaw, 0);
        member.enabled = true;
      },
      deactivate: (member) => {
        member.enabled = false;
      },
    }),
  );

  function primitive(
    type,
    name,
    position,
    scale,
    mat,
    parent = state.app.root,
  ) {
    const entity = new pc.Entity(name);
    entity.addComponent("render", { type });
    Object.defineProperties(entity, {
      castShadows: {
        configurable: true,
        get: () => entity.render.castShadows,
        set: (value) => {
          entity.render.castShadows = Boolean(value);
        },
      },
      receiveShadows: {
        configurable: true,
        get: () => entity.render.receiveShadows,
        set: (value) => {
          entity.render.receiveShadows = Boolean(value);
        },
      },
    });
    parent.addChild(entity);
    entity.setLocalPosition(...position);
    entity.setLocalScale(...scale);
    entity.render.material = mat;
    entity.castShadows = true;
    entity.receiveShadows = true;
    return entity;
  }

  function batchStaticEnvironment() {
    if (!state.app?.batcher?.addGroup) return;
    // The route's authored primitives are low-poly; one broad static batch is
    // substantially cheaper than dozens of material/region batches at 1080p.
    // Imported dressing and all lights are still distance-culled independently.
    const group = state.app.batcher.addGroup(
      "Ancient street static scenery",
      false,
      120,
    );
    state.staticBatchGroup = group;
    const excluded = new Set(["Layered fire", "Objective sun marker"]);
    for (const render of state.app.root.findComponents("render")) {
      let node = render.entity;
      let isDynamic = false;
      while (node && node !== state.app.root) {
        if (
          excluded.has(node.name) ||
          node.tags?.has("fire") ||
          node.tags?.has("smoke")
        ) {
          isDynamic = true;
          break;
        }
        node = node.parent;
      }
      if (!isDynamic) render.batchGroupId = group.id;
    }
  }

  function assignStaticModelToBatch(entity) {
    if (!entity || !state.staticBatchGroup) return;
    for (const render of entity.findComponents?.("render") || []) {
      render.batchGroupId = state.staticBatchGroup.id;
      state.batchedModelRenders += 1;
    }
  }

  function instantiateModel(
    key,
    name,
    position,
    scale = 1,
    yaw = 0,
    parent = state.app.root,
  ) {
    const asset = state.modelAssets[key];
    if (!asset?.resource) return null;
    const entity = asset.resource.instantiateRenderEntity();
    entity.name = name;
    parent.addChild(entity);
    entity.setLocalPosition(...position);
    entity.setLocalScale(scale, scale, scale);
    entity.setLocalEulerAngles(0, yaw, 0);
    const castsShadows =
      key.endsWith("_Composite") ||
      key === "Sword_Bronze" ||
      ["Kenney_cart", "Kenney_stall_green", "Wall_Arch"].includes(key);
    entity.findComponents?.("render").forEach((render) => {
      render.castShadows = castsShadows;
      render.receiveShadows = true;
    });
    return entity;
  }

  function streetHousePlacementsFor(key) {
    const placements = [];
    for (let index = 0; index < STREET_HOUSE_BAYS.length; index += 1) {
      const centreZ = STREET_HOUSE_BAYS[index];
      for (const side of [-1, 1]) {
        const tall = TALL_HOUSE_BAYS.some(
          (bay) => bay.side === side && bay.z === centreZ,
        );
        const setback = SETBACK_HOUSE_BAYS.some(
          (bay) => bay.side === side && bay.z === centreZ,
        )
          ? 1.2
          : 0;
        const x = side * (10.12 + setback);
        const yaw = side < 0 ? 90 : -90;
        const doorOnNearModule = (index + (side > 0 ? 2 : 0)) % 4 === 0;
        for (const offset of [-1, 1]) {
          const isDoor = doorOnNearModule && offset === 1;
          const isWindow =
            !isDoor && (index + offset + (side > 0 ? 1 : 0)) % 3 === 0;
          if (
            (key === "Wall_Plaster_Door_Flat" && isDoor) ||
            (key === "Wall_Plaster_Window_Wide_Round" && isWindow) ||
            (key === "Wall_Plaster_Straight" && !isDoor && !isWindow)
          )
            placements.push([x, 0, centreZ + offset, yaw, 1]);
          if (key === "Door_4_Flat" && isDoor)
            placements.push([
              side * (9.88 + setback),
              0,
              centreZ + offset,
              yaw,
              1,
            ]);
          if (tall) {
            const upperWindow = (index + offset) % 2 === 0;
            if (
              (key === "Wall_Plaster_Window_Wide_Round" && upperWindow) ||
              (key === "Wall_Plaster_Straight" && !upperWindow)
            )
              placements.push([x, 3.12, centreZ + offset, yaw, 1]);
          }
        }
        if (key === "Kenney_roof_flat_square")
          for (const roofX of [
            side * (11.2 + setback),
            side * (13.4 + setback),
          ])
            for (const offset of [-1.1, 1.1])
              placements.push([
                roofX,
                tall ? 6.24 : 3.12,
                centreZ + offset,
                0,
                1,
              ]);
      }
    }
    return placements;
  }

  function upperHousePlacementsFor(key) {
    const placements = [];
    const groundY = UPPER_HOUSE_STYLE.groundY ?? 6;
    const courseHeight = UPPER_HOUSE_STYLE.courseHeight ?? 3;
    for (
      let frontIndex = 0;
      frontIndex < UPPER_HOUSE_FRONTS.length;
      frontIndex += 1
    ) {
      const front = UPPER_HOUSE_FRONTS[frontIndex];
      for (let bayIndex = 0; bayIndex < front.centres.length; bayIndex += 1) {
        const centre = front.centres[bayIndex];
        const tall = (frontIndex + bayIndex) % 4 === 0;
        const doorModule = (frontIndex + bayIndex) % 3 === 0 ? 1 : -1;
        const position = (offset = 0, depth = 0) =>
          front.axis === "z"
            ? [front.fixed + front.back[0] * depth, groundY, centre + offset]
            : [centre + offset, groundY, front.fixed + front.back[1] * depth];
        for (const offset of [-1, 1]) {
          const isDoor = offset === doorModule;
          const isWindow =
            !isDoor && (frontIndex + bayIndex + offset) % 2 === 0;
          const [x, y, z] = position(offset);
          if (
            (key === "Wall_Plaster_Door_Flat" && isDoor) ||
            (key === "Wall_Plaster_Window_Wide_Round" && isWindow) ||
            (key === "Wall_Plaster_Straight" && !isDoor && !isWindow)
          )
            placements.push([x, y, z, front.yaw, 1]);
          if (key === "Door_4_Flat" && isDoor) {
            const [doorX, doorY, doorZ] = position(offset, -0.24);
            placements.push([
              doorX,
              doorY,
              doorZ,
              front.yaw,
              UPPER_HOUSE_STYLE.doorScale ?? 0.72,
            ]);
          }
          if (tall) {
            const upperWindow = offset !== doorModule;
            if (
              (key === "Wall_Plaster_Window_Wide_Round" && upperWindow) ||
              (key === "Wall_Plaster_Straight" && !upperWindow)
            )
              placements.push([x, y + courseHeight, z, front.yaw, 1]);
          }
        }
        if (key === "Kenney_roof_flat_square") {
          for (const offset of [-1, 1]) {
            const [roofX, , roofZ] = position(
              offset,
              UPPER_HOUSE_STYLE.roofDepth ?? 1.08,
            );
            placements.push([
              roofX,
              groundY + courseHeight * (tall ? 2 : 1) - 0.04,
              roofZ,
              0,
              UPPER_HOUSE_STYLE.roofScale ?? 0.88,
            ]);
          }
        }
        if (key === "Balcony_Simple_Straight" && tall && bayIndex % 2 === 0) {
          const [balconyX, , balconyZ] = position(
            0,
            UPPER_HOUSE_STYLE.balconyDepth ?? -0.18,
          );
          placements.push([
            balconyX,
            groundY + courseHeight - 0.1,
            balconyZ,
            front.yaw,
            UPPER_HOUSE_STYLE.balconyScale ?? 0.82,
          ]);
        }
        if (key === "Overhang_Plaster_Short" && !tall && bayIndex % 3 === 1) {
          const [awningX, , awningZ] = position(
            0,
            UPPER_HOUSE_STYLE.awningDepth ?? -0.12,
          );
          placements.push([
            awningX,
            groundY + courseHeight - 0.45,
            awningZ,
            front.yaw,
            UPPER_HOUSE_STYLE.awningScale ?? 0.82,
          ]);
        }
      }
    }
    return placements;
  }

  function createQaScaleReferences() {
    if (!rt.qaSessionAllowed?.()) return;
    let requested = false;
    try {
      requested = new URLSearchParams(window.parent.location.search).has(
        "scaleRefs",
      );
    } catch {
      requested = false;
    }
    if (!requested) return;
    const groundY = UPPER_HOUSE_STYLE.groundY ?? 6;
    for (const front of UPPER_HOUSE_FRONTS) {
      for (const centre of front.centres) {
        const position =
          front.axis === "z"
            ? [front.fixed - front.back[0] * 0.9, groundY + 0.9, centre]
            : [centre, groundY + 0.9, front.fixed - front.back[1] * 0.9];
        const reference = primitive(
          "capsule",
          "QA 1.8m scale reference",
          position,
          [0.26, 0.9, 0.26],
          mats.warningGold,
        );
        reference.castShadows = false;
        reference.receiveShadows = false;
        state.qaScaleReferences.push(reference);
      }
    }
  }

  function environmentPlacementsFor(key) {
    return [
      ...(ENVIRONMENT_PLACEMENTS[key] || []),
      ...(STREET_HOUSE_MODEL_KEYS.has(key)
        ? streetHousePlacementsFor(key)
        : []),
      ...(UPPER_HOUSE_MODEL_KEYS.has(key) ? upperHousePlacementsFor(key) : []),
    ];
  }

  function alignEnvironmentModelToStreet(entity, requestedY) {
    if (!entity || requestedY > 0.1) return;
    const instances =
      entity
        .findComponents?.("render")
        .flatMap((render) => render.meshInstances || []) || [];
    if (instances.length === 0) return;
    const minimumY = Math.min(
      ...instances.map(
        (instance) => instance.aabb.center.y - instance.aabb.halfExtents.y,
      ),
    );
    const correction = STREET_SURFACE_Y - minimumY;
    if (!Number.isFinite(correction) || Math.abs(correction) > 0.35) return;
    const position = entity.getPosition();
    entity.setPosition(position.x, position.y + correction, position.z);
    entity.dwarkaGroundCorrection = correction;
  }

  function instantiateEnvironmentPlacement(key, placement, index) {
    const [x, y, z, yaw, scale] = placement;
    const entity = instantiateModel(key, key, [x, y, z], scale, yaw);
    if (
      entity &&
      (key.startsWith("Wall_Plaster_") ||
        [
          "Kenney_roof_flat_square",
          "Balcony_Simple_Straight",
          "Overhang_Plaster_Short",
        ].includes(key))
    ) {
      if (y >= 6 && z < -55.5)
        rt.tintEnvironmentEntity(
          entity,
          "palace-facade",
          new pc.Color(0.42, 0.27, 0.19),
        );
      else rt.tintStreetHouse(entity, [x, y, z]);
    }
    if (
      entity &&
      [
        "Kenney_column",
        "Kenney_column_wide",
        "Prop_ExteriorBorder_Straight1",
        "Kenney_fountain_round",
        "Wall_Arch",
        "Stairs_Exterior_Straight",
        "Stairs_Exterior_Platform",
      ].includes(key)
    )
      rt.tintEnvironmentEntity(
        entity,
        "weathered-sandstone",
        new pc.Color(0.58, 0.39, 0.22),
      );
    if (
      entity &&
      [
        "Kenney_pillar_wood",
        "Prop_Support",
        "Kenney_cart",
        "Kenney_wheel",
      ].includes(key)
    )
      rt.tintEnvironmentEntity(
        entity,
        "aged-timber",
        new pc.Color(0.26, 0.105, 0.045),
        0,
        0.12,
      );
    if (entity && key === "Kenney_fountain_center")
      rt.tintEnvironmentEntity(
        entity,
        "well-water",
        new pc.Color(0.08, 0.28, 0.38),
        0,
        0.7,
      );
    if (entity && key === "Kenney_stall_green")
      rt.tintEnvironmentEntity(
        entity,
        "faded-market-canopy",
        new pc.Color(0.18, 0.34, 0.24),
        0,
        0.08,
      );
    if (entity && GROUND_ALIGNED_MODELS.has(key))
      alignEnvironmentModelToStreet(entity, y);
    if (entity && key === "Door_4_Flat")
      rt.registerDoorEntity(entity, key, [x, y, z]);
    if (entity && key === "brass_diya_lantern") {
      entity.findComponents?.("render").forEach((render) => {
        for (const instance of render.meshInstances || []) {
          const source = instance.material;
          const cacheKey = `${source.id}:diya`;
          let lit = state.environmentMaterials.get(cacheKey);
          if (!lit) {
            lit = source.clone();
            lit.useMetalness = true;
            lit.metalness = 0.82;
            lit.gloss = 0.58;
            lit.emissive = new pc.Color(0.34, 0.08, 0.01);
            lit.emissiveIntensity = 0.5;
            lit.update();
            state.environmentMaterials.set(cacheKey, lit);
          }
          instance.material = lit;
        }
      });
      if (index % 3 === 0) {
        const glow = new pc.Entity("Threshold diya glow");
        glow.addComponent("light", {
          type: "omni",
          color: new pc.Color(1, 0.42, 0.12),
          intensity: 0.16,
          range: 2.7,
          castShadows: false,
        });
        entity.addChild(glow);
        glow.setLocalPosition(0, 0.22, 0);
        rt.registerFireLight(glow, 0.16, index * 0.67);
      }
    }
    if (entity) {
      entity.dwarkaPlacementId = `${key}:${index}`;
      if (!entity.dwarkaDynamicDoor) assignStaticModelToBatch(entity);
      state.environmentEntities.push(entity);
      state.streamedEnvironment.set(entity.dwarkaPlacementId, entity);
      if (state.snapshot?.player)
        updateEnvironmentVisibility(state.snapshot.player, entity);
      else entity.enabled = false;
    }
    return entity;
  }

  function preloadEnvironmentFor(key) {
    if (state.preloadedEnvironmentKeys.has(key)) return;
    if (
      !ENVIRONMENT_PLACEMENTS[key] &&
      !STREET_HOUSE_MODEL_KEYS.has(key) &&
      !UPPER_HOUSE_MODEL_KEYS.has(key)
    )
      return;
    const placements = environmentPlacementsFor(key);
    for (let index = 0; index < placements.length; index += 1) {
      const id = `${key}:${index}`;
      if (!state.streamedEnvironment.has(id))
        instantiateEnvironmentPlacement(key, placements[index], index);
    }
    state.preloadedEnvironmentKeys.add(key);
  }

  function refreshEnvironmentStreaming() {
    // Every imported placement is instantiated while the loading/intro UI is
    // visible. Traversal only toggles entities, avoiding GLB allocation,
    // shader compilation, and batch rebuilds on a route boundary.
    for (const key of Object.keys(state.modelAssets))
      preloadEnvironmentFor(key);
  }

  function placeEnvironmentFor(key) {
    preloadEnvironmentFor(key);
    if (state.snapshot?.player)
      updateEnvironmentVisibility(state.snapshot.player);
  }

  function updateEnvironmentVisibility(player, onlyEntity = null) {
    if (!player) return;
    const floorY = player.y ?? floorHeightAt(player.x, player.z);
    for (const entity of onlyEntity
      ? [onlyEntity]
      : state.environmentEntities) {
      const position = entity.getPosition();
      entity.enabled =
        Math.hypot(position.x - player.x, position.z - player.z) <=
          STREAMING.environmentRadius && Math.abs(position.y - floorY) <= 4.2;
    }
    if (onlyEntity) return;
    for (const entity of state.routeSurfaceEntities) {
      const position = entity.getPosition();
      entity.enabled =
        Math.hypot(position.x - player.x, position.z - player.z) <=
          STREAMING.routeRadius && Math.abs(position.y - floorY) <= 7;
    }
    for (const fire of state.fireEffects) {
      const position = fire.getPosition();
      fire.enabled =
        Math.hypot(position.x - player.x, position.z - player.z) <=
          STREAMING.fireRadius && Math.abs(position.y - floorY) <= 5;
    }
    for (const light of state.fireLights) {
      const position = light.getPosition();
      light.enabled =
        Math.hypot(position.x - player.x, position.z - player.z) <=
          STREAMING.fireLightRadius && Math.abs(position.y - floorY) <= 6;
    }
    for (const light of state.routeLights) {
      const position = light.getPosition();
      light.enabled =
        Math.hypot(position.x - player.x, position.z - player.z) <=
          STREAMING.routeLightRadius && Math.abs(position.y - floorY) <= 8;
    }
  }

  function loadApprovedAssets() {
    const applyPackedSand = (asset) => {
      if (!asset?.resource) {
        console.warn(
          "Packed sand texture failed to load; using the rough matte fallback",
        );
        return;
      }
      const texture = asset.resource;
      texture.addressU = texture.addressV = pc.ADDRESS_REPEAT;
      texture.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR;
      texture.magFilter = pc.FILTER_LINEAR;
      texture.anisotropy = 8;
      mats.roadSand.diffuseMap = texture;
      mats.roadSand.diffuseMapTiling = new pc.Vec2(7, 4);
      mats.roadSand.update();
      state.app.assets.loadFromUrl(
        assetUrl("./assets/textures/brown_mud_dry_diff_512.webp"),
        "texture",
        (earthError, earthAsset) => {
          if (earthError || !earthAsset?.resource) return;
          earthAsset.resource.addressU = earthAsset.resource.addressV =
            pc.ADDRESS_REPEAT;
          earthAsset.resource.anisotropy = 8;
          mats.roadSand.diffuseMap = earthAsset.resource;
          mats.roadSand.diffuseMapTiling = new pc.Vec2(13, 8);
          mats.roadSand.diffuse = new pc.Color(0.8, 0.78, 0.73);
          mats.roadSand.update();
          mats.sandDark.diffuseMap = earthAsset.resource;
          mats.sandDark.diffuseMapTiling = new pc.Vec2(18, 14);
          mats.sandDark.update();
        },
      );
    };
    const packedSandAsset = state.app.assets.find(
      "packed-sand-v1.webp",
      "texture",
    );
    if (packedSandAsset) {
      packedSandAsset.ready(applyPackedSand);
      state.app.assets.load(packedSandAsset);
    } else
      state.app.assets.loadFromUrl(
        assetUrl("./assets/textures/packed-sand-v1.webp"),
        "texture",
        (error, asset) => {
          if (error)
            console.warn(
              "Packed sand texture failed to load; using the rough matte fallback",
            );
          else applyPackedSand(asset);
        },
      );
    state.app.assets.loadFromUrl(
      assetUrl("./assets/textures/fabric_pattern_07_col_1_512.webp"),
      "texture",
      (error, asset) => {
        if (error || !asset?.resource) return;
        asset.resource.addressU = asset.resource.addressV = pc.ADDRESS_REPEAT;
        for (const cloth of [
          ...mats.buntingPalette,
          mats.magenta,
          mats.turquoise,
          mats.gold,
        ]) {
          cloth.diffuseMap = asset.resource;
          cloth.diffuseMapTiling = new pc.Vec2(1, 1);
          cloth.update();
        }
      },
    );
    for (const [url, materials, tiling] of [
      [
        "./assets/textures/painted_plaster_wall_diff_512.webp",
        [
          mats.sand,
          mats.sandLight,
          mats.stoneLight,
          mats.palaceTurquoise,
          mats.palaceOchre,
          mats.houseLime,
          mats.houseOchre,
          mats.houseRose,
        ],
        2.5,
      ],
      [
        "./assets/textures/sandstone_cracks_diff_512.webp",
        [mats.stone, mats.sideMargin, mats.kerbSandstone],
        3.5,
      ],
    ])
      state.app.assets.loadFromUrl(assetUrl(url), "texture", (error, asset) => {
        if (error || !asset?.resource) return;
        asset.resource.addressU = asset.resource.addressV = pc.ADDRESS_REPEAT;
        asset.resource.anisotropy = 8;
        for (const facade of materials) {
          facade.diffuseMap = asset.resource;
          facade.diffuseMapTiling = new pc.Vec2(tiling, tiling);
          facade.update();
        }
      });
    for (const [kind, url] of [
      ["fire", "./assets/textures/kenney-explosion-fire-atlas.webp"],
      ["smoke", "./assets/textures/kenney-black-smoke-atlas.webp"],
    ])
      state.app.assets.loadFromUrl(assetUrl(url), "texture", (error, asset) => {
        if (error || !asset?.resource) {
          console.warn(`Kenney ${kind} atlas failed to load`);
          return;
        }
        asset.resource.addressU = asset.resource.addressV =
          pc.ADDRESS_CLAMP_TO_EDGE;
        state.vfxAssets[kind] = asset;
        rt.upgradeFireEffects();
      });
    for (const [key, url] of Object.entries(MODEL_URLS))
      state.app.assets.loadFromUrl(
        assetUrl(url),
        "container",
        (error, asset) => {
          if (error || !asset) {
            console.warn(`Optional model failed: ${key}`);
            return;
          }
          state.modelAssets[key] = asset;
          if (
            ENVIRONMENT_PLACEMENTS[key] ||
            STREET_HOUSE_MODEL_KEYS.has(key) ||
            UPPER_HOUSE_MODEL_KEYS.has(key)
          )
            placeEnvironmentFor(key);
          for (const root of state.characterRoots) rt.upgradeCharacter(root);
        },
      );
    state.app.assets.loadFromUrl(
      assetUrl("./assets/animations/UAL1_Standard.glb"),
      "container",
      (error, asset) => {
        if (error || !asset?.resource?.animations) {
          console.warn("Animation library failed to load");
          return;
        }
        for (const animationAsset of asset.resource.animations) {
          const track = animationAsset?.resource || animationAsset;
          if (track?.name) state.animationTracks[track.name] = track;
        }
        for (const root of state.characterRoots)
          rt.setupCharacterAnimation(root);
      },
    );
    state.app.assets.loadFromUrl(
      assetUrl("./assets/animations/Dwarka_Combat.glb"),
      "container",
      (error, asset) => {
        if (error || !asset?.resource?.animations) {
          console.warn("DWARKA combat animations failed to load");
          return;
        }
        for (const animationAsset of asset.resource.animations) {
          const track = animationAsset?.resource || animationAsset;
          if (track?.name) state.animationTracks[track.name] = track;
        }
        for (const root of state.characterRoots)
          rt.setupModelAnimation(root.dwarkaVisual);
      },
    );
  }

  function createCameraFrame() {
    const frame = new pc.CameraFrame(state.app, state.camera.camera);
    frame.rendering.toneMapping = pc.TONEMAP_ACES;
    frame.rendering.samples = 2;
    frame.rendering.sharpness = 0.08;
    frame.bloom.enabled = true;
    frame.bloom.intensity = 0.03;
    frame.bloom.blurLevel = 4;
    frame.ssao.type = pc.SSAOTYPE_LIGHTING;
    frame.ssao.intensity = 0.28;
    frame.ssao.radius = 2.4;
    frame.ssao.samples = 4;
    frame.ssao.power = 1.35;
    frame.ssao.scale = 0.5;
    frame.vignette.intensity = 0.015;
    frame.vignette.inner = 0.42;
    frame.vignette.outer = 0.92;
    frame.vignette.curvature = 0.68;
    frame.grading.enabled = true;
    frame.grading.brightness = 1.03;
    frame.grading.contrast = 0.96;
    frame.grading.saturation = 0.94;
    frame.grading.tint = new pc.Color(0.68, 0.78, 1);
    frame.update();
    return frame;
  }

  function buildSevenRegionRoute() {
    const roadWidth = SURFACE_DETAILS.roadWidth ?? 7.4;
    const marginWidth = SURFACE_DETAILS.marginWidth ?? 2.1;
    const marginOffset = SURFACE_DETAILS.marginOffset ?? 4.75;
    const kerbOffset = SURFACE_DETAILS.kerbOffset ?? 3.78;
    for (let index = 0; index < ROUTE_SEGMENTS.length; index += 1) {
      const segment = ROUTE_SEGMENTS[index];
      if (segment.stepped) continue;
      const eastWest = Math.abs(segment.yaw) === 90;
      const roadScale = eastWest
        ? [segment.length, 0.08, roadWidth]
        : [roadWidth, 0.08, segment.length];
      const road = primitive(
        "box",
        `${segment.id} packed-earth route`,
        [segment.x, segment.y + STREET_SURFACE_Y - 0.04, segment.z],
        roadScale,
        mats.roadSand,
      );
      road.castShadows = false;
      road.receiveShadows = true;
      if (!state.roadEntity) state.roadEntity = road;
      const lateral = eastWest ? { x: 0, z: 1 } : { x: 1, z: 0 };
      for (const side of [-1, 1]) {
        const marginX = segment.x + lateral.x * side * marginOffset;
        const marginZ = segment.z + lateral.z * side * marginOffset;
        const marginScale = eastWest
          ? [segment.length, 0.06, marginWidth]
          : [marginWidth, 0.06, segment.length];
        const margin = primitive(
          "box",
          `${segment.id} sandstone margin`,
          [marginX, segment.y + STREET_SURFACE_Y - 0.02, marginZ],
          marginScale,
          mats.sideMargin,
        );
        margin.castShadows = false;
        margin.receiveShadows = true;
        const kerbX = segment.x + lateral.x * side * kerbOffset;
        const kerbZ = segment.z + lateral.z * side * kerbOffset;
        const kerbScale = eastWest
          ? [segment.length, 0.18, 0.22]
          : [0.22, 0.18, segment.length];
        const kerb = primitive(
          "box",
          `${segment.id} sandstone drain`,
          [kerbX, segment.y + 0.08, kerbZ],
          kerbScale,
          mats.kerbSandstone,
        );
        kerb.castShadows = false;
      }
    }
    for (const [x, y, z, width, depth] of SURFACE_DETAILS.routeJunctionPads ||
      []) {
      const pad = primitive(
        "box",
        "Packed-earth route junction",
        [x, y + STREET_SURFACE_Y + 0.005, z],
        [width, 0.07, depth],
        mats.roadSand,
      );
      pad.castShadows = false;
      pad.receiveShadows = true;
    }
    for (const [
      x,
      y,
      z,
      width,
      height,
      depth,
    ] of SURFACE_DETAILS.stairSupports || []) {
      const support = primitive(
        "box",
        "Stair sandstone retaining wall",
        [x, y, z],
        [width, height, depth],
        mats.kerbSandstone,
      );
      support.castShadows = true;
      support.receiveShadows = true;
    }
    for (const [x, y, z] of SURFACE_DETAILS.routeBraziers || [])
      rt.createBrazier(x, z, y);
    for (const [
      x,
      y,
      z,
      intensity,
      range = 10,
    ] of SURFACE_DETAILS.routeWarmLights || []) {
      const light = new pc.Entity("Upper street warm bounce");
      light.addComponent("light", {
        type: "omni",
        color: new pc.Color(1, 0.5, 0.25),
        intensity,
        range,
        castShadows: false,
      });
      light.setPosition(x, y, z);
      state.app.root.addChild(light);
      state.routeLights.push(light);
    }
    // Two cheap, shadow-free practicals per encounter keep silhouettes and
    // telegraphs readable even when imported dressing is streamed out.
    for (const { x, y, z, intensity = 0.5 } of CHECKPOINT_LIGHTS) {
      const pool = new pc.Entity("Checkpoint warm pool");
      pool.addComponent("light", {
        type: "omni",
        color: new pc.Color(1, 0.48, 0.22),
        intensity,
        range: 8.5,
        castShadows: false,
      });
      pool.setPosition(x, y, z);
      state.app.root.addChild(pool);
      state.routeLights.push(pool);
    }
  }

  function createCharacter(name, outfit, scale = 1) {
    const root = new pc.Entity(name);
    root.dwarkaScale = scale;
    root.dwarkaModelKey = rt.characterModelKey(name);
    state.app.root.addChild(root);
    state.characterRoots.add(root);
    root.setLocalPosition(0, CHARACTER_GROUND_LIFT * scale, 0);
    const body = primitive(
      "capsule",
      `${name} loading body`,
      [0, 1.0 * scale, 0],
      [0.75 * scale, 1.55 * scale, 0.65 * scale],
      outfit,
      root,
    );
    body.tags.add("greybox");
    const head = primitive(
      "sphere",
      `${name} loading head`,
      [0, 2.08 * scale, 0],
      [0.58 * scale, 0.62 * scale, 0.58 * scale],
      mats.skin,
      root,
    );
    head.tags.add("greybox");
    rt.upgradeCharacter(root);
    return root;
  }

  function syncPhaseScene(phase) {
    rt.releaseAllEnemies();
    for (const entity of state.familyEntities) {
      familyPools[entity.dwarkaFamilyPoolIndex]?.release(entity);
    }
    state.familyEntities = [];
    state.chitra.enabled = phase === "arrival" || phase === "ending";
    const familyAnchor =
      phase === "ending"
        ? CHAPTER_CONFIG.familyPositions.doorway
        : CHAPTER_CONFIG.familyPositions[phase];
    const familyTransforms = familyAnchor
      ? familyMemberTransforms(phase, familyAnchor, FAMILY_STAGING)
      : [];
    if (familyTransforms.length) {
      for (let index = 0; index < familyTransforms.length; index += 1) {
        const transform = familyTransforms[index];
        const member = familyPools[index].acquire(transform);
        state.familyEntities.push(member);
      }
    }
    const familyLight = FAMILY_STAGING[phase]?.light;
    if (!state.familyFocusLight) {
      state.familyFocusLight = new pc.Entity("Rescue family warm pool");
      state.familyFocusLight.addComponent("light", {
        type: "omni",
        color: new pc.Color(1, 0.46, 0.2),
        castShadows: false,
      });
      state.app.root.addChild(state.familyFocusLight);
    }
    state.familyFocusLight.enabled = Boolean(familyLight);
    if (familyLight) {
      state.familyFocusLight.setPosition(...familyLight.position);
      state.familyFocusLight.light.intensity = familyLight.intensity;
      state.familyFocusLight.light.range = familyLight.range;
    }
    if (phase === "ending") {
      const [chitraX, chitraY, chitraZ] = LANDMARKS.chitraEnding || [0, 6, -50];
      state.chitra.dwarkaFloorY = chitraY;
      state.chitra.setPosition(
        chitraX,
        chitraY + CHARACTER_GROUND_LIFT * state.chitra.dwarkaScale,
        chitraZ,
      );
    } else if (phase === "arrival") {
      state.chitra.dwarkaFloorY = 0;
      state.chitra.setPosition(
        0,
        CHARACTER_GROUND_LIFT * state.chitra.dwarkaScale,
        14,
      );
    } else {
      state.chitra.dwarkaFloorY = -20;
      state.chitra.setPosition(0, -20, 14);
    }
    rt.setObjectiveMarker(phase);
  }

  function buildScene() {
    state.app = new pc.Application(canvas, {
      mouse: new pc.Mouse(canvas),
      keyboard: new pc.Keyboard(window),
      graphicsDeviceOptions: {
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      },
    });
    state.app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
    state.app.graphicsDevice.maxPixelRatio = Math.min(
      1,
      window.devicePixelRatio,
    );
    state.app.setCanvasResolution(pc.RESOLUTION_AUTO);
    state.app.start();
    state.app.scene.lighting.shadowsEnabled = true;
    state.app.scene.lighting.maxLightsPerCell = 8;
    state.app.scene.lighting.shadowAtlasResolution = 1024;
    state.app.scene.ambientLight = new pc.Color(0.055, 0.075, 0.15);
    state.app.scene.exposure = 0.64;
    state.app.scene.toneMapping = pc.TONEMAP_ACES;
    state.app.scene.gammaCorrection = pc.GAMMA_SRGB;
    state.app.scene.fog.type = pc.FOG_EXP2;
    state.app.scene.fog.color = new pc.Color(0.045, 0.06, 0.14);
    state.app.scene.fog.density = 0.006;
    rt.createMaterials();
    primitive(
      "box",
      "Outer earth",
      [0, -0.52, -4],
      [82, 0.35, 102],
      mats.sandDark,
    );
    if (ROUTE_SEGMENTS.length) buildSevenRegionRoute();
    else
      for (let index = 0; index < 10; index += 1) {
        const z = 34 - index * 8;
        const road = primitive(
          "box",
          "Packed earth street slab",
          [0, STREET_SURFACE_Y - 0.04 - (index % 2) * 0.003, z],
          [13, 0.08, 8.08],
          mats.roadSand,
        );
        road.castShadows = false;
        road.receiveShadows = true;
        if (!state.roadEntity) state.roadEntity = road;
        for (const side of [-1, 1]) {
          const margin = primitive(
            "box",
            "Stone threshold margin",
            [side * 8.8, STREET_SURFACE_Y - 0.025, z],
            [4.4, 0.1, 8.05],
            mats.sideMargin,
          );
          margin.castShadows = false;
          const kerb = primitive(
            "box",
            "Street drain kerb",
            [side * 6.58, STREET_SURFACE_Y + 0.035, z],
            [0.16, 0.14, 8.02],
            mats.stoneLight,
          );
          kerb.castShadows = false;
        }
      }
    for (const [x, y, z, sx, sz, yaw] of SURFACE_DETAILS.ashes || []) {
      const ash = primitive(
        "cylinder",
        "Wet ash fire patch",
        [x, y + STREET_SURFACE_Y + 0.018, z],
        [sx * 0.34, 0.012, sz * 0.42],
        mats.ash,
      );
      ash.setEulerAngles(0, yaw, 0);
      ash.castShadows = false;
      ash.receiveShadows = false;
    }
    for (const [x, y, z, yaw] of SURFACE_DETAILS.ruts || []) {
      const rut = primitive(
        "plane",
        "Cart rut decal",
        [x, y + STREET_SURFACE_Y + 0.01, z],
        [0.16, 1, 3.6],
        mats.rut,
      );
      rut.setEulerAngles(0, yaw, 0);
      rut.castShadows = false;
      rut.receiveShadows = false;
    }
    for (const [x, y, z, yaw, materialName] of SURFACE_DETAILS.rugs || []) {
      const rug = primitive(
        "box",
        "Dyed threshold rug",
        [x, y + STREET_SURFACE_Y + 0.017, z],
        [1.35, 0.035, 2.15],
        mats[materialName] || mats.magenta,
      );
      rug.setEulerAngles(0, yaw, 0);
      rug.castShadows = false;
      rug.receiveShadows = true;
    }
    for (const [x, z, radius] of [
      [-7.8, 25, 0.08],
      [7.2, 14, 0.06],
      [-8.3, 2, 0.075],
      [7.7, -10, 0.065],
      [-7.5, -23, 0.08],
      [7.9, -36, 0.07],
    ]) {
      const pebble = primitive(
        "sphere",
        "Road pebble",
        [x, STREET_SURFACE_Y + radius * 0.22, z],
        [radius * 1.4, radius * 0.42, radius],
        mats.sandDark,
      );
      pebble.castShadows = false;
    }
    for (const [x, z, color, lean] of [
      [-7.8, -9.8, mats.turquoise, -7],
      [7.7, -14.2, mats.magenta, 7],
      [-7.6, -22.0, mats.gold, -7],
    ]) {
      const awning = primitive(
        "box",
        "Woven market awning",
        [x, 3.25, z],
        [4.3, 0.09, 3.0],
        color,
      );
      awning.setEulerAngles(0, 0, lean);
      awning.castShadows = false;
    }
    for (const [minX, maxX, minZ, maxZ, name, , visual] of WORLD_COLLIDERS) {
      if (
        visual ||
        ["Stall", "Barrels"].includes(name) ||
        /brazier|vase|stairs|awning support/i.test(name)
      )
        continue;
      const width = maxX - minX,
        depth = maxZ - minZ;
      const x = (minX + maxX) / 2,
        z = (minZ + maxZ) / 2;
      if (name.includes("wall")) {
        const segments = Math.max(2, Math.ceil(width / 1.8));
        const segmentWidth = width / segments;
        for (let index = 0; index < segments; index += 1)
          primitive(
            "box",
            `${name} sandstone course`,
            [
              minX + segmentWidth * (index + 0.5),
              0.85 + (index % 2) * 0.035,
              z,
            ],
            [segmentWidth - 0.055, 1.72, depth],
            index % 2 ? mats.sand : mats.sandLight,
          );
        primitive(
          "box",
          `${name} carved cap`,
          [x, 1.78, z],
          [width + 0.16, 0.16, depth + 0.12],
          mats.gold,
        );
      } else {
        const blockMaterial = name.includes("Stall")
          ? mats.magenta
          : name.includes("Barrel")
            ? mats.wood
            : name.includes("Door post")
              ? mats.stone
              : mats.stoneLight;
        primitive(
          "box",
          name,
          [x, name.includes("post") ? 1.2 : 0.65, z],
          [width, name.includes("post") ? 2.5 : 1.3, depth],
          blockMaterial,
        );
        if (name.includes("Door post")) {
          primitive(
            "box",
            `${name} stone plinth`,
            [x, 0.18, z],
            [width + 0.26, 0.34, depth + 0.26],
            mats.stoneLight,
          );
          primitive(
            "box",
            `${name} gold capital`,
            [x, 2.42, z],
            [width + 0.3, 0.22, depth + 0.3],
            mats.gold,
          );
        }
      }
    }
    rt.decorateTurnWalls();
    rt.createDoorwayLandmark();
    for (const [x, y, z] of SURFACE_DETAILS.streetBraziers || [])
      rt.createBrazier(x, z, y);
    for (const emblem of LANDMARKS.streetEmblems || [])
      rt.createSunEmblem(...emblem);
    rt.createRegionalSkyline();
    const routePattern =
      /packed-earth route|route junction|sandstone drain|sandstone tread|Stair sandstone|Caravan route rug/;
    state.routeSurfaceEntities = state.app.root.find((entity) =>
      routePattern.test(entity.name),
    );
    for (const [
      x,
      y,
      z,
      intensity = 0.6,
      range = 5.8,
    ] of SURFACE_DETAILS.wallLanternLights || []) {
      const lanternLight = new pc.Entity("Wall lantern glow");
      lanternLight.addComponent("light", {
        type: "omni",
        color: new pc.Color(1, 0.54, 0.24),
        intensity,
        range,
        castShadows: false,
      });
      lanternLight.setPosition(x, y, z);
      rt.registerFireLight(lanternLight, intensity, x * 0.29 + z * 0.13);
      state.app.root.addChild(lanternLight);
    }
    const moon = new pc.Entity("Moonlight");
    moon.addComponent("light", {
      type: "directional",
      color: new pc.Color(0.72, 0.82, 1),
      intensity: 4,
      castShadows: true,
      shadowDistance: 24,
      shadowResolution: 1024,
      shadowBias: 0.05,
      normalOffsetBias: 0.02,
      numCascades: 1,
    });
    moon.setEulerAngles(48, -32, 0);
    state.app.root.addChild(moon);
    const rim = new pc.Entity("Cool moon rim");
    rim.addComponent("light", {
      type: "directional",
      color: new pc.Color(0.38, 0.56, 1),
      intensity: 0.38,
      castShadows: false,
    });
    rim.setEulerAngles(38, 148, 0);
    state.app.root.addChild(rim);
    const palaceGlow = new pc.Entity("Palace horizon glow");
    palaceGlow.addComponent("light", {
      type: "omni",
      color: new pc.Color(1, 0.43, 0.18),
      intensity: 0.3,
      range: 20,
      castShadows: false,
    });
    palaceGlow.setPosition(-4.7, 7.8, -52);
    state.app.root.addChild(palaceGlow);
    state.routeLights.push(palaceGlow);
    for (const [x, z] of [
      [-4.7, -3.2],
      [4.6, -17.4],
    ]) {
      const wash = new pc.Entity("Warm turn-wall wash");
      wash.addComponent("light", {
        type: "omni",
        color: new pc.Color(1, 0.44, 0.18),
        intensity: 0.48,
        range: 7,
        castShadows: false,
      });
      wash.setPosition(x, 2.5, z);
      state.app.root.addChild(wash);
      state.routeLights.push(wash);
    }
    const fill = new pc.Entity("Warm reflected fire fill");
    fill.addComponent("light", {
      type: "directional",
      color: new pc.Color(1, 0.49, 0.26),
      intensity: 0.13,
      castShadows: false,
    });
    fill.setEulerAngles(28, 148, 0);
    state.app.root.addChild(fill);
    batchStaticEnvironment();
    rt.createObjectiveMarker();
    rt.createTargetMarker();
    state.playerEntity = createCharacter("Vrishaketu", mats.player, 1);
    const playerBounce = new pc.Entity("Player ground bounce");
    playerBounce.addComponent("light", {
      type: "omni",
      color: new pc.Color(1, 0.48, 0.22),
      intensity: 0.36,
      range: 4.8,
      castShadows: false,
    });
    state.playerEntity.addChild(playerBounce);
    playerBounce.setLocalPosition(0, 0.62, 0.34);
    state.chitra = createCharacter("Chitra", mats.chitra, 0.73);
    state.chitra.dwarkaFloorY = 0;
    state.chitra.setPosition(
      0,
      CHARACTER_GROUND_LIFT * state.chitra.dwarkaScale,
      14,
    );
    for (const pool of familyPools) pool.warm(1);
    rt.prewarmEnemyPools();
    state.camera = new pc.Entity("Right shoulder camera");
    state.camera.addComponent("camera", {
      clearColor: new pc.Color(0.085, 0.075, 0.2),
      fov: 63,
      nearClip: 0.08,
      farClip: 110,
    });
    state.app.root.addChild(state.camera);
    rt.prewarmEnemyWarnings();
    rt.prewarmProjectilePool();
    rt.prewarmImpactPool();
    // Native MSAA handles desktop edge quality without a full-frame post pass.
    state.cameraFrame = createCameraFrame();
    rt.loadImageBasedLighting();
    loadApprovedAssets();
    createQaScaleReferences();
    state.app.on("update", rt.updateScene);
    window.addEventListener("resize", () => state.app.resizeCanvas());
  }

  rt.primitive = primitive;
  rt.batchStaticEnvironment = batchStaticEnvironment;
  rt.assignStaticModelToBatch = assignStaticModelToBatch;
  rt.instantiateModel = instantiateModel;
  rt.streetHousePlacementsFor = streetHousePlacementsFor;
  rt.upperHousePlacementsFor = upperHousePlacementsFor;
  rt.createQaScaleReferences = createQaScaleReferences;
  rt.environmentPlacementsFor = environmentPlacementsFor;
  rt.alignEnvironmentModelToStreet = alignEnvironmentModelToStreet;
  rt.instantiateEnvironmentPlacement = instantiateEnvironmentPlacement;
  rt.preloadEnvironmentFor = preloadEnvironmentFor;
  rt.refreshEnvironmentStreaming = refreshEnvironmentStreaming;
  rt.placeEnvironmentFor = placeEnvironmentFor;
  rt.updateEnvironmentVisibility = updateEnvironmentVisibility;
  rt.loadApprovedAssets = loadApprovedAssets;
  rt.createCameraFrame = createCameraFrame;
  rt.buildSevenRegionRoute = buildSevenRegionRoute;
  rt.createCharacter = createCharacter;
  rt.familyPoolStats = () => familyPools.map((pool) => pool.stats());
  rt.syncPhaseScene = syncPhaseScene;
  rt.buildScene = buildScene;
}
