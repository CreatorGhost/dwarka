import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { siteOrigin } from "../site-url";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const origin = siteOrigin(requestHeaders);
  const image = `${origin}/story-c/01-the-duel.webp`;
  const title = "Babhruvahana | The Gem Beneath the World";
  const description = "Read Story C as one complete playable chapter, from the fatal duel in Manipur to the race for the Naga life-gem.";
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

// ponytail: the chapter is data, the page is one map(). No CMS, no MDX.
const scenes = [
  {
    n: "01",
    beat: "Before you play",
    title: "The duel he won",
    img: "/story-c/01-the-duel.webp",
    alt: "A young prince stands with his bow lowered over a covered body while a chariot with a monkey banner waits behind him.",
    action:
      "You do not play this part. It plays for you, in about ninety seconds, and then the chapter begins.",
    event:
      "A royal horse wandered into Manipur. The stranger guarding it insulted the young king to his face and called him a woman's son. They fought under the rules of a formal duel, in front of the whole court. The young king won. Then his mother screamed a name, and he learned that the stranger he had just killed was Arjuna — his own father, who had never come back for him.",
    why: "Every other scene in the chapter exists because of this one. The player is not avenging a wrong done to them. They are trying to undo a wrong they did themselves, fairly, in public, and cannot excuse.",
  },
  {
    n: "02",
    beat: "The objective",
    title: "A fast, and a way out",
    img: "/story-c/02-the-fast.webp",
    alt: "A queen sits fasting before a dead pomegranate tree while a naga woman rises from a water channel holding a glowing gem.",
    action:
      "Walk the courtyard and speak to three people: your mother, your naga stepmother Ulupi, and the captain of your guard.",
    event:
      "Queen Chitrangada sits down in the courtyard and begins a fast that ends when she dies. Ulupi tells you there is a stone in the Naga underworld, the Mritasanjivani, that can return the dead. But the Naga council keeps it, their elder is glad Arjuna is dead, and the gem is useless unless the bodies are whole.",
    why: "This is where the player learns what winning looks like: bring back a stone from underground, before a fast upstairs runs out. One goal, one clock, stated in plain words before any fighting starts.",
  },
  {
    n: "03",
    beat: "Travel",
    title: "Down to the river-gate",
    img: "/story-c/03-the-road.webp",
    alt: "The prince leads a column of mongoose soldiers down a steep hill trail toward a river gorge in the mist.",
    action:
      "Lead your column down the hill trail. Climb, drop, and cross gaps. Nothing attacks you yet.",
    event:
      "The mongoose company — the small fighters who live under Manipur's hills and owe the queen a debt — comes with you. The road drops out of the forest to a gorge where the river disappears under a carved stone arch. That arch is the door to Patala.",
    why: "A quiet stretch on purpose. It teaches movement, introduces the allies who will fight beside you all chapter, and lets the player feel the ground going downward before anything comes at them.",
  },
  {
    n: "04",
    beat: "Lesser enemies",
    title: "The sentries in the water",
    img: "/story-c/04-the-river-gate.webp",
    alt: "Naga sentries with tridents erupt out of a black river at the prince, who twists aside mid-draw.",
    action:
      "Your first real fight. Dodge, shoot at close range, and call the mongoose company in to pin an enemy while you line up a shot.",
    event:
      "Naga sentries come up out of the river without warning. They are not evil and they are not important; they are border guards doing their job, and they have been told no living man goes through the arch.",
    why: "The chapter's combat is taught here, on enemies who are ordinary. It also sets the tone: the underworld is not a monster pit, it is a country with a border, and the player is the one breaking in.",
  },
  {
    n: "05",
    beat: "Travel",
    title: "The first coil",
    img: "/story-c/05-the-first-coil.webp",
    alt: "A vast underworld cavern of spiralling stone stairs where a naga envoy closes an enormous scaled door.",
    action:
      "Descend the spiral stairs and clear scattered patrols on the way down. Follow the envoy who agreed to speak for you.",
    event:
      "Pundarika, a naga envoy who owes Ulupi a favour, carries your request to the council. He comes back and shuts the door. The council has voted not to hear you at all, so the polite road ends on the first level down.",
    why: "The player is refused before they are attacked. Everything violent that follows is a consequence of asking properly first and being turned away — which keeps the hero sympathetic while he invades someone else's home.",
  },
  {
    n: "06",
    beat: "Mid-boss",
    title: "Forcing the vote",
    img: "/story-c/06-the-council-hall.webp",
    alt: "A huge armoured naga champion swings a mace over the prince, who slides beneath the strike and aims upward.",
    action:
      "Fight the champion of the council guard through three stages. He breaks the pillars; use the falling ones as cover, and shoot the moment he rears up.",
    event:
      "You cut your way into the council hall of Ananta and beat the elder Dhritarashtra's eldest son in front of every elder present. Under their own law, a champion who loses cannot hold the vote closed. The council has to let you into the vault.",
    why: "The halfway point, and the chapter's high moment. The player wins by their own hand and gets the thing they came for — which is exactly what makes the next scene land.",
  },
  {
    n: "07",
    beat: "The prize",
    title: "The gem",
    img: "/story-c/07-the-vault.webp",
    alt: "The prince lifts a glowing round gem from a stone pedestal in a domed vault, its light striking his face.",
    action:
      "Put down the vault's guardian serpent without killing it, then take the gem off its pedestal.",
    event:
      "The Mritasanjivani is real, it is in your hand, and it will do everything Ulupi promised. For about thirty seconds this chapter looks finished.",
    why: "The player has to be allowed to believe they have won. The setback only hurts if the victory before it was genuine.",
  },
  {
    n: "08",
    beat: "Setback",
    title: "What they took instead",
    img: "/story-c/08-the-theft.webp",
    alt: "The prince reaches uselessly toward three naga figures fleeing upward with a covered bundle.",
    action:
      "Chase, and fail. The stair collapses behind them; you cannot catch them here, and the game does not let you.",
    event:
      "While you were in the vault, the elder's sons went up to the surface and took the bodies. The gem only works on a body that is whole. You are holding the cure and the patients are gone — scattered across your own hills by people who now know exactly how much you will pay to get them back.",
    why: "The reversal the chapter is built around. The player's goal changes from 'get the gem' to 'get home before the gem is worthless', and the enemy stops being a distant council and becomes personal.",
  },
  {
    n: "09",
    beat: "Final boss",
    title: "The elder in the courtyard",
    img: "/story-c/09-the-elder.webp",
    alt: "A colossal hooded serpent coils around the palace courtyard while the prince stands small at the centre at full draw.",
    action:
      "Run down the sons across the hills, take back what they carry, and then hold the courtyard against the elder himself in full serpent form. Three stages: the coils, the hood, the strike.",
    event:
      "Dhritarashtra the Naga elder is old, respected, and honest about his reason: he was a friend of the Kauravas, Arjuna cost him people he loved, and he would rather the world stayed as it is. He comes to the courtyard to finish this where it started, under the dead pomegranate tree.",
    why: "The last fight happens at home, in the same square where the chapter's mistake was made, against someone who wants the same thing the player wants — a father left alone. Same room, opposite argument.",
  },
  {
    n: "10",
    beat: "Chapter ending",
    title: "The tree blooms",
    img: "/story-c/10-the-tree.webp",
    alt: "At dawn the prince kneels before his revived father beneath a pomegranate tree in full blossom.",
    action:
      "Nothing. Put the gem down and watch. The revival is not a button the player presses.",
    event:
      "The gem does its work. Arjuna sits up, and the first thing he does is reach down and lift the son who killed him. 'You did nothing wrong. You did what a kshatriya does.' Chitrangada breaks her fast. The dead pomegranate tree in the courtyard comes back into flower.",
    why: "The chapter closes the wound it opened, and it closes it with a sentence rather than a fight. The player is forgiven by the person they wronged — and they had to cross a world to be told they were never guilty.",
  },
];

