/** Render's free tier spins the game server down; a cold start measured 22 s.
 *
 *  The title screen pings health on mount so the server wakes while the player
 *  is still reading the account and watching ~80 s of narration, and is warm by
 *  the time they enter the street. Best-effort only: it is fire-and-forget,
 *  never blocks, never surfaces an error, and offline play remains the fallback
 *  if the socket still is not up.
 */
const DEFAULT_HEALTH_URL = "https://dwarka-chapter-1-server.onrender.com/healthz";

export function warmGameServer(): void {
  const url = process.env.NEXT_PUBLIC_DWARKA_WARMUP_URL?.trim() || DEFAULT_HEALTH_URL;
  if (!url || typeof fetch !== "function") return;
  try {
    // no-cors keeps this silent in the console whatever the server replies.
    void fetch(url, { mode: "no-cors", cache: "no-store", keepalive: true }).catch(() => undefined);
  } catch {
    // A warm-up that fails changes nothing: the game still plays offline.
  }
}
