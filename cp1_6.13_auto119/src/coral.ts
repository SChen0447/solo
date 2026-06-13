import * as THREE from 'three';

export type CoralType = 'branching' | 'leaf' | 'brain' | 'tube' | 'fan';

export interface CoralState {
  id: string;
  type: CoralType;
  typeName: string;
  position: THREE.Vector3;
  color: THREE.Color;
  colorHex: string;
  initialSize: number;
  currentSize: number;
  sizePercent: number;
  health: number;
  growthRate: number;
  lightIntensity: number;
  nutrientLevel: number;
  glowIntensity: number;
  nearbyCorals: number;
  mesh: THREE.Group;
  glowMesh?: THREE.Mesh;
  spawnTime: number;
  lastGrowthTime: number;
}

const CORAL_TYPE_NAMES: Record<CoralType, string> = {
  branching: '枝状珊瑚',
  leaf: '叶片状珊瑚',
  brain: '脑状珊瑚',
  tube: '管状珊瑚',
  fan: '扇状珊瑚'
};

const CORAL_COLORS = [
  new THREE.Color(0xff6b9d),
  new THREE.Color(0xff8a65),
  new THREE.Color(0xffa07a),
  new THREE.Color(0xc9a0dc),
  new THREE.Color(0xe6a8d5),
  new THREE.Color(0xf4a460)
];

function randomColor(): THREE.Color {
  return CORAL_COLORS[Math.floor(Math.random() * CORAL_COLORS.length)].clone();
}

function createBranchingCoral(size: number, color: THREE.Color): THREE.Group {
  const group = new THREE.Group();
  const segments = 5 + Math.floor(Math.random() * 3);
  
  for (let i = 0; i < segments; i++) {
    const branchHeight = size * (0.4 + Math.random() * 0.6);
    const branchRadius = size * 0.08 * (1 - i / segments * 0.5);
    const geometry = new THREE.CylinderGeometry(
      branchRadius * 0.3, branchRadius, branchHeight, 6
    );
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.7,
      metalness: 0.1,
      emissive: color,
      emissiveIntensity: 0.15
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = branchHeight / 2;
    mesh.rotation.z = (Math.random() - 0.5) * 0.4;
    mesh.rotation.x = (Math.random() - 0.5) * 0.4;
    
    if (i > 0) {
      mesh.position.y = size * 0.3 + i * size * 0.15;
    }
    group.add(mesh);
    
    if (i > 1 && Math.random() > 0.4) {
      const subBranch = mesh.clone();
      subBranch.scale.setScalar(0.6);
      subBranch.position.set(
        (Math.random() - 0.5) * size * 0.3,
        mesh.position.y + size * 0.1,
        (Math.random() - 0.5) * size * 0.3
      );
      subBranch.rotation.z += (Math.random() - 0.5) * 0.8;
      group.add(subBranch);
    }
  }
  
  return group;
}

function createLeafCoral(size: number, color: THREE.Color): THREE.Group {
  const group = new THREE.Group();
  const leafCount = 6 + Math.floor(Math.random() * 4);
  
  for (let i = 0; i < leafCount; i++) {
    const leafWidth = size * (0.3 + Math.random() * 0.4);
    const leafHeight = size * (0.5 + Math.random() * 0.3);
    const geometry = new THREE.PlaneGeometry(leafWidth, leafHeight, 4, 6);
    
    const positions = geometry.attributes.position;
    for (let j = 0; j < positions.count; j++) {
      const x = positions.getX(j);
      const y = positions.getY(j);
      const z = Math.sin(x * 4 / leafWidth) * size * 0.08 
              + Math.sin(y * 3 / leafHeight) * size * 0.05
              + (Math.random() - 0.5) * size * 0.03;
      positions.setZ(j, z);
    }
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.8,
      metalness: 0.05,
      side: THREE.DoubleSide,
      emissive: color,
      emissiveIntensity: 0.1
    });
    const mesh = new THREE.Mesh(geometry, material);
    const angle = (i / leafCount) * Math.PI * 2;
    const radius = size * 0.15;
    mesh.position.set(
      Math.cos(angle) * radius,
      leafHeight * 0.4 + Math.random() * size * 0.1,
      Math.sin(angle) * radius
    );
    mesh.rotation.y = angle + Math.PI / 2;
    mesh.rotation.z = (Math.random() - 0.5) * 0.3;
    mesh.rotation.x = -0.2 + Math.random() * 0.2;
    group.add(mesh);
  }
  
  return group;
}

