import { Board, HexCoord, TERRAIN_MOVE_COST } from './board';
import { Card, CardDeck, CardHistory, CardType } from './cards';
import { Renderer, RenderState } from './renderer';
import { SimpleAI, AIDecision } from './ai';

const MAX_AP = 3;
const HAND_LIMIT = 5;
const INITIAL_HAND = 5;
const BASE_STAY_TURNS = 1;

export class Game {
  private board: Board;
  private renderer: Renderer;
  private deck: CardDeck;
  private cardHistory: CardHistory;
  private ai: SimpleAI;

  private player1Hand: Card[] = [];
  private player2Hand: Card[] = [];
  private player1Position: HexCoord;
  private player2Position: HexCoord;
  private player1AP: number = MAX_AP;
  private player2AP: number = MAX_AP;
  private currentPlayer: number = 1;
  private turn: number = 1;

  private selectedHex: HexCoord | null = null;
  private hoveredCard: Card | null = null;
  private selectedCard: Card | null = null;
  private validTargets: HexCoord[] = [];

  private winner: number | null = null;
  private winAnimationStart: number = 0;
  private baseStayedTurns = { player1: 0, player2: 0 };

  private lastTime: number = 0;
  private aiThinking: boolean = false;
  private aiDecisionTimer: number | null = null;

  constructor() {
    this.board = new Board();
    this.deck = new CardDeck();
    this.cardHistory = new CardHistory();
    this.player1Position = this.board.getPlayer1Base();
    this.player2Position = this.board.getPlayer2Base();
    this.ai = new SimpleAI(this.board, 2);

    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.renderer = new Renderer(canvas, this.board);

    this.dealInitialHands();
    this.bindEvents();
    this.start();
  }

  private dealInitialHands(): void {
    for (let i = 0; i < INITIAL_HAND; i++) {
      const c1 = this.deck.draw();
      if (c1) this.player1Hand.push(c1);
      const c2 = this.deck.draw();
      if (c2) this.player2Hand.push(c2);
    }
  }

  private bindEvents(): void {
    const canvas = this.renderer.getCanvas();

    canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    canvas.addEventListener('click', (e) => this.handleClick(e));

    document.getElementById('turn-text')!.textContent = `第 ${this.turn} 回合`;
    this.updateTurnIndicator();
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.winner !== null) return;
    if (this.currentPlayer !== 1) return;

