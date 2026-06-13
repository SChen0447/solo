import * as THREE from 'three';
import { ParticleButterfly } from './ParticleButterfly';

const TRAIL_LENGTH = 10;
const TRAIL_WIDTH_START = 0.05;
const TRAIL_WIDTH_END = 0;

export class TrailRenderer {
  public mesh: THREE.Mesh;
  public geometry: THREE.BufferGeometry;
  public material: THREE.MeshBasicMaterial;
  
  private particleButterfly: ParticleButterfly;
  private trailCount: number;
  private trailLength: number;
  
  private trailPositions: Array<Array<THREE.Vector3>> = [];
  private currentIndex: number = 0;

  constructor(particleButterfly: ParticleButterfly) {
    this.particleButterfly = particleButterfly;
    this.trailCount = particleButterfly.getParticleCount();
    this.trailLength = TRAIL_LENGTH;
    
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    
    this.initializeTrails();
    this.buildGeometry();
  }

  private initializeTrails(): void {
    for (let i = 0; i < this.trailCount; i++) {
      const trail: THREE.Vector3[] = [];
      const startPos = this.particleButterfly.getParticlePosition(i).clone();
      
      for (let j = 0; j < this.trailLength; j++) {
        trail.push(startPos.clone());
      }
      
      this.trailPositions.push(trail);
    }
  }

  private buildGeometry(): void {
    const vertexCount = this.trailCount * this.trailLength * 2;
    const indexCount = this.trailCount * (this.trailLength - 1) * 6;
    
    const positions = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 3);
    const alphas = new Float32Array(vertexCount);
    const indices = new Uint32Array(indexCount);
    
    for (let i = 0; i < this.trailCount; i++) {
      const baseVertex = i * this.trailLength * 2;
      const baseIndex = i * (this.trailLength - 1) * 6;
      
      for (let j = 0; j < this.trailLength - 1; j++) {
        const idx = baseIndex + j * 6;
        const v0 = baseVertex + j * 2;
        const v1 = baseVertex + j * 2 + 1;
        const v2 = baseVertex + j * 2 + 2;
        const v3 = baseVertex + j * 2 + 3;
        
        indices[idx] = v0;
        indices[idx + 1] = v1;
        indices[idx + 2] = v2;
        indices[idx + 3] = v1;
        indices[idx + 4] = v3;
        indices[idx + 5] = v2;
      }
    }
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    
    this.updateGeometryData();
  }

  public update(deltaTime: number, camera: THREE.Camera): void {
    this.shiftTrails();
    this.updateGeometryData(camera);
  }

  private shiftTrails(): void {
    for (let i = 0; i < this.trailCount; i++) {
      const trail = this.trailPositions[i];
      
      for (let j = this.trailLength - 1; j > 0; j--) {
        trail[j].copy(trail[j - 1]);
      }
      
      trail[0].copy(this.particleButterfly.getParticlePosition(i));
    }
  }

  private updateGeometryData(camera?: THREE.Camera): void {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    
    for (let i = 0; i < this.trailCount; i++) {
      const trail = this.trailPositions[i];
      const particleColor = this.particleButterfly.getParticleColor(i);
      const baseVertex = i * this.trailLength * 2;
      
      for (let j = 0; j < this.trailLength; j++) {
        const pos = trail[j];
        const t = j / (this.trailLength - 1);
        const width = TRAIL_WIDTH_START * (1 - t) + TRAIL_WIDTH_END * t;
        
        let offsetX = width;
        let offsetY = 0;
        
        if (camera) {
          const nextPos = j < this.trailLength - 1 ? trail[j + 1] : trail[j - 1];
          const direction = new THREE.Vector3().subVectors(nextPos, pos).normalize();
          const cameraToPoint = new THREE.Vector3().subVectors(pos, camera.position).normalize();
          const right = new THREE.Vector3().crossVectors(direction, cameraToPoint).normalize();
          
          offsetX = right.x * width;
          offsetY = right.y * width;
          
          const offsetZ = right.z * width;
          
          const vIdx0 = baseVertex + j * 2;
          positions[vIdx0 * 3] = pos.x - offsetX;
          positions[vIdx0 * 3 + 1] = pos.y - offsetY;
          positions[vIdx0 * 3 + 2] = pos.z - offsetZ;
          
          const vIdx1 = baseVertex + j * 2 + 1;
          positions[vIdx1 * 3] = pos.x + offsetX;
          positions[vIdx1 * 3 + 1] = pos.y + offsetY;
          positions[vIdx1 * 3 + 2] = pos.z + offsetZ;
        } else {
          const vIdx0 = baseVertex + j * 2;
          positions[vIdx0 * 3] = pos.x - offsetX;
          positions[vIdx0 * 3 + 1] = pos.y;
          positions[vIdx0 * 3 + 2] = pos.z;
          
          const vIdx1 = baseVertex + j * 2 + 1;
          positions[vIdx1 * 3] = pos.x + offsetX;
          positions[vIdx1 * 3 + 1] = pos.y;
          positions[vIdx1 * 3 + 2] = pos.z;
        }
        
        const alpha = 1 - t;
        const vIdx0 = baseVertex + j * 2;
        colors[vIdx0 * 3] = particleColor.r * alpha;
        colors[vIdx0 * 3 + 1] = particleColor.g * alpha;
        colors[vIdx0 * 3 + 2] = particleColor.b * alpha;
        
        const vIdx1 = baseVertex + j * 2 + 1;
        colors[vIdx1 * 3] = particleColor.r * alpha;
        colors[vIdx1 * 3 + 1] = particleColor.g * alpha;
        colors[vIdx1 * 3 + 2] = particleColor.b * alpha;
      }
    }
    
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
