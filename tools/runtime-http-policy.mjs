const DEFAULT_IGNORED_PATHS = Object.freeze(["/favicon.ico"]);

export function unexpectedHttpResponses(
  responses,
  { pageOrigin, ignoredPaths = DEFAULT_IGNORED_PATHS } = {},
) {
  const ignored = new Set(ignoredPaths);
  return responses.filter(({ status, url }) => {
    if (!Number.isFinite(status) || status < 400) return false;
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return true;
    }
    if (pageOrigin && parsed.origin !== pageOrigin) return false;
    return !ignored.has(parsed.pathname);
  });
}

export { DEFAULT_IGNORED_PATHS };
