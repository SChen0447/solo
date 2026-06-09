import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

export type CrystalColorType = 'amethyst' | 'emerald' | 'iceBlue' | 'gold';

export interface CrystalMetadata {
  name: string;
  colorHex: string;
  hardness: number;
  colorType: CrystalColorType;
}

export interface CrystalOutput {
  crystalGroups: THREE.Group[];
  rareGem: THREE.Mesh | null;
  rareGemGlow: THREE.Mesh | null;
}

export interface CrystalConfig {
  clusterCount: number;
  crystalsPerCluster: [number, number];
  crystalHeight: [number, number];
  crystalWidth: [number, number];
  densityBoostPoint?: THREE.Vector3;
  densityBoostRadius?: number;
  densityBoostFactor?: number;
}

const CRYSTAL_PRESETS: Record<Exclude<CrystalColorType, 'gold'>, CrystalMetadata[]> = {
  amethyst: [
    { name: '紫水晶', colorHex: '#8a2be2', hardness: 7, colorType: 'amethyst' },
    { name: '深紫晶', colorHex: '#6a0dad', hardness: 7, colorType: 'amethyst' },
    { name: '紫锂辉石', colorHex: '#9966cc', hardness: 6.5, colorType: 'amethyst' }
  ],
  emerald: [
    { name: '翡翠', colorHex: '#50c878', hardness: 7.5, colorType: 'emerald' },
    { name: '祖母绿', colorHex: '#046307', hardness: 7.5, colorType: 'emerald' },
    { name: '橄榄石', colorHex: '#90ee90', hardness: 6.5, colorType: 'emerald' }
  ],
  iceBlue: [
    { name: '海蓝宝', colorHex: '#87ceeb', hardness: 7.5, colorType: 'iceBlue' },
    { name: '蓝水晶', colorHex: '#4fc3f7', hardness: 7, colorType: 'iceBlue' },
    { name: '青金石', colorHex: '#1e90ff', hardness: 5.5, colorType: 'iceBlue' }
  ]
};

export class CrystalGenerator {
  private noise3D: (x: number, y: number, z: number) => number;

  constructor(seed: number = Math.random() * 10000) {
    this.noise3D = createNoise3D(() => seed);
  }

  public generate(surfacePoints: THREE.Vector3[], config: CrystalConfig): CrystalOutput {
    const crystalGroups: THREE.Group[] = [];
    let totalCrystals = 0;
    const maxTotalCrystals = 2000;

    let rareGem: THREE.Mesh | null = null;
    let rareGemGlow: THREE.Mesh | null = null;

    let adjustedClusterCount = config.clusterCount;

    if (config.densityBoostPoint && config.densityBoostRadius && config.densityBoostFactor) {
      const nearBoostPoint = surfacePoints.filter(p =>
        p.distanceTo(config.densityBoostPoint!) < config.densityBoostRadius!
      );
      if (nearBoostPoint.length > 0) {
        adjustedClusterCount = Math.floor(config.clusterCount * config.densityBoostFactor);

        const rareGemPos = nearBoostPoint[Math.floor(Math.random() * nearBoostPoint.length)];
        const result = this.createRareGem(rareGemPos);
        rareGem = result.gem;
        rareGemGlow = result.glow;
      }
    }

    const shuffledPoints = [...surfacePoints].sort(() => Math.random() - 0.5);
    const selectedPoints = shuffledPoints.slice(0, Math.min(adjustedClusterCount, shuffledPoints.length));

    for (let i = 0; i < selectedPoints.length; i++) {
      if (totalCrystals >= maxTotalCrystals) break;

      const position = selectedPoints[i];
      const crystalCount = Math.floor(
        config.crystalsPerCluster[0] +
        Math.random() * (config.crystalsPerCluster[1] - config.crystalsPerCluster[0])
      );

      const remainingSlots = maxTotalCrystals - totalCrystals;
      const actualCount = Math.min(crystalCount, remainingSlots);

      const group = this.createCrystalCluster(position, actualCount, config);
      crystalGroups.push(group);
      totalCrystals += actualCount;
    }

    return { crystalGroups, rareGem, rareGemGlow };
  }

