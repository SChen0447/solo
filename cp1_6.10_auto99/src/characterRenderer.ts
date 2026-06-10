import type { ExpressionType, ExpressionWeights } from './faceMeshDetector';

export interface CharacterStatus {
  expression: ExpressionType;
  eyeScale: number;
  mouthCurve: number;
  browAngle: number;
  browYOffset: number;
  cheekBlush: number;
  mouthOpen: number;
}

const TRANSITION_DURATION = 0.3;

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export class CharacterRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private centerX: number = 400;
  private centerY: number = 300;

  private currentStatus: CharacterStatus = {
    expression: 'neutral',
    eyeScale: 1,
    mouthCurve: 0,
    browAngle: 0,
    browYOffset: 0,
    cheekBlush: 0,
    mouthOpen: 0
  };

  private targetStatus: CharacterStatus = {
    expression: 'neutral',
    eyeScale: 1,
    mouthCurve: 0,
    browAngle: 0,
    browYOffset: 0,
    cheekBlush: 0,
    mouthOpen: 0
  };

  private transitionProgress: number = 1;
  private previousStatus: CharacterStatus;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取 Canvas 2D 上下文');
    }
    this.ctx = ctx;
    this.previousStatus = { ...this.currentStatus };
    this.centerX = canvas.width / 2;
    this.centerY = canvas.height / 2;
  }

  setTargetStatus(target: CharacterStatus): void {
    if (this.transitionProgress >= 1) {
      this.previousStatus = { ...this.currentStatus };
    } else {
      this.previousStatus = { ...this.currentStatus };
    }
    this.targetStatus = { ...target };
    this.transitionProgress = 0;
  }

  setTargetFromWeights(weights: ExpressionWeights): void {
    const happy = weights.happy;
    const sad = weights.sad;
    const angry = weights.angry;
    const surprised = weights.surprised;
    const disgusted = weights.disgusted;

    let maxVal = 0;
    let maxExpr: ExpressionType = 'neutral';
    const entries: [ExpressionType, number][] = [
      ['happy', happy], ['sad', sad], ['angry', angry],
      ['surprised', surprised], ['disgusted', disgusted], ['neutral', weights.neutral]
    ];
    entries.forEach(([expr, val]) => {
      if (val > maxVal) {
        maxVal = val;
        maxExpr = expr;
      }
    });

    const eyeScale =
      1 * weights.neutral +
      0.6 * happy +
      0.9 * sad +
      0.85 * angry +
      1.5 * surprised +
      0.8 * disgusted;

    const mouthCurve =
      0 * weights.neutral +
      25 * happy +
      -15 * sad +
      -5 * angry +
      8 * surprised +
      -10 * disgusted;

    const browAngle =
      0 * weights.neutral +
      -3 * happy +
      8 * sad +
      15 * angry +
      -20 * surprised +
      12 * disgusted;

    const browYOffset =
      0 * weights.neutral +
      0 * happy +
      2 * sad +
      6 * angry +
      -14 * surprised +
      3 * disgusted;

    const cheekBlush =
      0 * weights.neutral +
      0.15 * happy +
      0 * sad +
      0 * angry +
      0 * surprised +
      0 * disgusted;

    const mouthOpen =
      0 * weights.neutral +
      0.05 * happy +
      0.02 * sad +
      0 * angry +
      1 * surprised +
      0.2 * disgusted;

    this.setTargetStatus({
      expression: maxExpr,
      eyeScale: Math.max(0.5, Math.min(1.6, eyeScale)),
      mouthCurve: Math.max(-25, Math.min(35, mouthCurve)),
      browAngle: Math.max(-25, Math.min(20, browAngle)),
      browYOffset: Math.max(-15, Math.min(10, browYOffset)),
      cheekBlush: Math.max(0, Math.min(0.4, cheekBlush)),
      mouthOpen: Math.max(0, Math.min(1, mouthOpen))
    });
  }

  drawCharacter(deltaTime: number): void {
    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + deltaTime / TRANSITION_DURATION);
      const t = easeInOut(this.transitionProgress);
      this.currentStatus = this.interpolateStatus(this.previousStatus, this.targetStatus, t);
    }

    this.render();
  }

  private interpolateStatus(from: CharacterStatus, to: CharacterStatus, t: number): CharacterStatus {
    return {
      expression: to.expression,
      eyeScale: from.eyeScale + (to.eyeScale - from.eyeScale) * t,
      mouthCurve: from.mouthCurve + (to.mouthCurve - from.mouthCurve) * t,
      browAngle: from.browAngle + (to.browAngle - from.browAngle) * t,
      browYOffset: from.browYOffset + (to.browYOffset - from.browYOffset) * t,
      cheekBlush: from.cheekBlush + (to.cheekBlush - from.cheekBlush) * t,
      mouthOpen: from.mouthOpen + (to.mouthOpen - from.mouthOpen) * t
    };
  }

  private render(): void {
    const ctx = this.ctx;
    const cx = this.centerX;
    const cy = this.centerY;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const bgGradient = ctx.createRadialGradient(cx, cy - 50, 50, cx, cy, 500);
    bgGradient.addColorStop(0, '#f0e6d3');
    bgGradient.addColorStop(1, '#e8d5b7');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawHead(cx, cy);
    this.drawCheeks(cx, cy);
    this.drawEyes(cx, cy);
    this.drawBrows(cx, cy);
    this.drawMouth(cx, cy);
  }

  private drawHead(cx: number, cy: number): void {
    const ctx = this.ctx;
    const headRadius = 120;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, headRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffdab9';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, headRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fill();
    ctx.restore();
  }

  private drawCheeks(cx: number, cy: number): void {
    const ctx = this.ctx;
    const blushAlpha = this.currentStatus.cheekBlush;
    if (blushAlpha <= 0.01) return;

    ctx.save();
    const blushY = cy + 20;
    const blushXOffset = 65;
    const blushRadius = 30;

    ctx.globalAlpha = blushAlpha;
    ctx.fillStyle = '#ff99aa';

    ctx.beginPath();
    ctx.arc(cx - blushXOffset, blushY, blushRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx + blushXOffset, blushY, blushRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawEyes(cx: number, cy: number): void {
    const ctx = this.ctx;
    const eyeScale = this.currentStatus.eyeScale;

    const baseEyeW = 30;
    const baseEyeH = 40;
    const eyeW = baseEyeW * Math.min(1, eyeScale);
    const eyeH = baseEyeH * eyeScale;
    const pupilR = Math.max(4, 12 * eyeScale);

    const eyeY = cy - 20;
    const leftEyeX = cx - 45;
    const rightEyeX = cx + 45;

    ctx.save();

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.ellipse(leftEyeX, eyeY, eyeW / 2, eyeH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(rightEyeX, eyeY, eyeW / 2, eyeH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.arc(leftEyeX, eyeY, pupilR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rightEyeX, eyeY, pupilR, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    const highlightR = 4;
    ctx.beginPath();
    ctx.arc(leftEyeX + pupilR * 0.35, eyeY - pupilR * 0.35, highlightR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rightEyeX + pupilR * 0.35, eyeY - pupilR * 0.35, highlightR, 0, Math.PI * 2);
    ctx.fill();

    if (eyeScale < 0.75) {
      ctx.strokeStyle = '#8B7355';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(leftEyeX - eyeW / 2, eyeY);
      ctx.quadraticCurveTo(leftEyeX, eyeY - 4, leftEyeX + eyeW / 2, eyeY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(rightEyeX - eyeW / 2, eyeY);
      ctx.quadraticCurveTo(rightEyeX, eyeY - 4, rightEyeX + eyeW / 2, eyeY);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawBrows(cx: number, cy: number): void {
    const ctx = this.ctx;
    const browAngle = (this.currentStatus.browAngle * Math.PI) / 180;
    const browYOffset = this.currentStatus.browYOffset;

    const browY = cy - 60 + browYOffset;
    const browLength = 60;
    const browWidth = 4;
    const leftBrowX = cx - 45;
    const rightBrowX = cx + 45;

    ctx.save();
    ctx.strokeStyle = '#8B7355';
    ctx.lineWidth = browWidth;
    ctx.lineCap = 'round';

    ctx.translate(leftBrowX, browY);
    ctx.rotate(-browAngle);
    ctx.beginPath();
    ctx.moveTo(-browLength / 2, 0);
    ctx.quadraticCurveTo(0, -4, browLength / 2, 0);
    ctx.stroke();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.translate(rightBrowX, browY);
    ctx.rotate(browAngle);
    ctx.beginPath();
    ctx.moveTo(-browLength / 2, 0);
    ctx.quadraticCurveTo(0, -4, browLength / 2, 0);
    ctx.stroke();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.restore();
  }

  private drawMouth(cx: number, cy: number): void {
    const ctx = this.ctx;
    const mouthCurve = this.currentStatus.mouthCurve;
    const mouthOpen = this.currentStatus.mouthOpen;

    const mouthY = cy + 50;
    const mouthHalfWidth = 40;

    ctx.save();

    if (mouthOpen > 0.15) {
      const openHeight = 10 + 25 * mouthOpen;
      ctx.fillStyle = '#cc3344';
      ctx.beginPath();
      ctx.ellipse(cx, mouthY, mouthHalfWidth, openHeight / 2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff6b7a';
      ctx.beginPath();
      ctx.ellipse(cx, mouthY - openHeight * 0.2, mouthHalfWidth * 0.7, openHeight * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(cx, mouthY, mouthHalfWidth, openHeight / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const curveAmount = mouthCurve;
      const controlY = mouthY - curveAmount;

      ctx.strokeStyle = '#8B4513';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(cx - mouthHalfWidth, mouthY);
      ctx.quadraticCurveTo(cx, controlY, cx + mouthHalfWidth, mouthY);
      ctx.stroke();

      if (this.currentStatus.expression === 'angry') {
        ctx.beginPath();
        ctx.moveTo(cx - mouthHalfWidth * 0.8, mouthY);
        ctx.quadraticCurveTo(cx, mouthY + 8, cx + mouthHalfWidth * 0.8, mouthY);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}
