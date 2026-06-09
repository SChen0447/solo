import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as TWEEN from '@tweenjs/tween.js';
import { MaterialController } from './materialController';
import { GUIController, type GUIParams } from './guiController';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let sphere: THREE.Mesh;
let ground: THREE.Mesh;
let ambientLight: THREE.AmbientLight;
let directionalLight: THREE.DirectionalLight;
let pointLight: THREE.PointLight;
let materialController: MaterialController;
let guiController: GUIController;
let fresnelUniforms: { [key: string]: THREE.IUniform } | null = null;

const clock = new THREE.Clock();
const fpsElement = document.getElementById('fps-counter') as HTMLElement;
let frameCount = 0;
let lastFpsTime = performance.now();

function init() {
  const container = document.getElementById('scene-container') as HTMLElement;
  const panelContent = document.getElementById('panel-content') as HTMLElement;

  scene = new THREE.Scene();

  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = 2;
  bgCanvas.height = 256;
  const bgCtx = bgCanvas.getContext('2d') as CanvasRenderingContext2D;
  const gradient = bgCtx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#1A1A2E');
  gradient.addColorStop(1, '#16213E');
  bgCtx.fillStyle = gradient;
  bgCtx.fillRect(0, 0, 2, 256);
  const bgTexture = new THREE.CanvasTexture(bgCanvas);
  bgTexture.colorSpace = THREE.SRGBColorSpace;
  scene.background = bgTexture;

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(5, 4, 7);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = true;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
  };
  controls.minDistance = 3;
  controls.maxDistance = 25;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.target.set(0, 0.5, 0);
  controls.update();

  setupLights();
  setupGround();
  setupSphere();
  setupEnvironment();

  materialController = new MaterialController();
  sphere.material = materialController.getMaterial();

  guiController = new GUIController(panelContent, handleParamChange);

  window.addEventListener('resize', onWindowResize);
}

function setupLights() {
  ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
  directionalLight.position.set(-6, 8, 5);
  directionalLight.castShadow = true;
  directionalLight.shadow.mapSize.width = 2048;
  directionalLight.shadow.mapSize.height = 2048;
  directionalLight.shadow.camera.near = 0.5;
  directionalLight.shadow.camera.far = 50;
  directionalLight.shadow.camera.left = -10;
  directionalLight.shadow.camera.right = 10;
  directionalLight.shadow.camera.top = 10;
  directionalLight.shadow.camera.bottom = -10;
  directionalLight.shadow.bias = -0.0005;
  directionalLight.shadow.normalBias = 0.02;
  directionalLight.shadow.radius = 6;
  scene.add(directionalLight);

  const pointColor = new THREE.Color('#4A90D9');
  pointLight = new THREE.PointLight(pointColor, 0.8, 30, 2);
  pointLight.position.set(2.5, 1.8, 0);
  pointLight.castShadow = true;
  pointLight.shadow.mapSize.width = 2048;
  pointLight.shadow.mapSize.height = 2048;
  pointLight.shadow.camera.near = 0.1;
  pointLight.shadow.camera.far = 30;
  pointLight.shadow.bias = -0.0005;
  pointLight.shadow.radius = 4;
  scene.add(pointLight);

  const fillLight = new THREE.DirectionalLight(0x8899ff, 0.15);
  fillLight.position.set(4, 2, -4);
  scene.add(fillLight);
}

function setupGround() {
  const groundGeometry = new THREE.PlaneGeometry(40, 40);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x2D2D44,
    transparent: true,
    opacity: 0.5,
    roughness: 0.6,
    metalness: 0.15,
    envMapIntensity: 0.3
  });
  ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -2.0;
  ground.receiveShadow = true;
  scene.add(ground);
}

function setupSphere() {
  const geometry = new THREE.SphereGeometry(2, 128, 128);
  const tempMaterial = new THREE.MeshStandardMaterial({ color: 0xC0A86C });
  sphere = new THREE.Mesh(geometry, tempMaterial);
  sphere.castShadow = true;
  sphere.receiveShadow = true;
  sphere.position.y = 0.5;
  scene.add(sphere);

  attachFresnelEffect();
}

