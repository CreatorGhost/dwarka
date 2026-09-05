function isLoopbackHost(hostname) {
  const host = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "");
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "0.0.0.0" ||
    host.startsWith("127.") ||
    host === "::" ||
    host === "::1" ||
    host === "::ffff:0:0" ||
    host === "::ffff:0.0.0.0" ||
    /^::7f[0-9a-f]{2}:/.test(host) ||
    host.startsWith("::ffff:127.") ||
    /^::ffff:7f[0-9a-f]{2}:/.test(host)
  );
}

export function reconcileMovementDoors(simulation, authoritativeDoors) {
  if (
    typeof simulation?.adoptDoorState === "function" &&
    Array.isArray(authoritativeDoors)
  ) {
    simulation.adoptDoorState(authoritativeDoors);
    return;
  }
  if (
    !simulation?.doorProgress ||
    !simulation?.openDoorIds ||
    !Array.isArray(authoritativeDoors)
  )
    return;
  const doorsById = new Map(
    authoritativeDoors.map((door) => [door.id, door]),
  );
  simulation.openDoorIds.clear();
  for (const id of Object.keys(simulation.doorProgress)) {
    const authoritative = doorsById.get(id);
    const open = authoritative?.open === true;
    const progress = Number(authoritative?.progress);
    simulation.doorProgress[id] = open
      ? 1
      : Number.isFinite(progress)
        ? Math.max(0, Math.min(1, progress))
        : 0;
    if (open) simulation.openDoorIds.add(id);
  }
}

export function safeWebSocketEndpoint(value, locationHref) {
  if (!value) return null;
  try {
    const endpoint = new URL(value, locationHref);
    const page = new URL(locationHref);
    const localEndpoint = isLoopbackHost(endpoint.hostname);
    const localPage = isLoopbackHost(page.hostname);
    const secureEndpoint = endpoint.protocol === "wss:" && (!localEndpoint || localPage);
    const localDevelopmentEndpoint = endpoint.protocol === "ws:" && localEndpoint && localPage;
    if (
      endpoint.username ||
      endpoint.password ||
      endpoint.hash ||
      (!secureEndpoint && !localDevelopmentEndpoint)
    )
      return null;
    return endpoint.href;
  } catch {
    return null;
  }
}

