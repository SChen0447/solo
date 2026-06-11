import * as THREE from 'three';

interface IceCrystal {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  life: number;
  maxLife: number;
  state: 'idle' | 'ejecting' | 'floating';
  idleTime: number;
  waitTime: number;
  baseScale: number;
  baseOpacity: number;
}

interface IceCrystalsResult {
  group: THREE.Group;
  update: (time: number, delta: number, windDirection: number) => void;
  setWindDirection: (deg: number) => void;
}

const GRAVITY = -3.5;
const WIND_STRENGTH = 6.0;

export function createIceCrystals(
  getTerrainHeight: (x: number, z: number) => number
): IceCrystalsResult {
  const group = new THREE.Group();
  const crystals: IceCrystal[] = [];
  const maxCrystals = 35;
  let windDirRad = 0;

  const sharedGeometries: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 4; i++) {
    sharedGeometries.push(new THREE.OctahedronGeometry(0.5 + i * 0.15, 0));
  }

  function createCrystalMaterial(): THREE.MeshPhysicalMaterial {
    const color = new THREE.Color();
    const t = Math.random();
    const cWhite = new THREE.Color('#ffffff');
    const cLight = new THREE.Color('#c9eaf6');
    const cBlue = new THREE.Color('#87ceeb');
    if (t < 0.5) {
      color.copy(cWhite).lerp(cLight, t * 2);
    } else {
      color.copy(cLight).lerp(cBlue, (t - 0.5) * 2);
    }
    return new THREE.MeshPhysicalMaterial({
      color,
      transparent: true,
      opacity: 0.75,
      roughness: 0.08,
      metalness: 0.1,
      transmission: 0.55,
      thickness: 0.8,
      ior: 1.31,
      clearcoat: 0.6,
      clearcoatRoughness: 0.15,
      envMapIntensity: 1.0,
      side: THREE.DoubleSide
    });
  }

  function resetCrystal(crystal: IceCrystal): void {
    const terrainHalfSize = 190;
    const x = (Math.random() - 0.5) * terrainHalfSize;
    const z = (Math.random() - 0.5) * terrainHalfSize;
    const y = getTerrainHeight(x, z);

    crystal.mesh.position.set(x, y, z);
    crystal.baseScale = 0.6 + Math.random() * 2.0;
    crystal.mesh.scale.setScalar(crystal.baseScale);
    crystal.mesh.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );

    const mat = crystal.mesh.material as THREE.MeshPhysicalMaterial;
    crystal.baseOpacity = 0.6 + Math.random() * 0.3;
    mat.opacity = crystal.baseOpacity;
    mat.transparent = true;

    crystal.velocity.set(0, 0, 0);
    crystal.angularVelocity.set(
      (Math.random() - 0.5) * 2.5,
      (Math.random() - 0.5) * 2.5,
      (Math.random() - 0.5) * 2.5
    );

    crystal.life = 0;
    crystal.maxLife = 2 + Math.random() * 1;
    crystal.state = 'idle';
    crystal.idleTime = 0;
    crystal.waitTime = 5 + Math.random() * 3;
  }

  function ejectCrystal(crystal: IceCrystal): void {
    crystal.state = 'ejecting';
    const targetHeight = 20 + Math.random() * 30;
    const currentY = crystal.mesh.position.y;
    const speedY = Math.sqrt(2 * Math.abs(GRAVITY) * targetHeight) * (0.9 + Math.random() * 0.2);
    crystal.velocity.set(
      (Math.random() - 0.5) * 3.0,
      speedY,
      (Math.random() - 0.5) * 3.0
    );
    crystal.life = 0;
    crystal.angularVelocity.multiplyScalar(1.5 + Math.random());
  }

  for (let i = 0; i < maxCrystals; i++) {
    const geo = sharedGeometries[Math.floor(Math.random() * sharedGeometries.length)];
    const mat = createCrystalMaterial();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    const crystal: IceCrystal = {
      mesh,
      velocity: new THREE.Vector3(),
      angularVelocity: new THREE.Vector3(),
      life: 0,
      maxLife: 2.5,
      state: 'idle',
      idleTime: 0,
      waitTime: Math.random() * 5,
      baseScale: 1,
      baseOpacity: 0.8
    };

    resetCrystal(crystal);
    crystal.waitTime = 0.5 + Math.random() * 6;
    group.add(mesh);
    crystals.push(crystal);
  }

  function update(_time: number, delta: number, windDirection: number): void {
    windDirRad = (windDirection * Math.PI) / 180;
    const windX = Math.sin(windDirRad) * WIND_STRENGTH;
    const windZ = Math.cos(windDirRad) * WIND_STRENGTH;

    for (let i = 0; i < crystals.length; i++) {
      const c = crystals[i];

      if (c.state === 'idle') {
        c.idleTime += delta;
        const mat = c.mesh.material as THREE.MeshPhysicalMaterial;
        const shimmer = 0.9 + Math.sin(_time * 2 + i * 0.5) * 0.1;
        mat.opacity = c.baseOpacity * shimmer;
        if (c.idleTime >= c.waitTime) {
          ejectCrystal(c);
        }
        continue;
      }

      c.life += delta;

      if (c.state === 'ejecting') {
        c.velocity.y += GRAVITY * delta * 0.6;
        if (c.velocity.y < 3) {
          c.state = 'floating';
        }
      } else if (c.state === 'floating') {
        c.velocity.x += windX * delta;
        c.velocity.z += windZ * delta;
        c.velocity.y += GRAVITY * delta;
        c.velocity.x *= 0.99;
        c.velocity.z *= 0.99;
      }

      c.mesh.position.x += c.velocity.x * delta;
      c.mesh.position.y += c.velocity.y * delta;
      c.mesh.position.z += c.velocity.z * delta;

      c.mesh.rotation.x += c.angularVelocity.x * delta;
      c.mesh.rotation.y += c.angularVelocity.y * delta;
      c.mesh.rotation.z += c.angularVelocity.z * delta;

      const lifeRatio = c.life / c.maxLife;
      const mat = c.mesh.material as THREE.MeshPhysicalMaterial;
      if (lifeRatio < 0.5) {
        mat.opacity = c.baseOpacity;
      } else {
        const fade = 1 - (lifeRatio - 0.5) * 2;
        mat.opacity = c.baseOpacity * Math.max(0, fade);
      }

      if (c.life >= c.maxLife || c.mesh.position.y < -30) {
        resetCrystal(c);
      }
    }
  }

  function setWindDirection(deg: number): void {
    windDirRad = (deg * Math.PI) / 180;
  }

  return { group, update, setWindDirection };
}
