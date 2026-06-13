export class CrystalBall {
  private glowIntensity = 0;
  private targetGlow = 0;
  private breathPhase = 0;

  drawBody(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number,
    elapsedMs: number,
    dominantColor: string
  ): void {
    this.breathPhase = (elapsedMs % 8000) / 8000;
    const breathAlpha = 0.115 + 0.035 * Math.sin(this.breathPhase * Math.PI * 2);

    ctx.save();
    ctx.translate(centerX, centerY);

    if (this.glowIntensity > 0.01) {
      ctx.shadowBlur = 20 * this.glowIntensity;
      ctx.shadowColor = dominantColor.replace(')', `, ${0.3 * this.glowIntensity})`).replace('hsl(', 'hsla(');
      ctx.beginPath();
      ctx.arc(0, 0, radius + 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    const bodyGrad = ctx.createRadialGradient(
      -radius * 0.15, -radius * 0.15, 0,
      0, 0, radius
    );
    bodyGrad.addColorStop(0, `rgba(255, 255, 255, ${breathAlpha})`);
    bodyGrad.addColorStop(0.6, `rgba(180, 190, 240, ${breathAlpha * 0.5})`);
    bodyGrad.addColorStop(1, `rgba(102, 126, 234, 0.05)`);

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(102, 126, 234, ${0.15 + 0.05 * Math.sin(this.breathPhase * Math.PI * 2)})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }

  drawHighlight(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    radius: number
  ): void {
    ctx.save();
    ctx.translate(centerX, centerY);

    const hlGrad = ctx.createRadialGradient(
      -radius * 0.3, -radius * 0.35, 0,
      -radius * 0.3, -radius * 0.35, radius * 0.45
    );
    hlGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    hlGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.04)');
    hlGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = hlGrad;
    ctx.fill();

    const specGrad = ctx.createRadialGradient(
      -radius * 0.35, -radius * 0.4, 0,
      -radius * 0.35, -radius * 0.4, radius * 0.12
    );
    specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.beginPath();
    ctx.arc(-radius * 0.35, -radius * 0.4, radius * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = specGrad;
    ctx.fill();

    ctx.restore();
  }

  setHovering(isHovering: boolean): void {
    this.targetGlow = isHovering ? 1 : 0;
  }

  updateGlow(dt: number): void {
    const speed = this.targetGlow > this.glowIntensity ? 3 : 1;
    const diff = this.targetGlow - this.glowIntensity;
    this.glowIntensity += diff * Math.min(1, (dt / 1000) * speed);
    if (Math.abs(diff) < 0.001) this.glowIntensity = this.targetGlow;
  }

  getGlowIntensity(): number {
    return this.glowIntensity;
  }
}
