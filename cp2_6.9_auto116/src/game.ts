import { Maze, Direction, Position } from './maze';
import { Player, Item, generateRandomItem } from './player';
import { Enemy } from './enemy';
import { UI, Message } from './ui';

const MAX_CYCLES = 10;
const MESSAGE_DURATION = 2.0;

class Game {
  private canvas: HTMLCanvasElement;
  private ui: UI;
  private maze: Maze;
  private player: Player;
  private enemies: Enemy[];
  private droppedItems: { pos: Position; item: Item }[];
  private messages: Message[];

  private cycle: number;
  private totalTime: number;
  private kills: number;
  private itemsPicked: number;
  private showResult: boolean;

  private lastTime: number;
  private running: boolean;

  constructor(canvasId: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) throw new Error(`Canvas ${canvasId} not found`);
    this.canvas = canvas;
    this.ui = new UI(this.canvas);

    this.maze = new Maze();
    this.player = new Player();
    this.enemies = [];
    this.droppedItems = [];
    this.messages = [];

    this.cycle = 0;
    this.totalTime = 0;
    this.kills = 0;
    this.itemsPicked = 0;
    this.showResult = false;

    this.lastTime = 0;
    this.running = false;

    this.setupInput();
    this.newCycle();
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('resize', () => this.ui.resize());
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.showResult) return;

    const key = e.key.toLowerCase();
    let dir: Direction | null = null;

    if (key === 'w' || key === 'arrowup') dir = 'up';
    else if (key === 's' || key === 'arrowdown') dir = 'down';
    else if (key === 'a' || key === 'arrowleft') dir = 'left';
    else if (key === 'd' || key === 'arrowright') dir = 'right';

    if (dir) {
      e.preventDefault();
      this.player.tryMove(dir, (x, y) => this.maze.isCorridor(x, y));
      return;
    }

    if (key === ' ' || key === 'space') {
      e.preventDefault();
      if (this.player.tryAttack()) {
      }
    }
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (this.showResult) {
      if (this.ui.isPointInRestartButton(mx, my)) {
        this.restart();
      }
      return;
    }

    const slot = this.ui.getInventorySlotAt(mx, my);
    if (slot >= 0) {
      const msg = this.player.useItem(slot);
      if (msg) {
        this.addMessage(msg);
      }
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.showResult) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    this.ui.isButtonHovered = this.ui.isPointInRestartButton(mx, my);
  }

  private addMessage(text: string): void {
    this.messages.push({
      text,
      timer: MESSAGE_DURATION,
      opacity: 1
    });
  }

  private newCycle(): void {
    this.cycle++;
    this.maze.generate();
    this.player.resetForNewCycle();
    this.droppedItems = [];

    const enemyCount = 3 + Math.floor(Math.random() * 3);
    const positions = this.maze.getRandomCorridors(enemyCount);
    this.enemies = positions.map(p => new Enemy(p.x, p.y));

    this.addMessage(`第 ${this.cycle} 周期开始！`);
  }

  private restart(): void {
    this.player.fullReset();
    this.cycle = 0;
    this.totalTime = 0;
    this.kills = 0;
    this.itemsPicked = 0;
    this.messages = [];
    this.showResult = false;
    this.newCycle();
  }

  private updateMessages(dt: number): void {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      this.messages[i].timer -= dt;
      if (this.messages[i].timer < 0.5) {
        this.messages[i].opacity = Math.max(0, this.messages[i].timer / 0.5);
      }
      if (this.messages[i].timer <= 0) {
        this.messages.splice(i, 1);
      }
    }
  }

  private checkEnemyAttacks(): void {
    for (const enemy of this.enemies) {
      const didAttack = enemy.update(
        1 / 60,
        this.player.pos,
        (x, y) => this.maze.isCorridor(x, y)
      );
      if (didAttack && !this.player.isMoving) {
        const isDead = this.player.takeDamage(1);
        this.addMessage('受到敌人攻击！');
        if (isDead) {
          this.gameOver();
        }
      }
    }
  }

  private checkPlayerAttack(): void {
    const didHit = this.player.update(1 / 60);
    if (didHit) {
      const atkPos = this.player.getAttackPosition();
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        if (enemy.pos.x === atkPos.x && enemy.pos.y === atkPos.y) {
          this.enemies.splice(i, 1);
          this.kills++;
          const item = generateRandomItem();
          this.droppedItems.push({ pos: { ...atkPos }, item });
          this.addMessage('击杀敌人！掉落道具');
          break;
        }
      }
    }
  }

  private checkItemPickup(): void {
    for (let i = this.droppedItems.length - 1; i >= 0; i--) {
      const drop = this.droppedItems[i];
      if (drop.pos.x === this.player.pos.x && drop.pos.y === this.player.pos.y) {
        if (this.player.pickupItem(drop.item)) {
          this.droppedItems.splice(i, 1);
          this.itemsPicked++;
          const names: Record<string, string> = {
            health: '生命药水',
            attack: '攻击力提升',
            shield: '护盾'
          };
          this.addMessage(`拾取了 ${names[drop.item.type]}`);
        }
      }
    }
  }

  private checkExit(): boolean {
    return this.player.pos.x === this.maze.exit.x && this.player.pos.y === this.maze.exit.y;
  }

  private gameOver(): void {
    this.showResult = true;
  }

  private update(dt: number): void {
    if (this.showResult) return;

    this.totalTime += dt;
    this.updateMessages(dt);

    if (!this.player.isMoving && !this.player.isAttacking) {
      this.checkEnemyAttacks();
    } else {
      this.checkPlayerAttack();
    }

    if (!this.player.isMoving && !this.player.isAttacking) {
      this.checkItemPickup();

      if (this.checkExit()) {
        this.player.levelUp();
        this.addMessage(`通关！等级提升至 ${this.player.level}`);
        if (this.cycle >= MAX_CYCLES) {
          this.gameOver();
        } else {
          this.newCycle();
        }
      }
    }
  }

  private render(): void {
    this.ui.render(
      this.maze,
      this.player,
      this.enemies,
      this.droppedItems,
      Math.min(this.cycle, MAX_CYCLES),
      this.messages,
      this.showResult,
      this.totalTime,
      this.kills,
      this.itemsPicked
    );
  }

  private loop(timestamp: number): void {
    if (!this.running) return;

    if (!this.lastTime) this.lastTime = timestamp;
    const dt = Math.min(0.1, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  start(): void {
    this.running = true;
    this.lastTime = 0;
    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game('gameCanvas');
  game.start();
});
