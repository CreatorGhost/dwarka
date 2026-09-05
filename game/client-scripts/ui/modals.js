export const STORY_TAIL_MS = 450;

export function storyFallbackDuration(text, audioDuration = null) {
  if (Number.isFinite(audioDuration) && audioDuration > 0)
    return Math.ceil(audioDuration * 1000 + STORY_TAIL_MS * 2);
  const words = String(text || "")
    .trim()
    .split(/\s+/u)
    .filter(Boolean).length;
  return Math.max(5_000, Math.min(12_000, words * 430 + 1_600));
}

export function installModals(rt) {
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

  function configureModal({
    title,
    copy,
    primary,
    secondary = null,
    controls = false,
    settings = false,
    story = null,
    pointerNote = controls,
  }) {
    ui.modal.classList.toggle("story-beat", Boolean(story));
    if (ui.screenshotActions) ui.screenshotActions.hidden = state.modalMode !== "pause";
    if (ui.pauseScreenshot) ui.pauseScreenshot.hidden = state.modalMode !== "pause";
    if (ui.screenshotDownload) ui.screenshotDownload.hidden = state.modalMode !== "pause" || !ui.screenshotDownload.hasAttribute("href");
    if (ui.screenshotStatus) ui.screenshotStatus.hidden = state.modalMode !== "pause" || !ui.screenshotStatus.textContent;
    ui.modalTitle.textContent = title;
    ui.modalCopy.textContent = copy;
    ui.modalPrimary.textContent = primary;
    ui.modalSecondary.hidden = !secondary;
    if (secondary) ui.modalSecondary.textContent = secondary;
    ui.controls.hidden = !controls;
    ui.settings.hidden = !settings;
    ui.storyPanel.hidden = !story;
    if (story) {
      ui.storyPanel.classList.remove("caption-out");
      ui.storyImage.src = story.image;
      ui.storyImage.alt = story.text;
      ui.storySpeaker.textContent = story.speaker;
      ui.storyText.textContent = story.text;
    }
    ui.pointerNote.hidden = !pointerNote;
    ui.modalPrimary.disabled = false;
    ui.modal.hidden = false;
    queueMicrotask(() => ui.modalPrimary.focus());
  }

  function clearStoryTimers() {
    globalThis.clearTimeout(state.storyAdvanceTimer);
    globalThis.clearTimeout(state.storyFallbackTimer);
    state.storyAdvanceTimer = 0;
    state.storyFallbackTimer = 0;
  }

  function finishNarratedBeat() {
    if (!state.storyNarrating) return;
    const complete = state.storyComplete;
    state.storyNarrating = false;
    state.storyComplete = null;
    clearStoryTimers();
    ui.storyPanel.classList.remove("caption-out");
    complete?.();
  }

  function armStoryFallback(duration) {
    globalThis.clearTimeout(state.storyFallbackTimer);
    state.storyFallbackTimer = globalThis.setTimeout(
      finishNarratedBeat,
      duration,
    );
  }

  function startNarratedBeat(lineId, story, complete) {
    clearStoryTimers();
    state.storyNarrating = true;
    state.storyComplete = complete;
    ui.storyPanel.classList.remove("caption-out");
    ui.storyPanel.style.setProperty(
      "--story-duration",
      `${storyFallbackDuration(story.text)}ms`,
    );
    const scheduleFromAudio = (audio) => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
      const duration = storyFallbackDuration(story.text, audio.duration);
      ui.storyPanel.style.setProperty("--story-duration", `${duration}ms`);
      armStoryFallback(duration);
    };
    const audio = rt.playVoice(lineId, {
      allowDeferred: false,
      onLoadedMetadata: scheduleFromAudio,
      onPlaying: scheduleFromAudio,
      onPause: () => globalThis.clearTimeout(state.storyFallbackTimer),
      onEnded: () => {
        globalThis.clearTimeout(state.storyFallbackTimer);
        ui.storyPanel.classList.add("caption-out");
        state.storyAdvanceTimer = globalThis.setTimeout(
          finishNarratedBeat,
          STORY_TAIL_MS,
        );
      },
      onError: () => armStoryFallback(storyFallbackDuration(story.text)),
    });
    if (!audio) armStoryFallback(storyFallbackDuration(story.text));
    else {
      armStoryFallback(storyFallbackDuration(story.text));
      if (Number.isFinite(audio.duration)) scheduleFromAudio(audio);
    }
  }

  function skipNarratedBeat() {
    if (!state.storyNarrating) return false;
    const complete = state.storyComplete;
    state.storyNarrating = false;
    state.storyComplete = null;
    clearStoryTimers();
    ui.storyPanel.classList.remove("caption-out");
    rt.stopVoice();
    complete?.();
    return true;
  }

  function localizedStory(phase, index = 0) {
    const base = STORY[phase]?.[index];
    if (!base) return null;
    const lineId = STORY_VOICE_LINES[phase]?.[index];
    const manifestText = lineId
      ? rt.voiceEntry(lineId, state.settings.locale)?.text
      : null;
    if (phase === "arrival")
      return { ...base, text: manifestText || rt.t("arrivalLine") };
    if (phase === "courtyard")
      return { ...base, text: manifestText || rt.t("raidLine") };
    if (phase === "ending")
      return {
        ...base,
        text:
          manifestText || rt.t(["chitraLine", "dawnLine", "oathLine"][index]),
      };
    return base;
  }

  function clearLoadingRetry() {
    globalThis.clearTimeout(state.loadingRetryTimer);
    state.loadingRetryTimer = 0;
    state.loadingRetryAvailable = false;
  }

  function showLoading() {
    clearLoadingRetry();
    state.resumeModalPhase = null;
    state.modalMode = "loading";
    configureModal({
      title: rt.t("chapterTitle"),
      copy: rt.t("loading"),
      primary: rt.t("connecting"),
    });
    ui.modalPrimary.disabled = true;
    state.loadingRetryTimer = globalThis.setTimeout(() => {
      state.loadingRetryTimer = 0;
      if (state.modalMode !== "loading" || state.sessionAccepted) return;
      state.loadingRetryAvailable = true;
      ui.modalPrimary.textContent = rt.t("retryNow");
      ui.modalPrimary.disabled = false;
    }, 5_000);
  }

  function showIntro(phase) {
    clearLoadingRetry();
    state.resumeModalPhase = null;
    state.paused = true;
    state.playing = false;
    rt.clearInput();
    rt.stopVoice();
    state.pendingVoiceLine = STORY_VOICE_LINES[phase]?.[0] || null;
    const story = localizedStory(phase, 0);
    const cinematicEntry =
      phase === "arrival" &&
      new URLSearchParams(globalThis.location?.search || "").get("entry") ===
        "cinematic";
    state.modalMode =
      phase === "courtyard" ? "courtyard-intro" : "arrival-intro";
    configureModal({
      title:
        phase === "courtyard" ? rt.t("courtyardTitle") : rt.t("chapterTitle"),
      copy:
        phase === "courtyard"
          ? rt.t("raidIntroCopy")
          : rt.t("arrivalIntroCopy"),
      primary:
        phase === "courtyard"
          ? rt.t("courtyardStart")
          : rt.t(cinematicEntry ? "clickEnterStreet" : "enterStreet"),
      controls: false,
      pointerNote: phase === "arrival",
      story,
    });
    sendPause(true);
    if (phase === "courtyard")
      queueMicrotask(() => {
        if (state.modalMode === "courtyard-intro") beginNarratedIntro(phase);
      });
  }

  function showPause() {
    clearLoadingRetry();
    if (state.snapshot?.phase === "complete") return;
    state.paused = true;
    state.playing = false;
    if (canvas?.ownerDocument?.pointerLockElement === canvas) canvas?.ownerDocument?.exitPointerLock?.();
    rt.clearInput();
    rt.stopVoice();
    clearStoryTimers();
    state.storyNarrating = false;
    state.storyComplete = null;
    state.modalMode = "pause";
    state.resumeModalPhase = null;
    sendPause(true);
    configureModal({
      title: rt.t("paused"),
      copy: rt.t("pauseCopy"),
      primary: rt.t("resume"),
      secondary: rt.t("returnHome"),
      controls: true,
      settings: true,
    });
  }

  function showEnding(index = 0) {
    clearLoadingRetry();
    state.resumeModalPhase = null;
    state.storyIndex = index;
    state.paused = true;
    state.playing = false;
    rt.clearInput();
    rt.stopVoice();
    clearStoryTimers();
    sendPause(true);
    const story = localizedStory("ending", index);
    state.modalMode = "ending";
    configureModal({
      title: [rt.t("endingTitle"), rt.t("dawnTitle"), rt.t("oathTitle")][index],
      copy: index === 0 ? rt.t("endingCopy") : "",
      primary:
        index === STORY.ending.length - 1
          ? rt.t("completeChapter")
          : rt.t("continue"),
      story,
    });
    state.pendingVoiceLine = STORY_VOICE_LINES.ending[index];
    queueMicrotask(() => {
      if (state.modalMode !== "ending" || state.storyIndex !== index) return;
      startNarratedBeat(state.pendingVoiceLine, story, advanceEnding);
    });
  }

  function advanceEnding() {
    if (state.storyIndex < STORY.ending.length - 1) {
      showEnding(state.storyIndex + 1);
      return;
    }
    if (state.localMode) {
      state.localSimulation.completeEnding();
      rt.processLocalEvents();
      rt.applySnapshot(state.localSimulation.snapshot(), "local");
      return;
    }
    state.socket?.send(JSON.stringify({ type: "story.complete" }));
    ui.modalPrimary.disabled = true;
  }

  function showComplete() {
    clearLoadingRetry();
    state.resumeModalPhase = null;
    state.paused = true;
    state.playing = false;
    rt.clearInput();
    state.storyNarrating = false;
    state.storyComplete = null;
    clearStoryTimers();
    ui.storyPanel.classList.remove("caption-out");
    rt.stopVoice();
    state.modalMode = "complete";
    configureModal({
      title: rt.t("completeTitle"),
      copy: rt.t("completeCopy"),
      primary: rt.t("replayChapter"),
      secondary: rt.t("returnHome"),
    });
    ui.pointerNote.hidden = true;
    rt.sendParent("dwarka:chapter-complete");
    rt.playCue(520, 0.35);
  }

  function showResume(phase) {
    clearLoadingRetry();
    state.paused = true;
    state.playing = false;
    rt.clearInput();
    rt.stopVoice();
    sendPause(true);
    state.pendingVoiceLine =
      phase === "market"
        ? "ch1-raider-call-one"
        : phase === "doorway"
          ? "ch1-raider-call-two"
          : null;
    state.modalMode = "pause";
    state.resumeModalPhase = phase;
    configureModal({
      title: `${rt.t("continue")} · ${rt.t(PHASE_DETAILS[phase]?.[0])}`,
      copy: rt.t("resumeCopy"),
      primary: rt.t("continue"),
      controls: true,
    });
  }

  function refreshOpenModalLocale() {
    if (ui.modal.hidden) return;
    if (state.modalMode === "loading") {
      configureModal({
        title: rt.t("chapterTitle"),
        copy: rt.t("loading"),
        primary: rt.t("connecting"),
      });
      return;
    }
    if (
      state.modalMode === "arrival-intro" ||
      state.modalMode === "courtyard-intro"
    ) {
      const phase =
        state.modalMode === "courtyard-intro" ? "courtyard" : "arrival";
      configureModal({
        title:
          phase === "courtyard" ? rt.t("courtyardTitle") : rt.t("chapterTitle"),
        copy:
          phase === "courtyard"
            ? rt.t("raidIntroCopy")
            : rt.t("arrivalIntroCopy"),
        primary:
          phase === "courtyard"
            ? rt.t("courtyardStart")
            : rt.t(
                new URLSearchParams(globalThis.location?.search || "").get(
                  "entry",
                ) === "cinematic"
                  ? "clickEnterStreet"
                  : "enterStreet",
              ),
        controls: false,
        pointerNote: phase === "arrival",
        story: localizedStory(phase, 0),
      });
      return;
    }
    if (state.modalMode === "pause" && state.resumeModalPhase) {
      const phase = state.resumeModalPhase;
      configureModal({
        title: `${rt.t("continue")} · ${rt.t(PHASE_DETAILS[phase]?.[0])}`,
        copy: rt.t("resumeCopy"),
        primary: rt.t("continue"),
        controls: true,
      });
      return;
    }
    if (state.modalMode === "pause") {
      configureModal({
        title: rt.t("paused"),
        copy: rt.t("pauseCopy"),
        primary: rt.t("resume"),
        secondary: rt.t("returnHome"),
        controls: true,
        settings: true,
      });
      return;
    }
    if (state.modalMode === "ending") {
      const index = state.storyIndex;
      configureModal({
        title: [rt.t("endingTitle"), rt.t("dawnTitle"), rt.t("oathTitle")][
          index
        ],
        copy: index === 0 ? rt.t("endingCopy") : "",
        primary:
          index === STORY.ending.length - 1
            ? rt.t("completeChapter")
            : rt.t("continue"),
        story: localizedStory("ending", index),
      });
      return;
    }
    if (state.modalMode === "complete") {
      configureModal({
        title: rt.t("completeTitle"),
        copy: rt.t("completeCopy"),
        primary: rt.t("replayChapter"),
        secondary: rt.t("returnHome"),
      });
    }
  }

  function requestGamePointerLock() {
    if (
      !canvas.isConnected ||
      canvas.ownerDocument !== document ||
      document.pointerLockElement === canvas
    )
      return;
    try {
      canvas.requestPointerLock?.()?.catch?.(() => {});
    } catch {
      /* Some embedded browser controllers reject pointer lock synchronously. */
    }
  }

  function enterPlay() {
    if (state.screenshotBusy) return;
    state.effectsReady = true;
    state.paused = false;
    state.playing = true;
    if (state.localMode && !state.reconnectTimer && !state.socket)
      rt.connect(true);
    ui.modal.hidden = true;
    ui.hud.hidden = false;
    sendPause(false);
    canvas.focus({ preventScroll: true });
    requestGamePointerLock();
    const voiceLine = state.pendingVoiceLine;
    state.pendingVoiceLine = null;
    if (voiceLine) {
      const entry = rt.voiceEntry(voiceLine, state.settings.locale);
      rt.setCaption(
        ui.storySpeaker.textContent || rt.t("nightSpeaker"),
        entry?.text || ui.storyText.textContent || rt.t("nightCaption"),
        7,
      );
      rt.playVoice(voiceLine);
    } else rt.setCaption(rt.t("nightSpeaker"), rt.t("nightCaption"), 4);
    rt.renderTutorial();
  }

  function beginNarratedIntro(phase) {
    if (state.storyNarrating) return skipNarratedBeat();
    const story = localizedStory(phase, 0);
    const lineId = STORY_VOICE_LINES[phase]?.[0];
    if (!story || !lineId) {
      enterPlay();
      return false;
    }
    state.pendingVoiceLine = null;
    requestGamePointerLock();
    startNarratedBeat(lineId, story, enterPlay);
    return true;
  }

  function sendPause(paused) {
    state.localSimulation?.setPaused(paused);
    if (state.socket?.readyState === WebSocket.OPEN && state.sessionAccepted)
      state.socket.send(JSON.stringify({ type: "session.pause", paused }));
  }

  rt.configureModal = configureModal;
  rt.localizedStory = localizedStory;
  rt.showLoading = showLoading;
  rt.showIntro = showIntro;
  rt.showPause = showPause;
  rt.showEnding = showEnding;
  rt.showComplete = showComplete;
  rt.showResume = showResume;
  rt.startNarratedBeat = startNarratedBeat;
  rt.skipNarratedBeat = skipNarratedBeat;
  rt.beginNarratedIntro = beginNarratedIntro;
  rt.advanceEnding = advanceEnding;
  rt.refreshOpenModalLocale = refreshOpenModalLocale;
  rt.requestGamePointerLock = requestGamePointerLock;
  rt.enterPlay = enterPlay;
  rt.sendPause = sendPause;
}