function createBrainCoral(size: number, color: THREE.Color): THREE.Group {
  const group = new THREE.Group();
  
  const geometry = new THREE.SphereGeometry(size * 0.5, 16, 12);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const len = Math.sqrt(x * x + y * y + z * z);
    const noise = Math.sin(x * 8 / size) * Math.cos(y * 8 / size) * size * 0.06
                + Math.sin(z * 6 / size) * size * 0.04;
    const scale = (size * 0.5 + noise) / len;
    positions.setXYZ(i, x * scale, y * scale * 0.7 + size * 0.2, z * scale);
  }
  geometry.computeVertexNormals();
  
  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.9,
    metalness: 0.05,
    emissive: color,
    emissiveIntensity: 0.08
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = size * 0.25;
  group.add(mesh);
  
  return group;
}

function createTubeCoral(size: number, color: THREE.Color): THREE.Group {
  const group = new THREE.Group();
  const tubeCount = 8 + Math.floor(Math.random() * 6);
  
  for (let i = 0; i < tubeCount; i++) {
    const tubeHeight = size * (0.4 + Math.random() * 0.6);
    const tubeRadius = size * 0.06 + Math.random() * size * 0.04;
    const geometry = new THREE.CylinderGeometry(
      tubeRadius * 0.7, tubeRadius, tubeHeight, 8
    );
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.6,
      metalness: 0.15,
      emissive: color,
      emissiveIntensity: 0.2
    });
    const mesh = new THREE.Mesh(geometry, material);
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * size * 0.25;
    mesh.position.set(
      Math.cos(angle) * radius,
      tubeHeight / 2,
      Math.sin(angle) * radius
    );
    mesh.rotation.z = (Math.random() - 0.5) * 0.25;
    mesh.rotation.x = (Math.random() - 0.5) * 0.25;
    group.add(mesh);
    
    const tipGeo = new THREE.CircleGeometry(tubeRadius * 0.9, 8);
    const tipMat = new THREE.MeshStandardMaterial({
      color: color.clone().multiplyScalar(1.3),
      emissive: color.clone().multiplyScalar(1.3),
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide
    });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.set(
      mesh.position.x,
      tubeHeight + 0.01,
      mesh.position.z
    );
    tip.rotation.x = -Math.PI / 2;
    tip.rotation.z = mesh.rotation.z;
    group.add(tip);
  }
  
  return group;
}

