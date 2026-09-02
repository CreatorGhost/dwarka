import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import styles from "./page.module.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/story-a/01-battlefield.webp`;
  const title = "Vrishaketu | The Last Arrow of the Sun";
  const description = "Read the complete 32-panel chapter for Story A, with every objective, enemy encounter, and story turn explained.";

  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

type Panel = {
  file: string;
  narration: string;
  dialogue?: string;
  tall?: boolean;
};

type Chapter = {
  number: string;
  title: string;
  place: string;
  story: string;
  objective: string;
  enemies: string;
  turn: string;
  panels: Panel[];
};

const chapters: Chapter[] = [
  {
    number: "PROLOGUE",
    title: "The wheel",
    place: "Kurukshetra, Day 17",
    story: "Before you meet Vrishaketu, you play the final three minutes of his father Karna's life. You are powerful, but this battle has already happened. Skill can delay the end. It cannot rewrite it.",
    objective: "Survive Arjuna's attack for three minutes, then free the sunken chariot wheel.",
    enemies: "Pandava soldiers, arrow volleys, one elite chariot. Arjuna remains a distant threat, not a boss with a health bar.",
    turn: "Karna sets down his bow to lift the wheel. The controls stop. The fatal arrow is never shown.",
    panels: [
      { file: "01-battlefield", narration: "The seventeenth day. Karna is holding an army together under a dying sun." },
      { file: "02-karna-looses", narration: "For three minutes, you play as Karna with his full bow kit.", dialogue: "OBJECTIVE: SURVIVE" , tall: true},
      { file: "03-wheel-sinks", narration: "The ground takes the wheel. Movement and dodge stop responding." },
      { file: "04-karna-lifts", narration: "Karna climbs down and asks for the pause owed to an unarmed warrior.", dialogue: "VOICE: Where was dharma when...", tall: true },
      { file: "05-ash", narration: "Cut to ash. The son inherits a story he did not choose." },
    ],
  },
  {
    number: "CHAPTER 01",
    title: "The boy with the paper sun",
    place: "Hastinapura, months after the war",
    story: "Karna's secret is revealed. He was Kunti's first son, which makes him the elder brother of the Pandavas. His only surviving son, seventeen-year-old Vrishaketu, is taken into the household of the men who killed his father.",
    objective: "Return to the charioteers' quarter and meet Chitra, the ten-year-old boy who follows you everywhere.",
    enemies: "Rakshasa raiders attack while the army is away. Fight three street groups and protect fleeing families.",
    turn: "You arrive too late. Chitra dies with a torn paper sun-crest in his hand. His last words are: 'They asked for you by name.'",
    panels: [
      { file: "06-kunti-reveals", narration: "Kunti tells the Pandavas that Karna was their brother. Arjuna cannot look at Karna's son.", dialogue: "KUNTI: He was my firstborn.", tall: true },
      { file: "07-raid", narration: "That night the army is at the royal sacrifice. Raiders hit Karna's unguarded neighbourhood." },
      { file: "08-chitra-dies", narration: "Vrishaketu finds Chitra in a burned doorway. The rest of the household has been taken.", dialogue: "CHITRA: They asked for you... by name.", tall: true },
      { file: "09-horse-loosed", narration: "At dawn the royal horse is released. An army must follow it wherever it walks." },
      { file: "10-oath", narration: "The horse's road follows the raiders' tracks. Vrishaketu joins the escort to hunt them.", dialogue: "NEW OBJECTIVE: FOLLOW THE HORSE", tall: true },
    ],
  },
  {
    number: "CHAPTER 02",
    title: "Steal the horse",
    place: "Bhadravati",
    story: "The royal ritual cannot begin without a flawless horse. King Yauvanashva owns the only one. Bhima, Meghavarna and Vrishaketu enter the city at night to take it.",
    objective: "Cross the stables, cut the gate chain, and lead the white horse out before the alarm bell rings.",
    enemies: "Stable guards, rooftop archers, hound handlers. Prince Suvega is the chapter's mini-boss.",
    turn: "Vrishaketu defeats Suvega but refuses to kill him. The defeated kingdom joins the escort instead of becoming an enemy.",
    panels: [
      { file: "m1-01-stables", narration: "The chapter begins above a torchlit stable. You choose a quiet route or let Bhima start a brawl." },
      { file: "m1-02-suvega", narration: "Suvega traps you in the yard. His shield closes distance, so the bow must be used at arm's length.", dialogue: "MINI-BOSS: SUVEGA", tall: true },
      { file: "m1-03-submits", narration: "Suvega lives. At dawn his father accepts defeat and sends soldiers to help guard the horse." },
    ],
  },
  {
    number: "CHAPTER 03",
    title: "Chase through Shalva",
    place: "The western forest road",
    story: "Anushalva ambushes the escort and takes the horse. Arjuna does not intervene. He tells Vrishaketu to recover it, giving the boy his first command.",
    objective: "Chase the stolen horse through the forest, destroy the escort chariots, and capture Anushalva alive.",
    enemies: "Mounted scouts, shield infantry, two chariot lieutenants. Anushalva is a three-phase chariot boss.",
    turn: "Vrishaketu shoots the wheels instead of the rider. He wins without repeating the way his father died.",
    panels: [
      { file: "m2-01-ambush", narration: "Chariots burst from the trees and cut the white horse away from the main escort.", dialogue: "ARJUNA: This one is yours." },
      { file: "m2-02-wheelshot", narration: "First disable the outriders. Then slide beneath Anushalva's chariot and break its axle.", dialogue: "BOSS: ANUSHALVA", tall: true },
      { file: "m2-03-mercy", narration: "The final input is a choice. Lower the bow and take him alive.", dialogue: "VRISHAKETU: I can wait.", tall: true },
    ],
  },
  {
    number: "CHAPTER 04",
    title: "The horse becomes the enemy",
    place: "The cursed lakes",
    story: "The recovered horse drinks from a forbidden lake and transforms into a white tiger. Killing it would end the royal ritual and turn the whole journey into a failure.",
    objective: "Track the tiger through fog, weaken it with nets and water arrows, then lead it to the second lake to reverse the curse.",
    enemies: "Mist spirits, territorial hunters, cursed animals. The tiger-horse is a non-lethal boss.",
    turn: "The lesson is restraint. If the player uses a killing finisher, the mission fails even after the health bar reaches zero.",
    panels: [
      { file: "m3-01-tracks", narration: "The horse's hoofprints become tiger tracks at the water's edge." },
      { file: "m3-02-transform", narration: "Its reflection changes first. Then the animal turns and runs into the fog.", tall: true },
      { file: "m3-03-tiger", narration: "Use weighted nets and blunt arrows. Your target is frightened, not evil.", dialogue: "SUBDUE. DO NOT KILL.", tall: true },
    ],
  },
  {
    number: "CHAPTER 05",
    title: "A victory that feels wrong",
    place: "The cauldron court of Champapuri",
    story: "King Hamsadhwaja challenges the horse's escort. His son Sudhanva is protected by devotion and cannot be beaten by Vrishaketu. The goal changes from winning to surviving.",
    objective: "Hold the courtyard for three minutes while civilians escape and Arjuna reaches the fight.",
    enemies: "Royal guards, cauldron keepers, Sudhanva's endless arrow storm.",
    turn: "Arjuna kills Sudhanva. Everyone calls the mission a victory, but Vrishaketu sees another son fall to the same bow that killed his father.",
    panels: [
      { file: "m4-01-cauldron", narration: "Hamsadhwaja applies his brutal law even to his own son. Sudhanva walks out of boiling oil unharmed.", tall: true },
      { file: "m4-02-sudhanva", narration: "You cannot empty Sudhanva's health bar. Keep moving and protect the retreat.", dialogue: "OBJECTIVE: SURVIVE 03:00" },
      { file: "m4-03-arrow", narration: "Arjuna ends the duel. Vrishaketu starts to question what the escort calls dharma.", dialogue: "Is this what dharma looks like from the other side of the bow?", tall: true },
    ],
  },
  {
    number: "CHAPTER 06",
    title: "The face of his father",
    place: "Vriksha, the flowering forest",
    story: "The raiders' trail finally leaves the horse road and enters Vriksha. At dusk, flowers open into captive people. The shape-shifter Lambodari has been waiting for Vrishaketu.",
    objective: "Free the captives, find Chitra's family, and identify Lambodari when she copies your allies.",
    enemies: "Flower mimics, rakshasa scouts, false versions of Bhima and Arjuna. Lambodari is the mini-boss.",
    turn: "Lambodari takes Karna's face. The attack button does nothing. The player must lower the bow to expose the lie.",
    panels: [
      { file: "m5-01-bloom", narration: "The flowers are prisons. Shooting them kills the people trapped inside." },
      { file: "m5-02-lambodari", narration: "Lambodari changes faces whenever you land a hit. Watch the shadow to find the real body.", dialogue: "MINI-BOSS: LAMBODARI", tall: true },
      { file: "m5-03-karnaface", narration: "Her final disguise is Karna. Vrishaketu wins by refusing to fire.", dialogue: "VRISHAKETU: My father never told anyone to leave their post.", tall: true },
      { file: "m5-04-offer", narration: "Bhishana appears with Chitra's paper crest. The raid was bait meant to bring Karna's angry son here.", dialogue: "BHISHANA: The horse for Arjuna's head.", tall: true },
    ],
  },
  {
    number: "FINAL CHAPTER",
    title: "Bhishana",
    place: "The night-blooming grove",
    story: "Bhishana is the son of Bakasura, whom Bhima killed years earlier. He wants revenge on the Pandavas, but he needs Vrishaketu's anger to open their defence from inside.",
    objective: "Reject the bargain, save the remaining captives, and defeat Bhishana before sunrise.",
    enemies: "Phase one uses captive flower-people as shields. Phase two creates giant shadow clones. Phase three poisons the grove and forces one final shot.",
    turn: "Arjuna arrives with a clear shot but lowers his bow. This victory belongs to Vrishaketu. The boy chooses what his inheritance means.",
    panels: [
      { file: "f-01-dusk", narration: "At dusk Bhishana throws captive people at you. Dodge. Do not answer cruelty with another death." },
      { file: "f-02-night", narration: "At night he splits into copies. Meghavarna points out the real body, the only one without a shadow.", dialogue: "MEGHAVARNA: Left!", tall: true },
      { file: "f-03-dawn", narration: "At dawn, combine the three skills learned on the road into one final arrow.", tall: true },
      { file: "f-04-lowered", narration: "Arjuna could take the shot. He lowers his bow and lets the son finish his own fight.", dialogue: "VRISHAKETU: My father taught me nothing. You did." },
    ],
  },
  {
    number: "EPILOGUE",
    title: "The road continues",
    place: "Beyond Vriksha",
    story: "Vrishaketu burns Chitra's paper crest and returns to the escort. He keeps Karna's ring, but he no longer lets his father's death make every choice for him.",
    objective: "Walk the horse to the next kingdom.",
    enemies: "None. This is the release after the final fight.",
    turn: "A prince named Babhruvahana stops the horse at Manipur. The next story begins where this chapter ends.",
    panels: [
      { file: "e-01-pyre", narration: "No monument. One paper sun burns beside the road.", tall: true },
      { file: "e-02-manipur", narration: "The horse enters Manipur. Another son of Arjuna rides out to stop it." },
    ],
  },
];

