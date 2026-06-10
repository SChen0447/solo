export class Lighthouse {
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  getLanternCenter(): { x: number; y: number } {
    const baseX = this.width * 0.78;
    const baseY = this.height * 0.55;
    const towerHeight = this.height * 0.42;
    return {
      x: baseX,
      y: baseY - towerHeight + this.height * 0.08
    };
  }

  draw(ctx: CanvasRenderingContext2D, scale: number): void {
    const baseX = this.width * 0.78;
    const baseY = this.height * 0.55;
    const towerHeight = this.height * 0.42;
    const baseWidth = this.width * 0.12;
    const topWidth = this.width * 0.07;
    const brickSize = Math.max(4, 8 * scale);

    this.drawRocks(ctx, baseX, baseY, baseWidth, scale);
    this.drawTower(ctx, baseX, baseY, towerHeight, baseWidth, topWidth, brickSize);
    this.drawLantern(ctx, baseX, baseY - towerHeight, topWidth, scale);
    this.drawRailing(ctx, baseX, baseY - towerHeight, topWidth, scale);
  }

  private drawRocks(
    ctx: CanvasRenderingContext2D,
    baseX: number,
    baseY: number,
    baseWidth: number,
    scale: number
  ): void {
    const rockColors = ['#2a2a2a', '#3a3a3a', '#4a4a4a', '#252525', '#353535'];
    const rockCount = Math.floor(20 * scale);

    for (let i = 0; i < rockCount; i++) {
      const angle = Math.random() * Math.PI - Math.PI / 2;
      const dist = baseWidth * (0.3 + Math.random() * 0.8);
      const rx = baseX + Math.cos(angle) * dist;
      const ry = baseY + Math.abs(Math.sin(angle)) * baseWidth * 0.3 + Math.random() * baseWidth * 0.2;
      const rw = (8 + Math.random() * 20) * scale;
      const rh = (5 + Math.random() * 12) * scale;
      const colorIdx = Math.floor(Math.random() * rockColors.length);

      ctx.fillStyle = rockColors[colorIdx];
      ctx.fillRect(Math.floor(rx - rw / 2), Math.floor(ry - rh / 2), Math.ceil(rw), Math.ceil(rh));
    }
  }

  private drawTower(
    ctx: CanvasRenderingContext2D,
    baseX: number,
    baseY: number,
    towerHeight: number,
    baseWidth: number,
    topWidth: number,
    brickSize: number
  ): void {
    const rows = Math.floor(towerHeight / brickSize);
    const lightGray = '#8a8a8a';
    const darkGray = '#606060';
    const mortar = '#4a4a4a';

    for (let row = 0; row < rows; row++) {
      const y = baseY - (row + 1) * brickSize;
      const progress = row / rows;
      const rowWidth = baseWidth - (baseWidth - topWidth) * progress;
      const halfWidth = rowWidth / 2;

      const xStart = baseX - halfWidth;
      const xEnd = baseX + halfWidth;
      const effectiveStart = Math.floor(xStart / brickSize);
      const effectiveEnd = Math.ceil(xEnd / brickSize);

      const isOffset = row % 2 === 1;
      for (let col = effectiveStart; col <= effectiveEnd; col++) {
        const bx = col * brickSize + (isOffset ? brickSize / 2 : 0);
        const by = y;

        if (bx + brickSize < xStart || bx > xEnd) continue;

        const drawX = Math.max(xStart, bx);
        drawWidth = Math.min(xEnd, bx + brickSize) - drawX;

        const isLight = (row + col + (isOffset ? 1 : 0)) % 2 === 0;
        ctx.fillStyle = isLight ? lightGray : darkGray;
        ctx.fillRect(Math.floor(drawX), Math.floor(by), Math.ceil(drawWidth), Math.ceil(brickSize - 1));

        ctx.fillStyle = mortar;
        ctx.fillRect(Math.floor(drawX), Math.floor(by + brickSize - 1), Math.ceil(drawWidth), 1);
        if (bx >= xStart && bx + brickSize <= xEnd) {
          ctx.fillRect(Math.floor(bx + brickSize - 1), Math.floor(by), 1, Math.ceil(brickSize));
        }
      }
    }

    const platformY = baseY - towerHeight - brickSize;
    const platformWidth = topWidth + brickSize * 2;
    ctx.fillStyle = '#5a5a5a';
    ctx.fillRect(
      Math.floor(baseX - platformWidth / 2),
      Math.floor(platformY),
      Math.ceil(platformWidth),
      Math.ceil(brickSize)
    );
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(
      Math.floor(baseX - platformWidth / 2),
      Math.floor(platformY + brickSize - 2),
      Math.ceil(platformWidth),
      2
    );
  }

  private drawLantern(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    towerTopY: number,
    topWidth: number,
    scale: number
  ): void {
    const lanternWidth = topWidth * 0.9;
    const lanternHeight = this.height * 0.07;
    const lanternY = towerTopY - lanternHeight;
    const glowRadius = lanternWidth * (2.5 + Math.sin(Date.now() / 1000) * 0.2);

    const glowGradient = ctx.createRadialGradient(
      centerX, lanternY + lanternHeight / 2, 0,
      centerX, lanternY + lanternHeight / 2, glowRadius
    );
    glowGradient.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
    glowGradient.addColorStop(0.3, 'rgba(255, 180, 0, 0.3)');
    glowGradient.addColorStop(0.6, 'rgba(255, 140, 0, 0.1)');
    glowGradient.addColorStop(1, 'rgba(255, 140, 0, 0)');
    ctx.fillStyle = glowGradient;
    ctx.fillRect(
      Math.floor(centerX - glowRadius),
      Math.floor(lanternY + lanternHeight / 2 - glowRadius),
      Math.ceil(glowRadius * 2),
      Math.ceil(glowRadius * 2)
    );

    const bodyGradient = ctx.createLinearGradient(
      centerX - lanternWidth / 2, 0,
      centerX + lanternWidth / 2, 0
    );
    bodyGradient.addColorStop(0, '#ff8c00');
    bodyGradient.addColorStop(0.5, '#ffd700');
    bodyGradient.addColorStop(1, '#ff8c00');
    ctx.fillStyle = bodyGradient;
    ctx.fillRect(
      Math.floor(centerX - lanternWidth / 2),
      Math.floor(lanternY),
      Math.ceil(lanternWidth),
      Math.ceil(lanternHeight)
    );

    const frameWidth = Math.max(2, 3 * scale);
    ctx.fillStyle = '#3a3a3a';
    const frameCount = 4;
    for (let i = 0; i <= frameCount; i++) {
      const fx = centerX - lanternWidth / 2 + (lanternWidth / frameCount) * i;
      ctx.fillRect(Math.floor(fx - frameWidth / 2), Math.floor(lanternY), Math.ceil(frameWidth), Math.ceil(lanternHeight));
    }

    ctx.fillRect(
      Math.floor(centerX - lanternWidth / 2),
      Math.floor(lanternY),
      Math.ceil(lanternWidth),
      Math.ceil(frameWidth)
    );
    ctx.fillRect(
      Math.floor(centerX - lanternWidth / 2),
      Math.floor(lanternY + lanternHeight - frameWidth),
      Math.ceil(lanternWidth),
      Math.ceil(frameWidth)
    );

    const roofHeight = this.height * 0.04;
    const roofWidth = lanternWidth * 1.2;
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    ctx.moveTo(Math.floor(centerX - roofWidth / 2), Math.floor(lanternY));
    ctx.lineTo(Math.floor(centerX), Math.floor(lanternY - roofHeight));
    ctx.lineTo(Math.floor(centerX + roofWidth / 2), Math.floor(lanternY));
    ctx.closePath();
    ctx.fill();

    const ballSize = Math.max(3, 4 * scale);
    ctx.fillStyle = '#4a4a4a';
    ctx.fillRect(
      Math.floor(centerX - ballSize / 2),
      Math.floor(lanternY - roofHeight - ballSize),
      Math.ceil(ballSize),
      Math.ceil(ballSize)
    );
  }

  private drawRailing(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    towerTopY: number,
    topWidth: number,
    scale: number
  ): void {
    const platformWidth = topWidth + 16 * scale;
    const railingHeight = Math.max(6, 12 * scale);
    const railingY = towerTopY - railingHeight;
    const barThickness = Math.max(1, 2 * scale);

    ctx.fillStyle = '#7a7a7a';
    ctx.fillRect(
      Math.floor(centerX - platformWidth / 2),
      Math.floor(railingY),
      Math.ceil(platformWidth),
      Math.ceil(barThickness)
    );

    ctx.fillStyle = '#8a8a8a';
    const postCount = 12;
    const postSpacing = platformWidth / (postCount - 1);
    const postWidth = Math.max(1, 2 * scale);

    for (let i = 0; i < postCount; i++) {
      const px = centerX - platformWidth / 2 + i * postSpacing;
