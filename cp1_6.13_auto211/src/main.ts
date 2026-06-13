import { GameCore, HexCoord, RunePiece, GameEvent, GameState } from './gameCore';
import { Renderer } from './renderer';
import { SoundEngine } from './soundEngine';

class Game {
  private gameCore: GameCore;
  private renderer: Renderer;
  private soundEngine: SoundEngine;
  private animationId: number = 0;
  private battleCheckTimer: number | null = null;
  private selectedSkill: 'shield' | 'freeze' | 'starcrack' | null = null;
  private starfieldCanvas: HTMLCanvasElement;
  private starCtx: CanvasRenderingContext2D;
  private stars: { x: number; y: number; size: number; speed: number; alpha: number }[] = [];
  private mouseX: number = 0;
  private mouseY: number = 0;

  constructor() {
    this.gameCore = new GameCore();
    this.soundEngine = new SoundEngine();

    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.renderer = new Renderer(canvas, this.gameCore);

    this.starfieldCanvas = document.getElementById('starfield') as HTMLCanvasElement;
    this.starCtx = this.starfieldCanvas.getContext('2d')!;

    this.initStarfield();
    this.setupEventListeners();
    this.setupGameEvents();
    this.startGameLoop();
  }

  private initStarfield(): void {
    this.starfieldCanvas.width = window.innerWidth;
    this.starfieldCanvas.height = window.innerHeight;

    for (let i = 0; i < 150; i++) {
      this.stars.push({
        x: Math.random() * this.starfieldCanvas.width,
        y: Math.random() * this.starfieldCanvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.3 + 0.1,
        alpha: Math.random() * 0.5 + 0.3
      });
    }

    this.animateStarfield();
  }

