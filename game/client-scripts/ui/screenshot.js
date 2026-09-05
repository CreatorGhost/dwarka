// Copy WebGL pixels during postrender, before the browser discards its drawing buffer.
// The PNG contains the scene, so HTML pause/settings panels never obscure the view.
export function installScreenshot(rt) {
  const { state, ui, canvas } = rt;
  let downloadUrl = null;

  rt.captureScreenshot = async function captureScreenshot() {
    if (state.screenshotBusy || !state.app || !state.snapshot ||
        (!state.playing && state.modalMode !== 'pause') || state.storyNarrating) return false;
    state.screenshotBusy = true;
    if (state.playing) rt.showPause();
    ui.screenshot.disabled = ui.pauseScreenshot.disabled = ui.modalPrimary.disabled = true;
    ui.screenshotStatus.hidden = false;
    ui.screenshotStatus.textContent = rt.t('screenshotCapturing');
    ui.screenshotDownload.hidden = true;
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = null;
    ui.screenshotDownload.removeAttribute('href');
    const phase = state.snapshot.phase;
    try {
      const blob = await new Promise((resolve, reject) => {
        const app = state.app;
        const timeout = setTimeout(() => {
          app.off('postrender', captureFrame);
          reject(new Error('No rendered frame available'));
        }, 3000);
        function captureFrame() {
          clearTimeout(timeout);
          try {
            const output = canvas.ownerDocument.createElement('canvas');
            output.width = canvas.width;
            output.height = canvas.height;
            output.getContext('2d').drawImage(canvas, 0, 0);
            output.toBlob(value => value ? resolve(value) : reject(new Error('PNG encoding failed')), 'image/png');
          } catch (error) { reject(error); }
        }
        app.once('postrender', captureFrame);
      });
      downloadUrl = URL.createObjectURL(blob);
      ui.screenshotDownload.href = downloadUrl;
      ui.screenshotDownload.download = `dwarka-${phase}-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
      ui.screenshotDownload.hidden = false;
      ui.screenshotDownload.click();
      ui.screenshotStatus.textContent = rt.t('screenshotReady');
      return true;
    } catch {
      ui.screenshotStatus.textContent = rt.t('screenshotFailed');
      return false;
    } finally {
      state.screenshotBusy = false;
      ui.screenshot.disabled = ui.pauseScreenshot.disabled = false;
      if (state.modalMode === 'pause') ui.modalPrimary.disabled = false;
    }
  };
}
