import assert from "node:assert/strict";
import test from "node:test";

import { installHud } from "../../game/client-scripts/ui/hud.js";
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
