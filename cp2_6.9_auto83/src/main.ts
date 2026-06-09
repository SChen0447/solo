import * as THREE from 'three';
import * as TWEEN from '@tweenjs/tween.js';
import { GUI } from 'dat.gui';
import { FlowField, FlowFieldParams } from './flowField';
import { CloudParticles } from './cloudParticles';
import { FlyControls } from './flyControls';

class StormCloudApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  
  private flowField: FlowField;
  private cloudParticles: CloudParticles;
  private flyControls: FlyControls;
  private rainCurtain: THREE.Mesh | null = null;
  private rainCurtainMaterial: THREE.ShaderMaterial | null = null;
  
  private gui: GUI;
  private flowParams: FlowFieldParams;
  
  private clock: THREE.Clock;
  private fpsFrames: number = 0;
  private fpsTime: number = 0;
  private currentFps: number = 60;
  
  private hudHeight: HTMLElement;
  private hudParticles: HTMLElement;
  private hudFps: HTMLElement;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    
    this.flowParams = {
      updraftStrength: 2.0,
      turbulenceStrength: 1.0,
      shearStrength: 0.8
    };

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    
    this.flowField = new FlowField(this.flowParams);
    this.cloudParticles = new CloudParticles(40000, this.flowField);
    this.scene.add(this.cloudParticles.getPoints());
    
    this.createRainCurtain();
    
    this.flyControls = new FlyControls(this.camera, this.renderer.domElement);
    this.camera.position.set(0, 2.5, 10);
    this.camera.lookAt(0, 2.5, 0);
    
    this.gui = this.createGUI();
    this.applyGUIStyles();
    
    this.clock = new THREE.Clock();
    
    this.hudHeight = document.getElementById('hud-height')!;
    this.hudParticles = document.getElementById('hud-particles')!;
    this.hudFps = document.getElementById('hud-fps')!;
    
    window.addEventListener('resize', this.onWindowResize);
    
    this.animate();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 2);
    gradient.addColorStop(0, '#1A1A2E');
    gradient.addColorStop(1, '#0D0D1A');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 2);
    const bgTexture = new THREE.CanvasTexture(canvas);
    scene.background = bgTexture;
    
    const ambientLight = new THREE.AmbientLight(0x404060, 0.5);
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0x87CEEB, 0.8, 20);
    pointLight.position.set(0, 4, 0);
    scene.add(pointLight);
    
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      100
    );
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    renderer.setClearColor(0x0D0D1A, 1);
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createRainCurtain(): void {
    const rainVertexShader = `
      varying vec2 vUv;
      varying float vHeight;
      uniform float uTime;
      uniform float uDensity;
      uniform float uAngle;
      
      void main() {
        vUv = uv;
        vHeight = position.y;
        
        vec3 pos = position;
        float offset = sin(uTime * 2.0 + position.x * 10.0) * 0.02 * uAngle;
        pos.x += offset * (1.0 - position.y);
        pos.z += offset * 0.5 * (1.0 - position.y);
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `;

    const rainFragmentShader = `
      varying vec2 vUv;
      varying float vHeight;
      uniform float uTime;
      uniform float uDensity;
      
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      
      void main() {
        float rainLines = 0.0;
        float lineCount = 80.0 * uDensity;
        float lineSpacing = 1.0 / lineCount;
        
        float lineX = floor(vUv.x * lineCount) / lineCount;
        float lineOffset = hash(vec2(lineX * 100.0, 0.0)) * 0.5;
        
        float y = vUv.y + uTime * 0.5 + lineOffset;
        y = fract(y);
        
        float lineWidth = 0.003 * uDensity;
        float lineHeight = 0.08;
        
        float distX = abs(vUv.x - (lineX + lineSpacing * 0.5));
        float inLineX = smoothstep(lineWidth, 0.0, distX);
        
        float inLineY = step(0.0, y) * step(y, lineHeight);
        
        float intensity = hash(vec2(lineX * 50.0, floor(y * 20.0))) * 0.5 + 0.5;
        
        rainLines = inLineX * inLineY * intensity;
        
        float alpha = rainLines * 0.2 * uDensity;
        alpha *= (1.0 - smoothstep(0.0, 0.3, vHeight));
        alpha *= smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
        
        vec3 color = vec3(0.53, 0.81, 0.92);
        
        gl_FragColor = vec4(color, alpha);
      }
    `;

    this.rainCurtainMaterial = new THREE.ShaderMaterial({
      vertexShader: rainVertexShader,
      fragmentShader: rainFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uDensity: { value: 1.0 },
        uAngle: { value: 0.5 }
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });

    const geometry = new THREE.PlaneGeometry(8, 0.5, 100, 5);
    this.rainCurtain = new THREE.Mesh(geometry, this.rainCurtainMaterial);
    this.rainCurtain.position.set(0, 0.25, 0);
    this.rainCurtain.rotation.x = -Math.PI * 0.15;
    this.scene.add(this.rainCurtain);
  }

  private createGUI(): GUI {
    const gui = new GUI();
    gui.width = 300;
    
    const flowFolder = gui.addFolder('气流参数');
    flowFolder.add(this.flowParams, 'updraftStrength', 0, 5, 0.1)
      .name('上升气流强度')
      .onChange((value: number) => {
        this.flowField.updateParams({ updraftStrength: value });
        this.updateRainCurtain();
      });
    
    flowFolder.add(this.flowParams, 'turbulenceStrength', 0, 5, 0.1)
      .name('湍流强度')
      .onChange((value: number) => {
        this.flowField.updateParams({ turbulenceStrength: value });
      });
    
    flowFolder.add(this.flowParams, 'shearStrength', 0, 5, 0.1)
      .name('水平切变强度')
      .onChange((value: number) => {
        this.flowField.updateParams({ shearStrength: value });
        this.updateRainCurtain();
      });

    const cameraFolder = gui.addFolder('视角控制');
    cameraFolder.add({
      reset: () => this.flyControls.resetView()
    }, 'reset').name('重置视角');

    const viewFolder = gui.addFolder('显示选项');
    viewFolder.add({ showRain: true }, 'showRain')
      .name('显示雨幕')
      .onChange((value: boolean) => {
        if (this.rainCurtain) {
          this.rainCurtain.visible = value;
        }
      });

    flowFolder.open();
    
    return gui;
  }

  private applyGUIStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .dg.ac {
        z-index: 1000 !important;
      }
      .dg.main {
        font-family: 'Fira Code', monospace !important;
      }
      .dg .c {
        background-color: #2A2A3A !important;
        border-radius: 4px !important;
      }
      .dg .slider {
        background-color: #3A3A4A !important;
        border-radius: 4px !important;
      }
      .dg .slider-fg {
        background: linear-gradient(90deg, #4A90D9, #9370DB) !important;
        border-radius: 4px !important;
      }
      .dg .c input[type=text] {
        background-color: #2A2A3A !important;
        color: #E0E0E0 !important;
        border-radius: 4px !important;
        padding: 2px 6px !important;
      }
      .dg .property-name {
        color: #E0E0E0 !important;
      }
      .dg .c select {
        background-color: #2A2A3A !important;
        color: #E0E0E0 !important;
        border-radius: 4px !important;
      }
      .dg li:not(.folder) {
        background: #1F1F2E !important;
        border-bottom: 1px solid #2A2A3A !important;
        border-radius: 4px !important;
        margin: 2px 0 !important;
      }
      .dg li.title {
        background: linear-gradient(90deg, #2A2A3A, #3A3A5A) !important;
        color: #87CEEB !important;
        font-weight: 600 !important;
        border-radius: 4px !important;
      }
      .dg .close-button {
        background: #2A2A3A !important;
        color: #E0E0E0 !important;
        border-radius: 4px !important;
      }
      .dg .button {
        background: linear-gradient(135deg, #4A90D9, #9370DB) !important;
        color: white !important;
        border-radius: 4px !important;
        transition: all 0.2s ease !important;
      }
      .dg .button:hover {
        filter: brightness(1.2) !important;
      }
      .dg li.cr:hover {
        background: #2F2F3F !important;
      }
    `;
    document.head.appendChild(style);
    
    const mainContainer = document.querySelector('.dg.ac') as HTMLElement | null;
    if (mainContainer) {
      mainContainer.style.background = 'transparent';
    }
  }

  private updateRainCurtain(): void {
    if (!this.rainCurtainMaterial) return;
    const density = Math.max(0.3, 1.0 - this.flowParams.updraftStrength * 0.15);
    const angle = 0.3 + this.flowParams.shearStrength * 0.2;
    this.rainCurtainMaterial.uniforms.uDensity.value = density;
    this.rainCurtainMaterial.uniforms.uAngle.value = angle;
  }

  private onWindowResize = (): void => {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  };

  private updateHUD(deltaTime: number): void {
    this.fpsFrames++;
    this.fpsTime += deltaTime;
    if (this.fpsTime >= 0.5) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsTime);
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }

    const height = this.flyControls.getHeight();
    this.hudHeight.textContent = height.toFixed(2) + ' u';
    
    const particleCount = this.cloudParticles.getCount();
    this.hudParticles.textContent = particleCount.toLocaleString();
    
    this.hudFps.textContent = `${this.currentFps} FPS`;
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const deltaTime = this.clock.getDelta();
    
    TWEEN.update();
    
    this.flowField.update(deltaTime);
    this.cloudParticles.update(deltaTime);
    this.flyControls.update(deltaTime);
    
    if (this.rainCurtainMaterial) {
      this.rainCurtainMaterial.uniforms.uTime.value += deltaTime;
    }
    
    this.updateHUD(deltaTime);
    
    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    window.removeEventListener('resize', this.onWindowResize);
    this.flyControls.dispose();
    this.cloudParticles.dispose();
    if (this.rainCurtain) {
      this.rainCurtain.geometry.dispose();
      (this.rainCurtain.material as THREE.Material).dispose();
    }
    this.gui.destroy();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new StormCloudApp();
  (window as unknown as { stormCloudApp: StormCloudApp }).stormCloudApp = app;
});
