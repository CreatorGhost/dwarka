import React from "react";
import { createRoot, type Root } from "react-dom/client";
import "../../../app/globals.css";
import ChapterZeroCinematic from "../../../app/ChapterZeroCinematic";
// @ts-expect-error The fixture plugin resolves this pinned-source query at runtime.
import ChapterZeroBaseline from "../../../app/ChapterZeroCinematic?baseline=site";
// @ts-expect-error The fixture plugin resolves this negative-control query at runtime.
import ChapterZeroPriorSkip from "../../../app/ChapterZeroCinematic?negative=prior-skip";
// @ts-expect-error The fixture plugin resolves this negative-control query at runtime.
import ChapterZeroWithoutClockPause from "../../../app/ChapterZeroCinematic?negative=clock-pause";
import ChapterGameClient from "../../../app/game/chapter-1/ChapterGameClient";
// @ts-expect-error The fixture plugin resolves this pinned-source query at runtime.
import ChapterGameBaseline from "../../../app/game/chapter-1/ChapterGameClient?baseline=site";
// @ts-expect-error The fixture plugin resolves this negative-control query at runtime.
import ChapterGameWithoutTrust from "../../../app/game/chapter-1/ChapterGameClient?negative=trust";
// @ts-expect-error The fixture plugin resolves this negative-control query at runtime.
import ChapterGameWithoutReadyCancel from "../../../app/game/chapter-1/ChapterGameClient?negative=ready-cancel";

declare global {
  interface Window {
    __frontendLifecycle: Record<string, (...args: never[]) => unknown>;
  }
}

const nativeSetTimeout = window.setTimeout.bind(window);
const nativeClearTimeout = window.clearTimeout.bind(window);
const watchdogHandles = new Set<number>();
window.setTimeout = ((callback: TimerHandler, delay?: number, ...args: unknown[]) => {
  let handle = 0;
  const wrapped = (...callbackArgs: unknown[]) => {
    watchdogHandles.delete(handle);
    if (typeof callback === "function") callback(...callbackArgs);
  };
  handle = nativeSetTimeout(wrapped, delay, ...args);
  if (delay === 80) watchdogHandles.add(handle);
  return handle;
}) as typeof window.setTimeout;
window.clearTimeout = ((handle?: number) => {
  if (typeof handle === "number") watchdogHandles.delete(handle);
  nativeClearTimeout(handle);
}) as typeof window.clearTimeout;

const messageListeners = new Set<EventListenerOrEventListenerObject>();
const nativeAddEventListener = window.addEventListener.bind(window);
const nativeRemoveEventListener = window.removeEventListener.bind(window);
window.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
  if (type === "message") messageListeners.add(listener);
  nativeAddEventListener(type, listener, options);
}) as typeof window.addEventListener;
window.removeEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) => {
  if (type === "message") messageListeners.delete(listener);
  nativeRemoveEventListener(type, listener, options);
}) as typeof window.removeEventListener;

