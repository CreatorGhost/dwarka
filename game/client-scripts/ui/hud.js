export function installHud(rt) {
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

  function setConnectionStatus(title, copy, failed = false) {
    ui.connectionTitle.textContent = title;
    ui.connectionCopy.textContent = copy;
    ui.reconnect.classList.toggle("failed", failed);
    ui.retry.hidden = failed;
    ui.reconnect.hidden = false;
  }

  function applyLocale() {
    const locale = window.DWARKA_GAME_I18N?.[state.settings.locale]
      ? state.settings.locale
      : "en";
    document.documentElement.lang = locale;
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      node.textContent = rt.t(node.dataset.i18n);
    });
    ui.phaseKicker.textContent = rt.t("objective");
    document.querySelector(".danger-card b").textContent = rt.t("familyDanger");
    document.querySelector("#interaction span").textContent =
      rt.t("speakChitra");
    ui.pause.textContent = rt.t("pause");
    ui.pointerNote.textContent = rt.t("pointerNote");
    if (state.snapshot) updateHud(state.snapshot);
    renderTutorial();
    rt.refreshOpenModalLocale?.();
  }

  function setCaption(speaker, text, seconds = 3.5) {
    if (!state.settings.captions) return;
    ui.captionSpeaker.textContent =
      state.settings.speakerNames === false ? "" : speaker;
    ui.captionSpeaker.hidden = state.settings.speakerNames === false;
    ui.captionText.textContent = text;
    ui.caption.hidden = false;
    state.captionTimer = seconds;
  }

  function showToast(text, seconds = 2.5) {
    ui.toast.textContent = text;
    ui.toast.hidden = false;
    state.toastTimer = seconds;
  }

  function renderTutorial() {
    if (!ui.tutorial) return;
    const next = TUTORIAL_STEPS.find(([id]) => !state.tutorialSeen.has(id));
    const visible = Boolean(
      next &&
        state.settings.tutorials !== false &&
        state.snapshot?.phase === "arrival" &&
        state.playing,
    );
    ui.tutorial.hidden = !visible;
    if (!visible) return;
    const index = TUTORIAL_STEPS.indexOf(next);
    ui.tutorialStep.textContent = `${index + 1} / ${TUTORIAL_STEPS.length}`;
    ui.tutorialTitle.textContent = rt.t(next[1]);
    ui.tutorialCopy.textContent = rt.t(next[2]);
  }

  function completeTutorial(id) {
    if (state.snapshot?.phase !== "arrival" || state.tutorialSeen.has(id))
      return;
    state.tutorialSeen.add(id);
    state.settings.tutorialDone = [...state.tutorialSeen];
    rt.sendParent("dwarka:settings", { settings: state.settings });
    renderTutorial();
  }

  function playCue(frequency = 320, duration = 0.08) {
    if (
      !state.effectsReady ||
      state.settings.muteAll ||
      state.settings.master <= 0 ||
      state.settings.effects <= 0
    )
      return;
    try {
      const context =
        state.audioContext || (state.audioContext = new AudioContext());
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = "sine";
      gain.gain.value = 0.045 * state.settings.master * state.settings.effects;
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        context.currentTime + duration,
      );
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + duration);
    } catch {}
  }

  function playEffect(name, gain = 1) {
    if (
      !state.effectsReady ||
      state.settings.muteAll ||
      state.settings.master <= 0 ||
      state.settings.effects <= 0 ||
      !EFFECT_URLS[name]
    )
      return;
    try {
      let template = state.effectAudio.get(name);
      if (!template) {
        template = new Audio(assetUrl(EFFECT_URLS[name]));
        template.preload = "auto";
        state.effectAudio.set(name, template);
      }
      const audio = template.cloneNode();
      audio.volume = pc.math.clamp(
        state.settings.master * state.settings.effects * gain,
        0,
        1,
      );
      audio.play().catch(() => {});
    } catch {}
  }

  function voiceEntry(
    lineId,
    locale = state.settings.voiceLocale || state.settings.locale || "en",
  ) {
    return (
      state.voiceEntries.get(`${lineId}:${locale}`) ||
      state.voiceEntries.get(`${lineId}:en`) ||
      null
    );
  }

  function stopVoice() {
    if (!state.voiceAudio) return;
    state.voiceAudio.pause();
    state.voiceAudio.currentTime = 0;
    state.voiceAudio = null;
  }

  function syncVoiceVolume() {
    if (!state.voiceAudio) return;
    state.voiceAudio.volume = state.settings.muteAll
      ? 0
      : Math.max(
          0,
          Math.min(
            1,
            (state.settings.master ?? 1) * (state.settings.dialogue ?? 1),
          ),
        );
  }

  function playVoice(lineId) {
    const entry = voiceEntry(lineId);
    stopVoice();
    if (!entry) {
      state.deferredVoiceLine = lineId;
      return;
    }
    state.deferredVoiceLine = null;
    if (
      entry.status !== "validated" ||
      state.settings.muteAll ||
      (state.settings.master ?? 1) <= 0 ||
      (state.settings.dialogue ?? 1) <= 0
    ) {
      state.deferredVoiceLine = lineId;
      return;
    }
    const probe = document.createElement("audio");
    const asset =
      entry.assets.find(
        (item) => item.codec === "ogg" && probe.canPlayType("audio/ogg"),
      ) ||
      entry.assets.find((item) => item.codec === "mp3") ||
      entry.assets[0];
    if (!asset?.runtimePath) return;
    const audio = new Audio(asset.runtimePath);
    audio.preload = "auto";
    state.voiceAudio = audio;
    syncVoiceVolume();
    audio.addEventListener(
      "ended",
      () => {
        if (state.voiceAudio === audio) state.voiceAudio = null;
      },
      { once: true },
    );
    audio.addEventListener(
      "error",
      () => {
        if (state.voiceAudio === audio) state.voiceAudio = null;
        showToast(rt.t("voiceUnavailable"), 4);
      },
      { once: true },
    );
    audio.play().catch(() => {
      if (state.voiceAudio === audio) state.voiceAudio = null;
      state.deferredVoiceLine = lineId;
      showToast(rt.t("voiceUnavailable"), 4);
    });
  }

  async function loadVoiceManifest() {
    try {
      const response = await fetch("/audio/chapter-1/voice-manifest.json", {
        cache: "no-cache",
      });
      if (!response.ok) throw new Error("voice manifest unavailable");
      const manifest = await response.json();
      for (const entry of manifest.entries || [])
        if (entry.status === "validated")
          state.voiceEntries.set(
            `${entry.sourceLineId}:${entry.locale}`,
            entry,
          );
      if (state.deferredVoiceLine) playVoice(state.deferredVoiceLine);
      if (!ui.storyPanel.hidden && state.pendingVoiceLine) {
        const entry = voiceEntry(state.pendingVoiceLine, state.settings.locale);
        if (entry?.text) {
          ui.storyText.textContent = entry.text;
          ui.storyImage.alt = entry.text;
        }
      }
    } catch {
      console.warn(
        "Localized voice manifest unavailable; visible text remains active.",
      );
    }
  }

  function syncSettingsUI() {
    ui.textLocale.value = state.settings.locale || "en";
    ui.voiceLocale.value =
      state.settings.voiceLocale || state.settings.locale || "en";
    ui.master.value = String(state.settings.master ?? 1);
    ui.music.value = String(state.settings.music ?? 0.7);
    ui.effects.value = String(state.settings.effects ?? 0.8);
    ui.dialogue.value = String(state.settings.dialogue ?? 1);
    ui.muteAll.checked = Boolean(state.settings.muteAll);
    ui.settingsCaptions.checked = state.settings.captions !== false;
    ui.speakerNames.checked = state.settings.speakerNames !== false;
    ui.cameraShake.checked = state.settings.cameraShake !== false;
    ui.tutorials.checked = state.settings.tutorials !== false;
    state.tutorialSeen = new Set(
      Array.isArray(state.settings.tutorialDone)
        ? state.settings.tutorialDone
        : [],
    );
    ui.captions.textContent =
      state.settings.captions === false ? rt.t("ccOff") : rt.t("ccOn");
    ui.captions.setAttribute(
      "aria-pressed",
      String(state.settings.captions !== false),
    );
    ui.mute.textContent = state.settings.muteAll
      ? rt.t("muted")
      : rt.t("soundOn");
    ui.mute.setAttribute(
      "aria-pressed",
      String(Boolean(state.settings.muteAll)),
    );
    applyLocale();
  }

  function updateHud(snapshot) {
    const health = Math.max(0, Math.min(100, snapshot.player?.health ?? 100));
    ui.healthFill.style.width = `${health}%`;
    ui.healthText.textContent = `${Math.round(health)} / 100`;
    if (
      Number.isFinite(state.lastPlayerHealth) &&
      health < state.lastPlayerHealth
    ) {
      state.damageFlashUntil = performance.now() + 330;
      playEffect("hitHeavy", 0.72);
    }
    state.lastPlayerHealth = health;
    const details = PHASE_DETAILS[snapshot.phase] || [snapshot.phaseLabel, ""];
    ui.objective.textContent = rt.t(details[0]);
    const living = snapshot.enemies?.filter((enemy) => !enemy.dead).length || 0;
    const objectiveDistance =
      state.objectiveTarget && snapshot.player
        ? Math.round(
            Math.hypot(
              state.objectiveTarget[0] - snapshot.player.x,
              state.objectiveTarget[2] - snapshot.player.z,
            ),
          )
        : null;
    const distanceSuffix = Number.isFinite(objectiveDistance)
      ? ` · ${objectiveDistance} m`
      : "";
    const detailCore = snapshot.family?.safe
      ? rt.t("familySafe")
      : snapshot.enemies?.length
        ? `${rt.t(details[1])} · ${living} ${rt.t("remaining")}`
        : rt.t(details[1]);
    ui.detail.textContent = `${detailCore}${distanceSuffix}`;
    ui.danger.hidden = !snapshot.family?.dangerStarted || snapshot.family?.safe;
    ui.dangerTime.textContent = Number(
      snapshot.family?.remaining ?? 20,
    ).toFixed(1);
    ui.reticle.hidden = !state.aim || (!state.playing && !state.qaAimPreview);
    const nearChitra =
      snapshot.phase === "arrival" &&
      Math.hypot(snapshot.player.x, snapshot.player.z - 14) <= 3.4;
    ui.interaction.hidden = !nearChitra || !state.playing;
    renderTutorial();
  }

  rt.setConnectionStatus = setConnectionStatus;
  rt.applyLocale = applyLocale;
  rt.setCaption = setCaption;
  rt.showToast = showToast;
  rt.renderTutorial = renderTutorial;
  rt.completeTutorial = completeTutorial;
  rt.playCue = playCue;
  rt.playEffect = playEffect;
  rt.voiceEntry = voiceEntry;
  rt.stopVoice = stopVoice;
  rt.syncVoiceVolume = syncVoiceVolume;
  rt.playVoice = playVoice;
  rt.loadVoiceManifest = loadVoiceManifest;
  rt.syncSettingsUI = syncSettingsUI;
  rt.updateHud = updateHud;
}
