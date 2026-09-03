"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { dictionaries, languageNames, locales, type ChapterDictionary, type Locale } from "./game/chapter-1/localization";
import { CHANNEL_NAME, readProfile, resetProgress, saveProfile, updateSettings, type ChapterProfile, type ChapterSettings } from "./game/chapter-1/progress";

const panels = [
  "/story-a/01-battlefield.webp",
  "/story-a/02-karna-looses.webp",
  "/story-a/03-wheel-sinks.webp",
  "/story-a/04-karna-lifts.webp",
  "/story-a/05-ash.webp",
];
const panelVoiceIds = ["ch0-panel-01-battlefield", "ch0-panel-02-last-stand", "ch0-panel-03-wheel", "ch0-panel-04-pause-owed", "ch0-panel-05-what-remained"];
type VoiceEntry = { sourceLineId: string; locale: Locale; status: string; assets: { codec: string; runtimePath: string }[] };
let voiceManifestPromise: Promise<VoiceEntry[]> | null = null;
function loadVoiceEntries() {
  voiceManifestPromise ??= fetch("/audio/chapter-1/voice-manifest.json", { cache: "force-cache" }).then((response) => {
    if (!response.ok) throw new Error("voice manifest unavailable");
    return response.json();
  }).then((manifest) => (manifest.entries ?? []) as VoiceEntry[]);
  return voiceManifestPromise;
}

const stories = [
  { id: "A", href: "/vrishaketu" },
  { id: "B", href: "/emberborn" },
  { id: "C", href: "/babhruvahana" },
  { id: "D", href: "/abhimanyu" },
];

