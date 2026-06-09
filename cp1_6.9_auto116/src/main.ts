import p5 from 'p5';
import { Forest } from './forest';
import { LightBug, PulseRing, COLOR_FREQUENCIES } from './lightbug';

const SCENE_WIDTH = 800;
const SCENE_HEIGHT = 600;
const PLAYER_RADIUS = 18;
const PLAYER_SPEED = 2;
const PLAYER_COLOR = '#ffddaa';
const COLLECT_DISTANCE = 25;
const TARGET_COLLECT_COUNT = 30;

interface TrailPoint {
  x: number;
  y: number;
  startTime: number;
}

class Game {
  p: p5;
  forest: Forest;
  lightBugs: LightBug[];
  pulseRings: PulseRing[];
  playerX: number;
  playerY: number;
  trail: TrailPoint[];
  collected: number;
  gameStartTime: number;
  gameComplete: boolean;
  completeStartTime: number;
  keys: Set<string>;
  osc: p5.Oscillator | null;

  constructor(p: p5) {
    this.p = p;
    this.forest = new Forest(SCENE_WIDTH, SCENE_HEIGHT);
    this.lightBugs = [];
    this.pulseRings = [];
    this.playerX = SCENE_WIDTH / 2;
    this.playerY = this.forest.groundY - PLAYER_RADIUS - 5;
    this.trail = [];
    this.collected = 0;
    this.gameStartTime = performance.now();
    this.gameComplete = false;
    this.completeStartTime = 0;
    this.keys = new Set();
    this.osc = null;
    this.init();
  }

  init(): void {
    const bugCount = 15 + Math.floor(Math.random() * 6);
    this.lightBugs = [];
    for (let i = 0; i < bugCount; i++) {
      this.lightBugs.push(new LightBug(SCENE_WIDTH, SCENE_HEIGHT, this.forest.groundY));
    }
  }

  reset(): void {
    this.forest = new Forest(SCENE_WIDTH, SCENE_HEIGHT);
    this.pulseRings = [];
    this.playerX = SCENE_WIDTH / 2;
    this.playerY = this.forest.groundY - PLAYER_RADIUS - 5;
    this.trail = [];
    this.collected = 0;
    this.gameStartTime = performance.now();
    this.gameComplete = false;
    this.completeStartTime = 0;
    this.init();
  }

  handleKeyDown(key: string): void {
    this.keys.add(key.toLowerCase());
  }

  handleKeyUp(key: string): void {
    this.keys.delete(key.toLowerCase());
  }

  updatePlayer(): void {
    let dx = 0;
    let dy = 0;

    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;

    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    this.playerX += dx * PLAYER_SPEED;
    this.playerY += dy * PLAYER_SPEED;

    const minX = PLAYER_RADIUS;
    const maxX = SCENE_WIDTH - PLAYER_RADIUS;
    const minY = PLAYER_RADIUS + 10;
    const maxY = this.forest.groundY - PLAYER_RADIUS - 5;

    this.playerX = this.p.constrain(this.playerX, minX, maxX);
    this.playerY = this.p.constrain(this.playerY, minY, maxY);

    if (dx !== 0 || dy !== 0) {
      this.trail.push({
        x: this.playerX,
        y: this.playerY,
        startTime: performance.now()
      });
    }

    const now = performance.now();
    this.trail = this.trail.filter(t => now - t.startTime < 1000);
  }

  checkCollisions(): void {
    for (const bug of this.lightBugs) {
      if (bug.collecting || bug.collected) continue;
      const dx = this.playerX - bug.x;
      const dy = this.playerY - bug.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < COLLECT_DISTANCE) {
        bug.startCollect();
        this.pulseRings.push(new PulseRing(bug.x, bug.y, bug.color));
        this.playSound(bug.color);
        this.collected++;

        for (let i = 0; i < 5; i++) {
          this.forest.addParticle(bug.x, bug.y);
        }

        if (this.collected >= TARGET_COLLECT_COUNT) {
          this.gameComplete = true;
          this.completeStartTime = performance.now();
        }
      }
    }

    for (const bug of this.lightBugs) {
      if (bug.collected) {
        bug.respawn();
      }
    }

