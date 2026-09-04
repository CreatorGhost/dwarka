import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CHARACTER_ANIMATIONS,
  animationSpeeds,
  enemyWalkPlaybackSpeed,
  keepCharacterRenderDetail,
} from "../../game/client-scripts/character/animation.js";
import {
  enemyActionAnimation,
  interpolateEnemyYaw,
  separateEnemyVisuals,
  visibleEnemyStates,
} from "../../game/client-scripts/combat/effects.js";
import {
  attackWarningGlyph,
  bowReticlePresentation,
  targetRimColor,
  visibleArrowEuler,
} from "../../game/client-scripts/combat/reticle.js";
import { installHud } from "../../game/client-scripts/ui/hud.js";
import { shouldPauseForPointerUnlock } from "../../game/client-scripts/runtime/input.js";
import {
  desktopPixelRatio,
  playerWeaponVisibility,
  safeCameraDistance,
} from "../../game/client-scripts/runtime/loop.js";
import {
  installModals,
  STORY_TAIL_MS,
  storyFallbackDuration,
} from "../../game/client-scripts/ui/modals.js";
import { doorVisualPose } from "../../game/client-scripts/scene/doors.js";
import { createEmbeddedHandshake } from "../../game/client-scripts/net/handshake.js";
import { postProfileResume } from "../app/game/chapter-1/profile-bridge.js";

function element(overrides = {}) {
  return {
    hidden: false,
    textContent: "",
    dataset: {},
    classList: { toggle() {}, remove() {} },
    setAttribute() {},
    focus() {},
    ...overrides,
  };
}

const worldLayout = JSON.parse(
  readFileSync(new URL("../../game/client-scripts/world-layout.json", import.meta.url), "utf8"),
);

test("a late parent listener catches a repeated ready signal before the fallback deadline", () => {
  const scheduled = { interval: null, fallback: null };
  const clock = {
    setInterval(callback) {
      scheduled.interval = callback;
      return 1;
    },
    clearInterval() {
      scheduled.interval = null;
    },
    setTimeout(callback) {
      scheduled.fallback = callback;
      return 2;
    },
    clearTimeout() {
      scheduled.fallback = null;
    },
  };
  let parentListening = false;
  let parentProfile = false;
  let standaloneFallbacks = 0;
  let readySignals = 0;
  let handshake;
  handshake = createEmbeddedHandshake({
    clock,
    hasParentProfile: () => parentProfile,
    sendReady: () => {
      readySignals += 1;
      if (parentListening) {
        const frameMessages = [];
        postProfileResume(
          { postMessage: (message) => frameMessages.push(message) },
          "https://dwarka.test",
          { anonymousPlayerId: "late-parent" },
          "continue",
        );
        parentProfile = frameMessages.at(-1)?.type === "dwarka:resume";
        handshake.stop();
      }
    },
    useStandalone: () => {
      standaloneFallbacks += 1;
    },
  });

  handshake.start();
  assert.equal(readySignals, 1);
  parentListening = true;
  scheduled.interval();
  assert.equal(parentProfile, true);
  assert.equal(readySignals, 2);
  assert.equal(standaloneFallbacks, 0);
  assert.equal(scheduled.fallback, null);
});

test("an unanswered embedded handshake enters standalone play after three seconds", () => {
  let fallback;
  let introShown = false;
  const handshake = createEmbeddedHandshake({
    clock: {
      setInterval: () => 1,
      clearInterval() {},
      setTimeout(callback, delay) {
        assert.equal(delay, 3_000);
        fallback = callback;
        return 2;
      },
      clearTimeout() {},
    },
    hasParentProfile: () => false,
    sendReady() {},
    useStandalone: () => {
      introShown = true;
    },
  });
  handshake.start();
  fallback();
  assert.equal(introShown, true);
});

test("rescue door presentation swings around its authored hinge", () => {
  const door = worldLayout.doors.find(({ id }) => id === "courtyard-rescue-door");
  const closed = doorVisualPose(door, 0, worldLayout.doorAssets);
  const open = doorVisualPose(door, 1, worldLayout.doorAssets);
  const width = worldLayout.doorAssets.Door_4_Flat.width * door.scale;
  const closedRadians = (closed.yaw * Math.PI) / 180;
  const openRadians = (open.yaw * Math.PI) / 180;
  const closedHinge = {
    x: closed.x - Math.cos(closedRadians) * width * 0.5,
    z: closed.z + Math.sin(closedRadians) * width * 0.5,
  };
  const openHinge = {
    x: open.x - Math.cos(openRadians) * width * 0.5,
    z: open.z + Math.sin(openRadians) * width * 0.5,
  };
  assert.ok(Math.hypot(closed.x - door.position[0], closed.z - door.position[2]) < 0.0001);
  assert.equal(closed.y, 0);
  assert.equal(closed.yaw, -90);
  assert.ok(Math.abs(open.yaw - 2) < 0.0001);
  assert.ok(Math.hypot(openHinge.x - closedHinge.x, openHinge.z - closedHinge.z) < 0.0001);
});

