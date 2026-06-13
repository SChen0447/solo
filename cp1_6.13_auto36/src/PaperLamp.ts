import * as THREE from 'three';

export interface FaceInfo {
  index: number;
  color: string;
  mesh: THREE.Mesh;
  hingeAxis: THREE.Vector3;
  hingeWorldPos: THREE.Vector3;
  targetAngle: number;
  currentAngle: number;
  folding: boolean;
  focused: boolean;
  stringEdges: THREE.Line[];
  foldLine: THREE.Line | null;
}

export class PaperLamp {
  public group: THREE.Group;
  public faces: FaceInfo[] = [];
  public readonly PAPER_SIZE = 1.6;
  public readonly HALF = 0.8;
  public readonly FOLD_MAX = Math.PI / 2;
  public readonly FOLD_MIN = 0;

  private baseColors = [
    '#F5F0E1',
    '#D5D8DC',
    '#FADADD',
    '#C7E0F4',
    '#B8E6D0',
    '#FFF4B8'
  ];

  private paperMaterial: THREE.MeshPhysicalMaterial[] = [];
  private backMaterial: THREE.MeshPhysicalMaterial;
  private foldLineMaterial: THREE.LineBasicMaterial;
  private stringMaterial: THREE.LineBasicMaterial;
  private segments = 24;

  private focusedFace: number | null = null;
  private focusProgress = 0;
  private focusTargetProgress = 0;

  private resetting = false;
  private resetProgress = 0;

  private opacityPulse = 0;
  private opacityPulseActive = false;

