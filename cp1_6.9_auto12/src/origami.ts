import * as THREE from 'three';

export interface FoldLine {
  start: THREE.Vector2;
  end: THREE.Vector2;
  type: 'diagonal' | 'midline';
}

export interface FoldState {
  foldLine: FoldLine;
  foldedVertices: Map<number, THREE.Vector3>;
  originalVertices: Map<number, THREE.Vector3>;
  foldAngle: number;
}

export interface CornerInfo {
  index: number;
  position: THREE.Vector2;
  name: string;
}

export interface EdgeInfo {
  start: number;
  end: number;
  name: string;
}

const PAPER_SIZE = 300;
const HALF_SIZE = PAPER_SIZE / 2;

export class OrigamiPaper {
  public mesh: THREE.Mesh;
  public geometry: THREE.PlaneGeometry;
  public material: THREE.MeshPhongMaterial;
  public foldLines: FoldLine[] = [];
  public foldStack: FoldState[] = [];
  public creaseLines: THREE.Line[] = [];
  public previewLines: THREE.Line[] = [];
  public isAnimating = false;
  public group: THREE.Group;

  private corners: CornerInfo[] = [];
  private edges: EdgeInfo[] = [];

  constructor() {
    this.group = new THREE.Group();

    this.geometry = new THREE.PlaneGeometry(PAPER_SIZE, PAPER_SIZE, 32, 32);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const gray = 240 + Math.random() * 15;
      ctx.fillStyle = `rgba(${gray}, ${gray}, ${gray}, 0.3)`;
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }
    const texture = new THREE.CanvasTexture(canvas);

    this.material = new THREE.MeshPhongMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      shininess: 30,
      specular: 0xdddddd
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.rotation.x = -Math.PI * 0.15;

