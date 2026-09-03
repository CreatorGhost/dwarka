import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  CHARACTER_ANIMATIONS,
  animationSpeeds,
} from "../../game/client-scripts/character/animation.js";
import { enemyActionAnimation } from "../../game/client-scripts/combat/effects.js";
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
import { installModals } from "../../game/client-scripts/ui/modals.js";

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

test("pointer unlock pauses real play but not QA or a still-focused canvas", () => {
  const canvas = {};
  assert.equal(
    shouldPauseForPointerUnlock({
      pointerLockElement: null,
      canvas,
      activeElement: null,
      playing: true,
      qaSession: false,
    }),
    true,
  );
  for (const exempt of [
    { activeElement: canvas, qaSession: false },
    { activeElement: null, qaSession: true },
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
});

test("sprint uses the authored sprint cycle at the calibrated travel rate", () => {
  assert.equal(CHARACTER_ANIMATIONS.sprint, "Sprint_Loop");
  assert.equal(
    animationSpeeds({ feel: { dodgeClipSeconds: 1.47, dodgeActionSeconds: 0.65 } }).sprint,
    1.12,
  );
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
