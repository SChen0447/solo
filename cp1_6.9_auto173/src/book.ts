import p5 from 'p5';
import { ParticleSystem } from './particles';
import { TextManager } from './text';

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

type BookState = 'idle' | 'flipping' | 'nebula' | 'closing';

export class Book {
  private p: p5;
  private particles: ParticleSystem;
  private textManager: TextManager;

  private readonly BOOK_W = 700;
  private readonly BOOK_H = 500;
  private readonly CORNER_HIT = 60;

  private stars: Star[] = [];
  private bookState: BookState = 'idle';

  private isDragging = false;
  private flipAngle = 0;
  private targetFlipAngle = 0;
  private dragStartX = 0;
  private dragStartY = 0;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private mouseVelocityX = 0;
  private mouseVelocityY = 0;
  private lastParticleEmit = 0;

  private nebulaTimer = 0;
  private nebulaDuration = 2500;
  private bookScale = 1;

  constructor(p: p5, particles: ParticleSystem, textManager: TextManager) {
    this.p = p;
    this.particles = particles;
    this.textManager = textManager;
    this.initializeStars();
  }

  private initializeStars(): void {
    const p = this.p;
    for (let i = 0; i < 300; i++) {
      this.stars.push({
        x: p.random(p.width),
        y: p.random(p.height),
        size: p.random(1, 3),
        brightness: p.random(100, 255),
        twinkleSpeed: p.random(0.5, 2),
        twinkleOffset: p.random(p.TWO_PI)
      });
    }
  }

  public resize(): void {
    const p = this.p;
    this.stars = [];
    for (let i = 0; i < 300; i++) {
      this.stars.push({
        x: p.random(p.width),
        y: p.random(p.height),
        size: p.random(1, 3),
        brightness: p.random(100, 255),
        twinkleSpeed: p.random(0.5, 2),
        twinkleOffset: p.random(p.TWO_PI)
      });
    }
  }

  private getBookX(): number {
    return this.p.width / 2 - (this.BOOK_W * this.bookScale) / 2;
  }

  private getBookY(): number {
    return this.p.height / 2 - (this.BOOK_H * this.bookScale) / 2;
  }

  public handleMousePressed(): void {
    if (this.bookState !== 'idle') return;

    const p = this.p;
    const bookX = this.getBookX();
    const bookY = this.getBookY();
    const bw = this.BOOK_W * this.bookScale;
    const bh = this.BOOK_H * this.bookScale;

    const rightPageX = bookX + bw / 2;
    const cornerX = bookX + bw;
    const cornerY = bookY + bh;

    const distToCorner = p.dist(p.mouseX, p.mouseY, cornerX, cornerY);
    const inRightPage = p.mouseX >= rightPageX && p.mouseX <= bookX + bw
      && p.mouseY >= bookY && p.mouseY <= bookY + bh;

    if (distToCorner < this.CORNER_HIT || inRightPage) {
      if (this.textManager.getCurrentPage() < this.textManager.getTotalPages() - 1) {
        this.isDragging = true;
        this.dragStartX = p.mouseX;
        this.dragStartY = p.mouseY;
        this.lastMouseX = p.mouseX;
        this.lastMouseY = p.mouseY;
      }
    }
  }

  public handleMouseDragged(): void {
    if (!this.isDragging || this.bookState !== 'idle') return;

    const p = this.p;
    const bookX = this.getBookX();
    const bw = this.BOOK_W * this.bookScale;

    this.mouseVelocityX = (p.mouseX - this.lastMouseX) / 16.67;
    this.mouseVelocityY = (p.mouseY - this.lastMouseY) / 16.67;
    this.lastMouseX = p.mouseX;
    this.lastMouseY = p.mouseY;

    const dragDistance = this.dragStartX - p.mouseX;
    const maxDrag = bw / 2;
    const normalizedDrag = p.constrain(dragDistance / maxDrag, 0, 1.5);
    this.flipAngle = normalizedDrag * Math.PI;
    this.targetFlipAngle = this.flipAngle;

    this.textManager.updateAnimation(normalizedDrag);

    const now = p.millis();
    if (now - this.lastParticleEmit > 30) {
      const rightCornerX = bookX + bw;
      const rightCornerY = this.getBookY() + this.BOOK_H * this.bookScale;
      const speedFactor = p.min(
        p.sqrt(this.mouseVelocityX * this.mouseVelocityX + this.mouseVelocityY * this.mouseVelocityY) / 5,
        2
      );
      this.particles.emitPageParticles(
        rightCornerX - normalizedDrag * bw * 0.5,
        rightCornerY - normalizedDrag * this.BOOK_H * this.bookScale * 0.3,
        -this.mouseVelocityX,
        -this.mouseVelocityY,
        speedFactor
      );
      this.lastParticleEmit = now;
    }
  }

