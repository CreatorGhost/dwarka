import assert from 'node:assert/strict';
import test from 'node:test';
import { installScreenshot } from './screenshot.js';

function fixture() {
  const events = new Map();
  const calls = [];
  const button = () => ({ disabled: false });
  const ui = {
    screenshot: button(), pauseScreenshot: button(), modalPrimary: button(),
    screenshotStatus: { hidden: true, textContent: '' },
    screenshotDownload: { hidden: true, click() { calls.push('download'); }, removeAttribute(name) { delete this[name]; } },
  };
  const document = { createElement() { return {
    getContext: () => ({ drawImage() { calls.push('copy rendered frame'); } }),
    toBlob: callback => callback(new Blob(['PNG'], { type: 'image/png' })),
  }; } };
  const rt = {
    canvas: { width: 1920, height: 1080, ownerDocument: document }, ui,
    state: { playing: true, paused: false, snapshot: { phase: 'doorway', player: { x: 1, y: 6, z: -50 } },
      app: { once(name, fn) { events.set(name, fn); }, off(name) { events.delete(name); } } },
    t: key => key,
    showPause() { calls.push('pause'); this.state.playing = false; this.state.paused = true; this.state.modalMode = 'pause'; },
  };
  installScreenshot(rt);
  return { rt, calls, events };
}

test('capture freezes play and downloads the rendered scene without resuming', async () => {
  const { rt, calls, events } = fixture();
  const capture = rt.captureScreenshot();
  assert.equal(rt.state.paused, true);
  assert.equal(rt.state.playing, false);
  assert.equal(rt.ui.modalPrimary.disabled, true);
  assert.deepEqual(calls, ['pause']);
  events.get('postrender')();
  assert.equal(await capture, true);
  assert.deepEqual(calls, ['pause', 'copy rendered frame', 'download']);
  assert.match(rt.ui.screenshotDownload.download, /^dwarka-doorway-.*\.png$/);
  assert.equal(rt.state.paused, true);
  assert.equal(rt.state.playing, false);
  assert.equal(rt.ui.screenshotDownload.hidden, false);
  assert.equal(rt.ui.modalPrimary.disabled, false);
  URL.revokeObjectURL(rt.ui.screenshotDownload.href);
});

test('repeated capture is ignored while a frame is pending; paused capture also stays paused', async () => {
  const { rt, events } = fixture();
  rt.state.playing = false;
  rt.state.paused = true;
  rt.state.modalMode = 'pause';
  const capture = rt.captureScreenshot();
  assert.equal(await rt.captureScreenshot(), false);
  events.get('postrender')();
  assert.equal(await capture, true);
  assert.equal(rt.state.paused, true);
  URL.revokeObjectURL(rt.ui.screenshotDownload.href);
});

test('a failed PNG capture keeps the game paused and allows retry', async () => {
  const { rt, events } = fixture();
  rt.canvas.ownerDocument.createElement = () => ({ getContext() { throw new Error('unavailable'); } });
  const capture = rt.captureScreenshot();
  events.get('postrender')();
  assert.equal(await capture, false);
  assert.equal(rt.state.paused, true);
  assert.equal(rt.state.screenshotBusy, false);
  assert.equal(rt.ui.pauseScreenshot.disabled, false);
  assert.equal(rt.ui.screenshotStatus.textContent, 'screenshotFailed');
  assert.equal(rt.ui.screenshotDownload.hidden, true);
});

test('loading and story screens cannot accidentally capture or resume a session', async () => {
  const { rt, calls } = fixture();
  rt.state.playing = false;
  rt.state.modalMode = 'loading';
  assert.equal(await rt.captureScreenshot(), false);
  rt.state.modalMode = 'pause';
  rt.state.storyNarrating = true;
  assert.equal(await rt.captureScreenshot(), false);
  assert.deepEqual(calls, []);
});
