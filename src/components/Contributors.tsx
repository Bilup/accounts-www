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

    // Respect reduced-motion: leave the strip static (it's still fully readable).
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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
        // Loop distance = start of the duplicated set (Nth child), excludes
        // the trailing gap that scrollWidth/2 would wrongly include.
        const loopChild = el.children[data.length] as HTMLElement | undefined;
        const loopWidth = loopChild?.offsetLeft ?? el.scrollWidth / 2;
        if (Math.abs(offsetRef.current) >= loopWidth) {
          offsetRef.current += loopWidth;
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
        <div class={s.carouselInner}>
          <div ref={carouselRef} class={s.track}>
            {items.map((c, i) => {
              // Second copy exists only for the seamless loop — hide it from
              // screen readers and keyboard tabbing so each name is reached once.
              const isClone = i >= data.length;
              return (
                <a
                  key={`${c.name}-${i}`}
                  href={c.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={c.name}
                  class={s.avatar}
                  aria-hidden={isClone || undefined}
                  tabIndex={isClone ? -1 : undefined}
                >
                  <img
                    src={c.pfp}
                    alt={isClone ? "" : c.name}
                    class={s.avatarImg}
                    draggable={false}
                  />
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
