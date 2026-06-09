import * as THREE from 'three';

export type FossilCategory = 'skull' | 'torso' | 'limb';

export interface FossilPiece {
  id: number;
  category: FossilCategory;
  mesh: THREE.Group;
  targetPosition: THREE.Vector3;
  targetRotation: THREE.Euler;
  isPlaced: boolean;
  hint: string;
}

export interface FossilPuzzleEvents {
  onPiecePlaced?: (piece: FossilPiece) => void;
  onProgress?: (placed: number, total: number) => void;
  onComplete?: () => void;
}

const CATEGORY_COLORS: Record<FossilCategory, number> = {
  skull: 0xff4444,
  torso: 0x4488ff,
  limb: 0x44ff44
};

const SNAP_DISTANCE = 0.3;

export class FossilPuzzle {
  private pieces: FossilPiece[] = [];
  private audioContext: AudioContext | null = null;
  private events: FossilPuzzleEvents;
  private placedCount = 0;

  constructor(events: FossilPuzzleEvents = {}) {
    this.events = events;
  }

  getPieces(): FossilPiece[] {
    return this.pieces;
  }

  getPlacedCount(): number {
    return this.placedCount;
  }

  getTotalCount(): number {
    return this.pieces.length;
  }

  createFossilPieces(scene: THREE.Scene): FossilPiece[] {
    this.pieces = [];
    this.placedCount = 0;

    const skeletonLayout = this.generateSkeletonLayout();

    skeletonLayout.forEach((layout, index) => {
      const group = this.createFossilPieceMesh(layout.category);
      const scatterPos = this.getRandomScatterPosition();
      group.position.copy(scatterPos);
      group.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
      scene.add(group);

      this.pieces.push({
        id: index,
        category: layout.category,
        mesh: group,
        targetPosition: layout.position,
        targetRotation: layout.rotation,
        isPlaced: false,
        hint: layout.hint
      });
    });

    return this.pieces;
  }

  private generateSkeletonLayout(): Array<{
    category: FossilCategory;
    position: THREE.Vector3;
    rotation: THREE.Euler;
    hint: string;
  }> {
    return [
      {
        category: 'skull',
        position: new THREE.Vector3(0, 0.5, 2.5),
        rotation: new THREE.Euler(0, 0, 0),
        hint: '头骨碎片：放置在骨架最前端（展台前部中央）'
      },
      {
        category: 'skull',
        position: new THREE.Vector3(0, 0.8, 2.0),
        rotation: new THREE.Euler(0.1, 0, 0),
        hint: '下颚碎片：放置在头骨下方'
      },
      {
        category: 'torso',
        position: new THREE.Vector3(0, 0.4, 1.0),
        rotation: new THREE.Euler(0, 0, 0),
        hint: '颈椎碎片：放置在头骨后方'
      },
      {
        category: 'torso',
        position: new THREE.Vector3(0, 0.3, 0.3),
        rotation: new THREE.Euler(0, 0, 0),
        hint: '胸椎碎片1：放置在颈椎后方'
      },
      {
        category: 'torso',
        position: new THREE.Vector3(0, 0.3, -0.4),
        rotation: new THREE.Euler(0, 0, 0),
        hint: '胸椎碎片2：放置在胸椎1后方'
      },
      {
        category: 'torso',
        position: new THREE.Vector3(0, 0.3, -1.1),
        rotation: new THREE.Euler(0, 0, 0),
        hint: '腰椎碎片：放置在胸椎后方'
      },
      {
        category: 'torso',
        position: new THREE.Vector3(0, 0.4, -1.9),
        rotation: new THREE.Euler(0.2, 0, 0),
        hint: '尾椎碎片1：放置在腰椎后方'
      },
      {
        category: 'torso',
        position: new THREE.Vector3(0, 0.3, -2.6),
        rotation: new THREE.Euler(0.3, 0, 0),
        hint: '尾椎碎片2：放置在尾椎1后方'
      },
      {
        category: 'limb',
        position: new THREE.Vector3(1.0, 0.2, 0.8),
        rotation: new THREE.Euler(0, 0, 0.3),
        hint: '前肢碎片1：放置在骨架左前方'
      },
      {
        category: 'limb',
        position: new THREE.Vector3(-1.0, 0.2, 0.8),
        rotation: new THREE.Euler(0, 0, -0.3),
        hint: '前肢碎片2：放置在骨架右前方'
      },
      {
        category: 'limb',
        position: new THREE.Vector3(1.1, 0.15, -0.2),
        rotation: new THREE.Euler(0, 0, 0.2),
        hint: '肋骨碎片1：放置在躯干左侧'
      },
      {
        category: 'limb',
        position: new THREE.Vector3(-1.1, 0.15, -0.2),
        rotation: new THREE.Euler(0, 0, -0.2),
        hint: '肋骨碎片2：放置在躯干右侧'
      },
      {
        category: 'limb',
        position: new THREE.Vector3(0.9, 0.1, -1.3),
        rotation: new THREE.Euler(0, 0, 0.1),
        hint: '后肢碎片1：放置在骨架左后方'
      },
      {
        category: 'limb',
        position: new THREE.Vector3(-0.9, 0.1, -1.3),
        rotation: new THREE.Euler(0, 0, -0.1),
        hint: '后肢碎片2：放置在骨架右后方'
      },
      {
        category: 'limb',
        position: new THREE.Vector3(0, 0.1, -3.2),
        rotation: new THREE.Euler(0.4, 0, 0),
        hint: '尾尖碎片：放置在骨架最后端'
      }
    ];
  }

