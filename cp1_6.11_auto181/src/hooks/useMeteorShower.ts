import { useRef, useEffect, useCallback } from 'react';

export interface Meteor {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  width: number;
  opacity: number;
  life: number;
  maxLife: number;
  color: string;
  isClickable: boolean;
  trailLength: number;
}

interface UseMeteorShowerOptions {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  meteorFrequency?: number;
  onMeteorClick?: (meteor: Meteor, clickX: number, clickY: number) => void;
  clickRadius?: number;
}

export function useMeteorShower({
  canvasRef,
  meteorFrequency = 4,
  onMeteorClick,
  clickRadius = 25,
}: UseMeteorShowerOptions) {
  const meteorsRef = useRef<Meteor[]>([]);
  const starsRef = useRef<{ x: number; y: number; size: number; opacity: number; twinkleSpeed: number; phase: number }[]>([]);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const meteorIdCounter = useRef(0);
  const bigMeteorTimerRef = useRef<number>(0);
  const nextBigMeteorTimeRef = useRef<number>(3000);

  const createBackgroundMeteor = useCallback((width: number, height: number): Meteor => {
    const angle = (Math.random() * 60 + 60) * (Math.PI / 180);
    const speed = 150 + Math.random() * 250;
    const side = Math.random();
    let x, y;
    
    if (side < 0.5) {
      x = Math.random() * width;
      y = -30;
    } else {
      x = -30;
      y = Math.random() * height * 0.6;
    }

    return {
      id: meteorIdCounter.current++,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      length: 15 + Math.random() * 15,
      width: 1 + Math.random() * 2,
      opacity: 0.3 + Math.random() * 0.5,
      life: 0,
      maxLife: 2000 + Math.random() * 2000,
      color: '#ffffff',
      isClickable: false,
      trailLength: 0,
    };
  }, []);

  const createBigMeteor = useCallback((width: number, height: number): Meteor => {
    const angle = (Math.random() * 40 + 70) * (Math.PI / 180);
    const speed = 80 + Math.random() * 80;
    const side = Math.random();
    let x, y;
    
    if (side < 0.6) {
      x = Math.random() * width * 0.8 + width * 0.1;
      y = -50;
    } else {
      x = -50;
      y = Math.random() * height * 0.5 + height * 0.1;
    }

    return {
      id: meteorIdCounter.current++,
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      length: 0,
      width: 3,
      opacity: 0.5 + Math.random() * 0.3,
      life: 0,
      maxLife: 1500 + Math.random() * 1500,
      color: '#ffffff',
      isClickable: true,
      trailLength: 80 + Math.random() * 70,
    };
  }, []);

  const initStars = useCallback((width: number, height: number) => {
    const stars = [];
    for (let i = 0; i < 500; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 1 + Math.random() * 2,
        opacity: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 2000 + Math.random() * 4000,
        phase: Math.random() * Math.PI * 2,
      });
    }
    starsRef.current = stars;
  }, []);

  const drawStars = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    const stars = starsRef.current;
    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      const twinkle = Math.sin(time / star.twinkleSpeed * Math.PI * 2 + star.phase);
      const opacity = star.opacity * (0.5 + twinkle * 0.5);
      
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.fill();
    }
  }, []);

  const drawMeteor = useCallback((ctx: CanvasRenderingContext2D, meteor: Meteor) => {
    const lifeRatio = meteor.life / meteor.maxLife;
    let opacity = meteor.opacity;
    
    if (lifeRatio < 0.1) {
      opacity *= lifeRatio / 0.1;
    } else if (lifeRatio > 0.8) {
      opacity *= (1 - lifeRatio) / 0.2;
    }

    if (meteor.isClickable) {
      const gradient = ctx.createLinearGradient(
        meteor.x, meteor.y,
        meteor.x - meteor.vx * 0.08,
        meteor.y - meteor.vy * 0.08
      );
      gradient.addColorStop(0, `rgba(180, 200, 255, ${opacity})`);
      gradient.addColorStop(0.3, `rgba(150, 180, 255, ${opacity * 0.7})`);
      gradient.addColorStop(1, 'rgba(100, 150, 255, 0)');

      const tailX = meteor.x - meteor.vx * (meteor.trailLength / 200);
      const tailY = meteor.y - meteor.vy * (meteor.trailLength / 200);
      
      const tailGradient = ctx.createLinearGradient(meteor.x, meteor.y, tailX, tailY);
      tailGradient.addColorStop(0, `rgba(200, 220, 255, ${opacity * 0.8})`);
      tailGradient.addColorStop(1, 'rgba(100, 150, 255, 0)');

      ctx.beginPath();
      ctx.moveTo(meteor.x, meteor.y);
      ctx.lineTo(tailX, tailY);
      ctx.strokeStyle = tailGradient;
      ctx.lineWidth = meteor.width;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(meteor.x, meteor.y, meteor.width * 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(meteor.x, meteor.y, meteor.width * 5, 0, Math.PI * 2);
      const glowGradient = ctx.createRadialGradient(
        meteor.x, meteor.y, 0,
        meteor.x, meteor.y, meteor.width * 5
      );
      glowGradient.addColorStop(0, `rgba(150, 180, 255, ${opacity * 0.4})`);
      glowGradient.addColorStop(1, 'rgba(100, 150, 255, 0)');
      ctx.fillStyle = glowGradient;
      ctx.fill();
    } else {
      const endX = meteor.x - meteor.vx * (meteor.length / 300);
      const endY = meteor.y - meteor.vy * (meteor.length / 300);

      const gradient = ctx.createLinearGradient(meteor.x, meteor.y, endX, endY);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
      gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

      ctx.beginPath();
      ctx.moveTo(meteor.x, meteor.y);
      ctx.lineTo(endX, endY);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = meteor.width;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  }, []);

  const handleCanvasClick = useCallback((e: MouseEvent) => {
    if (!onMeteorClick || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const meteors = meteorsRef.current;
    for (let i = meteors.length - 1; i >= 0; i--) {
      const meteor = meteors[i];
      if (!meteor.isClickable) continue;

      const dx = clickX - meteor.x;
      const dy = clickY - meteor.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < clickRadius + meteor.width * 2) {
        onMeteorClick(meteor, clickX, clickY);
        meteors.splice(i, 1);
        break;
      }
    }
  }, [onMeteorClick, canvasRef, clickRadius]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars(canvas.width, canvas.height);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('click', handleCanvasClick);

    const animate = (time: number) => {
      const deltaTime = lastTimeRef.current ? time - lastTimeRef.current : 16;
      lastTimeRef.current = time;

      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      drawStars(ctx, time);

      bigMeteorTimerRef.current += deltaTime;
      if (bigMeteorTimerRef.current >= nextBigMeteorTimeRef.current) {
        bigMeteorTimerRef.current = 0;
        nextBigMeteorTimeRef.current = (3000 + Math.random() * 2000) / (meteorFrequency / 4);
        meteorsRef.current.push(createBigMeteor(canvas.width, canvas.height));
      }

      const bgMeteorCount = Math.floor((10 + Math.random() * 20) * (deltaTime / 1000));
      for (let i = 0; i < bgMeteorCount; i++) {
        if (Math.random() < 0.3) {
          meteorsRef.current.push(createBackgroundMeteor(canvas.width, canvas.height));
        }
      }

      const meteors = meteorsRef.current;
      for (let i = meteors.length - 1; i >= 0; i--) {
        const meteor = meteors[i];
        meteor.life += deltaTime;
        meteor.x += meteor.vx * (deltaTime / 1000);
        meteor.y += meteor.vy * (deltaTime / 1000);

        if (
          meteor.life >= meteor.maxLife ||
          meteor.x > canvas.width + 100 ||
          meteor.y > canvas.height + 100 ||
          meteor.x < -100
        ) {
          meteors.splice(i, 1);
          continue;
        }

        drawMeteor(ctx, meteor);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('click', handleCanvasClick);
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [canvasRef, createBackgroundMeteor, createBigMeteor, drawStars, drawMeteor, handleCanvasClick, initStars, meteorFrequency]);

  return {
    meteors: meteorsRef.current,
  };
}
