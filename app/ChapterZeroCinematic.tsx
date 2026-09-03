"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { ChapterDictionary, Locale } from "./game/chapter-1/localization";
import type { ChapterProfile, ChapterSettings } from "./game/chapter-1/progress";

const PANEL_IMAGES = [
  "/story-a/01-battlefield.webp",
  "/story-a/02-karna-looses.webp",
  "/story-a/03-wheel-sinks.webp",
  "/story-a/04-karna-lifts.webp",
  "/story-a/05-ash.webp",
] as const;

const PANEL_VOICE_IDS = [
  "ch0-panel-01-battlefield",
  "ch0-panel-02-last-stand",
  "ch0-panel-03-wheel",
  "ch0-panel-04-pause-owed",
  "ch0-panel-05-what-remained",
] as const;

const AMBIENCE_PATH = "/audio/chapter-0/ambience.ogg";
const FALLBACK_DURATION_MS = 7_000;
const CROSSFADE_MS = 1_200;
const TITLE_HOLD_MS = 2_000;

type VoiceEntry = {
  sourceLineId: string;
  locale: Locale;
  status: string;
  assets: { codec: string; runtimePath: string }[];
};

const interfaceCopy: Record<Locale, { chapter: string; advance: string; enter: string; controls: string; pointer: string }> = {
  en: { chapter: "Chapter 1", advance: "skip scene", enter: "Click to enter the street", controls: "W A S D · mouse · Shift · Space · RMB aim · LMB attack · E", pointer: "Your mouse will be captured. Press Esc to release it." },
  hi: { chapter: "अध्याय 1", advance: "दृश्य छोड़ें", enter: "गली में प्रवेश करने के लिए क्लिक करें", controls: "W A S D · माउस · Shift · Space · RMB निशाना · LMB वार · E", pointer: "माउस खेल के नियंत्रण में होगा। उसे छोड़ने के लिए Esc दबाएँ।" },
  ta: { chapter: "அத்தியாயம் 1", advance: "காட்சியைத் தாண்டு", enter: "தெருவில் நுழைய கிளிக் செய்யவும்", controls: "W A S D · சுட்டி · Shift · Space · RMB குறி · LMB தாக்குதல் · E", pointer: "சுட்டி விளையாட்டின் கட்டுப்பாட்டில் இருக்கும். விடுவிக்க Esc அழுத்தவும்." },
  kn: { chapter: "ಅಧ್ಯಾಯ 1", advance: "ದೃಶ್ಯ ಬಿಡಿ", enter: "ಬೀದಿಗೆ ಪ್ರವೇಶಿಸಲು ಕ್ಲಿಕ್ ಮಾಡಿ", controls: "W A S D · ಮೌಸ್ · Shift · Space · RMB ಗುರಿ · LMB ದಾಳಿ · E", pointer: "ಮೌಸ್ ಆಟದ ನಿಯಂತ್ರಣಕ್ಕೆ ಬರುತ್ತದೆ. ಬಿಡಿಸಲು Esc ಒತ್ತಿ." },
  te: { chapter: "అధ్యాయం 1", advance: "దృశ్యాన్ని దాటండి", enter: "వీధిలోకి ప్రవేశించడానికి క్లిక్ చేయండి", controls: "W A S D · మౌస్ · Shift · Space · RMB గురి · LMB దాడి · E", pointer: "మౌస్ ఆట నియంత్రణలోకి వస్తుంది. విడిచిపెట్టడానికి Esc నొక్కండి." },
};

let voiceManifestPromise: Promise<VoiceEntry[]> | null = null;

function loadVoiceEntries() {
  voiceManifestPromise ??= fetch("/audio/chapter-1/voice-manifest.json", { cache: "force-cache" })
    .then((response) => {
      if (!response.ok) throw new Error("voice manifest unavailable");
      return response.json();
    })
    .then((manifest) => (manifest.entries ?? []) as VoiceEntry[]);
  return voiceManifestPromise;
}

type Props = {
  copy: ChapterDictionary;
  locale: Locale;
  profile: ChapterProfile;
  chapterTitle: string;
  onSaveSetting: <K extends keyof ChapterSettings>(key: K, value: ChapterSettings[K]) => void;
  onComplete: () => void;
};

