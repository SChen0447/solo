import * as THREE from 'three';
import type { SeasonParams } from './season';

export interface TreeObject {
  group: THREE.Group;
  foliage: THREE.Mesh;
  trunk: THREE.Mesh;
  snowCap?: THREE.Mesh;
  colorOffset: number;
  baseFoliageColor: THREE.Color;
}

export interface BuildingMaterials {
  wallMaterial: THREE.MeshStandardMaterial;
  glassMaterial: THREE.MeshPhysicalMaterial;
}

export interface SceneObjects {
  building: THREE.Group;
  trees: TreeObject[];
  ground: THREE.Mesh;
  sky: THREE.Mesh;
  buildingMaterials: BuildingMaterials;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function createSkyMaterial(): THREE.ShaderMaterial {
  const vertexShader = `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 uTopColor;
    uniform vec3 uBottomColor;
    uniform float uCloudDensity;
    uniform float uTime;
    varying vec3 vWorldPosition;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
      }
      return v;
    }

    void main() {
      float h = normalize(vWorldPosition).y;
      float t = max(0.0, min(1.0, (h + 0.2) / 1.2));
      vec3 skyColor = mix(uBottomColor, uTopColor, t);

      vec2 cloudUV = vWorldPosition.xz * 0.015 + uTime * 0.003;
      float cloudNoise = fbm(cloudUV);
      float cloudMask = smoothstep(0.45, 0.75, cloudNoise) * uCloudDensity;
      vec3 cloudColor = vec3(1.0, 1.0, 1.0);
      vec3 finalColor = mix(skyColor, cloudColor, cloudMask * 0.7);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTopColor: { value: new THREE.Color('#87ceeb') },
      uBottomColor: { value: new THREE.Color('#e0f6ff') },
      uCloudDensity: { value: 0.3 },
      uTime: { value: 0 }
    },
    side: THREE.BackSide,
    depthWrite: false
  });
}

export function createBuilding(): { group: THREE.Group; materials: BuildingMaterials } {
  const group = new THREE.Group();

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xf5e6d0,
    roughness: 0.7,
    metalness: 0.1
  });

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x88ccff,
    metalness: 0.0,
    roughness: 0.05,
    transmission: 0.6,
    transparent: true,
    opacity: 0.85,
    envMapIntensity: 1.0,
    reflectivity: 0.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1
  });

  const mainBodyGeo = new THREE.BoxGeometry(8, 10, 6);
  const mainBody = new THREE.Mesh(mainBodyGeo, wallMaterial);
  mainBody.position.y = 5;
  mainBody.castShadow = true;
  mainBody.receiveShadow = true;
  group.add(mainBody);

  const topSectionGeo = new THREE.BoxGeometry(5, 3, 4);
  const topSection = new THREE.Mesh(topSectionGeo, wallMaterial);
  topSection.position.y = 11.5;
  topSection.castShadow = true;
  topSection.receiveShadow = true;
  group.add(topSection);

  const glassPanelGeo = new THREE.PlaneGeometry(2.2, 2.2);
  const glassPositions: Array<[number, number, number, THREE.Euler]> = [
    [-2.6, 2.5, 3.01, new THREE.Euler(0, 0, 0)],
    [0, 2.5, 3.01, new THREE.Euler(0, 0, 0)],
    [2.6, 2.5, 3.01, new THREE.Euler(0, 0, 0)],
    [-2.6, 6.5, 3.01, new THREE.Euler(0, 0, 0)],
    [0, 6.5, 3.01, new THREE.Euler(0, 0, 0)],
    [2.6, 6.5, 3.01, new THREE.Euler(0, 0, 0)],
    [-2.6, 2.5, -3.01, new THREE.Euler(0, Math.PI, 0)],
    [0, 2.5, -3.01, new THREE.Euler(0, Math.PI, 0)],
    [2.6, 2.5, -3.01, new THREE.Euler(0, Math.PI, 0)],
    [-2.6, 6.5, -3.01, new THREE.Euler(0, Math.PI, 0)],
    [0, 6.5, -3.01, new THREE.Euler(0, Math.PI, 0)],
    [2.6, 6.5, -3.01, new THREE.Euler(0, Math.PI, 0)],
    [4.01, 2.5, -1.5, new THREE.Euler(0, Math.PI / 2, 0)],
    [4.01, 2.5, 1.5, new THREE.Euler(0, Math.PI / 2, 0)],
    [4.01, 6.5, -1.5, new THREE.Euler(0, Math.PI / 2, 0)],
    [4.01, 6.5, 1.5, new THREE.Euler(0, Math.PI / 2, 0)],
    [-4.01, 2.5, -1.5, new THREE.Euler(0, -Math.PI / 2, 0)],
    [-4.01, 2.5, 1.5, new THREE.Euler(0, -Math.PI / 2, 0)],
    [-4.01, 6.5, -1.5, new THREE.Euler(0, -Math.PI / 2, 0)],
    [-4.01, 6.5, 1.5, new THREE.Euler(0, -Math.PI / 2, 0)]
  ];

  glassPositions.forEach(([x, y, z, rot]) => {
    const glassPanel = new THREE.Mesh(glassPanelGeo, glassMaterial);
    glassPanel.position.set(x, y, z);
    glassPanel.rotation.copy(rot);
    glassPanel.castShadow = false;
    glassPanel.receiveShadow = false;
    group.add(glassPanel);
  });

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x333333,
    roughness: 0.5,
    metalness: 0.8
  });

  const frameHGeo = new THREE.BoxGeometry(2.4, 0.1, 0.1);
  const frameVGeo = new THREE.BoxGeometry(0.1, 2.4, 0.1);
  glassPositions.forEach(([x, y, z, rot]) => {
    const topFrame = new THREE.Mesh(frameHGeo, frameMaterial);
    topFrame.position.set(x, y + 1.15, z);
    topFrame.rotation.copy(rot);
    group.add(topFrame);

    const bottomFrame = new THREE.Mesh(frameHGeo, frameMaterial);
    bottomFrame.position.set(x, y - 1.15, z);
    bottomFrame.rotation.copy(rot);
    group.add(bottomFrame);

    const leftFrame = new THREE.Mesh(frameVGeo, frameMaterial);
    leftFrame.position.set(x - 1.15, y, z);
    leftFrame.rotation.copy(rot);
    group.add(leftFrame);

    const rightFrame = new THREE.Mesh(frameVGeo, frameMaterial);
    rightFrame.position.set(x + 1.15, y, z);
    rightFrame.rotation.copy(rot);
    group.add(rightFrame);
  });

  return {
    group,
    materials: { wallMaterial, glassMaterial }
  };
}

export function createTree(x: number, z: number, scale: number, colorOffset: number): TreeObject {
  const group = new THREE.Group();

  const trunkHeight = 1.5 * scale;
  const trunkGeo = new THREE.CylinderGeometry(0.12 * scale, 0.18 * scale, trunkHeight, 8);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x5d4037,
    roughness: 0.9,
    metalness: 0.0
  });
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.y = trunkHeight / 2;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  const baseFoliageColor = new THREE.Color(0x7cb342);
  const foliageHeight = 2.5 * scale;
  const foliageGeo = new THREE.ConeGeometry(1.2 * scale, foliageHeight, 8);
  const foliageMat = new THREE.MeshStandardMaterial({
    color: baseFoliageColor.clone(),
    roughness: 0.8,
    metalness: 0.0
  });
  const foliage = new THREE.Mesh(foliageGeo, foliageMat);
  foliage.position.y = trunkHeight + foliageHeight / 2 - 0.2;
  foliage.castShadow = true;
  foliage.receiveShadow = true;
  group.add(foliage);

  const snowCapGeo = new THREE.CylinderGeometry(0.9 * scale, 1.3 * scale, 0.3 * scale, 8);
  const snowCapMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0.0,
    transparent: true,
    opacity: 0.9
  });
  const snowCap = new THREE.Mesh(snowCapGeo, snowCapMat);
  snowCap.position.y = trunkHeight + foliageHeight - 0.5;
  snowCap.visible = false;
  snowCap.castShadow = true;
  group.add(snowCap);

  group.position.set(x, 0, z);

  return {
    group,
    foliage,
    trunk,
    snowCap,
    colorOffset,
    baseFoliageColor: baseFoliageColor.clone()
  };
}

export function createTrees(count: number = 25): TreeObject[] {
  const trees: TreeObject[] = [];
  const random = seededRandom(42);
  const minDist = 4;
  const positions: Array<[number, number]> = [];

  for (let i = 0; i < count; i++) {
    let x = 0, z = 0, valid = false, attempts = 0;
    while (!valid && attempts < 100) {
      x = (random() - 0.5) * 40;
      z = (random() - 0.5) * 40;
      const distFromCenter = Math.sqrt(x * x + z * z);
      if (distFromCenter < 8) { attempts++; continue; }
      valid = true;
      for (const [px, pz] of positions) {
        if (Math.sqrt((x - px) ** 2 + (z - pz) ** 2) < minDist) {
          valid = false;
          break;
        }
      }
      attempts++;
    }
    if (valid) {
      positions.push([x, z]);
      const scale = 0.8 + random() * 0.8;
      const colorOffset = random() * 0.3;
      trees.push(createTree(x, z, scale, colorOffset));
    }
  }

  return trees;
}

export function createGround(): THREE.Mesh {
  const groundGeo = new THREE.PlaneGeometry(100, 100);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x8b9a6b,
    roughness: 0.95,
    metalness: 0.0
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  return ground;
}

export function createSky(): THREE.Mesh {
  const skyGeo = new THREE.SphereGeometry(100, 32, 32);
  const skyMat = createSkyMaterial();
  const sky = new THREE.Mesh(skyGeo, skyMat);
  return sky;
}

export function createScene(): SceneObjects {
  const { group: building, materials: buildingMaterials } = createBuilding();
  const trees = createTrees(25);
  const ground = createGround();
  const sky = createSky();

  return {
    building,
    trees,
    ground,
    sky,
    buildingMaterials
  };
}

export function updateSceneColors(
  sceneObjects: SceneObjects,
  params: SeasonParams,
  treeAnimProgress: number = 1.0
): void {
  const { buildingMaterials, trees, ground, sky } = sceneObjects;

  buildingMaterials.wallMaterial.color.copy(params.wallColor);
  buildingMaterials.glassMaterial.reflectivity = params.glassReflectivity;
  buildingMaterials.glassMaterial.envMapIntensity = 0.5 + params.glassReflectivity * 0.5;

  trees.forEach((tree) => {
    const offsetProgress = Math.max(0, Math.min(1, treeAnimProgress - tree.colorOffset));
    (tree.foliage.material as THREE.MeshStandardMaterial).color.lerpColors(
      tree.baseFoliageColor,
      params.treeColor,
      offsetProgress
    );
    if (tree.snowCap) {
      tree.snowCap.visible = params.hasSnow;
      const snowMat = tree.snowCap.material as THREE.MeshStandardMaterial;
      snowMat.opacity = offsetProgress * 0.9;
    }
  });

  const skyMat = sky.material as THREE.ShaderMaterial;
  skyMat.uniforms.uTopColor.value.copy(params.skyTopColor);
  skyMat.uniforms.uBottomColor.value.copy(params.skyBottomColor);
  skyMat.uniforms.uCloudDensity.value = params.cloudDensity;

  const groundMat = ground.material as THREE.MeshStandardMaterial;
  if (params.hasSnow) {
    groundMat.color.lerpColors(new THREE.Color(0x8b9a6b), new THREE.Color(0xe8e8e8), 0.7);
  } else {
    groundMat.color.copy(new THREE.Color(0x8b9a6b));
  }
}

export function updateSkyTime(sky: THREE.Mesh, time: number): void {
  const skyMat = sky.material as THREE.ShaderMaterial;
  skyMat.uniforms.uTime.value = time;
}
