import { useInView } from "../hooks/useInView";
import s from "./About.module.css";

export function About() {
  const { ref, inView } = useInView();

  return (
    <section ref={ref} class={s.about}>
      <div class={`${s.row} ${inView ? s.fadeUp : s.hidden}`}>
        <div class={s.text}>
          <h2 class={s.heading}>What is Rotur?</h2>
          <div class={s.paragraphs}>
            <p class={s.p}>
              Imagine signing into all your services and instantly having your
              friends list, messages, avatar, and cloud data available - no
              extra setup, no separate accounts.
              <span class={s.highlight}> That's Rotur.</span>
            </p>
            <p class={s.p}>
              It's an ecosystem as a service paired with a simple
              developer-first api. We built it because we were tired of every
              web OS and service reinventing the same wheel. One identity, one
              connection layer, every platform.
            </p>
            <p class={s.p}>
              Rotur is open-source and community-driven. Whether you're building
              a game, an OS, or a social app, our tools make it straightforward
              to plug into the ecosystem.
            </p>
          </div>
        </div>
        <div class={s.visual}>
          <div class={s.logoWrapper}>
            <div class={s.logoCard}>
              <img src="/Rotur%20Logo.png" alt="Rotur Logo" class={s.logoImg} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
