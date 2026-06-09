import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

interface HydroParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  birthTime: number;
}

interface PlanktonParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface GoldParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export interface Environment {
  group: THREE.Group;
  terrain: THREE.Mesh;
  volcano: THREE.Group;
  hydroParticles: HydroParticle[];
  planktonParticles: PlanktonParticle[];
  lastEruptionTime: number;
}

export interface LabScene {
  group: THREE.Group;
  alloy: THREE.Mesh;
  goldParticles: GoldParticle[];
  updateParticles: (delta: number) => void;
}

const TERRAIN_SIZE = 20;
const TERRAIN_SEGMENTS = 100;

function createTerrain(): THREE.Mesh {
  const noise2D = createNoise2D();
  const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
  geometry.rotateX(-Math.PI / 2);
  
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  
  const colorDeep = new THREE.Color(0x0a1a2a);
  const colorGreen = new THREE.Color(0x1a2a1a);
  
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    
    const distFromCenter = Math.sqrt(x * x + z * z);
    const volcanoInfluence = Math.max(0, 1 - distFromCenter / 5);
    
    let height = noise2D(x * 0.3, z * 0.3) * 0.8;
    height += noise2D(x * 0.8, z * 0.8) * 0.3;
    height += volcanoInfluence * 1.5;
    
    positions.setY(i, height);
    
    const t = Math.min(1, Math.max(0, (height + 1) / 2.5));
    const color = colorDeep.clone().lerp(colorGreen, t * 0.6 + volcanoInfluence * 0.4);
    
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.9,
    metalness: 0.1,
    flatShading: false
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  
  return mesh;
}

function createVolcano(): THREE.Group {
  const group = new THREE.Group();
  
  const volcanoGeo = new THREE.ConeGeometry(3, 4, 32, 1, true);
  volcanoGeo.translate(0, 2, 0);
  
  const positions = volcanoGeo.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const noise2D = createNoise2D();
  
  const colorOrange = new THREE.Color(0xff6600);
  const colorBlack = new THREE.Color(0x1a0a00);
  
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    
    const noise = noise2D(x * 2 + y * 0.5, z * 2) * 0.5 + 0.5;
    const heightFactor = y / 4;
    
    positions.setY(i, y + noise2D(x * 3, z * 3) * 0.15);
    
    const t = noise * 0.6 + heightFactor * 0.4;
    const color = colorBlack.clone().lerp(colorOrange, t);
    
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  
  volcanoGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  volcanoGeo.computeVertexNormals();
  
  const volcanoMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.15,
    side: THREE.DoubleSide
  });
  
  const volcano = new THREE.Mesh(volcanoGeo, volcanoMat);
  volcano.castShadow = true;
  volcano.receiveShadow = true;
  group.add(volcano);
  
  const craterGeo = new THREE.CircleGeometry(0.5, 32);
  const craterMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
  const crater = new THREE.Mesh(craterGeo, craterMat);
  crater.rotation.x = -Math.PI / 2;
  crater.position.y = 4.02;
  group.add(crater);
  
  const glowGeo = new THREE.SphereGeometry(0.8, 16, 16);
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xff6600,
    transparent: true,
    opacity: 0.3
  });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.y = 3.8;
  group.add(glow);
  
  return group;
}

function createHydroParticle(): THREE.Mesh {
  const size = 0.2 + Math.random() * 0.3;
  const geo = new THREE.SphereGeometry(size, 6, 6);
  const colorT = Math.random();
  const color = new THREE.Color().lerpColors(
    new THREE.Color(0xff6600),
    new THREE.Color(0xffaa00),
    colorT
  );
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.8
  });
  return new THREE.Mesh(geo, mat);
}

function createPlanktonParticle(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(0.05, 4, 4);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xaaccff,
    transparent: true,
    opacity: 0.3
  });
  return new THREE.Mesh(geo, mat);
}

function createLights(scene: THREE.Scene) {
  const ambient = new THREE.AmbientLight(0x1a2a3a, 0.5);
  scene.add(ambient);
  
  const dirLight = new THREE.DirectionalLight(0x88aaff, 0.4);
  dirLight.position.set(5, 20, 5);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 1024;
  dirLight.shadow.mapSize.height = 1024;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 50;
  dirLight.shadow.camera.left = -15;
  dirLight.shadow.camera.right = 15;
  dirLight.shadow.camera.top = 15;
  dirLight.shadow.camera.bottom = -15;
  scene.add(dirLight);
  
  const volcanoLight = new THREE.PointLight(0xff6600, 1.5, 15, 2);
  volcanoLight.position.set(0, 4, 0);
  scene.add(volcanoLight);
}