  constructor() {
    this.group = new THREE.Group();

    this.backMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x9a9a9a,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.85,
      roughness: 0.85,
      metalness: 0.02,
      transmission: 0.2,
      thickness: 0.05,
      clearcoat: 0.1,
      clearcoatRoughness: 0.8
    });

    this.foldLineMaterial = new THREE.LineBasicMaterial({
      color: 0x4a9eff,
      transparent: true,
      opacity: 0,
      linewidth: 1.5
    });

    this.stringMaterial = new THREE.LineBasicMaterial({
      color: 0x8B5A2B,
      transparent: true,
      opacity: 0.65
    });

    for (let i = 0; i < 6; i++) {
      const color = new THREE.Color(this.baseColors[i]);
      const mat = new THREE.MeshPhysicalMaterial({
        color: color,
        side: THREE.FrontSide,
        transparent: true,
        opacity: 0.72,
        roughness: 0.7,
        metalness: 0.02,
        transmission: 0.35,
        thickness: 0.06,
        clearcoat: 0.15,
        clearcoatRoughness: 0.75,
        ior: 1.3,
        emissive: color.clone().multiplyScalar(0.04)
      });
      this.paperMaterial.push(mat);
    }

    this.buildLamp();
  }

  private buildLamp() {
    const positions = [
      { normal: new THREE.Vector3(0, 1, 0), hingeAxis: new THREE.Vector3(1, 0, 0), hingeOffset: new THREE.Vector3(0, -this.HALF, 0), faceNormal: new THREE.Vector3(0, 1, 0) },
      { normal: new THREE.Vector3(0, -1, 0), hingeAxis: new THREE.Vector3(1, 0, 0), hingeOffset: new THREE.Vector3(0, this.HALF, 0), faceNormal: new THREE.Vector3(0, -1, 0) },
      { normal: new THREE.Vector3(1, 0, 0), hingeAxis: new THREE.Vector3(0, 1, 0), hingeOffset: new THREE.Vector3(-this.HALF, 0, 0), faceNormal: new THREE.Vector3(1, 0, 0) },
      { normal: new THREE.Vector3(-1, 0, 0), hingeAxis: new THREE.Vector3(0, 1, 0), hingeOffset: new THREE.Vector3(this.HALF, 0, 0), faceNormal: new THREE.Vector3(-1, 0, 0) },
      { normal: new THREE.Vector3(0, 0, 1), hingeAxis: new THREE.Vector3(0, 1, 0), hingeOffset: new THREE.Vector3(0, 0, -this.HALF), faceNormal: new THREE.Vector3(0, 0, 1) },
      { normal: new THREE.Vector3(0, 0, -1), hingeAxis: new THREE.Vector3(0, 1, 0), hingeOffset: new THREE.Vector3(0, 0, this.HALF), faceNormal: new THREE.Vector3(0, 0, -1) }
    ];

    for (let i = 0; i < 6; i++) {
      const pos = positions[i];
      const face = this.createFace(i, pos);
      this.faces.push(face);
    }

    this.buildConnectingStrings();
    this.buildFoldLines();
  }

  private createFace(index: number, posData: {
    normal: THREE.Vector3;
    hingeAxis: THREE.Vector3;
    hingeOffset: THREE.Vector3;
    faceNormal: THREE.Vector3;
  }): FaceInfo {
    const geometry = this.createFoldedGeometry(index);
    geometry.computeVertexNormals();

    const frontMat = this.paperMaterial[index];
    const materials = [frontMat, this.backMaterial];

    const mesh = new THREE.Mesh(geometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const hingeOffset = posData.hingeOffset.clone();
    const hingeAxis = posData.hingeAxis.clone();
    const faceNormal = posData.faceNormal.clone();

    mesh.position.copy(faceNormal.clone().multiplyScalar(this.HALF));

    const worldHinge = mesh.position.clone().add(
      faceNormal.clone().cross(hingeAxis).multiplyScalar(this.HALF).add(
        hingeAxis.clone().multiplyScalar(-this.HALF)
      )
    );

    this.group.add(mesh);

    return {
      index,
      color: this.baseColors[index],
      mesh,
      hingeAxis,
      hingeWorldPos: worldHinge,
      targetAngle: 0,
      currentAngle: 0,
      folding: false,
      focused: false,
      stringEdges: [],
      foldLine: null
    };
  }

  private createFoldedGeometry(faceIndex: number): THREE.BufferGeometry {
    const geometry = new THREE.PlaneGeometry(
      this.PAPER_SIZE,
      this.PAPER_SIZE,
      this.segments,
      this.segments
    );

    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const count = posAttr.count;

    for (let i = 0; i < count; i++) {
      const x = posAttr.getX(i);
      const y = posAttr.getY(i);
      const z = posAttr.getZ(i) + 0.001 * Math.sin(x * 3 + y * 2);
      posAttr.setXYZ(i, x, y, z);
    }

    geometry.computeVertexNormals();
    return geometry;
  }

  private buildConnectingStrings() {
    const h = this.HALF;

    const edgePairs: [number, number, THREE.Vector3[]][] = [
      [0, 2, [new THREE.Vector3(h, h, -h), new THREE.Vector3(h, h, h)]],
      [0, 4, [new THREE.Vector3(-h, h, h), new THREE.Vector3(h, h, h)]],
      [0, 3, [new THREE.Vector3(-h, h, -h), new THREE.Vector3(-h, h, h)]],
      [0, 5, [new THREE.Vector3(h, h, -h), new THREE.Vector3(-h, h, -h)]],
      [1, 2, [new THREE.Vector3(h, -h, -h), new THREE.Vector3(h, -h, h)]],
      [1, 4, [new THREE.Vector3(-h, -h, h), new THREE.Vector3(h, -h, h)]],
      [1, 3, [new THREE.Vector3(-h, -h, -h), new THREE.Vector3(-h, -h, h)]],
      [1, 5, [new THREE.Vector3(h, -h, -h), new THREE.Vector3(-h, -h, -h)]],
      [2, 4, [new THREE.Vector3(h, h, h), new THREE.Vector3(h, -h, h)]],
      [4, 3, [new THREE.Vector3(-h, h, h), new THREE.Vector3(-h, -h, h)]],
      [3, 5, [new THREE.Vector3(-h, h, -h), new THREE.Vector3(-h, -h, -h)]],
      [5, 2, [new THREE.Vector3(h, h, -h), new THREE.Vector3(h, -h, -h)]]
    ];

    for (const [fa, fb, points] of edgePairs) {
      const pointsArr: THREE.Vector3[] = [];
      const segments = 10;
      for (let s = 0; s <= segments; s++) {
        const t = s / segments;
        const p = points[0].clone().lerp(points[1], t);
        p.add(new THREE.Vector3(
          Math.random() * 0.008 - 0.004,
          Math.random() * 0.008 - 0.004,
          Math.random() * 0.008 - 0.004
        ));
        pointsArr.push(p);
      }

      const geo = new THREE.BufferGeometry().setFromPoints(pointsArr);
      const line = new THREE.Line(geo, this.stringMaterial.clone());
      this.group.add(line);

      this.faces[fa].stringEdges.push(line);
      this.faces[fb].stringEdges.push(line);
    }
  }

  private buildFoldLines() {
    const h = this.HALF;
    const lineEnds = [
      [new THREE.Vector3(-h, h, 0), new THREE.Vector3(h, h, 0)],
      [new THREE.Vector3(-h, -h, 0), new THREE.Vector3(h, -h, 0)],
      [new THREE.Vector3(0, -h, h), new THREE.Vector3(0, h, h)],
      [new THREE.Vector3(0, -h, -h), new THREE.Vector3(0, h, -h)],
      [new THREE.Vector3(-h, -h, 0), new THREE.Vector3(-h, h, 0)],
      [new THREE.Vector3(h, -h, 0), new THREE.Vector3(h, h, 0)]
    ];

    for (let i = 0; i < 6; i++) {
      const [p1, p2] = lineEnds[i];
      const pts: THREE.Vector3[] = [];
      const segs = 20;
      for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        pts.push(p1.clone().lerp(p2, t));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const dashMat = new THREE.LineDashedMaterial({
        color: 0x4a9eff,
        dashSize: 0.06,
        gapSize: 0.04,
        transparent: true,
        opacity: 0
      });
      const line = new THREE.Line(geo, dashMat);
      line.computeLineDistances();
      this.group.add(line);
      this.faces[i].foldLine = line;
    }
  }

  public updateFoldGeometry(face: FaceInfo) {
    const mesh = face.mesh;
    const geometry = mesh.geometry as THREE.BufferGeometry;
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const count = posAttr.count;

    const angle = face.currentAngle;
    const bendFactor = angle / this.FOLD_MAX;

    const hingeSign = (face.index < 2) ? 1 : 1;

    for (let i = 0; i < count; i++) {
      let x = posAttr.getX(i);
      let y = posAttr.getY(i);
      let z = 0;

      if (face.index === 0) {
        const distFromHinge = y + this.HALF;
        if (distFromHinge > 0 && angle > 0.001) {
          const radius = this.PAPER_SIZE / (angle * hingeSign);
          const theta = (distFromHinge / this.PAPER_SIZE) * angle;
          y = -this.HALF + radius * Math.sin(theta);
          z = -radius * (1 - Math.cos(theta)) * bendFactor;
        }
      } else if (face.index === 1) {
        const distFromHinge = this.HALF - y;
        if (distFromHinge > 0 && angle > 0.001) {
          const radius = this.PAPER_SIZE / (angle * hingeSign);
          const theta = (distFromHinge / this.PAPER_SIZE) * angle;
          y = this.HALF - radius * Math.sin(theta);
          z = radius * (1 - Math.cos(theta)) * bendFactor;
        }
      } else if (face.index === 2) {
        const distFromHinge = x + this.HALF;
        if (distFromHinge > 0 && angle > 0.001) {
          const radius = this.PAPER_SIZE / angle;
          const theta = (distFromHinge / this.PAPER_SIZE) * angle;
          x = -this.HALF + radius * Math.sin(theta);
          z = -radius * (1 - Math.cos(theta)) * bendFactor;
        }
      } else if (face.index === 3) {
        const distFromHinge = this.HALF - x;
        if (distFromHinge > 0 && angle > 0.001) {
          const radius = this.PAPER_SIZE / angle;
          const theta = (distFromHinge / this.PAPER_SIZE) * angle;
          x = this.HALF - radius * Math.sin(theta);
          z = -radius * (1 - Math.cos(theta)) * bendFactor;
        }
      } else if (face.index === 4) {
        const distFromHinge = x + this.HALF;
        if (distFromHinge > 0 && angle > 0.001) {
          const radius = this.PAPER_SIZE / angle;
          const theta = (distFromHinge / this.PAPER_SIZE) * angle;
          x = -this.HALF + radius * Math.sin(theta);
          y = -radius * (1 - Math.cos(theta)) * bendFactor;
        }
      } else if (face.index === 5) {
        const distFromHinge = x + this.HALF;
        if (distFromHinge > 0 && angle > 0.001) {
          const radius = this.PAPER_SIZE / angle;
          const theta = (distFromHinge / this.PAPER_SIZE) * angle;
          x = -this.HALF + radius * Math.sin(theta);
          y = radius * (1 - Math.cos(theta)) * bendFactor;
        }
      }

      z += 0.001 * Math.sin(x * 2 + y * 2);

      posAttr.setXYZ(i, x, y, z);
    }

    posAttr.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  public startFold(faceIndex: number) {
    this.faces[faceIndex].folding = true;
    if (this.faces[faceIndex].foldLine) {
      (this.faces[faceIndex].foldLine!.material as THREE.LineDashedMaterial).opacity = 0.9;
    }
  }

  public setFoldAngle(faceIndex: number, angleDeg: number) {
    const face = this.faces[faceIndex];
    const rad = THREE.MathUtils.clamp(angleDeg * Math.PI / 180, this.FOLD_MIN, this.FOLD_MAX);
    face.targetAngle = rad;
  }

  public endFold(faceIndex: number) {
    const face = this.faces[faceIndex];
    face.folding = false;
    if (face.foldLine) {
      (face.foldLine!.material as THREE.LineDashedMaterial).opacity = 0;
    }
  }

  public setFaceColor(faceIndex: number, hexColor: string) {
    const face = this.faces[faceIndex];
    face.color = hexColor;
    const color = new THREE.Color(hexColor);
    const mat = this.paperMaterial[faceIndex];
    mat.color.copy(color);
    mat.emissive.copy(color.clone().multiplyScalar(0.04));
    mat.needsUpdate = true;
  }

  public getFaceColor(faceIndex: number): string {
    return this.faces[faceIndex].color;
  }

  public toggleFocus(faceIndex: number): boolean {
    if (this.focusedFace === faceIndex) {
      this.focusedFace = null;
      this.faces[faceIndex].focused = false;
      this.focusTargetProgress = 0;
      return false;
    }

    if (this.focusedFace !== null) {
      this.faces[this.focusedFace].focused = false;
    }

    this.focusedFace = faceIndex;
    this.faces[faceIndex].focused = true;
    this.focusTargetProgress = 1;
    return true;
  }

  public getFocusedFace(): number | null {
    return this.focusedFace;
  }

  public getCurrentAngleDeg(faceIndex: number): number {
    return Math.round(this.faces[faceIndex].currentAngle * 180 / Math.PI);
  }

  public startOpacityPulse() {
    this.opacityPulseActive = true;
  }

  public stopOpacityPulse() {
    this.opacityPulseActive = false;
  }

  public resetAll() {
    this.resetting = true;
    this.resetProgress = 0;
    this.focusedFace = null;
    this.focusTargetProgress = 0;
    for (const f of this.faces) {
      f.focused = false;
    }
  }

  public setEmissiveIntensity(intensity: number, color: THREE.Color) {
    for (let i = 0; i < 6; i++) {
      const mat = this.paperMaterial[i];
      mat.emissive.copy(color.clone().multiplyScalar(0.08 * intensity));
      mat.needsUpdate = true;
    }
  }

  public update(delta: number, time: number) {
    const angleSpeed = this.resetting ? 6 : 5;

    for (const face of this.faces) {
      const targetAng = this.resetting ? 0 : face.targetAngle;
      const diff = targetAng - face.currentAngle;

      if (Math.abs(diff) > 0.001) {
        face.currentAngle += diff * Math.min(1, delta * angleSpeed);
        if (this.resetting) {
          const overshoot = Math.sin(this.resetProgress * Math.PI) * 0.08 * (1 - this.resetProgress);
          face.currentAngle += overshoot;
        }
        this.updateFoldGeometry(face);
      } else if (!face.folding) {
        face.currentAngle = targetAng;
      }
    }

    if (this.resetting) {
      this.resetProgress += delta * 1.2;
      if (this.resetProgress >= 1) {
        this.resetting = false;
        this.resetProgress = 0;
        for (const face of this.faces) {
          face.currentAngle = 0;
          face.targetAngle = 0;
          this.updateFoldGeometry(face);
        }
      }
    }

    const focusDiff = this.focusTargetProgress - this.focusProgress;
    if (Math.abs(focusDiff) > 0.001) {
      this.focusProgress += focusDiff * Math.min(1, delta * 4);
    }

    if (this.opacityPulseActive) {
      this.opacityPulse += delta * 3;
    }
    const pulseBase = this.opacityPulseActive ? (0.6 + 0.2 * (0.5 + 0.5 * Math.sin(this.opacityPulse))) : 0.72;

    for (let i = 0; i < 6; i++) {
      const face = this.faces[i];
      const mat = this.paperMaterial[i];
      const baseOpacity = this.focusedFace === null
        ? pulseBase
        : (face.focused ? pulseBase : 0.15);

      const t = this.focusProgress;
      const scale = 1 + 0.3 * t * (face.focused ? 1 : 0);
      face.mesh.scale.setScalar(scale);

      mat.opacity = THREE.MathUtils.lerp(mat.opacity, baseOpacity, Math.min(1, delta * 5));
      this.backMaterial.opacity = THREE.MathUtils.lerp(this.backMaterial.opacity, baseOpacity * 0.95, Math.min(1, delta * 5));
      mat.needsUpdate = true;
    }

    for (const face of this.faces) {
      for (const se of face.stringEdges) {
        const shouldDim = this.focusedFace !== null && !face.focused;
        const targetOp = shouldDim ? 0.15 : 0.65;
        const sm = se.material as THREE.LineBasicMaterial;
        sm.opacity = THREE.MathUtils.lerp(sm.opacity, targetOp, Math.min(1, delta * 4));
      }
    }

    if (this.resetting || time < 3) {
      this.group.position.y = 0.03 * Math.sin(time * 1.2) + (this.resetting ? 0.02 * Math.sin(this.resetProgress * Math.PI * 3) : 0);
    }
  }

  public raycastFaces(
    raycaster: THREE.Raycaster,
    camera: THREE.Camera
  ): { faceIndex: number; point: THREE.Vector3; edgeNormal: THREE.Vector3 | null } | null {
    const meshes = this.faces.map(f => f.mesh);
    const intersects = raycaster.intersectObjects(meshes, false);

    if (intersects.length === 0) return null;

    const hit = intersects[0];
    const mesh = hit.object as THREE.Mesh;
    const faceIndex = this.faces.findIndex(f => f.mesh === mesh);

    if (faceIndex < 0) return null;

    const localPoint = hit.point.clone();
    mesh.worldToLocal(localPoint);

    let edgeNormal: THREE.Vector3 | null = null;
    const threshold = this.HALF * 0.75;

    if (faceIndex === 0 || faceIndex === 1) {
      if (Math.abs(localPoint.y - this.HALF) < threshold && localPoint.y > 0 && faceIndex === 0) {
        edgeNormal = new THREE.Vector3(0, -1, 0);
      } else if (faceIndex === 1 && localPoint.y < 0) {
        edgeNormal = new THREE.Vector3(0, 1, 0);
      } else {
        edgeNormal = null;
      }
    } else if (faceIndex === 2 || faceIndex === 3) {
      if (faceIndex === 2 && localPoint.x > 0) {
        edgeNormal = new THREE.Vector3(-1, 0, 0);
      } else if (faceIndex === 3 && localPoint.x < 0) {
        edgeNormal = new THREE.Vector3(1, 0, 0);
      } else {
        edgeNormal = null;
      }
    } else if (faceIndex === 4 || faceIndex === 5) {
      if (faceIndex === 4 && localPoint.x > 0) {
        edgeNormal = new THREE.Vector3(-1, 0, 0);
      } else if (faceIndex === 5 && localPoint.x < 0) {
        edgeNormal = new THREE.Vector3(1, 0, 0);
      } else {
        edgeNormal = null;
      }
    }

    if (!edgeNormal) {
      const dx = Math.abs(localPoint.x);
      const dy = Math.abs(localPoint.y);
      if (dx > dy) {
        edgeNormal = new THREE.Vector3(localPoint.x > 0 ? -1 : 1, 0, 0);
      } else {
        edgeNormal = new THREE.Vector3(0, localPoint.y > 0 ? -1 : 1, 0);
      }
    }

    return { faceIndex, point: hit.point, edgeNormal };
  }

  public dispose() {
    for (const mat of this.paperMaterial) mat.dispose();
    this.backMaterial.dispose();
    this.foldLineMaterial.dispose();
    this.stringMaterial.dispose();
    for (const face of this.faces) {
      face.mesh.geometry.dispose();
      for (const se of face.stringEdges) {
        se.geometry.dispose();
        (se.material as THREE.Material).dispose();
      }
      if (face.foldLine) {
        face.foldLine.geometry.dispose();
        (face.foldLine.material as THREE.Material).dispose();
      }
    }
  }
}
