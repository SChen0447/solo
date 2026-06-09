import * as THREE from 'three';

export interface MineralConfig {
  id: string;
  name: string;
  color: string;
  hex: number;
}

export const MINERAL_CONFIGS: MineralConfig[] = [
  { id: 'sulfur', name: '硫磺', color: '#ffe135', hex: 0xffe135 },
  { id: 'pyrite', name: '黄铁矿', color: '#c0c0c0', hex: 0xc0c0c0 },
  { id: 'azurite', name: '蓝铜矿', color: '#4a7b9d', hex: 0x4a7b9d },
  { id: 'hematite', name: '赤铁矿', color: '#8b4513', hex: 0x8b4513 },
  { id: 'emerald', name: '翡翠', color: '#50c878', hex: 0x50c878 },
  { id: 'amethyst', name: '紫水晶', color: '#9966cc', hex: 0x9966cc }
];

export interface Mineral {
  group: THREE.Group;
  config: MineralConfig;
  collected: boolean;
  floatOffset: number;
}

function initInventory(): Record<string, number> {
  const inv: Record<string, number> = {};
  MINERAL_CONFIGS.forEach(c => { inv[c.id] = 0; });
  return inv;
}

if (typeof window !== 'undefined') {
  (window as any).__mineralInventory = initInventory();
}

function getInventory(): Record<string, number> {
  return (window as any).__mineralInventory as Record<string, number>;
}

export function clearInventory() {
  const inv = getInventory();
  if (inv) {
    MINERAL_CONFIGS.forEach(c => { inv[c.id] = 0; });
  }
}

export function getInventoryUniqueCount(): number {
  const inv = getInventory();
  if (!inv) return 0;
  return MINERAL_CONFIGS.filter(c => (inv[c.id] || 0) > 0).length;
}

export function getInventoryColors(): string[] {
  const inv = getInventory();
  if (!inv) return [];
  return MINERAL_CONFIGS.filter(c => (inv[c.id] || 0) > 0).map(c => c.color);
}

function createOctahedronCrystal(color: number, size: number): THREE.Mesh {
  const geo = new THREE.OctahedronGeometry(size, 0);
  const mat = new THREE.MeshPhysicalMaterial({
    color,
    metalness: 0.3,
    roughness: 0.15,
    transmission: 0.4,
    transparent: true,
    opacity: 0.85,
    thickness: 0.5,
    ior: 1.5,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    emissive: color,
    emissiveIntensity: 0.15
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createMineralCluster(config: MineralConfig): THREE.Group {
  const group = new THREE.Group();
  
  const crystalCount = 3 + Math.floor(Math.random() * 3);
  
  for (let i = 0; i < crystalCount; i++) {
    const size = 0.3 + Math.random() * 0.3;
    const crystal = createOctahedronCrystal(config.hex, size);
    
    const angle = (i / crystalCount) * Math.PI * 2 + Math.random() * 0.5;
    const radius = Math.random() * 0.2;
    crystal.position.set(
      Math.cos(angle) * radius,
      size * 0.5 + Math.random() * 0.2,
      Math.sin(angle) * radius
    );
    
    crystal.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    
    group.add(crystal);
  }
  
  return group;
}

export function createMinerals(scene: THREE.Scene, volcano: THREE.Group): Mineral[] {
  const minerals: Mineral[] = [];
  const existing = scene.children.filter(c => c.userData && c.userData.isMineralRoot);
  existing.forEach(e => scene.remove(e));
  
  const rootGroup = new THREE.Group();
  rootGroup.userData.isMineralRoot = true;
  scene.add(rootGroup);
  
  const volcanoPos = volcano.position.clone();
  
  const usedConfigs = new Set<string>();
  const minUnique = Math.min(5, MINERAL_CONFIGS.length);
  
  for (let i = 0; i < 10; i++) {
    let config: MineralConfig;
    
    if (usedConfigs.size < minUnique && i < minUnique) {
      const available = MINERAL_CONFIGS.filter(c => !usedConfigs.has(c.id));
      config = available[Math.floor(Math.random() * available.length)];
    } else {
      config = MINERAL_CONFIGS[Math.floor(Math.random() * MINERAL_CONFIGS.length)];
    }
    usedConfigs.add(config.id);
    
    const cluster = createMineralCluster(config);
    
    let angle: number;
    let dist: number;
    let x: number, z: number;
    let attempts = 0;
    
    do {
      angle = Math.random() * Math.PI * 2;
      dist = 4 + Math.random() * 5;
      x = volcanoPos.x + Math.cos(angle) * dist;
      z = volcanoPos.z + Math.sin(angle) * dist;
      attempts++;
    } while (
      (Math.abs(x) > 9 || Math.abs(z) > 9) && attempts < 20
    );
    
    cluster.position.set(x, 0.5, z);
    cluster.rotation.y = Math.random() * Math.PI * 2;
    
    const mineral: Mineral = {
      group: cluster,
      config,
      collected: false,
      floatOffset: Math.random() * Math.PI * 2
    };
    
    rootGroup.add(cluster);
    minerals.push(mineral);
  }
  
  let animFrame: number;
  const startTime = performance.now();
  
  const animateMinerals = () => {
    const elapsed = (performance.now() - startTime) / 1000;
    
    minerals.forEach(m => {
      if (!m.collected) {
        m.group.position.y = 0.5 + Math.sin(elapsed * 1.5 + m.floatOffset) * 0.1;
        m.group.rotation.y += 0.003;
        
        m.group.children.forEach((crystal, idx) => {
          if (crystal instanceof THREE.Mesh) {
            crystal.rotation.x += 0.005 + idx * 0.001;
            crystal.rotation.z += 0.003;
          }
        });
      }
    });
    
    animFrame = requestAnimationFrame(animateMinerals);
  };
  animateMinerals();
  
  const oldCleanup = (rootGroup.userData.cleanup as () => void);
  if (oldCleanup) oldCleanup();
  
  rootGroup.userData.cleanup = () => {
    cancelAnimationFrame(animFrame);
  };
  
  return minerals;
}

export function updateInventoryUI() {
  const grid = document.getElementById('inventory-grid');
  if (!grid) return;
  
  const inv = getInventory();
  grid.innerHTML = '';
  
  MINERAL_CONFIGS.forEach(config => {
    const count = inv[config.id] || 0;
    
    const item = document.createElement('div');
    item.className = 'inventory-item';
    item.style.opacity = count > 0 ? '1' : '0.4';
    
    const icon = document.createElement('div');
    icon.className = 'inventory-icon';
    icon.style.backgroundColor = config.color;
    icon.style.color = config.color;
    
    const name = document.createElement('span');
    name.className = 'inventory-name';
    name.textContent = config.name;
    
    const countEl = document.createElement('span');
    countEl.className = 'inventory-count';
    countEl.textContent = `x${count}`;
    
    item.appendChild(icon);
    item.appendChild(name);
    item.appendChild(countEl);
    
    grid.appendChild(item);
  });
}
