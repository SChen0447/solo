import * as THREE from 'three';
import { HandTracker, type HandData } from './handTracker';
import { AudioAnalyzer, type AudioFrequencyData } from './audioAnalyzer';
import { ParticleSystem, type MotionMode } from './particleSystem';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let particleSystem: ParticleSystem;
let handTracker: HandTracker;
let audioAnalyzer: AudioAnalyzer;
let clock: THREE.Clock;

const currentHandData: HandData = {
  detected: false,
  palm: { x: 0, y: 0, z: 0 },
  fingertips: []
};

const currentAudioData: AudioFrequencyData = {
  low: 0,
  mid: 0,
  high: 0
};

let currentMode: MotionMode = 1;

function init(): void {
  const container = document.getElementById('canvas-container');
  if (!container) {
    console.error('Canvas container not found');
    return;
  }

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0a2e, 0.003);

  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(0, 0, 250);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  particleSystem = new ParticleSystem(camera);
  scene.add(particleSystem.group);

  clock = new THREE.Clock();

  const videoElement = document.getElementById('camera-video') as HTMLVideoElement;
  handTracker = new HandTracker(videoElement, (data: HandData) => {
    Object.assign(currentHandData, data);
  });

  audioAnalyzer = new AudioAnalyzer((data: AudioFrequencyData) => {
    Object.assign(currentAudioData, data);
  });

  setupUI();
  setupKeyboard();
  window.addEventListener('resize', onResize);

  animate();
}

function setupUI(): void {
  const cameraToggle = document.getElementById('camera-toggle');
  const audioUpload = document.getElementById('audio-upload') as HTMLInputElement;
  const resetBtn = document.getElementById('reset-btn');
  const mode1Btn = document.getElementById('mode-1');
  const mode2Btn = document.getElementById('mode-2');
  const mode3Btn = document.getElementById('mode-3');
  const menuToggle = document.getElementById('menu-toggle');
  const controlPanel = document.getElementById('control-panel');

  if (cameraToggle) {
    cameraToggle.addEventListener('click', async () => {
      if (handTracker.active) {
        handTracker.stop();
        cameraToggle.classList.remove('active');
      } else {
        try {
          await handTracker.start();
          cameraToggle.classList.add('active');
        } catch (err) {
          console.error('启动摄像头失败:', err);
        }
      }
      triggerShake(cameraToggle);
    });
  }

  if (audioUpload) {
    audioUpload.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files && target.files[0];
      if (file) {
        try {
          await audioAnalyzer.startFile(file);
        } catch (err) {
          console.error('音频加载失败:', err);
        }
      }
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      particleSystem.reset();
      triggerShake(resetBtn);
    });
  }

  const modeButtons: [HTMLElement | null, MotionMode][] = [
    [mode1Btn, 1],
    [mode2Btn, 2],
    [mode3Btn, 3]
  ];

  modeButtons.forEach(([btn, mode]) => {
    if (btn) {
      btn.addEventListener('click', () => {
        setMode(mode);
        triggerShake(btn);
      });
    }
  });

  if (menuToggle && controlPanel) {
    menuToggle.addEventListener('click', () => {
      controlPanel.classList.toggle('open');
      triggerShake(menuToggle);
    });
  }
}

function setMode(mode: MotionMode): void {
  currentMode = mode;
  particleSystem.setMotionMode(mode);

  (['mode-1', 'mode-2', 'mode-3'] as const).forEach((id, idx) => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.classList.toggle('active', idx + 1 === mode);
    }
  });

  const indicator = document.getElementById('mode-indicator');
  if (indicator) {
    const modeNames: Record<MotionMode, string> = {
      1: '正常模式',
      2: '呼吸模式',
      3: '狂暴模式'
    };
    indicator.textContent = `当前模式: ${modeNames[mode]} | 按 R 重置 | 按 1-3 切换模式 | 拖拽旋转 | 滚轮缩放`;
  }
}

function triggerShake(element: HTMLElement): void {
  element.style.animation = 'none';
  void element.offsetWidth;
  element.style.animation = '';
}

function setupKeyboard(): void {
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'r') {
      particleSystem.reset();
    } else if (e.key === '1') {
      setMode(1);
    } else if (e.key === '2') {
      setMode(2);
    } else if (e.key === '3') {
      setMode(3);
    }
  });
}

function onResize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(): void {
  requestAnimationFrame(animate);

  const deltaTime = Math.min(clock.getDelta(), 0.05);

  particleSystem.setHandData(currentHandData);
  particleSystem.setAudioData(currentAudioData);
  particleSystem.update(deltaTime);

  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
}

window.addEventListener('DOMContentLoaded', init);
