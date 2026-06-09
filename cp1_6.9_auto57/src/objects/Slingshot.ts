import Phaser from 'phaser';

export interface LaunchData {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export class Slingshot {
  private scene: Phaser.Scene;
  public baseX: number;
  public baseY: number;
  private isDragging: boolean = false;
  private dragPointer: Phaser.Input.Pointer | null = null;
  private dragX: number = 0;
  private dragY: number = 0;
  public maxDragDistance: number = 150;
  public maxLaunchForce: number = 18;
  private baseGraphics: Phaser.GameObjects.Graphics;
  private ropeGraphics: Phaser.GameObjects.Graphics;
  private aimLineGraphics: Phaser.GameObjects.Graphics;
  private onLaunchCallback: ((data: LaunchData) => void) | null = null;
  private canDrag: boolean = true;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.baseX = x;
    this.baseY = y;

    this.baseGraphics = scene.add.graphics();
    this.ropeGraphics = scene.add.graphics();
    this.aimLineGraphics = scene.add.graphics();

    this.drawBase();

    scene.input.on('pointerdown', this.handlePointerDown, this);
    scene.input.on('pointermove', this.handlePointerMove, this);
    scene.input.on('pointerup', this.handlePointerUp, this);
  }

  public setCanDrag(can: boolean): void {
    this.canDrag = can;
  }

  public onLaunch(callback: (data: LaunchData) => void): void {
    this.onLaunchCallback = callback;
  }

  private drawBase(): void {
    this.baseGraphics.clear();

    this.baseGraphics.lineStyle(6, 0x8b4513, 1);
    this.baseGraphics.beginPath();
    this.baseGraphics.moveTo(this.baseX - 30, this.baseY + 60);
    this.baseGraphics.lineTo(this.baseX, this.baseY - 10);
    this.baseGraphics.lineTo(this.baseX + 30, this.baseY + 60);
    this.baseGraphics.strokePath();

    this.baseGraphics.lineStyle(5, 0x654321, 1);
    this.baseGraphics.beginPath();
    this.baseGraphics.moveTo(this.baseX, this.baseY - 10);
    this.baseGraphics.lineTo(this.baseX, this.baseY + 60);
    this.baseGraphics.strokePath();

    this.baseGraphics.lineStyle(4, 0xa0522d, 1);
    this.baseGraphics.beginPath();
    this.baseGraphics.moveTo(this.baseX - 25, this.baseY - 5);
    this.baseGraphics.lineTo(this.baseX - 8, this.baseY - 25);
    this.baseGraphics.strokePath();

    this.baseGraphics.beginPath();
    this.baseGraphics.moveTo(this.baseX + 25, this.baseY - 5);
    this.baseGraphics.lineTo(this.baseX + 8, this.baseY - 25);
    this.baseGraphics.strokePath();

    this.baseGraphics.fillStyle(0x8b4513, 1);
    this.baseGraphics.fillCircle(this.baseX - 8, this.baseY - 25, 5);
    this.baseGraphics.fillCircle(this.baseX + 8, this.baseY - 25, 5);
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.canDrag) return;

    const dist = Phaser.Math.Distance.Between(
      pointer.x, pointer.y,
      this.baseX, this.baseY
    );

    if (dist < 120 && pointer.y > this.baseY - 100) {
      this.isDragging = true;
      this.dragPointer = pointer;
      this.updateDragPosition(pointer.x, pointer.y);
    }
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging || this.dragPointer !== pointer) return;
    this.updateDragPosition(pointer.x, pointer.y);
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging || this.dragPointer !== pointer) return;

    this.isDragging = false;
    const dragDistance = Phaser.Math.Distance.Between(
      this.dragX, this.dragY,
      this.baseX, this.baseY
    );

    if (dragDistance > 20 && this.onLaunchCallback) {
      const angle = Phaser.Math.Angle.Between(
        this.dragX, this.dragY,
        this.baseX, this.baseY
      );
      const force = Math.min(dragDistance / this.maxDragDistance, 1) * this.maxLaunchForce;

      this.onLaunchCallback({
        x: this.dragX,
        y: this.dragY,
        vx: Math.cos(angle) * force,
        vy: Math.sin(angle) * force
      });
    }

    this.clearRope();
    this.dragPointer = null;
  }

  private updateDragPosition(px: number, py: number): void {
    const dx = px - this.baseX;
    const dy = py - this.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.maxDragDistance) {
      const ratio = this.maxDragDistance / dist;
      this.dragX = this.baseX + dx * ratio;
      this.dragY = this.baseY + dy * ratio;
    } else {
      this.dragX = px;
      this.dragY = py;
    }

    this.drawRope();
    this.drawAimLine();
  }

  private drawRope(): void {
    this.ropeGraphics.clear();

    this.ropeGraphics.lineStyle(3, 0x333333, 0.9);
    this.ropeGraphics.beginPath();
    this.ropeGraphics.moveTo(this.baseX - 8, this.baseY - 25);
    this.ropeGraphics.lineTo(this.dragX, this.dragY);
    this.ropeGraphics.strokePath();

    this.ropeGraphics.beginPath();
    this.ropeGraphics.moveTo(this.baseX + 8, this.baseY - 25);
    this.ropeGraphics.lineTo(this.dragX, this.dragY);
    this.ropeGraphics.strokePath();
  }

  private drawAimLine(): void {
    this.aimLineGraphics.clear();

    const dragDistance = Phaser.Math.Distance.Between(
      this.dragX, this.dragY,
      this.baseX, this.baseY
    );
    const forceRatio = Math.min(dragDistance / this.maxDragDistance, 1);

    const hue = (1 - forceRatio) * 120;
    const color = Phaser.Display.Color.HSVToRGB(hue / 360, 1, 1);

    const angle = Phaser.Math.Angle.Between(
      this.dragX, this.dragY,
      this.baseX, this.baseY
    );

    this.aimLineGraphics.lineStyle(2, color.color, 0.8);
    this.aimLineGraphics.setDepth(1000);

    const lineLength = dragDistance * 2;
    const endX = this.dragX + Math.cos(angle) * lineLength;
    const endY = this.dragY + Math.sin(angle) * lineLength;

    const segments = 15;
    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      const x1 = Phaser.Math.Linear(this.dragX, endX, t);
      const y1 = Phaser.Math.Linear(this.dragY, endY, t);
      const x2 = Phaser.Math.Linear(this.dragX, endX, t + 0.5 / segments);
      const y2 = Phaser.Math.Linear(this.dragY, endY, t + 0.5 / segments);

      this.aimLineGraphics.lineBetween(x1, y1, x2, y2);
    }
  }

  private clearRope(): void {
    this.ropeGraphics.clear();
    this.aimLineGraphics.clear();
  }

  public showBallAtRest(): void {
    this.clearRope();
  }

  public destroy(): void {
    this.scene.input.off('pointerdown', this.handlePointerDown, this);
    this.scene.input.off('pointermove', this.handlePointerMove, this);
    this.scene.input.off('pointerup', this.handlePointerUp, this);
    this.baseGraphics.destroy();
    this.ropeGraphics.destroy();
    this.aimLineGraphics.destroy();
  }
}
