export const ENVIRONMENT_TONES = Object.freeze({
  houseLime: Object.freeze([0.31, 0.29, 0.25]),
  houseOchre: Object.freeze([0.32, 0.28, 0.25]),
  houseRose: Object.freeze([0.3, 0.26, 0.25]),
  agedTrim: Object.freeze([0.18, 0.16, 0.14]),
  agedTimber: Object.freeze([0.36, 0.22, 0.12]),
  marketCanopy: Object.freeze([0.4, 0.31, 0.22]),
});

export function installMaterials(rt) {
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

  function material(color, emissive = null) {
    const value = new pc.StandardMaterial();
    value.diffuse = new pc.Color(...color);
    value.useMetalness = true;
    value.metalness = 0;
    value.gloss = 0.25;
    if (emissive) {
      value.emissive = new pc.Color(...emissive);
      value.emissiveIntensity = 1.4;
    }
    value.update();
    return value;
  }
  function translucentMaterial(color, opacity, emissive = color) {
    const value = material(color, emissive);
    value.opacity = opacity;
    value.blendType = pc.BLEND_NORMAL;
    value.depthWrite = false;
    value.cull = pc.CULLFACE_NONE;
    value.update();
    return value;
  }

  function radialWarningTexture() {
    const source = document.createElement("canvas");
    source.width = source.height = 64;
    const context = source.getContext("2d");
    const gradient = context.createRadialGradient(32, 32, 4, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255,255,255,0.08)");
    gradient.addColorStop(0.68, "rgba(255,255,255,0.2)");
    gradient.addColorStop(0.86, "rgba(255,255,255,0.86)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    const texture = new pc.Texture(state.app.graphicsDevice, {
      width: 64,
      height: 64,
      mipmaps: true,
    });
    texture.setSource(source);
    return texture;
  }

  function tintStreetHouse(entity, position) {
    if (!entity) return;
    const atTurnWall =
      Math.abs(position[2] + 3.8) < 0.55 ||
      Math.abs(position[2] + 18) < 0.55 ||
      (Math.abs(position[0] - 1.7) < 0.55 &&
        position[2] < -3.5 &&
        position[2] > -10.5) ||
      (Math.abs(position[0] + 1.6) < 0.55 &&
        position[2] < -11.5 &&
        position[2] > -18.5);
    // Two adjacent two-metre kit modules form one house bay. Quantize the
    // dominant facade axis so each complete house receives one restrained
    // plaster tone instead of turning the street into a patchwork.
    const facadeAxis = Math.abs(position[0]) > 7 ? position[2] : position[0];
    const houseBay = Math.floor((facadeAxis + 2) / 4);
    const facadeSide = position[0] > 0 || position[2] > -14 ? 1 : 0;
    const tones = ["lime", "ochre", "rose"];
    const tone = atTurnWall
      ? "ochre"
      : tones[Math.abs(houseBay + facadeSide) % tones.length];
    const toneMaterials = {
      lime: mats.houseLime,
      ochre: mats.houseOchre,
      rose: mats.houseRose,
    };
    entity.findComponents?.("render").forEach((render) => {
      for (const instance of render.meshInstances || [])
        instance.material = toneMaterials[tone];
    });
  }

  function tintEnvironmentEntity(
    entity,
    tone,
    color,
    metalness = 0,
    gloss = 0.16,
  ) {
    if (!entity) return;
    entity.findComponents?.("render").forEach((render) => {
      for (const instance of render.meshInstances || []) {
        const source = instance.material;
        const cacheKey = `${source.id}:${tone}`;
        let tinted = state.environmentMaterials.get(cacheKey);
        if (!tinted) {
          tinted = source.clone();
          tinted.diffuse = color;
          tinted.useMetalness = true;
          tinted.metalness = metalness;
          tinted.gloss = gloss;
          tinted.update();
          state.environmentMaterials.set(cacheKey, tinted);
        }
        instance.material = tinted;
      }
    });
  }

  function loadImageBasedLighting() {
    state.app.assets.loadFromUrl(
      assetUrl("./assets/environment/moonless_golf_2k.hdr"),
      "texture",
      (error, asset) => {
        if (error || !asset?.resource) {
          console.warn(
            "Moonless Golf HDR failed to load; retaining authored moon and practical lights",
          );
          return;
        }
        const source = asset.resource;
        source.addressU = pc.ADDRESS_REPEAT;
        source.addressV = pc.ADDRESS_CLAMP_TO_EDGE;
        state.skyboxCubemap = pc.EnvLighting.generateSkyboxCubemap(source, 512);
        state.environmentAtlas = pc.EnvLighting.generateAtlas(
          state.skyboxCubemap,
          { size: 512 },
        );
        state.app.scene.skybox = state.skyboxCubemap;
        state.app.scene.envAtlas = state.environmentAtlas;
        state.app.scene.skyboxIntensity = 0.22;
        state.app.assets.loadFromUrl(
          assetUrl("./assets/environment/moonlit_golf_2k.hdr"),
          "texture",
          (skyError, skyAsset) => {
            if (skyError || !skyAsset?.resource) return;
            skyAsset.resource.addressU = pc.ADDRESS_REPEAT;
            skyAsset.resource.addressV = pc.ADDRESS_CLAMP_TO_EDGE;
            state.moonlitSkybox = pc.EnvLighting.generateSkyboxCubemap(
              skyAsset.resource,
              512,
            );
            state.environmentAtlas = pc.EnvLighting.generateAtlas(
              state.moonlitSkybox,
              {
                size: 512,
              },
            );
            state.app.scene.envAtlas = state.environmentAtlas;
            state.app.scene.skybox = state.moonlitSkybox;
            state.app.scene.skyboxIntensity = 0.26;
          },
        );
      },
    );
  }

  function createMaterials() {
    mats.stone = material([0.34, 0.29, 0.24]);
    mats.stoneLight = material([0.48, 0.43, 0.4]);
    mats.sand = material([0.46, 0.34, 0.29]);
    mats.sandLight = material([0.58, 0.46, 0.37]);
    mats.sandDark = material([0.27, 0.27, 0.29]);
    mats.roadSand = material([0.58, 0.56, 0.52]);
    mats.sideMargin = material([0.42, 0.34, 0.24]);
    mats.kerbSandstone = material([0.32, 0.25, 0.18]);
    mats.houseLime = material(ENVIRONMENT_TONES.houseLime);
    mats.houseOchre = material(ENVIRONMENT_TONES.houseOchre);
    mats.houseRose = material(ENVIRONMENT_TONES.houseRose);
    mats.buntingPalette = [
      material([0.1, 0.34, 0.36]),
      material([0.42, 0.08, 0.2]),
      material([0.58, 0.34, 0.07]),
    ];
    for (const cloth of mats.buntingPalette) {
      cloth.cull = pc.CULLFACE_NONE;
      cloth.gloss = 0.06;
      cloth.update();
    }
    mats.ash = translucentMaterial([0.055, 0.06, 0.085], 0.68);
    mats.rut = translucentMaterial([0.18, 0.14, 0.13], 0.52);
    mats.wood = material([0.22, 0.1, 0.08]);
    mats.bowWood = material([0.42, 0.14, 0.06]);
    mats.bowWood.gloss = 0.42;
    mats.bowWood.update();
    mats.bowGrip = material([0.15, 0.06, 0.035]);
    mats.bowGrip.gloss = 0.18;
    mats.bowGrip.update();
    mats.bowCord = material([0.78, 0.72, 0.58]);
    mats.iron = material([0.11, 0.1, 0.14]);
    mats.steel = material([0.56, 0.59, 0.66]);
    mats.indigo = material([0.13, 0.11, 0.31]);
    mats.turquoise = material([0.045, 0.4, 0.42]);
    mats.magenta = material([0.4, 0.055, 0.24]);
    mats.palaceTurquoise = material([0.08, 0.32, 0.36]);
    mats.palaceOchre = material([0.44, 0.25, 0.16]);
    mats.gold = material([0.78, 0.47, 0.075]);
    mats.targetLock = material([1, 0.22, 0.14], [1, 0.055, 0.025]);
    mats.warningGold = material([1, 0.8, 0.1], [1, 0.54, 0.03]);
    mats.warningAmber = material([1, 0.58, 0.12], [1.5, 0.45, 0.05]);
    mats.warningWhite = material([0.88, 0.95, 1], [0.7, 0.9, 1.2]);
    mats.warningArrow = mats.warningAmber;
    mats.warningRed = translucentMaterial(
      [1, 0.08, 0.025],
      0.42,
      [1.3, 0.025, 0.01],
    );
    mats.warningGround = translucentMaterial(
      [1, 0.12, 0.035],
      0.18,
      [0.65, 0.035, 0.01],
    );
    const warningTexture = radialWarningTexture();
    mats.warningGround.diffuseMap = warningTexture;
    mats.warningGround.opacityMap = warningTexture;
    mats.warningGround.opacityMapChannel = "a";
    mats.warningGround.update();
    mats.fire = material([1, 0.24, 0.015], [1, 0.19, 0.015]);
    mats.fireHot = material([1, 0.72, 0.1], [1, 0.5, 0.025]);
    mats.smoke = translucentMaterial([0.18, 0.16, 0.28], 0.2);
    mats.weaponTrail = translucentMaterial([1, 0.6, 0.22], 0.38);
    mats.hitImpact = translucentMaterial([1, 0.42, 0.16], 0.72);
    mats.healthBack = material([0.1, 0.045, 0.08]);
    mats.healthEnemy = material([0.95, 0.14, 0.1], [1, 0.05, 0.03]);
    mats.objective = material([0.96, 0.64, 0.1], [1, 0.5, 0.08]);
    mats.objectiveGlow = translucentMaterial([1, 0.54, 0.12], 0.22);
    mats.player = material([0.06, 0.34, 0.48]);
    mats.skin = material([0.52, 0.29, 0.18]);
    mats.enemy = material([0.52, 0.07, 0.11]);
    mats.archer = material([0.34, 0.11, 0.48]);
    mats.brute = material([0.48, 0.17, 0.045]);
    mats.family = material([0.07, 0.52, 0.48]);
    mats.chitra = material([0.78, 0.48, 0.11]);
    mats.roadSand.gloss = 0.008;
    mats.roadSand.metalness = 0;
    mats.roadSand.update();
    mats.bowWood.diffuse = new pc.Color(0.52, 0.16, 0.045);
    mats.bowWood.emissive = new pc.Color(0.025, 0.006, 0.001);
    mats.bowWood.emissiveIntensity = 0.45;
    mats.bowWood.update();
    for (const plaster of [
      mats.stone,
      mats.stoneLight,
      mats.sand,
      mats.sandLight,
      mats.sandDark,
      mats.roadSand,
      mats.houseLime,
      mats.houseOchre,
      mats.houseRose,
    ]) {
      plaster.useMetalness = true;
      plaster.metalness = 0;
      plaster.gloss = plaster === mats.roadSand ? 0.008 : 0.16;
      plaster.update();
    }
    for (const cloth of [mats.indigo, mats.turquoise, mats.magenta]) {
      cloth.useMetalness = true;
      cloth.metalness = 0;
      cloth.gloss = 0.08;
      cloth.update();
    }
    mats.gold.useMetalness = true;
    mats.gold.metalness = 0.76;
    mats.gold.gloss = 0.62;
    mats.gold.update();
    mats.iron.useMetalness = true;
    mats.iron.metalness = 0.64;
    mats.iron.gloss = 0.28;
    mats.iron.update();
    mats.steel.useMetalness = true;
    mats.steel.metalness = 0.84;
    mats.steel.gloss = 0.56;
    mats.steel.update();
  }

  rt.material = material;
  rt.translucentMaterial = translucentMaterial;
  rt.tintStreetHouse = tintStreetHouse;
  rt.tintEnvironmentEntity = tintEnvironmentEntity;
  rt.loadImageBasedLighting = loadImageBasedLighting;
  rt.createMaterials = createMaterials;
}