export function installSession(rt) {
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

  function validParentMessage(event) {
    return (
      event.origin === window.location.origin &&
      event.source === window.parent &&
      ["dwarka:resume", "dwarka:profile-sync"].includes(event.data?.type)
    );
  }

  function standaloneProfile() {
    let id = localStorage.getItem("dwarka.standalone.player");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("dwarka.standalone.player", id);
    }
    return {
      schemaVersion: 1,
      anonymousPlayerId: id,
      progressToken: localStorage.getItem("dwarka.standalone.token"),
      settings: state.settings,
    };
  }

  function requestedLocalPhase(fallback = "arrival") {
    if (state.requestedAction === "replay") return "arrival";
    const phase = state.profile?.progressSummary?.nextPhase || fallback;
    return PLAYABLE_PHASES.has(phase) ? phase : "arrival";
  }

  function ensureLocalSimulation(
    phase,
    authoritativePlayer = null,
    forceCorrection = false,
    movementOnly = !state.localMode,
  ) {
    const recreate =
      !state.localSimulation ||
      state.localSimulation.phase !== phase ||
      state.localSimulation.movementOnly !== movementOnly;
    if (recreate) {
      state.localSimulation = new ChapterSimulation(
        state.profile?.anonymousPlayerId || crypto.randomUUID(),
        phase,
        movementOnly,
      );
      state.localSeq = 0;
    }
    if (authoritativePlayer && (recreate || forceCorrection)) {
      const local = state.localSimulation.player;
      local.x = authoritativePlayer.x;
      local.y = authoritativePlayer.y;
      local.z = authoritativePlayer.z;
      local.yaw = authoritativePlayer.yaw;
    }
    state.localSimulation.setPaused(state.paused);
    return state.localSimulation;
  }

  function startLocalSession(phase = requestedLocalPhase(), reconnecting = false) {
    state.localMode = true;
    state.sessionAccepted = false;
    state.networkSnapshots = [];
    state.localSimulation = null;
    const simulation = ensureLocalSimulation(PLAYABLE_PHASES.has(phase) ? phase : "arrival");
    if (reconnecting)
      rt.setConnectionStatus(rt.t("serverReconnecting"), rt.t("serverReconnectingCopy"));
    else ui.reconnect.hidden = true;
    ui.modalPrimary.disabled = false;
    applySnapshot(simulation.snapshot(), "local");
    rt.showToast(
      "Offline play · progress is not saved",
      5,
    );
  }

  function currentInput(pressed) {
    let x = (state.keys.has("KeyD") ? 1 : 0) - (state.keys.has("KeyA") ? 1 : 0);
    let z = (state.keys.has("KeyW") ? 1 : 0) - (state.keys.has("KeyS") ? 1 : 0);
    const magnitude = Math.hypot(x, z);
    if (magnitude > 1) {
      x /= magnitude;
      z /= magnitude;
    }
    const held = [];
    if (state.keys.has("ShiftLeft") || state.keys.has("ShiftRight")) held.push("sprint");
    if (state.aim) held.push("aim");
    return {
      move: [x, z],
      aimYaw: state.yaw,
      aimPitch: state.pitch,
      held,
      pressed,
    };
  }

  function processLocalEvents() {
    for (const event of state.localSimulation?.drainEvents() || []) {
      if (event.type === "phase.restarted") {
        rt.showToast(
          rt.localizedMessage(
            event.reason === "down" ? "checkpointRestoredFull" : "familyCheckpointRestored",
          ),
          4,
        );
        rt.showResume(event.phase);
      } else if (event.type === "phase.completed") {
        rt.showToast(
          event.nextPhase === "complete"
            ? rt.t("completeTitle")
            : "Offline checkpoint · " +
                rt.t(PHASE_DETAILS[event.nextPhase]?.[0] || event.nextPhase),
          3.5,
        );
      }
    }
  }

  function tickLocalSimulation(dt) {
    if (!state.localSimulation || state.paused || !state.playing) return;
    const authoritativeDoors =
      !state.localMode && Array.isArray(state.snapshot?.doors)
        ? state.snapshot.doors
        : null;
    if (authoritativeDoors)
      reconcileMovementDoors(state.localSimulation, authoritativeDoors);
    const before = {
      x: state.localSimulation.player.x,
      z: state.localSimulation.player.z,
    };
    const pressed = [...state.localPressed];
    state.localPressed.clear();
    state.localSimulation.acceptInput({
      type: "input",
      seq: ++state.localSeq,
      ...currentInput(pressed),
    });
    state.localSimulation.tick(dt);
    const elapsed = Math.max(0.001, Math.min(0.05, dt));
    state.predictedVelocity = {
      x: (state.localSimulation.player.x - before.x) / elapsed,
      z: (state.localSimulation.player.z - before.z) / elapsed,
    };
    state.predictedPlayer = state.localMode
      ? { ...state.localSimulation.player }
      : {
          ...state.snapshot?.player,
          ...state.localSimulation.player,
          health: state.snapshot?.player?.health ?? 100,
        };
    if (state.localMode) processLocalEvents();
    else state.localSimulation.drainEvents();
    if (state.localMode) applySnapshot(state.localSimulation.snapshot(), "local");
  }

  function connect(background = state.localMode) {
    window.clearTimeout(state.reconnectTimer);
    state.reconnectTimer = 0;
    if (!state.profile) state.profile = standaloneProfile();
    if (state.socket && state.socket.readyState <= WebSocket.OPEN) {
      state.intentionalSockets.add(state.socket);
      state.socket.close(1000, "Superseded");
    }
    const query = new URLSearchParams(location.search);
    const wsUrl = safeWebSocketEndpoint(query.get("ws"), location.href);
    if (!background) {
      state.reconnectRequiresResume = false;
      state.reconnectingAuthoritative = false;
      state.reconnectPhase =
        state.requestedAction === "replay" ? null : state.snapshot?.phase || state.reconnectPhase;
      state.snapshot = null;
      state.snapshotVelocity = { x: 0, z: 0 };
      state.predictedVelocity = { x: 0, z: 0 };
      state.snapshotReceivedAt = 0;
      state.sessionAccepted = false;
      state.localMode = false;
      state.localSimulation = null;
      state.predictedPlayer = null;
      state.networkSnapshots = [];
      rt.showLoading();
    } else state.sessionAccepted = false;
    if (!wsUrl) {
      if (!state.localMode) startLocalSession();
      return;
    }
    rt.setConnectionStatus(
      state.reconnectAttempts === 0 ? rt.t("serverWaking") : rt.t("serverReconnecting"),
      state.reconnectAttempts === 0 ? rt.t("serverWakingCopy") : rt.t("serverReconnectingCopy"),
    );
    try {
      state.socket = new WebSocket(wsUrl);
    } catch {
      scheduleReconnect();
      return;
    }
    const openedSocket = state.socket;
    openedSocket.addEventListener("open", () => {
      if (state.socket !== openedSocket) return;
      openedSocket.send(
        JSON.stringify({
          type: "session.resume",
          playerId: state.profile.anonymousPlayerId,
          progressToken: state.token,
          clientVersion: 1,
          requestedAction: state.requestedAction,
        }),
      );
    });
    openedSocket.addEventListener("message", (event) => {
      if (state.socket !== openedSocket) return;
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      handleServer(message);
    });
    openedSocket.addEventListener("close", () => {
      if (state.socket === openedSocket && !state.intentionalSockets.has(openedSocket))
        scheduleReconnect(openedSocket);
    });
    openedSocket.addEventListener("error", () => openedSocket.close());
  }

  function scheduleReconnect(closedSocket = state.socket) {
    if (closedSocket && state.socket !== closedSocket) return;
    const wasAuthoritative = state.sessionAccepted || state.reconnectingAuthoritative;
    if (state.sessionAccepted) {
      state.reconnectRequiresResume = state.playing && !state.paused;
      state.reconnectingAuthoritative = true;
    }
    state.socket = null;
    state.sessionAccepted = false;
    if (wasAuthoritative) {
      state.playing = false;
      state.paused = true;
      clearInput();
      state.localSimulation?.setPaused(true);
      rt.setConnectionStatus(rt.t("serverReconnecting"), rt.t("serverReconnectingCopy"));
    } else if (!state.localMode) {
      startLocalSession(state.confirmedPhase || requestedLocalPhase(), true);
    }
    window.clearTimeout(state.reconnectTimer);
    state.reconnectAttempts += 1;
    const delay = Math.min(2_000, 500 * 2 ** Math.min(3, state.reconnectAttempts - 1));
    state.reconnectTimer = window.setTimeout(() => connect(true), delay);
  }

  function handleServer(message) {
    if (message.type === "session.accepted") {
      const wasLocal = state.localMode;
      const wasAuthoritativeReconnect = Boolean(state.reconnectingAuthoritative);
      const requiresResume =
        Boolean(state.reconnectRequiresResume) ||
        (wasLocal && state.playing && !state.paused);
      state.snapVisualOnNextSnapshot = wasLocal || wasAuthoritativeReconnect;
      state.sessionAccepted = true;
      state.localMode = false;
      state.confirmedPhase = PLAYABLE_PHASES.has(message.phase)
        ? message.phase
        : state.confirmedPhase;
      state.reconnectAttempts = 0;
      state.reconnectRequiresResume = false;
      state.reconnectingAuthoritative = false;
      if (state.snapshot?.player && Number.isFinite(state.snapshot.player.yaw))
        state.yaw = state.lookYaw = state.visualYaw = state.snapshot.player.yaw;
      ui.reconnect.hidden = true;
      ui.reconnect.classList.remove("failed");
      ui.modalPrimary.disabled = false;
      if (requiresResume) rt.showResume(state.confirmedPhase);
      else rt.sendPause(state.paused || !state.playing);
      if (message.progressToken && message.progressSummary) {
        state.token = message.progressToken;
        rt.sendParent("dwarka:progress", {
          progressToken: message.progressToken,
          progressSummary: {
            furthestCompletedPhase: message.progressSummary.furthestCompletedPhase,
            nextPhase: message.progressSummary.nextPhase,
            chapterComplete: message.progressSummary.chapterComplete,
            updatedAt: new Date().toISOString(),
          },
        });
      }
      if (message.warning) {
        rt.showToast(message.warning, 7);
        rt.sendParent("dwarka:error", {
          code: "invalid-progress",
          message: message.warning,
        });
      }
      return;
    }
    if (message.type === "progress.committed" || message.type === "progress.synced") {
      state.token = message.progressToken;
      if (PLAYABLE_PHASES.has(message.nextPhase)) state.confirmedPhase = message.nextPhase;
      if (window.parent === window) localStorage.setItem("dwarka.standalone.token", state.token);
      rt.sendParent("dwarka:progress", {
        progressToken: message.progressToken,
        progressSummary: {
          furthestCompletedPhase: message.completedPhase,
          nextPhase: message.nextPhase,
          chapterComplete: message.chapterComplete,
          updatedAt: new Date().toISOString(),
        },
      });
      state.socket?.send(
        JSON.stringify({
          type: "progress.ack",
          progressToken: message.progressToken,
        }),
      );
      if (message.type === "progress.synced") {
        state.requestedAction = "continue";
        window.setTimeout(connect, 80);
        return;
      }
      rt.showToast(
        message.chapterComplete
          ? rt.t("completeTitle")
          : rt.t("checkpointSaved") +
              " · " +
              rt.t(PHASE_DETAILS[message.nextPhase]?.[0] || message.nextPhase),
        3.5,
      );
      rt.playCue(message.chapterComplete ? 580 : 440, 0.18);
      return;
    }
    if (message.type === "phase.restarted") {
      rt.showToast(
        rt.localizedMessage(
          message.reason === "down" ? "checkpointRestoredFull" : "familyCheckpointRestored",
        ),
        4,
      );
      rt.setCaption(
        rt.localizedMessage("warningSpeaker"),
        rt.localizedMessage("restartCaption"),
        4,
      );
      rt.showResume(message.phase);
      return;
    }
    if (message.type === "snapshot") {
      if (state.qaPreviewActive) return;
      applySnapshot(message, "network");
      return;
    }
    if (message.type === "error")
      rt.showToast(message.message || "The server rejected an invalid message", 5);
  }

  function applySnapshot(snapshot, source = "network") {
    const previous = state.snapshot;
    const previousPhase = previous?.phase;
    const now = state.interpolationClockMs;
    const forceVisualSnap = source === "network" && state.snapVisualOnNextSnapshot;
    if (source === "network") {
      state.networkSnapshots.push({ receivedAt: now, snapshot });
      while (state.networkSnapshots.length > 8) state.networkSnapshots.shift();
      const prediction = ensureLocalSimulation(
        snapshot.phase,
        snapshot.player,
        Boolean(snapshot.positionCorrection) || forceVisualSnap,
        true,
      );
      reconcileMovementDoors(prediction, snapshot.doors);
      state.predictedPlayer = {
        ...snapshot.player,
        ...prediction.player,
        health: snapshot.player.health,
      };
    }
    const tickDelta = Number(snapshot.serverTick) - Number(previous?.serverTick);
    if (
      previous?.player &&
      snapshot.player &&
      previousPhase === snapshot.phase &&
      tickDelta > 0 &&
      tickDelta <= 10
    ) {
      const seconds = tickDelta * 0.05;
      let velocityX = (snapshot.player.x - previous.player.x) / seconds;
      let velocityZ = (snapshot.player.z - previous.player.z) / seconds;
      const speed = Math.hypot(velocityX, velocityZ);
      if (!Number.isFinite(speed) || speed > 9.1) {
        velocityX = 0;
        velocityZ = 0;
      }
      state.snapshotVelocity = { x: velocityX, z: velocityZ };
    } else state.snapshotVelocity = { x: 0, z: 0 };
    const previousEnemies = new Map((previous?.enemies || []).map((enemy) => [enemy.id, enemy]));
    const nextEnemyVelocities = new Map();
    for (const enemy of snapshot.enemies || []) {
      const prior = previousEnemies.get(enemy.id);
      let velocity = { x: 0, z: 0 };
      if (prior && previousPhase === snapshot.phase && tickDelta > 0 && tickDelta <= 10) {
        const seconds = tickDelta * 0.05;
        const x = (enemy.x - prior.x) / seconds;
        const z = (enemy.z - prior.z) / seconds;
        if ([x, z].every(Number.isFinite) && Math.hypot(x, z) <= 3.2) velocity = { x, z };
      }
      nextEnemyVelocities.set(enemy.id, velocity);
    }
    state.enemySnapshotVelocities = nextEnemyVelocities;
    state.snapshotReceivedAt = now;
    state.snapshot = snapshot;
    const enteringPhase = !previousPhase || snapshot.phase !== previousPhase;
    if (
      snapshot.player &&
      (forceVisualSnap || enteringPhase || (!state.playing && !state.qaAimPreview))
    ) {
      const checkpointYaw = Number.isFinite(snapshot.player.yaw) ? snapshot.player.yaw : state.yaw;
      state.yaw = state.lookYaw = state.visualYaw = checkpointYaw;
      if ((forceVisualSnap || enteringPhase) && state.playerEntity) {
        state.playerEntity.dwarkaFloorY =
          snapshot.player.y ?? floorHeightAt(snapshot.player.x, snapshot.player.z);
        state.playerEntity.setPosition(
          snapshot.player.x,
          state.playerEntity.dwarkaFloorY +
            CHARACTER_GROUND_LIFT * (state.playerEntity.dwarkaScale || 1),
          snapshot.player.z,
        );
      }
    }
    if (forceVisualSnap) {
      state.snapVisualOnNextSnapshot = false;
      state.cameraSpring = null;
      state.cameraSpringVelocity = { x: 0, y: 0, z: 0 };
    }
    if (snapshot.phase !== previousPhase) {
      rt.syncPhaseScene(snapshot.phase);
      rt.updateEnvironmentVisibility(snapshot.player);
      state.renderScale = 1;
      state.lowFpsSeconds = 0;
      state.recoveredFpsSeconds = 0;
      state.app.graphicsDevice.maxPixelRatio = Math.min(1, window.devicePixelRatio);
      state.app.resizeCanvas();
      if (!previousPhase && state.reconnectPhase === snapshot.phase) rt.showResume(snapshot.phase);
      else if (!previousPhase && snapshot.phase === "arrival") rt.showIntro("arrival");
      else if (snapshot.phase === "courtyard" && previousPhase === "arrival")
        rt.showIntro("courtyard");
      else if (!previousPhase && snapshot.phase === "courtyard") rt.showIntro("courtyard");
      else if (snapshot.phase === "ending") rt.showEnding(0);
      else if (snapshot.phase === "complete") rt.showComplete();
      else if (!previousPhase && snapshot.phase !== "arrival") rt.showResume(snapshot.phase);
    }
    state.reconnectPhase = null;
    rt.updateHud(snapshot);
  }

  function sendInput() {
    if (
      !state.playing ||
      state.paused ||
      !state.sessionAccepted ||
      state.socket?.readyState !== WebSocket.OPEN
    )
      return;
    const pressed = [...state.pressed];
    state.pressed.clear();
    const player = state.localSimulation?.player || state.predictedPlayer || state.snapshot?.player;
    const position = player
      ? {
          x: player.x,
          y: player.y ?? floorHeightAt(player.x, player.z),
          z: player.z,
        }
      : undefined;
    state.socket.send(
      JSON.stringify({
        type: "input",
        seq: ++state.seq,
        clientTick: state.seq,
        ...currentInput(pressed),
        position,
      }),
    );
  }

  rt.validParentMessage = validParentMessage;
  rt.standaloneProfile = standaloneProfile;
  rt.requestedLocalPhase = requestedLocalPhase;
  rt.ensureLocalSimulation = ensureLocalSimulation;
  rt.startLocalSession = startLocalSession;
  rt.currentInput = currentInput;
  rt.processLocalEvents = processLocalEvents;
  rt.tickLocalSimulation = tickLocalSimulation;
  rt.connect = connect;
  rt.scheduleReconnect = scheduleReconnect;
  rt.handleServer = handleServer;
  rt.applySnapshot = applySnapshot;
  rt.sendInput = sendInput;
}
