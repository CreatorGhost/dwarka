import { readFile } from "node:fs/promises";

import type { VoiceLocale, VoiceRole } from "./inventory.ts";
import { LOCALE_METADATA, ROLE_METADATA } from "./inventory.ts";

const DEFAULT_CREDENTIAL_CSV =
  "/Users/adityapratapsingh/code/mailer/sarvam.csv";
const DEFAULT_BASE_URL = "https://api.sarvam.ai";

export type Credential = { apiKey: string; source: "environment" | "csv" };

export type ProviderMetadata = {
  provider: "sarvam";
  ttsModel: string;
  sttModel: string;
  endpoint: string;
  credentialSource: Credential["source"];
};

export type SynthesisResult = {
  audio: Buffer;
  format: "mp3" | "wav" | "ogg" | "unknown";
  requestId: string | null;
};

export type TranscriptionResult = {
  transcript: string;
  languageCode: string | null;
  requestId: string | null;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += character;
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

export async function loadSarvamCredentials(
  env: NodeJS.ProcessEnv = process.env,
): Promise<Credential[]> {
  const environmentKey = env.VOICE_PROVIDER_API_KEY?.trim();
  if (environmentKey)
    return [{ apiKey: environmentKey, source: "environment" }];

  const csvPath = env.SARVAM_CREDENTIAL_CSV?.trim() || DEFAULT_CREDENTIAL_CSV;
  let csv: string;
  try {
    csv = await readFile(csvPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw new Error("Sarvam credential CSV could not be read.");
  }
  const [headerRow, ...dataRows] = parseCsv(csv.replace(/^\uFEFF/, ""));
  if (!headerRow) return [];
  const headers = headerRow.map((header) => header.trim().toLowerCase());
  const apiKeyIndex = headers.indexOf("api_key");
  const statusIndex = headers.indexOf("status");
  const emailIndex = headers.indexOf("email");
  if (apiKeyIndex < 0)
    throw new Error("Sarvam credential CSV has no api_key column.");

  const requestedEmail = env.SARVAM_CREDENTIAL_EMAIL?.trim().toLowerCase();
  const candidates = dataRows.filter((row) => {
    const hasKey = Boolean(row[apiKeyIndex]?.trim());
    const status =
      statusIndex >= 0 ? row[statusIndex]?.trim().toLowerCase() : "pass";
    const emailMatches =
      !requestedEmail ||
      (emailIndex >= 0 &&
        row[emailIndex]?.trim().toLowerCase() === requestedEmail);
    return (
      hasKey &&
      (status === "pass" || status === "ok" || status === "active") &&
      emailMatches
    );
  });
  if (!candidates.length) return [];
  const requestedIndex = Number.parseInt(
    env.SARVAM_CREDENTIAL_INDEX ?? "0",
    10,
  );
  const start =
    Number.isSafeInteger(requestedIndex) && requestedIndex >= 0
      ? requestedIndex
      : 0;
  if (!candidates[start])
    throw new Error("Requested Sarvam credential index is not available.");
  const ordered = [...candidates.slice(start), ...candidates.slice(0, start)];
  return ordered.map((row) => ({
    apiKey: row[apiKeyIndex].trim(),
    source: "csv",
  }));
}

export async function loadSarvamCredential(
  env: NodeJS.ProcessEnv = process.env,
): Promise<Credential | null> {
  return (await loadSarvamCredentials(env))[0] ?? null;
}

function detectFormat(audio: Buffer): SynthesisResult["format"] {
  if (
    audio.subarray(0, 3).toString("ascii") === "ID3" ||
    (audio[0] === 0xff && (audio[1] & 0xe0) === 0xe0)
  )
    return "mp3";
  if (audio.subarray(0, 4).toString("ascii") === "RIFF") return "wav";
  if (audio.subarray(0, 4).toString("ascii") === "OggS") return "ogg";
  return "unknown";
}

export class SarvamVoiceProvider {
  readonly metadata: ProviderMetadata;
  #credentials: Credential[];
  #activeCredential = 0;
  #baseUrl: string;

  constructor(
    credentials: Credential | Credential[],
    env: NodeJS.ProcessEnv = process.env,
  ) {
    this.#credentials = Array.isArray(credentials)
      ? credentials
      : [credentials];
    if (!this.#credentials.length)
      throw new Error("At least one Sarvam credential is required.");
    this.#baseUrl = (
      env.VOICE_PROVIDER_URL?.trim() || DEFAULT_BASE_URL
    ).replace(/\/$/, "");
    const endpoint = new URL(this.#baseUrl);
    this.metadata = {
      provider: "sarvam",
      ttsModel: env.VOICE_PROVIDER_MODEL?.trim() || "bulbul:v3",
      sttModel: env.VOICE_STT_MODEL?.trim() || "saaras:v3",
      endpoint: endpoint.origin,
      credentialSource: this.#credentials[0].source,
    };
  }

  async #request(
    path: string,
    createInit: (apiKey: string) => RequestInit,
  ): Promise<Response> {
    let lastStatus = 0;
    for (let offset = 0; offset < this.#credentials.length; offset += 1) {
      const index =
        (this.#activeCredential + offset) % this.#credentials.length;
      const credential = this.#credentials[index];
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const response = await fetch(
          `${this.#baseUrl}${path}`,
          createInit(credential.apiKey),
        );
        if (response.ok) {
          this.#activeCredential = index;
          return response;
        }
        lastStatus = response.status;
        if (
          response.status === 401 ||
          response.status === 402 ||
          response.status === 403 ||
          response.status === 429
        )
          break;
        if (response.status < 500)
          throw new Error(
            `Sarvam request failed with HTTP ${response.status}.`,
          );
        if (attempt === 0)
          await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    throw new Error(
      `Sarvam request failed across available credentials with HTTP ${lastStatus}.`,
    );
  }

  async synthesize(
    text: string,
    locale: VoiceLocale,
    role: VoiceRole,
  ): Promise<SynthesisResult> {
    const pace = Math.max(
      0.5,
      Math.min(2, ROLE_METADATA[role].fallbackRate / 165),
    );
    return this.synthesizeWithSpeaker(
      text,
      locale,
      ROLE_METADATA[role].providerVoice,
      pace,
    );
  }

  async synthesizeWithSpeaker(
    text: string,
    locale: VoiceLocale,
    speaker: string,
    pace = 1,
  ): Promise<SynthesisResult> {
    const response = await this.#request("/text-to-speech", (apiKey) => ({
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        text,
        language_code: LOCALE_METADATA[locale].bcp47,
        speaker,
        model: this.metadata.ttsModel,
        output_audio_codec: "mp3",
        speech_sample_rate: 24000,
        pace: Math.max(0.5, Math.min(2, pace)),
        temperature: 0.3,
      }),
    }));
    const body = (await response.json()) as {
      audios?: unknown;
      request_id?: unknown;
    };
    if (!Array.isArray(body.audios) || typeof body.audios[0] !== "string")
      throw new Error("Sarvam TTS returned no audio.");
    const audio = Buffer.from(body.audios[0], "base64");
    if (audio.byteLength < 256)
      throw new Error("Sarvam TTS returned an empty audio file.");
    return {
      audio,
      format: detectFormat(audio),
      requestId: typeof body.request_id === "string" ? body.request_id : null,
    };
  }

  async transcribe(
    audio: Buffer,
    locale: VoiceLocale,
    filename = "voice.mp3",
  ): Promise<TranscriptionResult> {
    const response = await this.#request("/speech-to-text", (apiKey) => ({
      method: "POST",
      headers: { "api-subscription-key": apiKey },
      body: (() => {
        const form = new FormData();
        form.set(
          "file",
          new Blob([new Uint8Array(audio)], { type: "audio/mpeg" }),
          filename,
        );
        form.set("model", this.metadata.sttModel);
        form.set("language_code", LOCALE_METADATA[locale].bcp47);
        if (this.metadata.sttModel === "saaras:v3")
          form.set("mode", "transcribe");
        return form;
      })(),
    }));
    const body = (await response.json()) as {
      transcript?: unknown;
      language_code?: unknown;
      request_id?: unknown;
    };
    if (typeof body.transcript !== "string" || !body.transcript.trim())
      throw new Error("Sarvam STT returned no transcript.");
    return {
      transcript: body.transcript,
      languageCode:
        typeof body.language_code === "string" ? body.language_code : null,
      requestId: typeof body.request_id === "string" ? body.request_id : null,
    };
  }
}