export function createEnvironment(scene: THREE.Scene): Environment {
  const group = new THREE.Group();
  
  scene.fog = new THREE.Fog(0x0a1a2a, 5, 30);
  
  createLights(scene);
  
  const terrain = createTerrain();
  group.add(terrain);
  
  const volcano = createVolcano();
  group.add(volcano);
  
  scene.add(group);
  
  return {
    group,
    terrain,
    volcano,
    hydroParticles: [],
    planktonParticles: [],
    lastEruptionTime: -5
  };
}

function eruptHydroVent(env: Environment, maxNew: number): number {
  const count = Math.min(200, maxNew);
  if (count <= 0) return 0;
  
  const now = performance.now() / 1000;
  
  for (let i = 0; i < count; i++) {
    const mesh = createHydroParticle();
    
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 0.4;
    mesh.position.set(
      Math.cos(angle) * radius,
      4.1,
      Math.sin(angle) * radius
    );
    
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      1.5 + Math.random() * 1,
      (Math.random() - 0.5) * 0.5
    );
    
    const particle: HydroParticle = {
      mesh,
      velocity,
      life: 0,
      maxLife: 3,
      birthTime: now + i * 0.001
    };
    
    env.group.add(mesh);
    env.hydroParticles.push(particle);
  }
  
  return count;
}

function spawnPlankton(env: Environment): number {
  const mesh = createPlanktonParticle();
  
  const angle = Math.random() * Math.PI * 2;
  const dist = 5 + Math.random() * 10;
  mesh.position.set(
    Math.cos(angle) * dist,
    0.5 + Math.random() * 8,
    Math.sin(angle) * dist
  );
  
  const velocity = new THREE.Vector3(
    (Math.random() - 0.5) * 0.2,
    0.1 + Math.random() * 0.2,
    (Math.random() - 0.5) * 0.2
  );
  
  const particle: PlanktonParticle = {
    mesh,
    velocity,
    life: 0,
    maxLife: 8 + Math.random() * 4
  };
  
  env.group.add(mesh);
  env.planktonParticles.push(particle);
  
  return 1;
}

export function updateEnvironment(
  env: Environment,
  delta: number,
  elapsed: number,
  maxNewParticles: number
): number {
  let particlesDelta = 0;
  
  if (elapsed - env.lastEruptionTime >= 5) {
    particlesDelta += eruptHydroVent(env, maxNewParticles - particlesDelta);
    env.lastEruptionTime = elapsed;
  }
  
  for (let i = env.planktonParticles.length - 1; i >= 0; i--) {
    const p = env.planktonParticles[i];
    p.life += delta;
    
    if (p.life >= p.maxLife) {
      env.group.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
      env.planktonParticles.splice(i, 1);
      particlesDelta -= 1;
    } else {
      p.mesh.position.addScaledVector(p.velocity, delta);
      p.velocity.y += Math.sin(elapsed * 2 + i) * 0.01;
      
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      if (p.life < 0.5) {
        mat.opacity = 0.3 * (p.life / 0.5);
      } else if (p.life > p.maxLife - 1) {
        mat.opacity = 0.3 * ((p.maxLife - p.life) / 1);
      }
    }
  }
  
  if (Math.random() < 0.3 && maxNewParticles - particlesDelta > 0) {
    particlesDelta += spawnPlankton(env);
  }
  
  for (let i = env.hydroParticles.length - 1; i >= 0; i--) {
    const p = env.hydroParticles[i];
    p.life += delta;
    
    if (p.life >= p.maxLife) {
      env.group.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
      env.hydroParticles.splice(i, 1);
      particlesDelta -= 1;
    } else {
      p.mesh.position.addScaledVector(p.velocity, delta);
      p.velocity.y += delta * 0.5;
      p.velocity.x += (Math.random() - 0.5) * delta * 0.5;
      p.velocity.z += (Math.random() - 0.5) * delta * 0.5;
      
      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.8 * (1 - p.life / p.maxLife);
      
      const scale = 1 + p.life * 0.3;
      p.mesh.scale.setScalar(scale);
    }
  }
  
  return particlesDelta;
}

