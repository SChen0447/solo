import { FleetManager, createInitialFleets, SHIP_STATS, type Ship, type CommandMode } from './fleet';
import { BattleSystem, getHpColor } from './battle';
import { Renderer } from './renderer';

class Game {
  private canvas: HTMLCanvasElement;
  private fleet: FleetManager;
  private battle: BattleSystem;
  private renderer: Renderer;
  private commandMode: CommandMode = 'move';
  private selectedShip: Ship | null = null;
  private gameOver: boolean = false;
  private lastTime: number = 0;
  private animationId: number = 0;

  private dom = {
    shipInfo: document.getElementById('ship-info')!,
    playerScore: document.getElementById('player-score')!,
    enemyScore: document.getElementById('enemy-score')!,
    btnMove: document.getElementById('btn-move') as HTMLButtonElement,
    btnAttack: document.getElementById('btn-attack') as HTMLButtonElement,
    btnRetreat: document.getElementById('btn-retreat') as HTMLButtonElement,
    gameOverOverlay: document.getElementById('game-over-overlay')!,
    gameOverText: document.getElementById('game-over-text')!,
    restartBtn: document.getElementById('restart-btn') as HTMLButtonElement
  };

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.fleet = new FleetManager();
    this.battle = new BattleSystem();
    this.renderer = new Renderer(this.canvas);

    this.fleet.onShipAttack((attacker, target) => {
      this.battle.handleAttack(attacker, target);
    });

    this.init();
  }

  private init(): void {
    createInitialFleets(this.fleet);
    this.bindEvents();
    this.updateScore();
    this.updateShipInfo();
    this.startLoop();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('click', (e) => this.onCanvasClick(e));

    this.dom.btnMove.addEventListener('click', () => this.setCommandMode('move'));
    this.dom.btnAttack.addEventListener('click', () => this.setCommandMode('attack'));
    this.dom.btnRetreat.addEventListener('click', () => this.setCommandMode('retreat'));

    this.dom.restartBtn.addEventListener('click', () => this.restart());
  }

  private setCommandMode(mode: CommandMode): void {
    this.commandMode = mode;
    this.dom.btnMove.classList.toggle('active', mode === 'move');
    this.dom.btnAttack.classList.toggle('active', mode === 'attack');
    this.dom.btnRetreat.classList.toggle('active', mode === 'retreat');

    if (mode === 'retreat' && this.selectedShip) {
      this.selectedShip.setRetreat();
    }
  }

  private onCanvasClick(e: MouseEvent): void {
    if (this.gameOver) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clickedShip = this.fleet.getShipAt(x, y);

    if (clickedShip && clickedShip.side === 'player') {
      this.fleet.clearSelection();
      clickedShip.isSelected = true;
      this.selectedShip = clickedShip;
      this.updateShipInfo();
      return;
    }

    if (!this.selectedShip) return;

    if (this.commandMode === 'attack' && clickedShip && clickedShip.side === 'enemy') {
      this.selectedShip.setAttackTarget(clickedShip);
    } else if (this.commandMode === 'move') {
      this.selectedShip.setMoveTarget(x, y);
    } else if (this.commandMode === 'retreat') {
      this.selectedShip.setRetreat();
    }
  }

  private startLoop(): void {
    this.lastTime = performance.now();
    const loop = (time: number) => {
      const deltaTime = time - this.lastTime;
      this.lastTime = time;
      this.update(deltaTime, time);
      this.render(time);
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  private update(deltaTime: number, currentTime: number): void {
    if (this.gameOver) return;

    this.fleet.updateAll(deltaTime, currentTime);
    this.battle.detectCollisions(this.fleet.ships);
    this.fleet.removeDeadShips();
    this.battle.update(currentTime);
    this.updateScore();
    this.updateShipInfo();
    this.checkGameOver();
  }

  private render(currentTime: number): void {
    const shakeOffset = this.battle.getShakeOffset();
    this.renderer.render(
      this.fleet.ships,
      this.battle.particles,
      this.battle.lasers,
      shakeOffset,
      currentTime
    );
  }

  private updateScore(): void {
    const player = this.fleet.getFleetScore('player');
    const enemy = this.fleet.getFleetScore('enemy');
    this.dom.playerScore.textContent = `玩家: ${player.count} 艘 (战力 ${player.power})`;
    this.dom.enemyScore.textContent = `敌方: ${enemy.count} 艘 (战力 ${enemy.power})`;
  }

  private updateShipInfo(): void {
    const ship = this.selectedShip;
    if (!ship || !ship.isAlive) {
      this.dom.shipInfo.innerHTML = '<div class="status-row"><span class="status-label">未选中</span></div>';
      return;
    }

    const stats = SHIP_STATS[ship.type];
    const hpRatio = ship.hp / ship.maxHp;
    const hpColor = getHpColor(hpRatio);
    const hpPercent = Math.round(hpRatio * 100);

    this.dom.shipInfo.innerHTML = `
      <div class="status-row">
        <span class="status-label">类型</span>
        <span class="status-value">${stats.name}</span>
      </div>
      <div class="status-row">
        <span class="status-label">生命</span>
        <span class="status-value">${ship.hp}/${ship.maxHp}</span>
      </div>
      <div class="hp-bar-container">
        <div class="hp-bar-fill" style="width: ${hpPercent}%; background: ${hpColor};"></div>
      </div>
      <div class="status-row">
        <span class="status-label">攻击</span>
        <span class="status-value">${ship.damage}</span>
      </div>
      <div class="status-row">
        <span class="status-label">速度</span>
        <span class="status-value">${ship.speed}</span>
      </div>
      <div class="status-row">
        <span class="status-label">射程</span>
        <span class="status-value">${ship.attackRange}</span>
      </div>
    `;
  }

  private checkGameOver(): void {
    const playerAlive = this.fleet.getShipsBySide('player').length;
    const enemyAlive = this.fleet.getShipsBySide('enemy').length;

    if (playerAlive === 0 || enemyAlive === 0) {
      this.gameOver = true;
      const win = enemyAlive === 0;
      this.dom.gameOverText.textContent = win ? '胜利！' : '失败！';
      this.dom.gameOverText.style.color = win ? '#66FCF1' : '#C3073F';
      this.dom.gameOverOverlay.classList.add('show');
    }
  }

  private restart(): void {
    cancelAnimationFrame(this.animationId);
    this.fleet.reset();
    this.battle.reset();
    this.selectedShip = null;
    this.gameOver = false;
    this.commandMode = 'move';
    this.dom.gameOverOverlay.classList.remove('show');
    this.dom.btnMove.classList.add('active');
    this.dom.btnAttack.classList.remove('active');
    this.dom.btnRetreat.classList.remove('active');
    createInitialFleets(this.fleet);
    this.fleet.onShipAttack((attacker, target) => {
      this.battle.handleAttack(attacker, target);
    });
    this.updateScore();
    this.updateShipInfo();
    this.startLoop();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
