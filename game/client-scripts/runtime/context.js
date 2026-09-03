import {
  ChapterSimulation,
  CHAPTER_CONFIG,
  DOOR_COLLIDERS,
  DOORS,
  segmentBlocked,
} from "../sim/shared.ts";
import { safeWebSocketEndpoint } from "../net/session.js";
import { angleDifference, targetLineBlocked } from "../combat/targeting.js";
import { assetUrl, chapterAssetRevision, MODEL_URLS } from "../scene/assets.js";
import {
  PHASE_DETAILS,
  UI_MESSAGES,
  STORY,
  STORY_VOICE_LINES,
  EFFECT_URLS,
  TUTORIAL_STEPS,
  PLAYABLE_PHASES,
} from "../ui/content.js";
import {
  CHARACTER_ANIMATIONS,
  animationSpeeds,
  characterStateGraph,
} from "../character/animation.js";

export function createRuntime() {
  const pc = window.pc;
  const canvas = document.getElementById("application-canvas");
  canvas.tabIndex = -1;
  const ui = {
    hud: document.getElementById("hud"),
    healthFill: document.getElementById("health-fill"),
    healthText: document.getElementById("health-text"),
    objective: document.getElementById("objective-text"),
    detail: document.getElementById("objective-detail"),
    phaseKicker: document.getElementById("phase-kicker"),
    danger: document.getElementById("danger-card"),
    dangerTime: document.getElementById("danger-time"),
    reticle: document.getElementById("reticle"),
    waypoint: document.getElementById("waypoint-indicator"),
    waypointDistance: document.getElementById("waypoint-distance"),
    interaction: document.getElementById("interaction"),
    tutorial: document.getElementById("tutorial"),
    tutorialStep: document.getElementById("tutorial-step"),
    tutorialTitle: document.getElementById("tutorial-title"),
    tutorialCopy: document.getElementById("tutorial-copy"),
    caption: document.getElementById("caption"),
    captionSpeaker: document.getElementById("caption-speaker"),
    captionText: document.getElementById("caption-text"),
    toast: document.getElementById("toast"),
    fps: document.getElementById("fps-value"),
    qa: document.getElementById("qa-overlay"),
    damageFlash: document.getElementById("damage-flash"),
    modal: document.getElementById("modal"),
    modalTitle: document.getElementById("modal-title"),
    modalCopy: document.getElementById("modal-copy"),
    modalPrimary: document.getElementById("modal-primary"),
    modalSecondary: document.getElementById("modal-secondary"),
    storyPanel: document.getElementById("story-panel"),
    storyImage: document.getElementById("story-image"),
    storySpeaker: document.getElementById("story-speaker"),
    storyText: document.getElementById("story-text"),
    controls: document.getElementById("controls-grid"),
    settings: document.getElementById("settings-panel"),
    pointerNote: document.getElementById("pointer-note"),
    reconnect: document.getElementById("reconnect"),
    retry: document.getElementById("retry-connection"),
    connectionTitle: document.getElementById("connection-title"),
    connectionCopy: document.getElementById("connection-copy"),
    connectionSpinner: document.getElementById("connection-spinner"),
    captions: document.getElementById("captions-toggle"),
    mute: document.getElementById("mute-toggle"),
    pause: document.getElementById("pause-button"),
    textLocale: document.getElementById("text-locale"),
    voiceLocale: document.getElementById("voice-locale"),
    master: document.getElementById("master-volume"),
    music: document.getElementById("music-volume"),
    effects: document.getElementById("effects-volume"),
    dialogue: document.getElementById("dialogue-volume"),
    muteAll: document.getElementById("mute-all"),
    settingsCaptions: document.getElementById("settings-captions"),
    speakerNames: document.getElementById("speaker-names"),
    cameraShake: document.getElementById("camera-shake"),
    tutorials: document.getElementById("tutorial-prompts"),
    reopenControls: document.getElementById("reopen-controls"),
    resetTutorials: document.getElementById("reset-tutorials"),
  };
  const state = {
    profile: null,
    token: null,
    settings: {
      locale: "en",
      voiceLocale: "en",
      voiceLinked: true,
      master: 1,
      music: 0.7,
      effects: 0.8,
      dialogue: 1,
      muteAll: false,
      captions: true,
      speakerNames: true,
      cameraShake: true,
      tutorials: true,
      tutorialDone: [],
    },
    requestedAction: "continue",
    socket: null,
    reconnectTimer: 0,
    reconnectAttempts: 0,
    sessionAccepted: false,
    snapshot: null,
    reconnectPhase: null,
    confirmedPhase: "arrival",
    intentionalSockets: new WeakSet(),
    lastPhase: null,
    localSimulation: null,
    localMode: false,
    localSeq: 0,
    localPressed: new Set(),
    predictedPlayer: null,
    predictedVelocity: { x: 0, z: 0 },
    networkSnapshots: [],
    keys: new Set(),
    pressed: new Set(),
    aim: false,
    yaw: 0,
    pitch: -0.1,
    lookYaw: 0,
    lookPitch: -0.1,
    visualYaw: 0,
    seq: 0,
    playing: false,
    paused: true,
    modalMode: "loading",
    storyIndex: 0,
    playerEntity: null,
    enemyEntities: new Map(),
    enemyHealth: new Map(),
    familyEntities: [],
    familyFocusLight: null,
    characterRoots: new Set(),
    modelAssets: {},
    animationTracks: {},
    environmentEntities: [],
    streamedEnvironment: new Map(),
    preloadedEnvironmentKeys: new Set(),
    routeSurfaceEntities: [],
    doorEntities: new Map(),
    environmentMaterials: new Map(),
    projectiles: [],
    impacts: [],
    chitra: null,
    objectiveMarker: null,
    targetMarker: null,
    targetEnemyId: null,
    app: null,
    camera: null,
    cameraFrame: null,
    roadEntity: null,
    environmentAtlas: null,
    skyboxCubemap: null,
    moonlitSkybox: null,
    cameraDistance: 4.5,
    aimBlend: 0,
    staticBatchGroup: null,
    fpsFrames: 0,
    fpsElapsed: 0,
    fpsLast: 60,
    qaVisible: false,
    qaFocusName: null,
    qaFocusDistance: 1.45,
    qaFocusAngle: 0,
    qaAnimationPreviews: new Map(),
    qaAimPreview: false,
    qaPreviewActive: false,
    qaScaleReferences: [],
    captionTimer: 0,
    toastTimer: 0,
    effectsReady: false,
    parentProfileReceived: false,
    loadingRetryTimer: 0,
    loadingRetryAvailable: false,
    tutorialSeen: new Set(),
    mouseTurned: false,
    voiceEntries: new Map(),
    voiceAudio: null,
    deferredVoiceLine: null,
    pendingVoiceLine: null,
    resumeModalPhase: null,
    lastBarkPhase: null,
    effectAudio: new Map(),
    localAction: null,
    lastVisualActionAt: { fire: 0, melee: 0 },
    enemyWarnings: new Map(),
    lastPlayerHealth: null,
    damageFlashUntil: 0,
    lastFootstepAt: 0,
    footstepIndex: 0,
    lastMouseAt: 0,
    fireEffects: [],
    fireLights: [],
    routeLights: [],
    vfxAssets: {},
    batchedModelRenders: 0,
    pennantMesh: null,
    hitStopUntil: 0,
    snapshotVelocity: { x: 0, z: 0 },
    enemySnapshotVelocities: new Map(),
    enemyInterpolationBuffer: [],
    enemyPriorById: new Map(),
    enemyActiveIds: new Set(),
    snapshotReceivedAt: 0,
    interpolationClockMs: performance.now(),
    cameraSpring: null,
    cameraSpringVelocity: { x: 0, y: 0, z: 0 },
    cameraScratch: {
      forward: { x: 0, z: 0 },
      right: { x: 0, z: 0 },
      target: { x: 0, y: 0, z: 0 },
      desired: { x: 0, y: 0, z: 0 },
      safeDesired: { x: 0, y: 0, z: 0 },
    },
    weaponVisibility: { bowEquipped: false, swordEquipped: true },
    qaHudElapsed: 0,
    renderScale: 1,
    lowFpsSeconds: 0,
    recoveredFpsSeconds: 0,
    visibilityElapsed: 0,
    meshSnapshotDistance: 0,
    meshSnapshotMaxDistance: 0,
    meshSnapshotLastWarningAt: 0,
    snapVisualOnNextSnapshot: false,
  };
  const rt = {
    pc,
    canvas,
    ui,
    state,
    mats: {},
    CHAPTER_CONFIG,
    ChapterSimulation,
    CHARACTER_ANIMATIONS,
    animationSpeeds,
    characterStateGraph,
    PHASE_DETAILS,
    UI_MESSAGES,
    STORY,
    STORY_VOICE_LINES,
    EFFECT_URLS,
    TUTORIAL_STEPS,
    PLAYABLE_PHASES,
    MODEL_URLS,
    assetUrl,
    chapterAssetRevision,
    angleDifference,
    targetLineBlocked,
    segmentBlocked,
    safeWebSocketEndpoint,
    CHARACTER_ANIMATION_SPEEDS: animationSpeeds(CHAPTER_CONFIG),
  };

  function sendParent(type, payload = {}) {
    if (window.parent !== window)
      window.parent.postMessage({ type, ...payload }, window.location.origin);
  }
  function strings() {
    const locale =
      typeof state.settings.locale === "string" ? state.settings.locale : "en";
    return (
      window.DWARKA_GAME_I18N?.[locale] || window.DWARKA_GAME_I18N?.en || {}
    );
  }
  function t(key) {
    return strings()[key] ?? window.DWARKA_GAME_I18N?.en?.[key] ?? key;
  }
  function localizedMessage(key) {
    const locale =
      typeof state.settings.locale === "string" ? state.settings.locale : "en";
    return (
      window.DWARKA_MESSAGES?.[locale]?.[key] ??
      strings()[key] ??
      UI_MESSAGES[locale]?.[key] ??
      UI_MESSAGES.en[key] ??
      key
    );
  }
  function clearInput() {
    state.keys.clear();
    state.pressed.clear();
    state.localPressed.clear();
    state.aim = false;
  }
  function queuePressed(action) {
    state.pressed.add(action);
    state.localPressed.add(action);
  }
  rt.sendParent = sendParent;
  rt.strings = strings;
  rt.t = t;
  rt.localizedMessage = localizedMessage;
  rt.clearInput = clearInput;
  rt.queuePressed = queuePressed;
  return rt;
}

