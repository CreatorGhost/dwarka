import type { Metadata } from "next";
import ChapterGameClient from "./ChapterGameClient";

export const metadata: Metadata = { title: "Chapter 1 — The Boy with the Paper Sun | DWARKA", description: "Play Chapter 1 as Vrishaketu and protect the charioteers' quarter." };

// CHAPTER_URL_HELPER_START
export function isLocalOnlyWebSocketHost(hostname: string) {
  const host = hostname
    .toLowerCase()
    .replace(/^\[|\]$/gu, "")
    .replace(/\.$/u, "");
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "0.0.0.0" ||
    host.startsWith("127.") ||
    host === "::" ||
    host === "::1" ||
    host === "::ffff:0:0" ||
    host === "::ffff:0.0.0.0" ||
    /^::7f[0-9a-f]{2}:/u.test(host) ||
    host.startsWith("::ffff:127.") ||
    /^::ffff:7f[0-9a-f]{2}:/u.test(host)
  );
}

export function configuredWebSocketUrl(
  configuredValue?: string,
  environment?: string,
): string | null {
  const runtimeEnvironment = environment ?? (
    typeof process === "undefined" ? undefined : process.env.NODE_ENV
  );
  const value = configuredValue ?? (
    typeof process === "undefined" ? undefined : process.env.DWARKA_WS_URL
  );
  const configured = value?.trim();
  if (!configured) return runtimeEnvironment === "development" ? "ws://localhost:3210" : null;
  try {
    const url = new URL(configured);
    const unsafeAuthority = Boolean(url.username || url.password || url.hash);
    const localOnly = isLocalOnlyWebSocketHost(url.hostname);
    const allowed = !unsafeAuthority && (
      (url.protocol === "wss:" && (runtimeEnvironment === "development" || !localOnly)) ||
      (runtimeEnvironment === "development" && url.protocol === "ws:" && localOnly)
    );
    if (allowed) return url.href;
  } catch {
    // Use the same non-secret configuration error for malformed and unsafe URLs.
  }
  throw new Error(
    "DWARKA_WS_URL must be a public, credential-free wss:// URL (or loopback ws:// in development).",
  );
}
// CHAPTER_URL_HELPER_END

export default function ChapterOnePage() { return <ChapterGameClient websocketUrl={configuredWebSocketUrl()} />; }
