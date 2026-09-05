/* DWARKA Chapter 1 — inspectable PlayCanvas runtime source. */
import { ChapterSimulation, CHAPTER_CONFIG } from "./sim/shared.ts";
import { safeWebSocketEndpoint } from "./net/session.js";
import { angleDifference, targetLineBlocked } from "./combat/targeting.js";
import { assetUrl, chapterAssetRevision } from "./scene/assets.js";
import { PHASE_DETAILS, UI_MESSAGES } from "./ui/content.js";
import {
  CHARACTER_ANIMATIONS,
  animationSpeeds,
  characterStateGraph,
} from "./character/animation.js";
import { createRuntime, loadWorld } from "./runtime/context.js";
import { installHud } from "./ui/hud.js";
import { installScreenshot } from "./ui/screenshot.js";
import { installModals } from "./ui/modals.js";
import { installSession } from "./net/session.js";
import { installHandshake } from "./net/handshake.js";
import { installMaterials } from "./scene/materials.js";
import { installEquipment } from "./character/equipment.js";
import { installAnimation } from "./character/animation.js";
import { installTargeting } from "./combat/targeting.js";
import { installEffects } from "./combat/effects.js";
import { installDressing } from "./scene/dressing.js";
import { installDoors } from "./scene/doors.js";
import { installBuild } from "./scene/build.js";
import { installLoop } from "./runtime/loop.js";
import { installInput } from "./runtime/input.js";
import { installQa } from "./runtime/qa.js";

// FATAL_BOOTSTRAP_HELPER_START
export function reportFatalBootstrap(
  error,
  {
    documentObject = document,
    windowObject = window,
    consoleObject = console,
  } = {},
) {
  consoleObject.error("DWARKA Chapter 1 failed to start", error);
  const notifyParent = (message) => {
    if (windowObject.parent === windowObject) return false;
    try {
      windowObject.parent.postMessage(message, windowObject.location.origin);
      return true;
    } catch {
      return false;
    }
  };
  const modal = documentObject.getElementById("modal");
  const title = documentObject.getElementById("modal-title");
  const copy = documentObject.getElementById("modal-copy");
  const primary = documentObject.getElementById("modal-primary");
  const secondary = documentObject.getElementById("modal-secondary");

  if (modal) {
    modal.hidden = false;
    modal.classList.remove("story");
    modal.setAttribute("aria-describedby", "modal-copy");
  }
  if (title) title.textContent = "Chapter could not start";
  if (copy)
    copy.textContent = "The game engine did not finish loading. Retry, or return home.";
  if (primary) {
    primary.textContent = "Retry chapter";
    primary.disabled = false;
    primary.onclick = () => {
      notifyParent({ type: "dwarka:retrying" });
      windowObject.location.reload();
    };
  }
  if (secondary) {
    secondary.textContent = "Return home";
    secondary.hidden = false;
    secondary.onclick = () => {
      if (!notifyParent({ type: "dwarka:return-home" }))
        windowObject.location.assign("/");
    };
  }

  notifyParent({ type: "dwarka:load-error", reason: "bootstrap" });
}
// FATAL_BOOTSTRAP_HELPER_END

async function startChapter() {
  "use strict";
  const rt = createRuntime();
  await loadWorld(rt);
  installHud(rt);
  installModals(rt);
  installSession(rt);
  installHandshake(rt);
  installMaterials(rt);
  installEquipment(rt);
  installAnimation(rt);
  installTargeting(rt);
  installEffects(rt);
  installDressing(rt);
  installDoors(rt);
  installBuild(rt);
  installLoop(rt);
  installScreenshot(rt);
  installInput(rt);
  installQa(rt);
  rt.bindHudEvents();
  rt.bindModalEvents();
  rt.bindParentMessages();
  rt.bindInputEvents();
  rt.buildScene();
  rt.loadVoiceManifest();
  rt.showLoading();
  rt.syncSettingsUI();
  if (window.parent === window) rt.connect();
  else {
    rt.startEmbeddedHandshake();
  }
  void ChapterSimulation;
  void CHAPTER_CONFIG;
  void safeWebSocketEndpoint;
  void angleDifference;
  void targetLineBlocked;
  void assetUrl;
  void chapterAssetRevision;
  void PHASE_DETAILS;
  void UI_MESSAGES;
  void CHARACTER_ANIMATIONS;
  void animationSpeeds;
  void characterStateGraph;
}

void startChapter().catch(reportFatalBootstrap);
