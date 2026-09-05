"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { ChapterDictionary, Locale } from "./game/chapter-1/localization";
import type { ChapterProfile, ChapterSettings } from "./game/chapter-1/progress";
import EmberField from "./EmberField";
import { framesForBeat, loadSequenceManifest, visibleFrameCount } from "./story-sequence";
import {
  BEATS,
  FRAME_CROSSFADE_MS,
  FRAME_INTERVAL_MS,
  MANUSCRIPT,
  BEAT_TAIL_MS,
  CAPTION_FADE_MS,
  CAPTION_HOLD_AFTER_VOICE_MS,
  RAID_BED_FROM_BEAT,
} from "./chapter-zero-beats";

const AMBIENCE_PATH = "/audio/chapter-0/ambience.ogg";
const MUSIC_PATHS = ["/audio/chapter-0/music-bed.ogg", "/audio/chapter-0/music-raid.ogg"] as const;
const CROSSFADE_MS = 1_200;
const TITLE_HOLD_MS = 2_600;
const LEAVE_FADE_MS = 900;
const MUSIC_FADE_MS = 3_200;
const BED_CROSSFADE_MS = 2_600;

type VoiceEntry = {
  sourceLineId: string;
  locale: Locale;
  status: string;
  assets: { codec: string; runtimePath: string }[];
};

// CINEMATIC_BEHAVIOR_HELPERS_START
type ResumableTimerClock = {
  setTimeout: (callback: () => void, delay: number) => unknown;
  clearTimeout: (handle: unknown) => void;
};

export function createResumableTimer({
  clock = {
    setTimeout: (callback: () => void, delay: number) => globalThis.setTimeout(callback, delay),
    clearTimeout: (handle: unknown) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
  },
  now = () => performance.now(),
  onFire,
}: {
  clock?: ResumableTimerClock;
  now?: () => number;
  onFire: () => void;
}) {
  let handle: unknown = null;
  let remaining = 0;
  let startedAt = 0;
  let active = false;
  let suspended = false;

  const fire = () => {
    handle = null;
    remaining = 0;
    active = false;
    onFire();
  };
  const schedule = () => {
    if (!active || suspended || handle !== null) return;
    startedAt = now();
    handle = clock.setTimeout(fire, Math.max(0, remaining));
  };
  const cancel = () => {
    if (handle !== null) clock.clearTimeout(handle);
    handle = null;
    remaining = 0;
    active = false;
  };

  return {
    arm(duration: number) {
      cancel();
      remaining = Math.max(0, duration);
      active = true;
      schedule();
    },
    pause() {
      suspended = true;
      if (active && handle !== null) {
        clock.clearTimeout(handle);
        handle = null;
        remaining = Math.max(0, remaining - (now() - startedAt));
      }
    },
    resume() {
      suspended = false;
      schedule();
    },
    cancel,
    isActive() {
      return active;
    },
  };
}

export function createCinematicAdvanceGate(onAdvance: () => void) {
  let blocked = false;
  let pending = false;
  return {
    request() {
      if (blocked) {
        pending = true;
        return false;
      }
      onAdvance();
      return true;
    },
    setBlocked(nextBlocked: boolean) {
      blocked = nextBlocked;
      if (!blocked && pending) {
        pending = false;
        onAdvance();
        return true;
      }
      return false;
    },
    discard() {
      pending = false;
    },
    hasPending() {
      return pending;
    },
  };
}
// CINEMATIC_BEHAVIOR_HELPERS_END

