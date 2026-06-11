import { useRef, useEffect, useState, useCallback } from 'react';
import type { Star } from '../App';

interface AstroCanvasProps {
  stars: Star[];
  selectedStar: Star | null;
  onSelectStar: (star: Star | null) => void;
  activeTool: 'select' | 'draw' | 'erase';
  onAddStar: (ra: number, dec: number) => void;
  onDeleteStar: (starId: string) => void;
}

const CANVAS_SIZE = 500;
const SPHERE_RADIUS = CANVAS_SIZE / 2 - 20;

interface Trail {
  x: number;
  y: number;
  alpha: number;
  size: number;
}

function AstroCanvas({
  stars,
  selectedStar,
  onSelectStar,
  activeTool,
  onAddStar,
  onDeleteStar
}: AstroCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ lon: 0, lat: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, lon: 0, lat: 0 });
  const [mousePos, setMousePos] = useState({ x: -1, y: -1 });
  const trailsRef = useRef<Trail[]>([]);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);

  const projectToCanvas = useCallback((ra: number, dec: number, rotLon: number, rotLat: number) => {
    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;
    const rar = (ra + rotLon) * Math.PI / 180;
    const decr = dec * Math.PI / 180;
    const rotLatr = rotLat * Math.PI / 180;

    const x0 = Math.cos(decr) * Math.sin(rar);
    const y0 = Math.sin(decr);
    const z0 = Math.cos(decr) * Math.cos(rar);

    const y1 = y0 * Math.cos(rotLatr) - z0 * Math.sin(rotLatr);
    const z1 = y0 * Math.sin(rotLatr) + z0 * Math.cos(rotLatr);

    const screenX = cx + SPHERE_RADIUS * x0;
    const screenY = cy - SPHERE_RADIUS * y1;
    return { x: screenX, y: screenY, z: z1, visible: z1 >= -0.05 };
  }, []);

  const unprojectFromCanvas = useCallback((sx: number, sy: number, rotLon: number, rotLat: number) => {
    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;
    const dx = (sx - cx) / SPHERE_RADIUS;
    const dy = (cy - sy) / SPHERE_RADIUS;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1.0) return null;
    const dz = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy));

    const rotLatr = rotLat * Math.PI / 180;
    const y1 = dy;
    const z1 = dz;
    const y0 = y1 * Math.cos(rotLatr) + z1 * Math.sin(rotLatr);
    const z0 = -y1 * Math.sin(rotLatr) + z1 * Math.cos(rotLatr);
    const x0 = dx;

    let ra = Math.atan2(x0, z0) * 180 / Math.PI - rotLon;
    ra = ((ra % 360) + 360) % 360;
    const dec = Math.asin(y0) * 180 / Math.PI;
    return { ra, dec };
  }, []);

  const findStarAt = useCallback((sx: number, sy: number): Star | null => {
    let closest: Star | null = null;
    let closestDist = Infinity;
    for (const star of stars) {
      const proj = projectToCanvas(star.ra, star.dec, rotation.lon, rotation.lat);
      if (!proj.visible) continue;
      const d = Math.hypot(proj.x - sx, proj.y - sy);
      const hitRadius = Math.max(8, (6 - star.magnitude) * 2.5);
      if (d < hitRadius && d < closestDist) {
        closestDist = d;
        closest = star;
      }
    }
    return closest;
  }, [stars, rotation, projectToCanvas]);

  const drawGoldenPentagon = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
      const px = x + r * Math.cos(angle);
      const py = y + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else {
        const innerAngle = angle + Math.PI / 5;
        const ix = x + r * 0.382 * Math.cos(innerAngle);
        const iy = y + r * 0.382 * Math.sin(innerAngle);
        ctx.lineTo(ix, iy);
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255, 255, 200, 1)');
    grad.addColorStop(0.5, 'rgba(255, 215, 0, 0.9)');
    grad.addColorStop(1, 'rgba(184, 134, 11, 0.6)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      timeRef.current += 0.016;
      const cx = CANVAS_SIZE / 2;
      const cy = CANVAS_SIZE / 2;
      const t = timeRef.current;

      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, CANVAS_SIZE / 2);
      bgGrad.addColorStop(0, 'rgba(10, 28, 58, 0.95)');
      bgGrad.addColorStop(0.7, 'rgba(15, 40, 80, 0.9)');
      bgGrad.addColorStop(1, 'rgba(26, 52, 86, 0.85)');
      ctx.fillStyle = bgGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, SPHERE_RADIUS + 2, 0, Math.PI * 2);
      ctx.fill();

      const sphereGrad = ctx.createRadialGradient(cx - 40, cy - 40, SPHERE_RADIUS * 0.1, cx, cy, SPHERE_RADIUS);
      sphereGrad.addColorStop(0, 'rgba(20, 50, 100, 0.6)');
      sphereGrad.addColorStop(0.7, 'rgba(8, 22, 46, 0.85)');
      sphereGrad.addColorStop(1, 'rgba(5, 15, 32, 0.95)');
      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, SPHERE_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, SPHERE_RADIUS, 0, Math.PI * 2);
      ctx.clip();

      ctx.strokeStyle = 'rgba(184, 134, 11, 0.35)';
      ctx.lineWidth = 0.7;
      for (let lon = 0; lon < 360; lon += 15) {
        ctx.beginPath();
        let started = false;
        for (let lat = -90; lat <= 90; lat += 2) {
          const proj = projectToCanvas(lon, lat, rotation.lon, rotation.lat);
          if (!started) {
            ctx.moveTo(proj.x, proj.y);
            started = true;
          } else {
            ctx.lineTo(proj.x, proj.y);
          }
        }
        ctx.stroke();
      }
      for (let lat = -90; lat <= 90; lat += 30) {
        ctx.beginPath();
        let started = false;
        for (let lon = 0; lon <= 360; lon += 2) {
          const proj = projectToCanvas(lon, lat, rotation.lon, rotation.lat);
          if (proj.visible) {
            if (!started) {
              ctx.moveTo(proj.x, proj.y);
              started = true;
            } else {
              ctx.lineTo(proj.x, proj.y);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(184, 134, 11, 0.7)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let lon = 0; lon <= 360; lon += 2) {
        const proj = projectToCanvas(lon, 0, rotation.lon, rotation.lat);
        if (proj.visible) {
          if (lon === 0) ctx.moveTo(proj.x, proj.y);
          else ctx.lineTo(proj.x, proj.y);
        }
      }
      ctx.stroke();

      const sortedStars = [...stars].map(s => {
        const proj = projectToCanvas(s.ra, s.dec, rotation.lon, rotation.lat);
        return { star: s, proj };
      }).filter(x => x.proj.visible).sort((a, b) => a.proj.z - b.proj.z);

      for (const { star, proj } of sortedStars) {
        const baseRadius = Math.max(1.2, (6 - star.magnitude) * 0.85);
        const twinkle = 0.85 + 0.15 * Math.sin(t * 3 + star.ra * 0.1 + star.dec * 0.2);
        const r = baseRadius * twinkle;
        const isSelected = selectedStar?.id === star.id;

        if (isSelected) {
          const selR = r + 10 + 3 * Math.sin(t * 4);
          const selGrad = ctx.createRadialGradient(proj.x, proj.y, r, proj.x, proj.y, selR);
          selGrad.addColorStop(0, 'rgba(255, 255, 200, 0.4)');
          selGrad.addColorStop(1, 'rgba(100, 200, 255, 0)');
          ctx.fillStyle = selGrad;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, selR, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, selR - 2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        if (star.isUserDefined) {
          drawGoldenPentagon(ctx, proj.x, proj.y, r * 2.2, twinkle);
        } else {
          const glowR = r * 4;
          const glowGrad = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, glowR);
          glowGrad.addColorStop(0, 'rgba(255, 215, 0, 0.5)');
          glowGrad.addColorStop(0.5, 'rgba(255, 215, 0, 0.15)');
          glowGrad.addColorStop(1, 'rgba(184, 134, 11, 0)');
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, glowR, 0, Math.PI * 2);
          ctx.fill();

          const starGrad = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, r);
          starGrad.addColorStop(0, '#fffacd');
          starGrad.addColorStop(0.6, '#ffd700');
          starGrad.addColorStop(1, '#b8860b');
          ctx.fillStyle = starGrad;
          ctx.beginPath();
          ctx.arc(proj.x, proj.y, r, 0, Math.PI * 2);
          ctx.fill();

          if (baseRadius > 2) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.arc(proj.x - r * 0.25, proj.y - r * 0.25, r * 0.3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      const updatedTrails: Trail[] = [];
      for (const tr of trailsRef.current) {
        const newAlpha = tr.alpha - 0.025;
        if (newAlpha > 0) {
          updatedTrails.push({ ...tr, alpha: newAlpha, size: tr.size * 0.96 });
          const tg = ctx.createRadialGradient(tr.x, tr.y, 0, tr.x, tr.y, tr.size * 3);
          tg.addColorStop(0, `rgba(255, 240, 150, ${newAlpha})`);
          tg.addColorStop(0.5, `rgba(255, 215, 0, ${newAlpha * 0.5})`);
          tg.addColorStop(1, 'rgba(184, 134, 11, 0)');
          ctx.fillStyle = tg;
          ctx.beginPath();
          ctx.arc(tr.x, tr.y, tr.size * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      trailsRef.current = updatedTrails;

      ctx.restore();

      ctx.strokeStyle = '#b8860b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, SPHERE_RADIUS, 0, Math.PI * 2);
      ctx.stroke();

      const outerGrad = ctx.createRadialGradient(cx, cy, SPHERE_RADIUS, cx, cy, SPHERE_RADIUS + 12);
      outerGrad.addColorStop(0, 'rgba(184, 134, 11, 0.35)');
      outerGrad.addColorStop(1, 'rgba(184, 134, 11, 0)');
      ctx.strokeStyle = outerGrad;
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.arc(cx, cy, SPHERE_RADIUS + 6, 0, Math.PI * 2);
      ctx.stroke();

      if (activeTool === 'draw' && mousePos.x >= 0) {
        const dx = mousePos.x - cx;
        const dy = mousePos.y - cy;
        const inSphere = Math.hypot(dx, dy) <= SPHERE_RADIUS;
        if (inSphere) {
          drawGoldenPentagon(ctx, mousePos.x, mousePos.y, 8, 0.5 + 0.3 * Math.sin(t * 6));
        }
      }

      if (activeTool === 'erase' && mousePos.x >= 0) {
        const dx = mousePos.x - cx;
        const dy = mousePos.y - cy;
        const inSphere = Math.hypot(dx, dy) <= SPHERE_RADIUS;
        ctx.strokeStyle = inSphere ? 'rgba(255, 80, 80, 0.8)' : 'rgba(255, 80, 80, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.arc(mousePos.x, mousePos.y, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(mousePos.x - 10, mousePos.y - 10);
        ctx.lineTo(mousePos.x + 10, mousePos.y + 10);
        ctx.moveTo(mousePos.x + 10, mousePos.y - 10);
        ctx.lineTo(mousePos.x - 10, mousePos.y + 10);
        ctx.stroke();
      }

      const angleLabels: { lon: number; label: string }[] = [
        { lon: 0, label: '0°' },
        { lon: 90, label: '90°' },
        { lon: 180, label: '180°' },
        { lon: 270, label: '270°' }
      ];
      ctx.fillStyle = 'rgba(201, 184, 150, 0.8)';
      ctx.font = '11px "ZCOOL XiaoWei", serif';
      ctx.textAlign = 'center';
      for (const al of angleLabels) {
        const proj = projectToCanvas(al.lon, 0, rotation.lon, rotation.lat);
        if (proj.z > 0.3) {
          ctx.fillText(al.label, proj.x, proj.y + 14);
        }
      }

      const northPole = projectToCanvas(0, 90, rotation.lon, rotation.lat);
      if (northPole.z > 0) {
        ctx.fillStyle = '#ffd700';
        ctx.font = '12px "Ma Shan Zheng", cursive';
        ctx.fillText('北極', northPole.x, northPole.y - 8);
      }
      const southPole = projectToCanvas(0, -90, rotation.lon, rotation.lat);
      if (southPole.z > 0) {
        ctx.fillStyle = '#ffd700';
        ctx.font = '12px "Ma Shan Zheng", cursive';

        ctx.fillText('南極', southPole.x, southPole.y + 18);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [stars, selectedStar, rotation, activeTool, mousePos, projectToCanvas]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const sx = (e.clientX - rect.left) * scaleX;
    const sy = (e.clientY - rect.top) * scaleY;
    const cx = CANVAS_SIZE / 2;
    const cy = CANVAS_SIZE / 2;
    const inSphere = Math.hypot(sx - cx, sy - cy) <= SPHERE_RADIUS;

    if (activeTool === 'select') {
      setIsDragging(true);
      setDragStart({ x: sx, y: sy, lon: rotation.lon, lat: rotation.lat });
      const hit = findStarAt(sx, sy);
      if (hit) onSelectStar(hit);
    } else if (activeTool === 'draw' && inSphere) {
      const coord = unprojectFromCanvas(sx, sy, rotation.lon, rotation.lat);
      if (coord) {
        onAddStar(coord.ra, coord.dec);
        for (let i = 0; i < 8; i++) {
          trailsRef.current.push({
            x: sx + (Math.random() - 0.5) * 10,
            y: sy + (Math.random() - 0.5) * 10,
            alpha: 0.6 + Math.random() * 0.4,
            size: 4 + Math.random() * 4
          });
        }
      }
    } else if (activeTool === 'erase' && inSphere) {
      const hit = findStarAt(sx, sy);
      if (hit && hit.isUserDefined) onDeleteStar(hit.id);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const sx = (e.clientX - rect.left) * scaleX;
    const sy = (e.clientY - rect.top) * scaleY;
    setMousePos({ x: sx, y: sy });

    if (isDragging && activeTool === 'select') {
      const dx = sx - dragStart.x;
      const dy = sy - dragStart.y;
      const newLon = dragStart.lon - dx * 0.5;
      let newLat = dragStart.lat + dy * 0.5;
      newLat = Math.max(-90, Math.min(90, newLat));
      setRotation({ lon: newLon, lat: newLat });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setMousePos({ x: -1, y: -1 });
  };

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      style={{
        width: 'min(500px, 100%)',
        height: 'auto',
        aspectRatio: '1/1',
        borderRadius: '16px',
        cursor: activeTool === 'select' ? (isDragging ? 'grabbing' : 'grab') :
          activeTool === 'draw' ? 'crosshair' : 'not-allowed',
        boxShadow: '0 0 40px rgba(184, 134, 11, 0.3), 0 8px 32px rgba(0, 0, 0, 0.5)',
        touchAction: 'none'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    />
  );
}

export default AstroCanvas;
