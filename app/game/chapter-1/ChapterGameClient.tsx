"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "./localization";
import { postProfileResume } from "./profile-bridge";
import {
  CHANNEL_NAME,
  isProfileStorageDurable,
  mergeServerProgress,
  readProfile,
  saveProfile,
  updateSettings,
  type ChapterProfile,
  type ProgressSummary,
} from "./progress";
import styles from "./page.module.css";

const FRAME_READY_TIMEOUT_MS = 30_000;

// GAME_FRAME_HELPERS_START
type GameFrameWatchdogClock = {
  setTimeout: (callback: () => void, delay: number) => unknown;
  clearTimeout: (handle: unknown) => void;
};

export function isTrustedGameFrameMessage(
  event: Pick<MessageEvent, "origin" | "source">,
  frameWindow: Window | null | undefined,
  expectedOrigin: string,
) {
  return Boolean(frameWindow && event.source === frameWindow && event.origin === expectedOrigin);
}

export function createGameFrameWatchdog({
  clock = {
    setTimeout: (callback: () => void, delay: number) => globalThis.setTimeout(callback, delay),
    clearTimeout: (handle: unknown) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
  },
  delay,
  onTimeout,
}: {
  clock?: GameFrameWatchdogClock;
  delay: number;
  onTimeout: () => void;
}) {
  let handle: unknown = null;
  const cancel = () => {
    if (handle !== null) clock.clearTimeout(handle);
    handle = null;
  };
  return {
    arm() {
      cancel();
      handle = clock.setTimeout(() => {
        handle = null;
        onTimeout();
      }, delay);
    },
    ready: cancel,
    cancel,
  };
}
// GAME_FRAME_HELPERS_END

const shellCopy: Record<
  Locale,
  {
    skip: string;
    dismiss: string;
    frame: string;
    noScript: string;
    invalid: string;
    replay: string;
    loading: string;
    loadError: string;
    retry: string;
    home: string;
    sessionOnly: string;
  }