export async function loadWorld(rt) {
  const pc = rt.pc;
  const runtimeScriptUrl = document.currentScript?.src || window.location.href;
  const launchApplication = pc.Application.getApplication?.() || pc.app || null;
  const preloadedLayout =
    launchApplication?.assets.find("world-layout.json")?.resource;
  const parseLayoutResource = (resource) => {
    if (!resource) return null;
    if (typeof resource === "string") return JSON.parse(resource);
    if (resource instanceof ArrayBuffer)
      return JSON.parse(new TextDecoder().decode(resource));
    if (ArrayBuffer.isView(resource))
      return JSON.parse(new TextDecoder().decode(resource));
    return typeof resource === "object" ? resource : null;
  };
  let WORLD_LAYOUT = parseLayoutResource(preloadedLayout);
  if (!WORLD_LAYOUT) {
    const layoutUrl = new URL(
      "./world-layout.json?v=20260902b",
      runtimeScriptUrl,
    );
    const layoutResponse = await fetch(layoutUrl, { cache: "no-cache" });
    if (!layoutResponse.ok)
      throw new Error(`World layout failed to load (${layoutResponse.status})`);
    WORLD_LAYOUT = await layoutResponse.json();
  }
  if (
    !WORLD_LAYOUT?.worldBounds ||
    !Array.isArray(WORLD_LAYOUT.colliders) ||
    !WORLD_LAYOUT.placements
  )
    throw new Error("World layout is malformed");
  rt.WORLD_LAYOUT = WORLD_LAYOUT;
  rt.WORLD_BOUNDS = Object.freeze(WORLD_LAYOUT.worldBounds);
  rt.WORLD_COLLIDERS = Object.freeze(
    [...WORLD_LAYOUT.colliders, ...DOOR_COLLIDERS].map((collider) =>
      Object.freeze([
        collider.minX,
        collider.maxX,
        collider.minZ,
        collider.maxZ,
        collider.label || DOORS.find((door) => door.id === collider.id)?.label,
        collider.id,
        collider.visual,
      ]),
    ),
  );
  rt.FLOOR_REGIONS = Object.freeze(WORLD_LAYOUT.floorRegions || []);
  rt.ROUTE_SEGMENTS = Object.freeze(WORLD_LAYOUT.routeSegments || []);
  rt.ROUTE_WAYPOINTS = Object.freeze(WORLD_LAYOUT.routeWaypoints || []);
  rt.STREAMING = Object.freeze(WORLD_LAYOUT.streaming || {});
  rt.CHECKPOINT_LIGHTS = Object.freeze(WORLD_LAYOUT.checkpointLights || []);
  rt.FAMILY_STAGING = Object.freeze(WORLD_LAYOUT.familyStaging || {});
  rt.QA_VISTAS = Object.freeze(WORLD_LAYOUT.qaVistas || []);
  rt.ENVIRONMENT_PLACEMENTS = Object.freeze(WORLD_LAYOUT.placements);
  rt.DOORS = DOORS;
  rt.STREET_HOUSE_BAYS = Object.freeze(WORLD_LAYOUT.streetHouseBays || []);
  rt.TALL_HOUSE_BAYS = Object.freeze(WORLD_LAYOUT.tallHouseBays || []);
  rt.SETBACK_HOUSE_BAYS = Object.freeze(WORLD_LAYOUT.setbackHouseBays || []);
  rt.UPPER_HOUSE_STYLE = Object.freeze(WORLD_LAYOUT.upperHouseStyle || {});
  rt.SURFACE_DETAILS = Object.freeze(WORLD_LAYOUT.surfaceDetails || {});
  rt.LANDMARKS = Object.freeze(WORLD_LAYOUT.landmarks || {});
  rt.STREET_HOUSE_MODEL_KEYS = new Set([
    "Wall_Plaster_Door_Flat",
    "Wall_Plaster_Straight",
    "Wall_Plaster_Window_Wide_Round",
    "Door_4_Flat",
    "Kenney_roof_flat_square",
  ]);
  rt.UPPER_HOUSE_MODEL_KEYS = new Set([
    ...rt.STREET_HOUSE_MODEL_KEYS,
    "Balcony_Simple_Straight",
  ]);
  rt.UPPER_HOUSE_FRONTS = Object.freeze(WORLD_LAYOUT.upperHouseFronts || []);
  rt.GROUND_ALIGNED_MODELS = new Set(WORLD_LAYOUT.groundAlignedModels);
  rt.STREET_SURFACE_Y = WORLD_LAYOUT.streetSurfaceY;
  rt.CHARACTER_GROUND_LIFT = WORLD_LAYOUT.characterGroundLift;
  rt.floorHeightAt = (x, z) => {
    const region = rt.FLOOR_REGIONS.find(
      (region) =>
        x >= region.minX &&
        x <= region.maxX &&
        z >= region.minZ &&
        z <= region.maxZ,
    );
    return region?.y ?? null;
  };
}
