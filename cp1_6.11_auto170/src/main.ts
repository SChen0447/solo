import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { StringSystem, ResonanceEvent } from './StringSystem';
import { ParticleManager } from './ParticleManager';
import { ControlPanel, ControlParams, RecordingData } from './ControlPanel';
import { EffectsManager } from './EffectsManager';

export let scene: THREE.Scene;
export let camera: THREE.PerspectiveCamera;
export let renderer: THREE.WebGLRenderer;

interface RecordingFrame {
  frame: number;
  timestamp: number;
  stringVibrations: Array<{
    stringId: number;
    amplitude: number;
    positions: number[];
  }>;
  particlePositions: Array<{
    type: 'pluck' | 'resonance';
    x: number;
    y: number;
    z: number;
    r: number;
    g: number;
    b: number;
  }>;
}

interface RecordingDataExport {
  version: '1.0';
  duration: number;
  fps: 60;
  totalFrames: number;
  paramsAtRecord: ControlParams;
  frames: RecordingFrame[];
}

const app = document.getElementById('app')!;

scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050a1a, 0.02);

camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 2, 14);

renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x404060, 0.4);
scene.add(ambientLight);

const lightA = new THREE.PointLight(0x8899ff, 1.2, 50);
lightA.position.set(-8, 5, 8);
scene.add(lightA);

const lightB = new THREE.PointLight(0xff88aa, 0.8, 40);
lightB.position.set(8, -3, 6);
scene.add(lightB);

const lightC = new THREE.PointLight(0x66ffff, 0.6, 35);
lightC.position.set(0, 10, -5);
scene.add(lightC);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, -3);
controls.enableDamping = true;
controls.dampingFactor = 0.1;
controls.minDistance = 5;
controls.maxDistance = 35;
controls.maxPolarAngle = Math.PI * 0.85;
controls.minPolarAngle = Math.PI * 0.15;
controls.enablePan = false;

const stringSystem = new StringSystem(scene);
const particleManager = new ParticleManager(scene);
const controlPanel = new ControlPanel();
const effectsManager = new EffectsManager(scene);

effectsManager.setCouplingLines(stringSystem.couplingLines);
effectsManager.setStringGroup(stringSystem.stringGroup);

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let mouseDown = false;
let mouseDownTime = 0;
const mouseDownPos = new THREE.Vector2();

function onPointerDown(event: PointerEvent): void {
  mouseDown = true;
  mouseDownTime = performance.now();
  mouseDownPos.set(event.clientX, event.clientY);
}

function onPointerUp(event: PointerEvent): void {
  if (!mouseDown) return;
  mouseDown = false;

  const now = performance.now();
  const dt = now - mouseDownTime;
  const dx = event.clientX - mouseDownPos.x;
  const dy = event.clientY - mouseDownPos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dt > 300 || dist > 5) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const meshes = stringSystem.getAllMeshes();
  const intersects = raycaster.intersectObjects(meshes, false);

  if (intersects.length > 0) {
    stringSystem.handleClick(intersects[0]);
  }
}

renderer.domElement.addEventListener('pointerdown', onPointerDown);
renderer.domElement.addEventListener('pointerup', onPointerUp);

stringSystem.onStringPlucked = (
  stringId: number,
  position: THREE.Vector3,
  color: THREE.Color,
  normal: THREE.Vector3
) => {
  const params = controlPanel.getParams();
  particleManager.emitPluckParticles(position, normal, color, stringId, params.tension);
};

stringSystem.onResonanceDetected = (events: ResonanceEvent[]) => {
  effectsManager.handleResonanceEvents(events);

  for (const event of events) {
    particleManager.emitResonanceRing(
      event.midpoint,
      event.colorA,
      event.colorB,
      event.strength
    );
  }
};

controlPanel.onReset = () => {
  stringSystem.resetAll();
  particleManager.clearAll();
  effectsManager.reset();
};

let isRecording = false;
let recordingFrames: RecordingFrame[] = [];
let recordingStartTime = 0;
let recordingFrameCount = 0;
const RECORDING_TARGET_FRAMES = 60;
const RECORDING_DURATION = 3000;

controlPanel.onRecordStart = () => {
  isRecording = true;
  recordingFrames = [];
  recordingStartTime = performance.now();
  recordingFrameCount = 0;
};

function completeRecording(): void {
  if (!isRecording) return;
  isRecording = false;

  const data: RecordingDataExport = {
    version: '1.0',
    duration: RECORDING_DURATION / 1000,
    fps: 60,
    totalFrames: recordingFrames.length,
    paramsAtRecord: controlPanel.getParams(),
    frames: recordingFrames,
  };

  const json = JSON.stringify(data, null, 0);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  a.download = `aurora-strings-recording-${timestamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);

  controlPanel.stopRecording();
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const clock = new THREE.Clock();
let lastFrameCaptureTime = 0;
const FRAME_INTERVAL = 1000 / 60;

function animate(): void {
  requestAnimationFrame(animate);

  const delta = Math.min(0.05, clock.getDelta());
  const time = clock.getElapsedTime();
  const now = performance.now();

  const params = controlPanel.getParams();

  stringSystem.update(time, delta, params.tension, params.damping, params.resonanceSensitivity);

  const effectsResult = effectsManager.update(delta, time);

  particleManager.update(delta, time, effectsResult.rotationBoost);

  if (effectsResult.nebulaShiftAmount > 0.01) {
    particleManager.shiftNebulaColors(
      effectsResult.nebulaColorShift,
      effectsResult.nebulaShiftAmount * delta * 2
    );
  }

  if (isRecording) {
    const elapsed = now - recordingStartTime;
    const shouldCapture = now - lastFrameCaptureTime >= FRAME_INTERVAL;

    if (shouldCapture && recordingFrameCount < RECORDING_TARGET_FRAMES) {
      lastFrameCaptureTime = now;
      recordingFrameCount++;

      const stringData = stringSystem.getVibratingStringsForRecording();
      const particleData = particleManager.getActiveParticlesForRecording();

      const frame: RecordingFrame = {
        frame: recordingFrameCount,
        timestamp: elapsed,
        stringVibrations: stringData.map(s => ({
          stringId: s.id,
          amplitude: s.amplitude,
          positions: s.positions,
        })),
        particlePositions: particleData,
      };

      recordingFrames.push(frame);
    }

    if (elapsed >= RECORDING_DURATION || recordingFrameCount >= RECORDING_TARGET_FRAMES) {
      completeRecording();
    }
  }

  lightA.position.x = Math.sin(time * 0.3) * 10;
  lightA.position.z = Math.cos(time * 0.25) * 10 + 5;
  lightB.position.x = Math.cos(time * 0.35) * 9;
  lightB.position.y = Math.sin(time * 0.3) * 6;

  controls.update();
  renderer.render(scene, camera);
}

animate();