> = {
  en: {
    skip: "Skip to game",
    dismiss: "Dismiss message",
    frame: "DWARKA Chapter 1 playable game",
    noScript: "JavaScript is required to play Chapter 1.",
    invalid:
      "Saved progress could not be verified. Settings were kept; Chapter 1 restarted safely.",
    replay: "Replay started. Your completed-chapter record is preserved.",
    loading: "Preparing Chapter 1…",
    loadError: "Chapter 1 did not finish loading.",
    retry: "Retry chapter",
    home: "Return home",
    sessionOnly: "This browser blocked storage. Your choices will last only while this tab stays open.",
  },
  hi: {
    skip: "सीधे खेल पर जाएँ",
    dismiss: "संदेश बंद करें",
    frame: "DWARKA अध्याय 1 खेलने योग्य खेल",
    noScript: "अध्याय 1 खेलने के लिए JavaScript आवश्यक है।",
    invalid:
      "सहेजी गई प्रगति सत्यापित नहीं हुई। सेटिंग्स रखी गईं और अध्याय 1 सुरक्षित रूप से फिर शुरू हुआ।",
    replay: "पुनः खेल शुरू हुआ। अध्याय पूरा होने का रिकॉर्ड सुरक्षित है।",
    loading: "अध्याय 1 तैयार हो रहा है…",
    loadError: "अध्याय 1 लोड नहीं हो सका।",
    retry: "अध्याय फिर आज़माएँ",
    home: "मुखपृष्ठ पर लौटें",
    sessionOnly: "ब्राउज़र ने स्टोरेज रोक दिया है। आपकी पसंद केवल इस टैब के खुले रहने तक रहेगी।",
  },
  ta: {
    skip: "நேராக விளையாட்டுக்குச் செல்க",
    dismiss: "செய்தியை மூடு",
    frame: "DWARKA அத்தியாயம் 1 விளையாட்டு",
    noScript: "அத்தியாயம் 1 விளையாட JavaScript தேவை.",
    invalid:
      "சேமித்த முன்னேற்றத்தைச் சரிபார்க்க முடியவில்லை. அமைப்புகள் பாதுகாக்கப்பட்டு அத்தியாயம் 1 பாதுகாப்பாக மீண்டும் தொடங்கியது.",
    replay: "மறுவிளையாட்டு தொடங்கியது. அத்தியாய நிறைவு பதிவு பாதுகாக்கப்பட்டுள்ளது.",
    loading: "அத்தியாயம் 1 தயாராகிறது…",
    loadError: "அத்தியாயம் 1 ஏற்றப்படவில்லை.",
    retry: "மீண்டும் முயல்க",
    home: "முகப்புக்குத் திரும்புக",
    sessionOnly: "உலாவி சேமிப்பைத் தடுத்தது. இந்தத் தாவல் திறந்திருக்கும் வரை மட்டுமே உங்கள் தேர்வுகள் இருக்கும்.",
  },
  kn: {
    skip: "ನೇರವಾಗಿ ಆಟಕ್ಕೆ ಹೋಗಿ",
    dismiss: "ಸಂದೇಶ ಮುಚ್ಚಿ",
    frame: "DWARKA ಅಧ್ಯಾಯ 1 ಆಡಬಹುದಾದ ಆಟ",
    noScript: "ಅಧ್ಯಾಯ 1 ಆಡಲು JavaScript ಅಗತ್ಯ.",
    invalid:
      "ಉಳಿಸಿದ ಪ್ರಗತಿಯನ್ನು ಪರಿಶೀಲಿಸಲಾಗಲಿಲ್ಲ. ಸೆಟ್ಟಿಂಗ್‌ಗಳನ್ನು ಉಳಿಸಿ ಅಧ್ಯಾಯ 1 ಅನ್ನು ಸುರಕ್ಷಿತವಾಗಿ ಮರುಪ್ರಾರಂಭಿಸಲಾಗಿದೆ.",
    replay: "ಮರುಆಟ ಆರಂಭವಾಗಿದೆ. ಅಧ್ಯಾಯ ಪೂರ್ಣಗೊಂಡ ದಾಖಲೆಯನ್ನು ಉಳಿಸಲಾಗಿದೆ.",
    loading: "ಅಧ್ಯಾಯ 1 ಸಿದ್ಧವಾಗುತ್ತಿದೆ…",
    loadError: "ಅಧ್ಯಾಯ 1 ಲೋಡ್ ಆಗಲಿಲ್ಲ.",
    retry: "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ",
    home: "ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ",
    sessionOnly: "ಬ್ರೌಸರ್ ಸಂಗ್ರಹಣೆಯನ್ನು ತಡೆದಿದೆ. ಈ ಟ್ಯಾಬ್ ತೆರೆದಿರುವವರೆಗೆ ಮಾತ್ರ ನಿಮ್ಮ ಆಯ್ಕೆಗಳು ಇರುತ್ತವೆ.",
  },
  te: {
    skip: "నేరుగా ఆటకు వెళ్లండి",
    dismiss: "సందేశాన్ని మూసివేయండి",
    frame: "DWARKA అధ్యాయం 1 ఆడగలిగే ఆట",
    noScript: "అధ్యాయం 1 ఆడటానికి JavaScript అవసరం.",
    invalid:
      "సేవ్ చేసిన పురోగతిని నిర్ధారించలేకపోయాం. సెట్టింగ్‌లు అలాగే ఉంచి అధ్యాయం 1ను సురక్షితంగా మళ్లీ ప్రారంభించాం.",
    replay: "మళ్లీ ఆట ప్రారంభమైంది. అధ్యాయం పూర్తయిన రికార్డు భద్రంగా ఉంది.",
    loading: "అధ్యాయం 1 సిద్ధమవుతోంది…",
    loadError: "అధ్యాయం 1 లోడ్ కాలేదు.",
    retry: "మళ్లీ ప్రయత్నించండి",
    home: "ముఖపుటకు తిరిగి వెళ్లండి",
    sessionOnly: "బ్రౌజర్ నిల్వను నిరోధించింది. ఈ ట్యాబ్ తెరిచి ఉన్నంతవరకే మీ ఎంపికలు ఉంటాయి.",
  },
};

