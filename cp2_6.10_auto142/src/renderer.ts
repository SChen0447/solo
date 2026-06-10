import {
  Terrain,
  TerrainData,
  CharacterState,
  MovingPlatformTerrain,
  CANVAS_WIDTH,
  CANVAS_HEIGHT
} from './terrainData';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private terrainData: TerrainData;
  private animationTime: number = 0;
  private trail: { x: number; y: number; alpha: number }[] = [];

  constructor(ctx: CanvasRenderingContext2D, terrainData: TerrainData) {
    this.ctx = ctx;
    this.terrainData = terrainData;
  }

  render(
    character: CharacterState | null,
    selectedTool: string | null,
    selectedTerrainId: string | null,
    hoverTerrainId: string | null,
    previewPos: { x: number; y: number } | null
  ): void {
    this.animationTime += 0.016;

    this.ctx.fillStyle = '#2d3436';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.drawGrid();

    const terrains = this.terrainData.getTerrains();
    for (const terrain of terrains) {
      this.drawTerrain(terrain, terrain.id === selectedTerrainId, terrain.id === hoverTerrainId);
    }

    if (character) {
      this.updateTrail(character);
      this.drawTrail();
      this.drawCharacter(character);
    }

    if (selectedTool && previewPos) {
      this.drawPreview(selectedTool, previewPos.x, previewPos.y);
    }
  }

  private drawGrid(): void {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    this.ctx.lineWidth = 1;

    for (let x = 0; x <= CANVAS_WIDTH; x += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, CANVAS_HEIGHT);
      this.ctx.stroke();
    }

    for (let y = 0; y <= CANVAS_HEIGHT; y += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(CANVAS_WIDTH, y);
      this.ctx.stroke();
    }
  }

  private drawTerrain(terrain: Terrain, selected: boolean, hover: boolean): void {
    let x = terrain.x;
    let y = terrain.y;

    if (terrain.type === 'moving_platform') {
      const pos = this.terrainData.getPlatformCurrentPosition(terrain as MovingPlatformTerrain);
      x = pos.x;
      y = pos.y;
    }

    switch (terrain.type) {
      case 'platform':
        this.drawPlatform(x, y, terrain.width, terrain.height, selected, hover);
        break;
      case 'slope_left_high':
        this.drawSlope(x, y, terrain.width, terrain.height, 'left', selected, hover);
        break;
      case 'slope_right_high':
        this.drawSlope(x, y, terrain.width, terrain.height, 'right', selected, hover);
        break;
      case 'moving_platform':
        this.drawMovingPlatform(x, y, terrain.width, terrain.height, terrain as MovingPlatformTerrain, selected, hover);
        break;
      case 'speed_boost':
        this.drawSpeedBoost(x, y, terrain.width, terrain.height, (terrain as any).direction, selected, hover);
        break;
      case 'teleport':
        this.drawTeleport(x, y, terrain.width, terrain.height, selected, hover);
        break;
      case 'obstacle':
        this.drawObstacle(x, y, terrain.width, terrain.height, selected, hover);
        break;
    }

    if (selected) {
      this.ctx.strokeStyle = '#f1c40f';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.strokeRect(terrain.x - 4, terrain.y - 4, terrain.width + 8, terrain.height + 8);
      this.ctx.setLineDash([]);
    }
  }

  private drawPlatform(
    x: number,
    y: number,
    w: number,
    h: number,
    _selected: boolean,
    hover: boolean
  ): void {
    this.ctx.fillStyle = '#636e72';
    this.roundRect(x, y, w, h, 4);
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(255,255,255,0.15)';
    this.roundRect(x, y, w, h / 3, 4);
    this.ctx.fill();

    if (hover) {
      this.ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      this.ctx.lineWidth = 2;
      this.roundRect(x, y, w, h, 4);
      this.ctx.stroke();
    }
  }

  private drawSlope(
    x: number,
    y: number,
    w: number,
    h: number,
    side: 'left' | 'right',
    _selected: boolean,
    hover: boolean
  ): void {
    this.ctx.fillStyle = '#d35400';
    this.ctx.beginPath();
    if (side === 'left') {
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x + w, y + h);
      this.ctx.lineTo(x, y + h);
    } else {
      this.ctx.moveTo(x + w, y);
      this.ctx.lineTo(x + w, y + h);
      this.ctx.lineTo(x, y + h);
    }
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
    this.ctx.beginPath();
    if (side === 'left') {
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x + w * 0.7, y + h * 0.3);
      this.ctx.lineTo(x, y + h * 0.5);
    } else {
      this.ctx.moveTo(x + w, y);
      this.ctx.lineTo(x + w * 0.3, y + h * 0.3);
      this.ctx.lineTo(x + w, y + h * 0.5);
    }
    this.ctx.closePath();
    this.ctx.fill();

    if (hover) {
      this.ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      if (side === 'left') {
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x + w, y + h);
        this.ctx.lineTo(x, y + h);
      } else {
        this.ctx.moveTo(x + w, y);
        this.ctx.lineTo(x + w, y + h);
        this.ctx.lineTo(x, y + h);
      }
      this.ctx.closePath();
      this.ctx.stroke();
    }
  }

  private drawMovingPlatform(
    x: number,
    y: number,
    w: number,
    h: number,
    terrain: MovingPlatformTerrain,
    _selected: boolean,
    hover: boolean
  ): void {
    this.ctx.setLineDash([8, 6]);
    this.ctx.strokeStyle = 'rgba(52, 152, 219, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    if (terrain.pathType === 'horizontal') {
      this.ctx.moveTo(terrain.x, terrain.y + h / 2);
      this.ctx.lineTo(terrain.x + terrain.pathLength, terrain.y + h / 2);
    } else {
      this.ctx.moveTo(terrain.x + w / 2, terrain.y);
      this.ctx.lineTo(terrain.x + w / 2, terrain.y + terrain.pathLength);
    }
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    const glowAmount = hover ? 20 + Math.sin(this.animationTime * 5) * 10 : 0;
    if (glowAmount > 0) {
      this.ctx.shadowColor = '#3498db';
      this.ctx.shadowBlur = glowAmount;
    }

    this.ctx.fillStyle = '#3498db';
    this.roundRect(x, y, w, h, 4);
    this.ctx.fill();

    this.ctx.shadowBlur = 0;

    this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
    this.roundRect(x, y, w, h / 3, 4);
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
    this.ctx.font = '10px sans-serif';
    this.ctx.textAlign = 'center';
    const arrow = terrain.pathType === 'horizontal' ? '↔' : '↕';
    this.ctx.fillText(arrow, x + w / 2, y + h / 2 + 4);
  }

  private drawSpeedBoost(
    x: number,
    y: number,
    w: number,
    h: number,
    direction: string,
    _selected: boolean,
    hover: boolean
  ): void {
    const flash = (Math.sin(this.animationTime * 8) + 1) / 2;
    this.ctx.fillStyle = `rgba(46, 204, 113, ${0.7 + flash * 0.3})`;
    this.roundRect(x, y, w, h, 4);
    this.ctx.fill();

    this.ctx.fillStyle = `rgba(255,255,255,${0.6 + flash * 0.4})`;
    this.ctx.font = `bold ${Math.min(h * 0.7, 20)}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    let arrow = '→';
    if (direction === 'left') arrow = '←';
    if (direction === 'up') arrow = '↑';
    if (direction === 'down') arrow = '↓';

    const arrowCount = Math.max(1, Math.floor(w / 25));
    for (let i = 0; i < arrowCount; i++) {
      const offset = (i - (arrowCount - 1) / 2) * (w / arrowCount);
      this.ctx.fillText(arrow, x + w / 2 + offset, y + h / 2);
    }

    if (hover) {
      this.ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      this.ctx.lineWidth = 2;
      this.roundRect(x, y, w, h, 4);
      this.ctx.stroke();
    }
  }

  private drawTeleport(
    x: number,
    y: number,
    w: number,
    h: number,
    _selected: boolean,
    hover: boolean
  ): void {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const size = Math.min(w, h) / 2;
    const pulse = 1 + Math.sin(this.animationTime * 4) * 0.1;

    this.ctx.fillStyle = '#9b59b6';
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - size * pulse);
    this.ctx.lineTo(cx + size * pulse, cy);
    this.ctx.lineTo(cx, cy + size * pulse);
    this.ctx.lineTo(cx - size * pulse, cy);
    this.ctx.closePath();
    this.ctx.fill();

    this.ctx.fillStyle = 'rgba(255,255,255,0.3)';
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy - size * pulse * 0.6);
    this.ctx.lineTo(cx + size * pulse * 0.6, cy);
    this.ctx.lineTo(cx, cy);
    this.ctx.lineTo(cx - size * pulse * 0.6, cy);
    this.ctx.closePath();
    this.ctx.fill();

    if (hover) {
      this.ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(cx, cy - size * pulse);
      this.ctx.lineTo(cx + size * pulse, cy);
      this.ctx.lineTo(cx, cy + size * pulse);
      this.ctx.lineTo(cx - size * pulse, cy);
      this.ctx.closePath();
      this.ctx.stroke();
    }
  }

  private drawObstacle(
    x: number,
    y: number,
    w: number,
    h: number,
    _selected: boolean,
    hover: boolean
  ): void {
    const size = Math.min(w, h);
    const cx = x + w / 2;
    const cy = y + h / 2;

    this.ctx.fillStyle = '#e74c3c';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(cx - size * 0.25, cy - size * 0.25);
    this.ctx.lineTo(cx + size * 0.25, cy + size * 0.25);
    this.ctx.moveTo(cx + size * 0.25, cy - size * 0.25);
    this.ctx.lineTo(cx - size * 0.25, cy + size * 0.25);
    this.ctx.stroke();

    if (hover) {
      this.ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, size / 2 + 3, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  private drawCharacter(character: CharacterState): void {
    let visible = true;
    if (character.stunned) {
      visible = Math.floor(character.blinkTimer * 10) % 2 === 0;
    }

    if (visible) {
      this.ctx.fillStyle = '#f1c40f';
      this.ctx.beginPath();
      this.ctx.arc(character.x, character.y, character.radius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.strokeStyle = '#d4ac0d';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      this.ctx.fillStyle = '#2c3e50';
      const eyeOffset = character.radius * 0.3;
      this.ctx.beginPath();
      this.ctx.arc(character.x - eyeOffset, character.y - eyeOffset * 0.5, character.radius * 0.18, 0, Math.PI * 2);
      this.ctx.arc(character.x + eyeOffset, character.y - eyeOffset * 0.5, character.radius * 0.18, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private updateTrail(character: CharacterState): void {
    this.trail.push({ x: character.x, y: character.y, alpha: 0.6 });
    if (this.trail.length > 15) {
      this.trail.shift();
    }
    for (const t of this.trail) {
      t.alpha *= 0.92;
    }
  }

  private drawTrail(): void {
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const radius = 12 * (i / this.trail.length) * 0.8;
      this.ctx.fillStyle = `rgba(241, 196, 15, ${t.alpha * (i / this.trail.length) * 0.5})`;
      this.ctx.beginPath();
      this.ctx.arc(t.x, t.y, radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawPreview(tool: string, x: number, y: number): void {
    this.ctx.globalAlpha = 0.5;
    const w = 100;
    const h = 20;
    const px = x - w / 2;
    const py = y - h / 2;

    switch (tool) {
      case 'platform':
        this.drawPlatform(px, py, w, h, false, false);
        break;
      case 'slope_left_high':
        this.drawSlope(px, py, w, h, 'left', false, false);
        break;
      case 'slope_right_high':
        this.drawSlope(px, py, w, h, 'right', false, false);
        break;
      case 'moving_platform':
        const mp: MovingPlatformTerrain = {
          id: 'preview',
          type: 'moving_platform',
          x: px,
          y: py,
          width: w,
          height: h,
          collisionType: 'dynamic',
          pathType: 'horizontal',
          pathLength: 150,
          period: 2,
          phase: 0
        };
        this.drawMovingPlatform(px, py, w, h, mp, false, false);
        break;
      case 'speed_boost':
        this.drawSpeedBoost(px, py, w, h, 'right', false, false);
        break;
      case 'teleport':
        this.drawTeleport(px, py, w, h, false, false);
        break;
      case 'obstacle':
        this.drawObstacle(x - 15, y - 15, 30, 30, false, false);
        break;
    }

    this.ctx.globalAlpha = 1;
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const radius = Math.min(r, w / 2, h / 2);
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + w - radius, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    this.ctx.lineTo(x + w, y + h - radius);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    this.ctx.lineTo(x + radius, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }
}
