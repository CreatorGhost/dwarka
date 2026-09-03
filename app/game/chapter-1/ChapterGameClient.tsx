"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Locale } from "./localization";
import { postProfileResume } from "./profile-bridge";
import {
  CHANNEL_NAME,
  mergeServerProgress,
  readProfile,
  saveProfile,
  updateSettings,
  type ChapterProfile,
  type ProgressSummary,
} from "./progress";
import styles from "./page.module.css";

const shellCopy: Record<
  Locale,
  {
    skip: string;
    dismiss: string;
    frame: string;
    noScript: string;
    invalid: string;
    replay: string;
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
  },
  hi: {
    skip: "सीधे खेल पर जाएँ",
    dismiss: "संदेश बंद करें",
    frame: "DWARKA अध्याय 1 खेलने योग्य खेल",
    noScript: "अध्याय 1 खेलने के लिए JavaScript आवश्यक है।",
    invalid:
      "सहेजी गई प्रगति सत्यापित नहीं हुई। सेटिंग्स रखी गईं और अध्याय 1 सुरक्षित रूप से फिर शुरू हुआ।",
    replay: "पुनः खेल शुरू हुआ। अध्याय पूरा होने का रिकॉर्ड सुरक्षित है।",
  },
  ta: {
    skip: "நேராக விளையாட்டுக்குச் செல்க",
    dismiss: "செய்தியை மூடு",
    frame: "DWARKA அத்தியாயம் 1 விளையாட்டு",
    noScript: "அத்தியாயம் 1 விளையாட JavaScript தேவை.",
    invalid:
      "சேமித்த முன்னேற்றத்தைச் சரிபார்க்க முடியவில்லை. அமைப்புகள் பாதுகாக்கப்பட்டு அத்தியாயம் 1 பாதுகாப்பாக மீண்டும் தொடங்கியது.",
    replay: "மறுவிளையாட்டு தொடங்கியது. அத்தியாய நிறைவு பதிவு பாதுகாக்கப்பட்டுள்ளது.",
  },
  kn: {
    skip: "ನೇರವಾಗಿ ಆಟಕ್ಕೆ ಹೋಗಿ",
    dismiss: "ಸಂದೇಶ ಮುಚ್ಚಿ",
    frame: "DWARKA ಅಧ್ಯಾಯ 1 ಆಡಬಹುದಾದ ಆಟ",
    noScript: "ಅಧ್ಯಾಯ 1 ಆಡಲು JavaScript ಅಗತ್ಯ.",
    invalid:
      "ಉಳಿಸಿದ ಪ್ರಗತಿಯನ್ನು ಪರಿಶೀಲಿಸಲಾಗಲಿಲ್ಲ. ಸೆಟ್ಟಿಂಗ್‌ಗಳನ್ನು ಉಳಿಸಿ ಅಧ್ಯಾಯ 1 ಅನ್ನು ಸುರಕ್ಷಿತವಾಗಿ ಮರುಪ್ರಾರಂಭಿಸಲಾಗಿದೆ.",
    replay: "ಮರುಆಟ ಆರಂಭವಾಗಿದೆ. ಅಧ್ಯಾಯ ಪೂರ್ಣಗೊಂಡ ದಾಖಲೆಯನ್ನು ಉಳಿಸಲಾಗಿದೆ.",
  },
  te: {
    skip: "నేరుగా ఆటకు వెళ్లండి",
    dismiss: "సందేశాన్ని మూసివేయండి",
    frame: "DWARKA అధ్యాయం 1 ఆడగలిగే ఆట",
    noScript: "అధ్యాయం 1 ఆడటానికి JavaScript అవసరం.",
    invalid:
      "సేవ్ చేసిన పురోగతిని నిర్ధారించలేకపోయాం. సెట్టింగ్‌లు అలాగే ఉంచి అధ్యాయం 1ను సురక్షితంగా మళ్లీ ప్రారంభించాం.",
    replay: "మళ్లీ ఆట ప్రారంభమైంది. అధ్యాయం పూర్తయిన రికార్డు భద్రంగా ఉంది.",
  },
};

export default function ChapterGameClient({ websocketUrl }: { websocketUrl: string | null }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const profileRef = useRef<ChapterProfile | null>(null);
  const requestedActionRef = useRef<"continue" | "replay">("continue");
  const [locale, setLocale] = useState<Locale>("en");
  const [notice, setNotice] = useState<"" | "invalid" | "replay">("");
  const copy = shellCopy[locale];
  const frameSrc = websocketUrl
    ? `/playcanvas/chapter-1/index.html?v=20260902prod&ws=${encodeURIComponent(websocketUrl)}`
    : "/playcanvas/chapter-1/index.html?v=20260902prod&connection=unconfigured";
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
    profileRef.current = saveProfile(readProfile(), false);
    setLocale(profileRef.current.settings.locale);
    requestedActionRef.current =
      new URLSearchParams(window.location.search).get("replay") === "1" ? "replay" : "continue";
    sendResume();
    const onMessage = (event: MessageEvent) => {
      if (
        event.origin !== window.location.origin ||
        event.source !== iframeRef.current?.contentWindow ||
        !event.data?.type
      )
        return;
      if (event.data.type === "dwarka:ready") sendResume();
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
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = syncIframe;
    window.addEventListener("message", onMessage);
    window.addEventListener("storage", onStorage);
    return () => {
      channel.close();
      window.removeEventListener("message", onMessage);
      window.removeEventListener("storage", onStorage);
    };
  }, [sendResume]);

  return (
    <main className={styles.shell} lang={locale}>
      <a className={styles.skipLink} href="#game-frame">
        {copy.skip}
      </a>
      {notice ? (
        <div className={styles.notice} role="status">
          {copy[notice]}
          <button type="button" onClick={() => setNotice("")} aria-label={copy.dismiss}>
            ×
          </button>
        </div>
      ) : null}
      <iframe
        ref={iframeRef}
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
