import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { resolve, sep } from "node:path";

import {
  EXPECTED_VOICE_ASSET_COUNT,
  FIXED_VOICE_LINES,
  LOCALE_METADATA,
  ROLE_METADATA,
  VOICE_LOCALES,
  VOICE_ROLES,
  type VoiceLocale,
  type VoiceRole,
} from "./inventory.ts";

export type VoiceAsset = {
  codec: "mp3" | "ogg";
  mimeType: "audio/mpeg" | "audio/ogg";
  runtimePath: string;
  sha256: string;
  bytes: number;
  validation: {
    method: "sarvam-stt" | "not-validated";
    sttModel: string | null;
    similarity: number | null;
    transcriptSha256: string | null;
    detectedLanguage: string | null;
  };
};

export type VoiceManifestEntry = {
  sourceLineId: string;
  scope: "chapter-0" | "chapter-1";
  sequence: number;
  locale: VoiceLocale;
  bcp47: string;
  role: VoiceRole;
  personaId: string;
  providerVoice: string;
  text: string;
  cacheKey: string;
  generatedAt: string;
  status: "validated" | "development-fallback";
  provider: string;
  ttsModel: string;
  syntheticVoice: true;
  validation: {
    method: "sarvam-stt" | "not-validated";
    sttModel: string | null;
    similarity: number | null;
    transcriptSha256: string | null;
    detectedLanguage: string | null;
  };
  assets: VoiceAsset[];
};

export type VoiceManifest = {
  schemaVersion: 1;
  project: "dwarka";
  chapter: "chapter-1";
  generatedAt: string;
  provider: { id: string; ttsModel: string; sttModel: string | null; syntheticVoice: true; developmentFallback: boolean };
  locales: Array<{ code: VoiceLocale; bcp47: string; label: string }>;
  personas: Array<{ role: VoiceRole; personaId: string; label: string; description: string; providerVoice: string }>;
  lineCount: number;
  entryCount: number;
  assetCount: number;
  entries: VoiceManifestEntry[];
};

export function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export function cacheKeyFor(lineId: string, text: string, locale: VoiceLocale, personaId: string, provider: string, model: string): string {
  return sha256(JSON.stringify({ lineId, text, locale, personaId, provider, model })).slice(0, 16);
}

function normalizedCharacters(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\u200c\u200d]/g, "").replace(/[\p{P}\p{S}\p{Z}]+/gu, "");
}

function bigrams(value: string): Map<string, number> {
  const result = new Map<string, number>();
  const characters = [...value];
  if (characters.length === 1) result.set(characters[0], 1);
  for (let index = 0; index < characters.length - 1; index += 1) {
    const pair = characters[index] + characters[index + 1];
    result.set(pair, (result.get(pair) ?? 0) + 1);
  }
  return result;
}

function diceSimilarity(left: string, right: string): number {
  if (left === right) return 1;
  if (!left || !right) return 0;
  const leftBigrams = bigrams(left);
  const rightBigrams = bigrams(right);
  let overlap = 0;
  for (const [pair, count] of leftBigrams) overlap += Math.min(count, rightBigrams.get(pair) ?? 0);
  const leftSize = [...leftBigrams.values()].reduce((total, count) => total + count, 0);
  const rightSize = [...rightBigrams.values()].reduce((total, count) => total + count, 0);
  return (2 * overlap) / Math.max(1, leftSize + rightSize);
}

const SCRIPT_PATTERN: Record<VoiceLocale, RegExp> = {
  en: /\p{Script=Latin}/gu,
  hi: /\p{Script=Devanagari}/gu,
  ta: /\p{Script=Tamil}/gu,
  kn: /\p{Script=Kannada}/gu,
  te: /\p{Script=Telugu}/gu,
};

export function validateTranscript(expected: string, transcript: string, locale: VoiceLocale): { similarity: number; valid: boolean } {
  const normalizedExpected = normalizedCharacters(expected);
  const normalizedTranscript = normalizedCharacters(transcript);
  const similarity = diceSimilarity(normalizedExpected, normalizedTranscript);
  const scriptCount = transcript.match(SCRIPT_PATTERN[locale])?.length ?? 0;
  const expectedScriptCount = expected.match(SCRIPT_PATTERN[locale])?.length ?? 0;
  const scriptAware = locale === "en" ? scriptCount >= Math.min(3, expectedScriptCount) : scriptCount >= Math.min(2, expectedScriptCount);
  return { similarity, valid: scriptAware && similarity >= 0.62 };
}