const titleCopy: Record<Locale, {
  subtitle: string;
  begin: string;
  continue: string;
  replay: string;
  language: string;
  settings: string;
  credits: string;
  creditsTitle: string;
  creditsBody: string;
  close: string;
  archive: string;
  source: string;
}> = {
  en: { subtitle: "The Boy with the Paper Sun", begin: "Begin", continue: "Continue", replay: "Replay", language: "Language", settings: "Settings", credits: "Credits", creditsTitle: "Credits", creditsBody: "Created for a college game jam. Story, art direction, and game development by the DWARKA team.", close: "Close", archive: "Story archive", source: "Adapted from the Jaiminiya Ashvamedha Parva" },
  hi: { subtitle: "कागज़ी सूरज वाला बालक", begin: "आरंभ करें", continue: "जारी रखें", replay: "फिर खेलें", language: "भाषा", settings: "सेटिंग्स", credits: "श्रेय", creditsTitle: "श्रेय", creditsBody: "एक कॉलेज गेम जैम के लिए निर्मित। कथा, कला निर्देशन और खेल विकास: DWARKA टीम।", close: "बंद करें", archive: "कथा संग्रह", source: "जैमिनीय अश्वमेध पर्व से रूपांतरित" },
  ta: { subtitle: "காகிதச் சூரியன் கொண்ட சிறுவன்", begin: "தொடங்கு", continue: "தொடர்க", replay: "மீண்டும் ஆடு", language: "மொழி", settings: "அமைப்புகள்", credits: "நன்றிகள்", creditsTitle: "நன்றிகள்", creditsBody: "கல்லூரி விளையாட்டு விழாவிற்காக உருவாக்கப்பட்டது. கதை, கலை இயக்கம் மற்றும் விளையாட்டு உருவாக்கம்: DWARKA குழு.", close: "மூடு", archive: "கதைத் தொகுப்பு", source: "ஜைமினிய அசுவமேத பர்வத்திலிருந்து தழுவப்பட்டது" },
  kn: { subtitle: "ಕಾಗದದ ಸೂರ್ಯನ ಬಾಲಕ", begin: "ಪ್ರಾರಂಭಿಸಿ", continue: "ಮುಂದುವರಿಸಿ", replay: "ಮತ್ತೆ ಆಡಿ", language: "ಭಾಷೆ", settings: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು", credits: "ಶ್ರೇಯಗಳು", creditsTitle: "ಶ್ರೇಯಗಳು", creditsBody: "ಕಾಲೇಜು ಗೇಮ್ ಜಾಮ್‌ಗಾಗಿ ರಚಿಸಲಾಗಿದೆ. ಕಥೆ, ಕಲಾ ನಿರ್ದೇಶನ ಮತ್ತು ಆಟದ ಅಭಿವೃದ್ಧಿ: DWARKA ತಂಡ.", close: "ಮುಚ್ಚಿ", archive: "ಕಥಾ ಸಂಗ್ರಹ", source: "ಜೈಮಿನೀಯ ಅಶ್ವಮೇಧ ಪರ್ವದಿಂದ ರೂಪಾಂತರಿಸಲಾಗಿದೆ" },
  te: { subtitle: "కాగితపు సూర్యుడున్న బాలుడు", begin: "ప్రారంభించండి", continue: "కొనసాగించండి", replay: "మళ్లీ ఆడండి", language: "భాష", settings: "సెట్టింగ్స్", credits: "రూపకర్తలు", creditsTitle: "రూపకర్తలు", creditsBody: "కాలేజీ గేమ్ జామ్ కోసం రూపొందించబడింది. కథ, కళా దర్శకత్వం మరియు గేమ్ అభివృద్ధి: DWARKA బృందం.", close: "మూసివేయండి", archive: "కథల భాండాగారం", source: "జైమినీయ అశ్వమేధ పర్వం నుండి స్వీకరించబడింది" },
};

function LanguageSelect({ value, onChange, label }: { value: Locale; onChange: (locale: Locale) => void; label: string }) {
  return <label>{label}<select value={value} onChange={(event) => onChange(event.target.value as Locale)}>{locales.map((locale) => <option value={locale} key={locale}>{languageNames[locale]}</option>)}</select></label>;
}

function ControlBlueprint({ copy }: { copy: ChapterDictionary["controls"] }) {
  return <div className="control-blueprint">
    <div className="keyboard-map" aria-label="W A S D"><kbd>W</kbd><span /><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div>
    <p>{copy.movement}</p>
    <div className="mouse-map" aria-label={`${copy.leftMouse}, ${copy.rightMouse}`}><span><b>{copy.leftMouse}</b>{copy.blade}</span><span><b>{copy.rightMouse}</b>{copy.bow}</span></div>
    <p>{copy.mouse}</p><p className="control-note">{copy.contextual}</p>
    <dl className="control-shortcuts"><div><dt>Shift</dt><dd>{copy.sprint}</dd></div><div><dt>Space</dt><dd>{copy.dodge}</dd></div><div><dt>E</dt><dd>{copy.interact}</dd></div><div><dt>Esc</dt><dd>{copy.pause}</dd></div></dl>
  </div>;
}

export default function Home() {
  const [profile, setProfile] = useState<ChapterProfile | null>(null);
  const [storyOpen, setStoryOpen] = useState(false);
  const [panel, setPanel] = useState(0);
  const [skipConfirm, setSkipConfirm] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState(false);
  const storyVoiceRef = useRef<HTMLAudioElement | null>(null);
  const languageDialogRef = useRef<HTMLDivElement | null>(null);
  const settingsDialogRef = useRef<HTMLDivElement | null>(null);
  const creditsDialogRef = useRef<HTMLDivElement | null>(null);
  const storyDialogRef = useRef<HTMLDivElement | null>(null);
  const settingsInvokerRef = useRef<HTMLElement | null>(null);
  const languageInvokerRef = useRef<HTMLElement | null>(null);
  const creditsInvokerRef = useRef<HTMLElement | null>(null);
  const voiceLocale = profile?.settings.voiceLocale;
  const masterVolume = profile?.settings.master;
  const dialogueVolume = profile?.settings.dialogue;
  const muteAll = profile?.settings.muteAll;

  useEffect(() => {
    // Browser storage is the external source for this client-only profile.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(readProfile());
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = () => setProfile(readProfile());
    const storage = (event: StorageEvent) => { if (event.key?.startsWith("dwarka.chapter1")) setProfile(readProfile()); };
    window.addEventListener("storage", storage);
    return () => { channel.close(); window.removeEventListener("storage", storage); };
  }, []);

  useEffect(() => {
    document.documentElement.lang = profile?.settings.locale ?? "en";
  }, [profile?.settings.locale]);

  useEffect(() => {
    if (!storyOpen) return;
    const keyboard = (event: KeyboardEvent) => {
      if (skipConfirm || settingsOpen) return;
      if (event.key === "ArrowLeft" && panel > 0) setPanel((value) => value - 1);
      if (event.key === "ArrowRight" && panel < panels.length - 1) setPanel((value) => value + 1);
      if (event.key === "Escape") setStoryOpen(false);
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [storyOpen, skipConfirm, settingsOpen, panel]);

  useEffect(() => {
    let cancelled = false;
    const stop = () => { storyVoiceRef.current?.pause(); storyVoiceRef.current = null; };
    stop();
    if (!storyOpen || settingsOpen) return stop;
    if (!voiceLocale || muteAll || (masterVolume ?? 0) <= 0 || (dialogueVolume ?? 0) <= 0) return stop;
    loadVoiceEntries().then((entries) => {
      if (cancelled) return;
      const entry = entries.find((candidate) => candidate.sourceLineId === panelVoiceIds[panel] && candidate.locale === voiceLocale && candidate.status === "validated");
      const probe = document.createElement("audio");
      const asset = entry?.assets.find((candidate) => candidate.codec === "ogg" && probe.canPlayType("audio/ogg")) ?? entry?.assets.find((candidate) => candidate.codec === "mp3") ?? entry?.assets[0];
      if (!asset) { setVoiceNotice(true); return; }
      setVoiceNotice(false);
      const audio = new Audio(asset.runtimePath); audio.volume = Math.max(0, Math.min(1, (masterVolume ?? 1) * (dialogueVolume ?? 1))); storyVoiceRef.current = audio;
      audio.addEventListener("error", () => { if (!cancelled) setVoiceNotice(true); }, { once: true });
      audio.play().catch(() => { if (!cancelled) setVoiceNotice(true); });
    }).catch(() => { if (!cancelled) setVoiceNotice(true); });
    return () => { cancelled = true; stop(); };
  }, [storyOpen, settingsOpen, panel, voiceLocale, masterVolume, dialogueVolume, muteAll]);

  useEffect(() => {
    const audio = storyVoiceRef.current; if (!audio) return;
    audio.volume = muteAll ? 0 : Math.max(0, Math.min(1, (masterVolume ?? 1) * (dialogueVolume ?? 1)));
  }, [masterVolume, dialogueVolume, muteAll]);

  useEffect(() => {
    const dialog = !profile?.settings.languageChosen || languageOpen
      ? languageDialogRef.current
      : resetConfirm
        ? document.querySelector<HTMLElement>(".settings-dialog .confirm-dialog")
        : skipConfirm
          ? document.querySelector<HTMLElement>(".story-reader .confirm-dialog")
          : settingsOpen
            ? settingsDialogRef.current
            : creditsOpen
              ? creditsDialogRef.current
            : storyOpen
              ? storyDialogRef.current
              : null;
    if (!dialog) return;
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]), select:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'));
    const elements = focusable();
    elements[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && settingsOpen && !resetConfirm) {
        event.preventDefault(); setSettingsOpen(false); settingsInvokerRef.current?.focus(); return;
      }
      if (event.key === "Escape" && languageOpen && profile?.settings.languageChosen) {
        event.preventDefault(); setLanguageOpen(false); languageInvokerRef.current?.focus(); return;
      }
      if (event.key === "Escape" && creditsOpen) {
        event.preventDefault(); setCreditsOpen(false); creditsInvokerRef.current?.focus(); return;
      }
      if (event.key === "Escape" && resetConfirm) { event.preventDefault(); setResetConfirm(false); return; }
      if (event.key === "Escape" && skipConfirm) { event.preventDefault(); setSkipConfirm(false); return; }
      if (event.key !== "Tab") return;
      const items = focusable(); if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [profile?.settings.languageChosen, languageOpen, creditsOpen, settingsOpen, resetConfirm, storyOpen, skipConfirm]);

  const locale = profile?.settings.locale ?? "en";
  const copy = dictionaries[locale];
  const menuCopy = titleCopy[locale];
  const action = useMemo(() => {
    if (profile?.progressSummary?.chapterComplete) return { kind: "game" as const, href: "/game/chapter-1?replay=1" };
    if (profile?.progressToken && profile.progressSummary) return { kind: "game" as const, href: "/game/chapter-1" };
    if (profile?.storyIntroComplete) return { kind: "game" as const, href: "/game/chapter-1" };
    return { kind: "story" as const, href: "#chapter-0" };
  }, [profile]);
  const titleStatus = profile?.progressSummary?.chapterComplete
    ? copy.home.complete
    : profile?.progressToken && profile.progressSummary
      ? copy.phases[profile.progressSummary.nextPhase]
      : profile?.storyIntroComplete
        ? copy.home.heroCaptionLabel
        : copy.chapter0.label;

  function persist(next: ChapterProfile) { setProfile(saveProfile(next)); }
  function completeStory(startGame = false) {
    const current = profile ?? readProfile();
    persist({ ...current, storyIntroComplete: true });
    setStoryOpen(false); setSkipConfirm(false);
    if (startGame) window.location.assign("/game/chapter-1");
  }
  function startPrimary() { if (action.kind === "story") { setPanel(0); setStoryOpen(true); } else window.location.assign(action.href); }
  function openSettings() { settingsInvokerRef.current = document.activeElement as HTMLElement | null; window.scrollTo(0, 0); setSettingsOpen(true); }
  function openLanguage() { languageInvokerRef.current = document.activeElement as HTMLElement | null; setLanguageOpen(true); }
  function openCredits() { creditsInvokerRef.current = document.activeElement as HTMLElement | null; setCreditsOpen(true); }
  function saveSetting<K extends keyof ChapterSettings>(key: K, value: ChapterSettings[K]) {
    const current = profile ?? readProfile();
    setProfile(updateSettings(current, { [key]: value }));
  }
  function chooseLanguage(nextLocale: Locale) {
    const current = profile ?? readProfile();
    setProfile(updateSettings(current, { locale: nextLocale, voiceLocale: nextLocale, voiceLinked: true, languageChosen: true }));
    if (languageOpen) {
      setLanguageOpen(false);
      requestAnimationFrame(() => languageInvokerRef.current?.focus());
    }
  }
  function chooseTextLanguage(nextLocale: Locale) {
    const current = profile ?? readProfile();
    setProfile(updateSettings(current, current.settings.voiceLinked ? { locale: nextLocale, voiceLocale: nextLocale } : { locale: nextLocale }));
  }
  function chooseVoiceLanguage(nextLocale: Locale) {
    const current = profile ?? readProfile();
    setProfile(updateSettings(current, { voiceLocale: nextLocale, voiceLinked: nextLocale === current.settings.locale }));
  }
  function confirmReset() {
    const current = profile ?? readProfile();
    setProfile(resetProgress(current)); setResetConfirm(false); setSettingsOpen(false);
  }
  function resetTutorials() {
    const current = profile ?? readProfile();
    setProfile(updateSettings(current, { tutorials: true, tutorialDone: [] }));
  }
  function toggleStoryMute() {
    const current = profile ?? readProfile();
    if (current.settings.muteAll) setProfile(updateSettings(current, { muteAll: false }));
    else saveSetting("dialogue", current.settings.dialogue > 0 ? 0 : 1);
  }

  const currentPanel = copy.chapter0.panels[panel];
  const storyMuted = (profile?.settings.muteAll ?? false) || (profile?.settings.dialogue ?? 1) === 0;

  return (
    <main className="title-page" lang={locale}>
      <section className="title-screen" aria-labelledby="page-title">
        <div className="title-art" aria-hidden="true">
          <Image src="/brand/title-key-art.jpeg" alt="" fill sizes="100vw" priority />
        </div>
        <div className="title-vignette" aria-hidden="true" />
        <div className="title-grain" aria-hidden="true" />

        <div className="title-lockup">
          <h1 className="sr-only" id="page-title">DWARKA: The Lost City</h1>
          <p className="title-chapter">Chapter I <span aria-hidden="true">/</span> {menuCopy.subtitle}</p>
          <p className="title-status" aria-live="polite">{titleStatus}</p>
          <button className="title-primary" type="button" onClick={startPrimary}>
            <span>{profile?.progressSummary?.chapterComplete ? menuCopy.replay : profile?.progressToken || profile?.storyIntroComplete ? menuCopy.continue : menuCopy.begin}</span>
            <span aria-hidden="true">→</span>
          </button>
          <nav className="title-menu" aria-label="Game menu">
            <button type="button" onClick={openLanguage}>{menuCopy.language}</button>
            <button className="settings-entry" type="button" onClick={openSettings}>{menuCopy.settings}</button>
            <button type="button" onClick={openCredits}>{menuCopy.credits}</button>
          </nav>
        </div>

        <footer className="title-footer">
          <p>{menuCopy.source}</p>
          <details className="title-archive">
            <summary>{menuCopy.archive}</summary>
            <nav aria-label={copy.home.archiveLabel}>{stories.map((story, index) => <Link key={story.id} href={story.href}>{copy.home.stories[index].title}</Link>)}</nav>
          </details>
        </footer>
      </section>

      {storyOpen ? <div ref={storyDialogRef} className="story-reader" role="dialog" aria-modal="true" aria-labelledby="story-title">
        <div className="story-reader-top"><div><p className="eyebrow">{copy.chapter0.label}</p><p className="attribution">{copy.chapter0.attribution}</p></div><button type="button" onClick={() => setStoryOpen(false)} aria-label={copy.chapter0.close}>{copy.chapter0.close}</button></div>
        <figure><Image src={panels[panel]} alt={currentPanel.text} width={1536} height={1024} priority /><figcaption><span>{String(panel + 1).padStart(2, "0")} / 05</span><div><h2 id="story-title">{currentPanel.title}</h2><p>{currentPanel.text}</p>{voiceNotice ? <p role="status">{copy.chapter0.voiceUnavailable}</p> : null}</div></figcaption></figure>
        <div className="story-controls"><button type="button" disabled={panel === 0} onClick={() => setPanel((value) => value - 1)}>{copy.chapter0.back}</button><button type="button" aria-pressed={profile?.settings.captions !== false} onClick={() => saveSetting("captions", profile?.settings.captions === false)}>{profile?.settings.captions === false ? copy.chapter0.captionsOff : copy.chapter0.captionsOn}</button><button type="button" aria-pressed={storyMuted} onClick={toggleStoryMute}>{storyMuted ? copy.chapter0.unmute : copy.chapter0.mute}</button><button type="button" onClick={() => setSkipConfirm(true)}>{copy.chapter0.skip}</button>{panel < panels.length - 1 ? <button className="primary" type="button" onClick={() => setPanel((value) => value + 1)}>{copy.chapter0.next}</button> : <button className="primary" type="button" onClick={() => completeStory(true)}>{copy.chapter0.beginChapter1}</button>}</div>
        {skipConfirm ? <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="skip-title"><div><p className="eyebrow">{copy.chapter0.skipLabel}</p><h2 id="skip-title">{copy.chapter0.skipTitle}</h2><p>{copy.chapter0.skipBody}</p><div><button type="button" onClick={() => setSkipConfirm(false)}>{copy.chapter0.cancel}</button><button className="primary" type="button" onClick={() => completeStory(true)}>{copy.chapter0.skipConfirm}</button></div></div></div> : null}
      </div> : null}

      {settingsOpen ? <div ref={settingsDialogRef} className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title"><div className="settings-panel"><p className="eyebrow">DWARKA</p><h2 id="settings-title">{copy.settings.title}</h2>
        <section className="settings-group" aria-labelledby="settings-language"><h3 id="settings-language">{copy.settings.language}</h3>
          <LanguageSelect label={copy.settings.textLanguage} value={locale} onChange={chooseTextLanguage} />
          <LanguageSelect label={copy.settings.voiceLanguage} value={profile?.settings.voiceLocale ?? locale} onChange={chooseVoiceLanguage} />
        </section>
        <section className="settings-group" aria-labelledby="settings-audio"><h3 id="settings-audio">{copy.settings.audio}</h3>
          <label>{copy.settings.master}<input type="range" min="0" max="1" step="0.1" value={profile?.settings.master ?? 1} onChange={(event) => saveSetting("master", Number(event.target.value))} /></label>
          <label>{copy.settings.music}<input type="range" min="0" max="1" step="0.1" value={profile?.settings.music ?? .7} onChange={(event) => saveSetting("music", Number(event.target.value))} /></label>
          <label>{copy.settings.effects}<input type="range" min="0" max="1" step="0.1" value={profile?.settings.effects ?? .8} onChange={(event) => saveSetting("effects", Number(event.target.value))} /></label>
          <label>{copy.settings.voice}<input type="range" min="0" max="1" step="0.1" value={profile?.settings.dialogue ?? 1} onChange={(event) => saveSetting("dialogue", Number(event.target.value))} /></label>
          <label className="check"><input type="checkbox" checked={profile?.settings.muteAll === true} onChange={(event) => saveSetting("muteAll", event.target.checked)} /> {copy.settings.muteAll}</label>
        </section>
        <section className="settings-group" aria-labelledby="settings-accessibility"><h3 id="settings-accessibility">{copy.settings.accessibility}</h3>
          <label className="check"><input type="checkbox" checked={profile?.settings.captions !== false} onChange={(event) => saveSetting("captions", event.target.checked)} /> {copy.settings.captions}</label>
          <label className="check"><input type="checkbox" checked={profile?.settings.speakerNames !== false} onChange={(event) => saveSetting("speakerNames", event.target.checked)} /> {copy.settings.speakerNames}</label>
          <label className="check"><input type="checkbox" checked={profile?.settings.cameraShake !== false} onChange={(event) => saveSetting("cameraShake", event.target.checked)} /> {copy.settings.cameraShake}</label>
          <label className="check"><input type="checkbox" checked={profile?.settings.tutorials !== false} onChange={(event) => saveSetting("tutorials", event.target.checked)} /> {copy.settings.tutorials}</label>
          <button type="button" onClick={resetTutorials}>{copy.settings.resetTutorials}</button>
        </section>
        <section className="settings-group" aria-labelledby="settings-controls"><h3 id="settings-controls">{copy.settings.controls}</h3><ControlBlueprint copy={copy.controls} /></section>
        <section className="settings-group progress-settings" aria-labelledby="settings-progress"><h3 id="settings-progress">{copy.settings.progress}</h3><button className="danger-button" type="button" onClick={() => setResetConfirm(true)}>{copy.settings.reset}</button></section>
        <div className="settings-actions"><button type="button" onClick={() => { setSettingsOpen(false); requestAnimationFrame(() => settingsInvokerRef.current?.focus()); }}>{copy.settings.done}</button></div>
      </div>{resetConfirm ? <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="reset-title"><div><p className="eyebrow">{copy.settings.resetLabel}</p><h2 id="reset-title">{copy.settings.resetTitle}</h2><p>{copy.settings.resetBody}</p><div><button type="button" onClick={() => setResetConfirm(false)}>{copy.settings.cancel}</button><button className="danger-button" type="button" onClick={confirmReset}>{copy.settings.resetConfirm}</button></div></div></div> : null}</div> : null}

      {creditsOpen ? <div ref={creditsDialogRef} className="credits-dialog" role="dialog" aria-modal="true" aria-labelledby="credits-title"><div><p className="eyebrow">DWARKA</p><h2 id="credits-title">{menuCopy.creditsTitle}</h2><p>{menuCopy.creditsBody}</p><button type="button" onClick={() => { setCreditsOpen(false); requestAnimationFrame(() => creditsInvokerRef.current?.focus()); }}>{menuCopy.close}</button></div></div> : null}

      {profile && (!profile.settings.languageChosen || languageOpen) ? <div ref={languageDialogRef} className="language-chooser" role="dialog" aria-modal="true" aria-labelledby="language-title"><div><p className="eyebrow">DWARKA</p><h2 id="language-title">{dictionaries[locale].languageChooser.title}</h2><p>{dictionaries[locale].languageChooser.description}</p><div className="language-options">{locales.map((option) => <button type="button" lang={option} key={option} onClick={() => chooseLanguage(option)}>{languageNames[option]}</button>)}</div>{profile.settings.languageChosen ? <button className="language-close" type="button" onClick={() => { setLanguageOpen(false); requestAnimationFrame(() => languageInvokerRef.current?.focus()); }}>{menuCopy.close}</button> : null}</div></div> : null}
    </main>
  );
}
