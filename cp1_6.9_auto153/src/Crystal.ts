import type p5 from 'p5';

export interface CrystalColor {
  r: number;
  g: number;
  b: number;
}

export class Crystal {
  color: CrystalColor;
  hexColor: string;
  frequency: number;
  angle: number;
  targetAngle: number;
  slotRow: number;
  slotCol: number;
  placedInSlot: boolean;
  x: number;
  y: number;
  originalX: number;
  originalY: number;
  isFlashing: boolean;
  flashStartTime: number;
  scale: number;
  isRotating: boolean;
  rotateStartTime: number;
  isDragging: boolean;
  dragOffsetX: number;
  dragOffsetY: number;
  returnAnimation: boolean;
  returnStartTime: number;
  returnStartX: number;
  returnStartY: number;
  returnEndX: number;
  returnEndY: number;

  static readonly RADIUS = 18;
  static readonly ROTATION_DURATION = 200;
  static readonly FLASH_DURATION = 200;
  static readonly RETURN_DURATION = 300;

  constructor(hexColor: string, x: number, y: number) {
    this.hexColor = hexColor;
    this.color = this.hexToRgb(hexColor);
    this.frequency = 0.5 + Math.random() * 2.5;
    this.angle = Math.floor(Math.random() * 6) * 60;
    this.targetAngle = this.angle;
    this.slotRow = -1;
    this.slotCol = -1;
    this.placedInSlot = false;
    this.x = x;
    this.y = y;
    this.originalX = x;
    this.originalY = y;
    this.isFlashing = false;
    this.flashStartTime = 0;
    this.scale = 1;
    this.isRotating = false;
    this.rotateStartTime = 0;
    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.returnAnimation = false;
    this.returnStartTime = 0;
    this.returnStartX = 0;
    this.returnStartY = 0;
    this.returnEndX = 0;
    this.returnEndY = 0;
  }

