export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface FaceData {
  id: number;
  vertices: [Vec3, Vec3, Vec3];
  color: string;
  foldAxis: { point: Vec3; direction: Vec3 };
  foldAngle: number;
  foldDelay: number;
  parentId: number | null;
}

export interface FaceTransform {
  transform: string;
  clipPath: string;
  opacity: number;
  faceId: number;
}

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
  '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F1948A', '#82E0AA', '#F5B041', '#AED6F1',
  '#D7BDE2', '#A3E4D7', '#FADBD8', '#FCF3CF'
];

function v(x: number, y: number, z: number = 0): Vec3 {
  return { x, y, z };
}

function createOrigamiFaces(): FaceData[] {
  const S = 200;
  const H = 200;

  const O = v(0, 0, 0);
  const A = v(-S, -S, 0);
  const B = v(S, -S, 0);
  const C = v(S, S, 0);
  const D = v(-S, S, 0);

  const M_AB = v(0, -S, 0);
  const M_BC = v(S, 0, 0);
  const M_CD = v(0, S, 0);
  const M_DA = v(-S, 0, 0);

  const HEAD_TIP = v(0, -S * 1.3, -H * 0.6);
  const TAIL_TIP = v(0, S * 1.3, -H * 0.5);
  const WING_L = v(-S * 1.4, 0, -H * 0.7);
  const WING_R = v(S * 1.4, 0, -H * 0.7);

  const faces: FaceData[] = [];

  faces.push({
    id: 0,
    vertices: [O, M_AB, A],
    color: COLORS[0],
    foldAxis: { point: M_AB, direction: { x: 1, y: 0, z: 0 } },
    foldAngle: -120,
    foldDelay: 0.1,
    parentId: null
  });

  faces.push({
    id: 1,
    vertices: [O, B, M_AB],
    color: COLORS[1],
    foldAxis: { point: M_AB, direction: { x: 1, y: 0, z: 0 } },
    foldAngle: -120,
    foldDelay: 0.1,
    parentId: null
  });

  faces.push({
    id: 2,
    vertices: [O, M_BC, B],
    color: COLORS[2],
    foldAxis: { point: M_BC, direction: { x: 0, y: 1, z: 0 } },
    foldAngle: 120,
    foldDelay: 0.15,
    parentId: null
  });

  faces.push({
    id: 3,
    vertices: [O, C, M_BC],
    color: COLORS[3],
    foldAxis: { point: M_BC, direction: { x: 0, y: 1, z: 0 } },
    foldAngle: 120,
    foldDelay: 0.15,
    parentId: null
  });

  faces.push({
    id: 4,
    vertices: [O, M_CD, C],
    color: COLORS[4],
    foldAxis: { point: M_CD, direction: { x: 1, y: 0, z: 0 } },
    foldAngle: 120,
    foldDelay: 0.1,
    parentId: null
  });

  faces.push({
    id: 5,
    vertices: [O, D, M_CD],
    color: COLORS[5],
    foldAxis: { point: M_CD, direction: { x: 1, y: 0, z: 0 } },
    foldAngle: 120,
    foldDelay: 0.1,
    parentId: null
  });

  faces.push({
    id: 6,
    vertices: [O, M_DA, D],
    color: COLORS[6],
    foldAxis: { point: M_DA, direction: { x: 0, y: 1, z: 0 } },
    foldAngle: -120,
    foldDelay: 0.15,
    parentId: null
  });

  faces.push({
    id: 7,
    vertices: [O, A, M_DA],
    color: COLORS[7],
    foldAxis: { point: M_DA, direction: { x: 0, y: 1, z: 0 } },
    foldAngle: -120,
    foldDelay: 0.15,
    parentId: null
  });

  faces.push({
    id: 8,
    vertices: [A, M_AB, HEAD_TIP],
    color: COLORS[8],
    foldAxis: { point: A, direction: { x: 1, y: -1, z: 0 } },
    foldAngle: 95,
    foldDelay: 0.35,
    parentId: 0
  });

  faces.push({
    id: 9,
    vertices: [B, M_AB, HEAD_TIP],
    color: COLORS[9],
    foldAxis: { point: B, direction: { x: -1, y: -1, z: 0 } },
    foldAngle: -95,
    foldDelay: 0.35,
    parentId: 1
  });

  faces.push({
    id: 10,
    vertices: [C, M_CD, TAIL_TIP],
    color: COLORS[10],
    foldAxis: { point: C, direction: { x: -1, y: 1, z: 0 } },
    foldAngle: -95,
    foldDelay: 0.4,
    parentId: 4
  });

  faces.push({
    id: 11,
    vertices: [D, M_CD, TAIL_TIP],
    color: COLORS[11],
    foldAxis: { point: D, direction: { x: 1, y: 1, z: 0 } },
    foldAngle: 95,
    foldDelay: 0.4,
    parentId: 5
  });

  faces.push({
    id: 12,
    vertices: [A, M_DA, WING_L],
    color: COLORS[12],
    foldAxis: { point: A, direction: { x: -1, y: 1, z: 0 } },
    foldAngle: 90,
    foldDelay: 0.5,
    parentId: 7
  });

  faces.push({
    id: 13,
    vertices: [D, M_DA, WING_L],
    color: COLORS[13],
    foldAxis: { point: D, direction: { x: -1, y: -1, z: 0 } },
    foldAngle: 90,
    foldDelay: 0.5,
    parentId: 6
  });

  faces.push({
    id: 14,
    vertices: [B, M_BC, WING_R],
    color: COLORS[14],
    foldAxis: { point: B, direction: { x: 1, y: 1, z: 0 } },
    foldAngle: -90,
    foldDelay: 0.5,
    parentId: 2
  });

  faces.push({
    id: 15,
    vertices: [C, M_BC, WING_R],
    color: COLORS[15],
    foldAxis: { point: C, direction: { x: 1, y: -1, z: 0 } },
    foldAngle: -90,
    foldDelay: 0.5,
    parentId: 3
  });

  return faces;
}