  public handleMouseReleased(): void {
    if (!this.isDragging) return;
    this.isDragging = false;

    const p = this.p;
    if (this.flipAngle > Math.PI * 0.5) {
      this.targetFlipAngle = Math.PI;
      this.bookState = 'flipping';
    } else {
      this.targetFlipAngle = 0;
      this.bookState = 'flipping';
    }
  }

  public update(deltaTime: number): void {
    const p = this.p;

    if (this.bookState === 'flipping') {
      const angleDiff = this.targetFlipAngle - this.flipAngle;
      this.flipAngle += angleDiff * 0.12 * (deltaTime / 16.67);

      const progress = this.flipAngle / Math.PI;
      this.textManager.updateAnimation(p.constrain(progress, 0, 1));

      if (Math.abs(angleDiff) < 0.02) {
        this.flipAngle = this.targetFlipAngle;
        if (this.flipAngle >= Math.PI * 0.99) {
          this.textManager.setCurrentPage(this.textManager.getCurrentPage() + 1);
          this.flipAngle = 0;
          this.targetFlipAngle = 0;

          if (this.textManager.getCurrentPage() >= this.textManager.getTotalPages() - 1) {
            this.triggerNebula();
          } else {
            this.bookState = 'idle';
            this.textManager.endAnimation();
          }
        } else {
          this.bookState = 'idle';
          this.textManager.endAnimation();
        }
      }
    }

    if (this.bookState === 'nebula') {
      this.nebulaTimer += deltaTime;
      const t = this.nebulaTimer / this.nebulaDuration;

      if (t < 0.2) {
        this.bookScale = 1 + t * 5;
      } else if (t < 0.3 && this.nebulaTimer - deltaTime < 0.2 * this.nebulaDuration) {
        this.particles.emitNebulaBurst(p.width / 2, p.height / 2);
      } else if (t >= 0.3 && t < 0.8) {
        this.bookScale = 2 - (t - 0.3) * 2;
      } else if (t >= 0.8) {
        this.bookState = 'closing';
      }
    }

    if (this.bookState === 'closing') {
      this.bookScale += (1 - this.bookScale) * 0.08 * (deltaTime / 16.67);
      if (Math.abs(this.bookScale - 1) < 0.01) {
        this.bookScale = 1;
        this.bookState = 'idle';
        this.textManager.setCurrentPage(0);
        this.nebulaTimer = 0;
      }
    }
  }

  private triggerNebula(): void {
    this.bookState = 'nebula';
    this.nebulaTimer = 0;
    this.textManager.endAnimation();
  }

  public draw(deltaTime: number): void {
    const p = this.p;
    this.drawStars(deltaTime);
    this.drawBook();
  }

  private drawStars(deltaTime: number): void {
    const p = this.p;
    const time = p.millis() / 1000;

    p.noStroke();
    for (const star of this.stars) {
      const twinkle = p.sin(time * star.twinkleSpeed + star.twinkleOffset);
      const alpha = p.map(twinkle, -1, 1, 0.3, 1);
      p.drawingContext.save();
      p.drawingContext.globalAlpha = alpha;
      p.fill(star.brightness, star.brightness, 255);
      p.ellipse(star.x, star.y, star.size, star.size);
      p.drawingContext.restore();
    }
  }

  private drawBook(): void {
    const p = this.p;
    const bookX = this.getBookX();
    const bookY = this.getBookY();
    const bw = this.BOOK_W * this.bookScale;
    const bh = this.BOOK_H * this.bookScale;

    p.push();
    p.translate(bookX + bw / 2, bookY + bh / 2);
    p.scale(this.bookScale);
    p.translate(-this.BOOK_W / 2, -this.BOOK_H / 2);

    this.drawBookCover();
    this.drawBookSpine();
    this.drawPages();

    if (this.bookState !== 'nebula' && this.bookState !== 'closing') {
      this.textManager.draw(0, 0, this.BOOK_W, this.BOOK_H, 'left');
      this.textManager.draw(0, 0, this.BOOK_W, this.BOOK_H, 'right');
    }

    this.drawFlippingPage();
    this.drawGlowBorder();

    if (this.bookState === 'idle' && !this.isDragging) {
      this.drawCornerHint();
    }

    p.pop();
  }