test("voice requested before the manifest finishes is played after the manifest loads", async (t) => {
  const createdAudio = [];
  class AudioProbe {
    constructor(path) {
      this.path = path;
      createdAudio.push(this);
    }
    addEventListener() {}
    pause() {}
    play() {
      return Promise.resolve();
    }
  }
  const priorAudio = globalThis.Audio;
  const priorDocument = globalThis.document;
  const priorFetch = globalThis.fetch;
  t.after(() => {
    globalThis.Audio = priorAudio;
    globalThis.document = priorDocument;
    globalThis.fetch = priorFetch;
  });
  globalThis.Audio = AudioProbe;
  globalThis.document = {
    createElement: () => ({ canPlayType: (type) => (type === "audio/ogg" ? "probably" : "") }),
  };
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({
      entries: [
        {
          sourceLineId: "ch1-raid-begins",
          locale: "en",
          status: "validated",
          assets: [
            {
              codec: "ogg",
              runtimePath: "/audio/chapter-1/voices/en/ch1-raid-begins.ogg",
            },
          ],
        },
      ],
    }),
  });
  const state = {
    settings: { locale: "en", voiceLocale: "en", master: 1, dialogue: 1 },
    voiceEntries: new Map(),
    voiceAudio: null,
    deferredVoiceLine: null,
    pendingVoiceLine: null,
  };
  const rt = {
    state,
    ui: { storyPanel: element({ hidden: true }) },
    t: (key) => key,
  };
  installHud(rt);

  rt.playVoice("ch1-raid-begins");
  assert.equal(state.deferredVoiceLine, "ch1-raid-begins");
  await rt.loadVoiceManifest();

  assert.equal(state.deferredVoiceLine, null);
  assert.equal(createdAudio.at(-1)?.path, "/audio/chapter-1/voices/en/ch1-raid-begins.ogg");
  state.settings.muteAll = true;
  rt.playVoice("ch1-raid-begins");
  assert.equal(state.deferredVoiceLine, "ch1-raid-begins");
  state.settings.muteAll = false;
  rt.playVoice(state.deferredVoiceLine);
  assert.equal(state.deferredVoiceLine, null);
  assert.equal(createdAudio.length, 2);
});

test("bow reticle distinguishes a lock, recovery, and a blocked shot", () => {
  assert.deepEqual(
    bowReticlePresentation({
      hasTarget: true,
      locked: true,
      cooldownActive: false,
    }),
    { className: "locked", labelKey: "targetAcquired" },
  );
  assert.equal(
    bowReticlePresentation({
      hasTarget: true,
      locked: true,
      cooldownActive: true,
    }).labelKey,
    "targetCooldown",
  );
  assert.equal(
    bowReticlePresentation({
      hasTarget: false,
      locked: false,
      cooldownActive: false,
    }).labelKey,
    "targetNoShot",
  );
  assert.equal(
    bowReticlePresentation({
      hasTarget: true,
      locked: true,
      cooldownActive: false,
      flightActive: true,
    }).labelKey,
    "targetFlight",
  );
  assert.deepEqual(visibleArrowEuler(0, Math.PI / 2), [90, -90, 0]);
});

test("targeting cues distinguish all three enemy roles without relying on red", () => {
  assert.deepEqual(["skirmisher", "archer", "brute"].map(attackWarningGlyph), [
    "blade-exclamation",
    "arrow-eye",
    "mace-diamond",
  ]);
  const rimColors = ["skirmisher", "archer", "brute"].map(targetRimColor);
  assert.equal(new Set(rimColors.map((color) => color.join(","))).size, 3);
  assert.ok(targetRimColor("archer")[2] > targetRimColor("archer")[0]);
  assert.ok(targetRimColor("skirmisher")[0] > targetRimColor("skirmisher")[2]);
});

