import * as THREE from 'three';
import { Sandglass } from './sandglass';
import { ParticleSystem } from './particleSystem';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private uiCanvas: HTMLCanvasElement;
  private uiCtx: CanvasRenderingContext2D;
  private resetBtn: HTMLButtonElement;

  private sandglass: Sandglass;
  private particleSystem: ParticleSystem;

  private clock: THREE.Clock;
  private frameCount: number = 0;
  private lastFpsTime: number = 0;
  private fps: number = 60;

  private readonly nearPlane: number = 0.1;
  private readonly farPlane: number = 100;
  private readonly cameraDistance: number = 7;

  constructor() {
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      this.nearPlane,
      this.farPlane
    );
    this.camera.position.set(0, 0, this.cameraDistance);
    this.camera.lookAt(0, 0, 0);

    const mainCanvas = document.createElement('canvas');
    document.body.insertBefore(mainCanvas, document.body.firstChild);

    this.renderer = new THREE.WebGLRenderer({
      canvas: mainCanvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 1);

    this.uiCanvas = document.getElementById('ui-canvas') as HTMLCanvasElement;
    this.uiCtx = this.uiCanvas.getContext('2d')!;
    this.resizeUiCanvas();

    this.resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

    this.setupLights();

    this.sandglass = new Sandglass();
    this.scene.add(this.sandglass.group);

    this.particleSystem = new ParticleSystem();
    this.scene.add(this.particleSystem.group);

    this.sandglass.attachMouseListeners(mainCanvas);

    this.attachEventListeners();

    this.animate = this.animate.bind(this);
    this.animate();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xaaccff, 1.0);
    keyLight.position.set(5, 5, 5);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffccaa, 0.5);
    fillLight.position.set(-5, -3, -3);
    this.scene.add(fillLight);

    const pointLight1 = new THREE.PointLight(0x88aaff, 1.5, 15, 2);
    pointLight1.position.set(0, 3, 0);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xffaa88, 1.2, 15, 2);
    pointLight2.position.set(0, -3, 0);
    this.scene.add(pointLight2);
  }

  private attachEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());
    this.resetBtn.addEventListener('click', () => {
      this.particleSystem.resetAllColors();
    });
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.resizeUiCanvas();
  }

  private resizeUiCanvas(): void {
    this.uiCanvas.width = window.innerWidth;
    this.uiCanvas.height = window.innerHeight;
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private drawUI(): void {
    const ctx = this.uiCtx;
    ctx.clearRect(0, 0, this.uiCanvas.width, this.uiCanvas.height);

    const centerX = this.uiCanvas.width / 2;
    const topY = 30;

    const rotationDeg = this.sandglass.getRotationDegrees();
    const particleCount = this.particleSystem.totalSandCount;
    const gravityStr = this.sandglass.gravityMagnitude.toFixed(4);

    const topText = `翻转角度: ${rotationDeg}°  |  粒子总数: ${particleCount}`;
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const topMetrics = ctx.measureText(topText);
    const topBoxW = topMetrics.width + 40;
    const topBoxH = 38;
    const topBoxX = centerX - topBoxW / 2;
    const topBoxY = topY - topBoxH / 2 + 8;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.drawRoundedRect(ctx, topBoxX, topBoxY, topBoxW, topBoxH, 8);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(topText, centerX, topBoxY + topBoxH / 2);

    const gravityText = `重力: ${gravityStr}/帧`;
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const gravMetrics = ctx.measureText(gravityText);
    const gravBoxW = gravMetrics.width + 24;
    const gravBoxH = 30;
    const gravBoxX = this.uiCanvas.width - gravBoxW - 20;
    const gravBoxY = 20;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.drawRoundedRect(ctx, gravBoxX, gravBoxY, gravBoxW, gravBoxH, 8);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(gravityText, gravBoxX + gravBoxW / 2, gravBoxY + gravBoxH / 2);
  }

  private animate(): void {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.05);

    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
      this.frameCount = 0;
      this.lastFpsTime = now;
    }

    this.sandglass.update(dt);
    this.particleSystem.update(dt, this.sandglass);

    this.renderer.render(this.scene, this.camera);

    this.drawUI();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
