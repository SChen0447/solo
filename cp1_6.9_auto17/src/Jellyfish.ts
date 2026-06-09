import * as THREE from 'three';
import { createNoise3D } from 'simplex-noise';

export enum GlowState {
  IDLE = 'idle',
  WARNING = 'warning',
  RESPONSE = 'response'
}

interface JellyfishConfig {
  position: THREE.Vector3;
  contractionFrequency: number;
  opacity: number;
  hueOffset: number;
}

interface TentacleData {
  line: THREE.Line;
  nodes: THREE.Mesh[];
  baseLength: number;
  phaseOffset: number;
  basePoints: THREE.Vector3[];
}

interface OralArmData {
  mesh: THREE.Mesh;
  curve: THREE.CatmullRomCurve3;
  phaseOffset: number;
}

const noise3D = createNoise3D();

const sharedNodeGeometry = new THREE.SphereGeometry(0.05, 8, 8);

export class Jellyfish {
  public group: THREE.Group;
  public glowState: GlowState;
  public isTracked: boolean;
  public trackRing: THREE.Mesh | null;
  public glowColor: THREE.Color;

  private bell: THREE.Mesh;
  private bellMaterial: THREE.MeshBasicMaterial;
  private bellGeometry: THREE.SphereGeometry;
  private tentacles: TentacleData[];
  private oralArms: OralArmData[];
  private nodeMaterials: THREE.MeshBasicMaterial[];

  private contractionFrequency: number;
  private opacity: number;
  private hueOffset: number;
  private time: number;
  private noisePosition: THREE.Vector3;
  private velocity: THREE.Vector3;
  private glowStateTimer: number;
  private glowPhase: number;
  private lastResponseTrigger: number;
  private bellOriginalPositions: Float32Array;

  constructor(config: JellyfishConfig) {
    this.group = new THREE.Group();
    this.group.position.copy(config.position);
    
    this.glowState = GlowState.IDLE;
    this.isTracked = false;
    this.trackRing = null;
    this.glowColor = new THREE.Color(0x00ffff);

    this.contractionFrequency = config.contractionFrequency;
    this.opacity = config.opacity;
    this.hueOffset = config.hueOffset;
    this.time = Math.random() * 10;
    this.noisePosition = config.position.clone();
    this.velocity = new THREE.Vector3();
    this.glowStateTimer = 0;
    this.glowPhase = 0;
    this.lastResponseTrigger = -10;
    this.nodeMaterials = [];

    this.tentacles = [];
    this.oralArms = [];

    this.createBell();
    this.createOralArms();
    this.createTentacles();
    this.createTrackRing();
  }

  private createBell(): void {
    this.bellGeometry = new THREE.SphereGeometry(0.8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    
    this.bellOriginalPositions = (this.bellGeometry.attributes.position.array as Float32Array).slice();

    this.bellMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: this.opacity,
      side: THREE.DoubleSide,
      vertexColors: false
    });