export function createManifest(entries: VoiceManifestEntry[], provider: VoiceManifest["provider"], generatedAt: string): VoiceManifest {
  return {
    schemaVersion: 1,
    project: "dwarka",
    chapter: "chapter-1",
    generatedAt,
    provider,
    locales: VOICE_LOCALES.map((code) => ({ code, bcp47: LOCALE_METADATA[code].bcp47, label: LOCALE_METADATA[code].label })),
    personas: VOICE_ROLES.map((role) => ({ role, personaId: ROLE_METADATA[role].personaId, label: ROLE_METADATA[role].label, description: ROLE_METADATA[role].description, providerVoice: ROLE_METADATA[role].providerVoice })),
    lineCount: FIXED_VOICE_LINES.length,
    entryCount: entries.length,
    assetCount: entries.reduce((total, entry) => total + entry.assets.length, 0),
    entries: [...entries].sort((left, right) => left.scope.localeCompare(right.scope) || left.sequence - right.sequence || VOICE_LOCALES.indexOf(left.locale) - VOICE_LOCALES.indexOf(right.locale)),
  };
}

export async function validateManifest(manifest: VoiceManifest, publicRoot: string, requireValidated = true): Promise<string[]> {
  const errors: string[] = [];
  if (manifest.schemaVersion !== 1 || manifest.project !== "dwarka" || manifest.chapter !== "chapter-1") errors.push("manifest identity is invalid");
  if (manifest.lineCount !== FIXED_VOICE_LINES.length) errors.push("lineCount does not match the inventory");
  if (manifest.entryCount !== EXPECTED_VOICE_ASSET_COUNT || manifest.entries.length !== EXPECTED_VOICE_ASSET_COUNT) errors.push("entry count is incomplete");
  if (manifest.assetCount !== EXPECTED_VOICE_ASSET_COUNT * 2) errors.push("MP3 and OGG assets are required for every entry");
  const combinations = new Set<string>();
  for (const line of FIXED_VOICE_LINES) {
    for (const locale of VOICE_LOCALES) {
      const key = `${line.id}:${locale}`;
      const matches = manifest.entries.filter((entry) => `${entry.sourceLineId}:${entry.locale}` === key);
      if (matches.length !== 1) { errors.push(`${key} has ${matches.length} manifest entries`); continue; }
      const entry = matches[0];
      combinations.add(key);
      if (entry.text !== line.text[locale] || entry.role !== line.role || entry.personaId !== ROLE_METADATA[line.role].personaId) errors.push(`${key} does not match the inventory`);
      if (requireValidated && entry.status !== "validated") errors.push(`${key} is not STT validated`);
      if (entry.status === "validated" && (entry.validation.method !== "sarvam-stt" || (entry.validation.similarity ?? 0) < 0.62)) errors.push(`${key} has invalid STT metadata`);
      if (entry.assets.length !== 2 || !entry.assets.some((asset) => asset.codec === "mp3") || !entry.assets.some((asset) => asset.codec === "ogg")) errors.push(`${key} is missing MP3 or OGG`);
      for (const asset of entry.assets) {
        const prefix = `/audio/chapter-1/voices/${locale}/`;
        if (!asset.runtimePath.startsWith(prefix) || asset.runtimePath.includes("..")) { errors.push(`${key} has an unsafe runtime path`); continue; }
        const resolved = resolve(publicRoot, `.${asset.runtimePath}`);
        if (!resolved.startsWith(resolve(publicRoot) + sep)) { errors.push(`${key} escapes the public root`); continue; }
        try {
          const [file, details] = await Promise.all([readFile(resolved), stat(resolved)]);
          if (details.size !== asset.bytes || sha256(file) !== asset.sha256) errors.push(`${key} ${asset.codec} checksum does not match`);
        } catch { errors.push(`${key} ${asset.codec} file is missing`); }
        if (requireValidated && (asset.validation?.method !== "sarvam-stt" || (asset.validation.similarity ?? 0) < 0.62 || !asset.validation.transcriptSha256)) {
          errors.push(`${key} ${asset.codec} is not STT validated`);
        }
      }
    }
  }
  if (combinations.size !== EXPECTED_VOICE_ASSET_COUNT) errors.push("manifest combinations are incomplete");
  return errors;
}
