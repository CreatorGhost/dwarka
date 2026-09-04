/** Absolute origin for metadata (OG/Twitter images need absolute URLs).
 *
 *  On a static build there is no request to read, so DWARKA_SITE_URL is baked in
 *  at build time. In dev, and if the variable is unset, fall back to the request
 *  host as before.
 */
export function siteOrigin(requestHeaders: { get(name: string): string | null }): string {
  const configured = process.env.DWARKA_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}
