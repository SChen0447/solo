import { GameEngine, Player, PLAYER_COLORS, PLAYER_NAMES, Position } from './GameEngine';
import { Renderer } from './Renderer';

export class UIManager {
  private canvas: HTMLCanvasElement;
  private engine: GameEngine;
  private renderer: Renderer;
  private hoverCell: Position | null;
  private selectedCell: Position | null;
  private lastPlayer: Player;

  private topBar: HTMLElement;
  private turnText: HTMLElement;
  private scoreP1: HTMLElement;
  private scoreP2: HTMLElement;
  private victoryOverlay: HTMLElement;
  private victoryTitle: HTMLElement;
  private victoryScoreP1: HTMLElement;
  private victoryScoreP2: HTMLElement;
  private victoryBarP1: HTMLElement;
  private victoryBarP2: HTMLElement;
  private restartBtn: HTMLElement;
  private skillButtons: NodeListOf<HTMLButtonElement>;

  constructor(
    canvas: HTMLCanvasElement,
    engine: GameEngine,
    renderer: Renderer,
    _uiContainer: HTMLElement
  ) {
    this.canvas = canvas;
    this.engine = engine;
    this.renderer = renderer;
    this.hoverCell = null;
    this.selectedCell = null;
    this.lastPlayer = 1;

    this.topBar = document.getElementById('top-bar')!;
    this.turnText = document.getElementById('turn-text')!;
    this.scoreP1 = document.getElementById('score-p1')!;
    this.scoreP2 = document.getElementById('score-p2')!;
    this.victoryOverlay = document.getElementById('victory-overlay')!;
    this.victoryTitle = document.getElementById('victory-title')!;
    this.victoryScoreP1 = document.getElementById('victory-score-p1')!;
    this.victoryScoreP2 = document.getElementById('victory-score-p2')!;
    this.victoryBarP1 = document.getElementById('victory-bar-p1')!;
    this.victoryBarP2 = document.getElementById('victory-bar-p2')!;
    this.restartBtn = document.getElementById('restart-btn')!;
    this.skillButtons = document.querySelectorAll('.skill-btn');

    this.updateUI();
  }

  bindEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
    this.canvas.addEventListener('click', (e) => this.handleClick(e));

    this.skillButtons.forEach(btn => {
      btn.addEventListener('click', (e) => this.handleSkillClick(e));
    });

