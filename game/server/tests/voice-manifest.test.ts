import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { EXPECTED_VOICE_ASSET_COUNT, FIXED_VOICE_LINES, ROLE_METADATA, VOICE_LOCALES } from "../src/voice/inventory.ts";
import { cacheKeyFor, validateManifest, validateTranscript, type VoiceManifest } from "../src/voice/manifest.ts";
import { loadSarvamCredential, loadSarvamCredentials, SarvamVoiceProvider } from "../src/voice/provider.ts";

const workspaceRoot = fileURLToPath(new URL("../../../", import.meta.url));
const publicRoot = resolve(workspaceRoot, "site/public");
const manifestPath = resolve(publicRoot, "audio/chapter-1/voice-manifest.json");

test("fixed inventory covers every line in every required locale", () => {
  assert.equal(VOICE_LOCALES.length, 5);
  assert.equal(EXPECTED_VOICE_ASSET_COUNT, FIXED_VOICE_LINES.length * 5);
  assert.equal(new Set(FIXED_VOICE_LINES.map((line) => line.id)).size, FIXED_VOICE_LINES.length);
  for (const line of FIXED_VOICE_LINES) {
    for (const locale of VOICE_LOCALES) {
      assert.ok(line.text[locale].trim(), `${line.id}:${locale}`);
      if (locale !== "en") assert.notEqual(line.text[locale], line.text.en, `${line.id}:${locale} visibly falls back to English`);
    }
  }
  assert.notEqual(ROLE_METADATA["raider-one"].personaId, ROLE_METADATA["raider-two"].personaId);
  assert.notEqual(ROLE_METADATA["raider-one"].providerVoice, ROLE_METADATA["raider-two"].providerVoice);
});

test("checked-in manifest is complete, validated, and matches every cached path", async () => {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as VoiceManifest;
  const errors = await validateManifest(manifest, publicRoot, true);
  assert.deepEqual(errors, []);
  assert.equal(manifest.entryCount, EXPECTED_VOICE_ASSET_COUNT);
  assert.equal(manifest.assetCount, EXPECTED_VOICE_ASSET_COUNT * 2);
  assert.equal(manifest.provider.id, "sarvam");
  assert.equal(manifest.provider.developmentFallback, false);
});

test("manifest schema declares the complete locale, validation, and dual-codec contract", async () => {
  const schema = JSON.parse(await readFile(new URL("../src/voice/voice-manifest.schema.json", import.meta.url), "utf8"));
  assert.equal(schema.properties.schemaVersion.const, 1);
  assert.deepEqual(schema.properties.entries.items.properties.locale.enum, ["en", "hi", "ta", "kn", "te"]);
  assert.deepEqual(schema.properties.entries.items.properties.status.enum, ["validated", "development-fallback"]);
  assert.deepEqual(schema.properties.entries.items.properties.assets.items.properties.codec.enum, ["mp3", "ogg"]);
  assert.deepEqual(schema.properties.entries.items.properties.assets.items.properties.validation.properties.method.enum, ["sarvam-stt", "not-validated"]);
});

test("cache keys are stable and change with text, persona, provider, or model", () => {
  const base = cacheKeyFor("line", "text", "en", "persona", "sarvam", "bulbul:v3");
  assert.equal(base, cacheKeyFor("line", "text", "en", "persona", "sarvam", "bulbul:v3"));
  assert.notEqual(base, cacheKeyFor("line", "changed", "en", "persona", "sarvam", "bulbul:v3"));
  assert.notEqual(base, cacheKeyFor("line", "text", "en", "other", "sarvam", "bulbul:v3"));
  assert.notEqual(base, cacheKeyFor("line", "text", "en", "persona", "sarvam", "other"));
});

test("transcript validation is punctuation-tolerant and rejects the wrong script", () => {
  assert.equal(validateTranscript("उन्होंने तुम्हारा नाम लेकर पूछा था।", "उन्होंने तुम्हारा नाम लेकर पूछा था", "hi").valid, true);
  assert.equal(validateTranscript("அவர்கள் உன்னைப் பெயர் சொல்லிக் கேட்டார்கள்.", "They asked for you by name.", "ta").valid, false);
  assert.equal(validateTranscript("They asked for you by name.", "They asked for you by name", "en").valid, true);
});

