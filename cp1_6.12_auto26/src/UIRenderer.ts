import { Tile, Player, Pokemon, GameState, BattleState, Particle, TransitionState, ELEMENT_COLORS, ELEMENT_BG_COLORS, ELEMENT_NAMES, TILE_SIZE, MAP_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT, MAX_TEAM_SIZE } from './types';

export class UIRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private scale: number = 2;
  private isMobile: boolean = false;
  private hoveredButton: number = -1;
  private selectedTeamIndex: number = -1;
  private releaseAnimations: Map<number, number> = new Map();
  private buttonScale: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
    this.checkMobile();
    window.addEventListener('resize', () => this.checkMobile());
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth < 600;
    this.buttonScale = this.isMobile ? 1.4 : 1;
    const baseScale = this.isMobile ? 1.5 : 2;
    this.scale = baseScale;
  }

  public getScale(): number {
    return this.scale;
  }

  public setHoveredButton(index: number): void {
    this.hoveredButton = index;
  }

  public setSelectedTeamIndex(index: number): void {
    this.selectedTeamIndex = index;
  }

  public addReleaseAnimation(index: number): void {
    this.releaseAnimations.set(index, 0);
  }

  public updateReleaseAnimations(deltaTime: number): void {
    for (const [index, progress] of this.releaseAnimations.entries()) {
      const newProgress = progress + deltaTime * 0.003;
      if (newProgress >= 1) {
        this.releaseAnimations.delete(index);
      } else {
        this.releaseAnimations.set(index, newProgress);
      }
    }
  }

  public getReleaseProgress(index: number): number {
    return this.releaseAnimations.get(index) ?? 0;
  }

  public render(
    gameState: GameState,
    map: Tile[][],
    player: Player,
    cameraOffset: { x: number; y: number },
    animationFrame: number,
    isFlashing: boolean,
    flashFrame: number,
    battleState: BattleState,
    particles: Particle[],
    battleAnimTime: number,
    captureShakes: number,
    transition: TransitionState,
    team: Pokemon[]
  ): void {
    this.ctx.save();
    this.ctx.scale(this.scale, this.scale);
    
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH / this.scale, CANVAS_HEIGHT / this.scale);
    
    if (gameState === 'map' || gameState === 'transition') {
      this.renderMap(map, cameraOffset, animationFrame);
      this.renderPlayer(player, cameraOffset, animationFrame);
      
      if (isFlashing) {
        const alpha = Math.sin(flashFrame * Math.PI) * 0.8;
        this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        this.ctx.fillRect(0, 0, CANVAS_WIDTH / this.scale, CANVAS_HEIGHT / this.scale);
      }
    }
    
    if (gameState === 'battle' || gameState === 'captureSuccess' || (gameState === 'transition' && transition.toState === 'battle')) {
      if (battleState.enemyPokemon) {
        this.renderBattleBackground(battleState.enemyPokemon.element);
      }
      this.renderBattleScene(battleState, particles, battleAnimTime, captureShakes);
    }
    
    if (gameState === 'team') {
      this.renderTeamPanel(team, animationFrame);
    }
    
    if (transition.active) {
      this.renderTransition(transition);
    }
    
    this.ctx.restore();
  }

  private renderMap(map: Tile[][], cameraOffset: { x: number; y: number }, animationFrame: number): void {
    const viewWidth = Math.ceil(CANVAS_WIDTH / this.scale / TILE_SIZE) + 2;
    const viewHeight = Math.ceil(CANVAS_HEIGHT / this.scale / TILE_SIZE) + 2;
    
    const startX = Math.floor(cameraOffset.x / TILE_SIZE);
    const startY = Math.floor(cameraOffset.y / TILE_SIZE);
    
    for (let y = 0; y < viewHeight; y++) {
      for (let x = 0; x < viewWidth; x++) {
        const mapX = startX + x;
        const mapY = startY + y;
        
        if (mapX < 0 || mapX >= MAP_SIZE || mapY < 0 || mapY >= MAP_SIZE) {
          continue;
        }
        
        const tile = map[mapY][mapX];
        const screenX = mapX * TILE_SIZE - cameraOffset.x;
        const screenY = mapY * TILE_SIZE - cameraOffset.y;
        
        this.renderTile(tile, screenX, screenY, animationFrame);
      }
    }
  }

  private renderTile(tile: Tile, x: number, y: number, animationFrame: number): void {
    const ctx = this.ctx;
    
    switch (tile.type) {
      case 'grass':
        this.drawGrassTile(x, y, tile.variant);
        break;
      case 'tallGrass':
        this.drawTallGrassTile(x, y, tile.variant, animationFrame);
        break;
      case 'path':
        this.drawPathTile(x, y, tile.variant);
        break;
      case 'tree':
        this.drawTreeTile(x, y, tile.variant);
        break;
      case 'water':
        this.drawWaterTile(x, y, tile.variant, animationFrame);
        break;
    }
  }

  private drawGrassTile(x: number, y: number, variant: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#3d7c33';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    
    ctx.fillStyle = '#2d5a27';
    const patterns = [
      [[2, 3], [10, 8], [6, 12], [14, 5]],
      [[4, 2], [12, 10], [8, 14], [2, 9]],
      [[6, 4], [10, 12], [3, 8], [13, 2]]
    ];
    
    const pattern = patterns[variant % patterns.length];
    for (const [px, py] of pattern) {
      ctx.fillRect(x + px, y + py, 2, 2);
    }
  }

  private drawTallGrassTile(x: number, y: number, variant: number, animationFrame: number): void {
    const ctx = this.ctx;
    this.drawGrassTile(x, y, variant);
    
    ctx.fillStyle = '#4a9e3d';
    const sway = Math.sin(animationFrame + variant) * 1;
    
    const grassPositions = [
      [2 + sway, 4], [6 - sway, 2], [10 + sway, 5], [14 - sway, 3],
      [3 - sway, 10], [7 + sway, 8], [11 - sway, 11], [15 + sway, 9],
      [4 + sway, 14], [8 - sway, 12], [12 + sway, 15]
    ];
    
    for (const [gx, gy] of grassPositions) {
      ctx.fillRect(x + gx, y + gy, 2, 3);
      ctx.fillRect(x + gx + 0.5, y + gy - 1, 1, 2);
    }
  }

  private drawPathTile(x: number, y: number, variant: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#a08060';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    
    ctx.fillStyle = '#8b6914';
    if (variant === 0) {
      ctx.fillRect(x + 3, y + 4, 3, 2);
      ctx.fillRect(x + 10, y + 9, 2, 3);
      ctx.fillRect(x + 6, y + 12, 3, 2);
    } else {
      ctx.fillRect(x + 5, y + 2, 2, 3);
      ctx.fillRect(x + 11, y + 7, 3, 2);
      ctx.fillRect(x + 2, y + 11, 2, 2);
    }
  }

  private drawTreeTile(x: number, y: number, variant: number): void {
    const ctx = this.ctx;
    this.drawGrassTile(x, y, 0);
    
    ctx.fillStyle = '#5d3a1a';
    ctx.fillRect(x + 7, y + 10, 3, 6);
    
    ctx.fillStyle = '#228b22';
    if (variant === 0) {
      ctx.fillRect(x + 4, y + 2, 9, 9);
      ctx.fillRect(x + 2, y + 4, 13, 6);
      ctx.fillStyle = '#1a6b1a';
      ctx.fillRect(x + 3, y + 3, 3, 3);
      ctx.fillRect(x + 9, y + 6, 3, 3);
    } else {
      ctx.fillRect(x + 3, y + 3, 11, 8);
      ctx.fillRect(x + 5, y + 1, 7, 2);
      ctx.fillStyle = '#1a6b1a';
      ctx.fillRect(x + 6, y + 4, 3, 3);
      ctx.fillRect(x + 10, y + 7, 2, 2);
    }
  }

  private drawWaterTile(x: number, y: number, variant: number, animationFrame: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#4a90d9';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    
    ctx.fillStyle = '#6bb3e8';
    const waveOffset = Math.sin(animationFrame + variant * 2) * 2;
    
    const waves = [
      [2 + waveOffset, 4], [10 - waveOffset, 8], [5 + waveOffset, 12],
      [8 - waveOffset, 2], [3 + waveOffset, 10], [12 - waveOffset, 14]
    ];
    
    for (const [wx, wy] of waves) {
      ctx.fillRect(x + wx, y + wy, 4, 1);
    }
  }

  private renderPlayer(player: Player, cameraOffset: { x: number; y: number }, animationFrame: number): void {
    const ctx = this.ctx;
    const x = player.x * TILE_SIZE - cameraOffset.x;
    const y = player.y * TILE_SIZE - cameraOffset.y;
    
    const walkFrame = Math.floor(animationFrame * 2) % 2;
    const bobOffset = walkFrame === 0 ? 0 : -1;
    
    const drawY = y + bobOffset;
    
    ctx.fillStyle = '#e8c4a0';
    ctx.fillRect(x + 5, drawY + 4, 6, 5);
    
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(x + 4, drawY + 1, 8, 3);
    ctx.fillRect(x + 3, drawY + 2, 10, 2);
    
    ctx.fillStyle = '#000';
    if (player.direction === 'left') {
      ctx.fillRect(x + 5, drawY + 5, 2, 2);
    } else if (player.direction === 'right') {
      ctx.fillRect(x + 9, drawY + 5, 2, 2);
    } else if (player.direction === 'down') {
      ctx.fillRect(x + 5, drawY + 5, 2, 2);
      ctx.fillRect(x + 9, drawY + 5, 2, 2);
    }
    
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(x + 4, drawY + 9, 8, 5);
    
    ctx.fillStyle = '#2980b9';
    if (walkFrame === 0) {
      ctx.fillRect(x + 4, drawY + 14, 3, 2);
      ctx.fillRect(x + 9, drawY + 14, 3, 2);
    } else {
      ctx.fillRect(x + 3, drawY + 14, 3, 2);
      ctx.fillRect(x + 10, drawY + 14, 3, 2);
    }
    
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(x + 11, drawY + 9, 2, 4);
  }

  private renderBattleBackground(element: string): void {
    const ctx = this.ctx;
    const bgColor = ELEMENT_BG_COLORS[element as keyof typeof ELEMENT_BG_COLORS] || '#1a1a2e';
    
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT / this.scale);
    gradient.addColorStop(0, bgColor);
    gradient.addColorStop(0.5, this.lightenColor(bgColor, 20));
    gradient.addColorStop(1, this.darkenColor(bgColor, 20));
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH / this.scale, CANVAS_HEIGHT / this.scale);
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = 0; i < 30; i++) {
      const sx = (i * 37) % (CANVAS_WIDTH / this.scale);
      const sy = (i * 53) % (CANVAS_HEIGHT / this.scale);
      ctx.fillRect(sx, sy, 2, 2);
    }
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return `rgb(${R}, ${G}, ${B})`;
  }

  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
    const B = Math.max(0, (num & 0x0000ff) - amt);
    return `rgb(${R}, ${G}, ${B})`;
  }

  private renderBattleScene(
    battleState: BattleState,
    particles: Particle[],
    animTime: number,
    captureShakes: number
  ): void {
    const ctx = this.ctx;
    
    if (battleState.enemyPokemon) {
      const enemyBob = Math.sin(animTime * 0.05) * 3;
      this.renderPokemonSprite(
        battleState.enemyPokemon,
        360,
        100 + enemyBob,
        true
      );
      
      this.renderHpBar(
        260,
        40,
        120,
        battleState.enemyPokemon.maxHp,
        battleState.enemyPokemon.currentHp,
        battleState.enemyPokemon.name,
        battleState.enemyPokemon.level,
        true
      );
    }
    
    if (battleState.playerPokemon) {
      const playerBob = Math.sin(animTime * 0.05 + Math.PI) * 3;
      this.renderPokemonSprite(
        battleState.playerPokemon,
        100,
        200 + playerBob,
        false
      );
      
      this.renderHpBar(
        40,
        160,
        120,
        battleState.playerPokemon.maxHp,
        battleState.playerPokemon.currentHp,
        battleState.playerPokemon.name,
        battleState.playerPokemon.level,
        false
      );
    }
    
    for (const particle of particles) {
      const alpha = particle.life / particle.maxLife;
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(
        particle.x - particle.size / 2,
        particle.y - particle.size / 2,
        particle.size,
        particle.size
      );
    }
    ctx.globalAlpha = 1;
    
    if (captureShakes > 0 && battleState.enemyPokemon) {
      const shakeX = Math.sin(animTime * 0.3) * 5;
      ctx.fillStyle = '#c0392b';
      ctx.beginPath();
      ctx.arc(360 + shakeX, 100, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(360 + shakeX, 100, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(360 + shakeX, 100, 10, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    this.renderMessageBox(battleState.message);
  }

  private renderPokemonSprite(pokemon: Pokemon, x: number, y: number, isEnemy: boolean): void {
    const ctx = this.ctx;
    const color = ELEMENT_COLORS[pokemon.element];
    const size = isEnemy ? 64 : 80;
    const halfSize = size / 2;
    
    ctx.save();
    ctx.translate(x, y);
    
    ctx.fillStyle = color;
    ctx.fillRect(-halfSize * 0.6, -halfSize * 0.5, halfSize * 1.2, halfSize * 0.9);
    
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, -halfSize * 0.6, halfSize * 0.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.fillRect(-halfSize * 0.3, -halfSize * 0.7, halfSize * 0.25, halfSize * 0.25);
    ctx.fillRect(halfSize * 0.05, -halfSize * 0.7, halfSize * 0.25, halfSize * 0.25);
    
    ctx.fillStyle = '#000';
    const eyeOffset = isEnemy ? 2 : -2;
    ctx.fillRect(-halfSize * 0.25 + eyeOffset * 0.5, -halfSize * 0.6, halfSize * 0.12, halfSize * 0.15);
    ctx.fillRect(halfSize * 0.1 + eyeOffset * 0.5, -halfSize * 0.6, halfSize * 0.12, halfSize * 0.15);
    
    ctx.fillStyle = this.darkenColor(color, 30);
    ctx.fillRect(-halfSize * 0.7, -halfSize * 0.3, halfSize * 0.15, halfSize * 0.5);
    ctx.fillRect(halfSize * 0.55, -halfSize * 0.3, halfSize * 0.15, halfSize * 0.5);
    
    ctx.fillStyle = this.darkenColor(color, 20);
    ctx.fillRect(-halfSize * 0.5, halfSize * 0.3, halfSize * 0.3, halfSize * 0.3);
    ctx.fillRect(halfSize * 0.2, halfSize * 0.3, halfSize * 0.3, halfSize * 0.3);
    
    ctx.restore();
  }

  private renderHpBar(
    x: number,
    y: number,
    width: number,
    maxHp: number,
    currentHp: number,
    name: string,
    level: number,
    isEnemy: boolean
  ): void {
    const ctx = this.ctx;
    const height = 40;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    this.roundRect(x, y, width, height, 4);
    ctx.fill();
    
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    this.roundRect(x, y, width, height, 4);
    ctx.stroke();
    
    ctx.fillStyle = '#333';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(name, x + 8, y + 14);
    
    ctx.textAlign = 'right';
    ctx.fillText(`Lv${level}`, x + width - 8, y + 14);
    
    ctx.fillStyle = '#555';
    ctx.fillRect(x + 8, y + 20, width - 16, 6);
    
    const hpRatio = currentHp / maxHp;
    const hpWidth = Math.max(0, (width - 16) * hpRatio);
    
    let hpColor = '#27ae60';
    if (hpRatio <= 0.2) {
      hpColor = '#e74c3c';
    } else if (hpRatio <= 0.5) {
      hpColor = '#f39c12';
    }
    
    const hpGradient = ctx.createLinearGradient(x + 8, y + 20, x + 8, y + 26);
    hpGradient.addColorStop(0, this.lightenColor(hpColor, 20));
    hpGradient.addColorStop(1, this.darkenColor(hpColor, 10));
    
    ctx.fillStyle = hpGradient;
    const shakeOffset = hpRatio <= 0.2 ? Math.sin(Date.now() * 0.02) * 1 : 0;
    ctx.fillRect(x + 8 + shakeOffset, y + 20, hpWidth, 6);
    
    if (!isEnemy) {
      ctx.fillStyle = '#333';
      ctx.font = '6px "Press Start 2P", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(
        `${Math.ceil(currentHp)}/${maxHp}`,
        x + width - 8,
        y + 35
      );
    }
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private renderMessageBox(message: string): void {
    const ctx = this.ctx;
    const x = 10;
    const y = CANVAS_HEIGHT / this.scale - 70;
    const width = CANVAS_WIDTH / this.scale - 20;
    const height = 60;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    this.roundRect(x, y, width, height, 6);
    ctx.fill();
    
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    this.roundRect(x, y, width, height, 6);
    ctx.stroke();
    
    ctx.fillStyle = '#333';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    
    const words = message.split('');
    let line = '';
    let lineY = y + 20;
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i];
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > width - 20 && i > 0) {
        ctx.fillText(line, x + 12, lineY);
        line = words[i];
        lineY += 14;
      } else {
        line = testLine;
      }
      
      if (lineY > y + height - 12) {
        break;
      }
    }
    
    ctx.fillText(line, x + 12, lineY);
  }

  public renderBattleButtons(y: number, disabled: boolean): void {
    const ctx = this.ctx;
    const buttonWidth = 55 * this.buttonScale;
    const buttonHeight = 22 * this.buttonScale;
    const spacing = 8;
    const totalWidth = buttonWidth * 4 + spacing * 3;
    const startX = (CANVAS_WIDTH / this.scale - totalWidth) / 2;
    
    const labels = ['攻击', '捕捉', '逃跑', '队伍'];
    
    for (let i = 0; i < 4; i++) {
      const bx = startX + i * (buttonWidth + spacing);
      const by = y;
      
      let scale = 1;
      if (this.hoveredButton === i && !disabled) {
        scale = 1.1;
      }
      
      const scaledWidth = buttonWidth * scale;
      const scaledHeight = buttonHeight * scale;
      const offsetX = (buttonWidth - scaledWidth) / 2;
      const offsetY = (buttonHeight - scaledHeight) / 2;
      
      let bgColor = '#4a6741';
      if (disabled) {
        bgColor = '#666';
      } else if (this.hoveredButton === i) {
        bgColor = '#5d8a52';
      }
      
      ctx.fillStyle = bgColor;
      this.roundRect(bx + offsetX, by + offsetY, scaledWidth, scaledHeight, 4);
      ctx.fill();
      
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      this.roundRect(bx + offsetX, by + offsetY, scaledWidth, scaledHeight, 4);
      ctx.stroke();
      
      ctx.fillStyle = '#fff';
      ctx.font = `${8 * this.buttonScale * scale}px "Press Start 2P", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[i], bx + buttonWidth / 2, by + buttonHeight / 2 + 1);
    }
    
    ctx.textBaseline = 'alphabetic';
  }

  public getButtonAtPosition(px: number, py: number, y: number): number {
    const buttonWidth = 55 * this.buttonScale;
    const buttonHeight = 22 * this.buttonScale;
    const spacing = 8;
    const totalWidth = buttonWidth * 4 + spacing * 3;
    const startX = (CANVAS_WIDTH / this.scale - totalWidth) / 2;
    
    for (let i = 0; i < 4; i++) {
      const bx = startX + i * (buttonWidth + spacing);
      const by = y;
      
      if (px >= bx && px <= bx + buttonWidth && py >= by && py <= by + buttonHeight) {
        return i;
      }
    }
    
    return -1;
  }

  private renderTeamPanel(team: Pokemon[], animationFrame: number): void {
    const ctx = this.ctx;
    const panelWidth = 200;
    const panelHeight = 280;
    const x = (CANVAS_WIDTH / this.scale - panelWidth) / 2;
    const y = (CANVAS_HEIGHT / this.scale - panelHeight) / 2;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, CANVAS_WIDTH / this.scale, CANVAS_HEIGHT / this.scale);
    
    ctx.fillStyle = '#3d5a35';
    this.roundRect(x, y, panelWidth, panelHeight, 8);
    ctx.fill();
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    this.roundRect(x, y, panelWidth, panelHeight, 8);
    ctx.stroke();
    
    ctx.fillStyle = '#fff';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('队伍', CANVAS_WIDTH / this.scale / 2, y + 25);
    
    const slotWidth = panelWidth - 20;
    const slotHeight = 36;
    const slotY = y + 40;
    
    for (let i = 0; i < MAX_TEAM_SIZE; i++) {
      const sy = slotY + i * (slotHeight + 6);
      const releaseProgress = this.getReleaseProgress(i);
      
      if (releaseProgress > 0) {
        ctx.globalAlpha = 1 - releaseProgress;
      }
      
      if (i < team.length) {
        const pokemon = team[i];
        const isSelected = this.selectedTeamIndex === i;
        
        let slotColor = '#5a7a4d';
        if (isSelected) {
          slotColor = '#7a9a6d';
        }
        
        ctx.fillStyle = slotColor;
        this.roundRect(x + 10, sy, slotWidth, slotHeight, 4);
        ctx.fill();
        
        ctx.strokeStyle = isSelected ? '#ffcc00' : '#fff';
        ctx.lineWidth = isSelected ? 3 : 1;
        this.roundRect(x + 10, sy, slotWidth, slotHeight, 4);
        ctx.stroke();
        
        const elColor = ELEMENT_COLORS[pokemon.element];
        ctx.fillStyle = elColor;
        ctx.fillRect(x + 16, sy + 8, 20, 20);
        
        ctx.fillStyle = '#fff';
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(pokemon.name, x + 42, sy + 16);
        
        ctx.font = '5px "Press Start 2P", monospace';
        ctx.fillText(`Lv${pokemon.level}`, x + 42, sy + 28);
        
        ctx.fillStyle = '#555';
        ctx.fillRect(x + 100, sy + 20, 80, 5);
        
        const hpRatio = pokemon.currentHp / pokemon.maxHp;
        let hpColor = '#27ae60';
        if (hpRatio <= 0.2) hpColor = '#e74c3c';
        else if (hpRatio <= 0.5) hpColor = '#f39c12';
        
        ctx.fillStyle = hpColor;
        ctx.fillRect(x + 100, sy + 20, 80 * hpRatio, 5);
        
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'right';
        ctx.font = '5px "Press Start 2P", monospace';
        ctx.fillText(
          `${Math.ceil(pokemon.currentHp)}/${pokemon.maxHp}`,
          x + slotWidth - 10,
          sy + 32
        );
        
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ddd';
        ctx.fillText(`攻击: ${pokemon.attack}`, x + 100, sy + 32);
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.roundRect(x + 10, sy, slotWidth, slotHeight, 4);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        this.roundRect(x + 10, sy, slotWidth, slotHeight, 4);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      
      ctx.globalAlpha = 1;
    }
    
    ctx.fillStyle = '#aaa';
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('点击精灵可释放', CANVAS_WIDTH / this.scale / 2, y + panelHeight - 12);
    
    ctx.fillStyle = '#fff';
    ctx.fillText('按 ESC 关闭', CANVAS_WIDTH / this.scale / 2, y + panelHeight - 24);
  }

  public getTeamSlotAtPosition(px: number, py: number): number {
    const panelWidth = 200;
    const panelHeight = 280;
    const x = (CANVAS_WIDTH / this.scale - panelWidth) / 2;
    const y = (CANVAS_HEIGHT / this.scale - panelHeight) / 2;
    
    const slotWidth = panelWidth - 20;
    const slotHeight = 36;
    const slotY = y + 40;
    
    for (let i = 0; i < MAX_TEAM_SIZE; i++) {
      const sy = slotY + i * (slotHeight + 6);
      
      if (px >= x + 10 && px <= x + 10 + slotWidth && py >= sy && py <= sy + slotHeight) {
        return i;
      }
    }
    
    return -1;
  }

  private renderTransition(transition: TransitionState): void {
    const ctx = this.ctx;
    const centerX = CANVAS_WIDTH / this.scale / 2;
    const centerY = CANVAS_HEIGHT / this.scale / 2;
    
    const maxRadius = Math.sqrt(centerX * centerX + centerY * centerY);
    
    ctx.fillStyle = '#000';
    
    if (transition.type === 'out') {
      const radius = maxRadius * (1 - transition.progress);
      ctx.beginPath();
      ctx.rect(0, 0, CANVAS_WIDTH / this.scale, CANVAS_HEIGHT / this.scale);
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
      ctx.fill();
    } else {
      const radius = maxRadius * transition.progress;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
