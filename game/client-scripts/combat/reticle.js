export function bowReticlePresentation({
  hasTarget,
  locked,
  cooldownActive,
  flightActive = false,
}) {
  if (flightActive) return { className: "acquiring", labelKey: "targetFlight" };
  if (!hasTarget) return { className: "acquiring", labelKey: "targetNoShot" };
  if (cooldownActive)
    return { className: "acquiring", labelKey: "targetCooldown" };
  return {
    className: locked ? "locked" : "acquiring",
    labelKey: locked ? "targetAcquired" : "targetTracking",
  };
}

export function visibleArrowEuler(pitch, yaw) {
  return [90 - (pitch * 180) / Math.PI, (-yaw * 180) / Math.PI, 0];
}

export function targetRimColor(kind) {
  if (kind === "archer") return [0.35, 0.48, 0.65];
  if (kind === "brute") return [0.65, 0.045, 0.015];
  return [1, 0.26, 0.01];
}

export function attackWarningGlyph(kind) {
  if (kind === "archer") return "arrow-eye";
  if (kind === "brute") return "mace-diamond";
  return "blade-exclamation";
}
