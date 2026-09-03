"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ChapterZeroCinematic from "./ChapterZeroCinematic";
import EmberField from "./EmberField";
import { dictionaries, languageNames, locales, type ChapterDictionary, type Locale } from "./game/chapter-1/localization";
import { CHANNEL_NAME, readProfile, resetProgress, saveProfile, updateSettings, type ChapterProfile, type ChapterSettings } from "./game/chapter-1/progress";

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
  watchStory: string;
  completeBadge: string;
}> = {
  en: { subtitle: "The Boy with the Paper Sun", begin: "Begin", continue: "Continue", replay: "Replay", language: "Language", settings: "Settings", credits: "Credits", creditsTitle: "Credits", creditsBody: "Created for a college game jam. Story, art direction, and game development by the DWARKA team. Adapted from the Jaiminiya Ashvamedha Parva. Opening music: \u201cLast 31\u201d by Tri-Tachyon (CC-BY 4.0). Ambience: \u201cSearching\u201d by yd (CC0). Models and sound effects by Quaternius, Kenney and Poly Haven (CC0).", close: "Close", archive: "Story archive", source: "Adapted from the Jaiminiya Ashvamedha Parva", watchStory: "Watch the opening", completeBadge: "Chapter complete" },
  hi: { subtitle: "कागज़ी सूरज वाला बालक", begin: "आरंभ करें", continue: "जारी रखें", replay: "फिर खेलें", language: "भाषा", settings: "सेटिंग्स", credits: "श्रेय", creditsTitle: "श्रेय", creditsBody: "एक कॉलेज गेम जैम के लिए निर्मित। कथा, कला निर्देशन और खेल विकास: DWARKA टीम। जैमिनीय अश्वमेध पर्व से रूपांतरित। आरंभिक संगीत: \u201cLast 31\u201d, Tri-Tachyon (CC-BY 4.0)। परिवेश ध्वनि: \u201cSearching\u201d, yd (CC0)। मॉडल और ध्वनि प्रभाव: Quaternius, Kenney, Poly Haven (CC0)।", close: "बंद करें", archive: "कथा संग्रह", source: "जैमिनीय अश्वमेध पर्व से रूपांतरित", watchStory: "आरंभिक कथा देखें", completeBadge: "अध्याय पूर्ण" },
  ta: { subtitle: "காகிதச் சூரியன் கொண்ட சிறுவன்", begin: "தொடங்கு", continue: "தொடர்க", replay: "மீண்டும் ஆடு", language: "மொழி", settings: "அமைப்புகள்", credits: "நன்றிகள்", creditsTitle: "நன்றிகள்", creditsBody: "கல்லூரி விளையாட்டு விழாவிற்காக உருவாக்கப்பட்டது. கதை, கலை இயக்கம் மற்றும் விளையாட்டு உருவாக்கம்: DWARKA குழு. ஜைமினிய அசுவமேத பர்வத்திலிருந்து தழுவப்பட்டது. தொடக்க இசை: \u201cLast 31\u201d, Tri-Tachyon (CC-BY 4.0). சூழல் ஒலி: \u201cSearching\u201d, yd (CC0). மாதிரிகள் மற்றும் ஒலி விளைவுகள்: Quaternius, Kenney, Poly Haven (CC0).", close: "மூடு", archive: "கதைத் தொகுப்பு", source: "ஜைமினிய அசுவமேத பர்வத்திலிருந்து தழுவப்பட்டது", watchStory: "தொடக்கக் காட்சியைப் பார்", completeBadge: "அத்தியாயம் முடிந்தது" },
  kn: { subtitle: "ಕಾಗದದ ಸೂರ್ಯನ ಬಾಲಕ", begin: "ಪ್ರಾರಂಭಿಸಿ", continue: "ಮುಂದುವರಿಸಿ", replay: "ಮತ್ತೆ ಆಡಿ", language: "ಭಾಷೆ", settings: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು", credits: "ಶ್ರೇಯಗಳು", creditsTitle: "ಶ್ರೇಯಗಳು", creditsBody: "ಕಾಲೇಜು ಗೇಮ್ ಜಾಮ್‌ಗಾಗಿ ರಚಿಸಲಾಗಿದೆ. ಕಥೆ, ಕಲಾ ನಿರ್ದೇಶನ ಮತ್ತು ಆಟದ ಅಭಿವೃದ್ಧಿ: DWARKA ತಂಡ. ಜೈಮಿನೀಯ ಅಶ್ವಮೇಧ ಪರ್ವದಿಂದ ರೂಪಾಂತರಿಸಲಾಗಿದೆ. ಆರಂಭಿಕ ಸಂಗೀತ: \u201cLast 31\u201d, Tri-Tachyon (CC-BY 4.0). ಪರಿಸರ ಧ್ವನಿ: \u201cSearching\u201d, yd (CC0). ಮಾದರಿಗಳು ಮತ್ತು ಧ್ವನಿ ಪರಿಣಾಮಗಳು: Quaternius, Kenney, Poly Haven (CC0).", close: "ಮುಚ್ಚಿ", archive: "ಕಥಾ ಸಂಗ್ರಹ", source: "ಜೈಮಿನೀಯ ಅಶ್ವಮೇಧ ಪರ್ವದಿಂದ ರೂಪಾಂತರಿಸಲಾಗಿದೆ", watchStory: "ಆರಂಭಿಕ ಕಥೆ ನೋಡಿ", completeBadge: "ಅಧ್ಯಾಯ ಪೂರ್ಣ" },
  te: { subtitle: "కాగితపు సూర్యుడున్న బాలుడు", begin: "ప్రారంభించండి", continue: "కొనసాగించండి", replay: "మళ్లీ ఆడండి", language: "భాష", settings: "సెట్టింగ్స్", credits: "రూపకర్తలు", creditsTitle: "రూపకర్తలు", creditsBody: "కాలేజీ గేమ్ జామ్ కోసం రూపొందించబడింది. కథ, కళా దర్శకత్వం మరియు గేమ్ అభివృద్ధి: DWARKA బృందం. జైమినీయ అశ్వమేధ పర్వం నుండి స్వీకరించబడింది. ప్రారంభ సంగీతం: \u201cLast 31\u201d, Tri-Tachyon (CC-BY 4.0). పరిసర ధ్వని: \u201cSearching\u201d, yd (CC0). మోడల్స్ మరియు ధ్వని ప్రభావాలు: Quaternius, Kenney, Poly Haven (CC0).", close: "మూసివేయండి", archive: "కథల భాండాగారం", source: "జైమినీయ అశ్వమేధ పర్వం నుండి స్వీకరించబడింది", watchStory: "ప్రారంభ కథ చూడండి", completeBadge: "అధ్యాయం పూర్తైంది" },
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
  const [storyMode, setStoryMode] = useState<"enter" | "replay" | "watch" | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const languageDialogRef = useRef<HTMLDivElement | null>(null);
  const settingsDialogRef = useRef<HTMLDivElement | null>(null);
  const creditsDialogRef = useRef<HTMLDivElement | null>(null);
  const settingsInvokerRef = useRef<HTMLElement | null>(null);
  const languageInvokerRef = useRef<HTMLElement | null>(null);
  const creditsInvokerRef = useRef<HTMLElement | null>(null);
  const watchInvokerRef = useRef<HTMLElement | null>(null);

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
    const dialog = !profile?.settings.languageChosen || languageOpen
      ? languageDialogRef.current
      : resetConfirm
        ? document.querySelector<HTMLElement>(".settings-dialog .confirm-dialog")
        : settingsOpen
            ? settingsDialogRef.current
            : creditsOpen
              ? creditsDialogRef.current
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
      if (event.key !== "Tab") return;
      const items = focusable(); if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [profile?.settings.languageChosen, languageOpen, creditsOpen, settingsOpen, resetConfirm]);

  const locale = profile?.settings.locale ?? "en";
  const copy = dictionaries[locale];
  const menuCopy = titleCopy[locale];
  // Replay is a player asking to experience the chapter again, so it plays the
  // narration. Only a mid-chapter Continue resumes straight into the street.
  const action = useMemo(() => {
    if (profile?.progressSummary?.chapterComplete) return { kind: "story" as const, story: "replay" as const };
    if (profile?.progressToken && profile.progressSummary) return { kind: "game" as const, href: "/game/chapter-1" };
    if (profile?.storyIntroComplete) return { kind: "game" as const, href: "/game/chapter-1" };
    return { kind: "story" as const, story: "enter" as const };
  }, [profile]);
  const titleStatus = profile?.progressSummary?.chapterComplete
    ? copy.home.complete
    : profile?.progressToken && profile.progressSummary
      ? copy.phases[profile.progressSummary.nextPhase]
      : profile?.storyIntroComplete
        ? copy.home.heroCaptionLabel
        : copy.chapter0.label;

  function persist(next: ChapterProfile) { setProfile(saveProfile(next)); }
  function completeStory() {
    const current = profile ?? readProfile();
    persist({ ...current, storyIntroComplete: true });
    const mode = storyMode;
    setStoryMode(null);
    // "Watch the opening" returns to the title; the other two enter the street.
    if (mode === "watch") { requestAnimationFrame(() => watchInvokerRef.current?.focus()); return; }
    window.location.assign(mode === "replay" ? "/game/chapter-1?replay=1&entry=cinematic" : "/game/chapter-1?entry=cinematic");
  }
  function startPrimary() { if (action.kind === "story") setStoryMode(action.story); else window.location.assign(action.href); }
  function watchStory() { watchInvokerRef.current = document.activeElement as HTMLElement | null; setStoryMode("watch"); }
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
  return (
    <main className="title-page" lang={locale}>
      <section className="title-screen" aria-labelledby="page-title">
        <div className="title-art" aria-hidden="true">
          <Image src="/brand/title-key-art.jpeg" alt="" fill sizes="100vw" priority unoptimized />
        </div>
        <div className="title-vignette" aria-hidden="true" />
        <div className="title-grain" aria-hidden="true" />
        <EmberField />

        <div className="title-lockup">
          <h1 className="sr-only" id="page-title">DWARKA: The Lost City</h1>
          <p className="title-chapter">Chapter 1 <span aria-hidden="true">/</span> {menuCopy.subtitle}</p>
          <p className="title-status" aria-live="polite">{titleStatus}</p>
          <button className="title-primary" type="button" onClick={startPrimary}>
            <span>{profile?.progressSummary?.chapterComplete ? menuCopy.replay : profile?.progressToken || profile?.storyIntroComplete ? menuCopy.continue : menuCopy.begin}</span>
            <span aria-hidden="true">→</span>
          </button>
          <nav className="title-menu" aria-label="Game menu">
            {profile?.storyIntroComplete ? <button type="button" onClick={watchStory}>{menuCopy.watchStory}</button> : null}
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

      {storyMode && profile ? <ChapterZeroCinematic copy={copy} locale={locale} profile={profile} chapterTitle={menuCopy.subtitle} onSaveSetting={saveSetting} onComplete={completeStory} /> : null}

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
