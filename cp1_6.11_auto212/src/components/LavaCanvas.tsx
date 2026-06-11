import { useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { LavaBlob, EnergyParticle, RippleEffect, ColorScheme } from '../types';
import { octaveNoise } from '../utils/perlinNoise';
import { lerpColorHsl, rgbaString } from '../utils/colorUtils';
import {
  easeOutCubic,
  easeOutQuad,
  clamp,
  distance,
  angleToVector,
  lerp,
} from '../utils/physics';

interface LavaCanvasProps {
  temperature: number;
  gravityAngle: number;
  currentScheme: ColorScheme;
  onParticleCollect: () => void;
  complementaryColor: string;
}

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;
const MAX_BLOBS = 20;
const MIN_BLOBS = 12;
const SCALE_ANIMATION_DURATION = 400;
const PARTICLE_LIFETIME = 5000;
const PARTICLE_SPAWN_MIN = 8000;
const PARTICLE_SPAWN_MAX = 12000;
const COLOR_TRANSITION_DURATION = 2000;
const RIPPLE_DURATION = 500;

export default function LavaCanvas({
  temperature,
  gravityAngle,
  currentScheme,
  onParticleCollect,
  complementaryColor,
}: LavaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blobsRef = useRef<LavaBlob[]>([]);
  const particlesRef = useRef<EnergyParticle[]>([]);
  const ripplesRef = useRef<RippleEffect[]>([]);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const lastParticleSpawnRef = useRef<number>(0);
  const nextParticleSpawnRef = useRef<number>(0);
  const colorTransitionRef = useRef<{
    active: boolean;
    startTime: number;
    fromScheme: ColorScheme | null;
    toScheme: ColorScheme | null;
  }>({ active: false, startTime: 0, fromScheme: null, toScheme: null });
  const prevSchemeRef = useRef<ColorScheme>(currentScheme);
  const gravityAnimRef = useRef<{
    currentAngle: number;
    targetAngle: number;
    velocity: number;
    isDragging: boolean;
  }>({ currentAngle: gravityAngle, targetAngle: gravityAngle, velocity: 0, isDragging: false });
  const glowPulseRef = useRef<{ active: boolean; startTime: number }>({
    active: false,
    startTime: 0,
  });

  const initBlobs = useCallback(() => {
    const blobs: LavaBlob[] = [];
    const count = MIN_BLOBS + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < count; i++) {
      const radius = 15 + Math.random() * 30;
      blobs.push({
        id: uuidv4(),
        x: radius + Math.random() * (CANVAS_WIDTH - radius * 2),
        y: radius + Math.random() * (CANVAS_HEIGHT - radius * 2),
        radius,
        targetRadius: radius,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        noiseOffset: Math.random() * 1000,
        noiseSpeed: 0.008 + Math.random() * 0.012,
        scaleAnimation: {
          active: false,
          startTime: 0,
          startScale: 1,
          endScale: 1,
        },
        vertices: 24 + Math.floor(Math.random() * 8),
      });
    }
    
    blobsRef.current = blobs;
  }, []);

  const spawnParticle = useCallback(() => {
    const particle: EnergyParticle = {
      id: uuidv4(),
      x: 30 + Math.random() * (CANVAS_WIDTH - 60),
      y: 30 + Math.random() * (CANVAS_HEIGHT - 60),
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8,
      color: complementaryColor,
      size: 8,
      lifeTime: PARTICLE_LIFETIME,
      createdAt: performance.now(),
    };
    particlesRef.current.push(particle);
  }, [complementaryColor]);

  const addRipple = useCallback((x: number, y: number) => {
    ripplesRef.current.push({
      x,
      y,
      startTime: performance.now(),
      duration: RIPPLE_DURATION,
    });
  }, []);

  const getInterpolatedScheme = useCallback((): ColorScheme => {
    const transition = colorTransitionRef.current;
    if (!transition.active || !transition.fromScheme || !transition.toScheme) {
      return currentScheme;
    }

    const elapsed = performance.now() - transition.startTime;
    const t = clamp(elapsed / COLOR_TRANSITION_DURATION, 0, 1);
    const eased = easeOutCubic(t);

    if (t >= 1) {
      colorTransitionRef.current.active = false;
      return transition.toScheme;
    }

    return {
      ...transition.toScheme,
      background: {
        bottom: lerpColorHsl(transition.fromScheme.background.bottom, transition.toScheme.background.bottom, eased),
        top: lerpColorHsl(transition.fromScheme.background.top, transition.toScheme.background.top, eased),
      },
      lava: {
        center: lerpColorHsl(transition.fromScheme.lava.center, transition.toScheme.lava.center, eased),
        edge: lerpColorHsl(transition.fromScheme.lava.edge, transition.toScheme.lava.edge, eased),
      },
      glow: lerpColorHsl(transition.fromScheme.glow, transition.toScheme.glow, eased),
    };
  }, [currentScheme]);

  const drawBlob = useCallback(
    (ctx: CanvasRenderingContext2D, blob: LavaBlob, scheme: ColorScheme, time: number) => {
      let scale = 1;
      if (blob.scaleAnimation.active) {
        const elapsed = time - blob.scaleAnimation.startTime;
        const t = clamp(elapsed / SCALE_ANIMATION_DURATION, 0, 1);
        const eased = easeOutQuad(t);
        scale = lerp(blob.scaleAnimation.startScale, blob.scaleAnimation.endScale, eased);
        
        if (t >= 1) {
          blob.scaleAnimation.active = false;
          blob.radius = blob.targetRadius;
        }
      }

      const currentRadius = blob.scaleAnimation.active
        ? blob.radius * scale
        : blob.targetRadius;

      const points: { x: number; y: number }[] = [];
      const noiseScale = 0.015;
      
      for (let i = 0; i < blob.vertices; i++) {
        const angle = (i / blob.vertices) * Math.PI * 2;
        const noiseVal = octaveNoise(
          Math.cos(angle) * noiseScale * currentRadius + blob.noiseOffset,
          Math.sin(angle) * noiseScale * currentRadius + blob.noiseOffset + time * blob.noiseSpeed,
          3,
          0.5
        );
        const displacement = 0.2 + noiseVal * 0.8;
        const r = currentRadius * (0.85 + displacement * 0.25);
        
        points.push({
          x: blob.x + Math.cos(angle) * r,
          y: blob.y + Math.sin(angle) * r,
        });
      }

      ctx.save();
      ctx.beginPath();
      
      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        
        if (i === 0) {
          ctx.moveTo(midX, midY);
        }
        ctx.quadraticCurveTo(p2.x, p2.y, (p2.x + points[(i + 2) % points.length].x) / 2, (p2.y + points[(i + 2) % points.length].y) / 2);
      }
      
      ctx.closePath();

      const gradient = ctx.createRadialGradient(
        blob.x,
        blob.y,
        0,
        blob.x,
        blob.y,
        currentRadius
      );
      gradient.addColorStop(0, rgbaString(scheme.lava.center, 0.95));
      gradient.addColorStop(0.4, rgbaString(scheme.lava.center, 0.85));
      gradient.addColorStop(0.7, rgbaString(scheme.lava.edge, 0.65));
      gradient.addColorStop(1, rgbaString(scheme.lava.edge, 0.2));
      
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.shadowColor = rgbaString(scheme.glow, 0.4);
      ctx.shadowBlur = 15;
      ctx.fill();
      
      ctx.restore();
    },
    []
  );

  const drawParticle = useCallback(
    (ctx: CanvasRenderingContext2D, particle: EnergyParticle, time: number) => {
      const age = time - particle.createdAt;
      const lifeRatio = age / particle.lifeTime;
      
      let alpha = 1;
      if (lifeRatio < 0.1) {
        alpha = lifeRatio / 0.1;
      } else if (lifeRatio > 0.8) {
        alpha = (1 - lifeRatio) / 0.2;
      }
      alpha = clamp(alpha, 0, 1);

      const pulse = 1 + Math.sin(time * 0.005 + particle.createdAt) * 0.15;
      const size = particle.size * pulse;

      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(time * 0.001);

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const x = Math.cos(angle) * size;
        const y = Math.sin(angle) * size;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();

      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 20;
      ctx.fillStyle = rgbaString(particle.color, alpha);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    },
    []
  );

  const drawRipple = useCallback(
    (ctx: CanvasRenderingContext2D, ripple: RippleEffect, time: number) => {
      const elapsed = time - ripple.startTime;
      const t = elapsed / ripple.duration;
      
      if (t >= 1) return;

      const radius = t * 60;
      const alpha = (1 - t) * 0.8;

      ctx.save();
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    },
    []
  );

  const drawLiquidBackground = useCallback(
    (ctx: CanvasRenderingContext2D, scheme: ColorScheme, time: number) => {
      const gradient = ctx.createLinearGradient(0, CANVAS_HEIGHT, 0, 0);
      gradient.addColorStop(0, rgbaString(scheme.background.bottom, 0.6));
      gradient.addColorStop(1, rgbaString(scheme.background.top, 0.6));
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      
      const waveCount = 3;
      const baseY = 15;
      
      for (let x = 0; x <= CANVAS_WIDTH; x += 2) {
        let y = baseY;
        for (let w = 0; w < waveCount; w++) {
          const frequency = 0.008 + w * 0.005;
          const amplitude = 1.5 + w * 0.5;
          const phase = time * 0.0008 + w * 1.2;
          y += Math.sin(x * frequency + phase) * amplitude;
        }
        ctx.lineTo(x, y);
      }
      
      ctx.lineTo(CANVAS_WIDTH, 0);
      ctx.closePath();
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fill();
      ctx.restore();
    },
    []
  );

  const updateBlobs = useCallback(
    (dt: number, time: number) => {
      const blobs = blobsRef.current;
      const gravityVec = angleToVector(gravityAnimRef.current.currentAngle);
      
      const tempFactor = temperature / 100;
      const baseRiseSpeed = 0.3 + tempFactor * 1.5;
      const horizontalDrift = gravityVec.x * baseRiseSpeed * 0.3;

      for (const blob of blobs) {
        blob.vy += -baseRiseSpeed * 0.02 * dt;
        blob.vx += horizontalDrift * 0.02 * dt;
        
        blob.vy += gravityVec.y * 0.01 * dt;
        blob.vx += gravityVec.x * 0.01 * dt;
        
        blob.vx *= 0.99;
        blob.vy *= 0.99;
        
        blob.x += blob.vx * dt;
        blob.y += blob.vy * dt;

        if (blob.x - blob.radius < 0) {
          blob.x = blob.radius;
          blob.vx = Math.abs(blob.vx) * 0.5;
        }
        if (blob.x + blob.radius > CANVAS_WIDTH) {
          blob.x = CANVAS_WIDTH - blob.radius;
          blob.vx = -Math.abs(blob.vx) * 0.5;
        }
        if (blob.y - blob.radius < 0) {
          blob.y = blob.radius;
          blob.vy = Math.abs(blob.vy) * 0.3;
        }
        if (blob.y + blob.radius > CANVAS_HEIGHT) {
          blob.y = CANVAS_HEIGHT - blob.radius;
          blob.vy = -Math.abs(blob.vy) * 0.3;
        }

        blob.noiseOffset += blob.noiseSpeed * dt * 0.1;
      }

      if (temperature > 70 && blobs.length < MAX_BLOBS) {
        for (let i = blobs.length - 1; i >= 0; i--) {
          const blob = blobs[i];
          if (blob.targetRadius > 35 && Math.random() < 0.005 * dt) {
            const newRadius = blob.targetRadius * 0.55;
            const angle = Math.random() * Math.PI * 2;
            const dist = newRadius * 0.8;
            
            blob.targetRadius = newRadius;
            blob.radius = newRadius;
            blob.scaleAnimation = {
              active: true,
              startTime: time,
              startScale: 1.8,
              endScale: 1,
            };

            const newBlob: LavaBlob = {
              id: uuidv4(),
              x: blob.x + Math.cos(angle) * dist,
              y: blob.y + Math.sin(angle) * dist,
              radius: newRadius * 0.1,
              targetRadius: newRadius,
              vx: blob.vx + Math.cos(angle) * 0.5,
              vy: blob.vy + Math.sin(angle) * 0.5,
              noiseOffset: Math.random() * 1000,
              noiseSpeed: 0.008 + Math.random() * 0.012,
              scaleAnimation: {
                active: true,
                startTime: time,
                startScale: 0.1,
                endScale: 1,
              },
              vertices: 24 + Math.floor(Math.random() * 8),
            };
            
            blobs.push(newBlob);
            
            if (blobs.length >= MAX_BLOBS) break;
          }
        }
      }

      if (temperature < 30) {
        for (let i = 0; i < blobs.length; i++) {
          for (let j = i + 1; j < blobs.length; j++) {
            const b1 = blobs[i];
            const b2 = blobs[j];
            
            if (b1.scaleAnimation.active || b2.scaleAnimation.active) continue;
            
            const dist = distance(b1.x, b1.y, b2.x, b2.y);
            const sumRadius = b1.targetRadius + b2.targetRadius;
            
            if (sumRadius < 50 && dist < 20) {
              const newRadius = Math.sqrt(b1.targetRadius ** 2 + b2.targetRadius ** 2);
              const totalArea = b1.targetRadius ** 2 + b2.targetRadius ** 2;
              const ratio1 = b1.targetRadius ** 2 / totalArea;
              
              b1.x = b1.x * ratio1 + b2.x * (1 - ratio1);
              b1.y = b1.y * ratio1 + b2.y * (1 - ratio1);
              b1.vx = b1.vx * ratio1 + b2.vx * (1 - ratio1);
              b1.vy = b1.vy * ratio1 + b2.vy * (1 - ratio1);
              b1.targetRadius = newRadius;
              b1.scaleAnimation = {
                active: true,
                startTime: time,
                startScale: b1.radius / newRadius,
                endScale: 1,
              };
              
              blobs.splice(j, 1);
              break;
            }
          }
        }
      }

      if (blobs.length > MAX_BLOBS) {
        let minDist = Infinity;
        let mergeIdx = -1;
        
        for (let i = 0; i < blobs.length; i++) {
          for (let j = i + 1; j < blobs.length; j++) {
            const dist = distance(blobs[i].x, blobs[i].y, blobs[j].x, blobs[j].y);
            const sizeSum = blobs[i].targetRadius + blobs[j].targetRadius;
            const score = dist / sizeSum;
            
            if (score < minDist) {
              minDist = score;
              mergeIdx = i;
            }
          }
        }
        
        if (mergeIdx >= 0 && mergeIdx + 1 < blobs.length) {
          const b1 = blobs[mergeIdx];
          const b2 = blobs[mergeIdx + 1];
          const newRadius = Math.sqrt(b1.targetRadius ** 2 + b2.targetRadius ** 2);
          
          b1.targetRadius = newRadius;
          b1.scaleAnimation = {
            active: true,
            startTime: time,
            startScale: b1.radius / newRadius,
            endScale: 1,
          };
          
          blobs.splice(mergeIdx + 1, 1);
        }
      }
    },
    [temperature]
  );

  const updateParticles = useCallback(
    (dt: number, time: number) => {
      const particles = particlesRef.current;
      const blobs = blobsRef.current;

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        
        if (p.x < 10 || p.x > CANVAS_WIDTH - 10) p.vx *= -1;
        if (p.y < 10 || p.y > CANVAS_HEIGHT - 10) p.vy *= -1;

        for (const blob of blobs) {
          const dist = distance(blob.x, blob.y, p.x, p.y);
          if (dist < blob.radius + 25) {
            addRipple(p.x, p.y);
            onParticleCollect();
            particles.splice(i, 1);
            break;
          }
        }

        if (time - p.createdAt > p.lifeTime) {
          particles.splice(i, 1);
        }
      }

      if (time - lastParticleSpawnRef.current > nextParticleSpawnRef.current) {
        spawnParticle();
        lastParticleSpawnRef.current = time;
        nextParticleSpawnRef.current =
          PARTICLE_SPAWN_MIN + Math.random() * (PARTICLE_SPAWN_MAX - PARTICLE_SPAWN_MIN);
      }
    },
    [addRipple, onParticleCollect, spawnParticle]
  );

  const updateGravityAnimation = useCallback((dt: number) => {
    const anim = gravityAnimRef.current;
    
    if (anim.isDragging) {
      anim.currentAngle = anim.targetAngle;
      anim.velocity = 0;
      return;
    }

    const diff = anim.targetAngle - anim.currentAngle;
    const springForce = diff * 0.02;
    anim.velocity += springForce * dt;
    anim.velocity *= 0.95;
    anim.currentAngle += anim.velocity * dt;
  }, []);

  const render = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const scheme = getInterpolatedScheme();

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      drawLiquidBackground(ctx, scheme, time);

      for (const blob of blobsRef.current) {
        drawBlob(ctx, blob, scheme, time);
      }

      for (const particle of particlesRef.current) {
        drawParticle(ctx, particle, time);
      }

      for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
        const ripple = ripplesRef.current[i];
        if (time - ripple.startTime > ripple.duration) {
          ripplesRef.current.splice(i, 1);
        } else {
          drawRipple(ctx, ripple, time);
        }
      }

      if (glowPulseRef.current.active) {
        const elapsed = time - glowPulseRef.current.startTime;
        const pulseDuration = 600;
        
        if (elapsed < pulseDuration) {
          let alpha = 0;
          const phase = elapsed / 300;
          
          if (phase < 1) {
            alpha = 0.2 + Math.sin(phase * Math.PI) * 0.4;
          } else if (phase < 2) {
            alpha = 0.2 + Math.sin((phase - 1) * Math.PI) * 0.4;
          }
          
          ctx.save();
          ctx.globalCompositeOperation = 'screen';
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.15})`;
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          ctx.restore();
        } else {
          glowPulseRef.current.active = false;
        }
      }
    },
    [getInterpolatedScheme, drawLiquidBackground, drawBlob, drawParticle, drawRipple]
  );

  const animate = useCallback(
    (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 16.67, 3);
      lastTimeRef.current = time;

      updateBlobs(dt, time);
      updateParticles(dt, time);
      updateGravityAnimation(dt);
      render(time);

      animationRef.current = requestAnimationFrame(animate);
    },
    [updateBlobs, updateParticles, updateGravityAnimation, render]
  );

  useEffect(() => {
    if (prevSchemeRef.current.id !== currentScheme.id) {
      colorTransitionRef.current = {
        active: true,
        startTime: performance.now(),
        fromScheme: prevSchemeRef.current,
        toScheme: currentScheme,
      };
      glowPulseRef.current = {
        active: true,
        startTime: performance.now(),
      };
      prevSchemeRef.current = currentScheme;
    }
  }, [currentScheme]);

  useEffect(() => {
    gravityAnimRef.current.targetAngle = gravityAngle;
  }, [gravityAngle]);

  useEffect(() => {
    initBlobs();
    lastTimeRef.current = performance.now();
    lastParticleSpawnRef.current = performance.now();
    nextParticleSpawnRef.current =
      PARTICLE_SPAWN_MIN + Math.random() * (PARTICLE_SPAWN_MAX - PARTICLE_SPAWN_MIN);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [initBlobs, animate]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="lava-canvas"
    />
  );
}
