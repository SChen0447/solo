import * as THREE from 'three';
import { StarCoreManager } from './starCore';

export interface ThreadData {
  id: number;
  mesh: THREE.Line;
  startPoint: THREE.Vector3;
  endPoint: THREE.Vector3;
  controlPoint: THREE.Vector3;
  color: THREE.Color;
  isPulsating: boolean;
  originalPositions: Float32Array;
  spool: THREE.Mesh | null;
  attachedStars: number[];
}

export class StellarThreadManager {
  private scene: THREE.Scene;
  private threads: ThreadData[] = [];
  private threadIdCounter: number = 0;
  private starCoreManager: StarCoreManager | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public setStarCoreManager(manager: StarCoreManager): void {
    this.starCoreManager = manager;
  }

  public updateThreadEnd(thread: ThreadData, endPoint: THREE.Vector3): void {
    thread.endPoint.copy(endPoint);

    const midPoint = new THREE.Vector3().addVectors(thread.startPoint, thread.endPoint).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(thread.endPoint, thread.startPoint);
    const perp = new THREE.Vector3(-dir.y, dir.x, 0).normalize();
    const length = dir.length();
    thread.controlPoint.copy(midPoint).add(perp.multiplyScalar(length * 0.2));

    const curvePoints = this.generateBezierPoints(
      thread.startPoint,
      thread.controlPoint,
      thread.endPoint,
      100
    );

    const positions = thread.mesh.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < curvePoints.length; i++) {
      positions[i * 3] = curvePoints[i].x;
      positions[i * 3 + 1] = curvePoints[i].y;
      positions[i * 3 + 2] = curvePoints[i].z;
    }
    thread.mesh.geometry.attributes.position.needsUpdate = true;

