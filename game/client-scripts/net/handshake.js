export function createEmbeddedHandshake({
  sendReady,
  useStandalone,
  hasParentProfile,
  clock = globalThis,
}) {
  let readyInterval = 0;
  let fallbackTimer = 0;

  function stop() {
    if (readyInterval) clock.clearInterval(readyInterval);
    if (fallbackTimer) clock.clearTimeout(fallbackTimer);
    readyInterval = 0;
    fallbackTimer = 0;
  }

  function start() {
    stop();
    if (hasParentProfile()) return;
    sendReady();
    readyInterval = clock.setInterval(() => {
      if (!hasParentProfile()) sendReady();
    }, 750);
    fallbackTimer = clock.setTimeout(() => {
      if (hasParentProfile()) return;
      stop();
      useStandalone();
    }, 3_000);
  }

  return { start, stop };
}

export function installHandshake(rt) {
  const { state } = rt;
  const handshake = createEmbeddedHandshake({
    sendReady: () => rt.sendParent("dwarka:ready", { version: 1 }),
    hasParentProfile: () => Boolean(state.parentProfileReceived),
    useStandalone: () => {
      const profile = rt.standaloneProfile();
      state.profile = profile;
      state.token = profile.progressToken || null;
      state.settings = { ...state.settings, ...(profile.settings || {}) };
      rt.syncSettingsUI();
      rt.connect();
    },
  });
  rt.startEmbeddedHandshake = handshake.start;
  rt.stopEmbeddedHandshake = handshake.stop;
}
