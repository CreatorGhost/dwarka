import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/story-d/01-womb.webp`;
  const title = "Abhimanyu | The Seventh Gate";
  const description = "Read Story D as one complete tragic chapter and see why it remains a reference option rather than the recommended build.";
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

type Scene = {
  n: string;
  act: string;
  title: string;
  art: string;
  w: number;
  h: number;
  alt: string;
  action: string;
  event: string;
  matters: string;
};

const scenes: Scene[] = [
  {
    n: "01",
    act: "Before the chapter starts",
    title: "The lesson that stopped halfway",
    art: "01-womb.webp",
    w: 1024,
    h: 1536,
    alt: "A lamplit room: a pregnant woman falling asleep while a warrior draws a spiral on the floor to explain it.",
    action:
      "You do not fight yet. You hold one button to keep listening while a spiral is drawn on the floor, and you trace the path inward with the stick. When the drawing reaches the centre the screen goes dark mid-sentence and the controls stop responding.",
    event:
      "Years before the war, Arjuna explains to his pregnant wife Subhadra how to break into the enemy's wheel formation. She falls asleep before he explains how to get back out. The child she is carrying hears only the first half.",
    matters:
      "This is the whole chapter in ninety seconds. The player is taught the way in and is deliberately never taught the way out — so when the exit is missing later, it is a promise being kept, not a difficulty spike.",
  },
  {
    n: "02",
    act: "The ask",
    title: "Day thirteen, and no one else can do it",
    art: "02-the-ask.webp",
    w: 1536,
    h: 1024,
    alt: "A war camp at morning: a tired king appealing to a young warrior while commanders look on.",
    action:
      "You walk through your own camp and talk to whoever you like. Every commander tells you a piece of the situation. When you have heard enough, you accept the mission yourself — the game will not accept it for you.",
    event:
      "Abhimanyu is sixteen and Arjuna's son. This morning Arjuna has been pulled away to the far side of the battlefield by a challenge he cannot refuse. In his absence the enemy commander Drona has drawn the army into the Chakravyuha, a spiral formation nobody left in camp knows how to enter. Abhimanyu says he can open it. Asked whether he can also get out, he answers that the others only have to follow close behind him.",
    matters:
      "It establishes who you play, what already happened, and the exact objective: open the formation and hold the way open until your family comes through behind you. Everything after this is that one plan meeting reality.",
  },
  {
    n: "03",
    act: "Travel",
    title: "The ride to the wheel",
    art: "03-the-ride.webp",
    w: 1536,
    h: 1024,
    alt: "A war chariot at full gallop across open ground toward a vast spiral formation on the horizon.",
    action:
      "A driving section. You steer the chariot across open ground and shoot at range while your uncles' chariots try to keep pace behind you. Nothing here can kill you; it teaches moving and shooting at the same time.",
    event:
      "The ride takes long enough for the formation to come into view properly. It is not a wall — it is a spiral of men and chariots several thousand deep, turning slowly, with one mouth.",
    matters:
      "The player sees the whole shape of the thing once, from outside, while they are still safe. Every later scene is somewhere inside that shape, and they will remember where.",
  },
  {
    n: "04",
    act: "Lesser enemies",
    title: "The outer turns",
    art: "04-first-gates.webp",
    w: 1024,
    h: 1536,
    alt: "A young archer at full draw breaking through anonymous ranks of soldiers and chariots.",
    action:
      "The first real combat. Ranks of ordinary soldiers and unnamed gate captains, fought in waves. You learn the two things the chapter is built on: break the line in front, then hold the gap behind you long enough for allies to pass through.",
    event:
      "Abhimanyu opens the outer turns of the spiral faster than anyone expected. The army behind him is still coming. This part of the plan is working.",
    matters:
      "The player wins, cleanly and repeatedly, against enemies with no names. Only faceless troops die here — no famous figure is reduced to a health bar — and the early success is what makes the later reversal land.",
  },
  {
    n: "05",
    act: "Mid-boss",
    title: "A duel between two sixteen-year-olds",
    art: "05-lakshmana.webp",
    w: 1024,
    h: 1536,
    alt: "Two young warriors in chariots loosing arrows at each other, their shots crossing in mid-air.",
    action:
      "A one-on-one chariot duel with a full health bar, matched speed and matched range. The opponent uses the same moves you do. It is the fairest fight in the chapter and you can lose it.",
    event:
      "Lakshmana, son of the enemy king Duryodhana, is the same age as Abhimanyu and was trained the same way. He rides out to stop him. Abhimanyu wins.",
    matters:
      "It is the high point of the chapter and the last honest fight in it. The opponent is a prince, not a revered elder, so the player gets a real victory without the game asking them to knock down a figure the audience venerates.",
  },
  {
    n: "06",
    act: "The setback",
    title: "The door closes behind you",
    art: "06-the-gate-shuts.webp",
    w: 1536,
    h: 1024,
    alt: "A corridor of soldiers closing like a door, one king braced alone in the narrowing gap.",
    action:
      "Control is taken away for about twenty seconds. The camera turns you around and you look back down the corridor you just cut. Then it hands control back and the only direction you can walk is forward.",
    event:
      "King Jayadratha plants himself in the mouth of the formation and holds it shut. Bhima, Yudhishthira and the rest of the family are on the wrong side of him. They will not get through today, and Abhimanyu can see them not getting through.",
    matters:
      "This is the hinge of the chapter. The plan did not fail because the player played badly — it failed because someone else closed a door. From here the objective quietly changes from 'hold the gap' to 'keep going', and the player understands why without being told.",
  },
  {
    n: "07",
    act: "Alone at the centre",
    title: "Six chariots, one ring",
    art: "07-surrounded.webp",
    w: 1024,
    h: 1024,
    alt: "Overhead view of a lone warrior at the centre of a ring of six chariots, their banner shadows forming a wheel.",
    action:
      "An endurance fight in a closed circle. There is no boss to target — pressure arrives from six directions at once and your job is to keep facing the right one. The camera stays high and wide, so you can always see how outnumbered you are.",
    event:
      "The enemy's greatest warriors surround him together, which the rules of that war forbid: they were sworn to fight one at a time. Six of them break that oath at once. His bow is cut, his chariot is wrecked, his charioteer is killed.",
    matters:
      "The chapter names its real antagonist here, and it is not a person. It is the formation and the broken agreement that runs it. Framing the setpiece as a circle of pressure rather than a boss fight keeps the epic's revered elders out of the crosshairs while telling exactly what canon says happened.",
  },
  {
    n: "08",
    act: "Final confrontation",
    title: "The seventh gate",
    art: "08-the-wheel.webp",
    w: 1024,
    h: 1536,
    alt: "A young warrior, his bow gone, lifting a chariot wheel over his head as both shield and weapon.",
    action:
      "The last fight, and the game removes your equipment for it. No bow, no chariot, no arrows — you pick up a wheel from your own wrecked chariot and swing it. The health bar goes down and does not come back up. There is no version of this fight that you win.",
    event:
      "Abhimanyu fights on with the wheel until he cannot. He is sixteen. He has been inside the formation for most of a day, and the way out was the half of the lesson he never heard.",
    matters:
      "It is the most famous image in the episode and the reason the structure is so tempting: seven layers, a clean escalation, a perfect final beat. It is also the reason this build is only a reference — the chapter ends by requiring the player to lose, on purpose, every single time.",
  },
  {
    n: "09",
    act: "Chapter ending",
    title: "What the field looks like after",
    art: "09-dusk.webp",
    w: 1536,
    h: 1024,
    alt: "Dusk on an emptied battlefield: a single overturned chariot wheel and a broken banner, no people.",
    action:
      "Nothing. The camera holds on empty ground for a long moment. When the prompt finally appears, it is to continue, not to retry.",
    event:
      "The armies have withdrawn. Arjuna returns at evening to a camp that has to tell him what happened. The chapter closes on his oath to reach Jayadratha before the next sun goes down.",
    matters:
      "It ends the chapter without pretending the loss was a win, and it hands the next chapter a clear motive. But it also hands the player a defeat they were never allowed to avoid — which is exactly the problem this pitch was written to demonstrate.",
  },
];

export default function AbhimanyuPage() {
  return (
    <main className={styles.page}>
      <Link className={styles.back} href="/">
        ← Back to all four stories
      </Link>

      <div className={styles.warning}>
        <p className={styles.warningLabel}>Reference option — not the recommended build</p>
        <p>
          This chapter is written out in full so the comparison is honest, not because it should be
          made. It ends in a forced tragic ending: the player character dies, the last fight cannot
          be won, and no amount of skill changes that.
        </p>
        <p>
          Story A, <Link href="/vrishaketu">Vrishaketu</Link>, is the recommended build. It keeps this
          chapter&apos;s clean structure and gives the player an ending they can actually earn.
        </p>
      </div>

      <header className={styles.masthead}>
        <p className={styles.eyebrow}>Story D · one chapter, start to finish</p>
        <h1 className={styles.title}>Abhimanyu</h1>
        <p className={styles.subtitle}>The Seventh Gate</p>
      </header>

      <section className={styles.briefing} aria-label="Chapter briefing">
        <div>
          <h2>Who you play</h2>
          <p>
            Abhimanyu, sixteen years old, son of the archer Arjuna. A good fighter who has never
            fought alone, sent in because everyone senior to him is somewhere else.
          </p>
        </div>
        <div>
          <h2>What happened before you start</h2>
          <p>
            Before he was born, he overheard his father explain how to break into the enemy&apos;s
            spiral formation — but the explanation stopped halfway. He knows the way in. Nobody ever
            taught him the way out.
          </p>
        </div>
        <div>
          <h2>What you have to do</h2>
          <p>
            Cut open the formation and hold the opening long enough for the rest of the army to
            follow you through. That is the entire plan, and it depends on people arriving behind
            you.
          </p>
        </div>
      </section>

      {scenes.map((scene) => (
        <article className={styles.scene} key={scene.n}>
          <figure className={styles.art}>
            <Image src={`/story-d/${scene.art}`} alt={scene.alt} width={scene.w} height={scene.h} />
          </figure>
          <div>
            <p className={styles.act}>{scene.act}</p>
            <p className={styles.sceneNumber}>{scene.n}</p>
            <h2 className={styles.sceneTitle}>{scene.title}</h2>
            <dl className={styles.beats}>
              <div>
                <dt>Player action</dt>
                <dd>{scene.action}</dd>
              </div>
              <div>
                <dt>Story event</dt>
                <dd>{scene.event}</dd>
              </div>
              <div>
                <dt>Why it matters</dt>
                <dd>{scene.matters}</dd>
              </div>
            </dl>
          </div>
        </article>
      ))}

      <section className={styles.closing}>
        <p className={styles.eyebrow}>The verdict, stated plainly</p>
        <h2>The best-shaped chapter of the four, and the one we should not build.</h2>
        <p>
          Seven layers, a rising difficulty curve and a single unforgettable final image — as level
          design it is close to perfect, and that is why it keeps getting suggested. The problem is
          the ending. A player who does everything right still loses, and the story gives them no
          way to feel that the loss was theirs to prevent.
        </p>
        <p>
          It also puts the most revered figures in the epic on the other side of a health bar. This
          version works around that by making the formation the antagonist and keeping named elders
          out of the fights, but the workaround is the tell: the structure only becomes safe once
          you stop building the thing that made it famous.
        </p>
        <Link className={styles.closingLink} href="/">
          Compare it against the other three stories
        </Link>
      </section>

      <p className={styles.footnote}>
        Adapted from the Drona Parva of the Mahabharata. No deity appears in this chapter — none is
        playable, none is fought, and none is shown losing. Illustrations are original concept art
        generated for this pitch, not final game art.
      </p>
    </main>
  );
}