function createFanCoral(size: number, color: THREE.Color): THREE.Group {
  const group = new THREE.Group();
  
  const shape = new THREE.Shape();
  const fanRadius = size * 0.6;
  shape.moveTo(0, 0);
  for (let i = 0; i <= 20; i++) {
    const angle = (i / 20) * Math.PI - Math.PI / 2;
    const r = fanRadius * (0.8 + Math.sin(angle * 3) * 0.2);
    shape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r + size * 0.1);
  }
  shape.lineTo(0, 0);
  
  const extrudeSettings = {
    depth: size * 0.06,
    bevelEnabled: true,
    bevelThickness: size * 0.01,
    bevelSize: size * 0.01,
    bevelSegments: 2
  };
  
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const wave = Math.sin(x * 5 / size + y * 3 / size) * size * 0.04;
    positions.setZ(i, z + wave);
  }
  geometry.computeVertexNormals();
  
  const material = new THREE.MeshStandardMaterial({
    color: color,
    roughness: 0.75,
    metalness: 0.1,
    side: THREE.DoubleSide,
    emissive: color,
    emissiveIntensity: 0.12
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = -size * 0.03;
  mesh.rotation.y = (Math.random() - 0.5) * 0.5;
  group.add(mesh);
  
  const stemGeo = new THREE.CylinderGeometry(size * 0.04, size * 0.06, size * 0.35, 6);
  const stemMat = new THREE.MeshStandardMaterial({
    color: color.clone().multiplyScalar(0.7),
    roughness: 0.8
  });
  const stem = new THREE.Mesh(stemGeo, stemMat);
  stem.position.y = size * 0.15;
  group.add(stem);
  
  return group;
}

const CORAL_CREATORS: Record<CoralType, (size: number, color: THREE.Color) => THREE.Group> = {
  branching: createBranchingCoral,
  leaf: createLeafCoral,
  brain: createBrainCoral,
  tube: createTubeCoral,
  fan: createFanCoral
};

export class Coral {
  state: CoralState;
  private pulsePhase: number;

  constructor(type: CoralType, position: THREE.Vector3, initialSize?: number) {
    this.pulsePhase = Math.random() * Math.PI * 2;
    const color = randomColor();
    const size = initialSize ?? (12 + Math.random() * 8);
    
    const creator = CORAL_CREATORS[type];
    const mesh = creator(size, color);
    mesh.position.copy(position);
    
    const glowGeo = new THREE.RingGeometry(size * 0.5, size * 1.2, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.rotation.x = -Math.PI / 2;
    glowMesh.position.set(position.x, 0.05, position.z);
    mesh.add(glowMesh);
    
    this.state = {
      id: `coral_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      typeName: CORAL_TYPE_NAMES[type],
      position: position.clone(),
      color,
      colorHex: '#' + color.getHexString(),
      initialSize: size,
      currentSize: size,
      sizePercent: 100,
      health: 80 + Math.random() * 20,
      growthRate: 1,
      lightIntensity: 1,
      nutrientLevel: 1,
      glowIntensity: 0,
      nearbyCorals: 0,
      mesh,
      glowMesh,
      spawnTime: Date.now(),
      lastGrowthTime: Date.now()
    };
  }

  update(
    deltaTime: number,
    lightIntensity: number,
    nutrientLevel: number,
    nearbyCoralCount: number,
    nearbyFishDensity: number,
    timeScale: number
  ): void {
    this.state.lightIntensity = lightIntensity;
    this.state.nutrientLevel = nutrientLevel;
    this.state.nearbyCorals = nearbyCoralCount;
    
    const lightFactor = 0.5 + lightIntensity * 0.5;
    const fishFactor = 0.8 + Math.min(nearbyFishDensity, 3) * 0.15;
    const competitionFactor = nearbyCoralCount > 4 ? 0.3 : 1;
    
    this.state.health = THREE.MathUtils.clamp(
      (lightFactor * 40 + fishFactor * 35 + competitionFactor * 25),
      10, 100
    );
    
    this.state.growthRate = THREE.MathUtils.clamp(
      lightFactor * nutrientLevel * competitionFactor * (this.state.health / 80),
      0.5, 2.0
    );
    
    const now = Date.now();
    const growthInterval = 30000 / timeScale;
    if (now - this.state.lastGrowthTime >= growthInterval) {
      const growthAmount = 0.05 * this.state.growthRate;
      this.state.currentSize = this.state.initialSize * (1 + growthAmount);
      const targetScale = 1 + growthAmount;
      this.state.mesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
      this.state.sizePercent = (this.state.currentSize / this.state.initialSize) * 100;
      this.state.lastGrowthTime = now;
    }
    
    this.pulsePhase += deltaTime * 1.5 * timeScale;
    const pulse = 0.85 + Math.sin(this.pulsePhase) * 0.15;
    this.state.mesh.scale.multiplyScalar(1);
    
    this.state.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        child.material.emissiveIntensity = 0.1 + this.state.health / 500 * pulse;
      }
    });
    
    if (this.state.glowMesh) {
      const age = (now - this.state.spawnTime) / 3000;
      if (age < 1) {
        const mat = this.state.glowMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = (1 - age) * 0.6;
      } else {
        const mat = this.state.glowMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0;
      }
    }
  }

  getInfo(): Record<string, string | number> {
    return {
      '种类': this.state.typeName,
      '颜色值': this.state.colorHex,
      '当前尺寸': Math.round(this.state.sizePercent) + '%',
      '健康度': Math.round(this.state.health) + '%',
      '生长速度': this.state.growthRate.toFixed(2) + 'x'
    };
  }

  dispose(): void {
    this.state.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}

export function getRandomCoralType(): CoralType {
  const types: CoralType[] = ['branching', 'leaf', 'brain', 'tube', 'fan'];
  return types[Math.floor(Math.random() * types.length)];
}