export default function ChapterZeroCinematic({ copy, locale, profile, chapterTitle, onSaveSetting, onComplete }: Props) {
  const [panel, setPanel] = useState(0);
  const [outgoingPanel, setOutgoingPanel] = useState<number | null>(null);
  const [mode, setMode] = useState<"panels" | "title" | "entry" | "leaving">("panels");
  const [skipConfirm, setSkipConfirm] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState(false);
  const [panelDuration, setPanelDuration] = useState(FALLBACK_DURATION_MS);
  const voiceRef = useRef<HTMLAudioElement | null>(null);
  const ambienceRef = useRef<HTMLAudioElement | null>(null);
  const settingsRef = useRef(profile.settings);
  const outgoingTimerRef = useRef<number | null>(null);
  const titleTimerRef = useRef<number | null>(null);
  const titleHoldRef = useRef({ remaining: TITLE_HOLD_MS, startedAt: 0, active: false });
  const advanceRef = useRef<() => void>(() => undefined);
  const advancingRef = useRef(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const skipDialogRef = useRef<HTMLDivElement | null>(null);
  const fallbackRef = useRef<{ timer: number | null; remaining: number; startedAt: number; active: boolean }>({ timer: null, remaining: FALLBACK_DURATION_MS, startedAt: 0, active: false });

  useEffect(() => { settingsRef.current = profile.settings; }, [profile.settings]);

  const clearFallback = useCallback(() => {
    if (fallbackRef.current.timer !== null) window.clearTimeout(fallbackRef.current.timer);
    fallbackRef.current = { timer: null, remaining: FALLBACK_DURATION_MS, startedAt: 0, active: false };
  }, []);

  const armFallback = useCallback((duration = FALLBACK_DURATION_MS) => {
    clearFallback();
    fallbackRef.current = { timer: null, remaining: duration, startedAt: performance.now(), active: true };
    fallbackRef.current.timer = window.setTimeout(() => {
      fallbackRef.current.active = false;
      fallbackRef.current.timer = null;
      advanceRef.current();
    }, duration);
  }, [clearFallback]);

  const clearTitleHold = useCallback(() => {
    if (titleTimerRef.current !== null) window.clearTimeout(titleTimerRef.current);
    titleTimerRef.current = null;
    titleHoldRef.current = { remaining: TITLE_HOLD_MS, startedAt: 0, active: false };
  }, []);

  const armTitleHold = useCallback((duration = TITLE_HOLD_MS) => {
    if (titleTimerRef.current !== null) window.clearTimeout(titleTimerRef.current);
    titleHoldRef.current = { remaining: duration, startedAt: performance.now(), active: true };
    titleTimerRef.current = window.setTimeout(() => {
      titleTimerRef.current = null;
      titleHoldRef.current.active = false;
      setMode("entry");
    }, duration);
  }, []);

  const advance = useCallback(() => {
    if (advancingRef.current || skipConfirm || mode === "entry" || mode === "leaving") return;
    advancingRef.current = true;
    window.setTimeout(() => { advancingRef.current = false; }, 500);
    clearFallback();
    voiceRef.current?.pause();
    voiceRef.current = null;

    if (mode === "title") {
      clearTitleHold();
      setMode("entry");
      return;
    }
    if (panel < PANEL_IMAGES.length - 1) {
      setVoiceNotice(false);
      setPanelDuration(FALLBACK_DURATION_MS);
      setOutgoingPanel(panel);
      setPanel((value) => value + 1);
      if (outgoingTimerRef.current !== null) window.clearTimeout(outgoingTimerRef.current);
      outgoingTimerRef.current = window.setTimeout(() => setOutgoingPanel(null), CROSSFADE_MS);
      return;
    }
    setOutgoingPanel(panel);
    setMode("title");
    if (outgoingTimerRef.current !== null) window.clearTimeout(outgoingTimerRef.current);
    outgoingTimerRef.current = window.setTimeout(() => setOutgoingPanel(null), CROSSFADE_MS);
  }, [clearFallback, clearTitleHold, mode, panel, skipConfirm]);

  useEffect(() => { advanceRef.current = advance; }, [advance]);

  useEffect(() => {
    PANEL_IMAGES.forEach((source) => {
      const image = new window.Image();
      image.src = source;
    });
  }, []);

  useEffect(() => {
    rootRef.current?.focus();
    const ambience = new Audio(AMBIENCE_PATH);
    ambience.loop = true;
    ambience.preload = "auto";
    const settings = settingsRef.current;
    ambience.volume = settings.muteAll ? 0 : Math.min(.2, settings.master * settings.music * .18);
    ambienceRef.current = ambience;
    ambience.play().catch(() => undefined);
    return () => {
      ambience.pause();
      ambienceRef.current = null;
      voiceRef.current?.pause();
      clearFallback();
      clearTitleHold();
      if (outgoingTimerRef.current !== null) window.clearTimeout(outgoingTimerRef.current);
    };
  }, [clearFallback, clearTitleHold]);

  useEffect(() => {
    if (ambienceRef.current) ambienceRef.current.volume = profile.settings.muteAll ? 0 : Math.min(.2, profile.settings.master * profile.settings.music * .18);
    if (voiceRef.current) voiceRef.current.volume = profile.settings.muteAll ? 0 : Math.max(0, Math.min(1, profile.settings.master * profile.settings.dialogue));
  }, [profile.settings.dialogue, profile.settings.master, profile.settings.music, profile.settings.muteAll]);

  useEffect(() => {
    if (mode !== "panels") return;
    let cancelled = false;
    armFallback();

    loadVoiceEntries().then((entries) => {
      if (cancelled) return;
      const entry = entries.find((candidate) => candidate.sourceLineId === PANEL_VOICE_IDS[panel] && candidate.locale === profile.settings.voiceLocale && candidate.status === "validated");
      const probe = document.createElement("audio");
      const asset = entry?.assets.find((candidate) => candidate.codec === "ogg" && probe.canPlayType("audio/ogg"))
        ?? entry?.assets.find((candidate) => candidate.codec === "mp3")
        ?? entry?.assets[0];
      if (!asset) {
        setVoiceNotice(true);
        return;
      }

      const audio = new Audio(asset.runtimePath);
      audio.preload = "auto";
      const settings = settingsRef.current;
      audio.volume = settings.muteAll ? 0 : Math.max(0, Math.min(1, settings.master * settings.dialogue));
      voiceRef.current = audio;
      audio.addEventListener("loadedmetadata", () => {
        if (!cancelled && Number.isFinite(audio.duration)) setPanelDuration(Math.max(4_000, audio.duration * 1_000));
      });
      audio.addEventListener("playing", clearFallback);
      audio.addEventListener("ended", () => { if (!cancelled) advanceRef.current(); });
      audio.addEventListener("error", () => {
        if (!cancelled) {
          setVoiceNotice(true);
          armFallback();
        }
      }, { once: true });
      audio.play().catch(() => {
        if (!cancelled) {
          setVoiceNotice(true);
          armFallback();
        }
      });
    }).catch(() => {
      if (!cancelled) {
        setVoiceNotice(true);
        armFallback();
      }
    });

    return () => {
      cancelled = true;
      voiceRef.current?.pause();
      voiceRef.current = null;
      clearFallback();
    };
  }, [armFallback, clearFallback, mode, panel, profile.settings.voiceLocale]);

  useEffect(() => {
    if (mode !== "title") return;
    armTitleHold();
    return clearTitleHold;
  }, [armTitleHold, clearTitleHold, mode]);

  useEffect(() => {
    const pause = () => {
      voiceRef.current?.pause();
      ambienceRef.current?.pause();
      const fallback = fallbackRef.current;
      if (fallback.active && fallback.timer !== null) {
        window.clearTimeout(fallback.timer);
        fallback.remaining = Math.max(0, fallback.remaining - (performance.now() - fallback.startedAt));
        fallback.timer = null;
      }
      const titleHold = titleHoldRef.current;
      if (titleHold.active && titleTimerRef.current !== null) {
        window.clearTimeout(titleTimerRef.current);
        titleHold.remaining = Math.max(0, titleHold.remaining - (performance.now() - titleHold.startedAt));
        titleTimerRef.current = null;
      }
    };
    const resume = () => {
      if (document.hidden) return;
      voiceRef.current?.play().catch(() => undefined);
      ambienceRef.current?.play().catch(() => undefined);
      const fallback = fallbackRef.current;
      if (fallback.active && fallback.timer === null) armFallback(fallback.remaining);
      const titleHold = titleHoldRef.current;
      if (titleHold.active && titleTimerRef.current === null) armTitleHold(titleHold.remaining);
    };
    const visibility = () => { if (document.hidden) pause(); else resume(); };
    window.addEventListener("blur", pause);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("blur", pause);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [armFallback, armTitleHold]);

  useEffect(() => {
    if (!skipConfirm) return;
    const dialog = skipDialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLButtonElement>("button:not([disabled])") ?? []);
    focusable()[0]?.focus();
    const trapFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", trapFocus);
    return () => window.removeEventListener("keydown", trapFocus);
  }, [skipConfirm]);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (skipConfirm) {
        if (event.key === "Escape") {
          event.preventDefault();
          setSkipConfirm(false);
        }
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setSkipConfirm(true);
      } else if ((event.key === " " || event.key === "Enter") && mode !== "entry") {
        if ((event.target as HTMLElement | null)?.closest("button, a, input, select, textarea")) return;
        event.preventDefault();
        advanceRef.current();
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [mode, skipConfirm]);

  const currentPanel = copy.chapter0.panels[panel];
  const storyMuted = profile.settings.muteAll || profile.settings.dialogue === 0;
  const ui = interfaceCopy[locale];
  const motionStyle = {
    "--panel-duration": `${panelDuration}ms`,
    "--pan-x": panel % 2 === 0 ? "1.5%" : "-1.5%",
  } as CSSProperties;

  function toggleMute() {
    if (profile.settings.muteAll) onSaveSetting("muteAll", false);
    else onSaveSetting("dialogue", profile.settings.dialogue > 0 ? 0 : 1);
  }

  function enterStreet() {
    setMode("leaving");
    window.setTimeout(onComplete, 650);
  }

  return <div ref={rootRef} className={`chapter-zero-cinematic mode-${mode}`} role="dialog" aria-modal="true" aria-labelledby="cinematic-title" tabIndex={-1}>
    <div className="cinematic-frame">
      {outgoingPanel !== null ? <div className="cinematic-image cinematic-image-outgoing" aria-hidden="true"><Image src={PANEL_IMAGES[outgoingPanel]} alt="" fill sizes="100vw" priority /></div> : null}
      {mode === "panels" ? <div className="cinematic-image cinematic-image-current" key={panel} style={motionStyle}><Image src={PANEL_IMAGES[panel]} alt={currentPanel.text} fill sizes="100vw" priority /></div> : null}
      <div className="cinematic-shade" aria-hidden="true" />
      {mode === "panels" && profile.settings.captions ? <div className="cinematic-caption" key={`caption-${panel}`} style={motionStyle}>
        <p className="cinematic-count">{String(panel + 1).padStart(2, "0")} / 05</p>
        <h2 id="cinematic-title">{currentPanel.title}</h2>
        <p>{currentPanel.text}</p>
        {voiceNotice ? <small role="status">{copy.chapter0.voiceUnavailable}</small> : null}
      </div> : <h2 className="sr-only" id="cinematic-title">{copy.chapter0.label}</h2>}
    </div>

    <div className="cinematic-topbar">
      <div><p>{copy.chapter0.label}</p><span>{copy.chapter0.attribution}</span></div>
      <div className="cinematic-utilities">
        <button type="button" aria-pressed={profile.settings.captions} onClick={() => onSaveSetting("captions", !profile.settings.captions)}>{profile.settings.captions ? copy.chapter0.captionsOn : copy.chapter0.captionsOff}</button>
        <button type="button" aria-pressed={storyMuted} onClick={toggleMute}>{storyMuted ? copy.chapter0.unmute : copy.chapter0.mute}</button>
        <button type="button" onClick={() => setSkipConfirm(true)}>{copy.chapter0.skip}</button>
      </div>
    </div>

    {mode === "title" || mode === "entry" || mode === "leaving" ? <div className="cinematic-title-card" aria-live="polite">
      <p>{ui.chapter}</p>
      <h2>{chapterTitle}</h2>
      {mode === "entry" || mode === "leaving" ? <div className="cinematic-entry">
        <button type="button" onClick={enterStreet}>{ui.enter}</button>
        <p>{ui.controls}</p>
        <small>{ui.pointer}</small>
      </div> : null}
    </div> : null}

    {mode === "panels" ? <p className="cinematic-hint">Space / Enter · {ui.advance}<span>Esc · {copy.chapter0.skip}</span></p> : null}

    {skipConfirm ? <div ref={skipDialogRef} className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="skip-title">
      <div><p className="eyebrow">{copy.chapter0.skipLabel}</p><h2 id="skip-title">{copy.chapter0.skipTitle}</h2><p>{copy.chapter0.skipBody}</p><div><button type="button" onClick={() => setSkipConfirm(false)}>{copy.chapter0.cancel}</button><button className="primary" type="button" onClick={onComplete}>{copy.chapter0.skipConfirm}</button></div></div>
    </div> : null}
  </div>;
}