  private animateStarfield(): void {
    const ctx = this.starCtx;
    const w = this.starfieldCanvas.width;
    const h = this.starfieldCanvas.height;

    ctx.clearRect(0, 0, w, h);

    this.stars.forEach(star => {
      star.x -= star.speed;
      if (star.x < 0) {
        star.x = w;
        star.y = Math.random() * h;
      }

      const twinkle = Math.sin(Date.now() / 1000 + star.x) * 0.3 + 0.7;

      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha * twinkle})`;
      ctx.fill();
    });

    requestAnimationFrame(() => this.animateStarfield());
  }

  private setupEventListeners(): void {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

    canvas.addEventListener('click', (e) => {
      if (!this.soundEngine.isInitialized()) {
        this.soundEngine.init();
      }
      this.handleCanvasClick(e);
    });

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });

    window.addEventListener('resize', () => {
      this.starfieldCanvas.width = window.innerWidth;
      this.starfieldCanvas.height = window.innerHeight;
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === '1') this.selectSkill('shield');
      if (e.key === '2') this.selectSkill('freeze');
      if (e.key === '3') this.selectSkill('starcrack');
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.endTurn();
      }
      if (e.key === 'r' || e.key === 'R') this.restartGame();
    });
  }

  private handleCanvasClick(e: MouseEvent): void {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const state = this.gameCore.getState();

    if (state.phase === 'gameover') {
      if (this.isRestartButtonClicked(x, y)) {
        this.restartGame();
        return;
      }
      return;
    }

    if (state.phase === 'battle' && state.battleInfo) {
      const sector = this.renderer.getBattleSectorAt(x, y);
      if (sector >= 0) {
        this.handleBattleClick(sector);
        return;
      }
    }

    if (state.currentPlayer === 'player') {
      const skillIndex = this.getSkillButtonAt(x, y);
      if (skillIndex >= 0) {
        const skills: ('shield' | 'freeze' | 'starcrack')[] = ['shield', 'freeze', 'starcrack'];
        this.selectSkill(skills[skillIndex]);
        return;
      }

      if (this.isEndTurnButtonAt(x, y)) {
        this.endTurn();
        return;
      }
    }

    const coord = this.renderer.getHexAt(x, y);
    const piece = coord ? this.gameCore.getPieceAt(coord) : null;
    this.handleHexClick(coord, piece);
  }

  private isRestartButtonClicked(x: number, y: number): boolean {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const btnX = centerX - 60;
    const btnY = centerY + 80;
    return x >= btnX && x <= btnX + 120 && y >= btnY && y <= btnY + 40;
  }

  private getSkillButtonAt(x: number, y: number): number {
    const btnWidth = 90;
    const btnHeight = 60;
    const spacing = 15;
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const startX = canvas.width / (window.devicePixelRatio || 1) - (btnWidth + spacing) * 3 - 30 + spacing;
    const btnY = canvas.height / (window.devicePixelRatio || 1) - 100;

    for (let i = 0; i < 3; i++) {
      const btnX = startX + i * (btnWidth + spacing);
      if (x >= btnX && x <= btnX + btnWidth && y >= btnY && y <= btnY + btnHeight) {
        return i;
      }
    }
    return -1;
  }

  private isEndTurnButtonAt(x: number, y: number): boolean {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const btnWidth = 100;
    const btnHeight = 40;
    const btnX = canvas.width / (window.devicePixelRatio || 1) - btnWidth - 30;
    const btnY = canvas.height / (window.devicePixelRatio || 1) - 180;
    return x >= btnX && x <= btnX + btnWidth && y >= btnY && y <= btnY + btnHeight;
  }

  private setupGameEvents(): void {
    this.gameCore.subscribe((state, event) => {
      this.handleGameEvent(state, event);
    });
  }

  private handleGameEvent(state: GameState, event: GameEvent): void {
    switch (event.type) {
      case 'select':
        this.soundEngine.play('select');
        break;
      case 'move':
        this.soundEngine.play('move');
        this.renderer.addScreenShake(2, 0.08);
        const moveData = event.data as { pieceId: string; from: HexCoord; to: HexCoord };
        const fromCenter = this.renderer.getHexCenter(moveData.from);
        const toCenter = this.renderer.getHexCenter(moveData.to);
        this.addMoveTrail(fromCenter, toCenter, state.currentPlayer === 'player' ? '#48dbfb' : '#ff6b35');
        break;
      case 'battle_start':
        this.soundEngine.play('select');
        this.renderer.addScreenShake(3, 0.1);
        this.startBattleTimer();
        break;
      case 'battle_win':
        this.soundEngine.play('battle_win');
        const winData = event.data as { target: string; color: string };
        const winPiece = state.pieces.find(p => p.id === winData.target);
        if (winPiece) {
          const center = this.renderer.getHexCenter(winPiece.position);
          this.renderer.addExplosion(center.x, center.y, winData.color, 80);
        }
        break;
      case 'battle_lose':
        this.soundEngine.play('battle_lose');
        const loseData = event.data as { target: string; color: string };
        const losePiece = state.pieces.find(p => p.id === loseData.target);
        if (losePiece) {
          const center = this.renderer.getHexCenter(losePiece.position);
          this.renderer.addExplosion(center.x, center.y, loseData.color, 60);
        }
        break;
      case 'skill_shield':
        this.soundEngine.play('skill_shield');
        this.renderer.addScreenShake(2, 0.1);
        break;
      case 'skill_freeze':
        this.soundEngine.play('skill_freeze');
        this.renderer.addScreenShake(3, 0.12);
        break;
      case 'skill_starcrack':
        this.soundEngine.play('skill_starcrack');
        this.renderer.addScreenShake(5, 0.2);
        this.addStarcrackEffect();
        break;
      case 'victory':
        this.soundEngine.play('victory');
        this.addVictoryEffect(state.winner!);
        break;
    }
  }

  private addMoveTrail(from: { x: number; y: number }, to: { x: number; y: number }, color: string): void {
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      setTimeout(() => {
        this.renderer.addTrail(x, y, color);
      }, i * 30);
    }
  }

  private addStarcrackEffect(): void {
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    for (let i = 0; i < 30; i++) {
      setTimeout(() => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 50 + Math.random() * 200;
        const x = centerX + Math.cos(angle) * dist;
        const y = centerY + Math.sin(angle) * dist;
        this.renderer.addExplosion(x, y, '#a29bfe', 15);
      }, i * 50);
    }
  }

  private addVictoryEffect(winner: 'player' | 'ai'): void {
    const color = winner === 'player' ? '#00f2fe' : '#ff6b35';
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        const x = centerX + (Math.random() - 0.5) * 200;
        const y = centerY + (Math.random() - 0.5) * 200;
        this.renderer.addExplosion(x, y, color, 40);
      }, i * 200);
    }
  }

  private startBattleTimer(): void {
    if (this.battleCheckTimer) {
      clearTimeout(this.battleCheckTimer);
    }

    this.battleCheckTimer = window.setTimeout(() => {
      const state = this.gameCore.getState();
      if (state.phase === 'battle' && state.battleInfo && !state.battleInfo.resolved) {
        if (state.currentPlayer === 'player') {
          this.gameCore.battleTimeout();
        }
      }
    }, 1500);
  }

  private handleHexClick(coord: HexCoord | null, piece: RunePiece | null): void {
    const state = this.gameCore.getState();

    if (state.currentPlayer !== 'player') return;
    if (state.phase === 'battle') return;

    if (this.selectedSkill) {
      this.handleSkillTarget(coord, piece);
      return;
    }

    if (piece && piece.faction === 'player') {
      this.gameCore.selectPiece(piece.id);
    } else if (state.selectedPieceId && coord) {
      this.gameCore.movePiece(coord);
    }
  }

  private handleBattleClick(sectorIndex: number): void {
    const state = this.gameCore.getState();
    if (state.phase !== 'battle') return;
    if (state.currentPlayer !== 'player') return;

    this.gameCore.battleClick(sectorIndex);

    if (this.battleCheckTimer) {
      clearTimeout(this.battleCheckTimer);
      this.battleCheckTimer = null;
    }
  }

  private selectSkill(skill: 'shield' | 'freeze' | 'starcrack'): void {
    const state = this.gameCore.getState();
    if (state.currentPlayer !== 'player') return;
    if (state.phase === 'battle' || state.phase === 'gameover') return;

    const costs = { shield: 2, freeze: 3, starcrack: 5 };
    if (state.playerEnergy < costs[skill]) return;

    if (skill === 'starcrack') {
      this.gameCore.useSkill('starcrack');
      this.selectedSkill = null;
      return;
    }

    if (this.selectedSkill === skill) {
      this.selectedSkill = null;
      return;
    }

    if (skill === 'shield') {
      if (state.selectedPieceId) {
        const piece = state.pieces.find(p => p.id === state.selectedPieceId);
        if (piece && piece.faction === 'player') {
          this.gameCore.useSkill('shield', state.selectedPieceId);
          this.selectedSkill = null;
          return;
        }
      }
      this.selectedSkill = 'shield';
    }

    if (skill === 'freeze') {
      this.selectedSkill = 'freeze';
    }
  }

  private handleSkillTarget(coord: HexCoord | null, piece: RunePiece | null): void {
    if (!this.selectedSkill) return;

    if (this.selectedSkill === 'shield') {
      if (piece && piece.faction === 'player') {
        this.gameCore.useSkill('shield', piece.id);
        this.selectedSkill = null;
      }
    } else if (this.selectedSkill === 'freeze') {
      if (piece && piece.faction === 'ai') {
        this.gameCore.useSkill('freeze', piece.id);
        this.selectedSkill = null;
      }
    }
  }

  private endTurn(): void {
    const state = this.gameCore.getState();
    if (state.currentPlayer !== 'player') return;
    if (state.phase === 'battle' || state.phase === 'gameover') return;

    this.selectedSkill = null;
    this.gameCore.endTurn();
  }

  private restartGame(): void {
    this.gameCore.resetGame();
    this.selectedSkill = null;
    if (this.battleCheckTimer) {
      clearTimeout(this.battleCheckTimer);
      this.battleCheckTimer = null;
    }
  }

  private startGameLoop(): void {
    const loop = (time: number) => {
      this.renderer.render(time);
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  public getGameCore(): GameCore {
    return this.gameCore;
  }

  public getRenderer(): Renderer {
    return this.renderer;
  }
}

let game: Game | null = null;

window.addEventListener('DOMContentLoaded', () => {
  game = new Game();
  (window as unknown as { game: Game }).game = game;
});

export { Game };
