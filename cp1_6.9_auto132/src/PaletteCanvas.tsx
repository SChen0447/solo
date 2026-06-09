import React, { useRef, useEffect } from 'react';
import p5 from 'p5';
import type { Ingredient, ScentCluster } from './App';

interface PaletteCanvasProps {
  clusters: ScentCluster[];
  ingredients: Ingredient[];
  activeCluster: number | null;
  onClusterClick: (index: number) => void;
  strength: number;
  strengthColor: string;
  readOnly?: boolean;
}

const PaletteCanvas: React.FC<PaletteCanvasProps> = ({
  clusters,
  ingredients,
  activeCluster,
  onClusterClick,
  strength,
  strengthColor,
  readOnly = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5Ref = useRef<p5 | null>(null);
  const ingredientsRef = useRef(ingredients);
  const clustersRef = useRef(clusters);
  const activeClusterRef = useRef(activeCluster);
  const strengthRef = useRef(strength);
  const strengthColorRef = useRef(strengthColor);
  const readOnlyRef = useRef(readOnly);
  const onClusterClickRef = useRef(onClusterClick);

  useEffect(() => {
    ingredientsRef.current = ingredients;
  }, [ingredients]);
  useEffect(() => {
    clustersRef.current = clusters;
  }, [clusters]);
  useEffect(() => {
    activeClusterRef.current = activeCluster;
  }, [activeCluster]);
  useEffect(() => {
    strengthRef.current = strength;
  }, [strength]);
  useEffect(() => {
    strengthColorRef.current = strengthColor;
  }, [strengthColor]);
  useEffect(() => {
    readOnlyRef.current = readOnly;
  }, [readOnly]);
  useEffect(() => {
    onClusterClickRef.current = onClusterClick;
  }, [onClusterClick]);

  useEffect(() => {
    if (!containerRef.current) return;

    const sketch = (p: p5) => {
      let rotationAngle = 0;
      let particles: {
        x: number;
        y: number;
        vx: number;
        vy: number;
        color: string;
        life: number;
      }[] = [];

      const hexToRgb = (hex: string) => {
        const h = hex.replace('#', '');
        return {
          r: parseInt(h.substring(0, 2), 16),
          g: parseInt(h.substring(2, 4), 16),
          b: parseInt(h.substring(4, 6), 16),
        };
      };

      const lerpColor = (c1: string, c2: string, t: number) => {
        const a = hexToRgb(c1);
        const b = hexToRgb(c2);
        return {
          r: Math.round(a.r + (b.r - a.r) * t),
          g: Math.round(a.g + (b.g - a.g) * t),
          b: Math.round(a.b + (b.b - a.b) * t),
        };
      };

      const getDiameter = () => {
        const w = p.windowWidth;
        if (w < 480) return 200;
        if (w < 768) return 280;
        return 400;
      };

      const getRadius = () => getDiameter() / 2;

      p.setup = () => {
        const size = Math.min(600, getDiameter() + 150);
        p.createCanvas(size, size);
        p.frameRate(60);
      };

      p.windowResized = () => {
        const size = Math.min(600, getDiameter() + 150);
        p.resizeCanvas(size, size);
      };

      p.mouseClicked = () => {
        if (readOnlyRef.current) return;
        const cx = p.width / 2;
        const cy = p.height / 2;
        const r = getRadius();
        const dx = p.mouseX - cx;
        const dy = p.mouseY - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < r * 0.88 && dist > r * 0.32) {
          let angle = Math.atan2(dy, dx);
          if (angle < -Math.PI / 2) angle += Math.PI * 2;
          angle += Math.PI / 2;
          const n = clustersRef.current.length;
          const sectorAngle = (Math.PI * 2) / n;
          let idx = Math.floor(((angle + Math.PI) % (Math.PI * 2)) / sectorAngle);
          if (idx < 0) idx += n;
          idx = idx % n;
          if (idx >= 0 && idx < n) {
            onClusterClickRef.current(idx);
          }
        }
      };

      const drawPalette = () => {
        const cx = p.width / 2;
        const cy = p.height / 2;
        const r = getRadius();
        const n = clustersRef.current.length;
        const sectorAngle = (Math.PI * 2) / n;

        const strength = strengthRef.current;
        p.noFill();
        p.stroke(strengthColorRef.current);
        p.strokeWeight(4);
        p.arc(cx, cy, r * 2 * 0.96, r * 2 * 0.96, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * Math.min(strength, 100)) / 100);

        p.textAlign(p.CENTER, p.CENTER);
        p.textSize(r * 0.18);
        p.noStroke();
        p.fill(strengthColorRef.current);
        p.text(`${Math.round(strength)}%`, cx, cy - r * 1.12);

        for (let i = 0; i < n; i++) {
          const start = -Math.PI / 2 + i * sectorAngle + 0.008;
          const end = -Math.PI / 2 + (i + 1) * sectorAngle - 0.008;
          const cluster = clustersRef.current[i];
          const rgb = hexToRgb(cluster.color);
          const isActive = activeClusterRef.current === i;
          const rr = r * (isActive ? 0.9 : 0.86);

          if (isActive) {
            p.drawingContext.shadowColor = cluster.color;
            p.drawingContext.shadowBlur = 20;
          } else {
            p.drawingContext.shadowBlur = 0;
          }

          p.noStroke();
          p.fill(rgb.r, rgb.g, rgb.b, isActive ? 255 : 210);
          p.arc(cx, cy, rr * 2, rr * 2, start, end, p.PIE);

          p.drawingContext.shadowBlur = 0;
          p.fill(255, 255, 255, 230);
          p.textSize(r * 0.1);
          const midAngle = (start + end) / 2;
          const labelR = rr * 0.78;
          const lx = cx + Math.cos(midAngle) * labelR;
          const ly = cy + Math.sin(midAngle) * labelR;
          p.text(cluster.name, lx, ly);
        }
      };

      const drawVortex = () => {
        const cx = p.width / 2;
        const cy = p.height / 2;
        const r = getRadius();
        const ings = ingredientsRef.current;
        const coreR = r * 0.3;

        if (ings.length === 0) {
          p.noStroke();
          const grad = p.drawingContext.createRadialGradient(cx, cy, 0, cx, cy, coreR);
          grad.addColorStop(0, 'rgba(80, 80, 140, 0.9)');
          grad.addColorStop(1, 'rgba(30, 30, 70, 0.6)');
          p.drawingContext.fillStyle = grad;
          p.circle(cx, cy, coreR * 2);
          return;
        }

        const totalRatio = ings.reduce((s, i) => s + i.ratio, 0);
        const count = ings.length;
        const basePeriod = count >= 8 ? 6 : count >= 4 ? 3 + (8 - count) * 0.5 : 3;
        const angularSpeed = (Math.PI * 2) / (basePeriod * 60);
        rotationAngle += angularSpeed;

        if (Math.random() < 0.4) {
          const randomIng = ings[Math.floor(Math.random() * ings.length)];
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * coreR * 0.3;
          particles.push({
            x: cx + Math.cos(angle) * dist,
            y: cy + Math.sin(angle) * dist,
            vx: Math.cos(angle + Math.PI / 2) * 0.8,
            vy: Math.sin(angle + Math.PI / 2) * 0.8,
            color: randomIng.color,
            life: 1,
          });
        }
        if (particles.length > 120) particles = particles.slice(-120);

        const viscosity = 0.3;

        for (let i = particles.length - 1; i >= 0; i--) {
          const pt = particles[i];
          const dx = pt.x - cx;
          const dy = pt.y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0) {
            const tangential = 0.5 + (dist / coreR) * 0.5;
            pt.vx += (-dy / dist) * tangential * 0.15;
            pt.vy += (dx / dist) * tangential * 0.15;
            pt.vx += (dx / dist) * -0.02;
            pt.vy += (dy / dist) * -0.02;
          }
          pt.vx *= 1 - viscosity * 0.03;
          pt.vy *= 1 - viscosity * 0.03;
          pt.x += pt.vx;
          pt.y += pt.vy;
          pt.life -= 0.008;
          if (pt.life <= 0 || dist > coreR * 0.95) {
            particles.splice(i, 1);
          }
        }

        const layers = 6;
        for (let layer = layers; layer >= 0; layer--) {
          const layerR = coreR * (0.3 + (layer / layers) * 0.7);
          p.noStroke();
          for (let seg = 0; seg < ings.length; seg++) {
            const ing = ings[seg];
            const ratio = totalRatio > 0 ? ing.ratio / totalRatio : 1 / ings.length;
            const segAngle = Math.PI * 2 * ratio;
            const startAngle = rotationAngle * (1 + layer * 0.08) + seg * (Math.PI * 2 / ings.length);
            const endAngle = startAngle + segAngle;
            const rgb = hexToRgb(ing.color);
            const alpha = 80 + layer * 20;
            p.fill(rgb.r, rgb.g, rgb.b, Math.min(alpha, 220));
            const wobble = Math.sin(rotationAngle * 2 + layer + seg) * 4;
            p.arc(cx, cy, (layerR + wobble) * 2, (layerR + wobble) * 2, startAngle, endAngle, p.PIE);
          }
        }

        for (const pt of particles) {
          const rgb = hexToRgb(pt.color);
          p.noStroke();
          p.drawingContext.shadowColor = pt.color;
          p.drawingContext.shadowBlur = 8;
          p.fill(rgb.r, rgb.g, rgb.b, Math.round(pt.life * 200));
          p.circle(pt.x, pt.y, 6 * pt.life + 2);
        }
        p.drawingContext.shadowBlur = 0;

        const grad = p.drawingContext.createRadialGradient(cx, cy, 0, cx, cy, coreR);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
        p.drawingContext.fillStyle = grad;
        p.noStroke();
        p.circle(cx, cy, coreR * 2);
      };

      const drawIngredientDots = () => {
        const cx = p.width / 2;
        const cy = p.height / 2;
        const r = getRadius();
        const ings = ingredientsRef.current;
        if (ings.length === 0) return;

        const n = clustersRef.current.length;
        const sectorAngle = (Math.PI * 2) / n;

        for (const ing of ings) {
          const clusterIdx = clustersRef.current.findIndex((c) =>
            c.ingredients.some((ci) => ci.name === ing.name)
          );
          if (clusterIdx === -1) continue;
          const cluster = clustersRef.current[clusterIdx];
          const ingIdx = cluster.ingredients.findIndex((ci) => ci.name === ing.name);
          const count = cluster.ingredients.length;
          const sectorStart = -Math.PI / 2 + clusterIdx * sectorAngle;
          const dotAngle = sectorStart + (sectorAngle * (ingIdx + 1)) / (count + 1);
          const dotR = r * 0.92;
          const dx = cx + Math.cos(dotAngle) * dotR;
          const dy = cy + Math.sin(dotAngle) * dotR;
          const rgb = hexToRgb(ing.color);

          p.drawingContext.shadowColor = ing.color;
          p.drawingContext.shadowBlur = 12;
          p.noStroke();
          p.fill(rgb.r, rgb.g, rgb.b, 255);
          p.circle(dx, dy, 12);
          p.drawingContext.shadowBlur = 0;
          p.fill(255, 255, 255, 200);
          p.circle(dx - 1.5, dy - 1.5, 3);
        }
      };

      p.draw = () => {
        p.clear();
        drawVortex();
        drawPalette();
        drawIngredientDots();
      };
    };

    p5Ref.current = new p5(sketch, containerRef.current);
    return () => {
      if (p5Ref.current) {
        p5Ref.current.remove();
        p5Ref.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: readOnly ? 'default' : 'pointer',
      }}
    />
  );
};

export default PaletteCanvas;