function attachFresnelEffect() {
  const material = sphere.material as THREE.MeshStandardMaterial;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFresnelPower = { value: 2.5 };
    shader.uniforms.uFresnelIntensity = { value: 0.4 };
    shader.uniforms.uRoughness = { value: 0.2 };
    fresnelUniforms = shader.uniforms;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
       varying vec3 vWorldNormal;
       varying vec3 vViewDir;`
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `#include <worldpos_vertex>
       vec4 worldNormal = normalize(modelMatrix * vec4(normal, 0.0));
       vWorldNormal = worldNormal.xyz;
       vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
       vViewDir = normalize(cameraPosition - worldPos);`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
       uniform float uFresnelPower;
       uniform float uFresnelIntensity;
       uniform float uRoughness;
       varying vec3 vWorldNormal;
       varying vec3 vViewDir;`
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
       float fresnelFactor = pow(1.0 - max(dot(normalize(vWorldNormal), normalize(vViewDir)), 0.0), uFresnelPower);
       float roughnessMod = 1.0 - uRoughness * 0.7;
       vec3 fresnelColor = vec3(0.55, 0.75, 1.0) * fresnelFactor * uFresnelIntensity * roughnessMod;
       gl_FragColor.rgb += fresnelColor;`
    );
  };
}

function updateFresnelUniforms(roughness: number) {
  if (fresnelUniforms) {
    fresnelUniforms.uRoughness.value = roughness;
    const intensity = 0.25 + (1.0 - roughness) * 0.45;
    fresnelUniforms.uFresnelIntensity.value = intensity;
    fresnelUniforms.uFresnelPower.value = 2.0 + roughness * 2.0;
  }
}

function setupEnvironment() {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  const envScene = new THREE.Scene();
  const envGeo = new THREE.SphereGeometry(50, 32, 32);

  const envCanvas = document.createElement('canvas');
  envCanvas.width = 512;
  envCanvas.height = 512;
  const ectx = envCanvas.getContext('2d') as CanvasRenderingContext2D;
  const envGrad = ectx.createRadialGradient(256, 180, 20, 256, 256, 320);
  envGrad.addColorStop(0, '#3A4A7A');
  envGrad.addColorStop(0.4, '#1F2A4A');
  envGrad.addColorStop(1, '#0A0F1E');
  ectx.fillStyle = envGrad;
  ectx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 300 + 50;
    const r = Math.random() * 4 + 1;
    const a = Math.random() * 0.5 + 0.3;
    ectx.beginPath();
    ectx.arc(x, y, r, 0, Math.PI * 2);
    ectx.fillStyle = `rgba(200, 220, 255, ${a})`;
    ectx.fill();
  }

  const envTex = new THREE.CanvasTexture(envCanvas);
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  envTex.colorSpace = THREE.SRGBColorSpace;

  const envMesh = new THREE.Mesh(
    envGeo,
    new THREE.MeshBasicMaterial({ map: envTex, side: THREE.BackSide })
  );
  envScene.add(envMesh);

  const envLight1 = new THREE.PointLight(0xffeedd, 1.5, 200);
  envLight1.position.set(30, 40, 20);
  envScene.add(envLight1);
  const envLight2 = new THREE.PointLight(0x6688ff, 0.8, 200);
  envLight2.position.set(-30, 10, -20);
  envScene.add(envLight2);

  const envMap = pmremGenerator.fromScene(envScene, 0.04).texture;
  scene.environment = envMap;

  pmremGenerator.dispose();
}

function hueToColor(hue: number): THREE.Color {
  const color = new THREE.Color();
  color.setHSL(hue / 360, 0.7, 0.58);
  return color;
}

function handleParamChange(params: Partial<GUIParams>) {
  if (params.materialType !== undefined) {
    materialController.applyPreset(params.materialType);
    const mat = materialController.getMaterial();
    updateFresnelUniforms(mat.roughness);
    guiController.setParams({
      roughness: mat.roughness,
      metalness: mat.metalness,
      ior: mat.ior
    });
    return;
  }

  if (params.roughness !== undefined) {
    materialController.setRoughness(params.roughness);
    updateFresnelUniforms(params.roughness);
  }
  if (params.metalness !== undefined) {
    materialController.setMetalness(params.metalness);
  }
  if (params.ior !== undefined) {
    materialController.setIOR(params.ior);
  }
  if (params.ambientIntensity !== undefined) {
    ambientLight.intensity = params.ambientIntensity;
  }
  if (params.directionalIntensity !== undefined) {
    directionalLight.intensity = params.directionalIntensity;
  }
  if (params.pointLightHue !== undefined) {
    pointLight.color.copy(hueToColor(params.pointLightHue));
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateFPS() {
  frameCount++;
  const now = performance.now();
  if (now - lastFpsTime >= 500) {
    const fps = Math.round((frameCount * 1000) / (now - lastFpsTime));
    if (fpsElement) {
      fpsElement.textContent = `FPS: ${fps}`;
    }
    frameCount = 0;
    lastFpsTime = now;
  }
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  TWEEN.update(performance.now());

  const mat = materialController.getMaterial();
  updateFresnelUniforms(mat.roughness);

  controls.update();
  renderer.render(scene, camera);
  updateFPS();
}

init();
animate();