const cast = [
  ["Vrishaketu", "You", "Karna's seventeen-year-old son. A skilled archer who has not decided whether Arjuna is mentor, enemy, or family."],
  ["Karna", "The father", "A legendary warrior killed at Kurukshetra. You play his final stand in the prologue."],
  ["Arjuna", "The mentor", "The archer who killed Karna, then teaches Karna's son. He carries the story's central contradiction."],
  ["Chitra", "The reason", "A ten-year-old foster-brother who worships Karna. His death starts the hunt."],
  ["Bhishana", "The villain", "A rakshasa seeking revenge on the Pandavas. He plans to turn Vrishaketu's grief into a weapon."],
];

export default function VrishaketuPage() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <nav className={styles.nav} aria-label="Breadcrumb">
          <Link href="/">All four stories</Link>
          <span>/</span>
          <span>Story A</span>
        </nav>
        <p className={styles.kicker}>Recommended story / complete game chapter</p>
        <h1>Vrishaketu</h1>
        <p className={styles.subtitle}>The Last Arrow of the Sun</p>
        <p className={styles.logline}>
          You play Karna’s surviving son. The man who killed your father becomes your teacher.
          When raiders murder the boy who still believed in Karna, you follow the royal horse
          across Bharat to find them.
        </p>
        <a className={styles.start} href="#before-you-play">Start the chapter</a>
        <p className={styles.readingTime}>9 chapters / 32 storyboard panels / about 12 minutes</p>
      </header>

      <section className={styles.orientation} id="before-you-play">
        <div className={styles.orientationHeading}>
          <p className={styles.kicker}>Before you play</p>
          <h2>The whole story in one minute</h2>
        </div>
        <ol className={styles.spine}>
          <li><strong>Karna dies.</strong> His son Vrishaketu survives the war.</li>
          <li><strong>Arjuna adopts and trains him.</strong> Neither can forget who killed whom.</li>
          <li><strong>Raiders kill Chitra.</strong> They deliberately leave a message for Vrishaketu.</li>
          <li><strong>Vrishaketu follows the royal horse.</strong> Its road leads toward the raiders.</li>
          <li><strong>Each fight tests restraint.</strong> The player learns when not to shoot.</li>
          <li><strong>The villain offers revenge.</strong> Vrishaketu must choose his father or his own dharma.</li>
        </ol>
      </section>

      <section className={styles.cast} aria-labelledby="cast-title">
        <div className={styles.sectionIntro}>
          <p className={styles.kicker}>Keep these five people straight</p>
          <h2 id="cast-title">Character guide</h2>
        </div>
        <div className={styles.castGrid}>
          {cast.map(([name, role, description]) => (
            <article key={name}>
              <p>{role}</p>
              <h3>{name}</h3>
              <span>{description}</span>
            </article>
          ))}
        </div>
      </section>

      <nav className={styles.chapterNav} aria-label="Chapter list">
        {chapters.map((chapter, index) => (
          <a href={`#chapter-${index + 1}`} key={chapter.title}>
            <span>{chapter.number}</span>{chapter.title}
          </a>
        ))}
      </nav>

      <div className={styles.chapters}>
        {chapters.map((chapter, index) => (
          <section className={styles.chapter} id={`chapter-${index + 1}`} key={chapter.title}>
            <div className={styles.chapterHeader}>
              <div className={styles.chapterMeta}>
                <p>{chapter.number}</p>
                <span>{chapter.place}</span>
              </div>
              <h2>{chapter.title}</h2>
              <p className={styles.chapterStory}>{chapter.story}</p>
            </div>

            <div className={styles.playCard}>
              <div>
                <p>What you do</p>
                <strong>{chapter.objective}</strong>
              </div>
              <div>
                <p>Who fights you</p>
                <strong>{chapter.enemies}</strong>
              </div>
              <div>
                <p>How the story changes</p>
                <strong>{chapter.turn}</strong>
              </div>
            </div>

            <div className={styles.panels}>
              {chapter.panels.map((panel, panelIndex) => (
                <figure className={panel.tall ? styles.tallPanel : styles.widePanel} key={panel.file}>
                  <div className={styles.imageWrap}>
                    <img
                      src={`/story-a/${panel.file}.webp`}
                      alt={panel.narration}
                      loading={index === 0 && panelIndex < 2 ? "eager" : "lazy"}
                    />
                    <span className={styles.panelNumber}>{String(panelIndex + 1).padStart(2, "0")}</span>
                  </div>
                  <figcaption>
                    <p>{panel.narration}</p>
                    {panel.dialogue && <blockquote>{panel.dialogue}</blockquote>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className={styles.footer}>
        <p className={styles.kicker}>The decision</p>
        <h2>Would you build this story?</h2>
        <p>
          Story A has a clear personal motive, a recognisable Mahabharata connection, and a final
          victory that belongs to the player. No deity becomes a playable character or a boss.
        </p>
        <Link href="/">Return to the four-story comparison</Link>
      </footer>
    </main>
  );
}
