import * as THREE from 'three';
import type { Particle } from './particleSystem';

export interface Cluster {
  id: number;
  center: THREE.Vector3;
  particles: Particle[];
  color: THREE.Color;
  targetColor: THREE.Color;
  boundingBox: THREE.Box3;
}

export interface LightSculptureOptions {
  gridCellSize?: number;
  densityThreshold?: number;
  clusterInterval?: number;
  shrinkFactor?: number;
}

export class LightSculpture {
  private scene: THREE.Scene;
  private gridCellSize: number;
  private densityThreshold: number;
  private clusterInterval: number;
  private shrinkFactor: number;
  
  private clusters: Cluster[] = [];
  private clusterLines: THREE.Group;
  private lastClusterTime: number = 0;
  private clusterIdCounter: number = 0;
  
  private gradientColors: THREE.Color[];
  
  constructor(scene: THREE.Scene, options: LightSculptureOptions = {}) {
    this.scene = scene;
    this.gridCellSize = options.gridCellSize ?? 30;
    this.densityThreshold = options.densityThreshold ?? 8;
    this.clusterInterval = options.clusterInterval ?? 0.5;
    this.shrinkFactor = options.shrinkFactor ?? 0.7;
    
    this.gradientColors = [
      new THREE.Color(0xFF69B4),
      new THREE.Color(0x9370DB),
      new THREE.Color(0x4169E1),
      new THREE.Color(0x00CED1),
      new THREE.Color(0x7B68EE),
      new THREE.Color(0xEE82EE)
    ];
    
    this.clusterLines = new THREE.Group();
    this.scene.add(this.clusterLines);
  }
  
  public update(particles: Particle[], currentTime: number, deltaTime: number): Cluster[] {
    if (currentTime - this.lastClusterTime >= this.clusterInterval) {
      this.performClustering(particles);
      this.lastClusterTime = currentTime;
    }
    
    this.updateClusterColors(deltaTime);
    this.applyShrinkForce(particles, deltaTime);
    
    return this.clusters;
  }
  
  private performClustering(particles: Particle[]): void {
    const gridMap = new Map<string, Particle[]>();
    
    for (const particle of particles) {
      const key = this.getGridKey(particle.position);
      if (!gridMap.has(key)) {
        gridMap.set(key, []);
      }
      gridMap.get(key)!.push(particle);
    }
    
    const denseCells: { key: string; particles: Particle[]; center: THREE.Vector3 }[] = [];
    
    for (const [key, cellParticles] of gridMap) {
      if (cellParticles.length >= this.densityThreshold) {
        const center = this.calculateCellCenter(key);
        denseCells.push({ key, particles: cellParticles, center });
      }
    }
    
    const visited = new Set<string>();
    const newClusters: Cluster[] = [];
    let clusterIndex = 0;
    
    for (const cell of denseCells) {
      if (visited.has(cell.key)) continue;
      
      const clusterParticles: Particle[] = [];
      const queue = [cell];
      visited.add(cell.key);
      
      while (queue.length > 0) {
        const current = queue.shift()!;
        clusterParticles.push(...current.particles);
        
        const neighbors = this.getNeighborKeys(current.key);
        for (const neighborKey of neighbors) {
          if (!visited.has(neighborKey) && gridMap.has(neighborKey) && 
              gridMap.get(neighborKey)!.length >= this.densityThreshold) {
            visited.add(neighborKey);
            const neighborCell = gridMap.get(neighborKey)!;
            const neighborCenter = this.calculateCellCenter(neighborKey);
            queue.push({ key: neighborKey, particles: neighborCell, center: neighborCenter });
          }
        }
      }
      
      if (clusterParticles.length >= this.densityThreshold) {
        const center = new THREE.Vector3();
        for (const p of clusterParticles) {
          center.add(p.position);
        }
        center.divideScalar(clusterParticles.length);
        
        const boundingBox = new THREE.Box3();
        for (const p of clusterParticles) {
          boundingBox.expandByPoint(p.position);
        }
        
        const colorIndex = clusterIndex % this.gradientColors.length;
        const nextColorIndex = (colorIndex + 1) % this.gradientColors.length;
        const color = this.gradientColors[colorIndex].clone();
        const targetColor = this.gradientColors[nextColorIndex].clone();
        
        const cluster: Cluster = {
          id: this.clusterIdCounter++,
          center,
          particles: clusterParticles,
          color,
          targetColor,
          boundingBox
        };
        
        for (const p of clusterParticles) {
          p.clusterId = cluster.id;
        }
        
        newClusters.push(cluster);
        clusterIndex++;
      }
    }
    
    this.clusters = newClusters;
    this.updateClusterLines();
  }
  
  private getGridKey(position: THREE.Vector3): string {
    const gx = Math.floor(position.x / this.gridCellSize);
    const gy = Math.floor(position.y / this.gridCellSize);
    const gz = Math.floor(position.z / this.gridCellSize);
    return `${gx},${gy},${gz}`;
  }
  
