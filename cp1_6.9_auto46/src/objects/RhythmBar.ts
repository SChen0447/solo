import Phaser from 'phaser';
import { GAME_CONFIG, getRandomKey } from '../config/levels';

export interface Note {
  sprite: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  key: string;
  hit: boolean;
  missed: boolean;
}

interface Particle {
  sprite: Phaser.GameObjects.Rectangle;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export class RhythmBar extends Phaser.GameObjects.Container {
  private barBg!: Phaser.GameObjects.Rectangle;
  private targetZone!: Phaser.GameObjects.Rectangle;
  private notes: Note[] = [];
  private particles: Particle[] = [];
  private scoreTexts: Phaser.GameObjects.Text[] = [];
  private spawnTimer: number = 0;
  private spawnInterval: number = 800;
  private noteSpeed: number = 100;
  private barWidth: number = 0;
  private color: string = '#00ff00';
  private activeParticles: number = 0;
  private onNoteHit?: (note: Note) => void;
  private onNoteMiss?: () => void;
  private notesSpawned: number = 0;
  private totalNotes: number = 50;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number) {
    super(scene, x, y);
    this.barWidth = width;
    this.scene.add.existing(this);
    this.createBar();
  }

  private createBar(): void {
    this.barBg = this.scene.add.rectangle(
      0, 0, this.barWidth, GAME_CONFIG.BAR_HEIGHT, 0x000000, 0.8
    ).setStrokeStyle(2, 0x00ff00, 0.8);

    const glow = this.scene.add.rectangle(
      0, 0, this.barWidth, GAME_CONFIG.BAR_HEIGHT, 0x00ff00, 0.1
    );

    this.targetZone = this.scene.add.rectangle(
      -this.barWidth / 2 + GAME_CONFIG.TARGET_ZONE_WIDTH / 2,
      0,
      GAME_CONFIG.TARGET_ZONE_WIDTH,
      GAME_CONFIG.BAR_HEIGHT,
      0x000000,
      0.5
    ).setStrokeStyle(3, 0x00ff00, 1);

    this.add([glow, this.barBg, this.targetZone]);
  }

  public setSpeed(speed: number): void {
    this.noteSpeed = speed;
  }

  public setSpawnInterval(interval: number): void {
    this.spawnInterval = interval;
  }

  public setColor(color: string): void {
    this.color = color;
    const colorNum = Phaser.Display.Color.HexStringToColor(color).color;
    this.barBg.setStrokeStyle(2, colorNum, 0.8);
    this.targetZone.setStrokeStyle(3, colorNum, 1);
  }

  public setTotalNotes(total: number): void {
    this.totalNotes = total;
  }

  public getNotesSpawned(): number {
    return this.notesSpawned;
  }

  public reset(): void {
    this.notes.forEach(n => {
      n.sprite.destroy();
      n.text.destroy();
    });
    this.notes = [];
    this.particles.forEach(p => p.sprite.destroy());
    this.particles = [];
    this.scoreTexts.forEach(t => t.destroy());
    this.scoreTexts = [];
    this.spawnTimer = 0;
    this.notesSpawned = 0;
    this.activeParticles = 0;
  }

  public setCallbacks(
    onHit: (note: Note) => void,
    onMiss: () => void
  ): void {
    this.onNoteHit = onHit;
    this.onNoteMiss = onMiss;
  }

  public checkKeyPress(key: string): boolean {
    const targetX = this.x - this.barWidth / 2 + GAME_CONFIG.TARGET_ZONE_WIDTH / 2;
    const tolerance = GAME_CONFIG.TOLERANCE + GAME_CONFIG.TARGET_ZONE_WIDTH / 2;

    let closestNote: Note | null = null;
    let closestDist = Infinity;

    for (const note of this.notes) {
      if (note.hit || note.missed) continue;
      if (note.key.toUpperCase() !== key.toUpperCase()) continue;

      const dist = Math.abs(note.sprite.x - targetX);
      if (dist <= tolerance && dist < closestDist) {
        closestDist = dist;
        closestNote = note;
      }
    }

    if (closestNote) {
      this.hitNote(closestNote);
      return true;
    }

    return false;
  }

