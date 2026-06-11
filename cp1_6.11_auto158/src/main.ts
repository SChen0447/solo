import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AuroraSystem, type AuroraParams, type AuroraPreset } from './aurora';
import { Environment } from './environment';
import { UIController } from './ui';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;
  
  private aurora: AuroraSystem;
  private environment: Environment;
  private ui: UIController;
  
  private clock: THREE.Clock;
  private animationId: number | null = null;
  
  private fps: number = 60;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private lowFPSFrames: number = 0;
  private readonly FPS_THRESHOLD: number = 30;
  private readonly LOW_FPS_LIMIT: number = 120;
  
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording: boolean = false;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0e1a);
    
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 20, 50);
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);
    
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 100;
    this.controls.enablePan = false;
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 0.5;
    
    this.environment = new Environment(this.scene);
    this.aurora = new AuroraSystem(this.scene);
    
    const initialParams: AuroraParams = {
      solarWindIntensity: 50,
      magneticInclination: 45,
      atmosphereHeight: 200
    };
    
    this.ui = new UIController(
      document.getElementById('app')!,
      {
        onParamsChange: this.handleParamsChange.bind(this),
        onPresetChange: this.handlePresetChange.bind(this),
        onRecordToggle: this.handleRecordToggle.bind(this)
      },
      initialParams
    );
    
    this.clock = new THREE.Clock();
    
    this.setupEventListeners();
    this.animate();
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private handleParamsChange(params: Partial<AuroraParams>): void {
    this.aurora.setParams(params);
    this.ui.setParams(params);
  }

  private handlePresetChange(preset: AuroraPreset): void {
    this.aurora.applyPreset(preset);
  }

  private handleRecordToggle(): void {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  private startRecording(): void {
    const canvas = this.renderer.domElement;
    
    try {
      const stream = canvas.captureStream(60);
      
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000
      });
      
      this.recordedChunks = [];
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `aurora-recording-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        this.recordedChunks = [];
      };
      
      this.mediaRecorder.start();
      this.isRecording = true;
      this.ui.setRecording(true);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.ui.setRecording(false);
      alert('录制功能不被支持，请使用最新版 Chrome 或 Edge 浏览器');
    }
  }

  private stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.ui.setRecording(false);
    }
  }

  private updateFPS(deltaTime: number): void {
    this.frameCount++;
    this.fpsUpdateTime += deltaTime;
    
    if (this.fpsUpdateTime >= 0.5) {
      this.fps = this.frameCount / this.fpsUpdateTime;
      this.frameCount = 0;
      this.fpsUpdateTime = 0;
      
      this.ui.updateFPS(this.fps);
      this.ui.updateParticleCount(this.aurora.getParticleCount());
      
      this.checkPerformance();
    }
  }

  private checkPerformance(): void {
    if (this.fps < this.FPS_THRESHOLD) {
      this.lowFPSFrames++;
      
      if (this.lowFPSFrames >= this.LOW_FPS_LIMIT && !this.aurora.isPerformanceDegraded()) {
        this.aurora.setPerformanceDegraded(true);
        this.ui.showPerformanceWarning(true);
      }
    } else {
      this.lowFPSFrames = Math.max(0, this.lowFPSFrames - 1);
      
      if (this.lowFPSFrames === 0 && this.aurora.isPerformanceDegraded()) {
        this.aurora.setPerformanceDegraded(false);
        this.ui.showPerformanceWarning(false);
      }
    }
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(this.animate.bind(this));
    
    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();
    
    this.updateFPS(deltaTime);
    
    this.controls.update();
    
    this.aurora.update(deltaTime);
    this.environment.update(elapsedTime);
    
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    
    if (this.isRecording) {
      this.stopRecording();
    }
    
    this.aurora.dispose();
    this.environment.dispose();
    this.ui.dispose();
    this.controls.dispose();
    
    this.renderer.dispose();
    
    window.removeEventListener('resize', this.onWindowResize.bind(this));
  }
}

let app: App;

window.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

export { App };
