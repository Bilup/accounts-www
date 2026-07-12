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

interface ShootingStar {
  x: number;
  y: number;
  angle: number;
  speed: number;
  length: number;
  opacity: number;
  life: number;
  maxLife: number;
  active: boolean;
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

function createShootingStar(width: number, height: number): ShootingStar {
  const angle = (20 + Math.random() * 20) * (Math.PI / 180);
  return {
    x: Math.random() * width * 0.5 - 100,
    y: Math.random() * height * 0.4,
    angle,
    speed: 500 + Math.random() * 400,
    length: 80 + Math.random() * 100,
    opacity: 0,
    life: 0,
    maxLife: 0.8 + Math.random() * 1.2,
    active: true,
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
    const SHOOTING_STAR_COUNT = 3;

    const stars: Star[] = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push(createStar(width, height));
    }

    const shootingStars: ShootingStar[] = [];
    for (let i = 0; i < SHOOTING_STAR_COUNT; i++) {
      const ss = createShootingStar(width, height);
      ss.life = -i * 3;
      ss.active = false;
      shootingStars.push(ss);
    }

    let lastTime = performance.now();
    let animId = 0;

    function spawnShootingStar(ss: ShootingStar) {
      const newStar = createShootingStar(width, height);
      Object.assign(ss, newStar);
      ss.active = true;
    }

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

    function drawShootingStar(ss: ShootingStar) {
      if (!ss.active) return;

      const progress = ss.life / ss.maxLife;
      let opacity: number;
      if (progress < 0.05) {
        opacity = progress / 0.05;
      } else if (progress > 0.75) {
        opacity = (1 - progress) / 0.25;
      } else {
        opacity = 1;
      }
      opacity = Math.max(0, Math.min(1, opacity)) * 0.85;

      const tailX = ss.x - Math.cos(ss.angle) * ss.length;
      const tailY = ss.y - Math.sin(ss.angle) * ss.length;

      const gradient = ctx!.createLinearGradient(tailX, tailY, ss.x, ss.y);
      gradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
      gradient.addColorStop(0.25, `rgba(255, 255, 255, ${0.1 * opacity})`);
      gradient.addColorStop(0.7, `rgba(255, 255, 255, ${0.55 * opacity})`);
      gradient.addColorStop(0.9, `rgba(255, 255, 255, ${0.9 * opacity})`);
      gradient.addColorStop(1, `rgba(255, 255, 255, ${opacity})`);

      ctx!.globalAlpha = 1;
      ctx!.strokeStyle = gradient;
      ctx!.lineWidth = 1.5;
      ctx!.lineCap = "round";
      ctx!.beginPath();
      ctx!.moveTo(tailX, tailY);
      ctx!.lineTo(ss.x, ss.y);
      ctx!.stroke();

      ctx!.globalAlpha = opacity * 0.9;
      ctx!.fillStyle = "#fff";
      ctx!.beginPath();
      ctx!.arc(ss.x, ss.y, 1.5, 0, Math.PI * 2);
      ctx!.fill();
    }

    function update(time: number) {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      ctx!.clearRect(0, 0, width, height);

      for (const star of stars) {
        drawStar(star, time);
      }

      for (const ss of shootingStars) {
        if (ss.active) {
          ss.life += dt;
          ss.x += Math.cos(ss.angle) * ss.speed * dt;
          ss.y += Math.sin(ss.angle) * ss.speed * dt;

          if (
            ss.life >= ss.maxLife ||
            ss.x > width + 200 ||
            ss.y > height + 200
          ) {
            spawnShootingStar(ss);
            ss.active = false;
            ss.life = -(2 + Math.random() * 4);
          }
        } else {
          ss.life += dt;
          if (ss.life >= 0) {
            spawnShootingStar(ss);
          }
        }
        drawShootingStar(ss);
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

    // Draws a single frame: same starfield, no twinkle cycle, no shooting stars.
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
      // A resize wipes the canvas, so a static field must be repainted.
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
