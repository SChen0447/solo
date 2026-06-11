import { RenderState, TILE_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT } from './types';
import { lerp, lightToColor, hexToRgb, noise } from './utils';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private time: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;

    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = CANVAS_WIDTH;
    this.offscreenCanvas.height = CANVAS_HEIGHT;
    const offCtx = this.offscreenCanvas.getContext('2d');
    if (!offCtx) throw new Error('Failed to get offscreen canvas context');
    this.offscreenCtx = offCtx;

    this.time = 0;
    this.resize();
    window.addEventListener('resize', this.resize.bind(this));
  }

  resize(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const ratio = CANVAS_WIDTH / CANVAS_HEIGHT;
    let width = container.clientWidth;
    let height = container.clientHeight;

    if (width / height > ratio) {
      width = height * ratio;
    } else {
      height = width / ratio;
    }

    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  render(state: RenderState, dt: number): void {
    this.time += dt;
    const ctx = this.ctx;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const room = state.room;
    const mapWidth = room.tiles[0].length * TILE_SIZE;
    const mapHeight = room.tiles.length * TILE_SIZE;
    const offsetX = (CANVAS_WIDTH - mapWidth) / 2;
    const offsetY = (CANVAS_HEIGHT - mapHeight) / 2;

    ctx.save();
    ctx.translate(offsetX, offsetY);

    this.drawTiles(room.tiles, state.roomBrightness);
    this.drawClueText(room.clueText, mapWidth);
    this.drawMechanisms(room.mechanisms, this.time);
    this.drawSteles(room.steles, state.roomBrightness, this.time);
    this.drawNPCs(room.npcs, this.time);
    this.drawParticles(state.particles);
    this.drawPlayer(state.player, this.time);

    ctx.restore();

    this.drawHUD(state);

    if (state.gameState === 'roomTransition') {
      this.drawTransition(state.transitionProgress);
    }

    if (state.warningFlash > 0) {
      this.drawWarningFlash(state.warningFlash);
    }

    if (state.gameState === 'victory') {
      this.drawVictoryOverlay();
    }
  }

  private drawTiles(tiles: number[][], brightness: number): void {
    const ctx = this.offscreenCtx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (let y = 0; y < tiles.length; y++) {
      for (let x = 0; x < tiles[y].length; x++) {
        const tile = tiles[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (tile === 1) {
          this.drawWall(ctx, px, py, brightness);
        } else {
          this.drawFloor(ctx, px, py, x, y, brightness);
        }
      }
    }

    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
  }

  private drawFloor(ctx: CanvasRenderingContext2D, x: number, y: number, gridX: number, gridY: number, brightness: number): void {
    const baseLight = lerp(0.15, 0.4, brightness);
    const noiseVal = noise(gridX * 100, gridY * 100, 0);

    const r = Math.floor(lerp(30, 45, noiseVal) * baseLight);
    const g = Math.floor(lerp(50, 74, noiseVal) * baseLight);
    const b = Math.floor(lerp(40, 62, noiseVal) * baseLight);

    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    ctx.strokeStyle = `rgba(0, 0, 0, ${0.3 * baseLight})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);

    if ((gridX + gridY) % 3 === 0) {
      ctx.fillStyle = `rgba(212, 175, 55, ${0.05 * baseLight})`;
      ctx.beginPath();
      ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 3 + noiseVal * 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawWall(ctx: CanvasRenderingContext2D, x: number, y: number, brightness: number): void {
    const baseLight = lerp(0.1, 0.25, brightness);

    const gradient = ctx.createLinearGradient(x, y, x, y + TILE_SIZE);
    gradient.addColorStop(0, `rgb(${Math.floor(60 * baseLight)}, ${Math.floor(50 * baseLight)}, ${Math.floor(40 * baseLight)})`);
    gradient.addColorStop(0.5, `rgb(${Math.floor(45 * baseLight)}, ${Math.floor(38 * baseLight)}, ${Math.floor(30 * baseLight)})`);
    gradient.addColorStop(1, `rgb(${Math.floor(35 * baseLight)}, ${Math.floor(30 * baseLight)}, ${Math.floor(25 * baseLight)})`);

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    ctx.strokeStyle = `rgba(0, 0, 0, ${0.5 * baseLight})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);

    ctx.strokeStyle = `rgba(139, 115, 85, ${0.3 * baseLight})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y + TILE_SIZE / 2);
    ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE / 2);
    ctx.moveTo(x + TILE_SIZE / 2, y);
    ctx.lineTo(x + TILE_SIZE / 2, y + TILE_SIZE / 2);
    ctx.stroke();

    const edgeFade = ctx.createRadialGradient(
      x + TILE_SIZE / 2, y + TILE_SIZE / 2, 0,
      x + TILE_SIZE / 2, y + TILE_SIZE / 2, TILE_SIZE * 0.7
    );
    edgeFade.addColorStop(0, 'transparent');
    edgeFade.addColorStop(1, `rgba(0, 0, 0, ${0.3 * baseLight})`);
    ctx.fillStyle = edgeFade;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  }

  private drawSteles(steles: any[], brightness: number, time: number): void {
    const ctx = this.ctx;

    for (const stele of steles) {
      const { x, y } = stele.position;
      const pulse = Math.sin(time * 2) * 0.1 + 1;

      if (stele.isLit) {
        const timeSinceLit = (time * 1000 - stele.litTime) / 1000;
        if (timeSinceLit < 1) {
          const waveRadius = timeSinceLit * 150;
          const waveAlpha = 1 - timeSinceLit;
          ctx.strokeStyle = `rgba(255, 215, 0, ${waveAlpha * 0.8})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, y, waveRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      ctx.save();
      ctx.translate(x, y);

      const baseColor = hexToRgb(stele.color);
      const lightIntensity = stele.isLit ? 1 : 0.3;
      const glowSize = stele.isLit ? 40 * pulse : 20;

      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
      glow.addColorStop(0, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${0.6 * lightIntensity})`);
      glow.addColorStop(0.5, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${0.2 * lightIntensity})`);
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = stele.isLit
        ? `rgb(${Math.min(255, baseColor.r + 50)}, ${Math.min(255, baseColor.g + 50)}, ${Math.min(255, baseColor.b + 50)})`
        : `rgb(${baseColor.r * 0.5}, ${baseColor.g * 0.5}, ${baseColor.b * 0.5})`;

      ctx.beginPath();
      ctx.moveTo(-18, 20);
      ctx.lineTo(-18, -15);
      ctx.lineTo(-12, -22);
      ctx.lineTo(12, -22);
      ctx.lineTo(18, -15);
      ctx.lineTo(18, 20);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = stele.isLit ? '#FFD700' : '#8B7355';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = stele.isLit ? stele.color : `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.5)`;
      ctx.font = 'bold 14px "Cinzel Decorative", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✦', 0, 0);

      if (!stele.isLit && stele.requiredLight > 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '10px Lato, sans-serif';
        ctx.fillText(`${stele.requiredLight}`, 0, 12);
      }

      ctx.restore();
    }
  }

  private drawMechanisms(mechanisms: any[], time: number): void {
    const ctx = this.ctx;

    for (const mech of mechanisms) {
      const { x, y } = mech.position;
      const isActive = mech.isActive;
      const activationProgress = isActive
        ? Math.min(1, (time * 1000 - mech.activationTime) / 500)
        : 0;

      ctx.save();
      ctx.translate(x, y);

      if (mech.type === 'door') {
        const doorHeight = lerp(TILE_SIZE * 0.9, 0, activationProgress);
        const doorY = -doorHeight / 2;

        ctx.fillStyle = isActive ? 'rgba(139, 115, 85, 0.3)' : '#3a3025';
        ctx.fillRect(-TILE_SIZE / 2 + 2, doorY, TILE_SIZE - 4, doorHeight);

        if (doorHeight > 5) {
          ctx.strokeStyle = '#8B7355';
          ctx.lineWidth = 2;
          ctx.strokeRect(-TILE_SIZE / 2 + 2, doorY, TILE_SIZE - 4, doorHeight);

          for (let i = 0; i < 3; i++) {
            ctx.fillStyle = 'rgba(212, 175, 55, 0.5)';
            ctx.fillRect(-TILE_SIZE / 2 + 8, doorY + 8 + i * 14, TILE_SIZE - 20, 3);
          }
        }

        if (isActive && activationProgress < 1) {
          ctx.fillStyle = `rgba(255, 215, 0, ${0.5 * (1 - activationProgress)})`;
          ctx.fillRect(-TILE_SIZE / 2 + 2, doorY, TILE_SIZE - 4, doorHeight);
        }
      } else if (mech.type === 'platform') {
        const platformY = lerp(10, -15, activationProgress);
        const rotation = isActive ? time * 2 : 0;

        ctx.save();
        ctx.rotate(rotation * 0.5);

        ctx.fillStyle = isActive ? '#4a4030' : '#2a2520';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const r = i % 2 === 0 ? 20 : 14;
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r + platformY;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = isActive ? '#D4AF37' : '#5a5040';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = isActive ? '#FFD700' : '#8B7355';
        ctx.beginPath();
        ctx.arc(0, platformY, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        if (mech.id === 'guardian' && isActive && activationProgress >= 1) {
          this.drawGuardianSilhouette(time);
        }
      }

      ctx.restore();
    }
  }

  private drawGuardianSilhouette(time: number): void {
    const ctx = this.ctx;
    const pulse = Math.sin(time * 1.5) * 0.1 + 1;

    ctx.save();
    ctx.translate(0, -60);

    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 100 * pulse);
    glow.addColorStop(0, 'rgba(255, 215, 0, 0.4)');
    glow.addColorStop(0.5, 'rgba(212, 175, 55, 0.2)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 100 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(26, 26, 26, 0.9)';
    ctx.beginPath();
    ctx.arc(0, 0, 35, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(-10, -5, 4, 0, Math.PI * 2);
    ctx.arc(10, -5, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawNPCs(npcs: any[], time: number): void {
    const ctx = this.ctx;

    for (const npc of npcs) {
      const { x, y } = npc.position;
      const pulse = Math.sin(time * 3 + npc.id.charCodeAt(npc.id.length - 1)) * 0.2 + 1;

      ctx.save();
      ctx.translate(x, y);

      const glowSize = npc.isOnCooldown ? 15 : 25 * pulse;
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
      glow.addColorStop(0, npc.isOnCooldown ? 'rgba(139, 115, 85, 0.6)' : 'rgba(144, 238, 144, 0.8)');
      glow.addColorStop(0.5, npc.isOnCooldown ? 'rgba(139, 115, 85, 0.3)' : 'rgba(144, 238, 144, 0.4)');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = npc.isOnCooldown ? '#8B7355' : '#90EE90';
      ctx.beginPath();
      ctx.arc(0, 0, npc.isOnCooldown ? 8 : 12 * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(-3, -3, 2, 0, Math.PI * 2);
      ctx.arc(3, -3, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawPlayer(player: any, time: number): void {
    const ctx = this.ctx;
    const { x, y } = player.position;
    const pulse = Math.sin(time * 4) * 0.1 + 1;

    ctx.save();
    ctx.translate(x, y);

    const shadowGradient = ctx.createRadialGradient(0, 15, 0, 0, 15, 25);
    shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
    shadowGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = shadowGradient;
    ctx.beginPath();
    ctx.ellipse(0, 18, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    const lightRatio = player.lightAmount / player.maxLight;
    const baseColor = lightToColor(player.lightAmount, player.maxLight);
    const rgb = baseColor.match(/\d+/g)?.map(Number) || [135, 206, 235];

    const glowSize = (30 + lightRatio * 30) * pulse;
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
    glow.addColorStop(0, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${0.5 + lightRatio * 0.3})`);
    glow.addColorStop(0.4, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${0.3 + lightRatio * 0.2})`);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
    ctx.fill();

    const bodyGradient = ctx.createRadialGradient(-5, -5, 0, 0, 0, 18);
    bodyGradient.addColorStop(0, `rgba(255, 255, 255, ${0.8 + lightRatio * 0.2})`);
    bodyGradient.addColorStop(0.3, `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.9)`);
    bodyGradient.addColorStop(1, `rgba(${Math.floor(rgb[0] * 0.7)}, ${Math.floor(rgb[1] * 0.7)}, ${Math.floor(rgb[2] * 0.7)}, 0.7)`);

    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.arc(0, 0, 18 * (0.9 + lightRatio * 0.2), 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.arc(-6, -6, 4, 0, Math.PI * 2);
    ctx.arc(6, -6, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(-6, -6, 2, 0, Math.PI * 2);
    ctx.arc(6, -6, 2, 0, Math.PI * 2);
    ctx.fill();

    if (player.isAbsorbing) {
      ctx.strokeStyle = `rgba(255, 215, 0, ${0.5 + Math.sin(time * 10) * 0.3})`;
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const r = 25 + i * 15 + (time * 50) % 15;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.globalAlpha = 1 - i * 0.3;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    if (player.isReleasing) {
      ctx.strokeStyle = `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${0.6 + Math.sin(time * 10) * 0.3})`;
      ctx.lineWidth = 4;
      for (let i = 0; i < 3; i++) {
        const r = 25 + i * 20 - (time * 50) % 20;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(10, r), 0, Math.PI * 2);
        ctx.globalAlpha = 1 - i * 0.3;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  private drawParticles(particles: any[]): void {
    const ctx = this.ctx;

    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawClueText(text: string, mapWidth: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(212, 175, 55, 0.6)';
    ctx.font = '14px "Cinzel Decorative", serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, mapWidth / 2, 35);
  }

  private drawHUD(state: RenderState): void {
    const ctx = this.ctx;

    this.drawEnergyBar(ctx, 30, 30, state.player.lightAmount, state.player.maxLight);
    this.drawTimer(ctx, CANVAS_WIDTH - 80, 50, state.timeRemaining);
    this.drawRoomIndicator(ctx, CANVAS_WIDTH - 30, CANVAS_HEIGHT - 30, state.currentRoomIndex + 1);

    if (state.gameState === 'playing' && state.timeRemaining <= 10) {
      ctx.fillStyle = `rgba(255, 100, 100, ${0.3 + Math.sin(this.time * 8) * 0.2})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }

  private drawEnergyBar(ctx: CanvasRenderingContext2D, x: number, y: number, current: number, max: number): void {
    const width = 200;
    const height = 20;
    const ratio = current / max;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x - 2, y - 2, width + 4, height + 4);

    const bgGradient = ctx.createLinearGradient(x, y, x, y + height);
    bgGradient.addColorStop(0, '#2a2520');
    bgGradient.addColorStop(1, '#1a1510');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(x, y, width, height);

    const fillGradient = ctx.createLinearGradient(x, y, x + width, y);
    fillGradient.addColorStop(0, '#87CEEB');
    fillGradient.addColorStop(0.5, '#B0E0E6');
    fillGradient.addColorStop(1, '#FFD700');
    ctx.fillStyle = fillGradient;
    ctx.fillRect(x, y, width * ratio, height);

    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 12px Lato, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`光量: ${Math.floor(current)} / ${max}`, x, y - 8);
  }

  private drawTimer(ctx: CanvasRenderingContext2D, x: number, y: number, time: number): void {
    const radius = 35;
    const isWarning = time <= 10;
    const ratio = time / 60;

    ctx.beginPath();
    ctx.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
    ctx.strokeStyle = isWarning
      ? `rgba(255, ${Math.floor(100 + Math.sin(this.time * 10) * 50)}, 100, 0.8)`
      : 'rgba(212, 175, 55, 0.8)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, radius, -Math.PI / 2 + Math.PI * 2 * ratio, Math.PI * 1.5);
    ctx.strokeStyle = 'rgba(139, 115, 85, 0.3)';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = isWarning ? '#FF6464' : '#FFD700';
    ctx.font = 'bold 20px "Cinzel Decorative", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.ceil(time)}`, x, y);

    ctx.fillStyle = 'rgba(212, 175, 55, 0.7)';
    ctx.font = '10px Lato, sans-serif';
    ctx.fillText('秒', x, y + 22);
  }

  private drawRoomIndicator(ctx: CanvasRenderingContext2D, x: number, y: number, roomNum: number): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x - 60, y - 25, 55, 25);

    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 60, y - 25, 55, 25);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px "Cinzel Decorative", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`房间 ${roomNum}/3`, x - 32, y - 12);
  }

  private drawTransition(progress: number): void {
    const ctx = this.ctx;
    const centerX = CANVAS_WIDTH / 2;
    const centerY = CANVAS_HEIGHT / 2;

    const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const data = imageData.data;

    for (let y = 0; y < CANVAS_HEIGHT; y += 4) {
      for (let x = 0; x < CANVAS_WIDTH; x += 4) {
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const wave = Math.sin(dist * 0.01 - this.time * 3) * 0.5 + 0.5;
        const threshold = progress * 1.2;

        if (wave > threshold) {
          for (let py = 0; py < 4; py++) {
            for (let px = 0; px < 4; px++) {
              const i = ((y + py) * CANVAS_WIDTH + (x + px)) * 4;
              data[i] = Math.floor(data[i] * 0.3);
              data[i + 1] = Math.floor(data[i + 1] * 0.25);
              data[i + 2] = Math.floor(data[i + 2] * 0.2);
            }
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    if (progress > 0.5) {
      ctx.fillStyle = `rgba(10, 10, 10, ${(progress - 0.5) * 2})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }

  private drawWarningFlash(intensity: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = `rgba(255, 50, 50, ${intensity * 0.4})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private drawVictoryOverlay(): void {
    const ctx = this.ctx;

    ctx.fillStyle = 'rgba(10, 10, 10, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const glow = ctx.createRadialGradient(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 0,
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 400
    );
    glow.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
    glow.addColorStop(0.5, 'rgba(212, 175, 55, 0.1)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 48px "Cinzel Decorative", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 30;
    ctx.fillText('守护者已被唤醒', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);

    ctx.fillStyle = '#D4AF37';
    ctx.font = '24px Lato, sans-serif';
    ctx.shadowBlur = 15;
    ctx.fillText('你成功解开了所有谜题', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);

    ctx.shadowBlur = 0;
  }
}