  private hexToRgb(hex: string): CrystalColor {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 255, g: 255, b: 255 };
  }

  rotate(): void {
    this.targetAngle = (this.targetAngle + 60) % 360;
    this.isRotating = true;
    this.rotateStartTime = performance.now();
  }

  place(slotRow: number, slotCol: number, slotX: number, slotY: number): void {
    this.slotRow = slotRow;
    this.slotCol = slotCol;
    this.x = slotX;
    this.y = slotY;
    this.originalX = slotX;
    this.originalY = slotY;
    this.placedInSlot = true;
  }

  removeFromSlot(): void {
    this.slotRow = -1;
    this.slotCol = -1;
    this.placedInSlot = false;
  }

  triggerFlash(): void {
    this.isFlashing = true;
    this.flashStartTime = performance.now();
  }

  startDrag(mouseX: number, mouseY: number): void {
    this.isDragging = true;
    this.dragOffsetX = this.x - mouseX;
    this.dragOffsetY = this.y - mouseY;
    this.returnAnimation = false;
  }

  updateDrag(mouseX: number, mouseY: number): void {
    if (this.isDragging) {
      this.x = mouseX + this.dragOffsetX;
      this.y = mouseY + this.dragOffsetY;
    }
  }

  endDrag(dropX: number, dropY: number): void {
    this.isDragging = false;
    this.x = dropX;
    this.y = dropY;
  }

  startReturnAnimation(endX: number, endY: number): void {
    this.returnAnimation = true;
    this.returnStartTime = performance.now();
    this.returnStartX = this.x;
    this.returnStartY = this.y;
    this.returnEndX = endX;
    this.returnEndY = endY;
  }

  isInside(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy) <= Crystal.RADIUS;
  }

  update(currentTime: number): void {
    if (this.isRotating) {
      const elapsed = currentTime - this.rotateStartTime;
      if (elapsed >= Crystal.ROTATION_DURATION) {
        this.angle = this.targetAngle;
        this.isRotating = false;
      } else {
        const t = elapsed / Crystal.ROTATION_DURATION;
        const ease = 1 - Math.pow(1 - t, 3);
        this.angle = this.angle + (this.targetAngle - this.angle) * ease * (currentTime - this.rotateStartTime) / Crystal.ROTATION_DURATION;
        const startAngle = this.targetAngle === 0 && this.angle > 300 ? 360 : this.angle - ((this.targetAngle - this.angle + 360) % 360);
        const diff = ((this.targetAngle - startAngle + 360) % 360);
        this.angle = (startAngle + diff * ease) % 360;
      }
    }

    if (this.isFlashing) {
      const elapsed = currentTime - this.flashStartTime;
      if (elapsed >= Crystal.FLASH_DURATION) {
        this.isFlashing = false;
        this.scale = 1;
      } else {
        const t = elapsed / Crystal.FLASH_DURATION;
        this.scale = 1 + 0.2 * Math.sin(t * Math.PI);
      }
    }

    if (this.returnAnimation) {
      const elapsed = currentTime - this.returnStartTime;
      if (elapsed >= Crystal.RETURN_DURATION) {
        this.returnAnimation = false;
        this.x = this.returnEndX;
        this.y = this.returnEndY;
      } else {
        const t = elapsed / Crystal.RETURN_DURATION;
        const ease = 1 - Math.pow(1 - t, 3);
        this.x = this.returnStartX + (this.returnEndX - this.returnStartX) * ease;
        this.y = this.returnStartY + (this.returnEndY - this.returnStartY) * ease;
      }
    }
  }

  draw(p: p5): void {
    p.push();
    p.translate(this.x, this.y);
    const s = this.isDragging ? 1.1 : this.scale;
    p.scale(s);
    p.rotate(p.radians(this.angle));

    this.drawHexagon(p);

    if (this.isRotating) {
      this.drawRotationIndicator(p);
    }

    p.pop();

    if (!this.isDragging) {
      this.drawFrequencyLabel(p);
    }
  }

  private drawHexagon(p: p5): void {
    p.beginShape();
    for (let i = 0; i < 6; i++) {
      const angle = (p.TWO_PI / 6) * i - p.HALF_PI;
      const x = Math.cos(angle) * Crystal.RADIUS;
      const y = Math.sin(angle) * Crystal.RADIUS;
      p.vertex(x, y);
    }
    p.endShape(p.CLOSE);

    if (this.isFlashing) {
      p.fill(255, 255, 255, 200);
    } else {
      p.fill(this.color.r, this.color.g, this.color.b, 220);
    }
    p.noStroke();
    p.beginShape();
    for (let i = 0; i < 6; i++) {
      const angle = (p.TWO_PI / 6) * i - p.HALF_PI;
      const x = Math.cos(angle) * (Crystal.RADIUS - 2);
      const y = Math.sin(angle) * (Crystal.RADIUS - 2);
      p.vertex(x, y);
    }
    p.endShape(p.CLOSE);

    p.stroke(255, 255, 255, 150);
    p.strokeWeight(1.5);
    p.noFill();
    p.beginShape();
    for (let i = 0; i < 6; i++) {
      const angle = (p.TWO_PI / 6) * i - p.HALF_PI;
      const x = Math.cos(angle) * Crystal.RADIUS;
      const y = Math.sin(angle) * Crystal.RADIUS;
      p.vertex(x, y);
    }
    p.endShape(p.CLOSE);
  }

  private drawRotationIndicator(p: p5): void {
    p.noFill();
    p.stroke(255, 255, 255, 120);
    p.strokeWeight(2);
    const indicatorRadius = Crystal.RADIUS + 8;
    p.arc(0, 0, indicatorRadius * 2, indicatorRadius * 2, -p.HALF_PI, -p.HALF_PI + p.radians(60));
  }

  private drawFrequencyLabel(p: p5): void {
    p.push();
    p.fill(255, 255, 255, 180);
    p.noStroke();
    p.textSize(10);
    p.textAlign(p.CENTER, p.TOP);
    p.text(this.frequency.toFixed(1) + 'Hz', this.x, this.y + Crystal.RADIUS + 2);
    p.pop();
  }

  drawInReserve(p: p5, x: number, y: number, isHovered: boolean): void {
    this.x = x;
    this.y = y;
    this.originalX = x;
    this.originalY = y;

    p.push();
    p.translate(x, y);
    p.rotate(p.radians(this.angle));

    const scale = isHovered ? 1.1 : 1;
    p.scale(scale);

    p.beginShape();
    for (let i = 0; i < 6; i++) {
      const angle = (p.TWO_PI / 6) * i - p.HALF_PI;
      const vx = Math.cos(angle) * Crystal.RADIUS;
      const vy = Math.sin(angle) * Crystal.RADIUS;
      p.vertex(vx, vy);
    }
    p.endShape(p.CLOSE);

    p.fill(this.color.r, this.color.g, this.color.b, 220);
    p.noStroke();
    p.beginShape();
    for (let i = 0; i < 6; i++) {
      const angle = (p.TWO_PI / 6) * i - p.HALF_PI;
      const vx = Math.cos(angle) * (Crystal.RADIUS - 2);
      const vy = Math.sin(angle) * (Crystal.RADIUS - 2);
      p.vertex(vx, vy);
    }
    p.endShape(p.CLOSE);

    p.stroke(255, 255, 255, 150);
    p.strokeWeight(1.5);
    p.noFill();
    p.beginShape();
    for (let i = 0; i < 6; i++) {
      const angle = (p.TWO_PI / 6) * i - p.HALF_PI;
      const vx = Math.cos(angle) * Crystal.RADIUS;
      const vy = Math.sin(angle) * Crystal.RADIUS;
      p.vertex(vx, vy);
    }
    p.endShape(p.CLOSE);

    p.pop();

    p.push();
    p.fill(255, 255, 255, 180);
    p.noStroke();
    p.textSize(9);
    p.textAlign(p.CENTER, p.TOP);
    p.text(this.frequency.toFixed(1) + 'Hz', x, y + Crystal.RADIUS + 2);
    p.pop();
  }

  clone(): Crystal {
    const c = new Crystal(this.hexColor, this.originalX, this.originalY);
    c.frequency = this.frequency;
    c.angle = this.angle;
    c.targetAngle = this.targetAngle;
    return c;
  }
}
