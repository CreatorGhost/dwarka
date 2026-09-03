/** What the title screen's primary button does, given a stored profile.
 *
 *  The owner hit a real bug here: a completed chapter offered Replay, and Replay
 *  jumped straight into the game, so a returning player never saw the eight-beat
 *  narration at all. Replay now plays the story; only a mid-chapter Continue
 *  resumes straight into the street.
 */
export type TitleActionInput = {
  storyIntroComplete?: boolean;
  progressToken?: string | null;
  progressSummary?: { chapterComplete?: boolean } | null;
};

export type TitleAction =
  | { kind: "story"; story: "enter" | "replay" }
  | { kind: "game"; href: string };

export function titleAction(profile: TitleActionInput | null | undefined): TitleAction {
  if (profile?.progressSummary?.chapterComplete) return { kind: "story", story: "replay" };
  if (profile?.progressToken && profile.progressSummary) return { kind: "game", href: "/game/chapter-1" };
  if (profile?.storyIntroComplete) return { kind: "game", href: "/game/chapter-1" };
  return { kind: "story", story: "enter" };
}

/** Where the cinematic hands off once it finishes. */
export function storyDestination(mode: "enter" | "replay" | "watch"): string | null {
  if (mode === "watch") return null;
  return mode === "replay" ? "/game/chapter-1?replay=1&entry=cinematic" : "/game/chapter-1?entry=cinematic";
}