    const rect = this.renderer.getCanvas().getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const card = this.renderer.getCardAtPosition(x, y, this.player1Hand);
    this.hoveredCard = card;
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.renderer.getCanvas().getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.winner !== null) {
      if (this.renderer.isClickOnRestartButton(x, y)) {
        this.restart();
      }
      return;
    }

    if (this.currentPlayer !== 1) return;

    if (this.selectedCard) {
      const hex = this.renderer.screenToHex(x, y);
      if (hex) {
        if (this.isValidTarget(hex)) {
          this.playCard(this.selectedCard, hex);
          this.selectedCard = null;
          this.selectedHex = null;
          this.validTargets = [];
          this.checkWinCondition();
        }
      } else {
        this.selectedCard = null;
        this.validTargets = [];
      }
      return;
    }

    const card = this.renderer.getCardAtPosition(x, y, this.player1Hand);
    if (card) {
      if (card.cost <= this.player1AP) {
        this.selectedCard = card;
        this.computeValidTargets(card);
      }
      return;
    }

    const hex = this.renderer.screenToHex(x, y);
    if (hex) {
      this.handleHexClick(hex);
    }
  }

  private handleHexClick(hex: HexCoord): void {
    const cell = this.board.getCell(hex);
    if (!cell) return;

    const currentPos = this.currentPlayer === 1 ? this.player1Position : this.player2Position;

    if (hex.q === currentPos.q && hex.r === currentPos.r) {
      this.selectedHex = hex;
      this.validTargets = this.getValidMoveTargets(currentPos);
      return;
    }

    if (this.selectedHex) {
      if (this.selectedHex.q === currentPos.q && this.selectedHex.r === currentPos.r) {
        if (this.isValidMoveTarget(currentPos, hex)) {
          this.moveBase(hex);
          this.selectedHex = null;
          this.validTargets = [];
          this.checkWinCondition();
        }
      }
    } else {
      this.selectedHex = hex;
      this.validTargets = [];
    }
  }

  private getValidMoveTargets(pos: HexCoord): HexCoord[] {
    const neighbors = this.board.getNeighbors(pos);
    return neighbors
      .filter(n => {
        const cost = TERRAIN_MOVE_COST[n.terrain];
        const ap = this.currentPlayer === 1 ? this.player1AP : this.player2AP;
        return cost > 0 && cost <= ap;
      })
      .map(n => n.coord);
  }

  private isValidMoveTarget(from: HexCoord, to: HexCoord): boolean {
    const targets = this.getValidMoveTargets(from);
    return targets.some(t => t.q === to.q && t.r === to.r);
  }

  private isValidTarget(hex: HexCoord): boolean {
    return this.validTargets.some(t => t.q === hex.q && t.r === hex.r);
  }

  private computeValidTargets(card: Card): void {
    if (!card.requiresTarget) {
      this.validTargets = [];
      return;
    }

    if (card.type === CardType.RESOURCE) {
      this.validTargets = [];
      return;
    }

    const cells = this.board.getAllCells();
    this.validTargets = cells
      .filter(c => !c.isBasePlayer1 && !c.isBasePlayer2)
      .map(c => c.coord);
  }

  private playCard(card: Card, target?: HexCoord): void {
    if (card.type === CardType.RESOURCE) {
      this.removeCardFromHand(card);
      if (this.currentPlayer === 1) {
        this.player1AP = Math.min(this.player1AP + 2, MAX_AP + 2);
      } else {
        this.player2AP = Math.min(this.player2AP + 2, MAX_AP + 2);
      }
      this.cardHistory.addRecord({
        playerId: this.currentPlayer,
        card,
        timestamp: performance.now(),
      });
      this.deck.discardCard(card);
      return;
    }

    if (card.cost > (this.currentPlayer === 1 ? this.player1AP : this.player2AP)) return;

    const currentPos = this.currentPlayer === 1 ? this.player1Position : this.player2Position;
    const result = card.execute(this.board, target, currentPos);

    if (result.success) {
      this.removeCardFromHand(card);
      if (this.currentPlayer === 1) {
        this.player1AP -= card.cost;
      } else {
        this.player2AP -= card.cost;
      }

      this.cardHistory.addRecord({
        playerId: this.currentPlayer,
        card,
        target,
        timestamp: performance.now(),
      });
      this.deck.discardCard(card);

      if (result.affectedCells.length > 0) {
        const firstCoord = result.affectedCells[0];
        const { x, y } = this.board.hexToPixel(firstCoord, this.renderer.getHexSize(), this.renderer.getOffsetX(), this.renderer.getOffsetY());
        this.renderer.addParticle(x, y, 'rgb(255, 217, 61)');
      }
    }
  }

  private removeCardFromHand(card: Card): void {
    if (this.currentPlayer === 1) {
      this.player1Hand = this.player1Hand.filter(c => c.id !== card.id);
    } else {
      this.player2Hand = this.player2Hand.filter(c => c.id !== card.id);
    }
  }

  private moveBase(to: HexCoord): void {
    const cell = this.board.getCell(to);
    if (!cell) return;
    const cost = TERRAIN_MOVE_COST[cell.terrain];
    if (cost <= 0) return;

    if (this.currentPlayer === 1) {
      if (this.player1AP < cost) return;
      this.player1AP -= cost;
      this.player1Position = to;
      const { x, y } = this.board.hexToPixel(to, this.renderer.getHexSize(), this.renderer.getOffsetX(), this.renderer.getOffsetY());
      this.renderer.addParticle(x, y, 'rgb(77, 150, 255)');
    } else {
      if (this.player2AP < cost) return;
      this.player2AP -= cost;
      this.player2Position = to;
      const { x, y } = this.board.hexToPixel(to, this.renderer.getHexSize(), this.renderer.getOffsetX(), this.renderer.getOffsetY());
      this.renderer.addParticle(x, y, 'rgb(255, 107, 107)');
    }
  }

  private checkWinCondition(): void {
    const p1Base = this.board.getPlayer1Base();
    const p2Base = this.board.getPlayer2Base();

    if (this.player1Position.q === p2Base.q && this.player1Position.r === p2Base.r) {
      this.baseStayedTurns.player1++;
      if (this.baseStayedTurns.player1 >= BASE_STAY_TURNS) {
        this.winner = 1;
        this.winAnimationStart = performance.now();
      }
    } else {
      this.baseStayedTurns.player1 = 0;
    }

    if (this.player2Position.q === p1Base.q && this.player2Position.r === p1Base.r) {
      this.baseStayedTurns.player2++;
      if (this.baseStayedTurns.player2 >= BASE_STAY_TURNS) {
        this.winner = 2;
        this.winAnimationStart = performance.now();
      }
    } else {
      this.baseStayedTurns.player2 = 0;
    }
  }

  public endTurn(): void {
    if (this.currentPlayer === 1) {
      this.baseStayedTurns.player1 = 0;
      const p2Base = this.board.getPlayer2Base();
      if (this.player1Position.q === p2Base.q && this.player1Position.r === p2Base.r) {
        this.baseStayedTurns.player1 = 1;
      }

      this.currentPlayer = 2;
      this.player2AP = MAX_AP;
      while (this.player2Hand.length < HAND_LIMIT) {
        const c = this.deck.draw();
        if (!c) break;
        this.player2Hand.push(c);
      }
      this.updateTurnIndicator();
      this.scheduleAITurn();
    } else {
      this.baseStayedTurns.player2 = 0;
      const p1Base = this.board.getPlayer1Base();
      if (this.player2Position.q === p1Base.q && this.player2Position.r === p1Base.r) {
        this.baseStayedTurns.player2 = 1;
      }

      this.currentPlayer = 1;
      this.turn++;
      this.player1AP = MAX_AP;
      while (this.player1Hand.length < HAND_LIMIT) {
        const c = this.deck.draw();
        if (!c) break;
        this.player1Hand.push(c);
      }
      document.getElementById('turn-text')!.textContent = `第 ${this.turn} 回合`;
      this.updateTurnIndicator();
    }

    this.selectedCard = null;
    this.selectedHex = null;
    this.validTargets = [];
    this.checkWinCondition();
  }

  private scheduleAITurn(): void {
    this.aiThinking = true;
    this.aiDecisionTimer = window.setTimeout(() => this.executeAITurn(), 800);
  }

  private executeAITurn(): void {
    if (this.winner !== null) {
      this.aiThinking = false;
      return;
    }

    const decision = this.ai.decide(this.player2Hand, this.player2AP, this.player2Position);
    this.processAIDecision(decision);

    if (this.player2AP <= 0 || this.player2Hand.length === 0) {
      this.aiThinking = false;
      setTimeout(() => this.endTurn(), 600);
      return;
    }

    const nextDecision = this.ai.decide(this.player2Hand, this.player2AP, this.player2Position);
    if (nextDecision.type === 'end_turn') {
      this.aiThinking = false;
      setTimeout(() => this.endTurn(), 600);
    } else {
      this.aiDecisionTimer = window.setTimeout(() => this.executeAITurn(), 1000);
    }
  }

  private processAIDecision(decision: AIDecision): void {
    if (decision.type === 'use_card' && decision.card) {
      this.playCard(decision.card, decision.target);
      this.checkWinCondition();
    } else if (decision.type === 'move_base' && decision.moveTo) {
      this.moveBase(decision.moveTo);
      this.checkWinCondition();
    }
  }

  private updateTurnIndicator(): void {
    const text = document.getElementById('current-player-text');
    if (text) {
      text.textContent = this.currentPlayer === 1 ? '玩家 1 行动' : '玩家 2 (AI) 行动';
      text.style.color = this.currentPlayer === 1 ? '#4d96ff' : '#ff6b6b';
    }
  }

  private restart(): void {
    if (this.aiDecisionTimer !== null) {
      clearTimeout(this.aiDecisionTimer);
      this.aiDecisionTimer = null;
    }

    this.board.reset();
    this.deck.reset();
    this.cardHistory.reset();
    this.player1Hand = [];
    this.player2Hand = [];
    this.player1Position = this.board.getPlayer1Base();
    this.player2Position = this.board.getPlayer2Base();
    this.player1AP = MAX_AP;
    this.player2AP = MAX_AP;
    this.currentPlayer = 1;
    this.turn = 1;
    this.selectedHex = null;
    this.hoveredCard = null;
    this.selectedCard = null;
    this.validTargets = [];
    this.winner = null;
    this.winAnimationStart = 0;
    this.baseStayedTurns = { player1: 0, player2: 0 };
    this.aiThinking = false;

    this.dealInitialHands();
    document.getElementById('turn-text')!.textContent = `第 ${this.turn} 回合`;
    this.updateTurnIndicator();
  }

  private getRenderState(): RenderState {
    return {
      selectedHex: this.selectedHex,
      hoveredCard: this.hoveredCard,
      selectedCard: this.selectedCard,
      player1Position: this.player1Position,
      player2Position: this.player2Position,
      player1AP: this.player1AP,
      player2AP: this.player2AP,
      maxAP: MAX_AP,
      currentPlayer: this.currentPlayer,
      turn: this.turn,
      player1Hand: this.player1Hand,
      player2Hand: this.player2Hand,
      winner: this.winner,
      winAnimationStart: this.winAnimationStart,
      validTargets: this.validTargets,
      baseStayedTurns: this.baseStayedTurns,
    };
  }

  private gameLoop = (now: number): void => {
    const delta = now - this.lastTime;
    this.lastTime = now;

    this.board.updateAnimations(now);

    if (this.currentPlayer !== 1 && !this.aiThinking && this.winner === null) {
      // AI turn scheduling is handled separately
    }

    if (this.currentPlayer === 1 && this.player1AP <= 0 && this.winner === null) {
      setTimeout(() => {
        if (this.currentPlayer === 1 && this.player1AP <= 0 && this.winner === null) {
          this.endTurn();
        }
      }, 500);
    }

    this.renderer.render(this.getRenderState(), now);
    requestAnimationFrame(this.gameLoop);
  };

  public start(): void {
    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop);
  }
}

new Game();