  private drawBookCover(): void {
    const p = this.p;
    const w = this.BOOK_W;
    const h = this.BOOK_H;

    p.noStroke();
    for (let i = 0; i < 5; i++) {
      const offset = i * 2;
      p.drawingContext.save();
      p.drawingContext.globalAlpha = 0.05;
      p.fill(20, 10, 5);
      p.rect(-offset, -offset, w + offset * 2, h + offset * 2, 8);
      p.drawingContext.restore();
    }

    const coverGrad = p.drawingContext.createLinearGradient(0, 0, w, h);
    coverGrad.addColorStop(0, '#3d2817');
    coverGrad.addColorStop(0.3, '#5c3a1e');
    coverGrad.addColorStop(0.5, '#4a3020');
    coverGrad.addColorStop(0.7, '#6b4423');
    coverGrad.addColorStop(1, '#3d2817');

    p.drawingContext.save();
    p.drawingContext.fillStyle = coverGrad;
    p.rect(0, 0, w, h, 8);
    p.drawingContext.restore();

    p.drawingContext.save();
    p.drawingContext.globalAlpha = 0.08;
    for (let i = 0; i < 20; i++) {
      p.stroke(180, 150, 80);
      p.strokeWeight(1);
      const y = p.random(10, h - 10);
      p.line(5, y, w - 5, y + p.random(-5, 5));
    }
    p.drawingContext.restore();
  }

  private drawBookSpine(): void {
    const p = this.p;
    const w = this.BOOK_W;
    const h = this.BOOK_H;
    const spineX = w / 2;

    const spineGrad = p.drawingContext.createLinearGradient(spineX - 15, 0, spineX + 15, 0);
    spineGrad.addColorStop(0, '#2a1a0e');
    spineGrad.addColorStop(0.4, '#4a3020');
    spineGrad.addColorStop(0.5, '#6b4423');
    spineGrad.addColorStop(0.6, '#4a3020');
    spineGrad.addColorStop(1, '#2a1a0e');

    p.drawingContext.save();
    p.drawingContext.fillStyle = spineGrad;
    p.rect(spineX - 15, 0, 30, h);
    p.drawingContext.restore();

    p.drawingContext.save();
    for (let i = 0; i < 8; i++) {
      const y = (h / 9) * (i + 1);
      const alpha = 0.4 + 0.3 * p.sin(p.millis() / 1000 + i);
      p.drawingContext.globalAlpha = alpha;
      p.stroke(200, 170, 100);
      p.strokeWeight(1.5);
      p.line(spineX - 10, y, spineX + 10, y);

      p.drawingContext.shadowBlur = 8;
      p.drawingContext.shadowColor = 'rgba(255, 200, 100, 0.8)';
      p.point(spineX, y);
    }
    p.drawingContext.restore();

    p.drawingContext.save();
    p.drawingContext.globalAlpha = 0.6;
    p.stroke(220, 180, 100);
    p.strokeWeight(0.5);
    for (let i = 0; i < 3; i++) {
      const ox = spineX - 5 + i * 5;
      p.line(ox, 5, ox, h - 5);
    }
    p.drawingContext.restore();
  }

  private drawPages(): void {
    const p = this.p;
    const w = this.BOOK_W;
    const h = this.BOOK_H;

    const pageGradL = p.drawingContext.createLinearGradient(w / 2, 0, 20, 0);
    pageGradL.addColorStop(0, '#e8dcc8');
    pageGradL.addColorStop(1, '#f5ebd8');

    p.drawingContext.save();
    p.drawingContext.fillStyle = pageGradL;
    p.beginShape();
    p.vertex(20, 20);
    p.vertex(w / 2 - 3, 25);
    p.vertex(w / 2 - 3, h - 25);
    p.vertex(20, h - 20);
    p.endShape(p.CLOSE);
    p.drawingContext.restore();

    const pageGradR = p.drawingContext.createLinearGradient(w / 2, 0, w - 20, 0);
    pageGradR.addColorStop(0, '#e8dcc8');
    pageGradR.addColorStop(1, '#f5ebd8');

    p.drawingContext.save();
    p.drawingContext.fillStyle = pageGradR;
    p.beginShape();
    p.vertex(w / 2 + 3, 25);
    p.vertex(w - 20, 20);
    p.vertex(w - 20, h - 20);
    p.vertex(w / 2 + 3, h - 25);
    p.endShape(p.CLOSE);
    p.drawingContext.restore();

    p.noFill();
    p.stroke(160, 130, 90);
    p.strokeWeight(0.5);
    for (let i = 0; i < 5; i++) {
      const y = 30 + i * 15;
      p.line(25, y, w / 2 - 8, y);
      p.line(w / 2 + 8, y, w - 25, y);
    }
  }

