import {
  GameState,
  Ship,
  Crystal,
  Enemy,
  Asteroid,
  Laser,
  EnemyBullet,
  Particle,
  Shockwave,
  Star,
  GridCell,
} from './entities';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private width: number = 0;
  private height: number = 0;
  private time: number = 0;
  private hoveredButton: string | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get 2D context');
    this.ctx = ctx;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  setHoveredButton(button: string | null): void {
    this.hoveredButton = button;
  }

  render(state: GameState, deltaTime: number): void {
    this.time += deltaTime;
    const ctx = this.ctx;
    const shakeX = state.screenShakeX;
    const shakeY = state.screenShakeY;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    this.drawBackground(state);
    this.drawGrid(state);
    this.drawBase(state);
    this.drawCrystals(state);
    this.drawAsteroids(state);
    this.drawEnemies(state);
    this.drawLasers(state);
    this.drawEnemyBullets(state);
    this.drawShip(state);
    this.drawParticles(state);
    this.drawShockwaves(state);

    ctx.restore();

    this.drawUI(state);
    this.drawHitFlash(state);
    this.drawWarningOverlay(state);

    if (state.gameOver) {
      this.drawGameOver(state);
    }
  }

  private drawBackground(state: GameState): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0a0a1f');
    gradient.addColorStop(0.5, '#0d0d2b');
    gradient.addColorStop(1, '#050510');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    ctx.translate(-state.cameraX * 0.3, -state.cameraY * 0.3);
    for (const star of state.stars) {
      const brightness = star.brightness * (0.5 + 0.5 * Math.sin(star.twinklePhase));
      ctx.fillStyle = `rgba(200, 220, 255, ${brightness})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawGrid(state: GameState): void {
    const ctx = this.ctx;
    const startCol = Math.floor(state.cameraX / state.cellSize);
    const startRow = Math.floor(state.cameraY / state.cellSize);
    const endCol = Math.ceil((state.cameraX + this.width) / state.cellSize);
    const endRow = Math.ceil((state.cameraY + this.height) / state.cellSize);

    ctx.save();
    ctx.translate(-state.cameraX, -state.cameraY);

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        if (row < 0 || row >= state.gridSize || col < 0 || col >= state.gridSize) continue;

        const cell = state.grid[row][col];
        const x = cell.x;
        const y = cell.y;
        const size = cell.size;

        if (cell.type === 'ore') {
          ctx.fillStyle = 'rgba(30, 80, 50, 0.2)';
          ctx.fillRect(x, y, size, size);
          ctx.strokeStyle = 'rgba(60, 180, 120, 0.3)';
          ctx.strokeRect(x, y, size, size);
        } else if (cell.type === 'asteroid') {
          ctx.fillStyle = 'rgba(80, 60, 40, 0.15)';
          ctx.fillRect(x, y, size, size);
          ctx.strokeStyle = 'rgba(150, 120, 80, 0.25)';
          ctx.strokeRect(x, y, size, size);
        } else if (cell.type === 'enemyPath') {
          ctx.fillStyle = 'rgba(100, 30, 50, 0.15)';
          ctx.fillRect(x, y, size, size);
          ctx.strokeStyle = 'rgba(200, 60, 100, 0.25)';
          ctx.strokeRect(x, y, size, size);
        }
      }
    }

    ctx.restore();
  }

  private drawBase(state: GameState): void {
    const ctx = this.ctx;
    const baseX = state.baseX - state.cameraX;
    const baseY = state.baseY - state.cameraY;

    if (baseX < -state.baseRadius || baseX > this.width + state.baseRadius) return;
    if (baseY < -state.baseRadius || baseY > this.height + state.baseRadius) return;

    ctx.save();

    const pulse = Math.sin(this.time * 0.002) * 0.2 + 0.8;
    const gradient = ctx.createRadialGradient(baseX, baseY, 0, baseX, baseY, state.baseRadius);
    gradient.addColorStop(0, `rgba(0, 200, 255, ${0.3 * pulse})`);
    gradient.addColorStop(0.5, `rgba(0, 150, 200, ${0.15 * pulse})`);
    gradient.addColorStop(1, 'rgba(0, 100, 150, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(baseX, baseY, state.baseRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(0, 200, 255, ${0.6 * pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(baseX, baseY, state.baseRadius * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0, 180, 220, 0.8)';
    ctx.beginPath();
    ctx.arc(baseX, baseY, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('基地', baseX, baseY + 4);

    ctx.restore();
  }

  private drawShip(state: GameState): void {
    const ship = state.ship;
    const x = ship.x - state.cameraX;
    const y = ship.y - state.cameraY;

    if (x < -50 || x > this.width + 50) return;
    if (y < -50 || y > this.height + 50) return;

    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ship.angle);

    if (!ship.isDead) {
      for (const particle of ship.trailParticles) {
        const alpha = particle.lifetime / particle.maxLifetime;
        const engineColor = ship.engineLevel > 1 ? '#00ddff' : ship.engineLevel > 0 ? '#66ddff' : '#ffaa44';
        const gradient = ctx.createRadialGradient(
          particle.x - ship.x,
          particle.y - ship.y,
          0,
          particle.x - ship.x,
          particle.y - ship.y,
          particle.size * (1 + ship.engineLevel * 0.3)
        );
        gradient.addColorStop(0, `rgba(255, 200, 100, ${alpha})`);
        gradient.addColorStop(0.5, `${engineColor}${Math.floor(alpha * 128).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, 'rgba(100, 100, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x - ship.x, particle.y - ship.y, particle.size * (1 + ship.engineLevel * 0.3), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (ship.isDead) {
      const deathProgress = Math.min(1, state.gameOverTime / 1500);
      ctx.globalAlpha = 1 - deathProgress;

      const pieces = 9;
      const size = ship.radius * 0.8;
      for (let i = 0; i < pieces; i++) {
        const px = (i % 3 - 1) * size * 0.6;
        const py = (Math.floor(i / 3) - 1) * size * 0.6;
        const offsetX = px * deathProgress * 3;
        const offsetY = py * deathProgress * 3;
        const rot = deathProgress * 2;

        ctx.save();
        ctx.translate(px + offsetX, py + offsetY);
        ctx.rotate(rot);

        ctx.fillStyle = '#334455';
        ctx.strokeStyle = '#5577aa';
        ctx.lineWidth = 1;
        ctx.fillRect(-size * 0.3, -size * 0.3, size * 0.6, size * 0.6);
        ctx.strokeRect(-size * 0.3, -size * 0.3, size * 0.6, size * 0.6);

        ctx.restore();
      }
      ctx.restore();
      return;
    }

    if (ship.shieldLevel > 0 && ship.shield > 0) {
      const shieldAlpha = 0.3 + (ship.shield / ship.maxShield) * 0.3;
      const hexSize = ship.radius * 1.6;

      ctx.save();
      ctx.rotate(ship.shieldHexPhase);
      ctx.strokeStyle = `rgba(0, 255, 255, ${shieldAlpha})`;
      ctx.lineWidth = 2 + ship.shieldLevel;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const hx = Math.cos(angle) * hexSize;
        const hy = Math.sin(angle) * hexSize;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();

      ctx.rotate(-ship.shieldHexPhase * 2);
      ctx.strokeStyle = `rgba(0, 200, 255, ${shieldAlpha * 0.5})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const hx = Math.cos(angle) * hexSize * 0.8;
        const hy = Math.sin(angle) * hexSize * 0.8;
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = '#2a3a4a';
    ctx.strokeStyle = '#4a6a8a';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(ship.radius, 0);
    ctx.lineTo(-ship.radius * 0.7, -ship.radius * 0.6);
    ctx.lineTo(-ship.radius * 0.4, 0);
    ctx.lineTo(-ship.radius * 0.7, ship.radius * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#00ccff';
    ctx.beginPath();
    ctx.ellipse(ship.radius * 0.2, 0, ship.radius * 0.25, ship.radius * 0.15, 0, 0, Math.PI * 2);
    ctx.fill();

    if (ship.fireRateLevel > 0) {
      const pulse = Math.sin(this.time * 0.01) * 0.3 + 0.7;
      ctx.strokeStyle = `rgba(0, 150, 255, ${pulse})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ship.radius * 0.8, 0, 6 + ship.fireRateLevel * 2, 0, Math.PI * 2);
      ctx.stroke();

      if (ship.fireRateLevel >= 2) {
        ctx.strokeStyle = `rgba(100, 200, 255, ${pulse * 0.6})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(ship.radius * 0.8, 0, 9 + ship.fireRateLevel * 2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    const engineIntensity = Math.abs(ship.vx) + Math.abs(ship.vy);
    if (engineIntensity > 0.5) {
      const flameLength = 10 + engineIntensity * 3 + ship.engineLevel * 8;
      const gradient = ctx.createLinearGradient(-ship.radius * 0.4, 0, -ship.radius * 0.4 - flameLength, 0);
      gradient.addColorStop(0, ship.engineLevel > 1 ? 'rgba(0, 255, 255, 0.9)' : ship.engineLevel > 0 ? 'rgba(100, 200, 255, 0.9)' : 'rgba(255, 180, 50, 0.9)');
      gradient.addColorStop(0.5, ship.engineLevel > 1 ? 'rgba(0, 150, 255, 0.6)' : ship.engineLevel > 0 ? 'rgba(50, 100, 255, 0.6)' : 'rgba(255, 100, 0, 0.6)');
      gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(-ship.radius * 0.4, -ship.radius * 0.2);
      ctx.lineTo(-ship.radius * 0.4 - flameLength, 0);
      ctx.lineTo(-ship.radius * 0.4, ship.radius * 0.2);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  private drawCrystals(state: GameState): void {
    const ctx = this.ctx;

    for (const crystal of state.crystals) {
      if (!crystal.active) continue;

      const x = crystal.x - state.cameraX;
      const y = crystal.y - state.cameraY;

      if (x < -30 || x > this.width + 30) continue;
      if (y < -30 || y > this.height + 30) continue;

      const color = crystal.color === 'red' ? '#ff4466' : crystal.color === 'blue' ? '#4488ff' : '#44ff88';
      const glowColor = crystal.color === 'red' ? 'rgba(255, 68, 102,' : crystal.color === 'blue' ? 'rgba(68, 136, 255,' : 'rgba(68, 255, 136,';

      ctx.save();
      ctx.translate(x, y);

      const pulse = Math.sin(crystal.pulsePhase) * 0.2 + 1;
      const size = crystal.radius * pulse;

      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2);
      gradient.addColorStop(0, `${glowColor} 0.4)`);
      gradient.addColorStop(0.5, `${glowColor} 0.1)`);
      gradient.addColorStop(1, `${glowColor} 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, size * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.6, 0);
      ctx.lineTo(0, size);
      ctx.lineTo(-size * 0.6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.8);
      ctx.lineTo(size * 0.3, -size * 0.2);
      ctx.lineTo(0, 0);
      ctx.lineTo(-size * 0.2, -size * 0.3);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  private drawEnemies(state: GameState): void {
    const ctx = this.ctx;

    for (const enemy of state.enemies) {
      if (!enemy.active) continue;

      const x = enemy.x - state.cameraX;
      const y = enemy.y - state.cameraY;

      if (x < -60 || x > this.width + 60) continue;
      if (y < -60 || y > this.height + 60) continue;

      ctx.save();
      ctx.translate(x, y);

      if (enemy.alertLevel > 0.3 && !state.ship.isDead) {
        const flashIntensity = Math.sin(this.time * 0.02) * 0.5 + 0.5;
        if (enemy.alertFlash > 0 || flashIntensity > 0.7) {
          ctx.strokeStyle = `rgba(255, 50, 50, ${enemy.alertFlash || flashIntensity * 0.8})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, 0, enemy.radius + 8, 0, Math.PI * 2);
          ctx.stroke();
        }

        if (enemy.alertLevel > 0.5) {
          ctx.fillStyle = '#ff2222';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('!', 0, -enemy.radius - 15);

          ctx.strokeStyle = `rgba(255, 50, 50, ${0.5 + flashIntensity * 0.5})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, -enemy.radius - 12, 10, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      ctx.rotate(enemy.rotation);

      if (enemy.type === 'patrol') {
        ctx.fillStyle = '#4a2a3a';
        ctx.strokeStyle = '#aa4466';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(enemy.radius, 0);
        ctx.lineTo(enemy.radius * 0.3, -enemy.radius * 0.7);
        ctx.lineTo(-enemy.radius * 0.8, -enemy.radius * 0.5);
        ctx.lineTo(-enemy.radius * 0.6, 0);
        ctx.lineTo(-enemy.radius * 0.8, enemy.radius * 0.5);
        ctx.lineTo(enemy.radius * 0.3, enemy.radius * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ff4466';
        ctx.beginPath();
        ctx.arc(enemy.radius * 0.2, 0, enemy.radius * 0.15, 0, Math.PI * 2);
        ctx.fill();

        const healthRatio = enemy.health / enemy.maxHealth;
        ctx.rotate(-enemy.rotation);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(-enemy.radius, -enemy.radius - 10, enemy.radius * 2, 4);
        ctx.fillStyle = '#ff4466';
        ctx.fillRect(-enemy.radius, -enemy.radius - 10, enemy.radius * 2 * healthRatio, 4);
      } else {
        ctx.fillStyle = '#3a2a4a';
        ctx.strokeStyle = '#8866aa';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(enemy.radius, 0);
        ctx.lineTo(-enemy.radius * 0.5, -enemy.radius * 0.6);
        ctx.lineTo(-enemy.radius * 0.3, 0);
        ctx.lineTo(-enemy.radius * 0.5, enemy.radius * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#aa66ff';
        ctx.beginPath();
        ctx.arc(enemy.radius * 0.1, 0, enemy.radius * 0.12, 0, Math.PI * 2);
        ctx.fill();

        const healthRatio = enemy.health / enemy.maxHealth;
        ctx.rotate(-enemy.rotation);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(-enemy.radius, -enemy.radius - 8, enemy.radius * 2, 3);
        ctx.fillStyle = '#aa66ff';
        ctx.fillRect(-enemy.radius, -enemy.radius - 8, enemy.radius * 2 * healthRatio, 3);
      }

      ctx.restore();
    }
  }

  private drawAsteroids(state: GameState): void {
    const ctx = this.ctx;

    for (const asteroid of state.asteroids) {
      if (!asteroid.active) continue;

      const x = asteroid.x - state.cameraX;
      const y = asteroid.y - state.cameraY;

      if (x < -asteroid.radius - 10 || x > this.width + asteroid.radius + 10) continue;
      if (y < -asteroid.radius - 10 || y > this.height + asteroid.radius + 10) continue;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(asteroid.rotation);

      ctx.fillStyle = '#4a4a5a';
      ctx.strokeStyle = '#6a6a7a';
      ctx.lineWidth = 2;

      ctx.beginPath();
      const vertexCount = asteroid.vertices.length / 2;
      for (let i = 0; i < vertexCount; i++) {
        const angle = asteroid.vertices[i * 2];
        const r = asteroid.vertices[i * 2 + 1];
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#3a3a4a';
      ctx.beginPath();
      ctx.arc(asteroid.radius * 0.3, -asteroid.radius * 0.2, asteroid.radius * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(-asteroid.radius * 0.2, asteroid.radius * 0.3, asteroid.radius * 0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawLasers(state: GameState): void {
    const ctx = this.ctx;

    for (const laser of state.lasers) {
      if (!laser.active) continue;

      const x = laser.x - state.cameraX;
      const y = laser.y - state.cameraY;

      if (x < -20 || x > this.width + 20) continue;
      if (y < -20 || y > this.height + 20) continue;

      const angle = Math.atan2(laser.vy, laser.vx);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      if (laser.muzzleFlashTime > 0) {
        const flashAlpha = laser.muzzleFlashTime / 100;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 15 * flashAlpha);
        gradient.addColorStop(0, `rgba(255, 180, 50, ${flashAlpha})`);
        gradient.addColorStop(0.5, `rgba(255, 100, 0, ${flashAlpha * 0.5})`);
        gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, 15 * flashAlpha, 0, Math.PI * 2);
        ctx.fill();
      }

      const gradient = ctx.createLinearGradient(-15, 0, 15, 0);
      gradient.addColorStop(0, 'rgba(255, 200, 100, 0)');
      gradient.addColorStop(0.3, 'rgba(255, 150, 50, 0.8)');
      gradient.addColorStop(0.5, 'rgba(255, 255, 200, 1)');
      gradient.addColorStop(0.7, 'rgba(255, 150, 50, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 200, 100, 0)');

      ctx.fillStyle = gradient;
      ctx.fillRect(-15, -3, 30, 6);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-8, -1.5, 16, 3);

      ctx.restore();
    }
  }

  private drawEnemyBullets(state: GameState): void {
    const ctx = this.ctx;

    for (const bullet of state.enemyBullets) {
      if (!bullet.active) continue;

      const x = bullet.x - state.cameraX;
      const y = bullet.y - state.cameraY;

      if (x < -30 || x > this.width + 30) continue;
      if (y < -30 || y > this.height + 30) continue;

      for (let i = 0; i < bullet.trailPositions.length; i++) {
        const tPos = bullet.trailPositions[i];
        const tx = tPos.x - state.cameraX;
        const ty = tPos.y - state.cameraY;
        const alpha = (i / bullet.trailPositions.length) * 0.4;
        const size = bullet.radius * (i / bullet.trailPositions.length) * 0.8;

        ctx.fillStyle = `rgba(180, 100, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(tx, ty, size, 0, Math.PI * 2);
        ctx.fill();
      }

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, bullet.radius * 2);
      gradient.addColorStop(0, 'rgba(200, 150, 255, 1)');
      gradient.addColorStop(0.5, 'rgba(150, 80, 220, 0.6)');
      gradient.addColorStop(1, 'rgba(100, 50, 180, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, bullet.radius * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ddbbff';
      ctx.beginPath();
      ctx.arc(x, y, bullet.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x - bullet.radius * 0.3, y - bullet.radius * 0.3, bullet.radius * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawParticles(state: GameState): void {
    const ctx = this.ctx;

    for (const particle of state.particles) {
      if (!particle.active) continue;

      const x = particle.x - state.cameraX;
      const y = particle.y - state.cameraY;

      if (x < -20 || x > this.width + 20) continue;
      if (y < -20 || y > this.height + 20) continue;

      const alpha = particle.lifetime / particle.maxLifetime;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(particle.rotation);
      ctx.globalAlpha = alpha;

      const size = particle.size * alpha;

      if (particle.color.startsWith('#')) {
        ctx.fillStyle = particle.color;
      } else {
        ctx.fillStyle = particle.color;
      }

      ctx.fillRect(-size / 2, -size / 2, size, size);

      ctx.restore();
    }
  }

  private drawShockwaves(state: GameState): void {
    const ctx = this.ctx;

    for (const shockwave of state.shockwaves) {
      if (!shockwave.active) continue;

      const x = shockwave.x - state.cameraX;
      const y = shockwave.y - state.cameraY;

      if (x < -shockwave.radius || x > this.width + shockwave.radius) continue;
      if (y < -shockwave.radius || y > this.height + shockwave.radius) continue;

      const alpha = shockwave.lifetime / shockwave.maxLifetime;

      ctx.strokeStyle = shockwave.color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 3 * alpha;
      ctx.beginPath();
      ctx.arc(x, y, shockwave.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = alpha * 0.3;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, shockwave.radius * 0.7, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 1;
    }
  }

  private drawUI(state: GameState): void {
    const ctx = this.ctx;

    this.drawEnergyBars(state);
    this.drawHealthBar(state);
    this.drawMinimap(state);
    this.drawStatsPanel(state);
    this.drawUpgradeButtons(state);
  }

  private drawEnergyBars(state: GameState): void {
    const ctx = this.ctx;
    const x = 20;
    const y = 20;
    const barWidth = 120;
    const barHeight = 24;
    const gap = 10;

    const colors = [
      { name: 'red', value: state.energyRed, color: '#ff4466', label: '护盾' },
      { name: 'blue', value: state.energyBlue, color: '#4488ff', label: '引擎' },
      { name: 'green', value: state.energyGreen, color: '#44ff88', label: '射速' },
    ];

    ctx.save();

    for (let i = 0; i < colors.length; i++) {
      const cy = y + i * (barHeight + gap);
      const ratio = colors[i].value / state.maxEnergy;

      ctx.fillStyle = 'rgba(10, 20, 40, 0.6)';
      ctx.strokeStyle = 'rgba(100, 150, 200, 0.3)';
      ctx.lineWidth = 1;
      this.drawRoundedRect(ctx, x - 5, cy - 5, barWidth + 80, barHeight + 10, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      this.drawRoundedRect(ctx, x, cy, barWidth, barHeight, 4);
      ctx.fill();

      const fillGradient = ctx.createLinearGradient(x, cy, x, cy + barHeight);
      fillGradient.addColorStop(0, colors[i].color);
      fillGradient.addColorStop(0.5, this.lightenColor(colors[i].color, 20));
      fillGradient.addColorStop(1, colors[i].color);
      ctx.fillStyle = fillGradient;
      this.drawRoundedRect(ctx, x, cy, barWidth * ratio, barHeight, 4);
      ctx.fill();

      const waveOffset = (this.time * 0.005 + i) % 1;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      for (let wx = 0; wx < barWidth * ratio; wx += 2) {
        const wy = cy + barHeight * 0.3 + Math.sin((wx / barWidth) * Math.PI * 4 + waveOffset * Math.PI * 2) * 3;
        if (wx === 0) ctx.moveTo(x + wx, wy);
        else ctx.lineTo(x + wx, wy);
      }
      ctx.lineTo(x + barWidth * ratio, cy + barHeight);
      ctx.lineTo(x, cy + barHeight);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      this.drawRoundedRect(ctx, x, cy, barWidth, barHeight, 4);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(colors[i].label, x + barWidth + 8, cy + barHeight / 2 + 4);

      ctx.fillStyle = 'rgba(200, 220, 255, 0.8)';
      ctx.font = '10px sans-serif';
      ctx.fillText(`${Math.floor(colors[i].value)}/${state.maxEnergy}`, x + barWidth + 8, cy + barHeight / 2 + 18);
    }

    ctx.restore();
  }

  private drawHealthBar(state: GameState): void {
    const ctx = this.ctx;
    const ship = state.ship;
    const x = 20;
    const y = 140;

    ctx.save();

    ctx.fillStyle = 'rgba(10, 20, 40, 0.6)';
    ctx.strokeStyle = 'rgba(100, 150, 200, 0.3)';
    ctx.lineWidth = 1;
    this.drawRoundedRect(ctx, x - 5, y - 5, 180, 45, 8);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('生命', x, y + 12);

    for (let i = 0; i < ship.maxHealth; i++) {
      const hx = x + 40 + i * 26;
      const hy = y + 3;
      const filled = i < ship.health;

      ctx.save();
      ctx.translate(hx + 10, hy + 10);

      if (filled) {
        ctx.fillStyle = '#ff4466';
        ctx.strokeStyle = '#ff8899';
      } else {
        ctx.fillStyle = 'rgba(100, 50, 60, 0.3)';
        ctx.strokeStyle = 'rgba(150, 80, 90, 0.4)';
      }
      ctx.lineWidth = 1;

      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.bezierCurveTo(8, -12, 12, -4, 0, 6);
      ctx.bezierCurveTo(-12, -4, -8, -12, 0, -6);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#00ddff';
    ctx.fillText('护盾', x, y + 36);

    const shieldRatio = ship.shield / ship.maxShield;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.drawRoundedRect(ctx, x + 40, y + 28, 100, 10, 3);
    ctx.fill();

    const shieldGradient = ctx.createLinearGradient(x + 40, y + 28, x + 40, y + 38);
    shieldGradient.addColorStop(0, '#00ddff');
    shieldGradient.addColorStop(1, '#0088aa');
    ctx.fillStyle = shieldGradient;
    this.drawRoundedRect(ctx, x + 40, y + 28, 100 * shieldRatio, 10, 3);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0, 200, 255, 0.5)';
    ctx.lineWidth = 1;
    this.drawRoundedRect(ctx, x + 40, y + 28, 100, 10, 3);
    ctx.stroke();

    ctx.restore();
  }

  private drawMinimap(state: GameState): void {
    const ctx = this.ctx;
    const mapSize = 150;
    const x = this.width - mapSize - 20;
    const y = 20;

    ctx.save();

    ctx.fillStyle = 'rgba(10, 20, 40, 0.7)';
    ctx.strokeStyle = 'rgba(100, 150, 200, 0.3)';
    ctx.lineWidth = 1;
    this.drawRoundedRect(ctx, x - 5, y - 5, mapSize + 10, mapSize + 30, 8);
    ctx.fill();
    ctx.stroke();

    const scale = mapSize / state.worldWidth;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(x, y, mapSize, mapSize);

    for (let row = 0; row < state.gridSize; row++) {
      for (let col = 0; col < state.gridSize; col++) {
        const cell = state.grid[row][col];
        const cx = x + cell.x * scale;
        const cy = y + cell.y * scale;
        const cs = cell.size * scale;

        if (cell.type === 'ore') {
          ctx.fillStyle = 'rgba(60, 180, 120, 0.4)';
          ctx.fillRect(cx, cy, cs, cs);
        } else if (cell.type === 'asteroid') {
          ctx.fillStyle = 'rgba(150, 120, 80, 0.3)';
          ctx.fillRect(cx, cy, cs, cs);
        } else if (cell.type === 'enemyPath') {
          ctx.fillStyle = 'rgba(200, 60, 100, 0.3)';
          ctx.fillRect(cx, cy, cs, cs);
        }
      }
    }

    ctx.fillStyle = '#00ccff';
    ctx.beginPath();
    ctx.arc(x + state.baseX * scale, y + state.baseY * scale, 4, 0, Math.PI * 2);
    ctx.fill();

    for (const crystal of state.crystals) {
      if (!crystal.active) continue;
      const color = crystal.color === 'red' ? '#ff4466' : crystal.color === 'blue' ? '#4488ff' : '#44ff88';
      ctx.fillStyle = color;
      ctx.fillRect(x + crystal.x * scale - 1, y + crystal.y * scale - 1, 2, 2);
    }

    for (const enemy of state.enemies) {
      if (!enemy.active) continue;
      ctx.fillStyle = '#ff2244';
      ctx.beginPath();
      ctx.arc(x + enemy.x * scale, y + enemy.y * scale, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (!state.ship.isDead) {
      ctx.save();
      ctx.translate(x + state.ship.x * scale, y + state.ship.y * scale);
      ctx.rotate(state.ship.angle);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(5, 0);
      ctx.lineTo(-3, -3);
      ctx.lineTo(-3, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    const viewX = state.cameraX * scale;
    const viewY = state.cameraY * scale;
    const viewW = this.width * scale;
    const viewH = this.height * scale;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + viewX, y + viewY, viewW, viewH);

    ctx.fillStyle = 'rgba(200, 220, 255, 0.8)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('星域地图', x + mapSize / 2, y + mapSize + 18);

    ctx.restore();
  }

  private drawStatsPanel(state: GameState): void {
    const ctx = this.ctx;
    const x = 20;
    const y = this.height - 100;

    ctx.save();

    ctx.fillStyle = 'rgba(10, 20, 40, 0.6)';
    ctx.strokeStyle = 'rgba(100, 150, 200, 0.3)';
    ctx.lineWidth = 1;
    this.drawRoundedRect(ctx, x - 5, y - 5, 180, 95, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('采集统计', x, y + 15);

    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'rgba(200, 220, 255, 0.9)';
    ctx.fillText(`晶体收集: ${state.crystalsCollected}`, x, y + 38);
    ctx.fillText(`敌舰击毁: ${state.enemiesDestroyed}`, x, y + 56);

    ctx.fillStyle = '#ffcc44';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`得分: ${state.score}`, x, y + 78);

    ctx.restore();
  }

  private drawUpgradeButtons(state: GameState): void {
    const ctx = this.ctx;
    const btnWidth = 100;
    const btnHeight = 32;
    const gap = 10;
    const x = this.width - btnWidth - 20;
    const y = this.height - (btnHeight * 3 + gap * 2 + 30);

    ctx.save();

    ctx.fillStyle = 'rgba(10, 20, 40, 0.6)';
    ctx.strokeStyle = 'rgba(100, 150, 200, 0.3)';
    ctx.lineWidth = 1;
    this.drawRoundedRect(ctx, x - 10, y - 10, btnWidth + 20, btnHeight * 3 + gap * 2 + 35, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('飞船升级', x + btnWidth / 2, y + 8);

    const nearBase = this.isNearBase(state);

    const upgrades = [
      { id: 'shield', label: '护盾升级', color: '#ff4466', energy: state.energyRed, level: state.ship.shieldLevel },
      { id: 'engine', label: '引擎升级', color: '#4488ff', energy: state.energyBlue, level: state.ship.engineLevel },
      { id: 'fire', label: '射速升级', color: '#44ff88', energy: state.energyGreen, level: state.ship.fireRateLevel },
    ];

    for (let i = 0; i < upgrades.length; i++) {
      const by = y + 25 + i * (btnHeight + gap);
      const canUpgrade = nearBase && upgrades[i].energy >= state.maxEnergy && upgrades[i].level < 3;
      const isHovered = this.hoveredButton === upgrades[i].id;

      ctx.save();

      if (isHovered && canUpgrade) {
        ctx.shadowColor = upgrades[i].color;
        ctx.shadowBlur = 15;
        const scale = 1.05;
        ctx.translate(x + btnWidth / 2, by + btnHeight / 2);
        ctx.scale(scale, scale);
        ctx.translate(-(x + btnWidth / 2), -(by + btnHeight / 2));
      }

      let bgColor: string;
      let borderColor: string;
      let textColor: string;

      if (!nearBase) {
        bgColor = 'rgba(50, 50, 70, 0.5)';
        borderColor = 'rgba(100, 100, 120, 0.3)';
        textColor = 'rgba(150, 150, 170, 0.5)';
      } else if (canUpgrade) {
        bgColor = isHovered ? this.lightenColor(upgrades[i].color, -20) + '99' : upgrades[i].color + '66';
        borderColor = upgrades[i].color;
        textColor = '#ffffff';
      } else {
        bgColor = 'rgba(40, 40, 60, 0.5)';
        borderColor = 'rgba(100, 100, 130, 0.4)';
        textColor = 'rgba(180, 180, 200, 0.6)';
      }

      ctx.fillStyle = bgColor;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = canUpgrade ? 2 : 1;
      this.drawRoundedRect(ctx, x, by, btnWidth, btnHeight, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = textColor;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(upgrades[i].label, x + btnWidth / 2, by + 14);

      ctx.font = '9px sans-serif';
      const levelText = upgrades[i].level >= 3 ? '已满级' : `Lv.${upgrades[i].level}/3`;
      ctx.fillText(levelText, x + btnWidth / 2, by + 26);

      ctx.restore();
    }

    if (!nearBase) {
      ctx.fillStyle = 'rgba(255, 150, 100, 0.8)';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('需返回基地升级', x + btnWidth / 2, y + 25 + 3 * (btnHeight + gap) - 5);
    }

    ctx.restore();
  }

  private drawHitFlash(state: GameState): void {
    if (state.hitFlash <= 0) return;

    const ctx = this.ctx;
    const flashAlpha = state.hitFlash * 0.4;

    ctx.save();
    const gradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.6
    );
    gradient.addColorStop(0, `rgba(255, 50, 50, 0)`);
    gradient.addColorStop(0.7, `rgba(255, 30, 30, ${flashAlpha * 0.5})`);
    gradient.addColorStop(1, `rgba(255, 0, 0, ${flashAlpha})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  }

  private drawWarningOverlay(state: GameState): void {
    if (state.warningLevel <= 0) return;

    const ctx = this.ctx;

    ctx.save();
    ctx.globalAlpha = state.warningLevel * 0.7;

    const grayCanvas = document.createElement('canvas');
    grayCanvas.width = this.width;
    grayCanvas.height = this.height;
    const grayCtx = grayCanvas.getContext('2d');
    if (grayCtx) {
      grayCtx.drawImage(this.canvas, 0, 0);
      const imageData = grayCtx.getImageData(0, 0, this.width, this.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }
      grayCtx.putImageData(imageData, 0, 0);
      ctx.drawImage(grayCanvas, 0, 0);
    }

    const flashAlpha = Math.sin(this.time * 0.01) * 0.3 + 0.5;
    ctx.fillStyle = `rgba(255, 0, 0, ${flashAlpha * state.warningLevel * 0.15})`;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.restore();
  }

  private drawGameOver(state: GameState): void {
    const ctx = this.ctx;

    ctx.save();

    const fadeIn = Math.min(1, state.gameOverTime / 1000);
    ctx.fillStyle = `rgba(0, 0, 0, ${0.6 * fadeIn})`;
    ctx.fillRect(0, 0, this.width, this.height);

    if (state.gameOverTime > 500) {
      const textAlpha = Math.min(1, (state.gameOverTime - 500) / 800);
      ctx.globalAlpha = textAlpha;

      ctx.fillStyle = '#ff3344';
      ctx.font = 'bold 64px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 20;
      ctx.fillText('任务失败', this.width / 2, this.height / 2 - 20);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#aabbcc';
      ctx.font = '20px sans-serif';
      ctx.fillText('你的飞船已被摧毁', this.width / 2, this.height / 2 + 30);

      ctx.fillStyle = '#ffcc44';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(`最终得分: ${state.score}`, this.width / 2, this.height / 2 + 70);

      ctx.fillStyle = '#8899aa';
      ctx.font = '16px sans-serif';
      ctx.fillText('按 R 键重新开始', this.width / 2, this.height / 2 + 110);
    }

    ctx.restore();
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, Math.max(0, (num >> 16) + amt));
    const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
    const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
    return `#${((R << 16) | (G << 8) | B).toString(16).padStart(6, '0')}`;
  }

  private isNearBase(state: GameState): boolean {
    const dx = state.ship.x - state.baseX;
    const dy = state.ship.y - state.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < state.baseRadius + 50;
  }

  public checkButtonClick(state: GameState, mouseX: number, mouseY: number): string | null {
    const btnWidth = 100;
    const btnHeight = 32;
    const gap = 10;
    const x = this.width - btnWidth - 20;
    const y = this.height - (btnHeight * 3 + gap * 2 + 30) + 25;

    const upgrades = ['shield', 'engine', 'fire'];

    for (let i = 0; i < upgrades.length; i++) {
      const by = y + i * (btnHeight + gap);
      if (mouseX >= x && mouseX <= x + btnWidth && mouseY >= by && mouseY <= by + btnHeight) {
        return upgrades[i];
      }
    }

    return null;
  }

  public checkButtonHover(state: GameState, mouseX: number, mouseY: number): string | null {
    return this.checkButtonClick(state, mouseX, mouseY);
  }
}