test("changing locale re-renders the already-open pause modal", () => {
  const priorDocument = globalThis.document;
  const priorWindow = globalThis.window;
  const labels = {
    en: { paused: "Paused", pauseCopy: "Frozen", resume: "Resume", returnHome: "Return home" },
    hi: { paused: "विराम", pauseCopy: "रुका हुआ", resume: "जारी रखें", returnHome: "मुखपृष्ठ" },
  };
  const translatedNodes = [];
  globalThis.document = {
    documentElement: { lang: "en" },
    querySelectorAll: () => translatedNodes,
    querySelector: () => element(),
  };
  globalThis.window = { DWARKA_GAME_I18N: labels };
  try {
    const ui = {
      modal: element({ hidden: false }),
      modalTitle: element(),
      modalCopy: element(),
      modalPrimary: element(),
      modalSecondary: element(),
      controls: element(),
      settings: element(),
      storyPanel: element(),
      storyImage: element(),
      storySpeaker: element(),
      storyText: element(),
      pointerNote: element(),
      phaseKicker: element(),
      pause: element(),
      tutorial: null,
    };
    const state = {
      settings: { locale: "en" },
      modalMode: "pause",
      resumeModalPhase: null,
      snapshot: null,
    };
    const rt = {
      state,
      ui,
      t: (key) => labels[state.settings.locale]?.[key] ?? key,
      clearInput() {},
      stopVoice() {},
      queuePressed() {},
    };
    installModals(rt);
    installHud(rt);

    rt.refreshOpenModalLocale();
    assert.deepEqual(
      [ui.modalTitle.textContent, ui.modalCopy.textContent, ui.modalPrimary.textContent],
      ["Paused", "Frozen", "Resume"],
    );
    state.settings.locale = "hi";
    rt.applyLocale();
    assert.deepEqual(
      [ui.modalTitle.textContent, ui.modalCopy.textContent, ui.modalPrimary.textContent],
      ["विराम", "रुका हुआ", "जारी रखें"],
    );
    assert.equal(ui.modalSecondary.textContent, "मुखपृष्ठ");
  } finally {
    globalThis.document = priorDocument;
    globalThis.window = priorWindow;
  }
});

test("pause remains available during offline fallback in active combat", () => {
  const ui = {
    modal: element({ hidden: true }),
    modalTitle: element(),
    modalCopy: element(),
    modalPrimary: element(),
    modalSecondary: element(),
    controls: element(),
    settings: element(),
    storyPanel: element(),
    storyImage: element(),
    storySpeaker: element(),
    storyText: element(),
    pointerNote: element(),
  };
  let locallyPaused = false;
  const state = {
    settings: { locale: "en" },
    playing: true,
    paused: false,
    sessionAccepted: false,
    snapshot: { phase: "market" },
    localSimulation: { setPaused: (value) => (locallyPaused = value) },
    socket: null,
  };
  const rt = {
    state,
    ui,
    canvas: { focus() {} },
    STORY: { ending: [] },
    STORY_VOICE_LINES: {},
    PHASE_DETAILS: {},
    t: (key) => key,
    clearInput() {},
    stopVoice() {},
    queuePressed() {},
  };
  installModals(rt);
  rt.showPause();
  assert.equal(state.playing, false);
  assert.equal(state.paused, true);
  assert.equal(state.modalMode, "pause");
  assert.equal(ui.modal.hidden, false);
  assert.equal(locallyPaused, true);
});

test("narrated story beats outlast their voice and retain a readable muted fallback", () => {
  assert.equal(STORY_TAIL_MS, 450);
  assert.equal(storyFallbackDuration("A short line.", 8.5), 9_400);
  assert.ok(storyFallbackDuration("A long localized line with enough words to read.") >= 5_000);
});

test("pointer unlock pauses real play after a held lock but not QA or an unlocked focused canvas", () => {
  const canvas = {};
  assert.equal(
    shouldPauseForPointerUnlock({
      pointerLockElement: null,
      canvas,
      activeElement: null,
      playing: true,
      qaSession: false,
      hadPointerLock: false,
    }),
    true,
  );
  for (const exempt of [
    { activeElement: canvas, qaSession: false, hadPointerLock: false },
    { activeElement: null, qaSession: true, hadPointerLock: true },
  ])
    assert.equal(
      shouldPauseForPointerUnlock({
        pointerLockElement: null,
        canvas,
        playing: true,
        ...exempt,
      }),
      false,
    );
  assert.equal(
    shouldPauseForPointerUnlock({
      pointerLockElement: null,
      canvas,
      activeElement: canvas,
      playing: true,
      qaSession: false,
      hadPointerLock: true,
    }),
    true,
  );
});

test("sprint uses the authored sprint cycle at the calibrated travel rate", () => {
  assert.equal(CHARACTER_ANIMATIONS.sprint, "Sprint_Loop");
  assert.equal(
    animationSpeeds({ feel: { dodgeClipSeconds: 1.47, dodgeActionSeconds: 0.65 } }).sprint,
    1.12,
  );
});

