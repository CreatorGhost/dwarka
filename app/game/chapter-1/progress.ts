import { isLocale, type Locale } from "./localization";

export const PROFILE_KEY = "dwarka.chapter1.profile.v1";
export const PREFERENCES_KEY = "dwarka.chapter1.preferences.v1";
export const CHANNEL_NAME = "dwarka.chapter1.progress";

// PROFILE_STORAGE_HELPERS_START
type ProfileStorageBackend = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function createProfileStorage(backend?: ProfileStorageBackend) {
  const memory = new Map<string, string>();
  let durable = Boolean(backend);

  return {
    getItem(key: string) {
      if (durable && backend) {
        try {
          const value = backend.getItem(key);
          if (value === null) {
            memory.delete(key);
            return null;
          }
          memory.set(key, value);
          return value;
        } catch {
          durable = false;
        }
      }
      return memory.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      memory.set(key, value);
      if (!durable || !backend) return;
      try {
        backend.setItem(key, value);
      } catch {
        durable = false;
      }
    },
    removeItem(key: string) {
      memory.delete(key);
      if (!durable || !backend) return;
      try {
        backend.removeItem(key);
      } catch {
        durable = false;
      }
    },
    isDurable() {
      return durable;
    },
  };
}
// PROFILE_STORAGE_HELPERS_END

const profileStorage = createProfileStorage(
  typeof globalThis.localStorage === "undefined" ? undefined : globalThis.localStorage,
);

function announceProfile(message: unknown) {
  if (typeof globalThis.BroadcastChannel !== "function") return;
  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(message);
    channel.close();
  } catch {
    // Storage and cross-tab messaging may both be denied in privacy modes. The
    // in-memory profile still keeps this tab internally consistent.
  }
}

export function isProfileStorageDurable() {
  return profileStorage.isDurable();
}

export type ChapterPhase = "arrival" | "courtyard" | "market" | "doorway" | "ending" | "complete";
export type ChapterSettings = {
  locale: Locale;
  voiceLocale: Locale;
  voiceLinked: boolean;
  languageChosen: boolean;
  master: number;
  music: number;
  effects: number;
  dialogue: number;
  muteAll: boolean;
  captions: boolean;
  speakerNames: boolean;
  cameraShake: boolean;
  tutorials: boolean;
  tutorialDone: string[];
};
export type ProgressSummary = { furthestCompletedPhase: ChapterPhase; nextPhase: ChapterPhase; chapterComplete: boolean; updatedAt: string };
export type ChapterProfile = {
  schemaVersion: 1;
  anonymousPlayerId: string;
  storyIntroComplete: boolean;
  progressToken: string | null;
  progressSummary: ProgressSummary | null;
  settings: ChapterSettings;
};

export const defaultSettings: ChapterSettings = {
  locale: "en", voiceLocale: "en", voiceLinked: true, languageChosen: false,
  master: 1, music: 0.7, effects: 0.8, dialogue: 1, muteAll: false,
  captions: true, speakerNames: true, cameraShake: true, tutorials: true, tutorialDone: [],
};
export const phaseRank: Record<ChapterPhase, number> = { arrival: 0, courtyard: 1, market: 2, doorway: 3, ending: 4, complete: 5 };
export const phaseLabel: Record<ChapterPhase, string> = {
  arrival: "Return to the quarter", courtyard: "Protect the courtyard family", market: "Clear the market bend",
  doorway: "Reach the charioteers' doorway", ending: "The paper sun", complete: "Chapter 1 complete",
};

