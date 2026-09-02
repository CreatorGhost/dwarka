/* DWARKA Chapter 1 — inspectable PlayCanvas runtime source. */
void (async () => {
  "use strict";

  const pc = window.pc;
  const canvas = document.getElementById("application-canvas");
  canvas.tabIndex = -1;
  const ui = {
    hud: document.getElementById("hud"), healthFill: document.getElementById("health-fill"), healthText: document.getElementById("health-text"),
    objective: document.getElementById("objective-text"), detail: document.getElementById("objective-detail"), phaseKicker: document.getElementById("phase-kicker"),
    danger: document.getElementById("danger-card"), dangerTime: document.getElementById("danger-time"), reticle: document.getElementById("reticle"), waypoint: document.getElementById("waypoint-indicator"), waypointDistance: document.getElementById("waypoint-distance"),
    interaction: document.getElementById("interaction"), tutorial: document.getElementById("tutorial"), tutorialStep: document.getElementById("tutorial-step"), tutorialTitle: document.getElementById("tutorial-title"), tutorialCopy: document.getElementById("tutorial-copy"), caption: document.getElementById("caption"), captionSpeaker: document.getElementById("caption-speaker"), captionText: document.getElementById("caption-text"),
    toast: document.getElementById("toast"), fps: document.getElementById("fps-value"), qa: document.getElementById("qa-overlay"), vignette: document.getElementById("vignette"),
    modal: document.getElementById("modal"), modalTitle: document.getElementById("modal-title"), modalCopy: document.getElementById("modal-copy"), modalPrimary: document.getElementById("modal-primary"), modalSecondary: document.getElementById("modal-secondary"),
    storyPanel: document.getElementById("story-panel"), storyImage: document.getElementById("story-image"), storySpeaker: document.getElementById("story-speaker"), storyText: document.getElementById("story-text"), controls: document.getElementById("controls-grid"), settings: document.getElementById("settings-panel"), pointerNote: document.getElementById("pointer-note"),
    reconnect: document.getElementById("reconnect"), retry: document.getElementById("retry-connection"), connectionTitle: document.getElementById("connection-title"), connectionCopy: document.getElementById("connection-copy"), connectionSpinner: document.getElementById("connection-spinner"), captions: document.getElementById("captions-toggle"), mute: document.getElementById("mute-toggle"), pause: document.getElementById("pause-button"),
    textLocale: document.getElementById("text-locale"), voiceLocale: document.getElementById("voice-locale"), master: document.getElementById("master-volume"), music: document.getElementById("music-volume"), effects: document.getElementById("effects-volume"), dialogue: document.getElementById("dialogue-volume"), muteAll: document.getElementById("mute-all"), settingsCaptions: document.getElementById("settings-captions"), speakerNames: document.getElementById("speaker-names"), cameraShake: document.getElementById("camera-shake"), tutorials: document.getElementById("tutorial-prompts"), reopenControls: document.getElementById("reopen-controls"), resetTutorials: document.getElementById("reset-tutorials"),
  };

  const PHASE_DETAILS = { arrival: ["arrivalTitle", "arrivalDetail"], courtyard: ["courtyardTitle", "courtyardDetail"], market: ["marketTitle", "marketDetail"], doorway: ["doorwayTitle", "doorwayDetail"], ending: ["endingTitle", "endingDetail"], complete: ["completeTitle", "completeDetail"] };
  const UI_MESSAGES = Object.freeze({
    en: Object.freeze({
      checkpointRestoredFull: "Checkpoint restored — health full",
      familyCheckpointRestored: "The family was overrun · checkpoint restarted",
      restartCaption: "[The current encounter begins again. Earlier progress is safe.]",
      warningSpeaker: "WARNING",
    }),
  });
  const runtimeScriptUrl = document.currentScript?.src || window.location.href;
  const launchApplication = pc.Application.getApplication?.() || pc.app || null;
  const preloadedLayout = launchApplication?.assets.find("world-layout.json")?.resource;
  const parseLayoutResource = (resource) => {
    if (!resource) return null;
    if (typeof resource === "string") return JSON.parse(resource);
    if (resource instanceof ArrayBuffer) return JSON.parse(new TextDecoder().decode(resource));
    if (ArrayBuffer.isView(resource)) return JSON.parse(new TextDecoder().decode(resource));
    return typeof resource === "object" ? resource : null;
  };
  let WORLD_LAYOUT = parseLayoutResource(preloadedLayout);
  if (!WORLD_LAYOUT) {
    const layoutUrl = new URL("./world-layout.json?v=20260902b", runtimeScriptUrl);
    const layoutResponse = await fetch(layoutUrl, { cache: "no-cache" });
    if (!layoutResponse.ok) throw new Error(`World layout failed to load (${layoutResponse.status})`);
    WORLD_LAYOUT = await layoutResponse.json();
  }
  if (!WORLD_LAYOUT?.worldBounds || !Array.isArray(WORLD_LAYOUT.colliders) || !WORLD_LAYOUT.placements) throw new Error("World layout is malformed");
  const WORLD_BOUNDS = Object.freeze(WORLD_LAYOUT.worldBounds);
  const WORLD_COLLIDERS = Object.freeze(WORLD_LAYOUT.colliders.map((collider) => Object.freeze([collider.minX, collider.maxX, collider.minZ, collider.maxZ, collider.label, collider.id, collider.visual])));
  const MODEL_URLS = {
    Vrishaketu_Composite: "./assets/models/Vrishaketu_Composite.glb", Raider_Archer_Composite: "./assets/models/Raider_Archer_Composite.glb", Brute_Composite: "./assets/models/Brute_Composite.glb", Male_Peasant_Composite: "./assets/models/Male_Peasant_Composite.glb", Female_Peasant_Composite: "./assets/models/Female_Peasant_Composite.glb",
    Wall_Plaster_Door_Round: "./assets/models/Wall_Plaster_Door_Round.glb", Wall_Plaster_Window_Wide_Round: "./assets/models/Wall_Plaster_Window_Wide_Round.glb", Door_2_Round: "./assets/models/Door_2_Round.glb", WindowShutters_Wide_Round_Open: "./assets/models/WindowShutters_Wide_Round_Open.glb", Wall_Arch: "./assets/models/Wall_Arch.glb", Roof_RoundTiles_4x4: "./assets/models/Roof_RoundTiles_4x4.glb", Roof_RoundTiles_4x8: "./assets/models/Roof_RoundTiles_4x8.glb",
    Prop_Wagon: "./assets/models/Prop_Wagon.glb", Balcony_Simple_Straight: "./assets/models/Balcony_Simple_Straight.glb", Stairs_Exterior_Straight: "./assets/models/Stairs_Exterior_Straight.glb", Stall_Cart_Empty: "./assets/models/Stall_Cart_Empty.glb", Stall_Empty: "./assets/models/Stall_Empty.glb", Barrel: "./assets/models/Barrel.glb", Vase_2: "./assets/models/Vase_2.glb", Pot_1: "./assets/models/Pot_1.glb", Sword_Bronze: "./assets/models/Sword_Bronze.glb", Banner_1: "./assets/models/Banner_1.glb", Lantern_Wall: "./assets/models/Lantern_Wall.glb", Crate_Wooden: "./assets/models/Crate_Wooden.glb", Bench: "./assets/models/Bench.glb", Prop_Crate: "./assets/models/Prop_Crate.glb", Prop_WoodenFence_Single: "./assets/models/Prop_WoodenFence_Single.glb",
  };
  const ENVIRONMENT_PLACEMENTS = Object.freeze(WORLD_LAYOUT.placements);
  const GROUND_ALIGNED_MODELS = new Set(WORLD_LAYOUT.groundAlignedModels);
  const STREET_SURFACE_Y = WORLD_LAYOUT.streetSurfaceY;
  const CHARACTER_GROUND_LIFT = WORLD_LAYOUT.characterGroundLift;
  const STORY = {
    arrival: [{ image: "/story-a/06-kunti-reveals.webp", speaker: "KUNTI", text: "After the war, the secret was spoken: Karna had been her first son. Vrishaketu entered the house of the men who killed his father." }],
    courtyard: [{ image: "/story-a/07-raid.webp", speaker: "NIGHT RAID", text: "The army had gone with the royal sacrifice. Raiders entered the unguarded charioteers' quarter." }],
    ending: [
      { image: "/story-a/08-chitra-dies.webp", speaker: "CHITRA", text: "They asked for you by name." },
      { image: "/story-a/09-horse-loosed.webp", speaker: "DAWN", text: "At dawn, the royal horse was released. Its road followed the raiders' trail." },
      { image: "/story-a/10-oath.webp", speaker: "VRISHAKETU", text: "Then I will follow the horse—and find who sent them." },
    ],
  };
  const STORY_VOICE_LINES = {
    arrival: ["ch1-kunti-revelation"],
    courtyard: ["ch1-raid-begins"],
    ending: ["ch1-chitra-final", "ch1-dawn-road", "ch1-vrishaketu-oath"],
  };
  const EFFECT_URLS = Object.freeze({
    bladeSwing: "/audio/chapter-1/effects/blade-swing.ogg", bowRelease: "/audio/chapter-1/effects/bow-release.ogg",
    footstep1: "/audio/chapter-1/effects/footstep-1.ogg", footstep2: "/audio/chapter-1/effects/footstep-2.ogg", footstep3: "/audio/chapter-1/effects/footstep-3.ogg",
    hitLight: "/audio/chapter-1/effects/hit-light.ogg", hitHeavy: "/audio/chapter-1/effects/hit-heavy.ogg", uiClick: "/audio/chapter-1/effects/ui-click.ogg",
  });

  const state = {
    profile: null, token: null, settings: { locale: "en", voiceLocale: "en", voiceLinked: true, master: 1, music: 0.7, effects: 0.8, dialogue: 1, muteAll: false, captions: true, speakerNames: true, cameraShake: true, tutorials: true, tutorialDone: [] }, requestedAction: "continue",
    socket: null, reconnectTimer: 0, reconnectAttempts: 0, sessionAccepted: false, snapshot: null, reconnectPhase: null, intentionalSockets: new WeakSet(), lastPhase: null,
    keys: new Set(), pressed: new Set(), aim: false, yaw: 0, pitch: -0.1, lookYaw: 0, lookPitch: -0.1, visualYaw: 0, seq: 0, playing: false, paused: true, modalMode: "loading", storyIndex: 0,
    playerEntity: null, enemyEntities: new Map(), enemyHealth: new Map(), familyEntities: [], characterRoots: new Set(), modelAssets: {}, animationTracks: {}, environmentEntities: [], projectiles: [], impacts: [], chitra: null, objectiveMarker: null, targetMarker: null, targetEnemyId: null, app: null, camera: null, cameraDistance: 4.5, aimBlend: 0, staticBatchGroup: null,
    fpsFrames: 0, fpsElapsed: 0, fpsLast: 60, qaVisible: false, qaFocusName: null, qaFocusDistance: 1.45, qaFocusAngle: 0, qaAnimationPreviews: new Map(), qaAimPreview: false, captionTimer: 0, toastTimer: 0, effectsReady: false, readyTimer: 0, tutorialSeen: new Set(), mouseTurned: false,
    voiceEntries: new Map(), voiceAudio: null, pendingVoiceLine: null, lastBarkPhase: null, effectAudio: new Map(), localAction: null, lastVisualActionAt: { fire: 0, melee: 0 }, enemyWarnings: new Map(), lastPlayerHealth: null, damageFlashUntil: 0, lastFootstepAt: 0, footstepIndex: 0, lastMouseAt: 0,
    snapshotVelocity: { x: 0, z: 0 }, enemySnapshotVelocities: new Map(), snapshotReceivedAt: 0,
  };

  function sendParent(type, payload = {}) {
    if (window.parent !== window) window.parent.postMessage({ type, ...payload }, window.location.origin);
  }

  function strings() {
    const locale = typeof state.settings.locale === "string" ? state.settings.locale : "en";
    return window.DWARKA_GAME_I18N?.[locale] || window.DWARKA_GAME_I18N?.en || {};
  }

  function t(key) { return strings()[key] ?? window.DWARKA_GAME_I18N?.en?.[key] ?? key; }

  function setConnectionStatus(title, copy, failed = false) {
    ui.connectionTitle.textContent = title;
    ui.connectionCopy.textContent = copy;
    ui.reconnect.classList.toggle("failed", failed);
    ui.retry.hidden = failed;
    ui.reconnect.hidden = false;
  }

  function safeWebSocketEndpoint(value) {
    if (!value) return null;
    try {
      const endpoint = new URL(value, location.href);
      const local = ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname);
      if (endpoint.username || endpoint.password || (endpoint.protocol !== "wss:" && !(endpoint.protocol === "ws:" && local))) return null;
      return endpoint.href;
    } catch { return null; }
  }

  function applyLocale() {
    const locale = window.DWARKA_GAME_I18N?.[state.settings.locale] ? state.settings.locale : "en";
    document.documentElement.lang = locale;
    document.querySelectorAll("[data-i18n]").forEach((node) => { node.textContent = t(node.dataset.i18n); });
    ui.phaseKicker.textContent = t("objective");
    document.querySelector(".danger-card b").textContent = t("familyDanger");
    document.querySelector("#interaction span").textContent = t("speakChitra");
    ui.pause.textContent = t("pause");
    ui.pointerNote.textContent = t("pointerNote");
    if (state.snapshot) updateHud(state.snapshot);
    renderTutorial();
  }

  function localizedMessage(key) {
    const locale = typeof state.settings.locale === "string" ? state.settings.locale : "en";
    return window.DWARKA_MESSAGES?.[locale]?.[key] ?? strings()[key] ?? UI_MESSAGES[locale]?.[key] ?? UI_MESSAGES.en[key] ?? key;
  }

  function clearInput() {
    state.keys.clear(); state.pressed.clear(); state.aim = false;
  }

  function setCaption(speaker, text, seconds = 3.5) {
    if (!state.settings.captions) return;
    ui.captionSpeaker.textContent = state.settings.speakerNames === false ? "" : speaker; ui.captionSpeaker.hidden = state.settings.speakerNames === false; ui.captionText.textContent = text; ui.caption.hidden = false; state.captionTimer = seconds;
  }

  function showToast(text, seconds = 2.5) {
    ui.toast.textContent = text; ui.toast.hidden = false; state.toastTimer = seconds;
  }

  const TUTORIAL_STEPS = [
    ["move", "tutorialMoveTitle", "tutorialMoveCopy"], ["camera", "tutorialCameraTitle", "tutorialCameraCopy"],
    ["sprint", "tutorialSprintTitle", "tutorialSprintCopy"], ["dodge", "tutorialDodgeTitle", "tutorialDodgeCopy"],
    ["bow", "tutorialBowTitle", "tutorialBowCopy"], ["blade", "tutorialBladeTitle", "tutorialBladeCopy"], ["interact", "tutorialInteractTitle", "tutorialInteractCopy"],
  ];

  function renderTutorial() {
    if (!ui.tutorial) return;
    const next = TUTORIAL_STEPS.find(([id]) => !state.tutorialSeen.has(id));
    const visible = Boolean(next && state.settings.tutorials !== false && state.snapshot?.phase === "arrival" && state.playing);
    ui.tutorial.hidden = !visible;
    if (!visible) return;
    const index = TUTORIAL_STEPS.indexOf(next);
    ui.tutorialStep.textContent = `${index + 1} / ${TUTORIAL_STEPS.length}`;
    ui.tutorialTitle.textContent = t(next[1]); ui.tutorialCopy.textContent = t(next[2]);
  }

  function completeTutorial(id) {
    if (state.snapshot?.phase !== "arrival" || state.tutorialSeen.has(id)) return;
    state.tutorialSeen.add(id); state.settings.tutorialDone = [...state.tutorialSeen];
    sendParent("dwarka:settings", { settings: state.settings }); renderTutorial();
  }

  function playCue(frequency = 320, duration = 0.08) {
    if (!state.effectsReady || state.settings.muteAll || state.settings.master <= 0 || state.settings.effects <= 0) return;
    try {
      const context = state.audioContext || (state.audioContext = new AudioContext());
      const oscillator = context.createOscillator(); const gain = context.createGain();
      oscillator.frequency.value = frequency; oscillator.type = "sine"; gain.gain.value = 0.045 * state.settings.master * state.settings.effects;
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
      oscillator.connect(gain).connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + duration);
    } catch {}
  }

  function playEffect(name, gain = 1) {
    if (!state.effectsReady || state.settings.muteAll || state.settings.master <= 0 || state.settings.effects <= 0 || !EFFECT_URLS[name]) return;
    try {
      let template = state.effectAudio.get(name); if (!template) { template = new Audio(EFFECT_URLS[name]); template.preload = "auto"; state.effectAudio.set(name, template); }
      const audio = template.cloneNode(); audio.volume = pc.math.clamp(state.settings.master * state.settings.effects * gain, 0, 1); audio.play().catch(() => {});
    } catch {}
  }

  function voiceEntry(lineId, locale = state.settings.voiceLocale || state.settings.locale || "en") {
    return state.voiceEntries.get(`${lineId}:${locale}`) || state.voiceEntries.get(`${lineId}:en`) || null;
  }

  function stopVoice() {
    if (!state.voiceAudio) return;
    state.voiceAudio.pause(); state.voiceAudio.currentTime = 0; state.voiceAudio = null;
  }

  function syncVoiceVolume() {
    if (!state.voiceAudio) return;
    state.voiceAudio.volume = state.settings.muteAll ? 0 : Math.max(0, Math.min(1, (state.settings.master ?? 1) * (state.settings.dialogue ?? 1)));
  }

  function playVoice(lineId) {
    const entry = voiceEntry(lineId); stopVoice();
    if (!entry || entry.status !== "validated" || state.settings.muteAll || (state.settings.master ?? 1) <= 0 || (state.settings.dialogue ?? 1) <= 0) return;
    const probe = document.createElement("audio");
    const asset = entry.assets.find((item) => item.codec === "ogg" && probe.canPlayType("audio/ogg")) || entry.assets.find((item) => item.codec === "mp3") || entry.assets[0];
    if (!asset?.runtimePath) return;
    const audio = new Audio(asset.runtimePath); audio.preload = "auto"; state.voiceAudio = audio; syncVoiceVolume();
    audio.addEventListener("ended", () => { if (state.voiceAudio === audio) state.voiceAudio = null; }, { once: true });
    audio.addEventListener("error", () => { if (state.voiceAudio === audio) state.voiceAudio = null; showToast(t("voiceUnavailable"), 4); }, { once: true });
    audio.play().catch(() => { if (state.voiceAudio === audio) state.voiceAudio = null; });
  }

  async function loadVoiceManifest() {
    try {
      const response = await fetch("/audio/chapter-1/voice-manifest.json", { cache: "force-cache" });
      if (!response.ok) throw new Error("voice manifest unavailable");
      const manifest = await response.json();
      for (const entry of manifest.entries || []) if (entry.status === "validated") state.voiceEntries.set(`${entry.sourceLineId}:${entry.locale}`, entry);
      if (!ui.storyPanel.hidden && state.pendingVoiceLine) {
        const entry = voiceEntry(state.pendingVoiceLine, state.settings.locale);
        if (entry?.text) { ui.storyText.textContent = entry.text; ui.storyImage.alt = entry.text; }
      }
    } catch { console.warn("Localized voice manifest unavailable; visible text remains active."); }
  }

  function configureModal({ title, copy, primary, secondary = null, controls = false, settings = false, story = null }) {
    ui.modalTitle.textContent = title; ui.modalCopy.textContent = copy; ui.modalPrimary.textContent = primary;
    ui.modalSecondary.hidden = !secondary; if (secondary) ui.modalSecondary.textContent = secondary;
    ui.controls.hidden = !controls; ui.settings.hidden = !settings; ui.storyPanel.hidden = !story;
    if (story) { ui.storyImage.src = story.image; ui.storyImage.alt = story.text; ui.storySpeaker.textContent = story.speaker; ui.storyText.textContent = story.text; }
    ui.pointerNote.hidden = !controls; ui.modal.hidden = false; queueMicrotask(() => ui.modalPrimary.focus());
  }

  function localizedStory(phase, index = 0) {
    const base = STORY[phase]?.[index]; if (!base) return null;
    const lineId = STORY_VOICE_LINES[phase]?.[index];
    const manifestText = lineId ? voiceEntry(lineId, state.settings.locale)?.text : null;
    if (phase === "arrival") return { ...base, text: manifestText || t("arrivalLine") };
    if (phase === "courtyard") return { ...base, text: manifestText || t("raidLine") };
    if (phase === "ending") return { ...base, text: manifestText || t(["chitraLine", "dawnLine", "oathLine"][index]) };
    return base;
  }

  function showLoading() {
    state.modalMode = "loading";
    configureModal({ title: t("chapterTitle"), copy: t("loading"), primary: t("connecting") });
    ui.modalPrimary.disabled = true;
  }

  function showIntro(phase) {
    state.paused = true; state.playing = false; clearInput(); stopVoice(); state.pendingVoiceLine = STORY_VOICE_LINES[phase]?.[0] || null;
    const story = localizedStory(phase, 0);
    state.modalMode = phase === "courtyard" ? "courtyard-intro" : "arrival-intro";
    configureModal({
      title: phase === "courtyard" ? t("courtyardTitle") : t("chapterTitle"),
      copy: phase === "courtyard" ? t("raidIntroCopy") : t("arrivalIntroCopy"),
      primary: phase === "courtyard" ? t("courtyardStart") : t("enterStreet"), controls: phase === "arrival", story,
    });
    sendPause(true);
  }

  function showPause() {
    if (!state.sessionAccepted || state.snapshot?.phase === "complete") return;
    state.paused = true; state.playing = false; clearInput(); stopVoice(); state.modalMode = "pause"; sendPause(true);
    configureModal({ title: t("paused"), copy: t("pauseCopy"), primary: t("resume"), secondary: t("returnHome"), controls: true, settings: true });
  }

  function showEnding(index = 0) {
    state.storyIndex = index; state.paused = true; state.playing = false; clearInput(); stopVoice(); sendPause(true);
    const story = localizedStory("ending", index); state.modalMode = "ending";
    configureModal({ title: [t("endingTitle"), t("dawnTitle"), t("oathTitle")][index], copy: index === 0 ? t("endingCopy") : "", primary: index === STORY.ending.length - 1 ? t("completeChapter") : t("continue"), story });
    setCaption(story.speaker, story.text, 7);
    state.pendingVoiceLine = STORY_VOICE_LINES.ending[index]; playVoice(state.pendingVoiceLine);
  }

  function showComplete() {
    state.paused = true; state.playing = false; clearInput(); state.modalMode = "complete";
    configureModal({ title: t("completeTitle"), copy: t("completeCopy"), primary: t("replayChapter"), secondary: t("returnHome") });
    ui.pointerNote.hidden = true; sendParent("dwarka:chapter-complete"); playCue(520, 0.35);
  }

  function showResume(phase) {
    state.paused = true; state.playing = false; clearInput(); stopVoice(); sendPause(true);
    state.pendingVoiceLine = phase === "market" ? "ch1-raider-call-one" : phase === "doorway" ? "ch1-raider-call-two" : null;
    state.modalMode = "pause";
    configureModal({ title: `${t("continue")} · ${t(PHASE_DETAILS[phase]?.[0])}`, copy: t("resumeCopy"), primary: t("continue"), controls: true });
  }

  function requestGamePointerLock() {
    if (!canvas.isConnected || canvas.ownerDocument !== document || document.pointerLockElement === canvas) return;
    try { canvas.requestPointerLock?.()?.catch?.(() => {}); } catch { /* Some embedded browser controllers reject pointer lock synchronously. */ }
  }

  function enterPlay() {
    state.effectsReady = true; state.paused = false; state.playing = true; ui.modal.hidden = true; ui.hud.hidden = false; sendPause(false);
    canvas.focus({ preventScroll: true });
    requestGamePointerLock();
    const voiceLine = state.pendingVoiceLine; state.pendingVoiceLine = null;
    if (voiceLine) { const entry = voiceEntry(voiceLine, state.settings.locale); setCaption(ui.storySpeaker.textContent || t("nightSpeaker"), entry?.text || ui.storyText.textContent || t("nightCaption"), 7); playVoice(voiceLine); }
    else setCaption(t("nightSpeaker"), t("nightCaption"), 4);
    renderTutorial();
  }

  function sendPause(paused) {
    if (state.socket?.readyState === WebSocket.OPEN && state.sessionAccepted) state.socket.send(JSON.stringify({ type: "session.pause", paused }));
  }

  ui.modalPrimary.addEventListener("click", () => {
    if (state.modalMode === "loading") return;
    if (state.modalMode === "arrival-intro" || state.modalMode === "courtyard-intro" || state.modalMode === "pause") enterPlay();
    else if (state.modalMode === "ending") {
      if (state.storyIndex < STORY.ending.length - 1) showEnding(state.storyIndex + 1);
      else { state.socket?.send(JSON.stringify({ type: "story.complete" })); ui.modalPrimary.disabled = true; }
    } else if (state.modalMode === "complete") {
      state.requestedAction = "replay"; state.snapshot = null; state.reconnectPhase = null; sendParent("dwarka:replay");
      if (state.socket) { state.intentionalSockets.add(state.socket); state.socket.close(1000, "Replay"); }
      window.setTimeout(connect, 120);
    }
  });
  ui.modalSecondary.addEventListener("click", () => sendParent("dwarka:return-home"));
  ui.pause.addEventListener("click", showPause);

  ui.captions.addEventListener("click", () => {
    state.settings.captions = !state.settings.captions; ui.captions.textContent = t(state.settings.captions ? "ccOn" : "ccOff"); ui.captions.setAttribute("aria-pressed", String(state.settings.captions));
    if (!state.settings.captions) ui.caption.hidden = true; sendParent("dwarka:settings", { settings: state.settings });
  });
  ui.mute.addEventListener("click", () => {
    state.settings.muteAll = !state.settings.muteAll; ui.muteAll.checked = state.settings.muteAll; ui.mute.textContent = state.settings.muteAll ? t("muted") : t("soundOn"); ui.mute.setAttribute("aria-pressed", String(state.settings.muteAll));
    syncVoiceVolume();
    sendParent("dwarka:settings", { settings: state.settings });
  });
  const saveSettingFrom = (element, key, read = () => Number(element.value)) => element.addEventListener("input", () => { state.settings[key] = read(); syncVoiceVolume(); sendParent("dwarka:settings", { settings: state.settings }); });
  saveSettingFrom(ui.master, "master"); saveSettingFrom(ui.music, "music"); saveSettingFrom(ui.effects, "effects"); saveSettingFrom(ui.dialogue, "dialogue");
  ui.textLocale.addEventListener("change", () => { state.settings.locale = ui.textLocale.value; if (state.settings.voiceLinked !== false) { state.settings.voiceLocale = ui.textLocale.value; ui.voiceLocale.value = ui.textLocale.value; } applyLocale(); sendParent("dwarka:settings", { settings: state.settings }); });
  ui.voiceLocale.addEventListener("change", () => { state.settings.voiceLocale = ui.voiceLocale.value; state.settings.voiceLinked = state.settings.voiceLocale === state.settings.locale; sendParent("dwarka:settings", { settings: state.settings }); if (!ui.storyPanel.hidden && state.pendingVoiceLine) playVoice(state.pendingVoiceLine); });
  ui.muteAll.addEventListener("change", () => { state.settings.muteAll = ui.muteAll.checked; syncSettingsUI(); syncVoiceVolume(); sendParent("dwarka:settings", { settings: state.settings }); });
  ui.settingsCaptions.addEventListener("change", () => { state.settings.captions = ui.settingsCaptions.checked; syncSettingsUI(); sendParent("dwarka:settings", { settings: state.settings }); });
  ui.speakerNames.addEventListener("change", () => { state.settings.speakerNames = ui.speakerNames.checked; sendParent("dwarka:settings", { settings: state.settings }); });
  ui.cameraShake.addEventListener("change", () => { state.settings.cameraShake = ui.cameraShake.checked; sendParent("dwarka:settings", { settings: state.settings }); });
  ui.tutorials.addEventListener("change", () => { state.settings.tutorials = ui.tutorials.checked; renderTutorial(); sendParent("dwarka:settings", { settings: state.settings }); });
  ui.reopenControls.addEventListener("click", () => { ui.settings.hidden = true; ui.controls.hidden = false; ui.pointerNote.hidden = false; });
  ui.resetTutorials.addEventListener("click", () => { state.tutorialSeen.clear(); state.settings.tutorialDone = []; state.settings.tutorials = true; syncSettingsUI(); renderTutorial(); sendParent("dwarka:settings", { settings: state.settings }); showToast(t("tutorialsReset")); });
  ui.retry.addEventListener("click", connect);

  function validParentMessage(event) {
    return event.origin === window.location.origin && event.source === window.parent && ["dwarka:resume", "dwarka:profile-sync"].includes(event.data?.type);
  }
  window.addEventListener("message", (event) => {
    if (!validParentMessage(event)) return;
    const priorPlayer = state.profile?.anonymousPlayerId; const priorToken = state.token;
    window.clearInterval(state.readyTimer); state.readyTimer = 0;
    state.profile = event.data.profile; state.token = event.data.profile?.progressToken || null; state.settings = { ...state.settings, ...(event.data.profile?.settings || {}) }; state.requestedAction = event.data.requestedAction || "continue";
    syncSettingsUI();
    if (event.data.type === "dwarka:resume" || priorPlayer !== state.profile?.anonymousPlayerId || priorToken !== state.token) connect();
  });

  function syncSettingsUI() {
    ui.textLocale.value = state.settings.locale || "en"; ui.voiceLocale.value = state.settings.voiceLocale || state.settings.locale || "en";
    ui.master.value = String(state.settings.master ?? 1); ui.music.value = String(state.settings.music ?? 0.7); ui.effects.value = String(state.settings.effects ?? 0.8); ui.dialogue.value = String(state.settings.dialogue ?? 1);
    ui.muteAll.checked = Boolean(state.settings.muteAll); ui.settingsCaptions.checked = state.settings.captions !== false; ui.speakerNames.checked = state.settings.speakerNames !== false; ui.cameraShake.checked = state.settings.cameraShake !== false; ui.tutorials.checked = state.settings.tutorials !== false;
    state.tutorialSeen = new Set(Array.isArray(state.settings.tutorialDone) ? state.settings.tutorialDone : []);
    ui.captions.textContent = state.settings.captions === false ? t("ccOff") : t("ccOn"); ui.captions.setAttribute("aria-pressed", String(state.settings.captions !== false));
    ui.mute.textContent = state.settings.muteAll ? t("muted") : t("soundOn"); ui.mute.setAttribute("aria-pressed", String(Boolean(state.settings.muteAll))); applyLocale();
  }

  function standaloneProfile() {
    let id = localStorage.getItem("dwarka.standalone.player");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("dwarka.standalone.player", id); }
    return { schemaVersion: 1, anonymousPlayerId: id, progressToken: localStorage.getItem("dwarka.standalone.token"), settings: state.settings };
  }

  function connect() {
    window.clearTimeout(state.reconnectTimer); state.reconnectTimer = 0;
    if (!state.profile) state.profile = standaloneProfile();
    if (state.socket && state.socket.readyState <= WebSocket.OPEN) { state.intentionalSockets.add(state.socket); state.socket.close(1000, "Superseded"); }
    const query = new URLSearchParams(location.search); const wsUrl = safeWebSocketEndpoint(query.get("ws"));
    state.reconnectPhase = state.requestedAction === "replay" ? null : state.snapshot?.phase || state.reconnectPhase;
    state.snapshot = null; state.snapshotVelocity = { x: 0, z: 0 }; state.snapshotReceivedAt = 0; state.sessionAccepted = false; showLoading();
    if (!wsUrl) { setConnectionStatus(t("serverMissing"), t("serverMissingCopy"), true); return; }
    setConnectionStatus(state.reconnectAttempts === 0 ? t("serverWaking") : t("serverReconnecting"), state.reconnectAttempts === 0 ? t("serverWakingCopy") : t("serverReconnectingCopy"));
    try { state.socket = new WebSocket(wsUrl); } catch { scheduleReconnect(); return; }
    state.socket.addEventListener("open", () => {
      ui.reconnect.hidden = true; ui.reconnect.classList.remove("failed"); state.reconnectAttempts = 0;
      state.socket.send(JSON.stringify({ type: "session.resume", playerId: state.profile.anonymousPlayerId, progressToken: state.token, clientVersion: 1, requestedAction: state.requestedAction }));
    });
    state.socket.addEventListener("message", (event) => {
      let message; try { message = JSON.parse(event.data); } catch { return; }
      handleServer(message);
    });
    const openedSocket = state.socket;
    state.socket.addEventListener("close", () => { if (!state.intentionalSockets.has(openedSocket)) scheduleReconnect(); });
    state.socket.addEventListener("error", () => state.socket?.close());
  }

  function scheduleReconnect() {
    state.sessionAccepted = false; state.paused = true; state.playing = false; clearInput(); stopVoice(); ui.reconnect.hidden = false; state.reconnectAttempts += 1;
    setConnectionStatus(t("serverReconnecting"), t("serverReconnectingCopy"));
    state.reconnectTimer = window.setTimeout(connect, Math.min(5000, 800 + state.reconnectAttempts * 500));
  }

  function handleServer(message) {
    if (message.type === "session.accepted") {
      state.sessionAccepted = true;
      if (state.snapshot?.player && Number.isFinite(state.snapshot.player.yaw)) state.yaw = state.lookYaw = state.visualYaw = state.snapshot.player.yaw;
      ui.modalPrimary.disabled = false;
      sendPause(true);
      if (message.progressToken && message.progressSummary) {
        state.token = message.progressToken;
        sendParent("dwarka:progress", { progressToken: message.progressToken, progressSummary: { furthestCompletedPhase: message.progressSummary.furthestCompletedPhase, nextPhase: message.progressSummary.nextPhase, chapterComplete: message.progressSummary.chapterComplete, updatedAt: new Date().toISOString() } });
      }
      if (message.warning) { showToast(message.warning, 7); sendParent("dwarka:error", { code: "invalid-progress", message: message.warning }); }
      return;
    }
    if (message.type === "progress.committed" || message.type === "progress.synced") {
      state.token = message.progressToken;
      if (window.parent === window) localStorage.setItem("dwarka.standalone.token", state.token);
      sendParent("dwarka:progress", { progressToken: message.progressToken, progressSummary: { furthestCompletedPhase: message.completedPhase, nextPhase: message.nextPhase, chapterComplete: message.chapterComplete, updatedAt: new Date().toISOString() } });
      state.socket?.send(JSON.stringify({ type: "progress.ack", progressToken: message.progressToken }));
      if (message.type === "progress.synced") { state.requestedAction = "continue"; window.setTimeout(connect, 80); return; }
      showToast(message.chapterComplete ? t("completeTitle") : `${t("checkpointSaved")} · ${t(PHASE_DETAILS[message.nextPhase]?.[0] || message.nextPhase)}`, 3.5); playCue(message.chapterComplete ? 580 : 440, .18);
      return;
    }
    if (message.type === "phase.restarted") {
      showToast(localizedMessage(message.reason === "down" ? "checkpointRestoredFull" : "familyCheckpointRestored"), 4);
      setCaption(localizedMessage("warningSpeaker"), localizedMessage("restartCaption"), 4);
      showResume(message.phase);
      return;
    }
    if (message.type === "snapshot") { applySnapshot(message); return; }
    if (message.type === "error") showToast(message.message || "The server rejected an invalid message", 5);
  }

  function applySnapshot(snapshot) {
    const previous = state.snapshot; const previousPhase = previous?.phase; const now = performance.now();
    const tickDelta = Number(snapshot.serverTick) - Number(previous?.serverTick);
    if (previous?.player && snapshot.player && previousPhase === snapshot.phase && tickDelta > 0 && tickDelta <= 10) {
      const seconds = tickDelta * .05; let velocityX = (snapshot.player.x - previous.player.x) / seconds; let velocityZ = (snapshot.player.z - previous.player.z) / seconds; const speed = Math.hypot(velocityX, velocityZ);
      if (!Number.isFinite(speed) || speed > 9.1) { velocityX = 0; velocityZ = 0; }
      state.snapshotVelocity = { x: velocityX, z: velocityZ };
    } else state.snapshotVelocity = { x: 0, z: 0 };
    const previousEnemies = new Map((previous?.enemies || []).map((enemy) => [enemy.id, enemy]));
    const nextEnemyVelocities = new Map();
    for (const enemy of snapshot.enemies || []) {
      const prior = previousEnemies.get(enemy.id); let velocity = { x: 0, z: 0 };
      if (prior && previousPhase === snapshot.phase && tickDelta > 0 && tickDelta <= 10) {
        const seconds = tickDelta * .05; const x = (enemy.x - prior.x) / seconds; const z = (enemy.z - prior.z) / seconds;
        if ([x, z].every(Number.isFinite) && Math.hypot(x, z) <= 3.2) velocity = { x, z };
      }
      nextEnemyVelocities.set(enemy.id, velocity);
    }
    state.enemySnapshotVelocities = nextEnemyVelocities;
    state.snapshotReceivedAt = now; state.snapshot = snapshot;
    const enteringPhase = !previousPhase || snapshot.phase !== previousPhase;
    if (snapshot.player && (enteringPhase || (!state.playing && !state.qaAimPreview))) {
      const checkpointYaw = Number.isFinite(snapshot.player.yaw) ? snapshot.player.yaw : state.yaw;
      state.yaw = state.lookYaw = state.visualYaw = checkpointYaw;
      if (enteringPhase && state.playerEntity) state.playerEntity.setPosition(snapshot.player.x, CHARACTER_GROUND_LIFT * (state.playerEntity.dwarkaScale || 1), snapshot.player.z);
    }
    if (snapshot.phase !== previousPhase) {
      syncPhaseScene(snapshot.phase);
      if (!previousPhase && state.reconnectPhase === snapshot.phase) showResume(snapshot.phase);
      else if (!previousPhase && snapshot.phase === "arrival") showIntro("arrival");
      else if (snapshot.phase === "courtyard" && previousPhase === "arrival") showIntro("courtyard");
      else if (!previousPhase && snapshot.phase === "courtyard") showIntro("courtyard");
      else if (previousPhase && (snapshot.phase === "market" || snapshot.phase === "doorway")) showResume(snapshot.phase);
      else if (snapshot.phase === "ending") showEnding(0);
      else if (snapshot.phase === "complete") showComplete();
      else if (!previousPhase && snapshot.phase !== "arrival") showResume(snapshot.phase);
    }
    state.reconnectPhase = null;
    updateHud(snapshot);
  }

  function updateHud(snapshot) {
    const health = Math.max(0, Math.min(100, snapshot.player?.health ?? 100)); ui.healthFill.style.width = `${health}%`; ui.healthText.textContent = `${Math.round(health)} / 100`;
    if (Number.isFinite(state.lastPlayerHealth) && health < state.lastPlayerHealth) { state.damageFlashUntil = performance.now() + 330; playEffect("hitHeavy", .72); }
    state.lastPlayerHealth = health;
    const details = PHASE_DETAILS[snapshot.phase] || [snapshot.phaseLabel, ""]; ui.objective.textContent = t(details[0]);
    const living = snapshot.enemies?.filter((enemy) => !enemy.dead).length || 0; const objectiveDistance = state.objectiveTarget && snapshot.player ? Math.round(Math.hypot(state.objectiveTarget[0] - snapshot.player.x, state.objectiveTarget[2] - snapshot.player.z)) : null;
    const distanceSuffix = Number.isFinite(objectiveDistance) ? ` · ${objectiveDistance} m` : ""; ui.detail.textContent = `${snapshot.family?.safe ? t("familySafe") : snapshot.enemies?.length ? `${t(details[1])} · ${living} ${t("remaining")}` : t(details[1])}${distanceSuffix}`;
    ui.danger.hidden = !snapshot.family?.dangerStarted || snapshot.family?.safe; ui.dangerTime.textContent = Number(snapshot.family?.remaining ?? 20).toFixed(1);
    ui.reticle.hidden = !state.aim || (!state.playing && !state.qaAimPreview);
    const nearChitra = snapshot.phase === "arrival" && Math.hypot(snapshot.player.x, snapshot.player.z - 14) <= 3.4; ui.interaction.hidden = !nearChitra || !state.playing;
    renderTutorial();
  }

  document.addEventListener("keydown", (event) => {
    state.effectsReady = true;
    if (["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight", "Space", "KeyE"].includes(event.code)) event.preventDefault();
    if (event.code === "Escape") { if (state.playing) showPause(); return; }
    if (event.code === "F3") { state.qaVisible = !state.qaVisible; ui.qa.hidden = !state.qaVisible; return; }
    if (!state.playing) return;
    if (!state.keys.has(event.code)) {
      if (event.code === "Space") state.pressed.add("dodge");
      if (event.code === "KeyE") state.pressed.add("interact");
    }
    if (["KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) completeTutorial("move");
    if (event.code === "ShiftLeft" || event.code === "ShiftRight") completeTutorial("sprint");
    if (event.code === "Space") completeTutorial("dodge");
    if (event.code === "KeyE") completeTutorial("interact");
    state.keys.add(event.code);
  });
  document.addEventListener("keyup", (event) => state.keys.delete(event.code));
  document.querySelectorAll("button").forEach((button) => button.addEventListener("click", () => { state.effectsReady = true; playEffect("uiClick", .34); }));
  window.addEventListener("blur", () => { clearInput(); if (state.playing) showPause(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) { clearInput(); if (state.playing) showPause(); } });
  document.addEventListener("pointerlockchange", () => { if (document.pointerLockElement !== canvas && document.activeElement !== canvas && state.playing) showPause(); });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  canvas.addEventListener("mousedown", (event) => {
    if (!state.playing) return;
    state.effectsReady = true;
    requestGamePointerLock();
    if (event.button === 2) state.aim = true;
    if (event.button === 0) {
      const action = state.aim ? "fire" : "melee"; const now = performance.now(); const recovery = state.aim ? 750 : 450;
      if (now - state.lastVisualActionAt[action] < recovery) return;
      state.lastVisualActionAt[action] = now; state.pressed.add(action); state.localAction = { name: action, until: now + (state.aim ? 700 : 460) };
      if (state.aim) { spawnArrow(); playEffect("bowRelease", .72); } else playEffect("bladeSwing", .62); completeTutorial(state.aim ? "bow" : "blade");
    }
  });
  canvas.addEventListener("mouseup", (event) => { if (event.button === 2) state.aim = false; });
  document.addEventListener("mousemove", (event) => {
    if (!state.playing || (document.pointerLockElement !== canvas && document.activeElement !== canvas)) return;
    const movementX = pc.math.clamp(event.movementX, -120, 120); const movementY = pc.math.clamp(event.movementY, -120, 120);
    state.lookYaw += movementX * 0.0026; state.lookPitch = Math.max(-0.58, Math.min(0.42, state.lookPitch - movementY * 0.0022)); state.lastMouseAt = performance.now(); if (Math.abs(movementX) + Math.abs(movementY) > 3) completeTutorial("camera");
  });

  function sendInput() {
    if (!state.playing || state.paused || !state.sessionAccepted || state.socket?.readyState !== WebSocket.OPEN) return;
    let x = (state.keys.has("KeyD") ? 1 : 0) - (state.keys.has("KeyA") ? 1 : 0);
    let z = (state.keys.has("KeyW") ? 1 : 0) - (state.keys.has("KeyS") ? 1 : 0); const magnitude = Math.hypot(x, z); if (magnitude > 1) { x /= magnitude; z /= magnitude; }
    const held = []; if (state.keys.has("ShiftLeft") || state.keys.has("ShiftRight")) held.push("sprint"); if (state.aim) held.push("aim");
    const pressed = [...state.pressed]; state.pressed.clear();
    state.socket.send(JSON.stringify({ type: "input", seq: ++state.seq, clientTick: state.seq, move: [x, z], aimYaw: state.yaw, aimPitch: state.pitch, held, pressed }));
  }
  window.setInterval(sendInput, 50);

  function material(color, emissive = null) {
    const value = new pc.StandardMaterial(); value.diffuse = new pc.Color(...color); value.metalness = 0.05; value.gloss = 0.25;
    if (emissive) { value.emissive = new pc.Color(...emissive); value.emissiveIntensity = 1.4; }
    value.update(); return value;
  }
  function translucentMaterial(color, opacity) {
    const value = material(color, color); value.opacity = opacity; value.blendType = pc.BLEND_NORMAL; value.depthWrite = false; value.cull = pc.CULLFACE_NONE; value.update(); return value;
  }
  const mats = {};
  function primitive(type, name, position, scale, mat, parent = state.app.root) {
    const entity = new pc.Entity(name); entity.addComponent("render", { type }); Object.defineProperties(entity, { castShadows: { configurable: true, get: () => entity.render.castShadows, set: (value) => { entity.render.castShadows = Boolean(value); } }, receiveShadows: { configurable: true, get: () => entity.render.receiveShadows, set: (value) => { entity.render.receiveShadows = Boolean(value); } } }); parent.addChild(entity); entity.setLocalPosition(...position); entity.setLocalScale(...scale); entity.render.material = mat; entity.castShadows = true; entity.receiveShadows = true; return entity;
  }

  function batchStaticEnvironment() {
    if (!state.app?.batcher?.addGroup) return;
    const group = state.app.batcher.addGroup("Ancient street static scenery", false, 28);
    state.staticBatchGroup = group;
    const excluded = new Set(["Layered fire", "Objective sun marker"]);
    for (const render of state.app.root.findComponents("render")) {
      let node = render.entity; let isDynamic = false;
      while (node && node !== state.app.root) {
        if (excluded.has(node.name) || node.tags?.has("fire") || node.tags?.has("smoke")) { isDynamic = true; break; }
        node = node.parent;
      }
      if (!isDynamic) render.batchGroupId = group.id;
    }
  }

  function instantiateModel(key, name, position, scale = 1, yaw = 0, parent = state.app.root) {
    const asset = state.modelAssets[key]; if (!asset?.resource) return null;
    const entity = asset.resource.instantiateRenderEntity(); entity.name = name; parent.addChild(entity);
    entity.setLocalPosition(...position); entity.setLocalScale(scale, scale, scale); entity.setLocalEulerAngles(0, yaw, 0);
    entity.findComponents?.("render").forEach((render) => { render.castShadows = true; render.receiveShadows = true; });
    return entity;
  }

  function alignEnvironmentModelToStreet(entity, requestedY) {
    if (!entity || requestedY > .1) return;
    const instances = entity.findComponents?.("render").flatMap((render) => render.meshInstances || []) || [];
    if (instances.length === 0) return;
    const minimumY = Math.min(...instances.map((instance) => instance.aabb.center.y - instance.aabb.halfExtents.y));
    const correction = STREET_SURFACE_Y - minimumY;
    if (!Number.isFinite(correction) || Math.abs(correction) > .35) return;
    const position = entity.getPosition(); entity.setPosition(position.x, position.y + correction, position.z); entity.dwarkaGroundCorrection = correction;
  }

  function groundAnimatedCharacter(root, dt) {
    if (!root?.enabled || !root.dwarkaVisual) return;
    const position = root.getPosition(); const baseY = CHARACTER_GROUND_LIFT * (root.dwarkaScale || 1); root.setPosition(position.x, baseY, position.z);
    const footwear = root.dwarkaVisual.findComponents("render").filter((render) => /Feet/.test(render.entity.name)).flatMap((render) => render.meshInstances || []);
    if (footwear.length === 0) return;
    const currentOffset = Number(root.dwarkaGroundOffset) || 0;
    const minimum = Math.min(...footwear.map((instance) => instance.aabb.center.y - instance.aabb.halfExtents.y));
    const uncorrectedMinimum = minimum;
    const targetOffset = pc.math.clamp(STREET_SURFACE_Y - uncorrectedMinimum, -.025, .11);
    const blend = 1 - Math.exp(-Math.min(.05, Math.max(0, dt)) * 24);
    root.dwarkaGroundOffset = pc.math.lerp(currentOffset, targetOffset, blend);
    root.setPosition(position.x, baseY + root.dwarkaGroundOffset, position.z);
  }

  function boxBetweenLocal(entity, parent, from, to, thickness) {
    const fromWorld = parent.getWorldTransform().transformPoint(from, new pc.Vec3()); const toWorld = parent.getWorldTransform().transformPoint(to, new pc.Vec3()); const middle = fromWorld.clone().add(toWorld).mulScalar(.5);
    entity.setPosition(middle); entity.lookAt(toWorld); entity.setLocalScale(thickness, thickness, Math.max(.001, fromWorld.distance(toWorld)));
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
    const approved = instantiateModel("Sword_Bronze", `${root.name} approved sword`, [0, -.03, 0], root.dwarkaSwordModelScale || .92, 0, root.dwarkaSword);
    if (!approved) return false;
    root.dwarkaSwordFallback.forEach((part) => part.destroy()); root.dwarkaSwordFallback = []; root.dwarkaSwordModel = approved;
    return true;
  }

  function attachSword(root, label = "bronze blade", modelScale = .92) {
    if (root.dwarkaSword) { mountApprovedSword(root); return; }
    const model = root.dwarkaVisual; const rightHand = model?.findByName("hand_r") || root; const sword = new pc.Entity(`${root.name} ${label}`); rightHand.addChild(sword); sword.setLocalPosition(0, -.08, -.02); sword.setLocalEulerAngles(0, 0, 0);
    root.dwarkaSword = sword; root.dwarkaSwordModelScale = modelScale; root.dwarkaSwordFallback = [];
    if (!mountApprovedSword(root)) {
      root.dwarkaSwordFallback = [
        primitive("box", "Visible bronze blade", [0, .43, 0], [.045, .45, .018], mats.steel, sword),
        primitive("box", "Blade guard", [0, 0, 0], [.22, .04, .06], mats.gold, sword),
        primitive("cylinder", "Blade grip", [0, -.11, 0], [.04, .14, .04], mats.wood, sword),
      ];
    }
    const trail = primitive("box", "Blade motion trail", [0, .38, .045], [.11, .76, .015], mats.weaponTrail, sword); trail.castShadows = false; trail.enabled = false; root.dwarkaSwordTrail = trail;
  }

  function attachBow(root) {
    const model = root?.dwarkaVisual; if (!model || root.dwarkaBow) return;
      const leftHand = model.findByName("hand_l") || root; const bow = new pc.Entity(`${root.name} bow`); root.addChild(bow); root.dwarkaBowHand = leftHand; root.dwarkaBowDrawHand = model.findByName("hand_r");
      // The slight lateral recurve keeps the bow readable from the over-shoulder
      // camera; a depth-only curve appears as a rigid pole when seen downrange.
      const points = [new pc.Vec3(0, 0, 0), new pc.Vec3(-.006, .24, -.04), new pc.Vec3(-.016, .46, -.12), new pc.Vec3(-.032, .67, -.26), new pc.Vec3(-.055, .86, -.45)]; root.dwarkaBowLimbs = [];
      for (let index = 0; index < points.length - 1; index += 1) { for (const sign of [-1, 1]) { const from = new pc.Vec3(points[index].x, points[index].y * sign, points[index].z); const to = new pc.Vec3(points[index + 1].x, points[index + 1].y * sign, points[index + 1].z); const entity = primitive("box", `Bow ${sign > 0 ? "upper" : "lower"} limb ${index + 1}`, [0, 0, 0], [.03, .03, .25], mats.bowWood, bow); entity.castShadows = false; root.dwarkaBowLimbs.push({ entity, from, to, thickness: Math.max(.026, .043 - index * .005) }); } }
      const grip = primitive("box", "Leather bow grip", [0, 0, 0], [.045, .17, .05], mats.bowGrip, bow); grip.castShadows = false;
      for (const y of [-.12, .12]) { const band = primitive("box", "Bow grip binding", [0, y, 0], [.055, .024, .06], mats.gold, bow); band.castShadows = false; }
      for (const y of [-.86, .86]) { const nock = primitive("sphere", "Bronze bow nock", [-.055, y, -.45], [.03, .035, .03], mats.gold, bow); nock.castShadows = false; }
      const upperString = primitive("box", "Bow string upper", [0, 0, 0], [.006, .006, .5], mats.bowCord, bow); const lowerString = primitive("box", "Bow string lower", [0, 0, 0], [.006, .006, .5], mats.bowCord, bow); upperString.castShadows = false; lowerString.castShadows = false;
      const arrow = primitive("box", "Nocked arrow", [0, 0, 0], [.018, .018, .55], mats.gold, bow); arrow.castShadows = false; const arrowHead = primitive("sphere", "Nocked arrow head", [0, 0, 0], [.032, .032, .032], mats.steel, bow); arrowHead.castShadows = false;
      root.dwarkaBowStrings = [upperString, lowerString]; root.dwarkaNockedArrow = arrow; root.dwarkaNockedArrowHead = arrowHead;
      bow.enabled = root.name !== "Vrishaketu"; root.dwarkaBow = bow;
  }

  function ensureCharacterEquipment(root) {
    if (!root?.dwarkaVisual) return;
    if (root.name === "Vrishaketu") { attachSword(root); attachBow(root); }
    else if (root.name === "archer") attachBow(root);
    else if (root.name === "skirmisher") attachSword(root, "raider blade");
    else if (root.name === "brute") attachSword(root, "heavy bronze blade", 1.15);
  }

  function syncEquipmentSockets(root) {
    if (!root?.dwarkaBow?.enabled || !root.dwarkaBowHand) return;
    root.dwarkaBow.setPosition(root.dwarkaBowHand.getPosition()); root.dwarkaBow.setEulerAngles(0, root.getEulerAngles().y, 0);
    const upper = new pc.Vec3(-.055, .84, -.43), lower = new pc.Vec3(-.055, -.84, -.43); let pull = new pc.Vec3(0, .02, .48);
    for (const segment of root.dwarkaBowLimbs) boxBetweenLocal(segment.entity, root.dwarkaBow, segment.from, segment.to, segment.thickness);
    const drawing = ["aim", "fire", "archerWarn"].includes(root.dwarkaAnimState);
    if (drawing && root.dwarkaBowDrawHand) {
      const inverse = root.dwarkaBow.getWorldTransform().clone().invert(); const localHand = inverse.transformPoint(root.dwarkaBowDrawHand.getPosition(), new pc.Vec3());
      // The retargeted draw pose owns the nock: following the wrist exactly
      // keeps both string halves and the arrow attached through every frame.
      // Axis-wise clamps made the pull look detached whenever the torso
      // rotated farther than the placeholder pistol pose used to allow.
      if ([localHand.x, localHand.y, localHand.z].every(Number.isFinite) && localHand.length() < 2) pull.copy(localHand);
    }
    const released = root.dwarkaAnimState === "fire" && performance.now() - (root.dwarkaAnimStartedAt || 0) > 170;
    if (released) pull.set(0, 0, 0);
    root.dwarkaBowPullWorld = root.dwarkaBow.getWorldTransform().transformPoint(pull, new pc.Vec3());
    boxBetweenLocal(root.dwarkaBowStrings[0], root.dwarkaBow, upper, pull, .008); boxBetweenLocal(root.dwarkaBowStrings[1], root.dwarkaBow, lower, pull, .008);
    const arrowPull = new pc.Vec3(0, pc.math.clamp(pull.y, -.12, .12), pull.z); const arrowEnd = new pc.Vec3(0, arrowPull.y, -.88);
    boxBetweenLocal(root.dwarkaNockedArrow, root.dwarkaBow, arrowPull, arrowEnd, .018); root.dwarkaNockedArrow.enabled = drawing && !released; root.dwarkaNockedArrowHead.setLocalPosition(arrowEnd); root.dwarkaNockedArrowHead.enabled = drawing && !released;
  }

  function updateWeaponEffects(root) {
    if (!root) return;
    const elapsed = performance.now() - (root.dwarkaAnimStartedAt || 0);
    if (root.dwarkaSwordTrail) root.dwarkaSwordTrail.enabled = root.dwarkaAnimState === "melee" && elapsed >= 90 && elapsed <= 310;
  }

  function upgradeCharacter(root) {
    if (!root) return;
    if (root.dwarkaUpgraded) { ensureCharacterEquipment(root); return; }
    const model = instantiateModel(root.dwarkaModelKey, `${root.name} outfit`, [0, 0, 0], root.dwarkaScale, 180, root); if (!model) return;
    root.dwarkaUpgraded = true; root.dwarkaVisual = model;
    root.children.filter((child) => child.tags?.has("greybox")).forEach((child) => child.destroy());
    ensureCharacterEquipment(root);
    setupCharacterAnimation(root);
  }

  const CHARACTER_ANIMATIONS = { idle: "Idle_Loop", walk: "Jog_Fwd_Loop", sprint: "Jog_Fwd_Loop", enemyWalk: "Walk_Loop", melee: "Sword_Attack", dodge: "Roll", hit: "Hit_Chest", down: "Death01", aim: "Bow_Aim_Loop", fire: "Bow_Release", archerWarn: "Bow_Aim_Loop", bruteWarn: "Heavy_Overhead", interact: "Interact" };
  const CHARACTER_ANIMATION_SPEEDS = Object.freeze({ idle: 1, walk: 1.02, sprint: 1.58, enemyWalk: 1, melee: 1, dodge: 2.25, hit: 1, down: 1, aim: 1, fire: 1, archerWarn: 1, bruteWarn: 1, interact: 1 });
  function locomotionPlaybackSpeed(animation, actualSpeed) {
    if (!(actualSpeed > 0)) return CHARACTER_ANIMATION_SPEEDS[animation] || 1;
    if (animation === "walk") return pc.math.clamp(1.02 * actualSpeed / 4.5, .68, 1.28);
    if (animation === "sprint") return pc.math.clamp(1.58 * actualSpeed / 6.5, 1.08, 1.82);
    if (animation === "enemyWalk") return pc.math.clamp(actualSpeed / 1.55, .68, 1.48);
    return CHARACTER_ANIMATION_SPEEDS[animation] || 1;
  }
  function setupModelAnimation(model) {
    if (!model || !state.animationTracks.Idle_Loop) return;
    if (!model.anim) {
      model.addComponent("anim", { activate: false });
      model.anim.loadStateGraph({ layers: [{ name: "Base", states: [{ name: "START" }, ...Object.keys(CHARACTER_ANIMATIONS).map((name) => ({ name, loop: !["melee", "dodge", "hit", "down", "fire", "bruteWarn", "interact"].includes(name), speed: 1 }))], transitions: [{ from: "START", to: "idle", time: 0 }] }], parameters: {} });
    }
    for (const [stateName, clipName] of Object.entries(CHARACTER_ANIMATIONS)) if (state.animationTracks[clipName]) model.anim.assignAnimation(stateName, state.animationTracks[clipName]);
    if (model.anim.activate) return;
    model.anim.activate = true;
    model.anim.enabled = true;
    model.anim.baseLayer.transition("idle", 0);
    model.anim.playing = true;
    model.anim.baseLayer.play();
  }

  function setupCharacterAnimation(root) {
    if (!root) return;
    setupModelAnimation(root.dwarkaVisual);
    if (root.dwarkaVisual?.anim && !root.dwarkaAnimState) root.dwarkaAnimState = "idle";
  }

  function setCharacterAnimation(root, desired, actualSpeed = null) {
    if (!root?.dwarkaVisual) return; setupCharacterAnimation(root);
    if (root.dwarkaVisual.anim) root.dwarkaVisual.anim.speed = Number.isFinite(actualSpeed) ? locomotionPlaybackSpeed(desired, actualSpeed) : CHARACTER_ANIMATION_SPEEDS[desired] || 1;
    if (root.dwarkaAnimState === desired || !CHARACTER_ANIMATIONS[desired]) return;
    if (root.dwarkaVisual.anim) root.dwarkaVisual.anim.baseLayer.transition(desired, desired === "down" ? .05 : .12);
    root.dwarkaAnimState = desired; root.dwarkaAnimStartedAt = performance.now();
  }

  function placeEnvironmentFor(key) {
    for (const [x, y, z, yaw, scale] of ENVIRONMENT_PLACEMENTS[key] || []) {
      const entity = instantiateModel(key, key, [x, y, z], scale, yaw);
      if (entity && GROUND_ALIGNED_MODELS.has(key)) alignEnvironmentModelToStreet(entity, y);
      if (entity) state.environmentEntities.push(entity);
    }
  }

  function spawnArrow() {
    if (!state.playerEntity || !state.snapshot?.player) return;
    const horizontal = Math.cos(state.pitch); const forward = { x: Math.sin(state.yaw) * horizontal, y: Math.sin(state.pitch), z: -Math.cos(state.yaw) * horizontal }; const right = { x: Math.cos(state.yaw), z: Math.sin(state.yaw) };
    const start = { x: state.snapshot.player.x + right.x * .28 + forward.x * .38, y: 1.42, z: state.snapshot.player.z + right.z * .28 + forward.z * .38 }; let distance = 22;
    for (let step = .15; step <= 22; step += .15) {
      const x = start.x + forward.x * step, z = start.z + forward.z * step;
      const blocked = x < WORLD_BOUNDS.minX + .15 || x > WORLD_BOUNDS.maxX - .15 || z < WORLD_BOUNDS.minZ + .15 || z > WORLD_BOUNDS.maxZ - .15 || WORLD_COLLIDERS.some(([minX, maxX, minZ, maxZ]) => x > minX - .05 && x < maxX + .05 && z > minZ - .05 && z < maxZ + .05);
      if (blocked) { distance = Math.max(.2, step - .15); break; }
    }
    const arrow = primitive("cylinder", "Visible arrow", [start.x, start.y, start.z], [.022, .38, .022], mats.gold); arrow.setEulerAngles(90 - state.pitch * 180 / Math.PI, -state.yaw * 180 / Math.PI, 0);
    const trail = primitive("box", "Arrow ember trail", [start.x, start.y, start.z], [.012, .012, .18], mats.weaponTrail); trail.castShadows = false;
    state.projectiles.push({ entity: arrow, trail, previous: { ...start }, start, end: { x: start.x + forward.x * distance, y: start.y + forward.y * distance, z: start.z + forward.z * distance }, elapsed: 0, duration: Math.max(.08, distance / 24) });
  }

  function loadApprovedAssets() {
    const applyPackedSand = (asset) => {
      if (!asset?.resource) { console.warn("Packed sand texture failed to load; using the rough matte fallback"); return; }
      const texture = asset.resource; texture.addressU = texture.addressV = pc.ADDRESS_MIRRORED_REPEAT; texture.minFilter = pc.FILTER_LINEAR_MIPMAP_LINEAR; texture.magFilter = pc.FILTER_LINEAR; texture.anisotropy = 8;
      mats.roadSand.diffuseMap = texture; mats.roadSand.diffuseMapTiling = new pc.Vec2(.75, 2.75); mats.roadSand.update();
    };
    const packedSandAsset = state.app.assets.find("packed-sand-v1.webp", "texture");
    if (packedSandAsset) { packedSandAsset.ready(applyPackedSand); state.app.assets.load(packedSandAsset); }
    else state.app.assets.loadFromUrl("./assets/textures/packed-sand-v1.webp?v=20260902b", "texture", (error, asset) => { if (error) console.warn("Packed sand texture failed to load; using the rough matte fallback"); else applyPackedSand(asset); });
    for (const [key, url] of Object.entries(MODEL_URLS)) state.app.assets.loadFromUrl(`${url}?v=20260902k`, "container", (error, asset) => {
      if (error || !asset) { console.warn(`Optional model failed: ${key}`); return; }
      state.modelAssets[key] = asset; if (ENVIRONMENT_PLACEMENTS[key]) placeEnvironmentFor(key);
      for (const root of state.characterRoots) upgradeCharacter(root);
    });
    state.app.assets.loadFromUrl("./assets/animations/UAL1_Standard.glb?v=20260902i", "container", (error, asset) => {
      if (error || !asset?.resource?.animations) { console.warn("Animation library failed to load"); return; }
      for (const animationAsset of asset.resource.animations) {
        const track = animationAsset?.resource || animationAsset;
        if (track?.name) state.animationTracks[track.name] = track;
      }
      for (const root of state.characterRoots) setupCharacterAnimation(root);
    });
    state.app.assets.loadFromUrl("./assets/animations/Dwarka_Combat.glb?v=20260902b", "container", (error, asset) => {
      if (error || !asset?.resource?.animations) { console.warn("DWARKA combat animations failed to load"); return; }
      for (const animationAsset of asset.resource.animations) {
        const track = animationAsset?.resource || animationAsset;
        if (track?.name) state.animationTracks[track.name] = track;
      }
      for (const root of state.characterRoots) setupModelAnimation(root.dwarkaVisual);
    });
  }

  function createSunEmblem(x, y, z, facing = 0) {
    const emblem = primitive("cylinder", "Gold sun emblem", [x, y, z], [.34, .055, .34], mats.gold); emblem.setEulerAngles(90, facing, 0);
    for (let ray = 0; ray < 8; ray += 1) {
      const angle = ray * Math.PI / 4; const spoke = primitive("box", "Sun ray", [x + Math.cos(angle) * .48, y + Math.sin(angle) * .48, z], [.26, .035, .035], mats.gold);
      spoke.setEulerAngles(0, facing, ray * 45);
    }
  }

  function createBrazier(x, z) {
    const bowl = primitive("cylinder", "Iron fire bowl", [x, .48, z], [.72, .18, .72], mats.iron); bowl.setLocalEulerAngles(0, 0, 0);
    primitive("cylinder", "Brazier stem", [x, .25, z], [.12, .28, .12], mats.iron);
    const fire = new pc.Entity("Layered fire"); fire.setPosition(x, .73, z); fire.tags.add("fire"); state.app.root.addChild(fire);
    const outer = primitive("cone", "Amber flame", [0, .38, 0], [.52, .82, .52], mats.fire, fire);
    const inner = primitive("cone", "Gold flame", [.08, .28, .02], [.27, .62, .27], mats.fireHot, fire); inner.setLocalEulerAngles(0, 0, -8);
    outer.castShadows = false; inner.castShadows = false;
    for (let index = 0; index < 4; index += 1) { const smoke = primitive("sphere", "Smoke plume", [0, .82 + index * .32, 0], [.24 + index * .09, .18 + index * .06, .24 + index * .09], mats.smoke, fire); smoke.tags.add("smoke"); smoke.dwarkaSmokeIndex = index; smoke.castShadows = false; }
    const light = new pc.Entity("Fire light"); light.addComponent("light", { type: "omni", color: new pc.Color(1, .48, .18), intensity: 1.45, range: 8.5, castShadows: false }); light.setPosition(x, 1.35, z); state.app.root.addChild(light);
  }

  function createWallTorch(x, y, z, facing = 0) {
    const torch = new pc.Entity("Wall torch"); torch.setPosition(x, y, z); torch.setEulerAngles(0, facing, 0); state.app.root.addChild(torch);
    primitive("cylinder", "Torch bracket", [0, -.28, .05], [.045, .34, .045], mats.iron, torch);
    const flameRoot = new pc.Entity("Torch flame root"); flameRoot.setLocalPosition(0, .15, 0); flameRoot.tags.add("fire"); torch.addChild(flameRoot); const flame = primitive("cone", "Torch flame", [0, 0, 0], [.22, .48, .22], mats.fireHot, flameRoot); flame.castShadows = false;
    const light = new pc.Entity("Torch glow"); light.addComponent("light", { type: "omni", color: new pc.Color(1, .52, .24), intensity: 1.0, range: 7, castShadows: false }); light.setPosition(x, y + .25, z); state.app.root.addChild(light);
  }

  function createObjectiveMarker() {
    const marker = new pc.Entity("Objective sun marker"); state.app.root.addChild(marker);
    const diamond = primitive("box", "Objective diamond", [0, 0, 0], [.22, .22, .045], mats.objective, marker); diamond.setLocalEulerAngles(0, 0, 45); diamond.castShadows = false;
    const core = primitive("sphere", "Objective glow", [0, 0, 0], [.34, .34, .12], mats.objectiveGlow, marker); core.castShadows = false;
    const stem = primitive("box", "Objective stem", [0, -.43, 0], [.025, .48, .025], mats.objective, marker); stem.castShadows = false;
    marker.enabled = false; state.objectiveMarker = marker;
  }

  function createTargetMarker() {
    const marker = new pc.Entity("Bow target acquisition"); state.app.root.addChild(marker);
    for (const [x, y, width, height] of [[0, .47, .34, .025], [0, -.47, .34, .025], [-.39, 0, .025, .32], [.39, 0, .025, .32]]) {
      const bracket = primitive("box", "Target bracket", [x, y, 0], [width, height, .018], mats.targetLock, marker); bracket.castShadows = false;
    }
    const core = primitive("box", "Target centre diamond", [0, 0, 0], [.055, .055, .018], mats.targetLock, marker); core.setLocalEulerAngles(0, 0, 45); core.castShadows = false;
    marker.enabled = false; state.targetMarker = marker;
  }

  function angleDifference(target, current) {
    return Math.atan2(Math.sin(target - current), Math.cos(target - current));
  }

  function targetLineBlocked(from, to) {
    const distance = Math.hypot(to.x - from.x, to.z - from.z);
    const steps = Math.max(2, Math.ceil(distance / .25));
    for (let index = 1; index < steps; index += 1) {
      const amount = index / steps; const x = pc.math.lerp(from.x, to.x, amount); const z = pc.math.lerp(from.z, to.z, amount);
      if (WORLD_COLLIDERS.some(([minX, maxX, minZ, maxZ]) => x >= minX && x <= maxX && z >= minZ && z <= maxZ)) return true;
    }
    return false;
  }

  function updateBowTargeting(snapshot, dt) {
    ui.reticle.classList.remove("acquiring", "locked"); ui.reticle.removeAttribute("data-target-label");
    if (!state.aim || (!state.playing && !state.qaAimPreview) || !snapshot?.player || !state.targetMarker) { state.targetEnemyId = null; if (state.targetMarker) state.targetMarker.enabled = false; return; }
    const origin = snapshot.player; const forward = { x: Math.sin(state.yaw), z: -Math.cos(state.yaw) }; const candidates = [];
    for (const enemy of snapshot.enemies || []) {
      if (enemy.dead) continue;
      const dx = enemy.x - origin.x, dz = enemy.z - origin.z, distance = Math.hypot(dx, dz); if (distance <= .01 || distance > 22) continue;
      const dot = (dx * forward.x + dz * forward.z) / distance; const arrowHeight = 1.42 + Math.tan(state.pitch) * distance; const heightError = Math.abs(arrowHeight - 1.1);
      if (dot < .58 || heightError > 1.55 || targetLineBlocked(origin, enemy)) continue;
      const angularError = Math.acos(pc.math.clamp(dot, -1, 1)); const score = angularError * 5 + heightError * .42 + distance * .006; candidates.push({ ...enemy, distance, dot, heightError, score });
    }
    candidates.sort((a, b) => a.score - b.score || a.distance - b.distance || String(a.id).localeCompare(String(b.id)));
    const previous = candidates.find((candidate) => candidate.id === state.targetEnemyId); let target = candidates[0] || null;
    if (previous && (!target || previous.score <= target.score + .22)) target = previous;
    if (!target) { state.targetMarker.enabled = false; return; }
    const desiredYaw = Math.atan2(target.x - origin.x, -(target.z - origin.z)); const yawDelta = angleDifference(desiredYaw, state.yaw);
    const desiredPitch = Math.atan2(1.1 - 1.42, target.distance); const pitchDelta = desiredPitch - state.pitch;
    const inputIdle = performance.now() - state.lastMouseAt > 70; const assistStrength = pc.math.clamp(1 - Math.abs(yawDelta) / .42, 0, 1);
    if (inputIdle && Math.abs(yawDelta) < .42) { const adjustment = yawDelta * Math.min(.22, dt * (2.4 + assistStrength * 2.2)); state.yaw += adjustment; state.lookYaw += adjustment; }
    if (inputIdle && Math.abs(pitchDelta) < .24) { const adjustment = pitchDelta * Math.min(.18, dt * 3.2); state.pitch += adjustment; state.lookPitch = Math.max(-.58, Math.min(.42, state.lookPitch + adjustment)); }
    const assistedForward = { x: Math.sin(state.yaw), z: -Math.cos(state.yaw) }; const dx = target.x - origin.x, dz = target.z - origin.z; const assistedDot = (dx * assistedForward.x + dz * assistedForward.z) / target.distance;
    const assistedHeight = 1.42 + Math.tan(state.pitch) * target.distance; const locked = assistedDot > .83 && Math.abs(assistedHeight - 1.1) <= .85;
    state.targetEnemyId = target.id; state.targetMarker.enabled = true; state.targetMarker.setPosition(target.x, target.kind === "brute" ? 1.72 : 1.35, target.z); state.targetMarker.lookAt(state.camera.getPosition()); state.targetMarker.rotateLocal(0, 180, 0);
    const pulse = 1 + Math.sin(performance.now() * .009) * .05; state.targetMarker.setLocalScale(pulse, pulse, pulse);
    ui.reticle.classList.add(locked ? "locked" : "acquiring"); ui.reticle.setAttribute("data-target-label", `${t(locked ? "targetAcquired" : "targetTracking")} · ${Math.round(target.distance)} m`);
  }

  function setObjectiveMarker(phase) {
    if (!state.objectiveMarker) return;
    const locations = { arrival: [0, 3.18, 14], courtyard: [-3.65, 3.05, 1], market: [6.35, 3.05, -14], doorway: [-4.65, 3.05, -31], ending: [-4.1, 3.05, -31.2] };
    state.objectiveTarget = locations[phase] || null; state.objectiveMarker.enabled = Boolean(state.objectiveTarget);
    if (state.objectiveTarget) state.objectiveMarker.setPosition(...state.objectiveTarget);
  }

  function updateObjectiveGuidance(snapshot) {
    if (!ui.waypoint || !state.objectiveTarget || !snapshot?.player || !state.camera?.camera || (!state.playing && !state.qaAimPreview)) { if (ui.waypoint) ui.waypoint.hidden = true; return; }
    const distance = Math.hypot(state.objectiveTarget[0] - snapshot.player.x, state.objectiveTarget[2] - snapshot.player.z); ui.waypointDistance.textContent = `${Math.round(distance)} m`;
    const width = canvas.clientWidth || window.innerWidth, height = canvas.clientHeight || window.innerHeight; const centreX = width / 2, centreY = height / 2;
    const world = new pc.Vec3(...state.objectiveTarget); const projected = state.camera.camera.worldToScreen(world); const cameraPosition = state.camera.getPosition(); const direction = world.clone().sub(cameraPosition); const inFront = state.camera.forward.dot(direction) > 0;
    let x = projected.x * width / Math.max(1, canvas.width), y = projected.y * height / Math.max(1, canvas.height); const minX = 58, maxX = width - 58, minY = 125, maxY = height - 84;
    const visible = inFront && x >= minX && x <= maxX && y >= minY && y <= maxY;
    const desiredYaw = Math.atan2(state.objectiveTarget[0] - snapshot.player.x, -(state.objectiveTarget[2] - snapshot.player.z)); const bearing = angleDifference(desiredYaw, state.yaw);
    if (!visible) {
      const vectorX = Math.sin(bearing), vectorY = -Math.cos(bearing); const availableX = vectorX >= 0 ? maxX - centreX : centreX - minX; const availableY = vectorY >= 0 ? maxY - centreY : centreY - minY;
      const amountX = Math.abs(vectorX) > .001 ? availableX / Math.abs(vectorX) : Number.POSITIVE_INFINITY; const amountY = Math.abs(vectorY) > .001 ? availableY / Math.abs(vectorY) : Number.POSITIVE_INFINITY; const amount = Math.min(amountX, amountY);
      x = centreX + vectorX * amount; y = centreY + vectorY * amount;
    }
    ui.waypoint.style.left = `${Math.round(x)}px`; ui.waypoint.style.top = `${Math.round(y)}px`; ui.waypoint.style.setProperty("--bearing", `${bearing}rad`); ui.waypoint.classList.toggle("edge", !visible); ui.waypoint.hidden = distance < 2.3;
  }

  function createBunting(z, height, paletteOffset = 0) {
    const cord = primitive("box", "Festival cord", [0, 0, 0], [.015, .015, 1], mats.wood); cord.castShadows = false;
    boxBetweenLocal(cord, state.app.root, new pc.Vec3(-9.5, height, z), new pc.Vec3(9.5, height - .22, z), .015);
    const colors = [mats.turquoise, mats.magenta, mats.gold];
    for (let index = 0; index < 9; index += 1) {
      const x = -8.2 + index * 2.05; const y = height - .1 - Math.sin(index / 8 * Math.PI) * .22;
      const pennant = primitive("box", "Woven festival pennant", [x, y - .25, z], [.34, .52, .028], colors[(index + paletteOffset) % colors.length]); pennant.setEulerAngles(0, 0, index % 2 ? 43 : -43); pennant.castShadows = false;
    }
  }

  function createRegionalSkyline() {
    for (const [x, z, scale, color] of [[-15.8, 18, 1.0, mats.stoneLight], [15.2, 5, .82, mats.sand], [-16.4, -12, .9, mats.sand], [15.8, -28, 1.08, mats.stoneLight], [-12.8, -45, 1.22, mats.sandLight], [13.4, -47, .95, mats.sand]]) {
      primitive("cylinder", "Rooftop shrine drum", [x, 5.4 * scale, z], [1.45 * scale, .75 * scale, 1.45 * scale], color);
      const dome = primitive("sphere", "Rooftop shrine dome", [x, 6.0 * scale, z], [1.62 * scale, .72 * scale, 1.62 * scale], color); dome.castShadows = false;
      primitive("cylinder", "Rooftop gold finial", [x, 6.86 * scale, z], [.09 * scale, .7 * scale, .09 * scale], mats.gold);
      primitive("sphere", "Rooftop finial crown", [x, 7.25 * scale, z], [.18 * scale, .18 * scale, .18 * scale], mats.gold);
    }
    for (const [x, z, color] of [[-9.6, 22.5, mats.magenta], [9.6, 14.5, mats.turquoise], [-9.6, -2.5, mats.gold], [9.6, -19, mats.magenta], [-9.6, -34.8, mats.turquoise]]) {
      const rug = primitive("box", "Dyed threshold rug", [x, .035, z], [1.1, .035, 1.85], color); rug.castShadows = false;
    }
    createBunting(11.5, 5.15, 0); createBunting(-8.5, 4.92, 1); createBunting(-26.5, 5.12, 2);
  }

  function decorateTurnWalls() {
    for (const [z, columns, motifX, textileColor] of [[-3.67, [-9.1, -6.5, -3.9, -1.3, 1.2], -5.2, mats.turquoise], [-17.87, [-1.15, 1.7, 4.55, 7.4, 9.95], 4.45, mats.magenta]]) {
      for (const x of columns) { primitive("box", "Carved turn-wall pilaster", [x, .92, z], [.16, 1.72, .13], mats.sandLight); primitive("box", "Gold pilaster capital", [x, 1.72, z - .01], [.42, .14, .18], mats.gold); }
      for (const x of [columns[1], columns[3]]) { const cloth = primitive("box", "Dyed turn-wall textile", [x, .86, z - .03], [1.08, 1.08, .035], textileColor); cloth.castShadows = false; }
      createSunEmblem(motifX, 1.02, z - .08);
    }
  }

  function createDoorwayLandmark() {
    const gateX = -4.7;
    const road = primitive("box", "Street beyond the gate", [gateX, -.3, -47.2], [8.2, .5, 23.5], mats.stone); road.castShadows = false;
    primitive("box", "Distant palace wall", [gateX, 2.55, -58.5], [14.5, 5.2, 1.0], mats.sand);
    primitive("box", "Distant palace stone base", [gateX, .42, -57.92], [14.9, .8, .28], mats.stoneLight);
    primitive("box", "Distant palace cornice", [gateX, 5.05, -57.92], [15.0, .2, .36], mats.gold);
    primitive("box", "Distant palace door", [gateX, 1.7, -57.88], [3.5, 3.4, .24], mats.wood);
    for (const x of [gateX - 4.7, gateX - 2.65, gateX + 2.65, gateX + 4.7]) { primitive("cylinder", "Palace column", [x, 2.55, -57.75], [.3, 4.25, .3], mats.stoneLight); primitive("box", "Palace column capital", [x, 4.62, -57.73], [.72, .24, .48], mats.gold); }
    createSunEmblem(gateX, 2.7, -57.7);
    primitive("cylinder", "Central shrine drum", [gateX, 5.48, -58.65], [2.05, .95, 2.05], mats.indigo);
    const dome = primitive("sphere", "Central shrine dome", [gateX, 6.18, -58.65], [2.35, 1.05, 2.35], mats.turquoise); dome.castShadows = false;
    primitive("cylinder", "Central shrine finial", [gateX, 7.32, -58.65], [.11, .88, .11], mats.gold); primitive("sphere", "Central shrine crown", [gateX, 7.8, -58.65], [.2, .2, .2], mats.gold);
    const runner = primitive("box", "Doorway dyed runner", [gateX, .025, -34.25], [3.3, .025, 4.4], mats.magenta); runner.castShadows = false;
    for (const [x, z, facing] of [[-8.05, -31.8, 0], [-1.15, -31.8, 180]]) createWallTorch(x, 2.15, z, facing);
    const fill = new pc.Entity("Doorway fire fill"); fill.addComponent("light", { type: "omni", color: new pc.Color(1, .48, .24), intensity: .62, range: 11, castShadows: false }); fill.setPosition(-4.6, 3.2, -31.7); state.app.root.addChild(fill);
  }

  function buildScene() {
    state.app = new pc.Application(canvas, { mouse: new pc.Mouse(canvas), keyboard: new pc.Keyboard(window), graphicsDeviceOptions: { antialias: true, alpha: false, powerPreference: "high-performance" } });
    state.app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW); state.app.setCanvasResolution(pc.RESOLUTION_AUTO); state.app.graphicsDevice.maxPixelRatio = Math.min(1, window.devicePixelRatio); state.app.start();
    state.app.scene.ambientLight = new pc.Color(.24, .27, .44); state.app.scene.exposure = 1.36; state.app.scene.toneMapping = pc.TONEMAP_ACES; state.app.scene.gammaCorrection = pc.GAMMA_SRGB; state.app.scene.fog.type = pc.FOG_EXP2; state.app.scene.fog.color = new pc.Color(.038, .028, .085); state.app.scene.fog.density = .0055;
    mats.stone = material([0.42, 0.34, 0.31]); mats.stoneLight = material([0.72, 0.58, 0.42]); mats.sand = material([0.53, 0.40, 0.30]); mats.sandLight = material([0.67, 0.52, 0.38]); mats.sandDark = material([0.30, 0.22, 0.25]); mats.roadSand = material([.72, .61, .46]); mats.wood = material([0.16, 0.07, 0.065]); mats.bowWood = material([.36, .105, .042]); mats.bowWood.gloss = .42; mats.bowWood.update(); mats.bowGrip = material([.115, .045, .025]); mats.bowGrip.gloss = .18; mats.bowGrip.update(); mats.bowCord = material([.72, .66, .52]); mats.iron = material([0.08, .07, .09]); mats.steel = material([.48, .50, .54]); mats.indigo = material([0.11, 0.075, 0.22]); mats.turquoise = material([0.035, 0.31, 0.31]); mats.magenta = material([0.30, 0.045, 0.17]); mats.gold = material([0.70, 0.39, 0.055]); mats.targetLock = material([1, .18, .12], [1, .045, .02]); mats.warningGold = material([1, .72, .08], [1, .46, .02]); mats.warningArrow = material([1, .28, .20], [1, .055, .025]); mats.warningRed = material([.72, .025, .018], [1, .02, .01]); mats.fire = material([0.95, 0.20, 0.01], [1, 0.16, 0.01]); mats.fireHot = material([1, .67, .08], [1, .45, .02]); mats.smoke = translucentMaterial([.16, .13, .22], .22); mats.weaponTrail = translucentMaterial([1, .52, .18], .34); mats.hitImpact = translucentMaterial([1, .36, .12], .68); mats.healthBack = material([.08, .035, .06]); mats.healthEnemy = material([.9, .12, .09], [1, .04, .025]); mats.objective = material([.92, .56, .08], [1, .45, .06]); mats.objectiveGlow = translucentMaterial([1, .48, .10], .18); mats.sky = material([.04, .018, .10], [.075, .035, .18]); mats.sky.useLighting = false; mats.sky.cull = pc.CULLFACE_FRONT; mats.sky.update(); mats.player = material([0.05, 0.25, 0.35]); mats.skin = material([0.42, 0.22, 0.13]); mats.enemy = material([0.38, 0.06, 0.08]); mats.archer = material([0.24, 0.09, 0.31]); mats.brute = material([0.34, 0.12, 0.04]); mats.family = material([0.06, 0.42, 0.38]); mats.chitra = material([0.70, 0.41, 0.09]);
    mats.roadSand.gloss = .008; mats.roadSand.metalness = 0; mats.roadSand.update();
    mats.bowWood.diffuse = new pc.Color(.52, .16, .045); mats.bowWood.emissive = new pc.Color(.025, .006, .001); mats.bowWood.emissiveIntensity = .45; mats.bowWood.update();
    const sky = primitive("sphere", "Indigo night sky", [0, 24, -6], [92, 70, 92], mats.sky); sky.castShadows = false; sky.receiveShadows = false;
    primitive("box", "Outer earth", [0, -.52, -4], [82, .35, 102], mats.sandDark); const road = primitive("box", "Packed sand street", [0, STREET_SURFACE_Y - .04, -3], [22, .08, 82], mats.roadSand); road.castShadows = false; road.receiveShadows = false;
    for (const [x, z, radius] of [[-7.8, 25, .08], [7.2, 14, .06], [-8.3, 2, .075], [7.7, -10, .065], [-7.5, -23, .08], [7.9, -36, .07]]) { const pebble = primitive("sphere", "Road pebble", [x, STREET_SURFACE_Y + radius * .22, z], [radius * 1.4, radius * .42, radius], mats.sandDark); pebble.castShadows = false; }
    for (let z = 34; z > -44; z -= 6) {
      const leftColor = z % 12 === 4 ? mats.magenta : mats.indigo; const rightColor = z % 12 === 4 ? mats.turquoise : mats.wood;
      primitive("box", "Left house", [-13, 2.5, z], [5, 5.5, 5.3], leftColor); primitive("box", "Right house", [13, 2.6, z - 2], [5, 5.7, 5.4], rightColor);
      primitive("box", "Left stone plinth", [-10.55, .35, z], [.36, .7, 5.3], mats.stoneLight); primitive("box", "Right stone plinth", [10.55, .35, z - 2], [.36, .7, 5.4], mats.stoneLight);
      primitive("box", "Left carved cornice", [-10.55, 4.45, z], [.34, .18, 5.3], mats.gold); primitive("box", "Right carved cornice", [10.55, 4.55, z - 2], [.34, .18, 5.4], mats.gold);
      primitive("box", "Cloth", [-10.35, 2.6, z + 1.8], [.15, 2.5, 1.7], z % 12 === 4 ? mats.gold : mats.magenta);
    }
    for (const [x, z, color, lean] of [[-7.8, -9.8, mats.turquoise, -7], [7.7, -14.2, mats.magenta, 7], [-7.6, -22.0, mats.gold, -7]]) {
      const awning = primitive("box", "Woven market awning", [x, 3.25, z], [4.3, .09, 3.0], color); awning.setEulerAngles(0, 0, lean); awning.castShadows = false;
      primitive("cylinder", "Awning support", [x > 0 ? 5.7 : -5.7, 1.55, z - 1.25], [.065, 1.55, .065], mats.wood);
      primitive("cylinder", "Awning support", [x > 0 ? 5.7 : -5.7, 1.55, z + 1.25], [.065, 1.55, .065], mats.wood);
    }
    for (const [minX, maxX, minZ, maxZ, name, , visual] of WORLD_COLLIDERS) {
      if (visual || ["Stall", "Barrels"].includes(name) || /brazier|vase|stairs|awning support/i.test(name)) continue;
      const width = maxX - minX, depth = maxZ - minZ; const x = (minX + maxX) / 2, z = (minZ + maxZ) / 2;
      if (name.includes("wall")) {
        const segments = Math.max(2, Math.ceil(width / 1.8)); const segmentWidth = width / segments;
        for (let index = 0; index < segments; index += 1) primitive("box", `${name} sandstone course`, [minX + segmentWidth * (index + .5), .85 + (index % 2) * .035, z], [segmentWidth - .055, 1.72, depth], index % 2 ? mats.sand : mats.sandLight);
        primitive("box", `${name} carved cap`, [x, 1.78, z], [width + .16, .16, depth + .12], mats.gold);
      } else {
        const blockMaterial = name.includes("Stall") ? mats.magenta : name.includes("Barrel") ? mats.wood : name.includes("Door post") ? mats.stone : mats.stoneLight;
        primitive("box", name, [x, name.includes("post") ? 1.2 : .65, z], [width, name.includes("post") ? 2.5 : 1.3, depth], blockMaterial);
        if (name.includes("Door post")) { primitive("box", `${name} stone plinth`, [x, .18, z], [width + .26, .34, depth + .26], mats.stoneLight); primitive("box", `${name} gold capital`, [x, 2.42, z], [width + .3, .22, depth + .3], mats.gold); }
      }
    }
    decorateTurnWalls(); createDoorwayLandmark();
    for (const [x, z] of [[-6, 9.8], [8, -3], [-9, -17], [5, -29]]) createBrazier(x, z);
    createSunEmblem(-10.15, 2.7, 18.1); createSunEmblem(10.15, 2.7, 10.1, 180); createSunEmblem(-10.15, 2.7, -15.9); createSunEmblem(10.15, 2.7, -29.9, 180);
    createRegionalSkyline();
    for (const [x, y, z, size] of [[-26, 31, -62, 2.8], [35, 23, -58, .16], [-31, 20, -48, .12], [18, 34, -54, .13], [-42, 28, -30, .10], [41, 32, -20, .12]]) { const star = primitive("sphere", size > 1 ? "Moon disc" : "Night star", [x, y, z], [size, size, size], mats.fireHot); star.castShadows = false; }
    for (const [x, z] of [[-9.4, 17.9], [9.4, 9.9], [-9.4, -10.1], [9.4, -25.9]]) { const lanternLight = new pc.Entity("Wall lantern glow"); lanternLight.addComponent("light", { type: "omni", color: new pc.Color(1, .54, .24), intensity: .6, range: 5.8, castShadows: false }); lanternLight.setPosition(x, 2.2, z); state.app.root.addChild(lanternLight); }
    const moon = new pc.Entity("Moonlight"); moon.addComponent("light", { type: "directional", color: new pc.Color(.58, .68, 1), intensity: 1.68, castShadows: true, shadowDistance: 42, shadowResolution: 1024, shadowBias: .22, normalOffsetBias: .06 }); moon.setEulerAngles(48, -32, 0); state.app.root.addChild(moon);
    const fill = new pc.Entity("Warm reflected fire fill"); fill.addComponent("light", { type: "directional", color: new pc.Color(1, .49, .26), intensity: .17, castShadows: false }); fill.setEulerAngles(28, 148, 0); state.app.root.addChild(fill);
    batchStaticEnvironment(); createObjectiveMarker(); createTargetMarker();
    state.playerEntity = createCharacter("Vrishaketu", mats.player, 1); state.chitra = createCharacter("Chitra", mats.chitra, .73); state.chitra.setPosition(0, CHARACTER_GROUND_LIFT * state.chitra.dwarkaScale, 14);
    state.camera = new pc.Entity("Right shoulder camera"); state.camera.addComponent("camera", { clearColor: new pc.Color(.075, .035, .16), fov: 63, nearClip: .08, farClip: 110 }); state.app.root.addChild(state.camera);
    const heroFill = new pc.Entity("Camera soft fill"); heroFill.addComponent("light", { type: "omni", color: new pc.Color(1, .76, .62), intensity: .42, range: 5.2, castShadows: false }); heroFill.setLocalPosition(0, .2, 0); state.camera.addChild(heroFill);
    loadApprovedAssets();
    state.app.on("update", updateScene);
    window.addEventListener("resize", () => state.app.resizeCanvas());
  }

  function createCharacter(name, outfit, scale = 1) {
    const root = new pc.Entity(name); root.dwarkaScale = scale; root.dwarkaModelKey = characterModelKey(name); state.app.root.addChild(root); state.characterRoots.add(root);
    root.setLocalPosition(0, CHARACTER_GROUND_LIFT * scale, 0);
    const body = primitive("capsule", `${name} loading body`, [0, 1.0 * scale, 0], [.75 * scale, 1.55 * scale, .65 * scale], outfit, root); body.tags.add("greybox");
    const head = primitive("sphere", `${name} loading head`, [0, 2.08 * scale, 0], [.58 * scale, .62 * scale, .58 * scale], mats.skin, root); head.tags.add("greybox");
    upgradeCharacter(root);
    return root;
  }

  function syncPhaseScene(phase) {
    for (const entity of state.enemyEntities.values()) { state.characterRoots.delete(entity); entity.destroy(); } state.enemyEntities.clear();
    state.enemyHealth.clear(); state.enemySnapshotVelocities.clear();
    for (const warning of state.enemyWarnings.values()) warning.destroy(); state.enemyWarnings.clear();
    for (const entity of state.familyEntities) { state.characterRoots.delete(entity); entity.destroy(); } state.familyEntities = [];
    state.chitra.enabled = phase === "arrival" || phase === "ending";
    const familyPos = phase === "courtyard" ? [-4, 1] : phase === "market" ? [6, -14] : phase === "doorway" || phase === "ending" ? [-5, -31] : null;
    if (familyPos) {
      for (let index = 0; index < 2; index += 1) { const member = createCharacter(`Family ${index + 1}`, mats.family, .68 + index * .08); member.setPosition(familyPos[0] + index * .75, CHARACTER_GROUND_LIFT * member.dwarkaScale, familyPos[1]); member.setEulerAngles(0, index ? 20 : -20, 0); state.familyEntities.push(member); }
    }
    if (phase === "ending") state.chitra.setPosition(-4.1, CHARACTER_GROUND_LIFT * state.chitra.dwarkaScale, -31.2); else state.chitra.setPosition(0, CHARACTER_GROUND_LIFT * state.chitra.dwarkaScale, 14);
    setObjectiveMarker(phase);
  }

  function syncEnemyWarning(enemy, entity) {
    let warning = state.enemyWarnings.get(enemy.id);
    if (!(enemy.warning > 0)) { if (warning) { warning.destroy(); state.enemyWarnings.delete(enemy.id); } return; }
    const player = state.snapshot?.player; if (!player) return;
    if (!warning) {
      warning = new pc.Entity(`${enemy.kind} attack warning`); state.app.root.addChild(warning); state.enemyWarnings.set(enemy.id, warning);
      if (enemy.kind === "archer") primitive("box", "Coral arrow line", [0, .02, 0], [.045, .045, 1], mats.warningArrow, warning);
      else if (enemy.kind === "brute") primitive("cylinder", "Heavy strike ground disc", [0, .025, 0], [1.45, .035, 1.45], mats.warningRed, warning);
      else { const left = primitive("box", "Coral blade warning left", [-.1, 0, 0], [.26, .032, .032], mats.warningArrow, warning); const right = primitive("box", "Coral blade warning right", [.1, 0, 0], [.26, .032, .032], mats.warningArrow, warning); left.setLocalEulerAngles(0, 0, 42); right.setLocalEulerAngles(0, 0, -42); left.castShadows = false; right.castShadows = false; }
    }
    if (enemy.kind === "archer") {
      const dx = player.x - enemy.x, dz = player.z - enemy.z, distance = Math.max(.1, Math.hypot(dx, dz)); warning.setPosition((enemy.x + player.x) / 2, .62, (enemy.z + player.z) / 2); warning.setEulerAngles(0, Math.atan2(dx, dz) * 180 / Math.PI, 0); warning.setLocalScale(1, 1, distance);
    } else if (enemy.kind === "brute") warning.setPosition(enemy.x, .02, enemy.z);
    else { const hand = entity.dwarkaVisual?.findByName("hand_r"); const position = hand?.getPosition() || entity.getPosition(); warning.setPosition(position.x, position.y + .18, position.z); }
  }

  function ensureEnemyHealthBar(entity) {
    if (entity.dwarkaHealthBar) return entity.dwarkaHealthBar;
    const anchor = new pc.Entity("Enemy health bar"); entity.addChild(anchor); anchor.setLocalPosition(0, 2.18, 0);
    const background = primitive("box", "Enemy health track", [0, 0, 0], [.96, .075, .045], mats.healthBack, anchor); background.castShadows = false;
    const fill = primitive("box", "Enemy health remaining", [0, 0, -.03], [.88, .045, .055], mats.healthEnemy, anchor); fill.castShadows = false;
    entity.dwarkaHealthBar = { anchor, fill }; return entity.dwarkaHealthBar;
  }

  function spawnImpactBurst(enemy, defeated = false) {
    const count = defeated ? 9 : 6;
    for (let index = 0; index < count; index += 1) {
      const angle = index / count * Math.PI * 2 + (defeated ? .2 : 0); const speed = (defeated ? 1.65 : 1.15) + (index % 3) * .24;
      const entity = primitive("sphere", defeated ? "Defeat spark" : "Confirmed hit spark", [enemy.x, 1.15 + (index % 2) * .13, enemy.z], [.045, .045, .045], mats.hitImpact); entity.castShadows = false;
      state.impacts.push({ entity, velocity: new pc.Vec3(Math.cos(angle) * speed, 1.35 + (index % 4) * .22, Math.sin(angle) * speed), life: 0, duration: defeated ? .68 : .46 });
    }
    playEffect(defeated ? "hitHeavy" : "hitLight", defeated ? .84 : .66);
  }

  function syncEnemyHealth(enemy, entity) {
    const healthBar = ensureEnemyHealthBar(entity); const maxHealth = Math.max(1, Number(enemy.maxHealth) || (enemy.kind === "brute" ? 110 : enemy.kind === "archer" ? 45 : 60)); const ratio = pc.math.clamp((Number(enemy.health) || 0) / maxHealth, 0, 1);
    healthBar.fill.setLocalScale(.88 * ratio, .045, .055); healthBar.fill.setLocalPosition(-.44 * (1 - ratio), 0, -.03); healthBar.anchor.enabled = !enemy.dead && (ratio < 1 || enemy.warning > 0);
    const previous = state.enemyHealth.get(enemy.id);
    if (Number.isFinite(previous) && enemy.health < previous) spawnImpactBurst(enemy, Boolean(enemy.dead));
    state.enemyHealth.set(enemy.id, enemy.health);
  }

  function syncEnemies(enemies, dt) {
    const active = new Set();
    for (const enemy of enemies || []) {
      active.add(enemy.id); let entity = state.enemyEntities.get(enemy.id);
      if (!entity) { entity = createCharacter(enemy.kind, enemy.kind === "archer" ? mats.archer : enemy.kind === "brute" ? mats.brute : mats.enemy, enemy.kind === "brute" ? 1.22 : .92); entity.setPosition(enemy.x, CHARACTER_GROUND_LIFT * entity.dwarkaScale, enemy.z); state.enemyEntities.set(enemy.id, entity); }
      const visualNow = performance.now();
      if (enemy.dead && !entity.dwarkaDeadAt) entity.dwarkaDeadAt = visualNow;
      else if (!enemy.dead) entity.dwarkaDeadAt = 0;
      entity.enabled = !enemy.dead || visualNow - entity.dwarkaDeadAt < 800;
      const velocity = state.enemySnapshotVelocities.get(enemy.id) || { x: 0, z: 0 }; const visualSpeed = Math.hypot(velocity.x, velocity.z); const snapshotAge = Math.min(.075, Math.max(0, (performance.now() - state.snapshotReceivedAt) / 1000)); const targetX = enemy.x + velocity.x * snapshotAge; const targetZ = enemy.z + velocity.z * snapshotAge; const current = entity.getPosition(); const positionBlend = 1 - Math.exp(-Math.min(.05, dt) * 20);
      entity.setPosition(pc.math.lerp(current.x, targetX, positionBlend), CHARACTER_GROUND_LIFT * entity.dwarkaScale, pc.math.lerp(current.z, targetZ, positionBlend));
      if (enemy.warning > 0) { const pulse = 1 + Math.sin(performance.now() * .025) * .06; entity.setLocalScale(pulse, pulse, pulse); } else entity.setLocalScale(1, 1, 1);
      const warningAnimation = enemy.kind === "archer" ? "archerWarn" : enemy.kind === "brute" ? "bruteWarn" : "melee";
      const warningActive = enemy.warning > 0;
      if (entity.dwarkaWarningActive && !warningActive && !enemy.dead) entity.dwarkaImpactUntil = performance.now() + (enemy.kind === "brute" ? 760 : 520);
      entity.dwarkaWarningActive = warningActive;
      const impactAnimation = enemy.kind === "archer" ? "fire" : enemy.kind === "brute" ? "bruteWarn" : "melee";
      const impactActive = performance.now() < (entity.dwarkaImpactUntil || 0); const actionAnimation = warningActive ? warningAnimation : impactActive ? impactAnimation : visualSpeed > .18 ? "enemyWalk" : "idle";
      setCharacterAnimation(entity, state.qaAnimationPreviews.get(enemy.kind) || (enemy.dead ? "down" : actionAnimation), visualSpeed);
      groundAnimatedCharacter(entity, dt);
      syncEquipmentSockets(entity); updateWeaponEffects(entity); syncEnemyHealth(enemy, entity);
      syncEnemyWarning(enemy, entity);
      const player = state.snapshot?.player;
      if (warningActive || impactActive || visualSpeed <= .18) { if (player) entity.lookAt(player.x, entity.getPosition().y, player.z); }
      else entity.lookAt(entity.getPosition().x + velocity.x, entity.getPosition().y, entity.getPosition().z + velocity.z);
    }
    for (const [id, entity] of state.enemyEntities) if (!active.has(id)) { state.characterRoots.delete(entity); entity.destroy(); state.enemyEntities.delete(id); state.enemyHealth.delete(id); const warning = state.enemyWarnings.get(id); warning?.destroy(); state.enemyWarnings.delete(id); }
  }

  function segmentCameraDistance(target, desired) {
    const dx = desired.x - target.x, dy = desired.y - target.y, dz = desired.z - target.z; const length = Math.hypot(dx, dy, dz); let allowed = length;
    const steps = Math.ceil(length / .16);
    for (let index = 1; index <= steps; index += 1) {
      const t = index / steps; const x = target.x + dx * t, z = target.z + dz * t;
      const worldBlocked = x < WORLD_BOUNDS.minX + .15 || x > WORLD_BOUNDS.maxX - .15 || z < WORLD_BOUNDS.minZ + .15 || z > WORLD_BOUNDS.maxZ - .15;
      const objectBlocked = WORLD_COLLIDERS.some(([minX, maxX, minZ, maxZ]) => x > minX - .18 && x < maxX + .18 && z > minZ - .18 && z < maxZ + .18 && target.y + dy * t < 3.2);
      if (worldBlocked || objectBlocked) { allowed = Math.max(.7, length * (index - 1) / steps - .15); break; }
    }
    return allowed;
  }

  function updateScene(dt) {
    state.fpsFrames += 1; state.fpsElapsed += dt; if (state.fpsElapsed >= .5) { state.fpsLast = Math.round(state.fpsFrames / state.fpsElapsed); ui.fps.textContent = String(state.fpsLast); state.fpsFrames = 0; state.fpsElapsed = 0; }
    state.captionTimer -= dt; if (state.captionTimer <= 0) ui.caption.hidden = true; state.toastTimer -= dt; if (state.toastTimer <= 0) ui.toast.hidden = true;
    const visualDt = Math.min(.05, Math.max(0, dt)); const lookBlend = 1 - Math.exp(-visualDt * 38);
    state.yaw += angleDifference(state.lookYaw, state.yaw) * lookBlend; state.pitch = pc.math.lerp(state.pitch, state.lookPitch, lookBlend);
    const snapshot = state.snapshot; if (!snapshot?.player) return;
    const snapshotAge = Math.min(.075, Math.max(0, (performance.now() - state.snapshotReceivedAt) / 1000));
    const targetX = snapshot.player.x + state.snapshotVelocity.x * snapshotAge; const targetZ = snapshot.player.z + state.snapshotVelocity.z * snapshotAge;
    const current = state.playerEntity.getPosition(); const blend = 1 - Math.exp(-visualDt * 20); const nextX = pc.math.lerp(current.x, targetX, blend); const nextZ = pc.math.lerp(current.z, targetZ, blend);
    const planarSpeed = Math.hypot(state.snapshotVelocity.x, state.snapshotVelocity.z);
    const localAction = state.localAction && performance.now() < state.localAction.until ? state.localAction.name : null;
    if (!localAction) state.localAction = null;
    const authoritativeAction = ["down", "hit", "dodge", "interact"].includes(snapshot.player.state) ? snapshot.player.state : null;
    const locomotionAnim = planarSpeed <= .35 ? "idle" : planarSpeed >= 5.3 ? "sprint" : "walk";
    const playerAnim = state.qaAnimationPreviews.get("Vrishaketu") || authoritativeAction || localAction || (snapshot.player.state === "locomotion" ? locomotionAnim : snapshot.player.state === "melee" ? "melee" : snapshot.player.state === "fire" ? "fire" : state.aim ? "aim" : "idle");
    const faceView = state.aim || ["aim", "fire", "melee", "attack"].includes(playerAnim); let desiredVisualYaw = state.visualYaw;
    if (faceView) desiredVisualYaw = state.yaw;
    else if (planarSpeed > .35) desiredVisualYaw = Math.atan2(state.snapshotVelocity.x, -state.snapshotVelocity.z);
    const turnBlend = 1 - Math.exp(-visualDt * (faceView ? 18 : 11)); state.visualYaw += angleDifference(desiredVisualYaw, state.visualYaw) * turnBlend;
    state.playerEntity.setPosition(nextX, CHARACTER_GROUND_LIFT * (state.playerEntity.dwarkaScale || 1), nextZ); state.playerEntity.setEulerAngles(0, -state.visualYaw * 180 / Math.PI, 0);
    setCharacterAnimation(state.playerEntity, playerAnim, planarSpeed);
    groundAnimatedCharacter(state.playerEntity, visualDt);
    const bowEquipped = state.aim || ["aim", "fire", "archerWarn"].includes(playerAnim);
    if (state.playerEntity.dwarkaBow) state.playerEntity.dwarkaBow.enabled = bowEquipped;
    if (state.playerEntity.dwarkaSword) state.playerEntity.dwarkaSword.enabled = !bowEquipped;
    syncEquipmentSockets(state.playerEntity); updateWeaponEffects(state.playerEntity);
    if (state.playing && snapshot.player.state === "locomotion" && planarSpeed > .65) {
      const gait = pc.math.clamp((planarSpeed - 3.2) / 3.3, 0, 1); const interval = pc.math.lerp(410, 275, gait);
      if (performance.now() - state.lastFootstepAt >= interval) { state.lastFootstepAt = performance.now(); state.footstepIndex = state.footstepIndex % 3 + 1; playEffect(`footstep${state.footstepIndex}`, .32); }
    }
    syncEnemies(snapshot.enemies, visualDt); groundAnimatedCharacter(state.chitra, visualDt); for (const family of state.familyEntities) groundAnimatedCharacter(family, visualDt); updateBowTargeting(snapshot, dt);
    const forward = { x: Math.sin(state.yaw), z: -Math.cos(state.yaw) }, right = { x: Math.cos(state.yaw), z: Math.sin(state.yaw) };
    const aimBlendRate = 1 - Math.exp(-visualDt * (state.aim ? 14 : 10)); state.aimBlend = pc.math.lerp(state.aimBlend, state.aim ? 1 : 0, aimBlendRate);
    const targetOffset = pc.math.lerp(.42, .28, state.aimBlend); const target = { x: nextX + right.x * targetOffset, y: 1.6, z: nextZ + right.z * targetOffset };
    const baseDistance = pc.math.lerp(4.5, .78, state.aimBlend); const shoulderOffset = pc.math.lerp(.72, .55, state.aimBlend); const cameraHeight = pc.math.lerp(1.25, .35, state.aimBlend); const pitchScale = pc.math.lerp(2.1, 1.25, state.aimBlend); const desired = { x: target.x - forward.x * baseDistance + right.x * shoulderOffset, y: target.y + cameraHeight + Math.sin(state.pitch) * pitchScale, z: target.z - forward.z * baseDistance + right.z * shoulderOffset };
    const safe = segmentCameraDistance(target, desired); state.cameraDistance = safe < state.cameraDistance ? safe : Math.min(baseDistance, state.cameraDistance + dt * 3.2);
    const ratio = Math.min(1, state.cameraDistance / Math.max(.001, Math.hypot(desired.x - target.x, desired.y - target.y, desired.z - target.z)));
    state.camera.setPosition(target.x + (desired.x - target.x) * ratio, target.y + (desired.y - target.y) * ratio, target.z + (desired.z - target.z) * ratio);
    if (performance.now() < state.damageFlashUntil && state.settings.cameraShake !== false) state.camera.translateLocal(Math.sin(performance.now() * .19) * .026, Math.cos(performance.now() * .23) * .018, 0);
    state.camera.lookAt(target.x + forward.x * 4, target.y + state.pitch * 2, target.z + forward.z * 4);
    state.camera.camera.fov = state.qaFocusName ? 42 : pc.math.lerp(63, 55, state.aimBlend);
    if (state.qaFocusName) {
      const actor = state.app.root.findByName(state.qaFocusName); const head = actor?.dwarkaVisual?.findByName("Head");
      if (actor && head) { const face = head.getPosition(); const facing = actor.forward; const right = actor.right; const radians = state.qaFocusAngle * Math.PI / 180; state.camera.setPosition(face.x + (facing.x * Math.cos(radians) + right.x * Math.sin(radians)) * state.qaFocusDistance, face.y + .03, face.z + (facing.z * Math.cos(radians) + right.z * Math.sin(radians)) * state.qaFocusDistance); state.camera.lookAt(face.x, face.y + .05, face.z); }
    }
    ui.vignette?.classList.toggle("damaged", performance.now() < state.damageFlashUntil);
    if (state.objectiveMarker?.enabled && state.objectiveTarget) { const bob = Math.sin(performance.now() * .0032) * .13; state.objectiveMarker.setPosition(state.objectiveTarget[0], state.objectiveTarget[1] + bob, state.objectiveTarget[2]); state.objectiveMarker.rotateLocal(0, dt * 38, 0); }
    updateObjectiveGuidance(snapshot);
    for (const fire of state.app.root.findByTag("fire")) { const pulse = 1 + Math.sin(performance.now() * .006 + fire.getPosition().x) * .12; fire.setLocalScale(pulse, .92 + pulse * .12, pulse); fire.setLocalEulerAngles(0, Math.sin(performance.now() * .002 + fire.getPosition().z) * 5, 0); }
    for (const smoke of state.app.root.findByTag("smoke")) { const index = smoke.dwarkaSmokeIndex || 0; const drift = performance.now() * .00016 + index * .24; const rise = .78 + (drift % 1.35); smoke.setLocalPosition(Math.sin(drift * 5.3) * .13, rise, Math.cos(drift * 4.1) * .09); const size = .16 + rise * .15; smoke.setLocalScale(size, size * .72, size); }
    for (let index = state.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = state.projectiles[index]; projectile.elapsed += dt; const progress = Math.min(1, projectile.elapsed / projectile.duration);
      const currentPosition = { x: pc.math.lerp(projectile.start.x, projectile.end.x, progress), y: pc.math.lerp(projectile.start.y, projectile.end.y, progress), z: pc.math.lerp(projectile.start.z, projectile.end.z, progress) };
      projectile.entity.setPosition(currentPosition.x, currentPosition.y, currentPosition.z); boxBetweenLocal(projectile.trail, state.app.root, new pc.Vec3(projectile.previous.x, projectile.previous.y, projectile.previous.z), new pc.Vec3(currentPosition.x, currentPosition.y, currentPosition.z), .012); projectile.previous = currentPosition;
      if (progress >= 1) { projectile.entity.destroy(); projectile.trail.destroy(); state.projectiles.splice(index, 1); }
    }
    for (let index = state.impacts.length - 1; index >= 0; index -= 1) {
      const impact = state.impacts[index]; impact.life += dt; impact.velocity.y -= 5.4 * dt; impact.entity.translate(impact.velocity.x * dt, impact.velocity.y * dt, impact.velocity.z * dt); const fadeScale = Math.max(.01, 1 - impact.life / impact.duration); impact.entity.setLocalScale(.045 * fadeScale, .045 * fadeScale, .045 * fadeScale);
      if (impact.life >= impact.duration) { impact.entity.destroy(); state.impacts.splice(index, 1); }
    }
    if (state.qaVisible) {
      const x = (state.keys.has("KeyD") ? 1 : 0) - (state.keys.has("KeyA") ? 1 : 0), z = (state.keys.has("KeyW") ? 1 : 0) - (state.keys.has("KeyS") ? 1 : 0);
      ui.qa.textContent = `phase ${snapshot.phase} · tick ${snapshot.serverTick}\nkeys ${[...state.keys].join(" ") || "none"}\nraw move ${x}, ${z} · speed ${planarSpeed.toFixed(2)} m/s · yaw ${state.yaw.toFixed(2)}\npos ${snapshot.player.x.toFixed(2)}, ${snapshot.player.z.toFixed(2)}\nstate ${snapshot.player.state} · camera ${state.cameraDistance.toFixed(2)}m\npointer ${document.pointerLockElement === canvas} · ${state.fpsLast} fps`;
    }
  }

  function qaSessionAllowed() {
    try { return new URLSearchParams(window.parent.location.search).has("qa"); }
    catch { return false; }
  }

  window.__DWARKA_QA__ = Object.freeze({
    animationSummary: () => ({
      tracks: Object.keys(state.animationTracks),
      roots: [...state.characterRoots].map((root) => ({ name: root.name, upgraded: Boolean(root.dwarkaUpgraded), hasAnim: Boolean(root.dwarkaVisual?.anim), activeState: root.dwarkaAnimState || null, playing: root.dwarkaVisual?.anim?.playing ?? null })),
    }),
    inputState: () => ({ yaw: state.yaw, pitch: state.pitch, lookYaw: state.lookYaw, lookPitch: state.lookPitch, visualYaw: state.visualYaw, planarSpeed: Math.hypot(state.snapshotVelocity.x, state.snapshotVelocity.z), aimBlend: state.aimBlend, keys: [...state.keys], playing: state.playing, paused: state.paused, aim: state.aim, projectiles: state.projectiles.length, targetEnemyId: state.targetEnemyId }),
    locomotionSample: () => {
      const root = state.playerEntity; const left = root?.dwarkaVisual?.findByName("foot_l")?.getPosition(); const right = root?.dwarkaVisual?.findByName("foot_r")?.getPosition(); const position = root?.getPosition();
      const sample = (value) => value ? { x: value.x, y: value.y, z: value.z } : null;
      return { time: performance.now(), root: sample(position), left: sample(left), right: sample(right), speed: Math.hypot(state.snapshotVelocity.x, state.snapshotVelocity.z), animation: root?.dwarkaAnimState || null, animationSpeed: root?.dwarkaVisual?.anim?.speed ?? null };
    },
    enemyMotionSample: () => [...state.enemyEntities].map(([id, root]) => { const position = root.getPosition(); const velocity = state.enemySnapshotVelocities.get(id) || { x: 0, z: 0 }; return { id, x: position.x, z: position.z, speed: Math.hypot(velocity.x, velocity.z), animation: root.dwarkaAnimState || null, animationSpeed: root.dwarkaVisual?.anim?.speed ?? null }; }),
    playerPosition: () => state.snapshot?.player ? { x: state.snapshot.player.x, z: state.snapshot.player.z, yaw: state.snapshot.player.yaw, state: state.snapshot.player.state } : null,
    worldSnapshot: () => state.snapshot ? JSON.parse(JSON.stringify({ phase: state.snapshot.phase, phaseEpoch: state.snapshot.phaseEpoch, player: state.snapshot.player, enemies: state.snapshot.enemies, family: state.snapshot.family })) : null,
    characterVisualAudit: () => [...state.characterRoots].map((root) => {
      const face = root.dwarkaVisual?.findByName(root.dwarkaModelKey.startsWith("Female") ? "Superhero_Female_Head" : "SuperHero_Male_Head"); const eyes = root.dwarkaVisual?.findByName("Eyes") || root.dwarkaVisual?.findByName("Face.001"); const rigHead = root.dwarkaVisual?.findByName("Head"); const leftHand = root.dwarkaVisual?.findByName("hand_l"); const rightHand = root.dwarkaVisual?.findByName("hand_r"); const bowPosition = root.dwarkaBow?.getPosition(); const swordPosition = root.dwarkaSword?.getPosition(); const footwear = root.dwarkaVisual?.findComponents("render").filter((render) => /Feet/.test(render.entity.name)).flatMap((render) => render.meshInstances || []); const forward = root.forward;
      const leftPosition = leftHand?.getPosition(); const rightPosition = rightHand?.getPosition();
      const position = (value) => value ? { x: Number(value.x.toFixed(3)), y: Number(value.y.toFixed(3)), z: Number(value.z.toFixed(3)) } : null; const faceAabb = face?.render?.meshInstances?.[0]?.aabb;
      return { name: root.name, model: root.dwarkaModelKey, singleSkeleton: Boolean(root.dwarkaVisual?.findByName("Armature") || root.dwarkaVisual?.findByName("pelvis")), hasVisibleFace: Boolean(face?.enabled && face.render?.enabled && eyes?.enabled && eyes.render?.enabled), rootPosition: position(root.getPosition()), rootYaw: Number(root.getEulerAngles().y.toFixed(2)), visualFacingYaw: Number(Math.atan2(forward.x, -forward.z).toFixed(3)), footMinimumY: footwear.length ? Number(Math.min(...footwear.map((instance) => instance.aabb.center.y - instance.aabb.halfExtents.y)).toFixed(3)) : null, headBonePosition: position(rigHead?.getPosition()), faceBoundsCenter: position(faceAabb?.center), hasRiggedHair: Boolean(root.dwarkaVisual?.findByName("Hair_Buns") || root.dwarkaVisual?.findByName("Hair_SimpleParted") || root.dwarkaVisual?.findByName("Hair_Buzzed") || root.dwarkaVisual?.findByName("Hair_Beard")), hasBow: Boolean(root.dwarkaBow), bowEnabled: Boolean(root.dwarkaBow?.enabled), bowLeftHandDistance: leftPosition && bowPosition ? Math.hypot(bowPosition.x - leftPosition.x, bowPosition.y - leftPosition.y, bowPosition.z - leftPosition.z) : null, bowDrawHandDistance: rightPosition && root.dwarkaBowPullWorld ? Math.hypot(root.dwarkaBowPullWorld.x - rightPosition.x, root.dwarkaBowPullWorld.y - rightPosition.y, root.dwarkaBowPullWorld.z - rightPosition.z) : null, hasSword: Boolean(root.dwarkaSword), approvedSword: Boolean(root.dwarkaSwordModel), swordGripDistance: rightPosition && swordPosition ? Math.hypot(swordPosition.x - rightPosition.x, swordPosition.y - rightPosition.y, swordPosition.z - rightPosition.z) : null, animation: root.dwarkaAnimState || null, animationSpeed: root.dwarkaVisual?.anim?.speed ?? null };
    }),
    environmentAlignmentAudit: () => state.environmentEntities.map((entity) => {
      const instances = entity.findComponents?.("render").flatMap((render) => render.meshInstances || []) || []; if (instances.length === 0) return { name: entity.name, empty: true };
      const minimum = { x: Math.min(...instances.map((item) => item.aabb.center.x - item.aabb.halfExtents.x)), y: Math.min(...instances.map((item) => item.aabb.center.y - item.aabb.halfExtents.y)), z: Math.min(...instances.map((item) => item.aabb.center.z - item.aabb.halfExtents.z)) };
      const maximum = { x: Math.max(...instances.map((item) => item.aabb.center.x + item.aabb.halfExtents.x)), y: Math.max(...instances.map((item) => item.aabb.center.y + item.aabb.halfExtents.y)), z: Math.max(...instances.map((item) => item.aabb.center.z + item.aabb.halfExtents.z)) };
      return { name: entity.name, minimum, maximum, groundCorrection: entity.dwarkaGroundCorrection || 0 };
    }),
    focusCharacter: (name = null, distance = 1.45, angle = 0) => { state.qaFocusName = name; state.qaFocusDistance = Math.max(1.2, Math.min(6, Number(distance) || 1.45)); state.qaFocusAngle = Math.max(-180, Math.min(180, Number(angle) || 0)); if (state.camera?.camera) state.camera.camera.fov = name ? 42 : 63; return Boolean(!name || state.app?.root.findByName(name)); },
    previewAnimation: (name, animation = null) => { if (animation && !CHARACTER_ANIMATIONS[animation]) return false; if (animation) state.qaAnimationPreviews.set(name, animation); else state.qaAnimationPreviews.delete(name); const root = state.app?.root.findByName(name); if (root && animation) setCharacterAnimation(root, animation); return Boolean(root); },
    beginPlay: () => { if (!qaSessionAllowed()) return false; enterPlay(); return true; },
    setAim: (value) => { if (!qaSessionAllowed()) return false; state.qaAimPreview = Boolean(value); state.aim = Boolean(value); return state.aim; },
    setView: (yaw, pitch = state.pitch) => { if (!qaSessionAllowed() || !Number.isFinite(Number(yaw)) || !Number.isFinite(Number(pitch))) return false; state.yaw = state.lookYaw = Number(yaw); state.pitch = state.lookPitch = Math.max(-.58, Math.min(.42, Number(pitch))); return true; },
  });
  buildScene(); loadVoiceManifest(); showLoading(); syncSettingsUI();
  if (window.parent === window) connect();
  else {
    sendParent("dwarka:ready", { version: 1 });
    state.readyTimer = window.setInterval(() => { if (!state.profile) sendParent("dwarka:ready", { version: 1 }); }, 750);
  }
})();
