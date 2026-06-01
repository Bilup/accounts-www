import { useEffect, useRef } from "preact/hooks";
import s from "./Contributors.module.css";

interface Contributor {
  name: string;
  pfp: string;
  link: string;
}

export function Contributors({ data }: { data: Contributor[] | null }) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const offsetRef = useRef(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el || !data?.length) return;

    const onEnter = () => {
      pausedRef.current = true;
    };
    const onLeave = () => {
      pausedRef.current = false;
    };

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);

    let lastTime = performance.now();
    const animate = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;
      if (!pausedRef.current) {
        offsetRef.current -= (dt / 1000) * 40;
        const halfWidth = el.scrollWidth / 2;
        if (Math.abs(offsetRef.current) >= halfWidth) {
          offsetRef.current += halfWidth;
        }
      }
      el.style.transform = `translateX(${offsetRef.current}px)`;
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animRef.current);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [data]);

  if (!data?.length) return null;

  const items = [...data, ...data];

  return (
    <section class={s.contributors}>
      <div class={s.header}>
        <h2 class={s.heading}>Our contributors</h2>
        <p class={s.sub}>
          These people have helped make Rotur what it is. Hover to pause.
        </p>
      </div>
      <div class={s.carouselOuter}>
        <div class={s.fadeLeft} />
        <div class={s.fadeRight} />
        <div class={s.carouselInner}>
          <div ref={carouselRef} class={s.track}>
            {items.map((c, i) => (
              <a
                key={`${c.name}-${i}`}
                href={c.link}
                target="_blank"
                rel="noopener noreferrer"
                title={c.name}
                class={s.avatar}
              >
                <img
                  src={c.pfp}
                  alt={c.name}
                  class={s.avatarImg}
                  draggable={false}
                />
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
