import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import styles from "./page.module.css";

type Scene = {
  n: string;
  phase: string;
  title: string;
  img: string;
  alt: string;
  line: string;
  action: string;
  event: string;
  why: string;
};

const scenes: Scene[] = [
  {
    n: "01",
    phase: "Before you play",
    title: "Fifteen Days of Fire",
    img: "01-fifteen-days",
    alt: "A boy runs from a burning forest at night while a woman carries a smaller child behind him",
    line: "The forest you were born in burns for fifteen days, and you are eight years old.",
    action:
      "You cannot fight. You run. The whole opening is one unbroken escape through canopy that is coming down on top of you.",
    event:
      "The great forest of Khandava is set alight. Two chariots circle the tree line and shoot down anything that tries to get out. Your mother pushes you and your little sister under a tree root, and is killed there. In the smoke, your sister's hand slips out of yours.",
    why:
      "It shows you exactly what was taken, and by whom, before you have any power to answer it. The men on the chariots stay distant silhouettes — never named on screen, never fought.",
  },
  {
    n: "02",
    phase: "Who you play",
    title: "Ten Years in the Cinders",
    img: "02-cinders",
    alt: "A young man on a ridge of burnt stumps looks down on a camp of shelters, with a white city far behind him",
    line: "You are Neel. Nobody outside this camp knows your name, and that is the point.",
    action:
      "You walk your own camp with nothing hunting you: talk to survivors, take your bow down off the wall, learn to move, aim and dodge.",
    event:
      "Ten years on, the people who got out of Khandava live in the ash of it. On the horizon stands the clean new city that the burning made room for. The camp is held together by your older cousin Dahan — the man who dragged you out from under those roots.",
    why:
      "You are established as an ordinary forest-born man, not a chosen one. And the person you will end the chapter fighting is introduced first as the person who saved your life.",
  },
  {
    n: "03",
    phase: "Your objective",
    title: "The Ember and the Binding",
    img: "03-the-binding",
    alt: "A scarred man holds a glowing sealed clay pot above kneeling followers while a girl is held at his side",
    line: "Your sister is alive. She has been chosen as the fuse.",
    action:
      "You lose one scripted fight in a crowd, then the game gives you a single objective and a direction: follow the clay pot.",
    event:
      "Dahan has recovered a cooled ember of the fire that ate the forest, and a shard of the asura architect Maya's craft. Together they make a curse-weapon aimed at the kings who ordered the burning. Binding it needs a child of unmixed Naga blood — and he has found your sister Kadri, alive in a village downriver. Maya finds you afterward and tells you the part Dahan leaves out: a curse laid on a dynasty burns that dynasty's forests too. Your people die second.",
    why:
      "It gives you one personal goal (get your sister back) and one larger goal (the weapon must never be finished), and both point down the same road — so you are never asked to choose which one you care about.",
  },
  {
    n: "04",
    phase: "Travel",
    title: "The Road the Weapon Needs",
    img: "04-the-road",
    alt: "A man fords a wide river at dawn following cart ruts, an old architect pointing the way from the bank",
    line: "You cross half a kingdom on foot, always a few days behind the pot.",
    action:
      "The first open stretch of the game: river fords, cart roads and hill passes. You scavenge arrow shafts, trade for food, and keep off the main track when soldiers come through.",
    event:
      "The materials Dahan still needs sit on the same roads the Pandavas happen to be walking that year, so you spend the chapter moving through the edges of a famous story. Maya reads the route ahead of you and marks it.",
    why:
      "It sets the scale of the world and puts the epic exactly where it belongs — in the background, glimpsed from the roadside. You pass the legend. You never fight it.",
  },
  {
    n: "05",
    phase: "Lesser enemies",
    title: "The Quota",
    img: "05-the-quota",
    alt: "Rakshasa raiders drag grain sacks from a village at night while an archer fires from a rooftop",
    line: "A village feeds you for a night. You clear its raiders for it.",
    action:
      "Your first real combat, and the game's teaching fight: three or four ordinary enemies at once, in the open, with room to reposition.",
    event:
      "Near the village of Ekachakra, the leftovers of a raiding band still come for the food quota they used to be owed. You take a night to break them so that you can eat and sleep under a roof.",
    why:
      "It fixes who the enemies of this game are — raiders, cursed things and hired men — and it makes your first help something you earned rather than something the plot handed you.",
  },
  {
    n: "06",
    phase: "Mid-boss",
    title: "The Palace That Must Not See You",
    img: "06-the-palace",
    alt: "A man presses flat behind a palace pillar as an armoured captain sweeps a torch along the colonnade",
    line: "You get inside as a servant. You do not get out as one.",
    action:
      "A stealth level with a forced fight at the end: the court captain corners you, and he is deliberately stronger than anything you have met so far.",
    event:
      "The twin of Maya's shard was sold years ago into the palace at Virata, and Dahan's people are coming for it. You go in first, as kitchen help. A guard captain catches you in the colonnade at night. While you are still bleeding in a storeroom, the palace erupts over a scandal that has nothing to do with you — and the noise is what gets you out the gate.",
    why:
      "The first enemy who is a person doing his job rather than a monster, and the first fight you win that solves nothing: the chapter's rule is that being seen costs more than being hurt.",
  },
  {
    n: "07",
    phase: "Setback",
    title: "The Ravine",
    img: "07-the-setback",
    alt: "A defeated man kneels in a ravine with a broken bow while two figures look down from the cliff edge",
    line: "You catch them. Your sister does not run to you.",
    action:
      "It opens as a normal boss fight and you cannot win it. However well you play, the ending is the same.",
    event:
      "You finally get in front of Dahan on a cliff road, and Kadri is standing beside him — not held, not bound. She has been with him for years. She believes the binding is worth her life. Dahan snaps your bow across his knee and leaves you at the bottom of the ravine, alive, because a witness is worth more to him than a body.",
    why:
      "The setback is not that you were too weak. It is that you were wrong about what your sister wanted. That turns the last act from a rescue into an argument, which is much harder to win.",
  },
  {
    n: "08",
    phase: "Final boss",
    title: "The Half-Burnt Grove",
    img: "08-the-ember-king",
    alt: "A man opens a clay pot and an ember floats above his palm as a grove catches fire above a distant war camp",
    line: "Above the war camp, in a grove that is already half ash, he opens the pot.",
    action:
      "Three stages. Fight through his followers while the grove catches around you. Fight Dahan while the loose ember reshapes the ground between you. Then seal the ember itself, in the few seconds Kadri buys by putting her hands on it.",
    event:
      "Dahan is not lying about anything except the cost. He watched the same forest burn that you did, and he has an answer ready for every objection you have. Kadri has to decide, in front of both of you, whether she is the fuse or the person who puts it out.",
    why:
      "The last fight is family, arguing for something you half agree with. You do not win it by being stronger or by being right — you win it because your sister chooses, and you were there for her to choose in front of.",
  },
  {
    n: "09",
    phase: "Chapter ending",
    title: "Walk Away",
    img: "09-walk-away",
    alt: "Two survivors and a small group walk down an empty road at dawn between two distant armies raising banners",
    line: "The conches sound behind you. You are not in that story either.",
    action:
      "The last thing the game asks of you is a walk. No combat, no boss, no camp to pick. Just the road out.",
    event:
      "The ember is sealed in cold clay and buried where the forest used to start. Kadri is alive, and the weapon was never finished. Down on the plain the great war begins on schedule, and what happens there reaches you the way it reaches everyone else — later, as news.",
    why:
      "The chapter closes on its own terms: sister saved, weapon stopped, nothing in the famous story bent to make it happen. Everything left over is a sequel, not a loose end.",
  },
];

