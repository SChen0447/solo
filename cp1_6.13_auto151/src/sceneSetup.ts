import * as THREE from 'three';

export const POLE_COLORS = [
  0xff3333,
  0xff9933,
  0xffdd00,
  0x33cc33,
  0x3399ff
];

export const POLE_POSITIONS: { x: number; y: number; z: number; height: number }[] = [
  { x: -12, y: 0, z: 0, height: 8 },
  { x: -6, y: 0.5, z: -1, height: 10 },
  { x: 0, y: 1.2, z: 0, height: 13 },
  { x: 6, y: 0.5, z: 1, height: 10 },
  { x: 12, y: 0, z: 0, height: 8 }
];

export interface SceneData {
  scene: THREE.Scene;
  poles: THREE.Mesh[];
  poleTopPositions: THREE.Vector3[];
}

function createSkyGradient(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(200, 32, 32);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0x1a4d8e) },
      bottomColor: { value: new THREE.Color(0x87ceeb) },
      offset: { value: 30 },
      exponent: { value: 0.6 }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `
  });
  const sky = new THREE.Mesh(geometry, material);
  sky.name = 'sky';
  return sky;
}

function createGround(): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(120, 120, 60, 60);
  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getY(i);
    let height = 0;
    height += Math.sin(x * 0.08) * Math.cos(z * 0.06) * 2;
    height += Math.sin(x * 0.15 + 1) * Math.sin(z * 0.12) * 1;
    height += Math.cos(x * 0.05 - z * 0.04) * 1.5;
    positions.setZ(i, height);
  }

  geometry.computeVertexNormals();

  const colors: number[] = [];
  const baseGreen = new THREE.Color(0x4a8c3a);
  const lightGreen = new THREE.Color(0x6bb85a);
  const darkGreen = new THREE.Color(0x2d5a27);

  for (let i = 0; i < positions.count; i++) {
    const h = positions.getZ(i);
    const t = (h + 3) / 6;
    const color = new THREE.Color();
    if (t < 0.5) {
      color.copy(darkGreen).lerp(baseGreen, t * 2);
    } else {
      color.copy(baseGreen).lerp(lightGreen, (t - 0.5) * 2);
    }
    const noise = Math.sin(i * 0.37) * 0.05;
    color.r = Math.min(1, Math.max(0, color.r + noise));
    color.g = Math.min(1, Math.max(0, color.g + noise));
    color.b = Math.min(1, Math.max(0, color.b + noise));
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.05
  });

  const ground = new THREE.Mesh(geometry, material);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1;
  ground.name = 'ground';
  ground.receiveShadow = true;
  return ground;
}

function createPoles(): { poles: THREE.Mesh[]; poleTopPositions: THREE.Vector3[] } {
  const poles: THREE.Mesh[] = [];
  const poleTopPositions: THREE.Vector3[] = [];

  for (let i = 0; i < POLE_POSITIONS.length; i++) {
    const pos = POLE_POSITIONS[i];
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.2, pos.height, 12);
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x5a3a1a,
      roughness: 0.8,
      metalness: 0.1
    });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(pos.x, pos.height / 2 + pos.y, pos.z);
    pole.castShadow = true;
    pole.name = `pole_${i}`;
    poles.push(pole);

    const topY = pos.height + pos.y;
    poleTopPositions.push(new THREE.Vector3(pos.x, topY, pos.z));
  }

  return { poles, poleTopPositions };
}

export function setupScene(): SceneData {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x87ceeb, 50, 150);

  const sky = createSkyGradient();
  scene.add(sky);

  const ground = createGround();
  scene.add(ground);

  const { poles, poleTopPositions } = createPoles();
  poles.forEach(p => scene.add(p));

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const sunLight = new THREE.DirectionalLight(0xfff4e0, 1.2);
  sunLight.position.set(30, 50, 20);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -50;
  sunLight.shadow.camera.right = 50;
  sunLight.shadow.camera.top = 50;
  sunLight.shadow.camera.bottom = -50;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 200;
  scene.add(sunLight);

  const fillLight = new THREE.DirectionalLight(0xaaccff, 0.3);
  fillLight.position.set(-20, 30, -10);
  scene.add(fillLight);

  return { scene, poles, poleTopPositions };
}

export function getPoleRopePoints(poleTopPositions: THREE.Vector3[]): THREE.Vector3[][] {
  const ropeSets: THREE.Vector3[][] = [];

  for (let i = 0; i < poleTopPositions.length - 1; i++) {
    const start = poleTopPositions[i];
    const end = poleTopPositions[i + 1];
    const points: THREE.Vector3[] = [];
    const segments = 20;

    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      const x = start.x + (end.x - start.x) * t;
      const z = start.z + (end.z - start.z) * t;
      const sag = -Math.sin(t * Math.PI) * 0.5;
      const y = start.y + (end.y - start.y) * t + sag;
      points.push(new THREE.Vector3(x, y, z));
    }

    ropeSets.push(points);
  }

  return ropeSets;
}
