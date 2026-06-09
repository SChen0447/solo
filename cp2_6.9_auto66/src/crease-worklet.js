class CreasePainter {
  static get inputProperties() {
    return ['--crease-points', '--crease-opacity'];
  }

  parsePoints(props) {
    const raw = props.get('--crease-points').toString().trim();
    if (!raw || raw === 'none' || raw === '') {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(p => 
          p && typeof p.x === 'number' && typeof p.y === 'number'
        );
      }
    } catch (e) {
      return [];
    }
    return [];
  }

  getOpacity(props) {
    const raw = props.get('--crease-opacity').toString().trim();
    if (!raw || raw === 'none' || raw === '') {
      return 1;
    }
    const val = parseFloat(raw);
    return isNaN(val) ? 1 : Math.max(0, Math.min(1, val));
  }

  paint(ctx, geom, props) {
    const points = this.parsePoints(props);
    const opacity = this.getOpacity(props);

    if (points.length < 2 || opacity <= 0) {
      return;
    }

    const W = geom.width;
    const H = geom.height;
    const creaseWidth = 8;

    ctx.save();

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];

      const dx = p1.x - p0.x;
      const dy = p1.y - p0.y;
      const len = Math.sqrt(dx * dx + dy * dy);

      if (len < 0.5) continue;

      const nx = -dy / len;
      const ny = dx / len;

      const t = i / (points.length - 1);
      const segOpacity = opacity * (0.5 + 0.5 * Math.sin(t * Math.PI));

      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;

      this.drawSideGradient(
        ctx, W, H,
        p0, p1,
        nx, ny,
        creaseWidth,
        segOpacity,
        true
      );

      this.drawSideGradient(
        ctx, W, H,
        p0, p1,
        -nx, -ny,
        creaseWidth,
        segOpacity,
        false
      );
    }

    ctx.restore();
  }

  drawSideGradient(ctx, W, H, p0, p1, nx, ny, width, opacity, isLight) {
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.5) return;

    const tx = dx / len;
    const ty = dy / len;

    const corners = [
      { x: p0.x - tx * 2, y: p0.y - ty * 2 },
      { x: p1.x + tx * 2, y: p1.y + ty * 2 },
      { x: p1.x + tx * 2 + nx * width, y: p1.y + ty * 2 + ny * width },
      { x: p0.x - tx * 2 + nx * width, y: p0.y - ty * 2 + ny * width }
    ];

    ctx.save();

    const grad = ctx.createLinearGradient(
      p0.x, p0.y,
      p0.x + nx * width, p0.y + ny * width
    );

    if (isLight) {
      grad.addColorStop(0, `rgba(255, 255, 255, ${0.35 * opacity})`);
      grad.addColorStop(0.4, `rgba(255, 255, 255, ${0.2 * opacity})`);
      grad.addColorStop(1, `rgba(255, 255, 255, 0)`);
    } else {
      grad.addColorStop(0, `rgba(30, 25, 20, ${0.4 * opacity})`);
      grad.addColorStop(0.4, `rgba(30, 25, 20, ${0.2 * opacity})`);
      grad.addColorStop(1, `rgba(30, 25, 20, 0)`);
    }

    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let j = 1; j < corners.length; j++) {
      ctx.lineTo(corners[j].x, corners[j].y);
    }
    ctx.closePath();

    ctx.fillStyle = grad;
    ctx.fill();

    ctx.restore();
  }
}

registerPaint('crease', CreasePainter);