test("combat NPC detail LOD preserves silhouettes and hero faces", () => {
  assert.equal(keepCharacterRenderDetail("archer", "Eyes"), false);
  assert.equal(keepCharacterRenderDetail("brute", "Male_Ranger_Body_Belt_1"), false);
  assert.equal(keepCharacterRenderDetail("archer", "Male_Ranger_Acc_Pauldron"), false);
  assert.equal(keepCharacterRenderDetail("archer", "Male_Ranger_Head_Hood"), true);
  assert.equal(keepCharacterRenderDetail("brute", "Hair_Beard"), true);
  assert.equal(keepCharacterRenderDetail("Vrishaketu", "Eyes"), true);
  assert.equal(keepCharacterRenderDetail("Chitra", "Eyebrows"), true);
});

test("camera collision treats the route edge as a wall-sized occluder", () => {
  const floorAt = (x, z) => (x >= -6 && x <= 6 && z >= -18 && z <= 4 ? 0 : null);
  const target = { x: 4.9, y: 1.6, z: -8 };
  const open = safeCameraDistance({
    target,
    desired: { x: 2, y: 2.8, z: -8 },
    bounds: { minX: -28, maxX: 28, minZ: -58, maxZ: 34 },
    colliders: [],
    floorAt,
  });
  const acrossFacade = safeCameraDistance({
    target,
    desired: { x: 9, y: 2.8, z: -8 },
    bounds: { minX: -28, maxX: 28, minZ: -58, maxZ: 34 },
    colliders: [],
    floorAt,
  });
  assert.ok(open > 2.8);
  assert.ok(acrossFacade < 1.2, `camera travelled ${acrossFacade.toFixed(2)} m through the facade`);
});

test("desktop rendering remains at the native 1.0 pixel ratio", () => {
  assert.equal(desktopPixelRatio(1), 1);
  assert.equal(desktopPixelRatio(2), 1);
});

test("the authored traversal path covers the full 186 metre route on valid floors", () => {
  const distance = worldLayout.routeWaypoints.slice(1).reduce((total, point, index) => {
    const previous = worldLayout.routeWaypoints[index];
    return total + Math.hypot(point.x - previous.x, point.z - previous.z);
  }, 0);
  const floorAt = (point) =>
    worldLayout.floorRegions.find(
      (region) =>
        point.x >= region.minX &&
        point.x <= region.maxX &&
        point.z >= region.minZ &&
        point.z <= region.maxZ,
    )?.y ?? null;

  assert.equal(distance, 186);
  assert.ok(worldLayout.routeWaypoints.every((point) => floorAt(point) === point.y));
});

test("a health drop owns the enemy animation frame and player hit-stun keeps the sword", () => {
  assert.equal(
    enemyActionAnimation({
      kind: "brute",
      dead: false,
      hitActive: true,
      warningActive: true,
      impactActive: true,
      visualSpeed: 2,
    }),
    "hit",
  );
  assert.deepEqual(playerWeaponVisibility(false, "hit"), {
    bowEquipped: false,
    swordEquipped: true,
  });
});

test("snapshot interpolation cannot visually collapse two attackers", () => {
  const separated = separateEnemyVisuals([
    { id: "courtyard-1-0", x: 21.946, z: 14.007, health: 60 },
    { id: "courtyard-1-1", x: 22.422, z: 13.581, health: 60 },
  ]);
  assert.ok(Math.hypot(separated[0].x - separated[1].x, separated[0].z - separated[1].z) >= 1.349);
  assert.deepEqual(
    separated.map(({ id, health }) => ({ id, health })),
    [
      { id: "courtyard-1-0", health: 60 },
      { id: "courtyard-1-1", health: 60 },
    ],
  );
});

test("enemy walk playback tracks rendered velocity and inactive waves stay hidden", () => {
  assert.ok(enemyWalkPlaybackSpeed(2.15) > enemyWalkPlaybackSpeed(1.35));
  assert.ok(enemyWalkPlaybackSpeed(1.35) > enemyWalkPlaybackSpeed(0.5));
  assert.equal(
    visibleEnemyStates({
      phase: "market",
      family: { active: false },
      enemies: [{ id: "market-hidden" }],
    }).length,
    0,
  );
  assert.equal(
    visibleEnemyStates({
      phase: "market",
      family: { active: true },
      enemies: [{ id: "market-active" }],
    }).length,
    1,
  );
});

test("enemy snapshot yaw interpolates across the shortest arc", () => {
  const start = (170 * Math.PI) / 180;
  const end = (-170 * Math.PI) / 180;
  const midpoint = interpolateEnemyYaw(start, end, 0.5);
  assert.ok(
    Math.abs(Math.abs(midpoint) - Math.PI) < 0.0001,
    `yaw took the long path through ${midpoint}`,
  );
});
