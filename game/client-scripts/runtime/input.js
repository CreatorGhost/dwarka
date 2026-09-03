export function shouldPauseForPointerUnlock({
  pointerLockElement,
  canvas,
  activeElement,
  playing,
  qaSession,
}) {
  return (
    playing &&
    pointerLockElement !== canvas &&
    !qaSession &&
    activeElement !== canvas
  );
}

export function installInput(rt) {
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

  rt.bindHudEvents = function bindHudEvents() {
    const saveSettingFrom = (
      element,
      key,
      read = () => Number(element.value),
    ) =>
      element.addEventListener("input", () => {
        state.settings[key] = read();
        rt.syncVoiceVolume();
        if (state.deferredVoiceLine) rt.playVoice(state.deferredVoiceLine);
        rt.sendParent("dwarka:settings", { settings: state.settings });
      });
    ui.captions.addEventListener("click", () => {
      state.settings.captions = !state.settings.captions;
      ui.captions.textContent = t(state.settings.captions ? "ccOn" : "ccOff");
      ui.captions.setAttribute("aria-pressed", String(state.settings.captions));
      if (!state.settings.captions) ui.caption.hidden = true;
      rt.sendParent("dwarka:settings", { settings: state.settings });
    });
    ui.mute.addEventListener("click", () => {
      state.settings.muteAll = !state.settings.muteAll;
      ui.muteAll.checked = state.settings.muteAll;
      ui.mute.textContent = state.settings.muteAll ? t("muted") : t("soundOn");
      ui.mute.setAttribute("aria-pressed", String(state.settings.muteAll));
      rt.syncVoiceVolume();
      if (!state.settings.muteAll && state.deferredVoiceLine)
        rt.playVoice(state.deferredVoiceLine);
      rt.sendParent("dwarka:settings", { settings: state.settings });
    });
    saveSettingFrom(ui.master, "master");
    saveSettingFrom(ui.music, "music");
    saveSettingFrom(ui.effects, "effects");
    saveSettingFrom(ui.dialogue, "dialogue");
    ui.textLocale.addEventListener("change", () => {
      state.settings.locale = ui.textLocale.value;
      if (state.settings.voiceLinked !== false) {
        state.settings.voiceLocale = ui.textLocale.value;
        ui.voiceLocale.value = ui.textLocale.value;
      }
      rt.applyLocale();
      rt.sendParent("dwarka:settings", { settings: state.settings });
    });
    ui.voiceLocale.addEventListener("change", () => {
      state.settings.voiceLocale = ui.voiceLocale.value;
      state.settings.voiceLinked =
        state.settings.voiceLocale === state.settings.locale;
      rt.sendParent("dwarka:settings", { settings: state.settings });
      if (!ui.storyPanel.hidden && state.pendingVoiceLine)
        rt.playVoice(state.pendingVoiceLine);
    });
    ui.muteAll.addEventListener("change", () => {
      state.settings.muteAll = ui.muteAll.checked;
      rt.syncSettingsUI();
      rt.syncVoiceVolume();
      if (!state.settings.muteAll && state.deferredVoiceLine)
        rt.playVoice(state.deferredVoiceLine);
      rt.sendParent("dwarka:settings", { settings: state.settings });
    });
    ui.settingsCaptions.addEventListener("change", () => {
      state.settings.captions = ui.settingsCaptions.checked;
      rt.syncSettingsUI();
      rt.sendParent("dwarka:settings", { settings: state.settings });
    });
    ui.speakerNames.addEventListener("change", () => {
      state.settings.speakerNames = ui.speakerNames.checked;
      rt.sendParent("dwarka:settings", { settings: state.settings });
    });
    ui.cameraShake.addEventListener("change", () => {
      state.settings.cameraShake = ui.cameraShake.checked;
      rt.sendParent("dwarka:settings", { settings: state.settings });
    });
    ui.tutorials.addEventListener("change", () => {
      state.settings.tutorials = ui.tutorials.checked;
      rt.renderTutorial();
      rt.sendParent("dwarka:settings", { settings: state.settings });
    });
    ui.reopenControls.addEventListener("click", () => {
      ui.settings.hidden = true;
      ui.controls.hidden = false;
      ui.pointerNote.hidden = false;
    });
    ui.resetTutorials.addEventListener("click", () => {
      state.tutorialSeen.clear();
      state.settings.tutorialDone = [];
      state.settings.tutorials = true;
      rt.syncSettingsUI();
      rt.renderTutorial();
      rt.sendParent("dwarka:settings", { settings: state.settings });
      rt.showToast(t("tutorialsReset"));
    });
    ui.retry.addEventListener("click", rt.connect);
    ui.pause.addEventListener("click", rt.showPause);
  };

  rt.bindModalEvents = function bindModalEvents() {
    ui.modalPrimary.addEventListener("click", () => {
      if (state.modalMode === "loading") {
        if (state.loadingRetryAvailable) rt.connect();
        return;
      }
      if (
        state.modalMode === "arrival-intro" ||
        state.modalMode === "courtyard-intro" ||
        state.modalMode === "pause"
      )
        rt.enterPlay();
      else if (state.modalMode === "ending") {
        if (state.storyIndex < STORY.ending.length - 1)
          rt.showEnding(state.storyIndex + 1);
        else if (state.localMode) {
          state.localSimulation.completeEnding();
          rt.processLocalEvents();
          rt.applySnapshot(state.localSimulation.snapshot(), "local");
        } else {
          state.socket?.send(JSON.stringify({ type: "story.complete" }));
          ui.modalPrimary.disabled = true;
        }
      } else if (state.modalMode === "complete") {
        state.requestedAction = "replay";
        state.snapshot = null;
        state.reconnectPhase = null;
        rt.sendParent("dwarka:replay");
        if (state.socket) {
          state.intentionalSockets.add(state.socket);
          state.socket.close(1000, "Replay");
        }
        window.setTimeout(rt.connect, 120);
      }
    });
    ui.modalSecondary.addEventListener("click", () =>
      rt.sendParent("dwarka:return-home"),
    );
  };

  rt.bindParentMessages = function bindParentMessages() {
    window.addEventListener("message", (event) => {
      if (!rt.validParentMessage(event)) return;
      const priorPlayer = state.profile?.anonymousPlayerId;
      const priorToken = state.token;
      state.parentProfileReceived = true;
      rt.stopEmbeddedHandshake();
      state.profile = event.data.profile;
      state.token = event.data.profile?.progressToken || null;
      state.settings = {
        ...state.settings,
        ...(event.data.profile?.settings || {}),
      };
      state.requestedAction = event.data.requestedAction || "continue";
      rt.syncSettingsUI();
      if (
        event.data.type === "dwarka:resume" ||
        priorPlayer !== state.profile?.anonymousPlayerId ||
        priorToken !== state.token
      )
        rt.connect();
    });
  };

  rt.bindInputEvents = function bindInputEvents() {
    document.addEventListener("keydown", (event) => {
      state.effectsReady = true;
      if (
        [
          "KeyW",
          "KeyA",
          "KeyS",
          "KeyD",
          "ShiftLeft",
          "ShiftRight",
          "Space",
          "KeyE",
        ].includes(event.code)
      )
        event.preventDefault();
      if (event.code === "Escape") {
        if (state.playing) rt.showPause();
        return;
      }
      if (event.code === "F3") {
        state.qaVisible = !state.qaVisible;
        ui.qa.hidden = !state.qaVisible;
        return;
      }
      if (!state.playing) return;
      if (!state.keys.has(event.code)) {
        if (event.code === "Space") rt.queuePressed("dodge");
        if (event.code === "KeyE") rt.queuePressed("interact");
      }
      if (["KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code))
        rt.completeTutorial("move");
      if (event.code === "ShiftLeft" || event.code === "ShiftRight")
        rt.completeTutorial("sprint");
      if (event.code === "Space") rt.completeTutorial("dodge");
      if (event.code === "KeyE") rt.completeTutorial("interact");
      state.keys.add(event.code);
    });
    document.addEventListener("keyup", (event) =>
      state.keys.delete(event.code),
    );
    document.addEventListener("click", (event) => {
      if (!event.target.closest?.("button")) return;
      state.effectsReady = true;
      rt.playEffect("uiClick", 0.34);
    });
    window.addEventListener("blur", () => {
      rt.clearInput();
      if (state.playing) rt.showPause();
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        rt.clearInput();
        if (state.playing) rt.showPause();
      }
    });
    document.addEventListener("pointerlockchange", () => {
      if (
        shouldPauseForPointerUnlock({
          pointerLockElement: document.pointerLockElement,
          canvas,
          activeElement: document.activeElement,
          playing: state.playing,
          qaSession: Boolean(rt.qaSessionAllowed?.()),
        })
      )
        rt.showPause();
    });
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    canvas.addEventListener("mousedown", (event) => {
      if (!state.playing) return;
      state.effectsReady = true;
      rt.requestGamePointerLock();
      if (event.button === 2) state.aim = true;
      if (event.button === 0) {
        const action = state.aim ? "fire" : "melee";
        const now = performance.now();
        const recovery = state.aim ? 750 : 450;
        if (now - state.lastVisualActionAt[action] < recovery) return;
        state.lastVisualActionAt[action] = now;
        rt.queuePressed(action);
        state.localAction = {
          name: action,
          until: now + (state.aim ? 700 : 460),
        };
        if (state.aim) {
          rt.spawnArrow();
          rt.playEffect("bowRelease", 0.72);
        } else rt.playEffect("bladeSwing", 0.62);
        rt.completeTutorial(state.aim ? "bow" : "blade");
      }
    });
    canvas.addEventListener("mouseup", (event) => {
      if (event.button === 2) state.aim = false;
    });
    document.addEventListener("mousemove", (event) => {
      if (
        !state.playing ||
        (document.pointerLockElement !== canvas &&
          document.activeElement !== canvas)
      )
        return;
      const movementX = pc.math.clamp(event.movementX, -120, 120);
      const movementY = pc.math.clamp(event.movementY, -120, 120);
      state.lookYaw += movementX * 0.0026;
      state.yaw = state.lookYaw;
      state.lookPitch = Math.max(
        -0.58,
        Math.min(0.42, state.lookPitch - movementY * 0.0022),
      );
      state.lastMouseAt = performance.now();
      if (Math.abs(movementX) + Math.abs(movementY) > 3)
        rt.completeTutorial("camera");
    });
    window.setInterval(rt.sendInput, 50);
  };
}