function createAlloy(colors: string[]): THREE.Mesh {
  const geo = new THREE.SphereGeometry(1.5, 64, 64);
  
  const colorValues = colors.map(c => new THREE.Color(c));
  
  const positions = geo.attributes.position;
  const vertexColors = new Float32Array(positions.count * 3);
  const noise2D = createNoise2D();
  
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    
    const noise = noise2D(x * 2, y * 2 + z * 2) * 0.5 + 0.5;
    const colorIdx = Math.floor(noise * colorValues.length) % colorValues.length;
    const nextIdx = (colorIdx + 1) % colorValues.length;
    const t = (noise * colorValues.length) % 1;
    
    const color = colorValues[colorIdx].clone().lerp(colorValues[nextIdx], t);
    
    vertexColors[i * 3] = color.r;
    vertexColors[i * 3 + 1] = color.g;
    vertexColors[i * 3 + 2] = color.b;
  }
  
  geo.setAttribute('color', new THREE.BufferAttribute(vertexColors, 3));
  geo.computeVertexNormals();
  
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    metalness: 0.9,
    roughness: 0.15
  });
  
  return new THREE.Mesh(geo, mat);
}

export function createLabScene(scene: THREE.Scene, mineralColors: string[]): LabScene {
  const group = new THREE.Group();
  
  const bgGeo = new THREE.BoxGeometry(30, 30, 30);
  const bgMat = new THREE.MeshBasicMaterial({
    color: 0x0a0a1a,
    side: THREE.BackSide
  });
  const bg = new THREE.Mesh(bgGeo, bgMat);
  group.add(bg);
  
  const pedestalGeo = new THREE.CylinderGeometry(2, 2.5, 0.5, 32);
  const pedestalMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a3a,
    metalness: 0.8,
    roughness: 0.3
  });
  const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
  pedestal.position.y = -1;
  pedestal.receiveShadow = true;
  group.add(pedestal);
  
  const ringGeo = new THREE.TorusGeometry(2.2, 0.05, 8, 64);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x4caf50 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.7;
  group.add(ring);
  
  const alloy = createAlloy(mineralColors.length > 0 ? mineralColors : ['#ffe135', '#c0c0c0', '#4a7b9d', '#8b4513', '#50c878']);
  alloy.position.y = 1;
  alloy.castShadow = true;
  group.add(alloy);
  
  const labAmbient = new THREE.AmbientLight(0x334455, 0.6);
  group.add(labAmbient);
  
  const keyLight = new THREE.DirectionalLight(0xffffff, 1);
  keyLight.position.set(5, 8, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  group.add(keyLight);
  
  const rimLight = new THREE.DirectionalLight(0x66aaff, 0.5);
  rimLight.position.set(-5, 3, -5);
  group.add(rimLight);
  
  const pointLight = new THREE.PointLight(0x4caf50, 0.8, 10);
  pointLight.position.set(0, -0.5, 0);
  group.add(pointLight);
  
  scene.add(group);
  
  const goldParticles: GoldParticle[] = [];
  
  return {
    group,
    alloy,
    goldParticles,
    updateParticles(delta: number) {
      for (let i = goldParticles.length - 1; i >= 0; i--) {
        const p = goldParticles[i];
        p.life += delta;
        
        if (p.life >= p.maxLife) {
          group.remove(p.mesh);
          p.mesh.geometry.dispose();
          (p.mesh.material as THREE.Material).dispose();
          goldParticles.splice(i, 1);
        } else {
          p.mesh.position.addScaledVector(p.velocity, delta);
          p.velocity.multiplyScalar(0.98);
          p.velocity.y -= delta * 0.5;
          
          const mat = p.mesh.material as THREE.MeshBasicMaterial;
          mat.opacity = 1 - p.life / p.maxLife;
        }
      }
    }
  };
}

export function triggerGoldBurst(scene: THREE.Scene, origin: THREE.Vector3) {
  const count = 1000;
  
  for (let i = 0; i < count; i++) {
    const size = 0.05 + Math.random() * 0.15;
    const geo = new THREE.SphereGeometry(size, 4, 4);
    const colorT = Math.random();
    const color = new THREE.Color().lerpColors(
      new THREE.Color(0xffd700),
      new THREE.Color(0xffee88),
      colorT
    );
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 1
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(origin);
    
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const speed = 3 + Math.random() * 5;
    
    const velocity = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * speed,
      Math.sin(phi) * Math.sin(theta) * speed,
      Math.cos(phi) * speed
    );
    
    scene.add(mesh);
    
    setTimeout(() => {
      scene.remove(mesh);
      geo.dispose();
      mat.dispose();
    }, 1000);
    
    const startPos = origin.clone();
    const startTime = performance.now();
    
    const animateParticle = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      if (elapsed >= 1) return;
      
      mesh.position.copy(startPos).addScaledVector(velocity, elapsed);
      velocity.multiplyScalar(0.98);
      velocity.y -= 9.8 * elapsed * 0.016;
      
      mat.opacity = 1 - elapsed;
      mesh.scale.setScalar(1 + elapsed * 0.5);
      
      requestAnimationFrame(animateParticle);
    };
    animateParticle();
  }
}
