import * as THREE from 'three';

export interface SceneSetupResult {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  pickPlane: THREE.Mesh;
  update: (delta: number) => void;
}

export function createScene(container: HTMLElement): SceneSetupResult {
  const scene = new THREE.Scene();

  const w = container.clientWidth;
  const h = container.clientHeight;

  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
  camera.position.set(0, 0, 12);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  renderer.setClearColor(0x0b0a1a, 1);
  container.appendChild(renderer.domElement);

  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = 512;
  bgCanvas.height = 512;
  const bgCtx = bgCanvas.getContext('2d')!;
  const gradient = bgCtx.createRadialGradient(256, 256, 0, 256, 256, 360);
  gradient.addColorStop(0, '#1a0f25');
  gradient.addColorStop(1, '#0b0a1a');
  bgCtx.fillStyle = gradient;
  bgCtx.fillRect(0, 0, 512, 512);
  const bgTexture = new THREE.CanvasTexture(bgCanvas);
  scene.background = bgTexture;

  const starCount = 600;
  const starGeometry = new THREE.BufferGeometry();
  const starPositions = new Float32Array(starCount * 3);
  const starSizes = new Float32Array(starCount);
  const starPhases = new Float32Array(starCount);
  const starSpeeds = new Float32Array(starCount);

  for (let i = 0; i < starCount; i++) {
    const r = 30 + Math.random() * 50;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = r * Math.cos(phi);
    starSizes[i] = 1 + Math.random() * 2;
    starPhases[i] = Math.random() * Math.PI * 2;
    starSpeeds[i] = Math.PI + Math.random() * Math.PI * 2;
  }

  starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('aSize', new THREE.BufferAttribute(starSizes, 1));
  starGeometry.setAttribute('aPhase', new THREE.BufferAttribute(starPhases, 1));
  starGeometry.setAttribute('aSpeed', new THREE.BufferAttribute(starSpeeds, 1));

  const starMaterial = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      attribute float aSpeed;
      uniform float uTime;
      varying float vTwinkle;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float twinkle = 0.5 + 0.5 * sin(uTime * aSpeed + aPhase);
        vTwinkle = twinkle;
        gl_PointSize = aSize * twinkle * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vTwinkle;
      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        if (dist > 0.5) discard;
        float alpha = (1.0 - dist * 2.0) * vTwinkle * 0.8;
        gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const stars = new THREE.Points(starGeometry, starMaterial);
  scene.add(stars);

  const gridHelper = new THREE.GridHelper(12, 12, 0x3355aa, 0x3355aa);
  (gridHelper.material as THREE.Material).opacity = 0.15;
  (gridHelper.material as THREE.Material).transparent = true;
  scene.add(gridHelper);

  const gridHelperY = new THREE.GridHelper(12, 12, 0x3355aa, 0x3355aa);
  gridHelperY.rotation.x = Math.PI / 2;
  (gridHelperY.material as THREE.Material).opacity = 0.15;
  (gridHelperY.material as THREE.Material).transparent = true;
  scene.add(gridHelperY);

  const gridHelperZ = new THREE.GridHelper(12, 12, 0x3355aa, 0x3355aa);
  gridHelperZ.rotation.z = Math.PI / 2;
  (gridHelperZ.material as THREE.Material).opacity = 0.15;
  (gridHelperZ.material as THREE.Material).transparent = true;
  scene.add(gridHelperZ);

  const pickPlaneGeometry = new THREE.PlaneGeometry(50, 50);
  const pickPlaneMaterial = new THREE.MeshBasicMaterial({
    visible: false,
    side: THREE.DoubleSide
  });
  const pickPlane = new THREE.Mesh(pickPlaneGeometry, pickPlaneMaterial);
  pickPlane.position.z = 0;
  scene.add(pickPlane);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const pointLight = new THREE.PointLight(0x88bbff, 1, 100);
  pointLight.position.set(5, 5, 10);
  scene.add(pointLight);

  const update = (delta: number) => {
    starMaterial.uniforms.uTime.value += delta;
  };

  const handleResize = () => {
    const nw = container.clientWidth;
    const nh = container.clientHeight;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
  };
  window.addEventListener('resize', handleResize);

  return { scene, camera, renderer, pickPlane, update };
}