  private createFossilPieceMesh(category: FossilCategory): THREE.Group {
    const group = new THREE.Group();
    const polyCount = 3 + Math.floor(Math.random() * 4);

    for (let i = 0; i < polyCount; i++) {
      const geometry = this.createDeformedPolyhedron();
      const color1 = new THREE.Color(0xE8D5B0);
      const color2 = new THREE.Color(0xD4C4A8);
      const t = Math.random();
      const baseColor = color1.clone().lerp(color2, t);

      const material = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.85,
        metalness: 0.05,
        flatShading: true
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        (Math.random() - 0.5) * 0.6,
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.6
      );
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );
      mesh.scale.setScalar(0.5 + Math.random() * 0.5);
      group.add(mesh);

      const edges = new THREE.EdgesGeometry(geometry);
      const edgeMaterial = new THREE.LineBasicMaterial({
        color: 0x5C3A1E,
        transparent: true,
        opacity: 0.5
      });
      const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
      edgeLines.position.copy(mesh.position);
      edgeLines.rotation.copy(mesh.rotation);
      edgeLines.scale.copy(mesh.scale);
      group.add(edgeLines);
    }

    const glowColor = CATEGORY_COLORS[category];
    const glowGeo = new THREE.SphereGeometry(0.7, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.name = 'glow';
    group.add(glow);

    return group;
  }

  private createDeformedPolyhedron(): THREE.BufferGeometry {
    const geo = new THREE.IcosahedronGeometry(0.5, 0);
    const positions = geo.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const deform = 0.7 + Math.random() * 0.6;
      positions.setXYZ(i, x * deform, y * deform, z * deform);
    }

    geo.computeVertexNormals();
    return geo;
  }

  private getRandomScatterPosition(): THREE.Vector3 {
    const angle = Math.random() * Math.PI * 2;
    const radius = 6 + Math.random() * 4;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = 0.5 + Math.random() * 2;
    return new THREE.Vector3(x, y, z);
  }

  checkSnap(piece: FossilPiece): boolean {
    if (piece.isPlaced) return false;

    const distance = piece.mesh.position.distanceTo(piece.targetPosition);

    if (distance < SNAP_DISTANCE) {
      this.snapPiece(piece);
      return true;
    }
    return false;
  }

  private snapPiece(piece: FossilPiece): void {
    piece.isPlaced = true;
    this.placedCount++;

    piece.mesh.position.copy(piece.targetPosition);
    piece.mesh.rotation.copy(piece.targetRotation);

    this.playSnapSound();
    this.events.onPiecePlaced?.(piece);
    this.events.onProgress?.(this.placedCount, this.pieces.length);

    if (this.placedCount === this.pieces.length) {
      this.events.onComplete?.();
    }
  }

  private playSnapSound(): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = this.audioContext;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.05);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc2.type = 'square';
      osc2.frequency.setValueAtTime(2400, now);
      osc2.frequency.exponentialRampToValueAtTime(1600, now + 0.03);
      gain2.gain.setValueAtTime(0.1, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain).connect(ctx.destination);
      osc2.connect(gain2).connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
      osc2.start(now);
      osc2.stop(now + 0.05);
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }

  reset(): void {
    this.placedCount = 0;
    this.pieces.forEach((piece) => {
      piece.isPlaced = false;
      piece.mesh.position.copy(this.getRandomScatterPosition());
      piece.mesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
    });
    this.events.onProgress?.(0, this.pieces.length);
  }

  dispose(): void {
    this.pieces.forEach((piece) => {
      piece.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    this.pieces = [];
  }
}
