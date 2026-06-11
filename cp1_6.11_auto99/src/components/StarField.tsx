import { useRef, useEffect } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  phase: number;
}

export default function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();

    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    if (starsRef.current.length === 0) {
      starsRef.current = Array.from({ length: 120 }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 1 + Math.random() * 2,
        opacity: Math.random(),
        speed: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
      }));
    }

    let startTime = performance.now();

    const draw = (now: number) => {
      const t = (now - startTime) / 1000;
      ctx.clearRect(0, 0, w, h);

      for (const star of starsRef.current) {
        const flicker = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * star.speed + star.phase));
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${flicker * 0.6})`;
        ctx.fill();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    const onResize = () => {
      resize();
      const nw = canvas.offsetWidth;
      const nh = canvas.offsetHeight;
      starsRef.current = starsRef.current.map((s) => ({
        ...s,
        x: (s.x / w) * nw,
        y: (s.y / h) * nh,
      }));
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
}
