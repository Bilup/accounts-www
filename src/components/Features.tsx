import type { LucideProps } from "lucide-preact";
import { useInView } from "../hooks/useInView";
import s from "./Features.module.css";
import type React from "preact/compat";

interface FeatureList {
  name: string;
  items: { name: string; desc: string; icon: React.FC<LucideProps> }[];
}

const categoryColors = ["#c299cf", "#99c2b0", "#c2b299"];

export function Features({ data }: { data: FeatureList[] | null }) {
  const { ref, inView } = useInView();

  return (
    <section ref={ref} class={s.features}>
      <div class={s.bgOrb} />
      <div class={s.inner}>
        <div class={`${s.header} ${inView ? s.fadeUp : s.hidden}`}>
          <h2 class={s.heading}>Built for what matters</h2>
          <p class={s.sub}>
            Everything you need to connect, communicate, and collaborate across
            web-based platforms.
          </p>
        </div>
        <div class={s.grid}>
          {data?.map((category, ci) => (
            <div key={category.name} class={s.card}>
              <div class={s.cardHeader}>
                <div
                  class={s.dot}
                  style={{ backgroundColor: categoryColors[ci % 3] }}
                />
                <h3 class={s.cardTitle}>{category.name}</h3>
              </div>
              <div class={s.items}>
                {category.items.map((item) => (
                  <div key={item.name} class={s.item}>
                    <div class={s.itemHeader}>
                      <item.icon class={s.itemIcon} />
                      <span class={s.itemName}>{item.name}</span>
                    </div>
                    <p class={s.itemDesc}>{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