const interfaceCopy: Record<Locale, { chapter: string; advance: string; handing: string; sourceEyebrow: string; open: string }> = {
  en: { chapter: "Chapter 1", advance: "skip scene", handing: "Entering the street",  sourceEyebrow: "From the Jaiminiya Ashvamedha Parva", open: "Open the account" },
  hi: { chapter: "अध्याय 1", advance: "दृश्य छोड़ें", handing: "गली में प्रवेश",  sourceEyebrow: "जैमिनीय अश्वमेध पर्व से", open: "वृत्तांत खोलें" },
  ta: { chapter: "அத்தியாயம் 1", advance: "காட்சியைத் தாண்டு", handing: "தெருவில் நுழைகிறது",  sourceEyebrow: "ஜைமினிய அசுவமேத பர்வத்திலிருந்து", open: "பதிவைத் திற" },
  kn: { chapter: "ಅಧ್ಯಾಯ 1", advance: "ದೃಶ್ಯ ಬಿಡಿ", handing: "ಬೀದಿಗೆ ಪ್ರವೇಶ",  sourceEyebrow: "ಜೈಮಿನೀಯ ಅಶ್ವಮೇಧ ಪರ್ವದಿಂದ", open: "ವೃತ್ತಾಂತ ತೆರೆಯಿರಿ" },
  te: { chapter: "అధ్యాయం 1", advance: "దృశ్యాన్ని దాటండి", handing: "వీధిలోకి ప్రవేశం",  sourceEyebrow: "జైమినీయ అశ్వమేధ పర్వం నుండి", open: "వృత్తాంతాన్ని తెరవండి" },
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

// ponytail: linear ramp on a plain <audio>, not WebAudio — a bed fading under a
// voice does not need a graph. Move to WebAudio only if we ever need real ducking.
function rampVolume(audio: HTMLAudioElement, to: number, ms: number) {
  const from = audio.volume;
  if (ms <= 0 || Math.abs(to - from) < 0.005) {
    audio.volume = Math.max(0, Math.min(1, to));
    return () => undefined;
  }
  const startedAt = performance.now();
  let frame = 0;
  const step = () => {
    const progress = Math.min(1, (performance.now() - startedAt) / ms);
    audio.volume = Math.max(0, Math.min(1, from + (to - from) * progress));
    if (progress < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return () => cancelAnimationFrame(frame);
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
  const [beat, setBeat] = useState(0);
  const [outgoingBeat, setOutgoingBeat] = useState<number | null>(null);
  const [mode, setMode] = useState<"source" | "panels" | "title" | "leaving">("source");
  const [skipConfirm, setSkipConfirm] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState(false);
  const [beatDuration, setBeatDuration] = useState<number>(BEATS[0].hold);
  const [sequence, setSequence] = useState<{ beats?: Record<string, string[]> }>({});
  const [frame, setFrame] = useState(0);
  const [outgoingFrame, setOutgoingFrame] = useState<string | null>(null);
  const voiceRef = useRef<HTMLAudioElement | null>(null);
  const ambienceRef = useRef<HTMLAudioElement | null>(null);
  const bedsRef = useRef<(HTMLAudioElement | null)[]>([null, null]);
  const settingsRef = useRef(profile.settings);
  const outgoingTimerRef = useRef<number | null>(null);
  const performAdvanceRef = useRef<() => void>(() => undefined);
  const frameStepRef = useRef<() => void>(() => undefined);
  const completeRef = useRef(onComplete);
  const advancingRef = useRef(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const skipDialogRef = useRef<HTMLDivElement | null>(null);
  const advanceGateRef = useRef<ReturnType<typeof createCinematicAdvanceGate> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof createResumableTimer> | null>(null);
  const titleTimerRef = useRef<ReturnType<typeof createResumableTimer> | null>(null);
  const frameTimerRef = useRef<ReturnType<typeof createResumableTimer> | null>(null);

  useEffect(() => {
    advanceGateRef.current = createCinematicAdvanceGate(() => performAdvanceRef.current());
    fallbackTimerRef.current = createResumableTimer({ onFire: () => advanceGateRef.current?.request() });
    titleTimerRef.current = createResumableTimer({ onFire: () => advanceGateRef.current?.request() });
    frameTimerRef.current = createResumableTimer({ onFire: () => frameStepRef.current() });
    return () => {
      advanceGateRef.current?.discard();
      fallbackTimerRef.current?.cancel();
      titleTimerRef.current?.cancel();
      frameTimerRef.current?.cancel();
      advanceGateRef.current = null;
      fallbackTimerRef.current = null;
      titleTimerRef.current = null;
      frameTimerRef.current = null;
    };
  }, []);

  useEffect(() => { settingsRef.current = profile.settings; }, [profile.settings]);
  useEffect(() => { completeRef.current = onComplete; }, [onComplete]);
  const framesRef = useRef<string[]>([BEATS[0].image]);
  const frameRef = useRef(0);
  const beatRef = useRef(0);
  useEffect(() => { beatRef.current = beat; }, [beat]);
  useEffect(() => { frameRef.current = frame; }, [frame]);

  const bedVolume = useCallback((settings: ChapterSettings, ducked: boolean) => {
    if (settings.muteAll) return 0;
    return Math.min(.34, settings.master * settings.music * (ducked ? .16 : .28));
  }, []);

  const duckBeds = useCallback((ducked: boolean, ms: number) => {
    const active = beatRef.current >= RAID_BED_FROM_BEAT ? 1 : 0;
    bedsRef.current.forEach((bed, index) => {
      if (bed) rampVolume(bed, index === active ? bedVolume(settingsRef.current, ducked) : 0, ms);
    });
  }, [bedVolume]);

  const clearFallback = useCallback(() => {
    fallbackTimerRef.current?.cancel();
  }, []);

  const armFallback = useCallback((duration: number) => {
    fallbackTimerRef.current?.arm(duration);
  }, []);

  // Nothing the cinematic owns may survive into the game. Every exit path runs
  // this: the automatic hand-off, Esc-skip-all, unmount, and pagehide.
  const stopAllAudio = useCallback(() => {
    const all = [voiceRef.current, ambienceRef.current, ...bedsRef.current];
    all.forEach((audio) => {
      if (!audio) return;
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
      audio.load();
    });
    voiceRef.current = null;
    ambienceRef.current = null;
    bedsRef.current = [null, null];
  }, []);

  const clearTitleHold = useCallback(() => {
    titleTimerRef.current?.cancel();
  }, []);

  const leave = useCallback(() => {
    setMode("leaving");
    // The voice stops immediately; the beds fade out under the black.
    voiceRef.current?.pause();
    if (ambienceRef.current) rampVolume(ambienceRef.current, 0, LEAVE_FADE_MS);
    bedsRef.current.forEach((bed) => { if (bed) rampVolume(bed, 0, LEAVE_FADE_MS); });
    window.setTimeout(() => {
      stopAllAudio();
      completeRef.current();
    }, LEAVE_FADE_MS);
  }, [stopAllAudio]);
  const armTitleHold = useCallback((duration = TITLE_HOLD_MS) => {
    titleTimerRef.current?.arm(duration);
  }, []);

  const openAccount = useCallback(() => {
    clearFallback();
    setMode("panels");
  }, [clearFallback]);

  const performAdvance = useCallback(() => {
    if (advancingRef.current || mode === "leaving") return;
    if (mode === "source") { openAccount(); return; }
    advancingRef.current = true;
    window.setTimeout(() => { advancingRef.current = false; }, 450);
    clearFallback();
    voiceRef.current?.pause();
    voiceRef.current = null;

    if (mode === "title") {
      clearTitleHold();
      leave();
      return;
    }
    if (beat < BEATS.length - 1) {
      setVoiceNotice(false);
      setBeatDuration(BEATS[beat + 1].hold);
      setOutgoingFrame(framesRef.current[frameRef.current] ?? BEATS[beat].image);
      setFrame(0);
      setOutgoingBeat(beat);
      setBeat((value) => value + 1);
      if (outgoingTimerRef.current !== null) window.clearTimeout(outgoingTimerRef.current);
      outgoingTimerRef.current = window.setTimeout(() => setOutgoingBeat(null), CROSSFADE_MS);
      return;
    }
    setOutgoingFrame(framesRef.current[frameRef.current] ?? BEATS[beat].image);
    setOutgoingBeat(beat);
    setMode("title");
    if (outgoingTimerRef.current !== null) window.clearTimeout(outgoingTimerRef.current);
    outgoingTimerRef.current = window.setTimeout(() => setOutgoingBeat(null), CROSSFADE_MS);
  }, [beat, clearFallback, clearTitleHold, leave, mode, openAccount]);

  useEffect(() => { performAdvanceRef.current = performAdvance; }, [performAdvance]);

  const openSkipConfirm = useCallback(() => {
    advanceGateRef.current?.setBlocked(true);
    setSkipConfirm(true);
  }, []);

  const closeSkipConfirm = useCallback(() => {
    setSkipConfirm(false);
    advanceGateRef.current?.setBlocked(false);
  }, []);

  const confirmSkip = useCallback(() => {
    advanceGateRef.current?.discard();
    advanceGateRef.current?.setBlocked(false);
    setSkipConfirm(false);
    leave();
  }, [leave]);

  // The piano hands over to the darker bed as the raid frame comes up.
  useEffect(() => {
    if (mode !== "panels") return;
    const active = beat >= RAID_BED_FROM_BEAT ? 1 : 0;
    bedsRef.current.forEach((bed, index) => {
      if (bed) rampVolume(bed, index === active ? bedVolume(settingsRef.current, Boolean(voiceRef.current)) : 0, BED_CROSSFADE_MS);
    });
  }, [beat, bedVolume, mode]);

  // Per the manifest's loading note: eager-load the framing beat and beat 01
  // only, then stay one beat ahead. Pulling all 24 frames up front would cost
  // roughly 12 MB before the first picture appears.
  useEffect(() => {
    let cancelled = false;
    const warm = (sources: string[]) => sources.forEach((source) => { const image = new window.Image(); image.src = source; });
    warm([MANUSCRIPT.image, BEATS[0].image]);
    loadSequenceManifest().then((manifest) => {
      if (cancelled) return;
      setSequence(manifest);
      warm(framesForBeat(manifest, BEATS[0].id, BEATS[0].image));
    });
    return () => { cancelled = true; };
  }, []);

  const frames = useMemo(() => framesForBeat(sequence, BEATS[beat].id, BEATS[beat].image), [beat, sequence]);
  useEffect(() => { framesRef.current = frames; }, [frames]);

  // Preload the next beat while this one plays, so a cut never pops.
  useEffect(() => {
    if (mode !== "panels") return;
    const next = BEATS[beat + 1];
    if (!next) return;
    framesForBeat(sequence, next.id, next.image).forEach((source) => {
      const image = new window.Image();
      image.src = source;
    });
  }, [beat, mode, sequence]);

  useEffect(() => {
    rootRef.current?.focus();
    const settings = settingsRef.current;
    const ambience = new Audio(AMBIENCE_PATH);
    ambience.loop = true;
    ambience.preload = "auto";
    ambience.volume = settings.muteAll ? 0 : Math.min(.2, settings.master * settings.music * .18);
    ambienceRef.current = ambience;
    ambience.play().catch(() => undefined);

    // Two beds under the ambience: piano for Karna's half, a darker one from the
    // raid on. The first enters under the hero frame rather than with it, so panel
    // 01 opens on picture alone. A missing file simply never sounds.
    const beds = MUSIC_PATHS.map((path) => {
      const bed = new Audio(path);
      bed.loop = true;
      bed.preload = "auto";
      bed.volume = 0;
      bed.addEventListener("error", () => { bedsRef.current = bedsRef.current.map((item) => (item === bed ? null : item)); }, { once: true });
      bed.play().catch(() => undefined);
      return bed;
    });
    bedsRef.current = beds;
    const cancelMusicFade = rampVolume(beds[0], bedVolume(settingsRef.current, false), MUSIC_FADE_MS);

    // A browser that keeps this document alive through the navigation must not
    // leak narration over the game.
    window.addEventListener("pagehide", stopAllAudio);

    // Autoplay may be refused before the page has a gesture; retry once on the
    // first real interaction so the bed is never silently missing.
    const retryAudio = () => {
      ambienceRef.current?.play().catch(() => undefined);
      bedsRef.current.forEach((bed) => bed?.play().catch(() => undefined));
    };
    window.addEventListener("pointerdown", retryAudio, { once: true });
    window.addEventListener("keydown", retryAudio, { once: true });

    return () => {
      cancelMusicFade();
      window.removeEventListener("pagehide", stopAllAudio);
      window.removeEventListener("pointerdown", retryAudio);
      window.removeEventListener("keydown", retryAudio);
      ambience.pause();
      beds.forEach((bed) => bed.pause());
      stopAllAudio();
      clearFallback();
      clearTitleHold();
      if (outgoingTimerRef.current !== null) window.clearTimeout(outgoingTimerRef.current);
    };
  }, [bedVolume, clearFallback, clearTitleHold, stopAllAudio]);

  useEffect(() => {
    const settings = profile.settings;
    if (ambienceRef.current) ambienceRef.current.volume = settings.muteAll ? 0 : Math.min(.2, settings.master * settings.music * .18);
    const active = beatRef.current >= RAID_BED_FROM_BEAT ? 1 : 0;
    bedsRef.current.forEach((bed, index) => {
      if (bed) bed.volume = index === active ? bedVolume(settings, Boolean(voiceRef.current)) : 0;
    });
    if (voiceRef.current) voiceRef.current.volume = settings.muteAll ? 0 : Math.max(0, Math.min(1, settings.master * settings.dialogue));
  }, [bedVolume, profile.settings]);

  useEffect(() => {
    if (mode !== "panels") return;
    const current = BEATS[beat];
    let cancelled = false;
    // beatDuration is already this beat's authored hold: advance() sets it on the
    // way in, and loadedmetadata below stretches it to the measured line.
    armFallback(current.hold);

    const endBeat = () => {
      if (cancelled) return;
      armFallback(BEAT_TAIL_MS);
    };

    loadVoiceEntries().then((entries) => {
      if (cancelled) return;
      const entry = entries.find((candidate) => candidate.sourceLineId === current.voice && candidate.locale === profile.settings.voiceLocale && candidate.status === "validated");
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
        // Hold the frame for the line plus a breath, never shorter than the authored beat.
        if (!cancelled && Number.isFinite(audio.duration)) setBeatDuration(Math.max(current.hold, audio.duration * 1_000 + BEAT_TAIL_MS));
      });
      audio.addEventListener("playing", () => {
        clearFallback();
        duckBeds(true, 600);
        if (!cancelled && Number.isFinite(audio.duration)) armFallback(audio.duration * 1_000 + BEAT_TAIL_MS * 2);
      });
      audio.addEventListener("ended", () => {
        duckBeds(false, 900);
        endBeat();
      });
      audio.addEventListener("error", () => {
        if (!cancelled) {
          setVoiceNotice(true);
          armFallback(current.hold);
        }
      }, { once: true });
      audio.play().catch(() => {
        if (!cancelled) {
          setVoiceNotice(true);
          armFallback(current.hold);
        }
      });
    }).catch(() => {
      if (!cancelled) {
        setVoiceNotice(true);
        armFallback(current.hold);
      }
    });

    return () => {
      cancelled = true;
      voiceRef.current?.pause();
      voiceRef.current = null;
      clearFallback();
    };
  }, [armFallback, beat, clearFallback, duckBeds, mode, profile.settings.voiceLocale]);

  useEffect(() => {
    if (mode !== "source") return;
    armFallback(MANUSCRIPT.hold);
    return clearFallback;
  }, [armFallback, clearFallback, mode]);

  useEffect(() => {
    if (mode !== "panels") return;
    const shown = visibleFrameCount(frames.length, beatDuration, FRAME_INTERVAL_MS);
    if (shown <= 1) return;
    let index = 0;
    const step = () => {
      index += 1;
      setFrame(index);
      // Stop on the last frame; it holds until the beat itself ends.
      if (index < shown - 1) frameTimerRef.current?.arm(FRAME_INTERVAL_MS);
    };
    frameStepRef.current = step;
    frameTimerRef.current?.arm(FRAME_INTERVAL_MS);
    return () => {
      frameTimerRef.current?.cancel();
      frameStepRef.current = () => undefined;
    };
  }, [beat, beatDuration, frames.length, mode]);

  useEffect(() => {
    if (mode !== "title") return;
    armTitleHold();
    return clearTitleHold;
  }, [armTitleHold, clearTitleHold, mode]);

  useEffect(() => {
    const pause = () => {
      voiceRef.current?.pause();
      ambienceRef.current?.pause();
      bedsRef.current.forEach((bed) => bed?.pause());
      fallbackTimerRef.current?.pause();
      frameTimerRef.current?.pause();
      titleTimerRef.current?.pause();
    };
    const resume = () => {
      if (document.hidden) return;
      voiceRef.current?.play().catch(() => undefined);
      ambienceRef.current?.play().catch(() => undefined);
      bedsRef.current.forEach((bed) => bed?.play().catch(() => undefined));
      fallbackTimerRef.current?.resume();
      frameTimerRef.current?.resume();
      titleTimerRef.current?.resume();
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
  }, []);

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

  // ponytail: write the pointer offset to CSS variables on the root rather than
  // into state — a re-render per mousemove would be the expensive way to do this.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = rootRef.current;
    if (!root) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        root.style.setProperty("--parallax-x", ((event.clientX / window.innerWidth) * 2 - 1).toFixed(3));
        root.style.setProperty("--parallax-y", ((event.clientY / window.innerHeight) * 2 - 1).toFixed(3));
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (skipConfirm) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeSkipConfirm();
        }
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        openSkipConfirm();
      } else if (event.key === " " || event.code === "Space" || event.key === "Enter") {
        // Only the cinematic's own controls may swallow the key; focus left behind
        // on the title screen underneath must not silently break "Space to skip".
        const control = (event.target as HTMLElement | null)?.closest("button, a, input, select, textarea");
        if (control?.closest(".chapter-zero-cinematic")) return;
        event.preventDefault();
        advanceGateRef.current?.request();
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [closeSkipConfirm, openSkipConfirm, skipConfirm]);

  const current = BEATS[beat];
  const currentCopy = copy.chapter0.panels[beat];
  const storyMuted = profile.settings.muteAll || profile.settings.dialogue === 0;
  const ui = interfaceCopy[locale];
  // The hero frame opens on picture alone: no chrome, no counter, a later caption.
  const bare = mode === "source" || (mode === "panels" && current.hero);
  const motionStyle = {
    "--panel-duration": `${beatDuration}ms`,
    "--pan-x": beat % 2 === 0 ? "1.4%" : "-1.4%",
    "--caption-delay": current.hero ? "2400ms" : "1100ms",
    "--caption-fade": `${CAPTION_FADE_MS}ms`,
    "--frame-fade": `${FRAME_CROSSFADE_MS}ms`,
    "--caption-out": `${Math.max(1_000, beatDuration - BEAT_TAIL_MS + CAPTION_HOLD_AFTER_VOICE_MS)}ms`,
  } as CSSProperties;

  function toggleMute() {
    if (profile.settings.muteAll) onSaveSetting("muteAll", false);
    else onSaveSetting("dialogue", profile.settings.dialogue > 0 ? 0 : 1);
  }

  return <div ref={rootRef} className={`chapter-zero-cinematic mode-${mode}${bare ? " is-bare" : ""}`} role="dialog" aria-modal="true" aria-labelledby="cinematic-title" tabIndex={-1}>
    <div className="cinematic-frame">
      {mode === "source" ? <div className="cinematic-image cinematic-image-current is-source">
        <Image src={MANUSCRIPT.image} alt="" fill sizes="100vw" priority unoptimized />
      </div> : null}
      {outgoingBeat !== null ? <div className="cinematic-image cinematic-image-outgoing" aria-hidden="true"><Image src={outgoingFrame ?? BEATS[outgoingBeat].image} alt="" fill sizes="100vw" priority unoptimized /></div> : null}
      {mode === "panels" ? <div className={`cinematic-image cinematic-image-current${current.hero ? " is-hero" : ""}`} key={beat} style={motionStyle}>
        {/* The Ken Burns move lives on this wrapper, so it runs unbroken across
            the whole cycle and the frames only cross-fade underneath it. */}
        <div className="cinematic-frames">
          {frames.map((source, index) => (
            <Image key={source} className={index === Math.min(frame, frames.length - 1) ? "is-live" : ""}
              src={source} alt={index === 0 ? currentCopy.text : ""} aria-hidden={index !== 0}
              fill sizes="100vw" priority={index === 0} unoptimized />
          ))}
        </div>
      </div> : null}
      <div className="cinematic-shade" aria-hidden="true" />
      <EmberField className="cinematic-embers" />
      {mode === "panels" && profile.settings.captions ? <div className={`cinematic-caption${current.mission ? " is-mission" : ""}`} key={`caption-${beat}`} style={motionStyle}>
        {current.hero ? null : <p className="cinematic-count">{String(beat + 1).padStart(2, "0")} / {String(BEATS.length).padStart(2, "0")}</p>}
        <h2 id="cinematic-title">{currentCopy.title}</h2>
        <p>{currentCopy.text}</p>
        {voiceNotice ? <small role="status">{copy.chapter0.voiceUnavailable}</small> : null}
      </div> : <h2 className="sr-only" id="cinematic-title">{copy.chapter0.label}</h2>}
    </div>

    <div className="cinematic-topbar">
      <div><p>{copy.chapter0.label}</p><span>{copy.chapter0.attribution}</span></div>
      <div className="cinematic-utilities">
        <button type="button" aria-pressed={profile.settings.captions} onClick={() => onSaveSetting("captions", !profile.settings.captions)}>{profile.settings.captions ? copy.chapter0.captionsOn : copy.chapter0.captionsOff}</button>
        <button type="button" aria-pressed={storyMuted} onClick={toggleMute}>{storyMuted ? copy.chapter0.unmute : copy.chapter0.mute}</button>
        <button type="button" onClick={openSkipConfirm}>{copy.chapter0.skip}</button>
      </div>
    </div>

    {mode === "title" || mode === "leaving" ? <div className="cinematic-title-card" aria-live="polite">
      <p>{ui.chapter}</p>
      <h2>{chapterTitle}</h2>
      <p className="cinematic-handing" role="status">{ui.handing}</p>
    </div> : null}

    {mode === "source" ? <div className="cinematic-source">
      <p className="cinematic-source-eyebrow">{ui.sourceEyebrow}</p>
      <button className="cinematic-open" type="button" onClick={openAccount}>
        <span className="cinematic-open-ring" aria-hidden="true" />
        <span className="cinematic-open-ring cinematic-open-ring-late" aria-hidden="true" />
        <span>{ui.open}</span>
      </button>
    </div> : null}

    <div className="cinematic-bloom" aria-hidden="true" />

    {mode === "panels" ? <p className="cinematic-hint">Space · {ui.advance}<span>Esc · {copy.chapter0.skip}</span></p> : null}

    {skipConfirm ? <div ref={skipDialogRef} className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="skip-title">
      <div><p className="eyebrow">{copy.chapter0.skipLabel}</p><h2 id="skip-title">{copy.chapter0.skipTitle}</h2><p>{copy.chapter0.skipBody}</p><div><button type="button" onClick={closeSkipConfirm}>{copy.chapter0.cancel}</button><button className="primary" type="button" onClick={confirmSkip}>{copy.chapter0.skipConfirm}</button></div></div>
    </div> : null}
  </div>;
}
