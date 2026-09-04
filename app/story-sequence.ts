/** Ordered storyboard frames per beat, from /story-a/sequence.json.
 *
 *  Each beat holds one spoken line but shows two or three frames of the same
 *  moment, so the picture keeps moving inside the narration instead of sitting
 *  still for nine seconds. A missing manifest, a missing beat, or an empty list
 *  all degrade to the beat's single authored image rather than erroring.
 */
type SequenceManifest = { beats?: Record<string, string[]> };

let manifestPromise: Promise<SequenceManifest> | null = null;

export function loadSequenceManifest(): Promise<SequenceManifest> {
  manifestPromise ??= fetch("/story-a/sequence.json", { cache: "force-cache" })
    .then((response) => {
      if (!response.ok) throw new Error("sequence manifest unavailable");
      return response.json() as Promise<SequenceManifest>;
    })
    .catch(() => ({}));
  return manifestPromise;
}

export function framesForBeat(manifest: SequenceManifest, beatId: string, fallbackImage: string): string[] {
  const frames = manifest.beats?.[beatId];
  return Array.isArray(frames) && frames.length > 0 ? frames : [fallbackImage];
}

/** How many of a beat's frames fit at roughly `intervalMs` each.
 *
 *  A short line shows fewer frames rather than flicking through all of them,
 *  and the last frame keeps the remainder of the beat so it is still on screen
 *  when the caption fades and the crossfade to the next beat begins.
 */
export function visibleFrameCount(frameCount: number, beatDurationMs: number, intervalMs: number): number {
  if (frameCount <= 1) return 1;
  const fits = Math.floor(beatDurationMs / intervalMs);
  return Math.max(1, Math.min(frameCount, fits));
}
