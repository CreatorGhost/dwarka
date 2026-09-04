export function installQa(rt) {
  const { state, ui, pc, canvas, mats } = rt;
  const WORLD_BOUNDS = rt.WORLD_BOUNDS;
  const WORLD_COLLIDERS = rt.WORLD_COLLIDERS;
  const FLOOR_REGIONS = rt.FLOOR_REGIONS;
  const ROUTE_SEGMENTS = rt.ROUTE_SEGMENTS;
  const ROUTE_WAYPOINTS = rt.ROUTE_WAYPOINTS;
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
  const QA_VISTAS = rt.QA_VISTAS;
  const characterStateGraph = rt.characterStateGraph;
  const animationSpeeds = rt.animationSpeeds;
  const t = rt.t;
  const sendParent = rt.sendParent;
  const strings = rt.strings;
  const localizedMessage = rt.localizedMessage;
  const clearInput = rt.clearInput;
  const queuePressed = rt.queuePressed;

  function qaSessionAllowed() {
    try {
      return new URLSearchParams(window.parent.location.search).has("qa");
    } catch {
      return false;
    }
  }
  rt.qaSessionAllowed = qaSessionAllowed;

  function renderingContractAssertion() {
    if (!qaSessionAllowed()) return null;
    const frame = state.cameraFrame;
    const moon = state.app.root.findByName("Moonlight")?.light;
    const routeSurfaces = state.app.root.find((entity) =>
      /packed-earth route|route junction/.test(entity.name),
    );
    const result = {
      aces: frame?.rendering?.toneMapping === pc.TONEMAP_ACES,
      antialiasSamples: frame?.rendering?.samples ?? 0,
      taa: Boolean(frame?.taa?.enabled),
      bloom: frame?.bloom?.intensity ?? 0,
      bloomBlurLevel: frame?.bloom?.blurLevel ?? Number.POSITIVE_INFINITY,
      ssao: frame?.ssao?.type ?? "none",
      ssaoScale: frame?.ssao?.scale ?? Number.POSITIVE_INFINITY,
      moonShadows: Boolean(moon?.castShadows),
      moonCascades: moon?.numCascades ?? 0,
      moonShadowDistance: moon?.shadowDistance ?? Number.POSITIVE_INFINITY,
      moonShadowMapAllocated: Boolean(moon?._light?._shadowMap),
      moonShadowRenderViews: moon?._light?._renderData?.length ?? 0,
      routeShadowSurfaces: routeSurfaces.length,
      routeShadowReceivers: routeSurfaces.filter(
        (entity) => entity.render?.receiveShadows,
      ).length,
    };
    result.passed =
      result.aces &&
      (result.antialiasSamples >= 2 || result.taa) &&
      result.bloom >= 0.025 &&
      result.bloom <= 0.04 &&
      result.bloomBlurLevel <= 4 &&
      result.ssao !== "none" &&
      result.ssaoScale <= 0.5 &&
      result.moonShadows &&
      result.moonCascades === 1 &&
      result.moonShadowDistance <= 30 &&
      result.moonShadowMapAllocated &&
      result.moonShadowRenderViews >= 1 &&
      result.routeShadowSurfaces > 0 &&
      result.routeShadowReceivers === result.routeShadowSurfaces;
    if (!result.passed)
      console.error("DWARKA rendering contract assertion failed", result);
    return result;
  }

  function warmLightCoverageAssertion() {
    if (!qaSessionAllowed()) return null;
    const warmLights = state.app.root
      .findComponents("light")
      .filter((light) => {
        const color = light.color;
        return light.type !== "directional" && color.r > color.b * 1.35;
      });
    const segmentCoverage = ROUTE_SEGMENTS.map((segment) => {
      const eastWest = Math.abs(segment.yaw) === 90;
      let uncoveredRun = 0;
      let maximumGap = 0;
      for (
        let offset = -segment.length / 2;
        offset <= segment.length / 2 + 0.01;
        offset += 2
      ) {
        const point = {
          x: segment.x + (eastWest ? offset : 0),
          z: segment.z + (eastWest ? 0 : offset),
        };
        const covered = warmLights.some((light) => {
          const position = light.entity.getPosition();
          return (
            Math.hypot(position.x - point.x, position.z - point.z) <=
            light.range
          );
        });
        uncoveredRun = covered ? 0 : uncoveredRun + 2;
        maximumGap = Math.max(maximumGap, uncoveredRun);
      }
      return { id: segment.id, maximumGap };
    });
    const encounterPools = ["courtyard", "market", "doorway"].map((phase) => {
      const checkpoint = CHAPTER_CONFIG.checkpoints[phase];
      const pools = warmLights.filter((light) => {
        const position = light.entity.getPosition();
        return (
          Math.hypot(position.x - checkpoint.x, position.z - checkpoint.z) <= 12
        );
      }).length;
      return { phase, pools };
    });
    const result = {
      segmentCoverage,
      encounterPools,
      passed:
        segmentCoverage.every(({ maximumGap }) => maximumGap <= 8) &&
        encounterPools.every(({ pools }) => pools >= 2),
    };
    if (!result.passed)
      console.error("DWARKA warm-light coverage assertion failed", result);
    return result;
  }

  function captureFrameDataUrl() {
    if (!qaSessionAllowed() || !state.app) return null;
    return new Promise((resolve) => {
      state.app.once("postrender", async () => {
        try {
          const canvas = state.app.graphicsDevice.canvas;
          const bitmap = await createImageBitmap(canvas);
          const output = new OffscreenCanvas(canvas.width, canvas.height);
          output.getContext("2d").drawImage(bitmap, 0, 0);
          bitmap.close();
          const blob = await output.convertToBlob({ type: "image/png" });
          const reader = new FileReader();
          reader.addEventListener("load", () => resolve(reader.result), {
            once: true,
          });
          reader.addEventListener("error", () => resolve(null), { once: true });
          reader.readAsDataURL(blob);
        } catch (error) {
          console.error("DWARKA frame capture failed", error);
          resolve(null);
        }
      });
      state.app.renderNextFrame = true;
    });
  }

  function routeContractAssertion() {
    if (!qaSessionAllowed()) return null;
    const distance = ROUTE_WAYPOINTS.slice(1).reduce((total, point, index) => {
      const previous = ROUTE_WAYPOINTS[index];
      return total + Math.hypot(point.x - previous.x, point.z - previous.z);
    }, 0);
    const pointsOnFloor = ROUTE_WAYPOINTS.every(
      (point) => floorHeightAt(point.x, point.z) === point.y,
    );
    const result = {
      distance,
      waypointCount: ROUTE_WAYPOINTS.length,
      pointsOnFloor,
      passed: distance >= 170 && pointsOnFloor,
    };
    if (!result.passed)
      console.error("DWARKA route contract assertion failed", result);
    return result;
  }

  function routeTraversalAudit() {
    if (!qaSessionAllowed()) return null;
    const simulation = new ChapterSimulation("qa-route-traversal", "arrival", true);
    simulation.setPaused(false);
    const traversalWaypoints = ROUTE_WAYPOINTS.flatMap((point, index) => {
      if (index === 2)
        return [
          { x: 0, y: 0, z: 11.5, detour: "arrival-well-south" },
          { x: 22, y: 0, z: 11.5, detour: "arrival-well-south" },
          point,
        ];
      if (index === 4)
        return [
          { x: 22, y: 0, z: -3.2, detour: "courtyard-door-south" },
          { x: 4, y: 0, z: -3.2, detour: "courtyard-door-south" },
          point,
        ];
      if (index === 6)
        return [
          { x: -12.5, y: 6, z: -15, detour: "market-frontage-north" },
          { x: -20, y: 6, z: -15, detour: "market-frontage-north" },
          point,
        ];
      if (index === 8)
        return [
          { x: -20, y: 6, z: -30.5, detour: "gate-frontage-north" },
          { x: 12, y: 6, z: -30.5, detour: "gate-frontage-north" },
          point,
        ];
      if (index === 10)
        return [
          { x: 12, y: 6, z: -48.7, detour: "torana-north" },
          { x: 0, y: 6, z: -48.7, detour: "torana-north" },
          point,
        ];
      return [point];
    });
    const start = traversalWaypoints[0];
    simulation.player.x = start.x;
    simulation.player.y = start.y;
    simulation.player.z = start.z;
    let sequence = 0;
    let travelled = 0;
    let minimumY = start.y;
    let maximumY = start.y;
    let maximumFloorError = 0;
    const segments = [];
    for (let index = 1; index < traversalWaypoints.length; index += 1) {
      const target = traversalWaypoints[index];
      const expected = Math.hypot(
        target.x - traversalWaypoints[index - 1].x,
        target.z - traversalWaypoints[index - 1].z,
      );
      let steps = 0;
      let stalledFrames = 0;
      while (
        Math.hypot(target.x - simulation.player.x, target.z - simulation.player.z) >
          0.3 &&
        steps < Math.max(240, Math.ceil(expected * 45))
      ) {
        const dx = target.x - simulation.player.x;
        const dz = target.z - simulation.player.z;
        const distance = Math.max(0.0001, Math.hypot(dx, dz));
        const beforeX = simulation.player.x;
        const beforeZ = simulation.player.z;
        simulation.acceptInput({
          type: "input",
          seq: ++sequence,
          move: [dx / distance, -dz / distance],
          aimYaw: 0,
          aimPitch: 0,
          held: ["sprint"],
          pressed: [],
        });
        simulation.tick(1 / 30);
        const moved = Math.hypot(
          simulation.player.x - beforeX,
          simulation.player.z - beforeZ,
        );
        travelled += moved;
        stalledFrames = moved < 0.001 ? stalledFrames + 1 : 0;
        minimumY = Math.min(minimumY, simulation.player.y);
        maximumY = Math.max(maximumY, simulation.player.y);
        maximumFloorError = Math.max(
          maximumFloorError,
          Math.abs(
            simulation.player.y -
              floorHeightAt(simulation.player.x, simulation.player.z),
          ),
        );
        steps += 1;
        if (stalledFrames > 60) break;
      }
      const remaining = Math.hypot(
        target.x - simulation.player.x,
        target.z - simulation.player.z,
      );
      segments.push({
        index,
        detour: target.detour || null,
        expected: Number(expected.toFixed(3)),
        steps,
        remaining: Number(remaining.toFixed(3)),
        reached: remaining <= 0.3,
        position: {
          x: Number(simulation.player.x.toFixed(3)),
          y: Number(simulation.player.y.toFixed(3)),
          z: Number(simulation.player.z.toFixed(3)),
        },
      });
      if (remaining > 0.3) break;
    }
    const result = {
      authoredDistance: Number(
        ROUTE_WAYPOINTS.slice(1)
          .reduce((sum, point, index) => {
            const previous = ROUTE_WAYPOINTS[index];
            return sum + Math.hypot(point.x - previous.x, point.z - previous.z);
          }, 0)
          .toFixed(3),
      ),
      expectedDistance: Number(
        segments.reduce((sum, segment) => sum + segment.expected, 0).toFixed(3),
      ),
      travelled: Number(travelled.toFixed(3)),
      minimumY: Number(minimumY.toFixed(3)),
      maximumY: Number(maximumY.toFixed(3)),
      maximumFloorError: Number(maximumFloorError.toFixed(4)),
      segments,
      passed:
        segments.length === traversalWaypoints.length - 1 &&
        segments.every(({ reached }) => reached) &&
        minimumY >= 0 &&
        maximumFloorError <= 0.05,
    };
    if (!result.passed)
      console.error("DWARKA route traversal audit failed", result);
    return result;
  }

  function doorContractAssertion() {
    if (!qaSessionAllowed()) return null;
    const doorIds = new Set(rt.DOORS.map(({ id }) => id));
    const colliders = new Map(
      WORLD_COLLIDERS.map(([minX, maxX, minZ, maxZ, label, id]) => [
        id,
        { minX, maxX, minZ, maxZ, label },
      ]),
    );
    const angleError = (a, b) =>
      Math.abs((((a - b + 180) % 360) + 360) % 360 - 180);
    const pairs = rt.DOORS.map((door) => {
      const record = state.doorEntities.get(door.id);
      const collider = colliders.get(door.id);
      const pose = rt.doorVisualPose
        ? rt.doorVisualPose(
            door,
            record?.progress || 0,
            rt.WORLD_LAYOUT.doorAssets || {},
          )
        : {
            x: door.position[0],
            z: door.position[2],
            yaw: door.yaw || 0,
          };
      const position = record?.entity?.getPosition?.();
      const yaw = record?.entity?.getEulerAngles?.().y;
      const renderers = record?.entity?.findComponents?.("render") || [];
      const colliderCenter = collider
        ? {
            x: (collider.minX + collider.maxX) / 2,
            z: (collider.minZ + collider.maxZ) / 2,
          }
        : null;
      const positionError = position
        ? Math.hypot(position.x - pose.x, position.z - pose.z)
        : Infinity;
      const yawError = Number.isFinite(yaw) ? angleError(yaw, pose.yaw) : Infinity;
      const colliderError = colliderCenter
        ? Math.hypot(
            colliderCenter.x - door.position[0],
            colliderCenter.z - door.position[2],
          )
        : Infinity;
      const visibleMeshCount = renderers.reduce(
        (total, renderer) => total + (renderer.meshInstances?.length || 0),
        0,
      );
      return {
        id: door.id,
        dynamic: Boolean(door.openFromPhase),
        renderer: record?.entity?.name || null,
        collider: collider?.label || null,
        kind: door.openFromPhase ? "openable-gameplay" : "closed-decorative",
        enabled: record?.entity?.enabled ?? false,
        visibleMeshCount,
        positionError: Number(positionError.toFixed(4)),
        yawError: Number(yawError.toFixed(3)),
        colliderError: Number(colliderError.toFixed(4)),
        passed:
          Boolean(record?.entity && collider) &&
          visibleMeshCount > 0 &&
          positionError <= 0.12 &&
          yawError <= 1.5 &&
          colliderError <= 0.12,
      };
    });
    const result = {
      authored: doorIds.size,
      colliders: [...doorIds].filter((id) => colliders.has(id)).length,
      openable: rt.DOORS.filter(({ openFromPhase }) => openFromPhase).length,
      rendered: pairs.filter(({ renderer }) => renderer).length,
      pairs,
    };
    result.passed =
      result.authored === 9 &&
      result.colliders === result.authored &&
      result.openable === 2 &&
      result.rendered === result.authored &&
      pairs.every(({ passed }) => passed);
    if (!result.passed)
      console.error("DWARKA door contract assertion failed", result);
    return result;
  }

  window.__DWARKA_QA__ = Object.freeze({
    renderingContractAssertion,
    applyPerformanceProbe: (profile = "baseline") => {
      if (!qaSessionAllowed() || !state.cameraFrame) return null;
      const frame = state.cameraFrame;
      const moon = state.app.root.findByName("Moonlight")?.light;
      frame.rendering.samples = profile === "taa" ? 1 : 2;
      frame.taa.enabled = profile === "taa";
      frame.bloom.enabled = profile !== "no-bloom" && profile !== "minimal";
      frame.ssao.type =
        profile === "no-ssao" || profile === "minimal"
          ? pc.SSAOTYPE_NONE
          : pc.SSAOTYPE_LIGHTING;
      if (moon)
        moon.castShadows = profile !== "no-shadows" && profile !== "minimal";
      frame.update();
      return profile;
    },
    warmLightCoverageAssertion,
    captureFrameDataUrl,
    routeContractAssertion,
    routeTraversalAudit,
    doorContractAssertion,
    previewCheckpoint: (phase) => {
      if (!qaSessionAllowed() || !CHAPTER_CONFIG.checkpoints[phase])
        return false;
      const checkpoint = CHAPTER_CONFIG.checkpoints[phase];
      state.qaPreviewActive = true;
      const player = {
        ...(state.snapshot?.player || {}),
        ...checkpoint,
        health: state.snapshot?.player?.health ?? 100,
        state: "idle",
        invulnerable: 0,
      };
      const snapshot = {
        ...(state.snapshot || {}),
        type: "snapshot",
        phase,
        player,
        enemies: [],
        family: {
          active: false,
          safe: false,
          dangerStarted: false,
          remaining: 20,
        },
      };
      state.playing = false;
      state.paused = true;
      state.sessionAccepted = false;
      state.localSimulation = null;
      state.snapshot = snapshot;
      state.predictedPlayer = { ...player };
      if (state.localSimulation) {
        state.localSimulation.player.x = player.x;
        state.localSimulation.player.y = player.y;
        state.localSimulation.player.z = player.z;
        state.localSimulation.player.yaw = player.yaw;
      }
      state.yaw = state.lookYaw = state.visualYaw = player.yaw;
      state.cameraSpring = null;
      rt.syncPhaseScene(phase);
      rt.updateEnvironmentVisibility(player);
      rt.updateHud(snapshot);
      state.playerEntity.dwarkaFloorY = player.y;
      state.playerEntity.setPosition(
        player.x,
        player.y +
          CHARACTER_GROUND_LIFT * (state.playerEntity.dwarkaScale || 1),
        player.z,
      );
      ui.storyPanel.hidden = true;
      ui.modal.hidden = true;
      ui.reconnect.hidden = true;
      return true;
    },
    previewVista: (id) => {
      if (!qaSessionAllowed()) return false;
      const vista = QA_VISTAS.find((candidate) => candidate.id === id);
      if (!vista) return false;
      const simulation = new ChapterSimulation("qa-vista-player", vista.phase);
      state.qaPreviewActive = true;
      const snapshot = simulation.snapshot();
      snapshot.player = {
        ...snapshot.player,
        x: vista.x,
        y: vista.y,
        z: vista.z,
        yaw: vista.yaw,
        state: "idle",
      };
      state.playing = false;
      state.paused = true;
      state.sessionAccepted = false;
      state.localSimulation = null;
      state.snapshot = snapshot;
      state.predictedPlayer = { ...snapshot.player };
      state.yaw = state.lookYaw = state.visualYaw = vista.yaw;
      state.cameraSpring = null;
      rt.syncPhaseScene(vista.phase);
      rt.updateEnvironmentVisibility(snapshot.player);
      rt.updateHud(snapshot);
      rt.syncEnemies(snapshot.enemies, 0);
      state.playerEntity.dwarkaFloorY = vista.y;
      state.playerEntity.setPosition(
        vista.x,
        vista.y + CHARACTER_GROUND_LIFT * (state.playerEntity.dwarkaScale || 1),
        vista.z,
      );
      ui.storyPanel.hidden = true;
      ui.modal.hidden = true;
      ui.reconnect.hidden = true;
      return true;
    },
    playVista: (id) => {
      if (!qaSessionAllowed()) return false;
      const vista = QA_VISTAS.find((candidate) => candidate.id === id);
      if (!vista) return false;
      const simulation = new ChapterSimulation(
        "qa-vista-player",
        vista.phase,
        false,
      );
      simulation.player.x = vista.x;
      simulation.player.y = vista.y;
      simulation.player.z = vista.z;
      simulation.player.yaw = vista.yaw;
      simulation.setPaused(false);
      const snapshot = simulation.snapshot();
      state.qaPreviewActive = true;
      state.localMode = true;
      state.sessionAccepted = false;
      state.localSimulation = simulation;
      state.snapshot = snapshot;
      state.predictedPlayer = { ...snapshot.player };
      state.yaw = state.lookYaw = state.visualYaw = vista.yaw;
      state.cameraSpring = null;
      rt.syncPhaseScene(vista.phase);
      rt.updateEnvironmentVisibility(snapshot.player);
      rt.updateHud(snapshot);
      rt.syncEnemies(snapshot.enemies, 0);
      state.playerEntity.dwarkaFloorY = vista.y;
      state.playerEntity.setPosition(
        vista.x,
        vista.y + CHARACTER_GROUND_LIFT * (state.playerEntity.dwarkaScale || 1),
        vista.z,
      );
      ui.storyPanel.hidden = true;
      ui.modal.hidden = true;
      ui.reconnect.hidden = true;
      rt.enterPlay();
      return true;
    },
    previewStory: (phase, index = 0) => {
      if (!qaSessionAllowed()) return false;
      if (phase === "ending") rt.showEnding(Number(index) || 0);
      else if (phase === "arrival" || phase === "courtyard")
        rt.showIntro(phase);
      else return false;
      return true;
    },
    storySummary: () => ({
      mode: state.modalMode,
      index: state.storyIndex,
      narrating: state.storyNarrating,
      image: ui.storyImage?.getAttribute?.("src") || ui.storyImage?.src || "",
      speaker: ui.storySpeaker?.textContent || "",
      text: ui.storyText?.textContent || "",
      fullBleed: ui.modal?.classList?.contains("story-beat") || false,
      voiceActive: Boolean(state.voiceAudio),
    }),
    checkpointReadabilityAssertion: () => {
      if (!qaSessionAllowed() || !state.snapshot?.player) return null;
      return new Promise((resolve) => {
        state.app.once("postrender", async () => {
          const player = state.snapshot.player;
          const lights = state.app.root
            .findComponents("light")
            .filter((light) => {
              const position = light.entity.getPosition();
              return (
                light.entity.enabled &&
                light.enabled &&
                light.type !== "directional" &&
                Math.hypot(position.x - player.x, position.z - player.z) <= 12
              );
            });
          const canvas = state.app.graphicsDevice.canvas;
          const sampleWidth = 240;
          const sampleHeight = Math.max(
            1,
            Math.round((sampleWidth * canvas.height) / canvas.width),
          );
          const bitmap = await createImageBitmap(canvas, {
            resizeWidth: sampleWidth,
            resizeHeight: sampleHeight,
            resizeQuality: "high",
          });
          const sampleCanvas = new OffscreenCanvas(sampleWidth, sampleHeight);
          const context = sampleCanvas.getContext("2d", {
            willReadFrequently: true,
          });
          context.drawImage(bitmap, 0, 0);
          bitmap.close();
          const pixels = context.getImageData(
            0,
            0,
            sampleWidth,
            sampleHeight,
          ).data;
          let luminance = 0;
          let below = 0;
          let samples = 0;
          for (let index = 0; index < pixels.length; index += 4) {
            const value =
              (0.2126 * pixels[index] +
                0.7152 * pixels[index + 1] +
                0.0722 * pixels[index + 2]) /
              255;
            luminance += value;
            if (value < 0.05) below += 1;
            samples += 1;
          }
          const meanLuminance = luminance / Math.max(1, samples);
          const belowFivePercent = below / Math.max(1, samples);
          const mesh = state.playerEntity?.getPosition();
          const meshSnapshotDistance = mesh
            ? Math.hypot(mesh.x - player.x, mesh.z - player.z)
            : Number.POSITIVE_INFINITY;
          const result = {
            phase: state.snapshot.phase,
            nearbyEnabledLights: lights.length,
            meanLuminance,
            belowFivePercent,
            meshSnapshotDistance,
            passed:
              lights.length >= 2 &&
              meanLuminance >= 0.18 &&
              meanLuminance <= 0.3 &&
              belowFivePercent <= 0.25 &&
              meshSnapshotDistance < 0.3,
          };
          if (!result.passed)
            console.error(
              "DWARKA checkpoint readability assertion failed",
              result,
            );
          resolve(result);
        });
        state.app.renderNextFrame = true;
      });
    },
    animationSummary: () => ({
      tracks: Object.keys(state.animationTracks),
      roots: [...state.characterRoots].map((root) => ({
        name: root.name,
        upgraded: Boolean(root.dwarkaUpgraded),
        hasAnim: Boolean(root.dwarkaVisual?.anim),
        activeState: root.dwarkaAnimState || null,
        playing: root.dwarkaVisual?.anim?.playing ?? null,
      })),
    }),
    inputState: () => ({
      yaw: state.yaw,
      pitch: state.pitch,
      lookYaw: state.lookYaw,
      lookPitch: state.lookPitch,
      visualYaw: state.visualYaw,
      planarSpeed: Math.hypot(
        state.snapshotVelocity.x,
        state.snapshotVelocity.z,
      ),
      aimBlend: state.aimBlend,
      keys: [...state.keys],
      playing: state.playing,
      paused: state.paused,
      aim: state.aim,
      projectiles: state.projectiles.length,
      targetEnemyId: state.targetEnemyId,
    }),
    locomotionSample: () => {
      const root = state.playerEntity;
      const left = root?.dwarkaVisual?.findByName("foot_l")?.getPosition();
      const right = root?.dwarkaVisual?.findByName("foot_r")?.getPosition();
      const position = root?.getPosition();
      const sample = (value) =>
        value ? { x: value.x, y: value.y, z: value.z } : null;
      return {
        time: performance.now(),
        root: sample(position),
        left: sample(left),
        right: sample(right),
        speed: Math.hypot(state.snapshotVelocity.x, state.snapshotVelocity.z),
        animation: root?.dwarkaAnimState || null,
        animationSpeed: root?.dwarkaVisual?.anim?.speed ?? null,
      };
    },
    enemyMotionSample: () =>
      [...state.enemyEntities].map(([id, root]) => {
        const position = root.getPosition();
        const velocity = state.enemySnapshotVelocities.get(id) || {
          x: 0,
          z: 0,
        };
        const enemy = state.snapshot?.enemies?.find(
          (candidate) => candidate.id === id,
        );
        const player = state.snapshot?.player;
        const targetYaw = player
          ? Math.atan2(player.x - position.x, -(player.z - position.z))
          : 0;
        const forward = root.forward;
        const renderedYaw = Math.atan2(forward.x, -forward.z);
        const facingError = (yaw) =>
          Number.isFinite(yaw)
            ? Math.abs(
                Math.atan2(
                  Math.sin(targetYaw - yaw),
                  Math.cos(targetYaw - yaw),
                ),
              )
            : null;
        return {
          id,
          kind: enemy?.kind || null,
          x: position.x,
          z: position.z,
          warning: enemy?.warning ?? 0,
          serverYaw: enemy?.yaw ?? null,
          interpolatedYaw: root.dwarkaInterpolatedYaw ?? null,
          renderedYaw,
          serverFacingError: facingError(enemy?.yaw),
          renderedFacingError: facingError(renderedYaw),
          speed: Math.hypot(velocity.x, velocity.z),
          animation: root.dwarkaAnimState || null,
          animationSpeed: root.dwarkaVisual?.anim?.speed ?? null,
        };
      }),
    playerPosition: () =>
      state.snapshot?.player
        ? {
            x: state.snapshot.player.x,
            z: state.snapshot.player.z,
            yaw: state.snapshot.player.yaw,
            state: state.snapshot.player.state,
          }
        : null,
    meshSnapshotAlignment: () => ({
      current: state.meshSnapshotDistance,
      maximum: state.meshSnapshotMaxDistance,
      passed: state.meshSnapshotDistance < 0.3,
    }),
    worldSnapshot: () =>
      state.snapshot
        ? JSON.parse(
            JSON.stringify({
              phase: state.snapshot.phase,
              phaseEpoch: state.snapshot.phaseEpoch,
              player: state.snapshot.player,
              enemies: state.snapshot.enemies,
              family: state.snapshot.family,
            }),
          )
        : null,
    characterVisualAudit: () =>
      [...state.characterRoots]
        .filter((root) => root.enabled)
        .map((root) => {
          const face = root.dwarkaVisual?.findByName(
            root.dwarkaModelKey.startsWith("Female")
              ? "Superhero_Female_Head"
              : "SuperHero_Male_Head",
          );
          const eyes =
            root.dwarkaVisual?.findByName("Eyes") ||
            root.dwarkaVisual?.findByName("Face.001");
          const rigHead = root.dwarkaVisual?.findByName("Head");
          const leftHand = root.dwarkaVisual?.findByName("hand_l");
          const rightHand = root.dwarkaVisual?.findByName("hand_r");
          const bowPosition = root.dwarkaBow?.getPosition();
          const swordPosition = root.dwarkaSword?.getPosition();
          const footwear = root.dwarkaVisual
            ?.findComponents("render")
            .filter((render) => /Feet/.test(render.entity.name))
            .flatMap((render) => render.meshInstances || []);
          const forward = root.forward;
          const leftPosition = leftHand?.getPosition();
          const rightPosition = rightHand?.getPosition();
          const position = (value) =>
            value
              ? {
                  x: Number(value.x.toFixed(3)),
                  y: Number(value.y.toFixed(3)),
                  z: Number(value.z.toFixed(3)),
                }
              : null;
          const faceAabb = face?.render?.meshInstances?.[0]?.aabb;
          return {
            name: root.name,
            model: root.dwarkaModelKey,
            singleSkeleton: Boolean(
              root.dwarkaVisual?.findByName("Armature") ||
                root.dwarkaVisual?.findByName("pelvis"),
            ),
            hasVisibleFace: Boolean(
              face?.enabled &&
                face.render?.enabled &&
                eyes?.enabled &&
                eyes.render?.enabled,
            ),
            rootPosition: position(root.getPosition()),
            rootYaw: Number(root.getEulerAngles().y.toFixed(2)),
            visualFacingYaw: Number(
              Math.atan2(forward.x, -forward.z).toFixed(3),
            ),
            footMinimumY: footwear.length
              ? Number(
                  Math.min(
                    ...footwear.map(
                      (instance) =>
                        instance.aabb.center.y - instance.aabb.halfExtents.y,
                    ),
                  ).toFixed(3),
                )
              : null,
            headBonePosition: position(rigHead?.getPosition()),
            faceBoundsCenter: position(faceAabb?.center),
            hasRiggedHair: Boolean(
              root.dwarkaVisual?.findByName("Hair_Buns") ||
                root.dwarkaVisual?.findByName("Hair_SimpleParted") ||
                root.dwarkaVisual?.findByName("Hair_Buzzed") ||
                root.dwarkaVisual?.findByName("Hair_Beard"),
            ),
            hasBow: Boolean(root.dwarkaBow),
            bowEnabled: Boolean(root.dwarkaBow?.enabled),
            bowLeftHandDistance:
              leftPosition && bowPosition
                ? Math.hypot(
                    bowPosition.x - leftPosition.x,
                    bowPosition.y - leftPosition.y,
                    bowPosition.z - leftPosition.z,
                  )
                : null,
            bowDrawHandDistance:
              rightPosition && root.dwarkaBowPullWorld
                ? Math.hypot(
                    root.dwarkaBowPullWorld.x - rightPosition.x,
                    root.dwarkaBowPullWorld.y - rightPosition.y,
                    root.dwarkaBowPullWorld.z - rightPosition.z,
                  )
                : null,
            hasSword: Boolean(root.dwarkaSword),
            approvedSword: Boolean(root.dwarkaSwordModel),
            swordGripDistance:
              rightPosition && swordPosition
                ? Math.hypot(
                    swordPosition.x - rightPosition.x,
                    swordPosition.y - rightPosition.y,
                    swordPosition.z - rightPosition.z,
                  )
                : null,
            animation: root.dwarkaAnimState || null,
            animationSpeed: root.dwarkaVisual?.anim?.speed ?? null,
          };
        }),
    environmentAlignmentAudit: () =>
      state.environmentEntities.map((entity) => {
        const instances =
          entity
            .findComponents?.("render")
            .flatMap((render) => render.meshInstances || []) || [];
        if (instances.length === 0) return { name: entity.name, empty: true };
        const minimum = {
          x: Math.min(
            ...instances.map(
              (item) => item.aabb.center.x - item.aabb.halfExtents.x,
            ),
          ),
          y: Math.min(
            ...instances.map(
              (item) => item.aabb.center.y - item.aabb.halfExtents.y,
            ),
          ),
          z: Math.min(
            ...instances.map(
              (item) => item.aabb.center.z - item.aabb.halfExtents.z,
            ),
          ),
        };
        const maximum = {
          x: Math.max(
            ...instances.map(
              (item) => item.aabb.center.x + item.aabb.halfExtents.x,
            ),
          ),
          y: Math.max(
            ...instances.map(
              (item) => item.aabb.center.y + item.aabb.halfExtents.y,
            ),
          ),
          z: Math.max(
            ...instances.map(
              (item) => item.aabb.center.z + item.aabb.halfExtents.z,
            ),
          ),
        };
        return {
          name: entity.name,
          minimum,
          maximum,
          groundCorrection: entity.dwarkaGroundCorrection || 0,
        };
      }),
    renderingSummary: () => ({
      ambient: [
        state.app.scene.ambientLight.r,
        state.app.scene.ambientLight.g,
        state.app.scene.ambientLight.b,
      ],
      exposure: state.app.scene.exposure,
      skySphereCount: state.app.root.findByName("Indigo night sky") ? 1 : 0,
      cameraLightCount: state.camera?.findComponents("light").length || 0,
      roadTiling: state.roadEntity?.render?.material?.diffuseMapTiling
        ? [
            state.roadEntity.render.material.diffuseMapTiling.x,
            state.roadEntity.render.material.diffuseMapTiling.y,
          ]
        : null,
      fireLightIntensities: state.fireLights
        .filter((light) => Boolean(light?.light))
        .map((light) => light.light.intensity),
      enabledFireLights: state.fireLights.filter(
        (light) => light?.light && light.enabled,
      ).length,
      enabledRouteLights: state.routeLights.filter(
        (light) => light?.light && light.enabled,
      ).length,
      enabledEnvironmentEntities: state.environmentEntities.filter(
        (entity) => entity.enabled,
      ).length,
      architectureShadowCasters: state.environmentEntities.filter(
        (entity) => entity.dwarkaArchitectureShadowCaster,
      ).length,
      revampEntities: state.environmentEntities
        .filter((entity) => entity.name.startsWith("RevampHouse"))
        .map((entity) => {
          const instances = entity
            .findComponents("render")
            .flatMap((render) => render.meshInstances || []);
          const position = entity.getPosition();
          const bounds = instances.reduce(
            (result, instance) => {
              const minimum = instance.aabb.getMin();
              const maximum = instance.aabb.getMax();
              for (const axis of ["x", "y", "z"]) {
                result.minimum[axis] = Math.min(result.minimum[axis], minimum[axis]);
                result.maximum[axis] = Math.max(result.maximum[axis], maximum[axis]);
              }
              return result;
            },
            {
              minimum: { x: Infinity, y: Infinity, z: Infinity },
              maximum: { x: -Infinity, y: -Infinity, z: -Infinity },
            },
          );
          return {
            name: entity.name,
            enabled: entity.enabled,
            position: [position.x, position.y, position.z],
            bounds: [
              [bounds.minimum.x, bounds.minimum.y, bounds.minimum.z],
              [bounds.maximum.x, bounds.maximum.y, bounds.maximum.z],
            ],
            materials: instances.map((instance) => ({
              name: instance.material?.name,
              diffuse: instance.material?.diffuse
                ? [
                    instance.material.diffuse.r,
                    instance.material.diffuse.g,
                    instance.material.diffuse.b,
                  ]
                : null,
              emissive: instance.material?.emissive
                ? [
                    instance.material.emissive.r,
                    instance.material.emissive.g,
                    instance.material.emissive.b,
                  ]
                : null,
            })),
          };
        }),
      drawCalls: state.app.stats?.drawCalls?.total ?? null,
      shadowDrawCalls: state.app.stats?.drawCalls?.shadow ?? null,
      moonShadowMapAllocated: Boolean(
        state.app.root.findByName("Moonlight")?.light?._light?._shadowMap,
      ),
      moonShadowRenderViews:
        state.app.root.findByName("Moonlight")?.light?._light?._renderData
          ?.length ?? 0,
      drawCallStats: state.app.stats?.drawCalls
        ? { ...state.app.stats.drawCalls }
        : null,
      batchCount: state.app.batcher?._batchList?.length ?? null,
      pools: {
        projectiles: rt.projectilePoolStats?.() || null,
        impacts: rt.impactPoolStats?.() || null,
        enemies: rt.enemyPoolStats?.() || null,
        families: rt.familyPoolStats?.() || null,
      },
      triangles: state.app.stats?.frame?.triangles ?? null,
      renderScale: state.renderScale,
      canvas: [state.app.graphicsDevice.width, state.app.graphicsDevice.height],
      iblReady: Boolean(state.app.scene.skybox && state.app.scene.envAtlas),
      post: state.cameraFrame
        ? {
            toneMapping: state.cameraFrame.rendering.toneMapping,
            samples: state.cameraFrame.rendering.samples,
            taa: state.cameraFrame.taa.enabled,
            bloom: state.cameraFrame.bloom.intensity,
            bloomBlurLevel: state.cameraFrame.bloom.blurLevel,
            ssao: state.cameraFrame.ssao.type,
            ssaoScale: state.cameraFrame.ssao.scale,
            vignette: state.cameraFrame.vignette.intensity,
          }
        : null,
    }),
    architectureSummary: () => ({
      boxHouseCount: state.app.root.find((entity) =>
        /terrace house|parapet roof|lane tower|palace plinth/.test(entity.name),
      ).length,
      wallModules: state.environmentEntities.filter((entity) =>
        entity.name.startsWith("Wall_Plaster_"),
      ).length,
      flatRoofModules: state.environmentEntities.filter(
        (entity) => entity.name === "Kenney_roof_flat_square",
      ).length,
      authoredAwningPosts: state.environmentEntities.filter(
        (entity) => entity.name === "Kenney_pillar_wood",
      ).length,
      authoredTurnColumns: state.environmentEntities.filter(
        (entity) => entity.name === "Kenney_column",
      ).length,
      nonUnitArchitecture: state.environmentEntities
        .filter(
          (entity) =>
            [
              "Wall_Plaster_Door_Flat",
              "Wall_Plaster_Straight",
              "Wall_Plaster_Window_Wide_Round",
              "Kenney_roof_flat_square",
              "Kenney_pillar_wood",
              "Kenney_column",
              "Prop_ExteriorBorder_Straight1",
            ].includes(entity.name) &&
            Math.abs(entity.getLocalScale().x - 1) > 0.001,
        )
        .map((entity) => entity.name),
      scaleReferenceCount: state.qaScaleReferences.length,
      upperModuleHeights: state.environmentEntities
        .filter(
          (entity) =>
            entity.getPosition().y >= 5.9 &&
            [
              "Wall_Plaster_Door_Flat",
              "Wall_Plaster_Straight",
              "Wall_Plaster_Window_Wide_Round",
              "Door_4_Flat",
              "Wall_Arch",
            ].includes(entity.name),
        )
        .map((entity) => {
          const instances = entity
            .findComponents("render")
            .flatMap((render) => render.meshInstances || []);
          if (!instances.length) return { name: entity.name, height: null };
          const minimum = Math.min(
            ...instances.map(
              (instance) =>
                instance.aabb.center.y - instance.aabb.halfExtents.y,
            ),
          );
          const maximum = Math.max(
            ...instances.map(
              (instance) =>
                instance.aabb.center.y + instance.aabb.halfExtents.y,
            ),
          );
          return {
            name: entity.name,
            height: Number((maximum - minimum).toFixed(3)),
          };
        }),
    }),
    environmentFxSummary: () => ({
      fireEmitters: state.fireEffects.filter(
        (root) => root.dwarkaFlameEmitter?.particlesystem,
      ).length,
      smokeEmitters: state.fireEffects.filter(
        (root) => root.dwarkaSmokeEmitter?.particlesystem,
      ).length,
      cachedFireRoots: state.fireEffects.length,
      cachedFireLights: state.fireLights.length,
      taggedSceneQueriesInUpdate: false,
      texturedPennants: state.app.root.find(
        (entity) => entity.name === "Triangular festival pennant",
      ).length,
      roadSlabs: state.app.root.find(
        (entity) => entity.name === "Packed earth street slab",
      ).length,
      roadDecals: state.app.root.find((entity) => /decal$/.test(entity.name))
        .length,
      batchedModelRenders: state.batchedModelRenders,
    }),
    feelSummary: () => {
      const anim = state.playerEntity?.dwarkaVisual?.anim;
      const upperBody = anim?.findAnimationLayer("Upper body aim");
      return {
        locomotionBlendState: anim?.baseLayer?.activeState || null,
        locomotionSpeed: state.localSimulation
          ? Math.hypot(state.predictedVelocity.x, state.predictedVelocity.z)
          : Math.hypot(state.snapshotVelocity.x, state.snapshotVelocity.z),
        upperBodyAimState: upperBody?.activeState || null,
        upperBodyAimWeight: upperBody?.weight ?? 0,
        dodgePlaybackSpeed: CHARACTER_ANIMATION_SPEEDS.dodge,
        cameraSpringReady: Boolean(state.cameraSpring),
        hitStopActive: performance.now() < state.hitStopUntil,
        enemyYawSmoothing: true,
        assetRevision: chapterAssetRevision,
      };
    },
    authoritySummary: () => ({
      localMode: state.localMode,
      sessionAccepted: state.sessionAccepted,
      confirmedPhase: state.confirmedPhase,
      renderedPhase: state.snapshot?.phase || null,
      predictorPhase: state.localSimulation?.phase || null,
      predictorMovementOnly: state.localSimulation?.movementOnly ?? null,
      predictorOutcomeEvents: state.localSimulation?.events?.length ?? 0,
      reconnectAttempts: state.reconnectAttempts,
      reconnectScheduled: Boolean(state.reconnectTimer),
      socketState: state.socket?.readyState ?? null,
    }),
    routeRuntimeSummary: () => {
      const player = state.predictedPlayer || state.snapshot?.player;
      const floorY = player ? floorHeightAt(player.x, player.z) : null;
      return {
        phase: state.snapshot?.phase || null,
        player: player
          ? {
              x: Number(player.x.toFixed(3)),
              y: Number(player.y.toFixed(3)),
              z: Number(player.z.toFixed(3)),
            }
          : null,
        floorY,
        floorError:
          player && Number.isFinite(floorY)
            ? Number(Math.abs(player.y - floorY).toFixed(4))
            : null,
        cameraDistance: state.cameraDistance,
        objective: ui.objective?.textContent || "",
        objectiveDetail: ui.detail?.textContent || "",
        objectiveVisible: !ui.hud?.hidden,
        interactionVisible: !ui.interaction?.hidden,
        encounterActors: state.snapshot?.enemies?.length || 0,
        familyActive: Boolean(state.snapshot?.family?.active),
        doorProgress: [...state.doorEntities].map(([id, record]) => ({
          id,
          progress: Number(record.progress.toFixed(3)),
        })),
      };
    },
    disconnectForQa: () => {
      if (!qaSessionAllowed() || state.socket?.readyState !== WebSocket.OPEN)
        return false;
      state.socket.close(4010, "QA reconnect check");
      return true;
    },
    setDressingSummary: () => ({
      tallHouseBays: TALL_HOUSE_BAYS.length,
      setbackHouseBays: SETBACK_HOUSE_BAYS.length,
      lTurnColliders: WORLD_COLLIDERS.filter(([, , , , label]) =>
        /L-turn/.test(label),
      ).length,
      groundClutter: state.environmentEntities.filter((entity) =>
        [
          "brass_vase_02",
          "brass_vase_03",
          "planter_pot_clay",
          "wicker_basket_01",
          "Bag",
          "FarmCrate_Empty",
          "Vase_4",
        ].includes(entity.name),
      ).length,
      diyas: state.environmentEntities.filter(
        (entity) => entity.name === "brass_diya_lantern",
      ).length,
      wellParts: state.environmentEntities.filter((entity) =>
        [
          "Kenney_fountain_round",
          "Kenney_fountain_center",
          "Bucket_Wooden_1",
          "Rope_1",
        ].includes(entity.name),
      ).length,
      rathParts: state.environmentEntities.filter(
        (entity) =>
          ["Kenney_cart", "Kenney_wheel", "Prop_Support"].includes(
            entity.name,
          ) && entity.getPosition().z < -28,
      ).length,
      moonPrimitives: state.app.root.find((entity) =>
        /^(Moon disc|Night star)/.test(entity.name),
      ).length,
      shrineNiches: state.app.root.find(
        (entity) => entity.name === "Household shrine niche",
      ).length,
      palaceLandmarks: state.app.root.find(
        (entity) =>
          /^Distant palace/.test(entity.name) ||
          /^Central shrine/.test(entity.name),
      ).length,
    }),
    focusCharacter: (name = null, distance = 1.45, angle = 0) => {
      state.qaFocusName = name;
      state.qaFocusDistance = Math.max(
        1.2,
        Math.min(6, Number(distance) || 1.45),
      );
      state.qaFocusAngle = Math.max(-180, Math.min(180, Number(angle) || 0));
      if (state.camera?.camera) state.camera.camera.fov = name ? 42 : 63;
      return Boolean(!name || state.app?.root.findByName(name));
    },
    previewAnimation: (name, animation = null) => {
      if (animation && !CHARACTER_ANIMATIONS[animation]) return false;
      if (animation) state.qaAnimationPreviews.set(name, animation);
      else state.qaAnimationPreviews.delete(name);
      const root = state.app?.root.findByName(name);
      if (root && animation) rt.setCharacterAnimation(root, animation);
      return Boolean(root);
    },
    beginPlay: () => {
      if (!qaSessionAllowed()) return false;
      state.qaPreviewActive = false;
      rt.enterPlay();
      return true;
    },
    setAim: (value) => {
      if (!qaSessionAllowed()) return false;
      state.qaAimPreview = Boolean(value);
      state.aim = Boolean(value);
      return state.aim;
    },
    setView: (yaw, pitch = state.pitch) => {
      if (
        !qaSessionAllowed() ||
        !Number.isFinite(Number(yaw)) ||
        !Number.isFinite(Number(pitch))
      )
        return false;
      state.yaw = state.lookYaw = Number(yaw);
      state.pitch = state.lookPitch = Math.max(
        -0.58,
        Math.min(0.42, Number(pitch)),
      );
      return true;
    },
  });
}