  private createCrystalCluster(
    center: THREE.Vector3,
    count: number,
    config: CrystalConfig
  ): THREE.Group {
    const group = new THREE.Group();
    group.userData.isCrystalGroup = true;

    const colorTypes: CrystalColorType[] = ['amethyst', 'emerald', 'iceBlue'];
    const selectedColorType = colorTypes[Math.floor(Math.random() * colorTypes.length)] as Exclude<CrystalColorType, 'gold'>;
    const presets = CRYSTAL_PRESETS[selectedColorType];

    for (let i = 0; i < count; i++) {
      const preset = presets[Math.floor(Math.random() * presets.length)];
      const crystal = this.createSingleCrystal(config, preset);

      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.4;
      crystal.position.x = Math.cos(angle) * radius;
      crystal.position.z = Math.sin(angle) * radius;
      crystal.position.y = Math.random() * 0.1;

      const noiseRot = this.noise3D(
        center.x + i,
        center.y + i * 0.5,
        center.z + i
      );
      crystal.rotation.x = noiseRot * Math.PI * 0.6;
      crystal.rotation.z = (1 - noiseRot) * Math.PI * 0.4;
      crystal.rotation.y = Math.random() * Math.PI * 2;

      const scaleNoise = 0.7 + Math.abs(this.noise3D(center.x * 2, center.y * 2, center.z * 2)) * 0.6;
      crystal.scale.multiplyScalar(scaleNoise);

      group.add(crystal);
    }

    group.position.copy(center);

    const normalDir = center.clone().normalize();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalDir);
    group.quaternion.premultiply(quaternion);

    group.userData.metadata = group.children[0]?.userData.metadata || presets[0];

    return group;
  }

  private createSingleCrystal(
    config: CrystalConfig,
    metadata: CrystalMetadata
  ): THREE.Mesh {
    const height = config.crystalHeight[0] + Math.random() * (config.crystalHeight[1] - config.crystalHeight[0]);
    const width = config.crystalWidth[0] + Math.random() * (config.crystalWidth[1] - config.crystalWidth[0]);

    const geometry = new THREE.OctahedronGeometry(1, 0);
    const positions = geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);

      const noise = this.noise3D(x * 3, y * 3, z * 3) * 0.15;

      positions.setX(i, x * (width + noise));
      positions.setY(i, y * (height + noise * 0.5));
      positions.setZ(i, z * (width + noise));
    }

    geometry.computeVertexNormals();

    const color = new THREE.Color(metadata.colorHex);
    const material = new THREE.MeshPhongMaterial({
      color: color,
      shininess: 80,
      specular: new THREE.Color(0xffffff),
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.metadata = metadata;
    mesh.userData.isCrystal = true;
    mesh.userData.originalColor = color.clone();
    mesh.userData.colorType = metadata.colorType;
    mesh.userData.baseScale = mesh.scale.clone();

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  private createRareGem(position: THREE.Vector3): { gem: THREE.Mesh; glow: THREE.Mesh } {
    const gemGeometry = new THREE.IcosahedronGeometry(0.25, 1);
    const positions = gemGeometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const noise = this.noise3D(x * 4, y * 4, z * 4) * 0.2;
      positions.setX(i, x * (1 + noise));
      positions.setY(i, y * (1 + noise));
      positions.setZ(i, z * (1 + noise));
    }
    gemGeometry.computeVertexNormals();

    const gemMaterial = new THREE.MeshPhongMaterial({
      color: 0xffd700,
      shininess: 150,
      specular: 0xffffff,
      metalness: 0.9,
      emissive: 0xffa500,
      emissiveIntensity: 0.3
    });

    const gem = new THREE.Mesh(gemGeometry, gemMaterial);
    gem.position.copy(position);
    gem.userData.isRareGem = true;
    gem.userData.metadata = {
      name: '稀有金宝石',
      colorHex: '#ffd700',
      hardness: 10,
      colorType: 'gold' as CrystalColorType
    };
    gem.castShadow = true;

    const glowGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide,
      depthWrite: false
    });

    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(position);
    glow.userData.isGlow = true;

    return { gem, glow };
  }

  public applyColorFilter(crystalGroups: THREE.Group[], filter: string): void {
    for (const group of crystalGroups) {
      group.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.isCrystal) {
          const mat = child.material as THREE.MeshPhongMaterial;
          if (filter === 'all') {
            mat.opacity = 0.92;
            mat.transparent = true;
          } else {
            if (child.userData.colorType === filter) {
              mat.opacity = 0.92;
              mat.transparent = true;
            } else {
              mat.opacity = 0.1;
              mat.transparent = true;
            }
          }
        }
      });
    }
  }

  public reseed(seed: number): void {
    this.noise3D = createNoise3D(() => seed);
  }
}