const facts = [
  ["You play", "Babhruvahana, prince of Manipur, about nineteen, raised by his mother alone."],
  ["Your father", "Arjuna, who married Chitrangada, left before his son was born, and came back as a stranger."],
  ["Your allies", "Ulupi, your naga stepmother, and the mongoose company of the Manipur hills."],
  ["Your enemy", "Dhritarashtra, elder of the Naga council — not the blind Kuru king, a different man who shares the name."],
  ["Length", "One chapter. Ten scenes, roughly ninety minutes of play."],
  ["Source", "The Jaiminiya Ashvamedha Parva, a regional retelling of the Mahabharata."],
];

export default function Babhruvahana() {
  return (
    <main className={styles.page}>
      <Link className={styles.back} href="/">
        ← Back to all four stories
      </Link>

      <header className={styles.head}>
        <p className={styles.eyebrow}>Story C · playable chapter</p>
        <h1 className={styles.title}>
          Babhruvahana
          <span>The Gem Beneath the World</span>
        </h1>
        <p className={styles.deck}>
          A prince wins a duel against a stranger and finds out he has killed his own father. To
          undo it he has to break into the Naga underworld, steal back a stone that raises the dead,
          and get home before his mother starves herself. This page is the whole chapter, in order,
          in plain English.
        </p>
        <dl className={styles.facts}>
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </header>

      <ol className={styles.scenes}>
        {scenes.map((s) => (
          <li className={styles.scene} key={s.n}>
            <figure className={styles.art}>
              <Image src={s.img} alt={s.alt} width={1536} height={1024} priority={s.n === "01"} unoptimized />
            </figure>
            <div className={styles.body}>
              <p className={styles.meta}>
                <span className={styles.num}>{s.n}</span>
                <span className={styles.beat}>{s.beat}</span>
              </p>
              <h2>{s.title}</h2>
              <dl>
                <div>
                  <dt>Player action</dt>
                  <dd>{s.action}</dd>
                </div>
                <div>
                  <dt>Story event</dt>
                  <dd>{s.event}</dd>
                </div>
                <div>
                  <dt>Why it matters</dt>
                  <dd>{s.why}</dd>
                </div>
              </dl>
            </div>
          </li>
        ))}
      </ol>

      <footer className={styles.foot}>
        <p>
          No deity is playable, fightable, or shown losing anywhere in this chapter. Krishna arrives
          after the last fight is over and is never on screen during play. Adapted from the
          Jaiminiya Ashvamedha Parva and regional retellings of the Mahabharata. Concept art, not
          final game art.
        </p>
        <Link className={styles.back} href="/">
          ← Back to all four stories
        </Link>
      </footer>
    </main>
  );
}
