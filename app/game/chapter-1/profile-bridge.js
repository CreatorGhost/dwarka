export function postProfileResume(frameWindow, origin, profile, requestedAction) {
  if (!frameWindow || !profile) return false;
  frameWindow.postMessage({ type: "dwarka:resume", profile, requestedAction }, origin);
  return true;
}
