import { RainController } from './rainController';

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let rainController: RainController;
let mouseX: number = -1000;
let mouseY: number = -1000;
let mouseInCanvas: boolean = false;
let animationId: number;

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (rainController) {
    rainController.resize();
  }
}

function drawCustomCursor(): void {
  if (!mouseInCanvas) return;
  ctx.save();
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 1;
  ctx.shadowBlur = 0;

  ctx.beginPath();
  ctx.arc(mouseX, mouseY, 2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(mouseX - 10, mouseY);
  ctx.lineTo(mouseX - 3, mouseY);
  ctx.moveTo(mouseX + 3, mouseY);
  ctx.lineTo(mouseX + 10, mouseY);
  ctx.moveTo(mouseX, mouseY - 10);
  ctx.lineTo(mouseX, mouseY - 3);
  ctx.moveTo(mouseX, mouseY + 3);
  ctx.lineTo(mouseX, mouseY + 10);
  ctx.stroke();

  ctx.restore();
}

function animate(currentTime: number): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  rainController.update(currentTime);
  rainController.draw(currentTime);

  drawCustomCursor();

  animationId = requestAnimationFrame(animate);
}

function handleMouseMove(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
  rainController.setMousePosition(mouseX, mouseY);
}

function handleMouseEnter(): void {
  mouseInCanvas = true;
}

function handleMouseLeave(): void {
  mouseInCanvas = false;
  rainController.clearMouse();
}

function handleClick(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  rainController.triggerPulse(x, y, performance.now());
}

function init(): void {
  canvas = document.getElementById('rain-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }
  ctx = canvas.getContext('2d')!;
  if (!ctx) {
    console.error('Could not get 2D context');
    return;
  }

  resizeCanvas();
  rainController = new RainController(canvas, ctx);
  rainController.start();

  window.addEventListener('resize', resizeCanvas);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseenter', handleMouseEnter);
  canvas.addEventListener('mouseleave', handleMouseLeave);
  canvas.addEventListener('click', handleClick);

  animationId = requestAnimationFrame(animate);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
