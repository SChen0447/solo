import * as THREE from 'three';
import type { CosmicEvent } from './dataManager';

export interface NodeObject {
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  pulseRing: THREE.Mesh;
  particles: THREE.Points;
  basePosition: THREE.Vector3;
  event: CosmicEvent;
  originalEmissiveIntensity: number;
}

export class TimelineRenderer {
  private scene: THREE.Scene;
  private nodes: NodeObject[] = [];
  private connectionLines: THREE.Line[] = [];
  private allParticles: THREE.Points | null = null;
  private particleVelocities: Float32Array | null = null;
  private particleEventIds: Int32Array | null = null;
  private focusedNodeId: number | null = null;
  private time: number = 0;
  private maxParticles: number = 4500;
  private reducedParticles: boolean = false;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  render(events: CosmicEvent[]): void {
    this.createNodes(events);
    this.createConnections(events);
    this.createCombinedParticles(events);
  }

  private createNodes(events: CosmicEvent[]): void {
    events.forEach((event) => {
      const radius = 0.5 + (event.importance - 1.2) / 0.8 * 1.5;

      const geometry = new THREE.SphereGeometry(radius, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: event.color,
        emissive: new THREE.Color(event.color),
        emissiveIntensity: 0.8,
        roughness: 0.2,
        metalness: 0.3,
        transparent: true,
        opacity: 1.0
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(event.position.x, event.position.y, event.position.z);
      sphere.userData = { eventId: event.id, type: 'timeline-node' };

      const glowGeometry = new THREE.SphereGeometry(radius * 1.5, 32, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: event.color,
        transparent: true,
        opacity: 0.15,
        side: THREE.BackSide
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.copy(sphere.position);

      const ringGeometry = new THREE.RingGeometry(radius * 1.8, radius * 1.85, 64);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: event.color,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide
      });
      const pulseRing = new THREE.Mesh(ringGeometry, ringMaterial);
      pulseRing.position.copy(sphere.position);
      pulseRing.lookAt(new THREE.Vector3(0, 10, 0));

      this.scene.add(sphere);
      this.scene.add(glow);
      this.scene.add(pulseRing);

      this.nodes.push({
        mesh: sphere,
        glow,
        pulseRing,
        particles: null as unknown as THREE.Points,
        basePosition: new THREE.Vector3(event.position.x, event.position.y, event.position.z),
        event,
        originalEmissiveIntensity: 0.8
      });
    });
  }

