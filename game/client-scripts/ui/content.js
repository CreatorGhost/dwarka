export const PHASE_DETAILS = Object.freeze({
  arrival: ["arrivalTitle", "arrivalDetail"],
  courtyard: ["courtyardTitle", "courtyardDetail"],
  market: ["marketTitle", "marketDetail"],
  doorway: ["doorwayTitle", "doorwayDetail"],
  ending: ["endingTitle", "endingDetail"],
  complete: ["completeTitle", "completeDetail"],
});

export const UI_MESSAGES = Object.freeze({
  en: Object.freeze({
    checkpointRestoredFull: "Checkpoint restored — health full",
    familyCheckpointRestored: "The family was overrun · checkpoint restarted",
    restartCaption: "[The current encounter begins again. Earlier progress is safe.]",
    warningSpeaker: "WARNING",
  }),
});

export const STORY = {
  arrival: [
    {
      image: "/story-a/06-kunti-reveals.webp",
      speaker: "KUNTI",
      text:
        "After the war, the secret was spoken: Karna had been her first son. " +
        "Vrishaketu entered the house of the men who killed his father.",
    },
  ],
  courtyard: [
    {
      image: "/story-a/07-raid.webp",
      speaker: "NIGHT RAID",
      text:
        "The army had gone with the royal sacrifice. " +
        "Raiders entered the unguarded charioteers' quarter.",
    },
  ],
  ending: [
    {
      image: "/story-a/08-chitra-dies.webp",
      speaker: "CHITRA",
      text: "They asked for you by name.",
    },
    {
      image: "/story-a/09-horse-loosed.webp",
      speaker: "DAWN",
      text: "At dawn, the royal horse was released. Its road followed the raiders' trail.",
    },
    {
      image: "/story-a/10-oath.webp",
      speaker: "VRISHAKETU",
      text: "Then I will follow the horse—and find who sent them.",
    },
  ],
};

export const STORY_VOICE_LINES = {
  arrival: ["ch1-kunti-revelation"],
  courtyard: ["ch1-raid-begins"],
  ending: ["ch1-chitra-final", "ch1-dawn-road", "ch1-vrishaketu-oath"],
};

export const EFFECT_URLS = Object.freeze({
  bladeSwing: "/audio/chapter-1/effects/blade-swing.ogg",
  bowRelease: "/audio/chapter-1/effects/bow-release.ogg",
  footstep1: "/audio/chapter-1/effects/footstep-1.ogg",
  footstep2: "/audio/chapter-1/effects/footstep-2.ogg",
  footstep3: "/audio/chapter-1/effects/footstep-3.ogg",
  hitLight: "/audio/chapter-1/effects/hit-light.ogg",
  hitHeavy: "/audio/chapter-1/effects/hit-heavy.ogg",
  uiClick: "/audio/chapter-1/effects/ui-click.ogg",
});

export const TUTORIAL_STEPS = [
  ["move", "tutorialMoveTitle", "tutorialMoveCopy"],
  ["camera", "tutorialCameraTitle", "tutorialCameraCopy"],
  ["sprint", "tutorialSprintTitle", "tutorialSprintCopy"],
  ["dodge", "tutorialDodgeTitle", "tutorialDodgeCopy"],
  ["bow", "tutorialBowTitle", "tutorialBowCopy"],
  ["blade", "tutorialBladeTitle", "tutorialBladeCopy"],
  ["interact", "tutorialInteractTitle", "tutorialInteractCopy"],
];

export const PLAYABLE_PHASES = new Set([
  "arrival",
  "courtyard",
  "market",
  "doorway",
  "ending",
  "complete",
]);
