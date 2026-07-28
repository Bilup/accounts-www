import { useRef, useEffect } from "preact/hooks";
import s from "./StarField.module.css";

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  baseOpacity: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

function createStar(width: number, height: number): Star {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    z: Math.random(),
    size: Math.random() < 0.3 ? 1.5 + Math.random() : 0.8 + Math.random() * 0.6,
    baseOpacity: 0.4 + Math.random() * 0.55,
    twinkleSpeed: 1.5 + Math.random() * 3,
    twinkleOffset: Math.random() * Math.PI * 2,
  };
}

export function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const STAR_COUNT = 100;

    const stars: Star[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push(createStar(width, height));
    }

    let lastTime = performance.now();
    let animId = 0;

    function drawStar(star: Star, time: number) {
      const twinkle = Math.sin(
        time * 0.001 * star.twinkleSpeed + star.twinkleOffset,
      );
      const opacity = star.baseOpacity * (0.5 + 0.5 * twinkle);
      const depthScale = 0.3 + star.z * 0.7;
      const size = star.size * depthScale;
      const finalOpacity = opacity * depthScale;

      ctx!.globalAlpha = finalOpacity;
      ctx!.fillStyle = "#fff";
      ctx!.beginPath();
      ctx!.arc(star.x, star.y, size, 0, Math.PI * 2);
      ctx!.fill();
    }

    function update(time: number) {
      lastTime = time;

      ctx!.clearRect(0, 0, width, height);

      for (const star of stars) {
        drawStar(star, time);
      }

      animId = requestAnimationFrame(update);
    }

    function handleResize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas!.width = width;
      canvas!.height = height;

      for (const star of stars) {
        star.x = Math.random() * width;
        star.y = Math.random() * height;
      }
    }

    function drawStatic() {
      ctx!.clearRect(0, 0, width, height);
      for (const star of stars) drawStar(star, 0);
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function start() {
      cancelAnimationFrame(animId);
      if (reduceMotion.matches) {
        drawStatic();
      } else {
        lastTime = performance.now();
        animId = requestAnimationFrame(update);
      }
    }

    function onResize() {
      handleResize();
      if (reduceMotion.matches) drawStatic();
    }

    window.addEventListener("resize", onResize);
    reduceMotion.addEventListener("change", start);
    start();

    return () => {
      window.removeEventListener("resize", onResize);
      reduceMotion.removeEventListener("change", start);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div class={s.field} aria-hidden="true">
      <canvas ref={canvasRef} class={s.canvas} />
    </div>
  );
}