  private createConnections(events: CosmicEvent[]): void {
    for (let i = 0; i < events.length - 1; i++) {
      const startEvent = events[i];
      const endEvent = events[i + 1];

      const start = new THREE.Vector3(startEvent.position.x, startEvent.position.y, startEvent.position.z);
      const end = new THREE.Vector3(endEvent.position.x, endEvent.position.y, endEvent.position.z);
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      mid.y += 1;

      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const points = curve.getPoints(50);
      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      const startColor = new THREE.Color(startEvent.color);
      const endColor = new THREE.Color(endEvent.color);
      const colors = new Float32Array(points.length * 3);
      for (let j = 0; j < points.length; j++) {
        const t = j / (points.length - 1);
        const color = startColor.clone().lerp(endColor, t);
        colors[j * 3] = color.r;
        colors[j * 3 + 1] = color.g;
        colors[j * 3 + 2] = color.b;
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.5,
        linewidth: 2
      });

      const line = new THREE.Line(geometry, material);
      this.scene.add(line);
      this.connectionLines.push(line);
    }
  }

  private createCombinedParticles(events: CosmicEvent[]): void {
    let totalCount = 0;
    const perEventCounts: number[] = [];

    events.forEach((event) => {
      perEventCounts.push(event.particleCount);
      totalCount += event.particleCount;
    });

    if (totalCount > this.maxParticles) {
      totalCount = this.maxParticles;
      const scale = this.maxParticles / (events.reduce((s, e) => s + e.particleCount, 0));
      for (let i = 0; i < perEventCounts.length; i++) {
        perEventCounts[i] = Math.floor(perEventCounts[i] * scale);
      }
    }

    const positions = new Float32Array(totalCount * 3);
    const colors = new Float32Array(totalCount * 3);
    const sizes = new Float32Array(totalCount);
    const velocities = new Float32Array(totalCount * 3);
    const eventIds = new Int32Array(totalCount);

    let offset = 0;
    events.forEach((event, eventIndex) => {
      const count = perEventCounts[eventIndex];
      const eventColor = new THREE.Color(event.color);

      for (let i = 0; i < count; i++) {
        const idx = offset + i;
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.acos(2 * Math.random() - 1);
        const r = Math.random() * 2;

        positions[idx * 3] = event.position.x + r * Math.sin(theta) * Math.cos(phi);
        positions[idx * 3 + 1] = event.position.y + r * Math.sin(theta) * Math.sin(phi);
        positions[idx * 3 + 2] = event.position.z + r * Math.cos(theta);

        colors[idx * 3] = eventColor.r;
        colors[idx * 3 + 1] = eventColor.g;
        colors[idx * 3 + 2] = eventColor.b;

        sizes[idx] = 0.02 + Math.random() * 0.06;

        velocities[idx * 3] = (Math.random() - 0.5) * 0.01;
        velocities[idx * 3 + 1] = (Math.random() - 0.5) * 0.01;
        velocities[idx * 3 + 2] = (Math.random() - 0.5) * 0.01;

        eventIds[idx] = eventIndex;
      }
      offset += count;
    });

    this.particleVelocities = velocities;
    this.particleEventIds = eventIds;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.allParticles = new THREE.Points(geometry, material);
    this.scene.add(this.allParticles);
  }

  update(deltaTime: number): void {
    this.time += deltaTime;

    this.nodes.forEach((node) => {
      const material = node.mesh.material as THREE.MeshStandardMaterial;
      const pulseIntensity = 0.8 + Math.sin(this.time * Math.PI) * 0.2;
      if (this.focusedNodeId !== node.event.id) {
        material.emissiveIntensity = pulseIntensity * 0.6;
        material.opacity = 0.8 + Math.sin(this.time * Math.PI) * 0.2;
      }

      (node.glow.material as THREE.MeshBasicMaterial).opacity = 0.1 + Math.sin(this.time * 1.5) * 0.05;
    });

    this.updateParticles(deltaTime);
    this.updateFocusPulse();
  }

  private updateParticles(deltaTime: number): void {
    if (!this.allParticles || !this.particleVelocities || !this.particleEventIds) return;

    const positions = this.allParticles.geometry.attributes.position.array as Float32Array;
    const rotationAngle = 0.005 * deltaTime * 60;

    for (let i = 0; i < positions.length / 3; i++) {
      const eventId = this.particleEventIds[i];
      const node = this.nodes[eventId];
      if (!node) continue;

      positions[i * 3] += this.particleVelocities[i * 3];
      positions[i * 3 + 1] += this.particleVelocities[i * 3 + 1];
      positions[i * 3 + 2] += this.particleVelocities[i * 3 + 2];

      this.particleVelocities[i * 3] += (Math.random() - 0.5) * 0.002;
      this.particleVelocities[i * 3 + 1] += (Math.random() - 0.5) * 0.002;
      this.particleVelocities[i * 3 + 2] += (Math.random() - 0.5) * 0.002;

      const maxVel = 0.015;
      this.particleVelocities[i * 3] = Math.max(-maxVel, Math.min(maxVel, this.particleVelocities[i * 3]));
      this.particleVelocities[i * 3 + 1] = Math.max(-maxVel, Math.min(maxVel, this.particleVelocities[i * 3 + 1]));
      this.particleVelocities[i * 3 + 2] = Math.max(-maxVel, Math.min(maxVel, this.particleVelocities[i * 3 + 2]));

      const dx = positions[i * 3] - node.basePosition.x;
      const dy = positions[i * 3 + 1] - node.basePosition.y;
      const dz = positions[i * 3 + 2] - node.basePosition.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist > 2) {
        const norm = 2 / dist;
        positions[i * 3] = node.basePosition.x + dx * norm;
        positions[i * 3 + 1] = node.basePosition.y + dy * norm;
        positions[i * 3 + 2] = node.basePosition.z + dz * norm;
      }

      const rx = positions[i * 3] - node.basePosition.x;
      const rz = positions[i * 3 + 2] - node.basePosition.z;
      const cosA = Math.cos(rotationAngle);
      const sinA = Math.sin(rotationAngle);
      positions[i * 3] = node.basePosition.x + rx * cosA - rz * sinA;
      positions[i * 3 + 2] = node.basePosition.z + rx * sinA + rz * cosA;
    }

    this.allParticles.geometry.attributes.position.needsUpdate = true;
  }

  private updateFocusPulse(): void {
    this.nodes.forEach((node) => {
      const ringMat = node.pulseRing.material as THREE.MeshBasicMaterial;
      if (this.focusedNodeId === node.event.id) {
        const pulse = Math.sin(this.time * (Math.PI * 2 / 1.5)) * 0.5 + 0.5;
        ringMat.opacity = pulse * 0.6;
        const scale = 1 + pulse * 0.3;
        node.pulseRing.scale.set(scale, scale, scale);

        const material = node.mesh.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = 2 + pulse * 1;
        material.opacity = 1.0;
      } else {
        ringMat.opacity = 0;
      }
    });
  }

  setFocus(eventId: number | null): void {
    this.focusedNodeId = eventId;

    this.nodes.forEach((node) => {
      const material = node.mesh.material as THREE.MeshStandardMaterial;
      const glowMat = node.glow.material as THREE.MeshBasicMaterial;
      const lineOpacity = eventId === null ? 0.5 : 0.2;

      if (eventId === null) {
        material.opacity = 1.0;
        material.transparent = true;
        glowMat.opacity = 0.15;
      } else if (node.event.id === eventId) {
        material.opacity = 1.0;
        material.transparent = false;
        glowMat.opacity = 0.3;
      } else {
        material.opacity = 0.3;
        material.transparent = true;
        glowMat.opacity = 0.05;
      }
    });

    this.connectionLines.forEach((line) => {
      (line.material as THREE.LineBasicMaterial).opacity = eventId === null ? 0.5 : 0.15;
    });

    if (this.allParticles) {
      (this.allParticles.material as THREE.PointsMaterial).opacity = eventId === null ? 0.4 : 0.25;
    }
  }

  getNodeMeshes(): THREE.Mesh[] {
    return this.nodes.map(n => n.mesh);
  }

  getNodeByMesh(mesh: THREE.Object3D): NodeObject | undefined {
    return this.nodes.find(n => n.mesh === mesh);
  }

  reduceParticles(): void {
    if (this.reducedParticles || !this.allParticles) return;

    this.reducedParticles = true;
    const originalCount = this.allParticles.geometry.attributes.position.count;
    const newCount = Math.min(150, Math.floor(originalCount * 0.5));

    const oldPositions = this.allParticles.geometry.attributes.position.array as Float32Array;
    const oldColors = this.allParticles.geometry.attributes.color.array as Float32Array;
    const oldSizes = this.allParticles.geometry.attributes.size.array as Float32Array;
    const oldVelocities = this.particleVelocities!;
    const oldEventIds = this.particleEventIds!;

    const newPositions = new Float32Array(newCount * 3);
    const newColors = new Float32Array(newCount * 3);
    const newSizes = new Float32Array(newCount);
    const newVelocities = new Float32Array(newCount * 3);
    const newEventIds = new Int32Array(newCount);

    for (let i = 0; i < newCount; i++) {
      const srcIdx = i * Math.floor(originalCount / newCount);
      newPositions.set(oldPositions.subarray(srcIdx * 3, srcIdx * 3 + 3), i * 3);
      newColors.set(oldColors.subarray(srcIdx * 3, srcIdx * 3 + 3), i * 3);
      newSizes[i] = oldSizes[srcIdx];
      newVelocities.set(oldVelocities.subarray(srcIdx * 3, srcIdx * 3 + 3), i * 3);
      newEventIds[i] = oldEventIds[srcIdx];
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(newColors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(newSizes, 1));

    this.scene.remove(this.allParticles);
    this.allParticles.geometry.dispose();
    (this.allParticles.material as THREE.Material).dispose();

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.allParticles = new THREE.Points(geometry, material);
    this.particleVelocities = newVelocities;
    this.particleEventIds = newEventIds;
    this.scene.add(this.allParticles);
  }

  dispose(): void {
    this.nodes.forEach((node) => {
      node.mesh.geometry.dispose();
      (node.mesh.material as THREE.Material).dispose();
      node.glow.geometry.dispose();
      (node.glow.material as THREE.Material).dispose();
      node.pulseRing.geometry.dispose();
      (node.pulseRing.material as THREE.Material).dispose();
    });

    this.connectionLines.forEach((line) => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    });

    if (this.allParticles) {
      this.allParticles.geometry.dispose();
      (this.allParticles.material as THREE.Material).dispose();
    }
  }
}