  private drawFlippingPage(): void {
    if (this.flipAngle <= 0.001) return;

    const p = this.p;
    const w = this.BOOK_W;
    const h = this.BOOK_H;

    const progress = this.flipAngle / Math.PI;
    const foldX = w / 2 + (w / 2 - 20) * Math.cos(this.flipAngle);
    const foldWidth = Math.abs((w / 2 - 20) * Math.sin(this.flipAngle));

    p.push();

    if (progress < 0.5) {
      const pageGrad = p.drawingContext.createLinearGradient(w / 2, 0, w - 20, 0);
      pageGrad.addColorStop(0, '#e8dcc8');
      pageGrad.addColorStop(1, '#f5ebd8');

      p.drawingContext.save();
      p.drawingContext.fillStyle = pageGrad;
      p.beginShape();
      p.vertex(w / 2 + 3, 25);
      p.vertex(w - 20, 20);
      p.vertex(w - 20, h - 20);
      p.vertex(w / 2 + 3, h - 25);
      p.endShape(p.CLOSE);
      p.drawingContext.restore();
    } else {
      const pageGrad = p.drawingContext.createLinearGradient(20, 0, w / 2, 0);
      pageGrad.addColorStop(0, '#f5ebd8');
      pageGrad.addColorStop(1, '#e8dcc8');

      p.drawingContext.save();
      p.drawingContext.fillStyle = pageGrad;
      p.beginShape();
      p.vertex(20, 20);
      p.vertex(w / 2 - 3, 25);
      p.vertex(w / 2 - 3, h - 25);
      p.vertex(20, h - 20);
      p.endShape(p.CLOSE);
      p.drawingContext.restore();
    }

    if (progress < 0.5) {
      const backGrad = p.drawingContext.createLinearGradient(foldX, 0, foldX + foldWidth, 0);
      backGrad.addColorStop(0, '#d4c4a8');
      backGrad.addColorStop(1, '#c4b498');

      p.drawingContext.save();
      p.drawingContext.fillStyle = backGrad;
      p.beginShape();
      p.vertex(foldX, 22);
      p.vertex(foldX + foldWidth, 30);
      p.vertex(foldX + foldWidth, h - 30);
      p.vertex(foldX, h - 22);
      p.endShape(p.CLOSE);
      p.drawingContext.restore();
    }

    p.pop();
  }

  private drawGlowBorder(): void {
    const p = this.p;
    const w = this.BOOK_W;
    const h = this.BOOK_H;

    p.drawingContext.save();
    p.drawingContext.globalAlpha = 0.4 + 0.2 * Math.sin(p.millis() / 2000);
    p.noFill();
    p.stroke(180, 200, 255, 150);
    p.strokeWeight(1.5);
    p.drawingContext.shadowBlur = 15;
    p.drawingContext.shadowColor = 'rgba(150, 180, 255, 0.6)';
    p.rect(10, 10, w - 20, h - 20, 6);
    p.drawingContext.restore();
  }

  private drawCornerHint(): void {
    const p = this.p;
    const w = this.BOOK_W;
    const h = this.BOOK_H;
    const t = p.millis() / 1000;
    const pulse = 0.3 + 0.2 * Math.sin(t * 2);

    p.drawingContext.save();
    p.drawingContext.globalAlpha = pulse;
    p.noFill();
    p.stroke(200, 180, 255);
    p.strokeWeight(2);
    p.drawingContext.shadowBlur = 10;
    p.drawingContext.shadowColor = 'rgba(200, 180, 255, 0.8)';

    p.beginShape();
    p.vertex(w - 70, h - 10);
    p.vertex(w - 10, h - 10);
    p.vertex(w - 10, h - 70);
    p.endShape();
    p.drawingContext.restore();

    p.drawingContext.save();
    p.drawingContext.globalAlpha = pulse * 0.8;
    p.fill(200, 180, 255);
    p.textSize(12);
    p.textAlign(p.RIGHT, p.BOTTOM);
    p.text('点击或拖拽翻页 →', w - 25, h - 25);
    p.drawingContext.restore();
  }
}
