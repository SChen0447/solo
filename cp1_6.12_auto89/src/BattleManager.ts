import { TurnPhase, Faction, SkillType, HEX_SIZE } from './UnitTypes';
import { GameBoard } from './GameBoard';
import { BattleRenderer } from './BattleRenderer';

export class BattleManager {
  private canvas: HTMLCanvasElement;
  private board: GameBoard;
  private renderer: BattleRenderer;
  private animFrameId = 0;
  private running = false;
  private lastFrameTime = 0;
  private targetFrameTime = 1000 / 60;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.board = new GameBoard();
    this.renderer = new BattleRenderer(canvas);
    this.setupInput();
    this.setupResize();
  }

  start(): void {
    this.board.init();
    this.running = true;
    this.lastFrameTime = performance.now();
    this.loop(this.lastFrameTime);
  }

  stop(): void {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  private loop = (timestamp: number): void => {
    if (!this.running) return;

    const elapsed = timestamp - this.lastFrameTime;
    if (elapsed >= this.targetFrameTime) {
      this.lastFrameTime = timestamp - (elapsed % this.targetFrameTime);

      const snapshot = this.board.getSnapshot();
      this.renderer.render(snapshot, timestamp);

      if (snapshot.gameOver) {
        this.renderer.renderGameOver(snapshot.winner!);
      }
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private setupInput(): void {
    const handler = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      let clientX: number, clientY: number;
      if ('touches' in e) {
        if (e.touches.length === 0) return;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      this.handleClick(clientX, clientY);
    };

    this.canvas.addEventListener('click', handler as EventListener);
    this.canvas.addEventListener('touchstart', handler as EventListener, { passive: false });
  }

  private setupResize(): void {
    window.addEventListener('resize', () => {
      this.renderer.resize();
      this.renderer.markFullDirty();
    });
  }

  private handleClick(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    const snapshot = this.board.getSnapshot();
    if (snapshot.gameOver) {
      this.board.init();
      this.renderer.markFullDirty();
      return;
    }

    const phaseBtn = this.renderer.getPhaseButtonRect(snapshot);
    if (phaseBtn && px >= phaseBtn.x && px <= phaseBtn.x + phaseBtn.w &&
        py >= phaseBtn.y && py <= phaseBtn.y + phaseBtn.h) {
      this.handlePhaseButton();
      return;
    }

    const skillBtns = this.renderer.getSkillButtonRects(snapshot);
    for (const btn of skillBtns) {
      if (px >= btn.x && px <= btn.x + btn.w && py >= btn.y && py <= btn.y + btn.h) {
        this.handleSkillButton(btn.skillType);
        return;
      }
    }

    const offset = this.renderer.getOffset();
    const hex = GameBoard.pixelToHex(px, py, HEX_SIZE, offset.x, offset.y);

    this.handleHexClick(hex.q, hex.r);
  }

  private handlePhaseButton(): void {
    const snapshot = this.board.getSnapshot();
    if (snapshot.phase === TurnPhase.Move) {
      this.board.advancePhase();
    } else if (snapshot.phase === TurnPhase.Attack) {
      this.board.advancePhase();
    } else if (snapshot.phase === TurnPhase.End) {
      this.board.endTurn();
    }
    this.renderer.markFullDirty();
  }

  private handleSkillButton(skillType: SkillType): void {
    const snapshot = this.board.getSnapshot();
    if (!snapshot.selectedShipId) return;
    if (snapshot.phase !== TurnPhase.Attack) return;

    const ship = this.board.getShipById(snapshot.selectedShipId);
    if (!ship || ship.faction !== Faction.Player) return;

    if (skillType === SkillType.EmergencyShield) {
      this.board.attackShip(ship.id, ship.id, skillType);
      this.renderer.markFullDirty();
    } else if (skillType === SkillType.Salvo) {
      if (snapshot.attackableTargets.length > 0) {
        this.board.selectShip(ship.id);
      }
    } else if (skillType === SkillType.EMP) {
      if (snapshot.attackableTargets.length > 0) {
        this.board.selectShip(ship.id);
      }
    }
  }

  private handleHexClick(q: number, r: number): void {
    const snapshot = this.board.getSnapshot();

    const clickedShip = this.board.getAllShips().find(
      s => s.hp > 0 && s.pos.q === q && s.pos.r === r
    );

    if (snapshot.phase === TurnPhase.Move) {
      if (clickedShip && clickedShip.faction === Faction.Player && !clickedShip.movedThisTurn) {
        this.board.selectShip(clickedShip.id);
        this.renderer.markFullDirty();
        return;
      }

      if (snapshot.selectedShipId && snapshot.movableHexes.some(h => h.q === q && h.r === r)) {
        const ship = this.board.getShipById(snapshot.selectedShipId)!;
        const oldPos = ship.pos;
        const moved = this.board.moveShip(snapshot.selectedShipId, { q, r });
        if (moved) {
          const offset = this.renderer.getOffset();
          const fromPx = GameBoard.hexToPixel(oldPos.q, oldPos.r, HEX_SIZE, offset.x, offset.y);
          const toPx = GameBoard.hexToPixel(q, r, HEX_SIZE, offset.x, offset.y);
          this.renderer.addTrailAnim([
            { x: fromPx.x, y: fromPx.y },
            { x: toPx.x, y: toPx.y },
          ]);
          this.renderer.markFullDirty();
        }
        return;
      }

      if (clickedShip && clickedShip.faction === Faction.Enemy) {
        this.board.selectShip(clickedShip.id);
        this.renderer.markFullDirty();
        return;
      }

      this.board.selectShip(null);
      this.renderer.markFullDirty();
    } else if (snapshot.phase === TurnPhase.Attack) {
      if (clickedShip && clickedShip.faction === Faction.Player && !clickedShip.attackedThisTurn) {
        this.board.selectShip(clickedShip.id);
        this.renderer.markFullDirty();
        return;
      }

      if (snapshot.selectedShipId && clickedShip && snapshot.attackableTargets.includes(clickedShip.id)) {
        const attacker = this.board.getShipById(snapshot.selectedShipId)!;
        const offset = this.renderer.getOffset();
        const fromPx = GameBoard.hexToPixel(attacker.pos.q, attacker.pos.r, HEX_SIZE, offset.x, offset.y);
        const toPx = GameBoard.hexToPixel(clickedShip.pos.q, clickedShip.pos.r, HEX_SIZE, offset.x, offset.y);

        const pendingSkill = this.getPendingSkill(attacker.id);
        const result = this.board.attackShip(attacker.id, clickedShip.id, pendingSkill);
        if (result) {
          this.renderer.addBeamAnim(fromPx.x, fromPx.y, toPx.x, toPx.y);
          this.renderer.markFullDirty();
        }
        return;
      }

      if (clickedShip && clickedShip.faction === Faction.Enemy) {
        this.board.selectShip(clickedShip.id);
        this.renderer.markFullDirty();
        return;
      }

      this.board.selectShip(null);
      this.renderer.markFullDirty();
    }
  }

  private pendingSkillMap = new Map<string, SkillType>();

  private getPendingSkill(shipId: string): SkillType | null {
    return this.pendingSkillMap.get(shipId) || null;
  }

  setPendingSkill(shipId: string, skill: SkillType | null): void {
    if (skill) {
      this.pendingSkillMap.set(shipId, skill);
    } else {
      this.pendingSkillMap.delete(shipId);
    }
  }
}