    this.group.add(this.mesh);
    this.initCornersAndEdges();
  }

  private initCornersAndEdges(): void {
    this.corners = [
      { index: 0, position: new THREE.Vector2(-HALF_SIZE, HALF_SIZE), name: 'top-left' },
      { index: 1, position: new THREE.Vector2(HALF_SIZE, HALF_SIZE), name: 'top-right' },
      { index: 2, position: new THREE.Vector2(HALF_SIZE, -HALF_SIZE), name: 'bottom-right' },
      { index: 3, position: new THREE.Vector2(-HALF_SIZE, -HALF_SIZE), name: 'bottom-left' }
    ];

    this.edges = [
      { start: 0, end: 1, name: 'top' },
      { start: 1, end: 2, name: 'right' },
      { start: 2, end: 3, name: 'bottom' },
      { start: 3, end: 0, name: 'left' }
    ];
  }

  public getCorners(): CornerInfo[] {
    return this.corners;
  }

  public getEdges(): EdgeInfo[] {
    return this.edges;
  }

  public findNearestCorner(worldPos: THREE.Vector3): CornerInfo | null {
    const localPos = this.worldToLocal(worldPos);
    let nearest: CornerInfo | null = null;
    let minDist = 40;

    for (const corner of this.corners) {
      const dist = Math.sqrt(
        Math.pow(localPos.x - corner.position.x, 2) +
        Math.pow(localPos.y - corner.position.y, 2)
      );
      if (dist < minDist) {
        minDist = dist;
        nearest = corner;
      }
    }
    return nearest;
  }

  public findNearestEdge(worldPos: THREE.Vector3): EdgeInfo | null {
    const localPos = this.worldToLocal(worldPos);
    let nearest: EdgeInfo | null = null;
    let minDist = 25;

    for (const edge of this.edges) {
      const start = this.corners[edge.start].position;
      const end = this.corners[edge.end].position;
      const dist = this.pointToLineDistance(localPos, start, end);
      if (dist < minDist) {
        minDist = dist;
        nearest = edge;
      }
    }
    return nearest;
  }

  private pointToLineDistance(point: THREE.Vector2, lineStart: THREE.Vector2, lineEnd: THREE.Vector2): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx: number, yy: number;
    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public worldToLocal(worldPos: THREE.Vector3): THREE.Vector2 {
    const local = worldPos.clone();
    this.mesh.worldToLocal(local);
    return new THREE.Vector2(local.x, local.y);
  }

  public getFoldLineFromCorner(corner: CornerInfo): FoldLine {
    const oppositeIndex = (corner.index + 2) % 4;
    const opposite = this.corners[oppositeIndex];
    return {
      start: corner.position.clone(),
      end: opposite.position.clone(),
      type: 'diagonal'
    };
  }

  public getMidlineFromEdge(edge: EdgeInfo): FoldLine {
    const perpendicularEdges = this.edges.filter(e => e !== edge);
    const mid1 = new THREE.Vector2(
      (this.corners[edge.start].position.x + this.corners[edge.end].position.x) / 2,
      (this.corners[edge.start].position.y + this.corners[edge.end].position.y) / 2
    );

    const otherEdge = perpendicularEdges.find(e =>
      e.start !== edge.start && e.start !== edge.end &&
      e.end !== edge.start && e.end !== edge.end
    ) || perpendicularEdges[0];

    const mid2 = new THREE.Vector2(
      (this.corners[otherEdge.start].position.x + this.corners[otherEdge.end].position.x) / 2,
      (this.corners[otherEdge.start].position.y + this.corners[otherEdge.end].position.y) / 2
    );

    return {
      start: mid1,
      end: mid2,
      type: 'midline'
    };
  }

  public showPreviewFoldLine(foldLine: FoldLine, scene: THREE.Scene): void {
    this.clearPreviewLines(scene);

    const points = [
      new THREE.Vector3(foldLine.start.x, foldLine.start.y, 0.5),
      new THREE.Vector3(foldLine.end.x, foldLine.end.y, 0.5)
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color: 0x888888,
      dashSize: 8,
      gapSize: 4,
      linewidth: 2
    });

    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    this.group.add(line);
    this.previewLines.push(line);
  }

  public clearPreviewLines(scene: THREE.Scene): void {
    for (const line of this.previewLines) {
      this.group.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.previewLines = [];
  }

  public async performFold(foldLine: FoldLine, duration: number = 800): Promise<void> {
    if (this.isAnimating) return;
    this.isAnimating = true;

    this.clearPreviewLines(new THREE.Scene());

    const originalVertices = new Map<number, THREE.Vector3>();
    const foldedVertices = new Map<number, THREE.Vector3>();
    const positions = this.geometry.attributes.position;

    const lineStart = new THREE.Vector2(foldLine.start.x, foldLine.start.y);
    const lineEnd = new THREE.Vector2(foldLine.end.x, foldLine.end.y);
    const lineDir = new THREE.Vector2().subVectors(lineEnd, lineStart).normalize();
    const lineNormal = new THREE.Vector2(-lineDir.y, lineDir.x);

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      originalVertices.set(i, new THREE.Vector3(x, y, z));

      const point = new THREE.Vector2(x, y);
      const toPoint = new THREE.Vector2().subVectors(point, lineStart);
      const side = toPoint.dot(lineNormal);

      if (side > 0.01) {
        const projection = lineStart.clone().add(lineDir.clone().multiplyScalar(toPoint.dot(lineDir)));
        const reflected = new THREE.Vector2(
          2 * projection.x - x,
          2 * projection.y - y
        );
        foldedVertices.set(i, new THREE.Vector3(reflected.x, reflected.y, z));
      } else {
        foldedVertices.set(i, new THREE.Vector3(x, y, z));
      }
    }

    const foldState: FoldState = {
      foldLine,
      foldedVertices,
      originalVertices: new Map(originalVertices),
      foldAngle: Math.PI
    };

    await this.animateFold(originalVertices, foldedVertices, lineStart, lineNormal, duration);

    this.foldStack.push(foldState);
    this.foldLines.push(foldLine);
    this.addCreaseLine(foldLine);

    this.isAnimating = false;
  }

  private animateFold(
    original: Map<number, THREE.Vector3>,
    folded: Map<number, THREE.Vector3>,
    lineStart: THREE.Vector2,
    lineNormal: THREE.Vector2,
    duration: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const positions = this.geometry.attributes.position;

      const animate = () => {
        const elapsed = performance.now() - startTime;
        let t = Math.min(elapsed / duration, 1);
        t = 1 - Math.pow(1 - t, 3);

        const angle = t * Math.PI;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        for (let i = 0; i < positions.count; i++) {
          const orig = original.get(i)!;
          const point = new THREE.Vector2(orig.x, orig.y);
          const toPoint = new THREE.Vector2().subVectors(point, lineStart);
          const side = toPoint.dot(lineNormal);

          if (side > 0.01) {
            const projection = lineStart.clone().add(
              new THREE.Vector2(lineNormal.y, -lineNormal.x)
                .multiplyScalar(toPoint.dot(new THREE.Vector2(lineNormal.y, -lineNormal.x)))
            );

            const relX = toPoint.dot(new THREE.Vector2(lineNormal.y, -lineNormal.x));
            const relY = side;

            const rotY = relY * cosA;
            const rotZ = relY * sinA;

            const newX = lineStart.x + lineNormal.y * relX + (-lineNormal.x) * (relY * cosA);
            const newY = lineStart.y + (-lineNormal.x) * relX + lineNormal.y * (relY * cosA);

            positions.setXYZ(i, newX, newY, rotZ);
          }
        }

        positions.needsUpdate = true;
        this.geometry.computeVertexNormals();

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          for (let i = 0; i < positions.count; i++) {
            const f = folded.get(i)!;
            positions.setXYZ(i, f.x, f.y, f.z);
          }
          positions.needsUpdate = true;
          this.geometry.computeVertexNormals();
          resolve();
        }
      };

      animate();
    });
  }

  private addCreaseLine(foldLine: FoldLine): void {
    const points = [
      new THREE.Vector3(foldLine.start.x, foldLine.start.y, 0.1),
      new THREE.Vector3(foldLine.end.x, foldLine.end.y, 0.1)
    ];

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x666666,
      linewidth: 1
    });

    const line = new THREE.Line(geometry, material);
    line.visible = false;
    this.group.add(line);
    this.creaseLines.push(line);
  }

  public toggleCreasePreview(show: boolean): void {
    for (const line of this.creaseLines) {
      line.visible = show;
    }
  }

  public async undo(scene: THREE.Scene): Promise<void> {
    if (this.foldStack.length === 0 || this.isAnimating) return;
    this.isAnimating = true;

    const lastFold = this.foldStack.pop()!;
    this.foldLines.pop();

    const lastCrease = this.creaseLines.pop();
    if (lastCrease) {
      this.group.remove(lastCrease);
      lastCrease.geometry.dispose();
      (lastCrease.material as THREE.Material).dispose();
    }

    this.clearPreviewLines(scene);
    await this.animateUndo(lastFold, 500);

    this.isAnimating = false;
  }

  private animateUndo(foldState: FoldState, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const positions = this.geometry.attributes.position;

      const currentVertices = new Map<number, THREE.Vector3>();
      for (let i = 0; i < positions.count; i++) {
        currentVertices.set(i, new THREE.Vector3(
          positions.getX(i),
          positions.getY(i),
          positions.getZ(i)
        ));
      }

      const animate = () => {
        const elapsed = performance.now() - startTime;
        let t = Math.min(elapsed / duration, 1);
        t = 1 - Math.pow(1 - t, 3);

        for (let i = 0; i < positions.count; i++) {
          const current = currentVertices.get(i)!;
          const original = foldState.originalVertices.get(i)!;
          const x = current.x + (original.x - current.x) * t;
          const y = current.y + (original.y - current.y) * t;
          const z = current.z + (original.z - current.z) * t;
          positions.setXYZ(i, x, y, z);
        }

        positions.needsUpdate = true;
        this.geometry.computeVertexNormals();

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      animate();
    });
  }

  public reset(): void {
    this.geometry.dispose();
    this.geometry = new THREE.PlaneGeometry(PAPER_SIZE, PAPER_SIZE, 32, 32);
    this.mesh.geometry = this.geometry;

    for (const line of this.creaseLines) {
      this.group.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.creaseLines = [];

    for (const line of this.previewLines) {
      this.group.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    }
    this.previewLines = [];

    this.foldLines = [];
    this.foldStack = [];
    this.group.rotation.set(0, 0, 0);
    this.mesh.rotation.set(-Math.PI * 0.15, 0, 0);
    this.mesh.position.set(0, 0, 0);
  }

  public getProgress(): number {
    const maxFolds = 8;
    return Math.min((this.foldStack.length / maxFolds) * 100, 100);
  }

  public getGroup(): THREE.Group {
    return this.group;
  }
}