test("credential loader accepts env or CSV without placing the key in provider metadata", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "dwarka-credential-test-"));
  const csvPath = join(temporary, "credential.csv");
  const sentinel = "test-secret-never-public-123456";
  try {
    await writeFile(csvPath, `timestamp,iteration,email,api_key,status,error\nnow,1,test@example.invalid,${sentinel},pass,\n`, { mode: 0o600 });
    const credential = await loadSarvamCredential({ SARVAM_CREDENTIAL_CSV: csvPath });
    assert.ok(credential);
    assert.equal(credential.source, "csv");
    const provider = new SarvamVoiceProvider(credential, { VOICE_PROVIDER_MODEL: "bulbul:v3" });
    assert.equal(provider.metadata.provider, "sarvam");
    assert.doesNotMatch(JSON.stringify(provider.metadata), new RegExp(sentinel));
    assert.doesNotMatch(JSON.stringify(provider), new RegExp(sentinel));
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("credential loader rotates usable CSV rows without exposing row metadata", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "dwarka-credential-rotation-"));
  const csvPath = join(temporary, "credential.csv");
  try {
    await writeFile(csvPath, "timestamp,iteration,email,api_key,status,error\nnow,1,one@example.invalid,first-secret,pass,\nnow,2,two@example.invalid,second-secret,pass,\n", { mode: 0o600 });
    const credentials = await loadSarvamCredentials({ SARVAM_CREDENTIAL_CSV: csvPath, SARVAM_CREDENTIAL_INDEX: "1" });
    assert.equal(credentials.length, 2);
    assert.equal(credentials[0].apiKey, "second-secret");
    assert.equal(credentials[1].apiKey, "first-secret");
    assert.deepEqual(Object.keys(credentials[0]).sort(), ["apiKey", "source"]);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});

test("provider rotates on a rate-limited key and retains the successful row", async () => {
  const originalFetch = globalThis.fetch;
  const attempted: string[] = [];
  try {
    globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      const key = headers.get("api-subscription-key") ?? "";
      attempted.push(key);
      if (key === "rate-limited") return new Response("", { status: 429 });
      const audio = Buffer.alloc(512); audio.write("ID3");
      return Response.json({ audios: [audio.toString("base64")], request_id: "nonsecret-request" });
    }) as typeof fetch;
    const provider = new SarvamVoiceProvider([
      { apiKey: "rate-limited", source: "csv" },
      { apiKey: "usable", source: "csv" },
    ]);
    await provider.synthesize("Test line", "en", "narrator");
    await provider.synthesize("Test line two", "en", "narrator");
    assert.deepEqual(attempted, ["rate-limited", "usable", "usable"]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("public audio and static game export contain no provider credential markers", async () => {
  const files = [
    manifestPath,
    resolve(publicRoot, "playcanvas/chapter-1/index.html"),
    resolve(publicRoot, "playcanvas/chapter-1/chapter-1.js"),
  ];
  for (const file of files) {
    const contents = await readFile(file, "utf8");
    assert.doesNotMatch(contents, /VOICE_PROVIDER_API_KEY|api-subscription-key|authorization\s*[:=]|bearer\s+[a-z0-9_-]{12,}/i, file);
  }
});

test("the active provider credential bytes are absent from public artifacts", async (context) => {
  const credential = await loadSarvamCredential();
  if (!credential) { context.skip("no authorized provider credential is available"); return; }
  const roots = [resolve(publicRoot, "audio/chapter-1"), resolve(publicRoot, "playcanvas/chapter-1")];
  const files: string[] = [];
  async function collect(directory: string): Promise<void> {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await collect(path);
      else if (entry.isFile()) files.push(path);
    }
  }
  for (const root of roots) await collect(root);
  const secret = Buffer.from(credential.apiKey);
  for (const file of files) {
    const contents = await readFile(file);
    assert.equal(contents.includes(secret), false, `provider credential leaked into ${file.slice(publicRoot.length + 1)}`);
  }
});