  private calculateCellCenter(key: string): THREE.Vector3 {
    const [gx, gy, gz] = key.split(',').map(Number);
    return new THREE.Vector3(
      (gx + 0.5) * this.gridCellSize,
      (gy + 0.5) * this.gridCellSize,
      (gz + 0.5) * this.gridCellSize
    );
  }
  
  private getNeighborKeys(key: string): string[] {
    const [gx, gy, gz] = key.split(',').map(Number);
    const neighbors: string[] = [];
    
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (dx === 0 && dy === 0 && dz === 0) continue;
          neighbors.push(`${gx + dx},${gy + dy},${gz + dz}`);
        }
      }
    }
    
    return neighbors;
  }
  
  private updateClusterColors(deltaTime: number): void {
    for (const cluster of this.clusters) {
      const lerpSpeed = 0.3 * deltaTime;
      cluster.color.lerp(cluster.targetColor, lerpSpeed);
      
      const rDiff = cluster.color.r - cluster.targetColor.r;
      const gDiff = cluster.color.g - cluster.targetColor.g;
      const bDiff = cluster.color.b - cluster.targetColor.b;
      const colorDistance = Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
      if (colorDistance < 0.05) {
        const randomIndex = Math.floor(Math.random() * this.gradientColors.length);
        cluster.targetColor = this.gradientColors[randomIndex].clone();
      }
    }
  }
  
  private applyShrinkForce(_particles: Particle[], deltaTime: number): void {
    for (const cluster of this.clusters) {
      for (const particle of cluster.particles) {
        if (particle.clusterId !== cluster.id) continue;
        
        const direction = new THREE.Vector3()
          .subVectors(cluster.center, particle.position);
        
        const distance = direction.length();
        if (distance > 0.1) {
          direction.normalize();
          const shrinkSpeed = distance * (1 - this.shrinkFactor) * 0.5;
          particle.velocity.add(direction.multiplyScalar(shrinkSpeed * deltaTime * 60));
        }
      }
    }
  }
  
  private updateClusterLines(): void {
    while (this.clusterLines.children.length > 0) {
      const child = this.clusterLines.children[0];
      if (child instanceof THREE.Line) {
        child.geometry.dispose();
        if (child.material instanceof THREE.LineBasicMaterial) {
          child.material.dispose();
        }
      }
      this.clusterLines.remove(child);
    }
    
    for (const cluster of this.clusters) {
      const points = this.createClusterOutlinePoints(cluster);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: cluster.color,
        transparent: true,
        opacity: 0.3,
        linewidth: 1
      });
      const line = new THREE.LineLoop(geometry, material);
      this.clusterLines.add(line);
    }
  }
  
  private createClusterOutlinePoints(cluster: Cluster): THREE.Vector3[] {
    const { boundingBox } = cluster;
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    const center = new THREE.Vector3();
    boundingBox.getCenter(center);
    
    const halfW = size.x / 2;
    const halfH = size.y / 2;
    const halfD = size.z / 2;
    
    const points: THREE.Vector3[] = [
      new THREE.Vector3(-halfW, -halfH, -halfD),
      new THREE.Vector3(halfW, -halfH, -halfD),
      new THREE.Vector3(halfW, halfH, -halfD),
      new THREE.Vector3(-halfW, halfH, -halfD),
      new THREE.Vector3(-halfW, -halfH, halfD),
      new THREE.Vector3(halfW, -halfH, halfD),
      new THREE.Vector3(halfW, halfH, halfD),
      new THREE.Vector3(-halfW, halfH, halfD)
    ];
    
    const detailedPoints: THREE.Vector3[] = [];
    const segments = 4;
    
    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7]
    ];
    
    for (const edge of edges) {
      const start = points[edge[0]];
      const end = points[edge[1]];
      for (let i = 0; i < segments; i++) {
        const t = i / segments;
        const p = new THREE.Vector3().lerpVectors(start, end, t);
        detailedPoints.push(p.add(center));
      }
    }
    
    return detailedPoints;
  }
  
  public getClusters(): Cluster[] {
    return this.clusters;
  }
  
  public getClusterColors(): Map<number, THREE.Color> {
    const colorMap = new Map<number, THREE.Color>();
    for (const cluster of this.clusters) {
      colorMap.set(cluster.id, cluster.color.clone());
    }
    return colorMap;
  }
  
  public dispose(): void {
    while (this.clusterLines.children.length > 0) {
      const child = this.clusterLines.children[0];
      if (child instanceof THREE.Line) {
        child.geometry.dispose();
        if (child.material instanceof THREE.LineBasicMaterial) {
          child.material.dispose();
        }
      }
      this.clusterLines.remove(child);
    }
    this.scene.remove(this.clusterLines);
  }
}