export default function ChapterGameClient({ websocketUrl }: { websocketUrl: string | null }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const profileRef = useRef<ChapterProfile | null>(null);
  const requestedActionRef = useRef<"continue" | "replay">("continue");
  const [locale, setLocale] = useState<Locale>("en");
  const [notice, setNotice] = useState<"" | "invalid" | "replay" | "sessionOnly">("");
  const [frameStatus, setFrameStatus] = useState<"loading" | "ready" | "error">("loading");
  const [frameAttempt, setFrameAttempt] = useState(0);
  const [watchdog] = useState(() =>
    createGameFrameWatchdog({
      delay: FRAME_READY_TIMEOUT_MS,
      onTimeout: () => setFrameStatus("error"),
    }),
  );
  const copy = shellCopy[locale];
  const baseFrameSrc = websocketUrl
    ? `/playcanvas/chapter-1/index.html?v=20260902prod&ws=${encodeURIComponent(websocketUrl)}`
    : "/playcanvas/chapter-1/index.html?v=20260902prod&connection=unconfigured";
  const frameSrc = `${baseFrameSrc}&shellAttempt=${frameAttempt}`;
  const sendResume = useCallback(
    () =>
      postProfileResume(
        iframeRef.current?.contentWindow,
        window.location.origin,
        profileRef.current,
        requestedActionRef.current,
      ),
    [],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    watchdog.arm();
    return () => watchdog.cancel();
  }, [frameAttempt, watchdog]);

  useEffect(() => {
    profileRef.current = saveProfile(readProfile(), false);
    setLocale(profileRef.current.settings.locale);
    if (!isProfileStorageDurable()) setNotice("sessionOnly");
    requestedActionRef.current =
      new URLSearchParams(window.location.search).get("replay") === "1" ? "replay" : "continue";
    sendResume();
    const onMessage = (event: MessageEvent) => {
      if (
        !isTrustedGameFrameMessage(
          event,
          iframeRef.current?.contentWindow,
          window.location.origin,
        ) || !event.data?.type
      ) return;
      if (event.data.type === "dwarka:ready") sendResume();
      if (event.data.type === "dwarka:ready") {
        watchdog.ready();
        setFrameStatus("ready");
      }
      if (event.data.type === "dwarka:load-error") {
        watchdog.cancel();
        setFrameStatus("error");
      }
      if (event.data.type === "dwarka:retrying") {
        setFrameStatus("loading");
        watchdog.arm();
      }
      if (event.data.type === "dwarka:progress" && profileRef.current)
        profileRef.current = mergeServerProgress(
          profileRef.current,
          event.data.progressToken,
          event.data.progressSummary as ProgressSummary,
        );
      if (event.data.type === "dwarka:settings" && profileRef.current) {
        profileRef.current = updateSettings(profileRef.current, event.data.settings);
        setLocale(profileRef.current.settings.locale);
      }
      if (event.data.type === "dwarka:error" && profileRef.current) {
        setNotice("invalid");
        profileRef.current = saveProfile(
          {
            ...profileRef.current,
            anonymousPlayerId: crypto.randomUUID(),
            progressToken: null,
            progressSummary: null,
          },
          false,
        );
        iframeRef.current?.contentWindow?.postMessage(
          { type: "dwarka:profile-sync", profile: profileRef.current, requestedAction: "continue" },
          window.location.origin,
        );
      }
      if (event.data.type === "dwarka:return-home") window.location.assign("/");
      if (event.data.type === "dwarka:replay") setNotice("replay");
    };
    const syncIframe = () => {
      profileRef.current = readProfile();
      setLocale(profileRef.current.settings.locale);
      iframeRef.current?.contentWindow?.postMessage(
        { type: "dwarka:profile-sync", profile: profileRef.current, requestedAction: "continue" },
        window.location.origin,
      );
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key?.startsWith("dwarka.chapter1")) syncIframe();
    };
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel === "function") {
      try {
        channel = new BroadcastChannel(CHANNEL_NAME);
        channel.onmessage = syncIframe;
      } catch {
        channel = null;
      }
    }
    window.addEventListener("message", onMessage);
    window.addEventListener("storage", onStorage);
    return () => {
      channel?.close();
      watchdog.cancel();
      window.removeEventListener("message", onMessage);
      window.removeEventListener("storage", onStorage);
    };
  }, [sendResume, watchdog]);

  const retryFrame = useCallback(() => {
    watchdog.cancel();
    setFrameStatus("loading");
    setFrameAttempt((attempt) => attempt + 1);
  }, [watchdog]);

  const frameNotice = frameStatus === "loading"
    ? copy.loading
    : frameStatus === "error"
      ? copy.loadError
      : "";

  return (
    <main className={styles.shell} lang={locale}>
      <a className={styles.skipLink} href="#game-frame">
        {copy.skip}
      </a>
      {frameNotice || notice ? (
        <div className={styles.notice} role={frameStatus === "error" ? "alert" : "status"}>
          {frameNotice || copy[notice as Exclude<typeof notice, "">]}
          {frameStatus === "error" ? <>
            <button type="button" onClick={retryFrame}>{copy.retry}</button>
            <button type="button" onClick={() => window.location.assign("/")}>{copy.home}</button>
          </> : notice ? <button type="button" onClick={() => setNotice("")} aria-label={copy.dismiss}>
            ×
          </button> : null}
        </div>
      ) : null}
      <iframe
        ref={iframeRef}
        key={frameAttempt}
        id="game-frame"
        className={styles.frame}
        src={frameSrc}
        title={copy.frame}
        allow="autoplay; fullscreen"
        onLoad={sendResume}
      />
      <noscript>{copy.noScript}</noscript>
    </main>
  );
}