    this.bell = new THREE.Mesh(this.bellGeometry, this.bellMaterial);
    this.group.add(this.bell);
  }

  private createOralArms(): void {
    const armCount = 4;

    for (let i = 0; i < armCount; i++) {
      const angle = (i / armCount) * Math.PI * 2;
      const points: THREE.Vector3[] = [];
      const segments = 8;

      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const radius = 0.1 + t * 0.3;
        const x = Math.cos(angle) * radius * (1 + t * 0.5);
        const y = -t * 1.2;
        const z = Math.sin(angle) * radius * (1 + t * 0.5);
        points.push(new THREE.Vector3(x, y, z));
      }

      const curve = new THREE.CatmullRomCurve3(points);
      const tubeGeometry = new THREE.TubeGeometry(curve, segments, 0.06, 8, false);
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: this.opacity * 0.8,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(tubeGeometry, material);
      this.group.add(mesh);

      this.oralArms.push({
        mesh,
        curve,
        phaseOffset: (i / armCount) * Math.PI * 2
      });
    }
  }

  private createTentacles(): void {
    const tentacleCount = 16;

    for (let i = 0; i < tentacleCount; i++) {
      const angle = (i / tentacleCount) * Math.PI * 2;
      const baseLength = 1.5 + Math.random() * 1.0;
      const segments = 20;
      const points: THREE.Vector3[] = [];
      const basePoints: THREE.Vector3[] = [];

      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const x = Math.cos(angle) * 0.7;
        const y = -t * baseLength;
        const z = Math.sin(angle) * 0.7;
        const point = new THREE.Vector3(x, y, z);
        points.push(point.clone());
        basePoints.push(point.clone());
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.6
      });

      const line = new THREE.Line(geometry, material);
      this.group.add(line);

      const nodes: THREE.Mesh[] = [];
      const nodeInterval = Math.floor(segments / 4);
      
      for (let j = nodeInterval; j <= segments; j += nodeInterval) {
        const nodeMaterial = new THREE.MeshBasicMaterial({
          color: 0x00ffff,
          transparent: true,
          opacity: 0.8
        });
        this.nodeMaterials.push(nodeMaterial);
        
        const node = new THREE.Mesh(sharedNodeGeometry, nodeMaterial);
        node.position.copy(points[j]);
        this.group.add(node);
        nodes.push(node);
      }

      this.tentacles.push({
        line,
        nodes,
        baseLength,
        phaseOffset: Math.random() * Math.PI * 2,
        basePoints
      });
    }
  }

  private createTrackRing(): void {
    const geometry = new THREE.RingGeometry(1.1, 1.2, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    this.trackRing = new THREE.Mesh(geometry, material);
    this.trackRing.rotation.x = -Math.PI / 2;
    this.trackRing.position.y = -0.1;
    this.group.add(this.trackRing);
  }

  public triggerResponse(): void {
    if (this.time - this.lastResponseTrigger < 3) return;
    this.glowState = GlowState.RESPONSE;
    this.glowStateTimer = 0.3;
    this.lastResponseTrigger = this.time;
  }

  public triggerWarning(): void {
    this.glowState = GlowState.WARNING;
    this.glowStateTimer = 2;
  }

  public setTracked(tracked: boolean): void {
    this.isTracked = tracked;
    if (tracked) {
      this.triggerResponse();
    }
  }

  public getPosition(): THREE.Vector3 {
    return this.group.position.clone();
  }

  public getGlowStateText(): string {
    switch (this.glowState) {
      case GlowState.IDLE: return '空闲闪烁';
      case GlowState.WARNING: return '警告闪烁';
      case GlowState.RESPONSE: return '回应闪烁';
    }
  }

  public getAllMeshes(): THREE.Object3D[] {
    const meshes: THREE.Object3D[] = [this.bell];
    for (const arm of this.oralArms) meshes.push(arm.mesh);
    for (const tentacle of this.tentacles) {
      meshes.push(tentacle.line);
      for (const node of tentacle.nodes) meshes.push(node);
    }
    return meshes;
  }

  private updateGlow(delta: number): void {
    this.glowStateTimer -= delta;
    this.glowPhase += delta;

    if (this.glowStateTimer <= 0 && this.glowState !== GlowState.IDLE) {
      this.glowState = GlowState.IDLE;
    }

    let color: THREE.Color;
    let opacity: number;

    switch (this.glowState) {
      case GlowState.IDLE: {
        const t = (Math.sin(this.glowPhase * (Math.PI * 2 / 3)) + 1) / 2;
        const idleStart = new THREE.Color(0x00ffff);
        const idleEnd = new THREE.Color(0x0077ff);
        color = idleStart.clone().lerp(idleEnd, t);
        opacity = 0.6 + t * 0.2;
        break;
      }
      case GlowState.WARNING: {
        const t = (Math.sin(this.glowPhase * (Math.PI * 2 / 0.5)) + 1) / 2;
        color = new THREE.Color(0xff00ff);
        opacity = 0.5 + t * 0.4;
        break;
      }
      case GlowState.RESPONSE: {
        const t = 1 - (this.glowStateTimer / 0.3);
        color = new THREE.Color(0xffffff);
        opacity = 0.9 - t * 0.4;
        break;
      }
    }

    this.glowColor = color;

    const hueShift = Math.sin(this.time * 0.3 + this.hueOffset) * 0.1;
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    hsl.h = (hsl.h + hueShift + 1) % 1;
    const adjustedColor = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);

    this.bellMaterial.color.copy(adjustedColor);
    this.bellMaterial.opacity = this.opacity * (0.7 + opacity * 0.3);

    for (const arm of this.oralArms) {
      (arm.mesh.material as THREE.MeshBasicMaterial).color.copy(adjustedColor);
      (arm.mesh.material as THREE.MeshBasicMaterial).opacity = this.opacity * 0.7 * opacity;
    }

    for (const tentacle of this.tentacles) {
      (tentacle.line.material as THREE.LineBasicMaterial).color.copy(adjustedColor);
      (tentacle.line.material as THREE.LineBasicMaterial).opacity = 0.5 * opacity;
      
      for (const node of tentacle.nodes) {
        (node.material as THREE.MeshBasicMaterial).color.copy(adjustedColor);
        (node.material as THREE.MeshBasicMaterial).opacity = opacity;
      }
    }
  }

  private updateBell(): void {
    const contraction = Math.sin(this.time * (Math.PI * 2 / this.contractionFrequency));
    const positions = this.bellGeometry.attributes.position.array as Float32Array;
    
    for (let i = 0; i < positions.length; i += 3) {
      const origX = this.bellOriginalPositions[i];
      const origY = this.bellOriginalPositions[i + 1];
      const origZ = this.bellOriginalPositions[i + 2];
      
      const yFactor = 1 - origY / 0.8;
      const squeeze = contraction * 0.15 * yFactor;
      
      positions[i] = origX * (1 + squeeze);
      positions[i + 2] = origZ * (1 + squeeze);
      positions[i + 1] = origY * (1 - contraction * 0.1 * yFactor);
    }
    
    this.bellGeometry.attributes.position.needsUpdate = true;
    this.bellGeometry.computeVertexNormals();
  }

  private updateOralArms(): void {
    for (const arm of this.oralArms) {
      const positions = arm.mesh.geometry.attributes.position.array as Float32Array;
      const count = positions.length / 3;
      
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const wave = Math.sin(this.time * 2 + arm.phaseOffset + t * 3) * 0.15 * t;
        const sway = Math.sin(this.time * 1.5 + arm.phaseOffset) * 0.05 * t;
        
        positions[i * 3] = arm.curve.points[i].x + wave;
        positions[i * 3 + 1] = arm.curve.points[i].y;
        positions[i * 3 + 2] = arm.curve.points[i].z + sway;
      }
      
      arm.mesh.geometry.attributes.position.needsUpdate = true;
      arm.mesh.geometry.computeVertexNormals();
    }
  }

  private updateTentacles(): void {
    for (const tentacle of this.tentacles) {
      const positions = tentacle.line.geometry.attributes.position.array as Float32Array;
      const count = positions.length / 3;
      
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1);
        const wave = Math.sin(this.time * 2.5 + tentacle.phaseOffset + t * 4) * 0.2 * t;
        const wave2 = Math.cos(this.time * 2 + tentacle.phaseOffset * 0.7 + t * 3) * 0.1 * t;
        
        positions[i * 3] = tentacle.basePoints[i].x + wave;
        positions[i * 3 + 1] = tentacle.basePoints[i].y;
        positions[i * 3 + 2] = tentacle.basePoints[i].z + wave2;
      }
      
      tentacle.line.geometry.attributes.position.needsUpdate = true;

      let nodeIndex = 0;
      const nodeInterval = Math.floor(count / tentacle.nodes.length);
      for (let j = nodeInterval; j < count && nodeIndex < tentacle.nodes.length; j += nodeInterval) {
        tentacle.nodes[nodeIndex].position.set(
          positions[j * 3],
          positions[j * 3 + 1],
          positions[j * 3 + 2]
        );
        nodeIndex++;
      }
    }
  }

  private updateMovement(delta: number, speedMultiplier: number): void {
    const noiseScale = 0.1;
    const timeScale = 0.5;

    const nx = noise3D(
      this.noisePosition.x * noiseScale,
      this.noisePosition.y * noiseScale,
      this.time * timeScale
    );
    const ny = noise3D(
      this.noisePosition.x * noiseScale + 100,
      this.noisePosition.z * noiseScale,
      this.time * timeScale
    );
    const nz = noise3D(
      this.noisePosition.z * noiseScale + 200,
      this.noisePosition.y * noiseScale,
      this.time * timeScale
    );

    const targetVel = new THREE.Vector3(nx, ny, nz).multiplyScalar(0.5);
    
    const center = new THREE.Vector3(0, 0, 0);
    const toCenter = center.clone().sub(this.group.position);
    const dist = toCenter.length();
    if (dist > 10) {
      targetVel.add(toCenter.normalize().multiplyScalar((dist - 10) * 0.1));
    }

    this.velocity.lerp(targetVel, delta * 0.5);
    this.velocity.y = THREE.MathUtils.clamp(this.velocity.y, -0.3, 0.3);

    const moveSpeed = 0.8 * speedMultiplier;
    this.group.position.add(this.velocity.clone().multiplyScalar(delta * moveSpeed));

    this.group.position.y = THREE.MathUtils.clamp(this.group.position.y, -3, 3);
    this.group.position.x = THREE.MathUtils.clamp(this.group.position.x, -12, 12);
    this.group.position.z = THREE.MathUtils.clamp(this.group.position.z, -12, 12);

    this.noisePosition.add(this.velocity.clone().multiplyScalar(delta * 0.3));

    const tiltAmount = 0.1;
    this.group.rotation.x = THREE.MathUtils.lerp(
      this.group.rotation.x,
      -this.velocity.y * tiltAmount,
      delta * 2
    );
    this.group.rotation.z = THREE.MathUtils.lerp(
      this.group.rotation.z,
      this.velocity.x * tiltAmount,
      delta * 2
    );
  }

  private updateTrackRing(): void {
    if (!this.trackRing) return;
    
    const material = this.trackRing.material as THREE.MeshBasicMaterial;
    if (this.isTracked) {
      const pulse = (Math.sin(this.time * Math.PI * 4) + 1) / 2;
      material.opacity = 0.3 + pulse * 0.5;
      this.trackRing.scale.setScalar(1 + pulse * 0.1);
    } else {
      material.opacity = 0;
    }
  }

  public update(delta: number, time: number, speedMultiplier: number): void {
    this.time = time;
    
    this.updateMovement(delta, speedMultiplier);
    this.updateBell();
    this.updateOralArms();
    this.updateTentacles();
    this.updateGlow(delta);
    this.updateTrackRing();
  }
}