function safeSettings(value: unknown): ChapterSettings {
  if (!value || typeof value !== "object") return { ...defaultSettings };
  const raw = value as Partial<ChapterSettings> & { voice?: number };
  const volume = (candidate: unknown, fallback: number) => typeof candidate === "number" && Number.isFinite(candidate) ? Math.max(0, Math.min(1, candidate)) : fallback;
  const locale = isLocale(raw.locale) ? raw.locale : defaultSettings.locale;
  return {
    locale,
    voiceLocale: isLocale(raw.voiceLocale) ? raw.voiceLocale : locale,
    voiceLinked: raw.voiceLinked !== false,
    languageChosen: raw.languageChosen === true,
    master: volume(raw.master, defaultSettings.master),
    music: volume(raw.music, defaultSettings.music),
    effects: volume(raw.effects, defaultSettings.effects),
    dialogue: volume(raw.dialogue ?? raw.voice, defaultSettings.dialogue),
    muteAll: raw.muteAll === true,
    captions: raw.captions !== false,
    speakerNames: raw.speakerNames !== false,
    cameraShake: raw.cameraShake !== false,
    tutorials: raw.tutorials !== false,
    tutorialDone: Array.isArray(raw.tutorialDone) ? raw.tutorialDone.filter((item): item is string => typeof item === "string") : [],
  };
}

function newPlayerId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-4aaa-8aaa-${Math.random().toString(16).slice(2)}`;
}

export function readProfile(): ChapterProfile {
  let parsed: Partial<ChapterProfile> | null = null;
  try { parsed = JSON.parse(profileStorage.getItem(PROFILE_KEY) ?? "null"); } catch { parsed = null; }
  let preferences: unknown = null;
  try { preferences = JSON.parse(profileStorage.getItem(PREFERENCES_KEY) ?? "null"); } catch { preferences = null; }
  if (!parsed || parsed.schemaVersion !== 1 || typeof parsed.anonymousPlayerId !== "string") {
    return { schemaVersion: 1, anonymousPlayerId: newPlayerId(), storyIntroComplete: false, progressToken: null, progressSummary: null, settings: safeSettings(parsed?.settings ?? preferences) };
  }
  const progressToken = typeof parsed.progressToken === "string" && parsed.progressToken.length > 0 ? parsed.progressToken : null;
  return {
    schemaVersion: 1,
    anonymousPlayerId: parsed.anonymousPlayerId,
    storyIntroComplete: Boolean(parsed.storyIntroComplete),
    progressToken,
    progressSummary: progressToken ? parsed.progressSummary ?? null : null,
    settings: safeSettings(parsed.settings ?? preferences),
  };
}

export function saveProfile(profile: ChapterProfile, announce = true): ChapterProfile {
  profileStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  profileStorage.setItem(PREFERENCES_KEY, JSON.stringify(profile.settings));
  if (announce) announceProfile({ type: "profile", profile });
  return profile;
}

export function mergeServerProgress(current: ChapterProfile, progressToken: string, incoming: ProgressSummary): ChapterProfile {
  const existing = current.progressSummary;
  if (existing?.chapterComplete && !incoming.chapterComplete) return current;
  if (existing && !incoming.chapterComplete && phaseRank[incoming.nextPhase] < phaseRank[existing.nextPhase]) return current;
  return saveProfile({ ...current, progressToken, progressSummary: incoming });
}

export function updateSettings(current: ChapterProfile, settings: Partial<ChapterSettings> & { voice?: number }): ChapterProfile {
  const normalized = settings.dialogue === undefined && typeof settings.voice === "number" ? { ...settings, dialogue: settings.voice } : settings;
  return saveProfile({ ...current, settings: safeSettings({ ...current.settings, ...normalized }) });
}

export function resetProgress(current: ChapterProfile): ChapterProfile {
  try { localStorage.removeItem(PROFILE_KEY); } catch { /* The memory store below remains authoritative. */ }
  profileStorage.removeItem(PROFILE_KEY);
  profileStorage.setItem(PREFERENCES_KEY, JSON.stringify(current.settings));
  const reset = { schemaVersion: 1 as const, anonymousPlayerId: newPlayerId(), storyIntroComplete: false, progressToken: null, progressSummary: null, settings: current.settings };
  announceProfile({ type: "reset", profile: reset });
  return reset;
}