    this.restartBtn.addEventListener('click', () => this.handleRestart());

    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();
  }

  private handleMouseMove(e: MouseEvent): void {
    const cell = this.renderer.pixelToCell(e.clientX, e.clientY);
    if (cell) {
      this.hoverCell = cell;
      this.canvas.style.cursor = 'pointer';
    } else {
      this.hoverCell = null;
      this.canvas.style.cursor = 'default';
    }
  }

  private handleMouseLeave(): void {
    this.hoverCell = null;
  }

  private handleClick(e: MouseEvent): void {
    if (this.engine.getStatus() !== 'playing') return;
    
    const cell = this.renderer.pixelToCell(e.clientX, e.clientY);
    if (!cell) return;

    const activeSkill = this.engine.getActiveSkill();
    const currentPlayer = this.engine.getCurrentPlayer();

    if (activeSkill && activeSkill.player === currentPlayer) {
      if (activeSkill.type === 'reinforce') {
        this.engine.useReinforceSkill(cell.x, cell.y);
      } else if (activeSkill.type === 'fuse') {
        this.engine.useFuseSkill(cell.x, cell.y);
      }
    } else {
      this.engine.placeStone(cell.x, cell.y);
    }
  }

  private handleSkillClick(e: Event): void {
    const btn = e.currentTarget as HTMLButtonElement;
    const player = parseInt(btn.dataset.player!) as Player;
    const skill = btn.dataset.skill as 'reinforce' | 'fuse';
    const currentPlayer = this.engine.getCurrentPlayer();

    if (player !== currentPlayer) return;
    if (this.engine.getStatus() !== 'playing') return;

    const skills = this.engine.getSkills(player);
    if (skills[skill] <= 0) return;

    const currentActive = this.engine.getActiveSkill();
    if (currentActive && currentActive.type === skill && currentActive.player === player) {
      this.engine.setActiveSkill(null);
    } else {
      this.engine.setActiveSkill({ type: skill, player });
    }
  }

  private handleRestart(): void {
    this.engine.resetGame();
    this.hideVictoryModal();
    this.selectedCell = null;
  }

  private handleResize(): void {
    const boardWrapper = document.getElementById('board-wrapper')!;
    const containerWidth = Math.min(window.innerWidth - 40, 600);
    const baseSize = this.renderer.getBoardPixelSize();
    const scale = Math.min(1, containerWidth / baseSize);
    
    if (window.innerWidth < 768) {
      this.canvas.style.transform = `scale(${scale})`;
      this.canvas.style.transformOrigin = 'center center';
      boardWrapper.style.width = `${baseSize * scale}px`;
      boardWrapper.style.height = `${baseSize * scale}px`;
      this.renderer.setScale(scale);
    } else {
      this.canvas.style.transform = '';
      boardWrapper.style.width = '';
      boardWrapper.style.height = '';
      this.renderer.setScale(1);
    }
  }

  updateUI(): void {
    const currentPlayer = this.engine.getCurrentPlayer();
    const score = this.engine.getScore();

    this.scoreP1.textContent = score.player1.toString();
    this.scoreP2.textContent = score.player2.toString();

    this.turnText.textContent = `${PLAYER_NAMES[currentPlayer]}回合`;
    
    if (currentPlayer !== this.lastPlayer) {
      this.lastPlayer = currentPlayer;
    }

    this.topBar.style.backgroundColor = currentPlayer === 1 
      ? 'rgba(74, 144, 217, 0.2)' 
      : 'rgba(231, 76, 60, 0.2)';
    this.turnText.style.color = PLAYER_COLORS[currentPlayer];

    this.updateSkillButtons();
  }

  private updateSkillButtons(): void {
    const currentPlayer = this.engine.getCurrentPlayer();
    const activeSkill = this.engine.getActiveSkill();

    for (let p = 1; p <= 2; p++) {
      const player = p as Player;
      const skills = this.engine.getSkills(player);
      const isCurrentPlayer = player === currentPlayer;

      const reinforceBtn = document.getElementById(`btn-reinforce-p${p}`)! as HTMLButtonElement;
      const fuseBtn = document.getElementById(`btn-fuse-p${p}`)! as HTMLButtonElement;
      const reinforceCount = document.getElementById(`reinforce-count-p${p}`)!;
      const fuseCount = document.getElementById(`fuse-count-p${p}`)!;

      reinforceCount.textContent = skills.reinforce.toString();
      fuseCount.textContent = skills.fuse.toString();

      reinforceBtn.disabled = !isCurrentPlayer || skills.reinforce <= 0 || this.engine.getStatus() !== 'playing';
      fuseBtn.disabled = !isCurrentPlayer || skills.fuse <= 0 || this.engine.getStatus() !== 'playing';

      reinforceBtn.classList.toggle('active', 
        activeSkill?.type === 'reinforce' && activeSkill?.player === player
      );
      fuseBtn.classList.toggle('active', 
        activeSkill?.type === 'fuse' && activeSkill?.player === player
      );
    }
  }

  showVictoryModal(winner: Player | null, scores: { player1: number; player2: number }): void {
    if (winner === null) {
      this.victoryTitle.textContent = '平局！';
      this.victoryTitle.style.color = '#2C3E50';
    } else {
      this.victoryTitle.textContent = `${PLAYER_NAMES[winner]}获胜！`;
      this.victoryTitle.style.color = PLAYER_COLORS[winner];
    }

    this.victoryScoreP1.textContent = scores.player1.toString();
    this.victoryScoreP2.textContent = scores.player2.toString();

    const total = scores.player1 + scores.player2;
    const p1Percent = total > 0 ? (scores.player1 / total) * 100 : 50;
    const p2Percent = total > 0 ? (scores.player2 / total) * 100 : 50;

    setTimeout(() => {
      this.victoryBarP1.style.width = `${p1Percent}%`;
      this.victoryBarP2.style.width = `${p2Percent}%`;
    }, 100);

    this.victoryOverlay.classList.add('show');
  }

  hideVictoryModal(): void {
    this.victoryOverlay.classList.remove('show');
    this.victoryBarP1.style.width = '0%';
    this.victoryBarP2.style.width = '0%';
  }

  getHoverCell(): Position | null {
    return this.hoverCell;
  }

  getSelectedCell(): Position | null {
    return this.selectedCell;
  }
}