const audioCounts = { play: 0, pause: 0, load: 0 };
class FixtureAudio extends EventTarget {
  currentTime = 0;
  duration = Number.NaN;
  loop = false;
  preload = "";
  src = "";
  volume = 1;
  constructor(source = "") {
    super();
    this.src = source;
  }
  play() {
    audioCounts.play += 1;
    return Promise.resolve();
  }
  pause() {
    audioCounts.pause += 1;
  }
  load() {
    audioCounts.load += 1;
  }
  canPlayType() {
    return "";
  }
}
window.Audio = FixtureAudio as unknown as typeof Audio;
window.Image = class FixtureImage { src = ""; } as unknown as typeof Image;
const nativeFetch = window.fetch.bind(window);
window.fetch = (async (input: RequestInfo | URL) => {
  if (String(input).includes("voice-manifest.json"))
    return new Response(JSON.stringify({ entries: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  return nativeFetch(input);
}) as typeof fetch;

let fixtureHidden = false;
Object.defineProperty(document, "hidden", {
  configurable: true,
  get: () => fixtureHidden,
});

const wait = (duration: number) => new Promise<void>((resolve) => nativeSetTimeout(resolve, duration));
const settle = async (duration = 24) => {
  await wait(duration);
  await Promise.resolve();
};

let root: Root | null = null;
const container = document.getElementById("root")!;
async function unmount() {
  root?.unmount();
  root = null;
  container.replaceChildren();
  fixtureHidden = false;
  await settle();
}
async function mount(element: React.ReactNode) {
  await unmount();
  root = createRoot(container);
  root.render(element);
  await settle();
}

const chapterCopy = {
  chapter0: {
    label: "Chapter zero",
    attribution: "Test account",
    voiceUnavailable: "Voice unavailable",
    captionsOn: "Captions on",
    captionsOff: "Captions off",
    mute: "Mute",
    unmute: "Unmute",
    skip: "Skip scene",
    skipLabel: "Skip",
    skipTitle: "Skip this scene?",
    skipBody: "Continue to the game.",
    cancel: "Cancel",
    skipConfirm: "Confirm skip",
    panels: [{ title: "Panel", text: "Panel text" }],
  },
};
const settings = {
  locale: "en",
  voiceLocale: "en",
  voiceLinked: true,
  languageChosen: true,
  master: 1,
  music: 0.7,
  effects: 0.8,
  dialogue: 1,
  muteAll: false,
  captions: true,
  speakerNames: true,
  cameraShake: true,
  tutorials: true,
  tutorialDone: [],
};
const profile = {
  schemaVersion: 1 as const,
  anonymousPlayerId: "fixture-player",
  storyIntroComplete: false,
  progressToken: null,
  progressSummary: null,
  settings,
};

const cinematicComponents = {
  normal: ChapterZeroCinematic,
  baseline: ChapterZeroBaseline,
  "prior-skip": ChapterZeroPriorSkip,
  "clock-pause": ChapterZeroWithoutClockPause,
};
const gameComponents = {
  normal: ChapterGameClient,
  baseline: ChapterGameBaseline,
  trust: ChapterGameWithoutTrust,
  "ready-cancel": ChapterGameWithoutReadyCancel,
};

function mode() {
  const node = document.querySelector(".chapter-zero-cinematic");
  return [...(node?.classList ?? [])].find((name) => name.startsWith("mode-"))?.slice(5) ?? "missing";
}
function button(text: string) {
  return [...document.querySelectorAll<HTMLButtonElement>("button")].find((item) => item.textContent?.trim() === text);
}
async function mountCinematic(variant: keyof typeof cinematicComponents = "normal") {
  const Component = cinematicComponents[variant];
  await mount(
    <Component
      copy={chapterCopy as never}
      locale="en"
      profile={profile}
      chapterTitle="Fixture chapter"
      onSaveSetting={() => undefined}
      onComplete={() => undefined}
    />,
  );
}

async function skipScenario(variant: keyof typeof cinematicComponents = "normal") {
  await mountCinematic(variant);
  button("Skip scene")?.click();
  await settle(12);
  await settle(95);
  const heldWhileConfirming = mode() === "source";
  button("Cancel")?.click();
  await settle();
  const consumedAfterCancel = mode() === "panels";
  await unmount();
  return { heldWhileConfirming, consumedAfterCancel };
}

async function blurScenario(variant: keyof typeof cinematicComponents = "normal") {
  await mountCinematic(variant);
  const playsBefore = audioCounts.play;
  const pausesBefore = audioCounts.pause;
  await settle(20);
  window.dispatchEvent(new Event("blur"));
  await settle(95);
  const heldWhileBlurred = mode() === "source";
  const audioPaused = audioCounts.pause > pausesBefore;
  window.dispatchEvent(new Event("focus"));
  await settle(80);
  const resumed = mode() === "panels";
  const audioResumed = audioCounts.play > playsBefore;
  await unmount();
  return { heldWhileBlurred, audioPaused, resumed, audioResumed };
}

async function visibilityScenario() {
  await mountCinematic("normal");
  fixtureHidden = true;
  document.dispatchEvent(new Event("visibilitychange"));
  await settle(95);
  const heldWhileHidden = mode() === "source";
  fixtureHidden = false;
  document.dispatchEvent(new Event("visibilitychange"));
  await settle(90);
  const resumed = mode() === "panels";
  await unmount();
  return { heldWhileHidden, resumed };
}

async function frameAndTitleScenario() {
  await mountCinematic("normal");
  button("Open the account")?.click();
  await settle(14);
  window.dispatchEvent(new Event("blur"));
  await settle(65);
  const frameWhileBlurred = document.querySelector(".cinematic-frames .is-live")?.getAttribute("data-src");
  window.dispatchEvent(new Event("focus"));
  await settle(55);
  const frameAfterFocus = document.querySelector(".cinematic-frames .is-live")?.getAttribute("data-src");
  await settle(110);
  const reachedTitle = mode() === "title";
  window.dispatchEvent(new Event("blur"));
  await settle(125);
  const titleHeld = mode() === "title";
  window.dispatchEvent(new Event("focus"));
  await settle(180);
  const titleResumed = mode() === "leaving";
  await unmount();
  return { frameWhileBlurred, frameAfterFocus, reachedTitle, titleHeld, titleResumed };
}

async function mountGame(variant: keyof typeof gameComponents = "normal") {
  const Component = gameComponents[variant];
  await mount(<Component websocketUrl={null} />);
}
function frame() {
  return document.querySelector<HTMLIFrameElement>("#game-frame")!;
}
function notice() {
  return document.querySelector("[role=status], [role=alert]")?.textContent?.trim() ?? "";
}
function sendFrameMessage(type: string, trustedSource = true, trustedOrigin = true) {
  const gameFrame = frame();
  window.dispatchEvent(new MessageEvent("message", {
    data: { type },
    origin: trustedOrigin ? window.location.origin : "https://attacker.example",
    source: trustedSource ? gameFrame.contentWindow : window,
  }));
}

async function trustScenario(variant: keyof typeof gameComponents = "normal") {
  await mountGame(variant);
  sendFrameMessage("dwarka:ready", false, true);
  await settle();
  const rejectedWrongSource = notice().includes("Preparing");
  sendFrameMessage("dwarka:ready", true, false);
  await settle();
  const rejectedWrongOrigin = notice().includes("Preparing");
  sendFrameMessage("dwarka:ready", true, true);
  await settle();
  const acceptedTrusted = !notice().includes("Preparing") && watchdogHandles.size === 0;
  await unmount();
  return { rejectedWrongSource, rejectedWrongOrigin, acceptedTrusted, listeners: messageListeners.size, timers: watchdogHandles.size };
}

async function readyCancelScenario(variant: keyof typeof gameComponents = "normal") {
  await mountGame(variant);
  sendFrameMessage("dwarka:ready", true, true);
  await settle(105);
  const stayedReady = !notice().includes("did not finish loading");
  await unmount();
  return { stayedReady };
}

async function retryAndUnmountScenario() {
  await mountGame("normal");
  await settle(95);
  const timedOut = notice().includes("did not finish loading");
  button("Retry chapter")?.click();
  await settle();
  const retryArmed = notice().includes("Preparing") && watchdogHandles.size === 1;
  const retryAttempt = new URL(frame().src).searchParams.get("shellAttempt");
  sendFrameMessage("dwarka:load-error", true, true);
  await settle();
  sendFrameMessage("dwarka:retrying", true, true);
  await settle();
  const childRetryArmed = notice().includes("Preparing") && watchdogHandles.size === 1;
  const listenersBeforeUnmount = messageListeners.size;
  await unmount();
  return {
    timedOut,
    retryArmed,
    retryAttempt,
    childRetryArmed,
    listenersBeforeUnmount,
    listenersAfterUnmount: messageListeners.size,
    timersAfterUnmount: watchdogHandles.size,
  };
}

function evidenceLabel(title: string, detail: string) {
  const label = document.getElementById("evidence-label")!;
  label.hidden = false;
  label.textContent = `${title}\n${detail}`;
}

async function prepareSkipEvidence(variant: keyof typeof cinematicComponents) {
  await mountCinematic(variant);
  button("Skip scene")?.click();
  await settle(12);
  await settle(95);
  button("Cancel")?.click();
  await settle();
  const result = { modeAfterCancel: mode() };
  evidenceLabel(
    variant === "baseline" ? "RECONSTRUCTED BASELINE · SKIP DEADLINE" : "REPAIRED · SKIP DEADLINE",
    `same input: open skip, wait past deadline, cancel\nmode after cancel: ${result.modeAfterCancel}`,
  );
  return result;
}

async function prepareBlurEvidence(variant: keyof typeof cinematicComponents) {
  await mountCinematic(variant);
  button("Open the account")?.click();
  await settle(14);
  window.dispatchEvent(new Event("blur"));
  await settle(65);
  window.dispatchEvent(new Event("focus"));
  await settle(55);
  const result = {
    activeFrame: document.querySelector(".cinematic-frames .is-live")?.getAttribute("data-src") ?? "none",
  };
  evidenceLabel(
    variant === "baseline" ? "RECONSTRUCTED BASELINE · BLUR/RESUME" : "REPAIRED · BLUR/RESUME",
    `same input: enter panel, blur before frame 2, focus\nactive frame: ${result.activeFrame}`,
  );
  return result;
}

async function prepareIframeEvidence(variant: keyof typeof gameComponents) {
  await mountGame(variant);
  await settle(105);
  const result = {
    notice: notice() || "none",
    retryVisible: Boolean(button("Retry chapter")),
    homeVisible: Boolean(button("Return home")),
  };
  evidenceLabel(
    variant === "baseline" ? "RECONSTRUCTED BASELINE · SILENT IFRAME" : "REPAIRED · SILENT IFRAME",
    `same input: inert same-origin iframe, wait past fixture deadline\nretry: ${result.retryVisible} · home: ${result.homeVisible}`,
  );
  return result;
}

async function showDiagnostic(title: string, rows: { label: string; value: string; pass: boolean }[]) {
  await unmount();
  const label = document.getElementById("evidence-label")!;
  label.hidden = true;
  container.innerHTML = `<main class="diagnostic"><p>LABELLED DIAGNOSTIC CAPTURE · NOT GAMEPLAY</p><h1></h1><table><thead><tr><th>Probe</th><th>Observed result</th></tr></thead><tbody></tbody></table></main>`;
  container.querySelector("h1")!.textContent = title;
  const body = container.querySelector("tbody")!;
  for (const row of rows) {
    const tr = document.createElement("tr");
    const name = document.createElement("th");
    const value = document.createElement("td");
    name.textContent = row.label;
    value.textContent = row.value;
    value.className = row.pass ? "pass" : "fail";
    tr.append(name, value);
    body.append(tr);
  }
  await settle();
}

window.__frontendLifecycle = {
  skipScenario: skipScenario as never,
  blurScenario: blurScenario as never,
  visibilityScenario: visibilityScenario as never,
  frameAndTitleScenario: frameAndTitleScenario as never,
  trustScenario: trustScenario as never,
  readyCancelScenario: readyCancelScenario as never,
  retryAndUnmountScenario: retryAndUnmountScenario as never,
  prepareSkipEvidence: prepareSkipEvidence as never,
  prepareBlurEvidence: prepareBlurEvidence as never,
  prepareIframeEvidence: prepareIframeEvidence as never,
  showDiagnostic: showDiagnostic as never,
};
