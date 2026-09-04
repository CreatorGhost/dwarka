/** A cold or idle game server can take many seconds to answer its first request.
 *
 *  The title screen pings health on mount so the server wakes while the player
 *  is still reading the account and watching ~80 s of narration, and is warm by
 *  the time they enter the street. Best-effort only: it is fire-and-forget,
 *  never blocks, never surfaces an error, and offline play remains the fallback
 *  if the socket still is not up.
 *
 *  The host comes from NEXT_PUBLIC_DWARKA_WARMUP_URL, which is inlined at build
 *  time. Because we deploy a prebuilt directory, that variable has to be set for
 *  the LOCAL build; Vercel's dashboard environment never reaches this code.
 */
export function warmGameServer(): void {
  // No hardcoded host: a build without this set simply does not warm anything.
  // A stale default would keep waking a backend we have already moved off, and
  // the warm-up is an optimisation, never something the game depends on.
  const url = process.env.NEXT_PUBLIC_DWARKA_WARMUP_URL?.trim();
  if (!url || typeof fetch !== "function") return;
  try {
    // no-cors keeps this silent in the console whatever the server replies.
    void fetch(url, { mode: "no-cors", cache: "no-store", keepalive: true }).catch(() => undefined);
  } catch {
    // A warm-up that fails changes nothing: the game still plays offline.
  }
}
