import { ArrowRight } from "lucide-preact";
import { useInView } from "../hooks/useInView";
import s from "./CTA.module.css";

export function CTA() {
  const { ref, inView } = useInView();

  return (
    <section ref={ref} class={s.cta}>
      <div class={s.inner}>
        <div class={`${s.card} ${inView ? s.fadeUp : s.hidden}`}>
          <div class={s.accentLine} />
          <h2 class={s.heading}>Ready to build with Rotur?</h2>
          <p class={s.sub}>
            Whether you're integrating an existing project or starting something
            new, our docs and community will get you up and running in minutes.
          </p>
          <div class={s.buttons}>
            <a href="https://docs.rotur.dev/" class={s.btnPrimary}>
              Read the Docs
              <ArrowRight size={16} />
            </a>
            <a
              href="https://extensions.mistium.com/featured/Rotur.js"
              class={s.btnSecondary}
            >
              MistWarp Extension
            </a>
          </div>
          <p class={s.note}>
            We're always around on originChats if you have questions. Come say
            hi :)
          </p>
        </div>
      </div>
    </section>
  );
}
