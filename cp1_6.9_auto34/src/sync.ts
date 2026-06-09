import * as THREE from 'three';
import { Mushroom } from './mushroom';

interface ConnectionData {
  pairKey: string;
  mushroomA: Mushroom;
  mushroomB: Mushroom;
  distance: number;
  syncProgress: number;
  syncDuration: number;
  line: THREE.Line;
  lineMat: THREE.LineBasicMaterial;
}

export class SyncManager {
  public scene: THREE.Scene;
  private mushrooms: Map<string, Mushroom> = new Map();
  private connections: Map<string, ConnectionData> = new Map();
  private dominantMushroomId: string | null = null;
  private lineGeometryPool: Array<THREE.BufferGeometry> = [];
  public readonly SYNC_DISTANCE: number = 1.2;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public addMushroom(mushroom: Mushroom): void {
    this.mushrooms.set(mushroom.id, mushroom);
  }

  public removeMushroom(mushroom: Mushroom): void {
    this.mushrooms.delete(mushroom.id);
    const keysToRemove: string[] = [];
    this.connections.forEach((conn, key) => {
      if (conn.mushroomA.id === mushroom.id || conn.mushroomB.id === mushroom.id) {
        keysToRemove.push(key);
      }
    });
    keysToRemove.forEach((k) => this.removeConnection(k));
    if (this.dominantMushroomId === mushroom.id) {
      this.dominantMushroomId = null;
    }
  }

  public getDominantMushroom(): Mushroom | null {
    return this.dominantMushroomId ? this.mushrooms.get(this.dominantMushroomId) ?? null : null;
  }

  public setDominant(mushroom: Mushroom): void {
    if (this.dominantMushroomId) {
      const prev = this.mushrooms.get(this.dominantMushroomId);
      if (prev) prev.setDominant(false);
    }
    this.dominantMushroomId = mushroom.id;
    mushroom.setDominant(true);

    const targetFreq = mushroom.frequency;
    this.mushrooms.forEach((m) => {
      if (m.id !== mushroom.id) {
        m.smoothTransitionToFrequency(targetFreq, 0.5);
        m.phase = mushroom.phase;
      }
    });
  }

  public getMushrooms(): Mushroom[] {
    return Array.from(this.mushrooms.values());
  }

  public getConnections(): Array<{ a: Mushroom; b: Mushroom; progress: number }> {
    return Array.from(this.connections.values()).map((c) => ({
      a: c.mushroomA,
      b: c.mushroomB,
      progress: c.syncProgress
    }));
  }

  private getPairKey(a: Mushroom, b: Mushroom): string {
    return a.id < b.id ? `${a.id}__${b.id}` : `${b.id}__${a.id}`;
  }

  private createConnectionLine(a: Mushroom, b: Mushroom): { line: THREE.Line; mat: THREE.LineBasicMaterial } {
    const positions = new Float32Array(6);
    positions[0] = a.position.x;
    positions[1] = a.stemHeight + a.capHeight * 0.5;
    positions[2] = a.position.z;
    positions[3] = b.position.x;
    positions[4] = b.stemHeight + b.capHeight * 0.5;
    positions[5] = b.position.z;

    let geometry: THREE.BufferGeometry;
    if (this.lineGeometryPool.length > 0) {
      geometry = this.lineGeometryPool.pop()!;
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    } else {
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    }

    const mat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: 1
    });

    const line = new THREE.Line(geometry, mat);
    line.frustumCulled = false;
    this.scene.add(line);
    return { line, mat };
  }

  private removeConnection(key: string): void {
    const conn = this.connections.get(key);
    if (!conn) return;
    this.scene.remove(conn.line);
    conn.lineMat.dispose();
    if (conn.line.geometry) {
      this.lineGeometryPool.push(conn.line.geometry);
    }
    this.connections.delete(key);
  }

  private updateConnectionLine(conn: ConnectionData): void {
    const a = conn.mushroomA;
    const b = conn.mushroomB;
    const positions = conn.line.geometry.attributes.position as THREE.BufferAttribute;

    positions.setXYZ(0, a.position.x, a.stemHeight + a.capHeight * 0.5, a.position.z);
    positions.setXYZ(1, b.position.x, b.stemHeight + b.capHeight * 0.5, b.position.z);
    positions.needsUpdate = true;

    const progress = conn.syncProgress;
    const mixColor = new THREE.Color().lerpColors(a.color, b.color, 0.5);
    const pulseA = 0.5 + 0.5 * Math.sin(a.phase);
    const pulseB = 0.5 + 0.5 * Math.sin(b.phase);
    const combinedPulse = (pulseA + pulseB) * 0.5;

    conn.lineMat.color.copy(mixColor);
    conn.lineMat.opacity = Math.min(1, 0.15 + progress * 0.5) * (0.6 + combinedPulse * 0.4);
  }

  public update(deltaTime: number): void {
    const mushrooms = Array.from(this.mushrooms.values());
    const activeKeys = new Set<string>();
    const hasDominant = this.dominantMushroomId !== null;

    for (let i = 0; i < mushrooms.length; i++) {
      for (let j = i + 1; j < mushrooms.length; j++) {
        const a = mushrooms[i];
        const b = mushrooms[j];
        const dx = a.position.x - b.position.x;
        const dz = a.position.z - b.position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);

        if (distance < this.SYNC_DISTANCE) {
          const key = this.getPairKey(a, b);
          activeKeys.add(key);

          let conn = this.connections.get(key);
          if (!conn) {
            const { line, mat } = this.createConnectionLine(a, b);
            conn = {
              pairKey: key,
              mushroomA: a,
              mushroomB: b,
              distance,
              syncProgress: 0,
              syncDuration: 1.0 + Math.random() * 1.0,
              line,
              lineMat: mat
            };
            this.connections.set(key, conn);
          }

          if (!hasDominant) {
            const syncSpeed = deltaTime / conn.syncDuration;
            conn.syncProgress = Math.min(1, conn.syncProgress + syncSpeed * 0.5);

            if (conn.syncProgress >= 1 && Math.abs(a.frequency - b.frequency) > 0.001) {
              const avgFreq = (a.frequency + b.frequency) / 2;
              a.smoothTransitionToFrequency(avgFreq, 0.8);
              b.smoothTransitionToFrequency(avgFreq, 0.8);
            }

            const coupling = 0.03 * deltaTime * 60;
            const phaseDiff = Math.atan2(Math.sin(b.phase - a.phase), Math.cos(b.phase - a.phase));
            a.phase += coupling * Math.sin(phaseDiff);
            b.phase -= coupling * Math.sin(phaseDiff);
          }

          this.updateConnectionLine(conn);
        }
      }
    }

    const keysToRemove: string[] = [];
    this.connections.forEach((conn, key) => {
      if (!activeKeys.has(key)) {
        keysToRemove.push(key);
      }
    });
    keysToRemove.forEach((k) => this.removeConnection(k));
  }

  public dispose(): void {
    this.connections.forEach((conn) => {
      this.scene.remove(conn.line);
      conn.lineMat.dispose();
      conn.line.geometry?.dispose();
    });
    this.connections.clear();
    this.lineGeometryPool.forEach((g) => g.dispose());
    this.lineGeometryPool = [];
  }
}
