// One continuous opening: Karna's last day, the secret, the raid, and the reason
// Vrishaketu takes the street. The last frame is the lane the game starts in.
// Chitra's death, the released horse and the oath (panels 08-10) are Chapter 1's
// ending, never its opening — tests/chapter-1-ui.test.mjs enforces that.
export type Beat = {
  image: string;
  /** sourceLineId in /audio/chapter-1/voice-manifest.json */
  voice: string;
  /** Floor for the frame, used when voice is missing or still loading. */
  hold: number;
  hero?: boolean;
  mission?: boolean;
};

/** The framing beat: the account the story is read from. Hands-free, but the
 *  player may open it early. Held short so a judge is never blocked. */
export const MANUSCRIPT = {
  image: "/story-a/00-manuscript.webp",
  hold: 6_000,
} as const;

export const BEATS: readonly Beat[] = [
  { image: "/story-a/01-battlefield.webp", voice: "ch0-panel-01-battlefield", hold: 11_000, hero: true },
  { image: "/story-a/02-karna-looses.webp", voice: "ch0-panel-02-last-stand", hold: 7_000 },
  { image: "/story-a/03-wheel-sinks.webp", voice: "ch0-panel-03-wheel", hold: 7_000 },
  { image: "/story-a/04-karna-lifts.webp", voice: "ch0-panel-04-pause-owed", hold: 7_000 },
  { image: "/story-a/05-ash.webp", voice: "ch0-panel-05-what-remained", hold: 7_500 },
  { image: "/story-a/06-kunti-reveals.webp", voice: "ch1-kunti-revelation", hold: 8_500 },
  { image: "/story-a/07-raid.webp", voice: "ch1-raid-begins", hold: 7_500 },
  { image: "/story-a/11-lane-mouth.webp", voice: "ch1-opening-mission", hold: 14_000, mission: true },
];

/** Breath held after a line ends before the picture changes. */
export const BEAT_TAIL_MS = 450;
/** Caption keeps holding this long after the voice stops, then fades. */
export const CAPTION_HOLD_AFTER_VOICE_MS = 120;
export const CAPTION_FADE_MS = 300;
/** Index at which the darker bed takes over from the piano. */
export const RAID_BED_FROM_BEAT = 6;