  private hitNote(note: Note): void {
    note.hit = true;
    this.spawnParticles(note.sprite.x, note.sprite.y);
    this.spawnScoreText(note.sprite.x, note.sprite.y);
    note.sprite.destroy();
    note.text.destroy();
    this.onNoteHit?.(note);
  }

  private missNote(note: Note): void {
    note.missed = true;
    const colorNum = Phaser.Display.Color.HexStringToColor('#ff0000').color;
    note.sprite.setFillStyle(colorNum, 1);

    this.scene.tweens.add({
      targets: note.sprite,
      alpha: { from: 1, to: 0 },
      duration: 400,
      repeat: 1,
      onComplete: () => {
        note.sprite.destroy();
        note.text.destroy();
      }
    });

    this.onNoteMiss?.();
  }

  private spawnNote(): void {
    if (this.notesSpawned >= this.totalNotes) return;

    const key = getRandomKey();
    const startX = this.x + this.barWidth / 2 + GAME_CONFIG.NOTE_SIZE;
    const colorNum = Phaser.Display.Color.HexStringToColor(this.color).color;

    const sprite = this.scene.add.rectangle(
      startX, this.y, GAME_CONFIG.NOTE_SIZE, GAME_CONFIG.NOTE_SIZE, colorNum, 0.9
    ).setStrokeStyle(2, colorNum, 1);

    const text = this.scene.add.text(startX, this.y, key, {
      fontFamily: 'Consolas, monospace',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#000000'
    }).setOrigin(0.5);

    this.notes.push({ sprite, text, key, hit: false, missed: false });
    this.notesSpawned++;
  }

  private spawnParticles(x: number, y: number): void {
    const count = Math.min(
      GAME_CONFIG.PARTICLE_COUNT,
      GAME_CONFIG.MAX_PARTICLES - this.activeParticles
    );
    const colorNum = Phaser.Display.Color.HexStringToColor(this.color).color;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 80 + Math.random() * 120;

      const particle = this.scene.add.rectangle(
        x, y, 4 + Math.random() * 4, 4 + Math.random() * 4, colorNum, 1
      );

      this.particles.push({
        sprite: particle,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 800,
        maxLife: 800
      });
      this.activeParticles++;
    }
  }

  private spawnScoreText(x: number, y: number): void {
    const colorNum = Phaser.Display.Color.HexStringToColor('#00ff00').color;
    const text = this.scene.add.text(x, y, '+1', {
      fontFamily: 'Consolas, monospace',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#00ff00'
    }).setOrigin(0.5);

    this.scene.tweens.add({
      targets: text,
      y: y - 200,
      alpha: { from: 1, to: 0 },
      duration: 1000,
      onComplete: () => text.destroy()
    });

    this.scoreTexts.push(text);
  }

  public update(time: number, delta: number): void {
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnNote();
      this.spawnTimer = 0;
    }

    const deltaSec = delta / 1000;
    const targetX = this.x - this.barWidth / 2;

    for (let i = this.notes.length - 1; i >= 0; i--) {
      const note = this.notes[i];
      if (note.hit) {
        this.notes.splice(i, 1);
        continue;
      }

      if (!note.missed) {
        note.sprite.x -= this.noteSpeed * deltaSec;
        note.text.x = note.sprite.x;

        if (note.sprite.x < targetX - 50) {
          this.missNote(note);
        }
      }

      if (note.missed && !note.sprite.active) {
        this.notes.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      p.sprite.x += p.vx * deltaSec;
      p.sprite.y += p.vy * deltaSec;
      p.vy += 200 * deltaSec;
      p.sprite.alpha = Math.max(0, p.life / p.maxLife);

      if (p.life <= 0) {
        p.sprite.destroy();
        this.particles.splice(i, 1);
        this.activeParticles--;
      }
    }
  }

  public isAllNotesProcessed(): boolean {
    return this.notesSpawned >= this.totalNotes && this.notes.length === 0;
  }

  public resize(width: number): void {
    this.barWidth = width;
    this.barBg.width = width;
    this.targetZone.x = -width / 2 + GAME_CONFIG.TARGET_ZONE_WIDTH / 2;
  }
}
