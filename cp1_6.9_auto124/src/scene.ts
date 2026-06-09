import * as THREE from 'three';

export interface SceneSetup {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  ambientLight: THREE.AmbientLight;
  moon: THREE.Mesh;
  perches: THREE.Vector3[];
  stars: THREE.Points;
  container: HTMLElement;
}

export function setupScene(container: HTMLElement): SceneSetup {
  const width = container.clientWidth || 1000;
  const height = container.clientHeight || 700;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050a10);
  scene.fog = new THREE.FogExp2(0x050a10, 0.02);

  const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 200);
  camera.position.set(0, 8, 18);
  camera.lookAt(0, 3, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0x404060, 0.2);
  scene.add(ambientLight);

  const moonGeometry = new THREE.SphereGeometry(1.2, 32, 32);
  const moonMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffee,
    transparent: true,
    opacity: 0.9
  });
  const moon = new THREE.Mesh(moonGeometry, moonMaterial);
  moon.position.set(15, 18, -12);
  scene.add(moon);

  createGround(scene);
  const perches = createTrees(scene);
  const stars = createStars(scene);

  const handleResize = () => {
    const w = container.clientWidth || 1000;
    const h = container.clientHeight || 700;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', handleResize);

  return { scene, camera, renderer, ambientLight, moon, perches, stars, container };
}

function createGround(scene: THREE.Scene): void {
  const geometry = new THREE.PlaneGeometry(60, 60, 50, 50);
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const colorStart = new THREE.Color(0x0d2a1a);
  const colorEnd = new THREE.Color(0x1a3a2a);

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const dist = Math.sqrt(x * x + y * y) / 42.4;
    const t = Math.min(1, Math.max(0, dist));
    const color = colorStart.clone().lerp(colorEnd, t);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.0,
    flatShading: true
  });

  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
}

function createTrees(scene: THREE.Scene): THREE.Vector3[] {
  const perches: THREE.Vector3[] = [];
  const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.2, 1, 8);
  const foliageGeometry = new THREE.ConeGeometry(1.2, 2.5, 8);
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a3a2a,
    roughness: 0.95,
    metalness: 0.0
  });
  const foliageMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a5a3a,
    roughness: 0.9,
    metalness: 0.0,
    flatShading: true
  });
  const perchMaterial = new THREE.MeshBasicMaterial({
    color: 0xffdd44,
    transparent: true,
    opacity: 0.35
  });

  const treePositions: { x: number; z: number }[] = [];
  const minDist = 3.5;

  for (let i = 0; i < 20; i++) {
    let attempts = 0;
    let x = 0, z = 0;
    while (attempts < 50) {
      x = (Math.random() - 0.5) * 28;
      z = (Math.random() - 0.5) * 28;
      let valid = true;
      for (const pos of treePositions) {
        const dx = x - pos.x;
        const dz = z - pos.z;
        if (dx * dx + dz * dz < minDist * minDist) {
          valid = false;
          break;
        }
      }
      if (valid) break;
      attempts++;
    }
    treePositions.push({ x, z });

    const height = 4 + Math.random() * 3;
    const trunkHeight = height * 0.45;
    const foliageHeight = height * 0.55;

    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.scale.set(1, trunkHeight, 1);
    trunk.position.set(x, trunkHeight / 2, z);
    scene.add(trunk);

    const foliageCount = 3;
    for (let j = 0; j < foliageCount; j++) {
      const f = new THREE.Mesh(foliageGeometry, foliageMaterial);
      const scaleY = foliageHeight / foliageCount / 2.5;
      const scaleX = 1 - j * 0.2;
      f.scale.set(scaleX, scaleY, scaleX);
      const baseY = trunkHeight + j * (foliageHeight / foliageCount) * 0.7;
      f.position.set(x, baseY + (foliageHeight / foliageCount) * scaleY * 0.5, z);
      scene.add(f);

      if (j === foliageCount - 1) {
        const perchCount = 3 + Math.floor(Math.random() * 3);
        for (let k = 0; k < perchCount; k++) {
          const perchGeometry = new THREE.SphereGeometry(0.08, 8, 8);
          const perch = new THREE.Mesh(perchGeometry, perchMaterial);
          const angle = (k / perchCount) * Math.PI * 2 + Math.random();
          const radius = 0.6 * scaleX + Math.random() * 0.2;
          perch.position.set(
            x + Math.cos(angle) * radius,
            baseY + (foliageHeight / foliageCount) * scaleY * (0.3 + Math.random() * 0.5),
            z + Math.sin(angle) * radius
          );
          scene.add(perch);
          perches.push(perch.position.clone());
        }
      }
    }
  }

  return perches;
}

function createStars(scene: THREE.Scene): THREE.Points {
  const starCount = 250;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(starCount * 3);
  const sizes = new Float32Array(starCount);
  const phases = new Float32Array(starCount);

  for (let i = 0; i < starCount; i++) {
    const radius = 45 + Math.random() * 35;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.45;
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi) + 5;
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    sizes[i] = 0.08 + Math.random() * 0.12;
    phases[i] = Math.random() * Math.PI * 2;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }
    },
    vertexShader: `
      attribute float size;
      attribute float phase;
      varying float vAlpha;
      uniform float uTime;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float twinkle = 3.0 + sin(uTime * 1.5 + phase) * 2.0;
        gl_PointSize = size * twinkle * (300.0 / -mvPosition.z);
        vAlpha = 0.4 + 0.6 * (0.5 + 0.5 * sin(uTime * 1.2 + phase));
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d) * vAlpha;
        gl_FragColor = vec4(1.0, 1.0, 0.95, a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const stars = new THREE.Points(geometry, material);
  scene.add(stars);
  return stars;
}
