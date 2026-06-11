import * as THREE from 'three';

export interface SculptSettings {
  strength: number;
  brushRadius: number;
  symmetric: boolean;
}

export class ClayModel {
  public mesh: THREE.Mesh;
  private geometry: THREE.IcosahedronGeometry;
  private originalPositions: Float32Array;
  private targetPositions: Float32Array;
  private animationPositions: Float32Array;
  private positionAttribute: THREE.BufferAttribute;
  private colorAttribute: THREE.BufferAttribute;
  private settings: SculptSettings;
  private isSculpting: boolean = false;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private sculptDirection: number = 0;
  private lastHitPoint: THREE.Vector3 | null = null;
  private isAnimating: boolean = false;
  private animationProgress: number = 0;
  private animationStartPositions: Float32Array | null = null;
  private animationEndPositions: Float32Array | null = null;
  private smoothIterations: number = 2;

  constructor(radius: number = 1.5, detail: number = 3) {
    this.geometry = new THREE.IcosahedronGeometry(radius, detail);
    
    const vertexCount = this.geometry.attributes.position.count;
    
    const colors = new Float32Array(vertexCount * 3);
    for (let i = 0; i < vertexCount; i++) {
      colors[i * 3] = 0.85;
      colors[i * 3 + 1] = 0.75;
      colors[i * 3 + 2] = 0.65;
    }
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: false,
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    
    this.positionAttribute = this.geometry.attributes.position as THREE.BufferAttribute;
    this.colorAttribute = this.geometry.attributes.color as THREE.BufferAttribute;
    
    this.originalPositions = new Float32Array(this.positionAttribute.array);
    this.targetPositions = new Float32Array(this.positionAttribute.array);
    this.animationPositions = new Float32Array(this.positionAttribute.array);
    
    this.settings = {
      strength: 0.5,
      brushRadius: 0.25,
      symmetric: false
    };
    
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  public getSettings(): SculptSettings {
    return { ...this.settings };
  }

  public setStrength(value: number): void {
    this.settings.strength = Math.max(0.1, Math.min(1.0, value));
  }

  public setBrushRadius(value: number): void {
    this.settings.brushRadius = Math.max(0.1, Math.min(0.5, value));
  }

  public setSymmetric(value: boolean): void {
    this.settings.symmetric = value;
  }

  public startSculpt(normalizedMouseX: number, normalizedMouseY: number, camera: THREE.Camera, direction: number): boolean {
    this.mouse.x = normalizedMouseX;
    this.mouse.y = normalizedMouseY;
    this.sculptDirection = direction;
    this.raycaster.setFromCamera(this.mouse, camera);
    
    const intersects = this.raycaster.intersectObject(this.mesh);
    if (intersects.length > 0) {
      this.isSculpting = true;
      this.lastHitPoint = intersects[0].point.clone();
      this.applySculpt(this.lastHitPoint);
      return true;
    }
    return false;
  }

  public moveSculpt(normalizedMouseX: number, normalizedMouseY: number, camera: THREE.Camera): void {
    if (!this.isSculpting) return;
    
    this.mouse.x = normalizedMouseX;
    this.mouse.y = normalizedMouseY;
    this.raycaster.setFromCamera(this.mouse, camera);
    
    const intersects = this.raycaster.intersectObject(this.mesh);
    if (intersects.length > 0) {
      const hitPoint = intersects[0].point.clone();
      if (!this.lastHitPoint || hitPoint.distanceTo(this.lastHitPoint) > 0.01) {
        this.lastHitPoint = hitPoint;
        this.applySculpt(hitPoint);
      }
    }
  }

  public endSculpt(): void {
    this.isSculpting = false;
    this.lastHitPoint = null;
    this.smoothSurface();
  }

  private applySculpt(hitPoint: THREE.Vector3): void {
    const positions = this.positionAttribute.array as Float32Array;
    const brushRadius = this.settings.brushRadius;
    const strength = this.settings.strength * 0.15 * this.sculptDirection;
    const vertexCount = positions.length / 3;
    
    const localHitPoint = this.mesh.worldToLocal(hitPoint.clone());
    
    for (let i = 0; i < vertexCount; i++) {
      const i3 = i * 3;
      const vertex = new THREE.Vector3(
        positions[i3],
        positions[i3 + 1],
        positions[i3 + 2]
      );
      
      const distance = vertex.distanceTo(localHitPoint);
      
      if (distance < brushRadius) {
        const falloff = 1 - (distance / brushRadius);
        const smoothFalloff = falloff * falloff * (3 - 2 * falloff);
        const displacement = strength * smoothFalloff;
        
        const normal = vertex.clone().normalize();
        vertex.add(normal.multiplyScalar(displacement));
        
        positions[i3] = vertex.x;
        positions[i3 + 1] = vertex.y;
        positions[i3 + 2] = vertex.z;
        
        if (this.settings.symmetric) {
          const mirrorIndex = this.findMirrorVertex(i);
          if (mirrorIndex !== -1 && mirrorIndex !== i) {
            const m3 = mirrorIndex * 3;
            const mirrorVertex = new THREE.Vector3(
              positions[m3],
              positions[m3 + 1],
              positions[m3 + 2]
            );
            
            const mirrorNormal = mirrorVertex.clone().normalize();
            mirrorVertex.add(mirrorNormal.multiplyScalar(displacement));
            
            positions[m3] = mirrorVertex.x;
            positions[m3 + 1] = mirrorVertex.y;
            positions[m3 + 2] = mirrorVertex.z;
          }
        }
      }
    }
    
    this.positionAttribute.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  private findMirrorVertex(index: number): number {
    const positions = this.positionAttribute.array as Float32Array;
    const i3 = index * 3;
    const targetX = -positions[i3];
    const targetY = positions[i3 + 1];
    const targetZ = positions[i3 + 2];
    
    let closestIndex = -1;
    let closestDistance = Infinity;
    const vertexCount = positions.length / 3;
    
    for (let i = 0; i < vertexCount; i++) {
      if (i === index) continue;
      const i3b = i * 3;
      const dx = positions[i3b] - targetX;
      const dy = positions[i3b + 1] - targetY;
      const dz = positions[i3b + 2] - targetZ;
      const dist = dx * dx + dy * dy + dz * dz;
      
      if (dist < closestDistance) {
        closestDistance = dist;
        closestIndex = i;
      }
    }
    
    return closestDistance < 0.01 ? closestIndex : -1;
  }

  private smoothSurface(): void {
    const positions = this.positionAttribute.array as Float32Array;
    const vertexCount = positions.length / 3;
    
    const adjacency: number[][] = [];
    for (let i = 0; i < vertexCount; i++) {
      adjacency.push([]);
    }
    
    const indices = this.geometry.index;
    if (indices) {
      for (let i = 0; i < indices.count; i += 3) {
        const a = indices.getX(i);
        const b = indices.getX(i + 1);
        const c = indices.getX(i + 2);
        
        this.addAdjacency(adjacency, a, b);
        this.addAdjacency(adjacency, b, c);
        this.addAdjacency(adjacency, c, a);
      }
    }
    
    const originalPos = new Float32Array(positions);
    
    for (let iter = 0; iter < this.smoothIterations; iter++) {
      const tempPos = new Float32Array(positions);
      
      for (let i = 0; i < vertexCount; i++) {
        if (adjacency[i].length === 0) continue;
        
        let sumX = 0, sumY = 0, sumZ = 0;
        for (const neighbor of adjacency[i]) {
          sumX += tempPos[neighbor * 3];
          sumY += tempPos[neighbor * 3 + 1];
          sumZ += tempPos[neighbor * 3 + 2];
        }
        
        const count = adjacency[i].length;
        const i3 = i * 3;
        const lambda = 0.3;
        positions[i3] = tempPos[i3] * (1 - lambda) + (sumX / count) * lambda;
        positions[i3 + 1] = tempPos[i3 + 1] * (1 - lambda) + (sumY / count) * lambda;
        positions[i3 + 2] = tempPos[i3 + 2] * (1 - lambda) + (sumZ / count) * lambda;
      }
    }
    
    this.positionAttribute.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  private addAdjacency(adjacency: number[][], a: number, b: number): void {
    if (!adjacency[a].includes(b)) {
      adjacency[a].push(b);
    }
    if (!adjacency[b].includes(a)) {
      adjacency[b].push(a);
    }
  }

  public resetWithAnimation(duration: number = 500): void {
    this.animationStartPositions = new Float32Array(this.positionAttribute.array as Float32Array);
    this.animationEndPositions = new Float32Array(this.originalPositions);
    this.animationProgress = 0;
    this.isAnimating = true;
    this.animationDuration = duration;
  }

  private animationDuration: number = 500;
  private animationStartTime: number = 0;

  public update(deltaTime: number): void {
    if (this.isAnimating && this.animationStartPositions && this.animationEndPositions) {
      this.animationProgress += deltaTime * 1000;
      const t = Math.min(1, this.animationProgress / this.animationDuration);
      const easeT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      
      const positions = this.positionAttribute.array as Float32Array;
      for (let i = 0; i < positions.length; i++) {
        positions[i] = this.animationStartPositions[i] + 
          (this.animationEndPositions[i] - this.animationStartPositions[i]) * easeT;
      }
      
      this.positionAttribute.needsUpdate = true;
      this.geometry.computeVertexNormals();
      
      if (t >= 1) {
        this.isAnimating = false;
        this.animationStartPositions = null;
        this.animationEndPositions = null;
      }
    }
  }

  public getVertexCount(): number {
    return this.geometry.attributes.position.count;
  }

  public getColorAttribute(): THREE.BufferAttribute {
    return this.colorAttribute;
  }

  public updateColors(colors: Float32Array): void {
    const colorArray = this.colorAttribute.array as Float32Array;
    for (let i = 0; i < colors.length && i < colorArray.length; i++) {
      colorArray[i] = colors[i];
    }
    this.colorAttribute.needsUpdate = true;
  }
}
