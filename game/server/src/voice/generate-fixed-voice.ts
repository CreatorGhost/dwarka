import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { FIXED_VOICE_LINES, LOCALE_METADATA, ROLE_METADATA, VOICE_LOCALES, type VoiceLocale, type VoiceRole } from "./inventory.ts";
import { cacheKeyFor, createManifest, sha256, validateManifest, validateTranscript, type VoiceAsset, type VoiceManifest, type VoiceManifestEntry } from "./manifest.ts";
import { loadSarvamCredentials, SarvamVoiceProvider } from "./provider.ts";

const run = promisify(execFile);
const workspaceRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const publicRoot = resolve(workspaceRoot, "site/public");
const outputRoot = resolve(publicRoot, "audio/chapter-1/voices");
const manifestPath = resolve(publicRoot, "audio/chapter-1/voice-manifest.json");

async function existingManifest(): Promise<VoiceManifest | null> {
  try { return JSON.parse(await readFile(manifestPath, "utf8")) as VoiceManifest; }
  catch { return null; }
}

async function usableFile(path: string): Promise<boolean> {
  try { return (await stat(path)).size > 256; }
  catch { return false; }
}

async function convertWithFfmpeg(input: string, output: string, codec: "mp3" | "ogg"): Promise<void> {
  const args = codec === "mp3"
    ? ["-hide_banner", "-loglevel", "error", "-y", "-i", input, "-vn", "-codec:a", "libmp3lame", "-b:a", "128k", output]
    : ["-hide_banner", "-loglevel", "error", "-y", "-i", input, "-vn", "-codec:a", "libvorbis", "-q:a", "4", output];
  await run("ffmpeg", args, { maxBuffer: 1024 * 1024 });
}

