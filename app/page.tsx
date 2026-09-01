import Image from "next/image";
import Link from "next/link";

const stories = [
  {
    id: "A",
    title: "Vrishaketu",
    subtitle: "The Last Arrow of the Sun",
    who: "Karna's surviving son, raised and trained by Arjuna, the man who killed his father.",
    spark: "Raiders kill his young foster-brother Chitra and leave one message: they came looking for Vrishaketu.",
    goal: "Guard the wandering royal horse because its road follows the raiders' trail.",
    verdict: "Recommended",
    href: "/vrishaketu",
  },
  {
    id: "B",
    title: "Emberborn",
    subtitle: "The Forest That Was Burned",
    who: "An original Naga-Nishada survivor of the burning of Khandava forest.",
    spark: "His cousin kidnaps his sister to bind her life to a weapon made from the forest's last ember.",
    goal: "Save his sister and stop the survivors from answering one massacre with another.",
    verdict: "Safest adaptation",
    href: "/emberborn",
  },
  {
    id: "C",
    title: "Babhruvahana",
    subtitle: "The Gem Beneath the World",
    who: "The prince of Manipur, raised without knowing his father Arjuna.",
    spark: "He wins a duel, then learns the stranger he killed was his own father.",
    goal: "Enter the Naga underworld and recover the life-gem before the dead can no longer be revived.",
    verdict: "Boldest opening",
    href: "/babhruvahana",
  },
  {
    id: "D",
    title: "Abhimanyu",
    subtitle: "The Seventh Gate",
    who: "Arjuna's sixteen-year-old son, who knows how to enter the Chakravyuha but not how to escape it.",
    spark: "The army needs him to break the formation after Arjuna is drawn away.",
    goal: "Cross seven gates while the promised rescue falls farther behind.",
    verdict: "Reference only",
    href: "/abhimanyu",
  },
];

export default function Home() {
  return (
    <main>
      <section className="hero" aria-labelledby="page-title">
        <div className="hero-copy">
          <p className="eyebrow">DWARKA / story review</p>
          <h1 id="page-title">Four ways into the Mahabharata.</h1>
          <p className="hero-deck">
            Each pitch begins with one loss, gives the player a personal reason to fight,
            and keeps deities out of the player's fail state.
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/vrishaketu">
              Read the visual story
            </Link>
            <a className="button quiet" href="#compare">
              Compare all four
            </a>
          </div>
        </div>
        <figure className="hero-art">
          <Image
            src="/manga/01-battlefield.png"
            alt="A manga panel showing the battlefield of Kurukshetra under a red sun"
            width={1536}
            height={1024}
            priority
          />
          <figcaption>
            Story A opens on Karna's final day. The player survives for three minutes,
            but cannot change what history has already decided.
          </figcaption>
        </figure>
      </section>

      <section className="premise" aria-labelledby="plain-language">
        <p className="section-number">00</p>
        <div>
          <p className="eyebrow" id="plain-language">The idea in plain language</p>
          <h2>Play the person who inherits the wound, not the legend who caused it.</h2>
        </div>
        <p>
          Black Myth: Wukong lets a successor walk through an older legend. These stories use the
          same idea. The famous events stay intact, while a mortal character gets a new mission that
          can succeed or fail without rewriting the Mahabharata.
        </p>
      </section>

      <section className="story-grid" id="compare" aria-label="Story candidates">
        {stories.map((story) => (
          <article className={`story-card story-${story.id.toLowerCase()}`} key={story.id}>
            <div className="story-card-top">
              <span className="story-letter">{story.id}</span>
              <span className="verdict">{story.verdict}</span>
            </div>
            <h2>{story.title}</h2>
            <p className="story-subtitle">{story.subtitle}</p>
            <dl>
              <div>
                <dt>Who you play</dt>
                <dd>{story.who}</dd>
              </div>
              <div>
                <dt>What starts the story</dt>
                <dd>{story.spark}</dd>
              </div>
              <div>
                <dt>What you must do</dt>
                <dd>{story.goal}</dd>
              </div>
            </dl>
            <Link href={story.href}>{story.id === "A" ? "Read all 32 panels" : "Read the complete chapter"}</Link>
          </article>
        ))}
      </section>

      <section className="decision">
        <p className="eyebrow">Decision to confirm</p>
        <h2>My vote is Story A.</h2>
        <p>
          "Karna's son is trained by Arjuna" is understandable in one sentence. The family conflict is
          already inside the premise, and the game can give Vrishaketu real victories without turning a
          god or a major epic hero into a boss.
        </p>
        <Link className="text-link" href="/vrishaketu">See why the story works, chapter by chapter</Link>
      </section>
    </main>
  );
}