function easeInOut(t: number): number {
  if (t < 0.5) {
    return 2 * t * t;
  }
  return -1 + (4 - 2 * t) * t;
}

function rotatePointAroundAxis(
  point: Vec3,
  axisPoint: Vec3,
  axisDir: Vec3,
  angleDeg: number
): Vec3 {
  const angle = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  let ux = axisDir.x;
  let uy = axisDir.y;
  let uz = axisDir.z;
  const len = Math.sqrt(ux * ux + uy * uy + uz * uz);
  if (len > 0) {
    ux /= len;
    uy /= len;
    uz /= len;
  }

  const px = point.x - axisPoint.x;
  const py = point.y - axisPoint.y;
  const pz = point.z - axisPoint.z;

  const rx =
    (cos + ux * ux * (1 - cos)) * px +
    (ux * uy * (1 - cos) - uz * sin) * py +
    (ux * uz * (1 - cos) + uy * sin) * pz;
  const ry =
    (uy * ux * (1 - cos) + uz * sin) * px +
    (cos + uy * uy * (1 - cos)) * py +
    (uy * uz * (1 - cos) - ux * sin) * pz;
  const rz =
    (uz * ux * (1 - cos) - uy * sin) * px +
    (uz * uy * (1 - cos) + ux * sin) * py +
    (cos + uz * uz * (1 - cos)) * pz;

  return {
    x: rx + axisPoint.x,
    y: ry + axisPoint.y,
    z: rz + axisPoint.z
  };
}

export class OrigamiModel {
  private faces: FaceData[];
  private foldProgress: number = 0;
  private targetProgress: number = 0;
  private isAnimating: boolean = false;
  private animationStartTime: number = 0;
  private startProgress: number = 0;
  private readonly ANIMATION_DURATION: number = 2000;

  constructor() {
    this.faces = createOrigamiFaces();
  }

  public toggleFold(): void {
    const newTarget = this.targetProgress > 0.5 ? 0 : 1;
    this.startAnimation(newTarget);
  }

  public startAnimation(target: number): void {
    this.targetProgress = Math.max(0, Math.min(1, target));
    this.startProgress = this.foldProgress;
    this.animationStartTime = performance.now();
    this.isAnimating = true;
  }

  public setProgressImmediate(value: number): void {
    this.foldProgress = Math.max(0, Math.min(1, value));
    this.targetProgress = this.foldProgress;
    this.isAnimating = false;
  }

  public update(now: number): boolean {
    if (!this.isAnimating) return false;

    const elapsed = now - this.animationStartTime;
    const rawT = Math.min(elapsed / this.ANIMATION_DURATION, 1);
    const easedT = easeInOut(rawT);

    this.foldProgress =
      this.startProgress + (this.targetProgress - this.startProgress) * easedT;

    if (rawT >= 1) {
      this.foldProgress = this.targetProgress;
      this.isAnimating = false;
    }

    return true;
  }

  public getProgress(): number {
    return this.foldProgress;
  }

  public getProgressPercent(): string {
    return Math.round(this.foldProgress * 100) + '%';
  }

  public getIsAnimating(): boolean {
    return this.isAnimating;
  }

  public getTargetProgress(): number {
    return this.targetProgress;
  }

  public getFaceCount(): number {
    return this.faces.length;
  }

  public getFaceData(faceId: number): FaceData | undefined {
    return this.faces.find((f) => f.id === faceId);
  }

