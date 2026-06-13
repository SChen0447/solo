import type { RuneObject, CircleObject, Connection, Point } from './rune-engine';

interface Star {
  x: number;
  y: number;
  size: number;
  phase: number;
  period: number;
}

export class RuneRenderer {
  private stars: Star[] = [];

  initStars(width: number, height: number): void {
    this.stars = [];
    for (let i = 0; i < 50; i++) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 1 + Math.random(),
        phase: Math.random() * Math.PI * 2,
        period: 2 + Math.random() * 2,
      });
    }
  }

  resizeStars(width: number, height: number): void {
    for (const star of this.stars) {
      star.x = Math.random() * width;
      star.y = Math.random() * height;
    }
    while (this.stars.length < 50) {
      this.stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 1 + Math.random(),
        phase: Math.random() * Math.PI * 2,
        period: 2 + Math.random() * 2,
      });
    }
  }

  renderBackground(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) * 0.7
    );
    gradient.addColorStop(0, '#0a001a');
    gradient.addColorStop(1, '#1a0033');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    for (const star of this.stars) {
      const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(time * (2 * Math.PI / star.period) + star.phase));
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }
  }

  renderRune(ctx: CanvasRenderingContext2D, rune: RuneObject, time: number): void {
    const pulsePhase = time * (2 * Math.PI / 1.5) + rune.pulsePhase;
    const pulseScale = 1.0 + 0.05 * Math.sin(pulsePhase);
    const pulseAlpha = 0.8 + 0.2 * Math.sin(pulsePhase);

    const effectiveScale = rune.scale * pulseScale;

    ctx.save();
    ctx.translate(rune.position.x, rune.position.y);
    ctx.rotate(rune.rotation);
    ctx.scale(effectiveScale, effectiveScale);
    ctx.globalAlpha = pulseAlpha;

    if (rune.controlPoints.length < 2) {
      ctx.restore();
      return;
    }

    const path = this._buildRunePath(rune.controlPoints);

    ctx.shadowColor = rune.color;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = rune.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = pulseAlpha * 0.6;
    ctx.stroke(path);

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = pulseAlpha;
    ctx.stroke(path);

    const gradPhase = time * Math.PI + rune.gradientOffset;
    const gradLen = rune.controlPoints.length;
    for (let i = 0; i < rune.controlPoints.length - 1; i++) {
      const t = ((i / gradLen) + gradPhase / (2 * Math.PI)) % 1;
      const hue = this._colorToHue(rune.color);
      const segColor = `hsla(${hue}, 100%, 70%, ${0.3 + 0.3 * Math.sin(t * Math.PI * 2)})`;
      ctx.beginPath();
      ctx.moveTo(rune.controlPoints[i].x, rune.controlPoints[i].y);
      ctx.lineTo(rune.controlPoints[i + 1].x, rune.controlPoints[i + 1].y);
      ctx.strokeStyle = segColor;
      ctx.lineWidth = 3;
      ctx.shadowColor = segColor;
      ctx.shadowBlur = 12;
      ctx.stroke();
    }

    ctx.restore();
  }

  renderSelection(ctx: CanvasRenderingContext2D, rune: RuneObject): void {
    if (!rune.selected) return;
    ctx.save();
    ctx.translate(rune.position.x, rune.position.y);
    ctx.rotate(rune.rotation);
    ctx.scale(rune.scale, rune.scale);

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of rune.controlPoints) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    const pad = 10;
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3 / rune.scale;
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 6;
    ctx.strokeRect(minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2);

    ctx.restore();
  }

  renderConnections(ctx: CanvasRenderingContext2D, connections: Connection[], time: number): void {
    for (const conn of connections) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(conn.from.x, conn.from.y);
      ctx.lineTo(conn.to.x, conn.to.y);
      ctx.strokeStyle = 'rgba(180, 150, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(180, 150, 255, 0.3)';
      ctx.shadowBlur = 4;
      ctx.stroke();

      const progress = ((time % 2) / 2);
      const lightX = conn.from.x + (conn.to.x - conn.from.x) * progress;
      const lightY = conn.from.y + (conn.to.y - conn.from.y) * progress;
      ctx.beginPath();
      ctx.arc(lightX, lightY, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(200, 180, 255, 0.9)';
      ctx.shadowColor = 'rgba(200, 180, 255, 0.8)';
      ctx.shadowBlur = 8;
      ctx.fill();

      ctx.restore();
    }
  }

  renderCircle(ctx: CanvasRenderingContext2D, circle: CircleObject, time: number): void {
    ctx.save();
    const alpha = 0.3 + 0.15 * Math.sin(time * 2);
    ctx.beginPath();
    ctx.arc(circle.center.x, circle.center.y, circle.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 215, 100, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255, 215, 100, 0.4)';
    ctx.shadowBlur = 15;
    ctx.stroke();

    const pulseR = circle.radius + 5 * Math.sin(time * 3);
    ctx.beginPath();
    ctx.arc(circle.center.x, circle.center.y, pulseR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 215, 100, ${alpha * 0.5})`;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 20;
    ctx.stroke();

    ctx.restore();
  }

  renderUI(ctx: CanvasRenderingContext2D, selectedCount: number, width: number, height: number): void {
    ctx.save();
    const barH = 40;
    const y = height - barH;

    ctx.fillStyle = 'rgba(10, 0, 26, 0.75)';
    ctx.fillRect(0, y, width, barH);

    ctx.fillStyle = 'rgba(180, 150, 255, 0.15)';
    ctx.fillRect(0, y, width, 1);

    ctx.font = '14px "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = 'rgba(200, 180, 255, 0.9)';
    ctx.textBaseline = 'middle';
    ctx.fillText(`选中符文数：${selectedCount}`, 20, y + barH / 2);

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(180, 160, 220, 0.7)';
    ctx.fillText('R旋转 | 滚轮缩放 | Delete删除 | Ctrl+Z撤销', width - 20, y + barH / 2);

    ctx.restore();
  }

  renderDrawingPath(ctx: CanvasRenderingContext2D, points: Point[]): void {
    if (points.length < 2) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = 'rgba(200, 180, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = 'rgba(200, 180, 255, 0.4)';
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.restore();
  }

  private _buildRunePath(points: Point[]): Path2D {
    const path = new Path2D();
    path.moveTo(points[0].x, points[0].y);
    if (points.length === 2) {
      path.lineTo(points[1].x, points[1].y);
      return path;
    }
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cpx = (curr.x + next.x) / 2;
      const cpy = (curr.y + next.y) / 2;
      path.quadraticCurveTo(curr.x, curr.y, cpx, cpy);
    }
    const last = points[points.length - 1];
    path.lineTo(last.x, last.y);
    return path;
  }

  private _colorToHue(hex: string): number {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    if (max !== min) {
      const d = max - min;
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      else if (max === g) h = ((b - r) / d + 2) / 6;
      else h = ((r - g) / d + 4) / 6;
    }
    return h * 360;
  }
}