async function macOSFallback(text: string, locale: VoiceLocale, role: VoiceRole, mp3Path: string): Promise<void> {
  const temporary = await mkdtemp(join(tmpdir(), "dwarka-voice-"));
  const aiffPath = join(temporary, "voice.aiff");
  try {
    await run("say", ["-v", LOCALE_METADATA[locale].macOSVoice, "-r", String(ROLE_METADATA[role].fallbackRate), "-o", aiffPath, "--", text], { maxBuffer: 1024 * 1024 });
    await convertWithFfmpeg(aiffPath, mp3Path, "mp3");
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

async function asset(path: string, codec: "mp3" | "ogg", validation: VoiceAsset["validation"]): Promise<VoiceAsset> {
  const file = await readFile(path);
  return {
    codec,
    mimeType: codec === "mp3" ? "audio/mpeg" : "audio/ogg",
    runtimePath: `/${path.slice(publicRoot.length + 1).split("/").join("/")}`,
    sha256: sha256(file),
    bytes: file.byteLength,
    validation,
  };
}

async function validateAudio(provider: SarvamVoiceProvider, path: string, text: string, locale: VoiceLocale): Promise<VoiceAsset["validation"] | null> {
  const audio = await readFile(path);
  const transcription = await provider.transcribe(audio, locale, basename(path));
  const result = validateTranscript(text, transcription.transcript, locale);
  if (!result.valid) return null;
  return {
    method: "sarvam-stt",
    sttModel: provider.metadata.sttModel,
    similarity: Number(result.similarity.toFixed(4)),
    transcriptSha256: sha256(transcription.transcript.normalize("NFKC")),
    detectedLanguage: transcription.languageCode,
  };
}

async function writeProviderMp3(provider: SarvamVoiceProvider, text: string, locale: VoiceLocale, role: VoiceRole, path: string): Promise<Buffer> {
  const result = await provider.synthesize(text, locale, role);
  if (result.format === "mp3") {
    await writeFile(path, result.audio, { mode: 0o644 });
  } else {
    const temporary = await mkdtemp(join(tmpdir(), "dwarka-sarvam-"));
    const input = join(temporary, `source.${result.format === "unknown" ? "bin" : result.format}`);
    try { await writeFile(input, result.audio); await convertWithFfmpeg(input, path, "mp3"); }
    finally { await rm(temporary, { recursive: true, force: true }); }
  }
  return readFile(path);
}

async function generate(): Promise<void> {
  await mkdir(outputRoot, { recursive: true });
  const previous = await existingManifest();
  const forceFallback = process.env.VOICE_FORCE_MACOS_SAY === "1";
  const credentials = forceFallback ? [] : await loadSarvamCredentials();
  const provider = credentials.length ? new SarvamVoiceProvider(credentials) : null;
  const providerId = provider ? provider.metadata.provider : "macos-say-development";
  const ttsModel = provider ? provider.metadata.ttsModel : "macos-say";
  const sttModel = provider ? provider.metadata.sttModel : null;
  const previousByKey = new Map(previous?.entries.map((entry) => [`${entry.sourceLineId}:${entry.locale}:${entry.cacheKey}`, entry]) ?? []);
  const entries: VoiceManifestEntry[] = [];
  let generated = 0;
  let cached = 0;

  for (const line of FIXED_VOICE_LINES) {
    for (const locale of VOICE_LOCALES) {
      const text = line.text[locale];
      const role = ROLE_METADATA[line.role];
      const cacheKey = cacheKeyFor(line.id, text, locale, role.personaId, providerId, ttsModel);
      const directory = resolve(outputRoot, locale);
      const base = `${line.id}-${cacheKey}`;
      const mp3Path = resolve(directory, `${base}.mp3`);
      const oggPath = resolve(directory, `${base}.ogg`);
      await mkdir(directory, { recursive: true });
      const prior = previousByKey.get(`${line.id}:${locale}:${cacheKey}`);
      const priorValid = prior && await usableFile(mp3Path) && await usableFile(oggPath)
        && (await validateManifest(createManifest([prior], previous!.provider, previous!.generatedAt), publicRoot, Boolean(provider))).every((error) => !error.includes(`${line.id}:${locale}`));
      if (priorValid) {
        entries.push(prior);
        cached += 1;
        continue;
      }

      let status: VoiceManifestEntry["status"] = "development-fallback";
      let validation: VoiceManifestEntry["validation"] = { method: "not-validated", sttModel: null, similarity: null, transcriptSha256: null, detectedLanguage: null };
      const fallbackValidation: VoiceAsset["validation"] = { method: "not-validated", sttModel: null, similarity: null, transcriptSha256: null, detectedLanguage: null };
      let mp3Validation = fallbackValidation;
      let oggValidation = fallbackValidation;
      if (provider) {
        let validated = false;
        for (let attempt = 0; attempt < 2 && !validated; attempt += 1) {
          if (attempt > 0 || !(await usableFile(mp3Path))) await writeProviderMp3(provider, text, locale, line.role, mp3Path);
          if (attempt > 0 || !(await usableFile(oggPath))) await convertWithFfmpeg(mp3Path, oggPath, "ogg");
          const recordedMp3Validation = attempt === 0 && prior?.status === "validated" && prior.validation.method === "sarvam-stt"
            ? prior.validation
            : null;
          const mp3Result = recordedMp3Validation ?? await validateAudio(provider, mp3Path, text, locale);
          const oggResult = await validateAudio(provider, oggPath, text, locale);
          if (mp3Result && oggResult) {
            mp3Validation = mp3Result;
            oggValidation = oggResult;
            const similarity = Math.min(mp3Result.similarity ?? 0, oggResult.similarity ?? 0);
            status = "validated";
            validation = {
              method: "sarvam-stt",
              sttModel: provider.metadata.sttModel,
              similarity,
              transcriptSha256: sha256(`${mp3Result.transcriptSha256}:${oggResult.transcriptSha256}`),
              detectedLanguage: mp3Result.detectedLanguage === oggResult.detectedLanguage ? mp3Result.detectedLanguage : null,
            };
            validated = true;
          }
        }
        if (!validated) throw new Error(`STT validation failed for ${line.id}:${locale}. No manifest entry was marked validated.`);
      } else {
        await macOSFallback(text, locale, line.role, mp3Path);
        await convertWithFfmpeg(mp3Path, oggPath, "ogg");
      }
      const generatedAt = new Date().toISOString();
      entries.push({
        sourceLineId: line.id,
        scope: line.scope,
        sequence: line.sequence,
        locale,
        bcp47: LOCALE_METADATA[locale].bcp47,
        role: line.role,
        personaId: role.personaId,
        providerVoice: provider ? role.providerVoice : `${LOCALE_METADATA[locale].macOSVoice}@${role.fallbackRate}`,
        text,
        cacheKey,
        generatedAt,
        status,
        provider: providerId,
        ttsModel,
        syntheticVoice: true,
        validation,
        assets: [await asset(mp3Path, "mp3", mp3Validation), await asset(oggPath, "ogg", oggValidation)],
      });
      generated += 1;
      process.stdout.write(`voice ${line.id}:${locale} ${status}\n`);
    }
  }

  const generatedAt = generated === 0 && previous ? previous.generatedAt : new Date().toISOString();
  const manifest = createManifest(entries, {
    id: providerId,
    ttsModel,
    sttModel,
    syntheticVoice: true,
    developmentFallback: !provider,
  }, generatedAt);
  const errors = await validateManifest(manifest, publicRoot, Boolean(provider));
  if (errors.length) throw new Error(`Voice manifest validation failed:\n${errors.join("\n")}`);
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  const previousSerialized = await readFile(manifestPath, "utf8").catch(() => "");
  if (serialized !== previousSerialized) await writeFile(manifestPath, serialized, { mode: 0o644 });
  process.stdout.write(`voice manifest complete: ${entries.length} lines by locale, ${manifest.assetCount} cached assets, ${generated} generated, ${cached} reused\n`);
}

generate().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown voice generation error";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