    this.pulseRings = this.pulseRings.filter(r => !r.done);
  }

  playSound(color: string): void {
    try {
      if (!this.osc) {
        this.osc = new this.p.Oscillator();
        this.osc.setType('sine');
      }
      const freq = COLOR_FREQUENCIES[color] || 600;
      this.osc.freq(freq);
      this.osc.amp(0);
      this.osc.start();
      this.osc.amp(0.15, 0.01);
      this.osc.amp(0, 0.15);
      setTimeout(() => {
        if (this.osc) {
          this.osc.stop();
        }
      }, 200);
    } catch (_e) {
      // ignore sound errors
    }
  }

  update(): void {
    if (this.gameComplete) {
      const elapsed = performance.now() - this.completeStartTime;
      if (elapsed >= 5000) {
        this.reset();
      }
      return;
    }

    this.updatePlayer();
    this.forest.update();

    for (const bug of this.lightBugs) {
      bug.update();
    }
    for (const ring of this.pulseRings) {
      ring.update();
    }

    this.checkCollisions();
  }

  drawBackground(): void {
    this.p.background(0);
  }

  drawTrail(): void {
    const now = performance.now();
    for (const t of this.trail) {
      const age = now - t.startTime;
      const alpha = Math.max(0, 1 - age / 1000) * 120;
      this.p.push();
      this.p.noStroke();
      const c = this.p.color(PLAYER_COLOR);
      c.setAlpha(alpha);
      this.p.fill(c);
      this.p.ellipse(t.x, t.y, PLAYER_RADIUS * 0.8, PLAYER_RADIUS * 0.8);
      this.p.pop();
    }
  }

  drawPlayer(): void {
    this.p.push();
    const glowColor = this.p.color(PLAYER_COLOR);
    glowColor.setAlpha(100);
    this.p.noStroke();
    this.p.fill(glowColor);
    this.p.ellipse(this.playerX, this.playerY, PLAYER_RADIUS * 2.5, PLAYER_RADIUS * 2.5);
    glowColor.setAlpha(150);
    this.p.fill(glowColor);
    this.p.ellipse(this.playerX, this.playerY, PLAYER_RADIUS * 2, PLAYER_RADIUS * 2);
    this.p.fill(PLAYER_COLOR);
    this.p.ellipse(this.playerX, this.playerY, PLAYER_RADIUS * 2, PLAYER_RADIUS * 2);
    this.p.pop();
  }

  drawUI(): void {
    this.p.push();
    this.p.textAlign(this.p.LEFT, this.p.TOP);

    this.p.textSize(16);
    this.p.textStyle(this.p.BOLD);
    this.p.fill(100);
    this.p.text(`光虫: ${this.collected} / ${TARGET_COLLECT_COUNT}`, 16 + 1, 16 + 1);
    this.p.fill(255);
    this.p.text(`光虫: ${this.collected} / ${TARGET_COLLECT_COUNT}`, 16, 16);

    const elapsed = Math.floor((performance.now() - this.gameStartTime) / 1000);
    this.p.textSize(14);
    this.p.textStyle(this.p.BOLD);
    this.p.textAlign(this.p.RIGHT, this.p.TOP);
    this.p.fill(100);
    this.p.text(`时间: ${elapsed}s`, SCENE_WIDTH - 16 + 1, 16 + 1);
    this.p.fill(255);
    this.p.text(`时间: ${elapsed}s`, SCENE_WIDTH - 16, 16);

    this.p.pop();
  }

  drawComplete(): void {
    const elapsed = performance.now() - this.completeStartTime;
    const t = (elapsed / 500) % 1;
    const brightness = 128 + Math.sin(t * Math.PI * 2) * 127;

    this.p.push();
    this.p.textAlign(this.p.CENTER, this.p.CENTER);
    this.p.textSize(32);
    this.p.textStyle(this.p.BOLD);
    const c = this.p.color(255, 255, 255);
    c.setAlpha(brightness);
    this.p.fill(c);
    this.p.text('夜行达成！', SCENE_WIDTH / 2, SCENE_HEIGHT / 2);
    this.p.pop();
  }

  draw(): void {
    this.drawBackground();
    this.forest.draw(this.p);

    for (const ring of this.pulseRings) {
      ring.draw(this.p);
    }

    for (const bug of this.lightBugs) {
      bug.draw(this.p);
    }

    this.drawTrail();
    this.drawPlayer();
    this.drawUI();

    if (this.gameComplete) {
      this.drawComplete();
    }
  }
}

const sketch = (p: p5): void => {
  let game: Game;

  p.setup = (): void => {
    const canvas = p.createCanvas(SCENE_WIDTH, SCENE_HEIGHT);
    const container = document.getElementById('game-container');
    if (container) {
      canvas.parent(container);
    }
    p.frameRate(60);

    game = new Game(p);

    p.keyPressed = (): void => {
      game.handleKeyDown(p.key);
      if (p.key === ' ') {
        try {
          if ((p as any).getAudioContext().state === 'suspended') {
            (p as any).getAudioContext().resume();
          }
        } catch (_e) {
          // ignore
        }
      }
    };

    p.keyReleased = (): void => {
      game.handleKeyUp(p.key);
    };
  };

  p.draw = (): void => {
    game.update();
    game.draw();
  };
};

new p5(sketch);