    thread.originalPositions = new Float32Array(positions);
  }

  public setThreadPulsating(thread: ThreadData, pulsating: boolean): void {
    thread.isPulsating = pulsating;
  }

  public createThread(
    start: THREE.Vector3,
    end: THREE.Vector3,
    spool: THREE.Mesh | null
  ): ThreadData {
    const spoolColor = spool?.userData.spoolColor || new THREE.Color(0xffffff);
    const controlPoint = new THREE.Vector3(
      (start.x + end.x) / 2 + (Math.random() - 0.5) * 1.5,
      (start.y + end.y) / 2 + (Math.random() - 0.5) * 1.5,
      0
    );

    const curvePoints = this.generateBezierPoints(start, controlPoint, end, 100);

    const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);

    const colors = new Float32Array(curvePoints.length * 3);
    const edgeColor = new THREE.Color(spoolColor).multiplyScalar(0.5);
    for (let i = 0; i < curvePoints.length; i++) {
      const t = i / (curvePoints.length - 1);
      const color = new THREE.Color().lerpColors(spoolColor, edgeColor, Math.abs(t - 0.5) * 2);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      linewidth: 2
    });

    const line = new THREE.Line(geometry, material);
    line.userData.isStellarThread = true;

    const originalPositions = new Float32Array(geometry.attributes.position.array as Float32Array);

    const threadData: ThreadData = {
      id: this.threadIdCounter++,
      mesh: line,
      startPoint: start.clone(),
      endPoint: end.clone(),
      controlPoint: controlPoint.clone(),
      color: spoolColor.clone(),
      isPulsating: false,
      originalPositions: originalPositions,
      spool: spool,
      attachedStars: []
    };

    this.threads.push(threadData);
    this.scene.add(line);

    return threadData;
  }

  private generateBezierPoints(
    p0: THREE.Vector3,
    p1: THREE.Vector3,
    p2: THREE.Vector3,
    segments: number
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const point = new THREE.Vector3();
      point.x = (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x;
      point.y = (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y;
      point.z = (1 - t) * (1 - t) * p0.z + 2 * (1 - t) * t * p1.z + t * t * p2.z;
      points.push(point);
    }
    return points;
  }

  public update(_delta: number, elapsed: number): void {
    this.threads.forEach((thread) => {
      if (thread.isPulsating) {
        const material = thread.mesh.material as THREE.LineBasicMaterial;
        material.opacity = 0.7 + Math.sin(elapsed * 3) * 0.2;
      }

      const positions = thread.mesh.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 2] = thread.originalPositions[i + 2] + Math.sin(elapsed * 2 + i * 0.1) * 0.01;
      }
      thread.mesh.geometry.attributes.position.needsUpdate = true;
    });
  }

  public checkIntersections(): void {
    const generatedStars: { x: number; y: number }[] = [];

    for (let i = 0; i < this.threads.length; i++) {
      for (let j = i + 1; j < this.threads.length; j++) {
        const intersection = this.findIntersection(this.threads[i], this.threads[j]);
        if (intersection) {
          const tooClose = generatedStars.some(
            (s) => Math.sqrt((s.x - intersection.x) ** 2 + (s.y - intersection.y) ** 2) < 0.3
          );

          if (!tooClose) {
            generatedStars.push({ x: intersection.x, y: intersection.y });

            if (this.starCoreManager) {
              const starPos = new THREE.Vector3(intersection.x, intersection.y, 0);
              this.starCoreManager.createStarCore(starPos);
            }
          }
        }
      }
    }
  }

  private findIntersection(thread1: ThreadData, thread2: ThreadData): { x: number; y: number } | null {
    const pos1 = thread1.mesh.geometry.attributes.position.array as Float32Array;
    const pos2 = thread2.mesh.geometry.attributes.position.array as Float32Array;

    let closestDist = Infinity;
    let closestPoint: { x: number; y: number } | null = null;

    for (let i = 0; i < pos1.length; i += 3) {
      for (let j = 0; j < pos2.length; j += 3) {
        const dx = pos1[i] - pos2[j];
        const dy = pos1[i + 1] - pos2[j + 1];
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.08 && dist < closestDist) {
          closestDist = dist;
          closestPoint = {
            x: (pos1[i] + pos2[j]) / 2,
            y: (pos1[i + 1] + pos2[j + 1]) / 2
          };
        }
      }
    }

    return closestPoint;
  }

  public reset(): void {
    this.threads.forEach((thread) => {
      this.scene.remove(thread.mesh);
      thread.mesh.geometry.dispose();
      (thread.mesh.material as THREE.Material).dispose();
    });
    this.threads = [];
  }

  public exportSVG(): string {
    const minX = -8;
    const maxX = 8;
    const minY = -6;
    const maxY = 6;
    const width = 800;
    const height = 600;

    const toScreenX = (x: number) => ((x - minX) / (maxX - minX)) * width;
    const toScreenY = (y: number) => height - ((y - minY) / (maxY - minY)) * height;

    let paths = '';

    this.threads.forEach((thread) => {
      const positions = thread.mesh.geometry.attributes.position.array as Float32Array;
      let d = `M ${toScreenX(positions[0])} ${toScreenY(positions[1])}`;

      for (let i = 3; i < positions.length; i += 3) {
        d += ` L ${toScreenX(positions[i])} ${toScreenY(positions[i + 1])}`;
      }

      paths += `<path d="${d}" stroke="white" stroke-width="2" fill="none" opacity="0.9" />\n`;
    });

    if (this.starCoreManager) {
      const stars = this.starCoreManager.getStars();
      stars.forEach((star) => {
        const x = toScreenX(star.core.position.x);
        const y = toScreenY(star.core.position.y);
        paths += `<circle cx="${x}" cy="${y}" r="5" fill="white" opacity="0.9" />\n`;
        paths += `<circle cx="${x}" cy="${y}" r="10" fill="white" opacity="0.3" />\n`;
      });
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#0a0014"/>
  ${paths}
</svg>`;
  }

  public getThreads(): ThreadData[] {
    return this.threads;
  }

  public updateThreadForStar(starId: number, newPos: THREE.Vector3): void {
    this.threads.forEach((thread) => {
      const positions = thread.mesh.geometry.attributes.position.array as Float32Array;
      let minDist = Infinity;
      let nearestIndex = 0;

      for (let i = 0; i < positions.length; i += 3) {
        const dist = Math.sqrt(
          (positions[i] - newPos.x) ** 2 +
          (positions[i + 1] - newPos.y) ** 2
        );
        if (dist < minDist) {
          minDist = dist;
          nearestIndex = i;
        }
      }

      if (minDist < 0.5) {
        positions[nearestIndex] = newPos.x;
        positions[nearestIndex + 1] = newPos.y;
        thread.mesh.geometry.attributes.position.needsUpdate = true;

        if (!thread.attachedStars.includes(starId)) {
          thread.attachedStars.push(starId);
        }
      }
    });
  }
}