const briefing = [
  {
    k: "Who you play",
    v: "Neel, eighteen, a Nishada-Naga forest survivor. No title, no lineage anyone would recognise, no famous father. An original character standing at the edge of a story that never noticed him.",
  },
  {
    k: "What happened before play begins",
    v: "The forest of Khandava was burned to clear ground for a city. Six creatures are said to have survived it. This chapter is about a seventh nobody counted, and the little sister he lost in the smoke.",
  },
  {
    k: "What you must do",
    v: "Reach Kadri before your cousin binds her life into a weapon made from the forest's last ember — and stop the survivors from answering one massacre with a bigger one.",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/story-b/01-fifteen-days.webp`;
  const title = "Emberborn | The Forest That Was Burned";
  const description = "Read Story B as one complete playable chapter, from the burning of Khandava to the fight over its last ember.";
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function Emberborn() {
  return (
    <main className={styles.page}>
      <nav className={styles.back}>
        <Link href="/">← Back to all four stories</Link>
      </nav>

      <header className={styles.head}>
        <p className={styles.eyebrow}>Story B / one complete chapter</p>
        <h1>Emberborn</h1>
        <p className={styles.sub}>The Forest That Was Burned</p>
        <p className={styles.deck}>
          Nine scenes, start to finish. Read them in order and you have the whole chapter:
          who you are, what was done to you before the game starts, what you are trying to do
          about it, and every fight between here and the end of it.
        </p>
        <dl className={styles.briefing}>
          {briefing.map((b) => (
            <div key={b.k}>
              <dt>{b.k}</dt>
              <dd>{b.v}</dd>
            </div>
          ))}
        </dl>
      </header>

      <ol className={styles.scenes}>
        {scenes.map((s) => (
          <li className={styles.scene} key={s.n}>
            <div className={styles.sceneTop}>
              <span className={styles.num}>{s.n}</span>
              <span className={styles.phase}>{s.phase}</span>
            </div>
            <h2>{s.title}</h2>
            <p className={styles.line}>{s.line}</p>
            <figure className={styles.art}>
              <Image
                src={`/story-b/${s.img}.webp`}
                alt={s.alt}
                width={1536}
                height={1024}
                sizes="(max-width: 900px) 100vw, 900px"
              />
            </figure>
            <dl className={styles.beats}>
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
          </li>
        ))}
      </ol>

      <footer className={styles.foot}>
        <p>
          No god or avatar appears as a playable character, a boss, or a defeated figure anywhere
          in this chapter. The famous events of the Mahabharata happen on schedule, off to one
          side, and none of them are changed by anything the player does.
        </p>
        <p className={styles.credit}>
          Concept art, not final game art. Illustrations are generated by{" "}
          <code>site/app/emberborn/gen.py</code>; delete a scene&rsquo;s PNG from{" "}
          <code>site/public/story-b/</code> and re-run it to redraw only that scene.
        </p>
        <Link className={styles.backFoot} href="/">
          ← Back to all four stories
        </Link>
      </footer>
    </main>
  );
}
