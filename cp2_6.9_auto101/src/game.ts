import {
  Board,
  Move,
  BLACK,
  WHITE,
  EMPTY,
  createBoard,
  placeStone,
  removeStone,
  checkWin,
  isBoardFull
} from './board';
import { findBestMove } from './ai';
import { Renderer } from './renderer';

type GameState = 'playing' | 'black_win' | 'white_win' | 'draw' | 'replaying';

const MAX_UNDO = 3;
const REPLAY_INTERVAL = 800;

export class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private board: Board;
  private currentPlayer: 1 | 2;
  private state: GameState;
  private history: Move[];
  private undoCount: number;
  private rafId: number | null = null;
  private replayTimer: number | null = null;
  private replayIndex: number = 0;
  private isAiThinking: boolean = false;

  private resultModal: HTMLElement;
  private resultText: HTMLElement;
  private replayBtn: HTMLElement;
  private restartBtnModal: HTMLElement;
  private restartBtn: HTMLElement;
  private undoBtn: HTMLElement;
  private undoCountEl: HTMLElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.board = createBoard();
    this.currentPlayer = BLACK;
    this.state = 'playing';
    this.history = [];
    this.undoCount = MAX_UNDO;

    this.resultModal = document.getElementById('result-modal')!;
    this.resultText = document.getElementById('result-text')!;
    this.replayBtn = document.getElementById('replay-btn')!;
    this.restartBtnModal = document.getElementById('restart-btn-modal')!;
    this.restartBtn = document.getElementById('restart-btn')!;
    this.undoBtn = document.getElementById('undo-btn')!;
    this.undoCountEl = document.getElementById('undo-count')!;

    this.bindEvents();
    this.updateUndoCount();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => this.renderer.setHover(null));

    this.restartBtn.addEventListener('click', () => this.reset());
    this.restartBtnModal.addEventListener('click', () => this.reset());
    this.undoBtn.addEventListener('click', () => this.undo());
    this.replayBtn.addEventListener('click', () => this.startReplay());

    window.addEventListener('resize', () => {
      this.renderer.resize();
    });
  }

  private handleClick(e: MouseEvent): void {
    if (this.state !== 'playing') return;
    if (this.currentPlayer !== BLACK) return;
    if (this.isAiThinking) return;

    const pos = this.renderer.screenToGrid(e.clientX, e.clientY);
    if (!pos) return;
    if (this.board[pos.y][pos.x] !== EMPTY) return;

    this.makeMove(pos.x, pos.y, BLACK);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.state !== 'playing' || this.currentPlayer !== BLACK || this.isAiThinking) {
      this.renderer.setHover(null);
      return;
    }
    const pos = this.renderer.screenToGrid(e.clientX, e.clientY);
    if (pos && this.board[pos.y][pos.x] === EMPTY) {
      this.renderer.setHover(pos, this.currentPlayer);
    } else {
      this.renderer.setHover(null);
    }
  }

  private makeMove(x: number, y: number, player: 1 | 2): void {
    placeStone(this.board, x, y, player);
    this.history.push({ x, y, player, timestamp: Date.now() });
    this.renderer.addAnimatingStone(x, y, player);

    if (checkWin(this.board, x, y, player)) {
      this.state = player === BLACK ? 'black_win' : 'white_win';
      this.showResult();
      return;
    }

    if (isBoardFull(this.board)) {
      this.state = 'draw';
      this.showResult();
      return;
    }

    this.currentPlayer = this.currentPlayer === BLACK ? WHITE : BLACK;
    this.undoCount = MAX_UNDO;
    this.updateUndoCount();

    if (this.currentPlayer === WHITE && this.state === 'playing') {
      this.isAiThinking = true;
      this.renderer.setHover(null);
      setTimeout(() => {
        const move = findBestMove(this.board);
        this.isAiThinking = false;
        if (this.state === 'playing') {
          this.makeMove(move.x, move.y, WHITE);
        }
      }, 50);
    }
  }

  undo(): void {
    if (this.state !== 'playing') return;
    if (this.isAiThinking) return;
    if (this.undoCount <= 0) return;
    if (this.history.length === 0) return;

    if (this.currentPlayer === BLACK && this.history.length >= 2) {
      const aiMove = this.history.pop()!;
      removeStone(this.board, aiMove.x, aiMove.y);
      const playerMove = this.history.pop()!;
      removeStone(this.board, playerMove.x, playerMove.y);
      this.undoCount--;
      this.renderer.clearAnimations();
    } else if (this.currentPlayer === WHITE && this.history.length >= 1) {
      const playerMove = this.history.pop()!;
      removeStone(this.board, playerMove.x, playerMove.y);
      this.currentPlayer = BLACK;
      this.undoCount--;
      this.renderer.clearAnimations();
    }

    this.updateUndoCount();
  }

  reset(): void {
    if (this.replayTimer !== null) {
      clearInterval(this.replayTimer);
      this.replayTimer = null;
    }

    this.board = createBoard();
    this.currentPlayer = BLACK;
    this.state = 'playing';
    this.history = [];
    this.undoCount = MAX_UNDO;
    this.isAiThinking = false;
    this.replayIndex = 0;

    this.renderer.clearAnimations();
    this.renderer.clearHighlights();
    this.renderer.setHover(null);

    this.hideResult();
    this.updateUndoCount();
  }

  startReplay(): void {
    if (this.history.length === 0) return;

    if (this.replayTimer !== null) {
      clearInterval(this.replayTimer);
    }

    this.hideResult();
    this.state = 'replaying';
    this.board = createBoard();
    this.renderer.clearAnimations();
    this.renderer.clearHighlights();
    this.replayIndex = 0;

    this.replayTimer = window.setInterval(() => {
      if (this.replayIndex >= this.history.length) {
        if (this.replayTimer !== null) {
          clearInterval(this.replayTimer);
          this.replayTimer = null;
        }
        this.state = this.history.length > 0
          ? (this.history[this.history.length - 1].player === BLACK ? 'black_win' : 'white_win')
          : 'playing';
        this.showResult();
        return;
      }

      const move = this.history[this.replayIndex];
      placeStone(this.board, move.x, move.y, move.player);
      this.renderer.addAnimatingStone(move.x, move.y, move.player);
      this.renderer.addHighlight(move.x, move.y);
      this.replayIndex++;
    }, REPLAY_INTERVAL);
  }

  private showResult(): void {
    let text = '';
    if (this.state === 'black_win') text = '黑棋胜！';
    else if (this.state === 'white_win') text = '白棋胜！';
    else if (this.state === 'draw') text = '平局！';

    this.resultText.textContent = text;
    this.resultModal.style.display = 'flex';
  }

  private hideResult(): void {
    this.resultModal.style.display = 'none';
  }

  private updateUndoCount(): void {
    this.undoCountEl.textContent = `剩余悔棋次数：${this.undoCount}`;
    (this.undoBtn as HTMLButtonElement).disabled = this.undoCount <= 0 || this.state !== 'playing';
  }

  start(): void {
    const loop = () => {
      this.renderer.render(this.board);
      this.rafId = requestAnimationFrame(loop);
    };
    loop();
  }

  destroy(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    if (this.replayTimer !== null) {
      clearInterval(this.replayTimer);
    }
  }
}
