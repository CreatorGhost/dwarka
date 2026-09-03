import { execFile } from "node:child_process";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { FIXED_VOICE_LINES } from "./inventory.ts";
import { loadSarvamCredentials, SarvamVoiceProvider } from "./provider.ts";

const run = promisify(execFile);
const workspaceRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const outputRoot = resolve(workspaceRoot, "site/public/audio/auditions");

export const BULBUL_V3_SPEAKERS = [
  "shubh",
  "aditya",
  "rahul",
  "rohan",
  "amit",
  "dev",
  "ratan",
  "varun",
  "manan",
  "sumit",
  "kabir",
  "aayan",
  "ashutosh",
  "advait",
  "anand",
  "tarun",
  "sunny",
  "mani",
  "gokul",
  "vijay",
  "mohit",
  "rehan",
  "soham",
  "ritu",
  "priya",
  "neha",
  "pooja",
  "simran",
  "kavya",
  "ishita",
  "shreya",
  "roopa",
  "tanya",
  "shruti",
  "suhani",
  "kavitha",
  "rupali",
] as const;

async function usable(path: string): Promise<boolean> {
  try {
    return (await stat(path)).size > 256;
  } catch {
    return false;
  }
}

async function convertToOgg(mp3Path: string, oggPath: string): Promise<void> {
  await run(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-i",
      mp3Path,
      "-vn",
      "-codec:a",
      "libvorbis",
      "-q:a",
      "4",
      oggPath,
    ],
    { maxBuffer: 1024 * 1024 },
  );
}

async function generate(): Promise<void> {
  const line = FIXED_VOICE_LINES.find((candidate) => candidate.id === "ch0-panel-01-battlefield");
  if (!line) throw new Error("Panel 01 narration is missing from the fixed voice inventory.");

  const credentials = await loadSarvamCredentials();
  if (!credentials.length) throw new Error("No available Sarvam credential was found.");
  const provider = new SarvamVoiceProvider(credentials);
  if (provider.metadata.ttsModel !== "bulbul:v3") {
    throw new Error(`Auditions require bulbul:v3, received ${provider.metadata.ttsModel}.`);
  }

  await mkdir(outputRoot, { recursive: true });
  let generated = 0;
  let reused = 0;
  for (const speaker of BULBUL_V3_SPEAKERS) {
    for (const locale of ["en", "hi"] as const) {
      const oggPath = resolve(outputRoot, `${speaker}-${locale}.ogg`);
      if (await usable(oggPath)) {
        reused += 1;
        continue;
      }
      const mp3Path = resolve(outputRoot, `.${speaker}-${locale}.mp3`);
      try {
        const result = await provider.synthesizeWithSpeaker(line.text[locale], locale, speaker, 0.92);
        await writeFile(mp3Path, result.audio, { mode: 0o644 });
        await convertToOgg(mp3Path, oggPath);
      } finally {
        await rm(mp3Path, { force: true });
      }
      const converted = await readFile(oggPath);
      if (converted.byteLength <= 256) throw new Error(`${speaker}-${locale}.ogg is empty.`);
      generated += 1;
      process.stdout.write(`audition ${speaker}:${locale} generated\n`);
    }
  }
  process.stdout.write(
    `audition set complete: ${BULBUL_V3_SPEAKERS.length} speakers, ${generated} generated, ${reused} reused\n`,
  );
}

generate().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Unknown audition error"}\n`);
  process.exitCode = 1;
});
