import Phaser from 'phaser';

const CRYSTAL_COLORS = [0x00ffff, 0xff00ff, 0xffd700];

export class ParticleEffects {
  private scene: Phaser.Scene;
  private trailManager!: Phaser.GameObjects.Particles.ParticleEmitter;
  private trailEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private crystalBurstManager!: Phaser.GameObjects.Particles.ParticleEmitter;
  private energyBlastManager!: Phaser.GameObjects.Particles.ParticleEmitter;
  private fireworksManagers: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.init();
  }

  private init(): void {
    this.trailManager = this.scene.add.particles(0, 0, 'flares', {
      frame: ['red', 'yellow', 'green'],
      color: [0xffd700, 0xff69b4, 0x87ceeb],
      speed: { min: 10, max: 20 },
      scale: { start: 0.3, end: 0, ease: 'Sine.easeOut' },
      lifespan: 400,
      blendMode: 'ADD',
      quantity: 0
    });
    this.trailEmitter = this.trailManager;

    this.crystalBurstManager = this.scene.add.particles(0, 0, 'flares', {
      speed: { min: 80, max: 150 },
      scale: { start: 0.5, end: 0, ease: 'Cubic.easeOut' },
      lifespan: 800,
      blendMode: 'ADD',
      quantity: 0,
      gravityY: 0
    });

    this.energyBlastManager = this.scene.add.particles(0, 0, 'flares', {
      frame: ['white'],
      color: [0xff4444, 0xff8844, 0xffcc44],
      speed: { min: 100, max: 250 },
      scale: { start: 0.8, end: 0, ease: 'Expo.easeOut' },
      lifespan: 600,
      blendMode: 'ADD',
      quantity: 0,
      gravityY: 0
    });
  }

  public updateTrailTarget(x: number, y: number, active: boolean): void {
    this.trailEmitter.follow = null;
    if (active) {
      this.trailEmitter.setPosition(x, y);
      this.trailEmitter.emitParticle(1);
    }
  }

  public emitCrystalBurst(x: number, y: number): void {
    const color = Phaser.Utils.Array.GetRandom(CRYSTAL_COLORS);
    this.crystalBurstManager.setPosition(x, y);
    this.crystalBurstManager.color = [color, 0xffffff, color];
    this.crystalBurstManager.angle = { min: 0, max: 360 };
    this.crystalBurstManager.emitParticleAt(x, y, 10);
  }

  public emitEnergyBlast(x: number, y: number): void {
    this.energyBlastManager.setPosition(x, y);
    this.energyBlastManager.angle = { min: 0, max: 360 };
    this.energyBlastManager.emitParticleAt(x, y, 20);
  }

  public emitFireworks(x: number, y: number): void {
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffd700];
    const fw = this.scene.add.particles(x, y, 'flares', {
      color: colors,
      speed: { min: 150, max: 300 },
      scale: { start: 0.6, end: 0, ease: 'Cubic.easeOut' },
      lifespan: 1500,
      blendMode: 'ADD',
      quantity: 30,
      angle: { min: 0, max: 360 },
      gravityY: 50
    });
    this.fireworksManagers.push(fw);
    this.scene.time.delayedCall(2000, () => {
      fw.destroy();
      const idx = this.fireworksManagers.indexOf(fw);
      if (idx >= 0) this.fireworksManagers.splice(idx, 1);
    });
  }

  public destroy(): void {
    this.trailManager.destroy();
    this.crystalBurstManager.destroy();
    this.energyBlastManager.destroy();
    this.fireworksManagers.forEach(fw => fw.destroy());
    this.fireworksManagers = [];
  }
}