  public computeFaceTransform(faceId: number): FaceTransform | null {
    const face = this.faces.find((f) => f.id === faceId);
    if (!face) return null;

    const effectiveT = Math.max(
      0,
      Math.min(1, (this.foldProgress - face.foldDelay) / (1 - face.foldDelay))
    );
    const easedT = easeInOut(effectiveT);
    const currentAngle = face.foldAngle * easedT;

    const transformedVerts: [Vec3, Vec3, Vec3] = [
      rotatePointAroundAxis(
        face.vertices[0],
        face.foldAxis.point,
        face.foldAxis.direction,
        currentAngle
      ),
      rotatePointAroundAxis(
        face.vertices[1],
        face.foldAxis.point,
        face.foldAxis.direction,
        currentAngle
      ),
      rotatePointAroundAxis(
        face.vertices[2],
        face.foldAxis.point,
        face.foldAxis.direction,
        currentAngle
      )
    ];

    const centroid: Vec3 = {
      x: (transformedVerts[0].x + transformedVerts[1].x + transformedVerts[2].x) / 3,
      y: (transformedVerts[0].y + transformedVerts[1].y + transformedVerts[2].y) / 3,
      z: (transformedVerts[0].z + transformedVerts[1].z + transformedVerts[2].z) / 3
    };

    const edge1: Vec3 = {
      x: transformedVerts[1].x - transformedVerts[0].x,
      y: transformedVerts[1].y - transformedVerts[0].y,
      z: transformedVerts[1].z - transformedVerts[0].z
    };
    const edge2: Vec3 = {
      x: transformedVerts[2].x - transformedVerts[0].x,
      y: transformedVerts[2].y - transformedVerts[0].y,
      z: transformedVerts[2].z - transformedVerts[0].z
    };

    let normal: Vec3 = {
      x: edge1.y * edge2.z - edge1.z * edge2.y,
      y: edge1.z * edge2.x - edge1.x * edge2.z,
      z: edge1.x * edge2.y - edge1.y * edge2.x
    };
    const nLen = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
    if (nLen > 0) {
      normal.x /= nLen;
      normal.y /= nLen;
      normal.z /= nLen;
    }

    if (normal.z < 0) {
      normal.x = -normal.x;
      normal.y = -normal.y;
      normal.z = -normal.z;
    }

    const up: Vec3 = { x: 0, y: -1, z: 0 };
    const rightVec: Vec3 = {
      x: up.y * normal.z - up.z * normal.y,
      y: up.z * normal.x - up.x * normal.z,
      z: up.x * normal.y - up.y * normal.x
    };
    const rLen = Math.sqrt(
      rightVec.x * rightVec.x + rightVec.y * rightVec.y + rightVec.z * rightVec.z
    );
    if (rLen > 0) {
      rightVec.x /= rLen;
      rightVec.y /= rLen;
      rightVec.z /= rLen;
    }

    const upVec: Vec3 = {
      x: normal.y * rightVec.z - normal.z * rightVec.y,
      y: normal.z * rightVec.x - normal.x * rightVec.z,
      z: normal.x * rightVec.y - normal.y * rightVec.x
    };

    const minX = Math.min(transformedVerts[0].x, transformedVerts[1].x, transformedVerts[2].x);
    const maxX = Math.max(transformedVerts[0].x, transformedVerts[1].x, transformedVerts[2].x);
    const minY = Math.min(transformedVerts[0].y, transformedVerts[1].y, transformedVerts[2].y);
    const maxY = Math.max(transformedVerts[0].y, transformedVerts[1].y, transformedVerts[2].y);
    const width = Math.max(maxX - minX, 1);
    const height = Math.max(maxY - minY, 1);

    const bboxCenter: Vec3 = {
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2,
      z: centroid.z
    };

    const localPts = transformedVerts.map((p) => {
      const rel: Vec3 = {
        x: p.x - bboxCenter.x,
        y: p.y - bboxCenter.y,
        z: p.z - bboxCenter.z
      };
      return {
        u: rel.x * rightVec.x + rel.y * rightVec.y + rel.z * rightVec.z,
        v: rel.x * upVec.x + rel.y * upVec.y + rel.z * upVec.z
      };
    });

    const clipPath = `polygon(${50 + (localPts[0].u / width) * 100}% ${50 +
      (localPts[0].v / height) * 100}%, ${50 + (localPts[1].u / width) * 100}% ${50 +
      (localPts[1].v / height) * 100}%, ${50 + (localPts[2].u / width) * 100}% ${50 +
      (localPts[2].v / height) * 100}%)`;

    const m11 = rightVec.x;
    const m12 = upVec.x;
    const m13 = normal.x;
    const m21 = rightVec.y;
    const m22 = upVec.y;
    const m23 = normal.y;
    const m31 = rightVec.z;
    const m32 = upVec.z;
    const m33 = normal.z;

    const opacity = 0.8 - 0.2 * this.foldProgress;

    return {
      transform:
        `translate3d(${bboxCenter.x}px, ${bboxCenter.y}px, ${bboxCenter.z}px) ` +
        `matrix3d(${m11}, ${m21}, ${m31}, 0, ` +
        `${m12}, ${m22}, ${m32}, 0, ` +
        `${m13}, ${m23}, ${m33}, 0, ` +
        `0, 0, 0, 1) ` +
        `translate(-50%, -50%) ` +
        `translateZ(0)`,
      clipPath,
      opacity,
      faceId
    };
  }

  public getAllFaceColors(): Map<number, string> {
    const map = new Map<number, string>();
    for (const face of this.faces) {
      map.set(face.id, face.color);
    }
    return map;
  }
}
