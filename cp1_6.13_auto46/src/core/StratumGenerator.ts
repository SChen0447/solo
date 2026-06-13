import * as THREE from 'three';
import { scaleLinear, interpolateRgb } from 'd3-scale';

export interface MineralNode {
  id: string;
  type: 'gold' | 'diamond' | 'quartz' | 'copper';
  depth: number;
  collected: boolean;
  position: THREE.Vector3;
}

export interface Stratum {
  name: string;
  startDepth: number;
  endDepth: number;
  baseColor: THREE.Color;
  edgeColor: THREE.Color;
  hardness: number;
  mineralNodes: MineralNode[];
  textureSeed: number;
}

export interface StratumTransition {
  startDepth: number;
  endDepth: number;
  fromColor: THREE.Color;
  toColor: THREE.Color;
}

export class StratumGenerator {
  public readonly CYLINDER_RADIUS = 10;
  public readonly CYLINDER_HEIGHT = 50;
  public readonly TRANSITION_THICKNESS = 1;
  public readonly TOTAL_HEIGHT = 50;

  private strata: Stratum[] = [];
  private transitions: StratumTransition[] = [];

  constructor() {
    this.generateStrata();
    this.generateTransitions();
  }

  private generateStrata(): void {
    this.strata = [
      {
        name: '表土层',
        startDepth: 0,
        endDepth: 10,
        baseColor: new THREE.Color(0x8b5a2b),
        edgeColor: new THREE.Color(0x654321),
        hardness: 1,
        mineralNodes: [],
        textureSeed: Math.random() * 1000
      },
      {
        name: '砂岩层',
        startDepth: 10,
        endDepth: 20,
        baseColor: new THREE.Color(0xd2b48c),
        edgeColor: new THREE.Color(0xb8860b),
        hardness: 2.5,
        mineralNodes: [
          {
            id: 'mineral-1',
            type: 'gold',
            depth: 15,
            collected: false,
            position: new THREE.Vector3(5, 25 - 15, 0)
          }
        ],
        textureSeed: Math.random() * 1000
      },
      {
        name: '石灰岩层',
        startDepth: 20,
        endDepth: 30,
        baseColor: new THREE.Color(0xe8e8e8),
        edgeColor: new THREE.Color(0xa9a9a9),
        hardness: 4,
        mineralNodes: [],
        textureSeed: Math.random() * 1000
      },
      {
        name: '花岗岩层',
        startDepth: 30,
        endDepth: 40,
        baseColor: new THREE.Color(0xa0522d),
        edgeColor: new THREE.Color(0x8b0000),
        hardness: 7,
        mineralNodes: [
          {
            id: 'mineral-2',
            type: 'diamond',
            depth: 36,
            collected: false,
            position: new THREE.Vector3(-3, 25 - 36, 4)
          }
        ],
        textureSeed: Math.random() * 1000
      },
      {
        name: '基岩层',
        startDepth: 40,
        endDepth: 50,
        baseColor: new THREE.Color(0x1a1a1a),
        edgeColor: new THREE.Color(0x444444),
        hardness: 10,
        mineralNodes: [],
        textureSeed: Math.random() * 1000
      }
    ];
  }

  private generateTransitions(): void {
    this.transitions = [];
    for (let i = 0; i < this.strata.length - 1; i++) {
      const current = this.strata[i];
      const next = this.strata[i + 1];
      this.transitions.push({
        startDepth: current.endDepth - this.TRANSITION_THICKNESS / 2,
        endDepth: current.endDepth + this.TRANSITION_THICKNESS / 2,
        fromColor: current.baseColor,
        toColor: next.baseColor
      });
    }
  }

  public getStrata(): Stratum[] {
    return this.strata;
  }

  public getTransitions(): StratumTransition[] {
    return this.transitions;
  }

  public getStratumAtDepth(depth: number): Stratum | null {
    const clampedDepth = Math.max(0, Math.min(depth, this.TOTAL_HEIGHT));
    for (const stratum of this.strata) {
      if (clampedDepth >= stratum.startDepth && clampedDepth <= stratum.endDepth) {
        return stratum;
      }
    }
    return null;
  }

  public getColorAtDepth(depth: number): THREE.Color {
    const clampedDepth = Math.max(0, Math.min(depth, this.TOTAL_HEIGHT));
    for (const transition of this.transitions) {
      if (clampedDepth >= transition.startDepth && clampedDepth <= transition.endDepth) {
        const t = scaleLinear()
          .domain([transition.startDepth, transition.endDepth])
          .range([0, 1])(clampedDepth);
        const colorStr = interpolateRgb(
          `#${transition.fromColor.getHexString()}`,
          `#${transition.toColor.getHexString()}`
        )(t);
        return new THREE.Color(colorStr);
      }
    }
    const stratum = this.getStratumAtDepth(clampedDepth);
    return stratum ? stratum.baseColor.clone() : new THREE.Color(0x333333);
  }

  public getHardnessAtDepth(depth: number): number {
    const clampedDepth = Math.max(0, Math.min(depth, this.TOTAL_HEIGHT));
    for (let i = 0; i < this.transitions.length; i++) {
      const transition = this.transitions[i];
      if (clampedDepth >= transition.startDepth && clampedDepth <= transition.endDepth) {
        const current = this.strata[i];
        const next = this.strata[i + 1];
        const t = scaleLinear()
          .domain([transition.startDepth, transition.endDepth])
          .range([0, 1])(clampedDepth);
        return current.hardness + (next.hardness - current.hardness) * t;
      }
    }
    const stratum = this.getStratumAtDepth(clampedDepth);
    return stratum ? stratum.hardness : 10;
  }

  public getAllMineralNodes(): MineralNode[] {
    const allNodes: MineralNode[] = [];
    for (const stratum of this.strata) {
      allNodes.push(...stratum.mineralNodes);
    }
    return allNodes;
  }

  public collectMineral(id: string): MineralNode | null {
    for (const stratum of this.strata) {
      const node = stratum.mineralNodes.find(n => n.id === id);
      if (node && !node.collected) {
        node.collected = true;
        return node;
      }
    }
    return null;
  }

  public createProceduralTexture(stratum: Stratum): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const baseColorHex = `#${stratum.baseColor.getHexString()}`;
    ctx.fillStyle = baseColorHex;
    ctx.fillRect(0, 0, 512, 512);

    const seed = stratum.textureSeed;
    const pseudoRandom = (i: number) => {
      const x = Math.sin(i + seed) * 10000;
      return x - Math.floor(x);
    };

    switch (stratum.name) {
      case '表土层':
        this.generateTopsoilTexture(ctx, pseudoRandom, stratum);
        break;
      case '砂岩层':
        this.generateSandstoneTexture(ctx, pseudoRandom, stratum);
        break;
      case '石灰岩层':
        this.generateLimestoneTexture(ctx, pseudoRandom, stratum);
        break;
      case '花岗岩层':
        this.generateGraniteTexture(ctx, pseudoRandom, stratum);
        break;
      case '基岩层':
        this.generateBedrockTexture(ctx, pseudoRandom, stratum);
        break;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 4);
    return texture;
  }

  private generateTopsoilTexture(ctx: CanvasRenderingContext2D, rand: (i: number) => void, stratum: Stratum): void {
    for (let i = 0; i < 5000; i++) {
      const x = (rand as any)(i) * 512;
      const y = (rand as any)(i + 500) * 512;
      const size = (rand as any)(i + 1000) * 3 + 1;
      const shade = (rand as any)(i + 1500);
      ctx.fillStyle = `rgba(${100 + shade * 50}, ${70 + shade * 30}, ${35 + shade * 20}, 0.7)`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 500; i++) {
      const x = (rand as any)(i + 2000) * 512;
      const y = (rand as any)(i + 2500) * 512;
      ctx.fillStyle = `rgba(60, 40, 20, 0.4)`;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  private generateSandstoneTexture(ctx: CanvasRenderingContext2D, rand: (i: number) => void, stratum: Stratum): void {
    for (let i = 0; i < 8000; i++) {
      const x = (rand as any)(i) * 512;
      const y = (rand as any)(i + 3000) * 512;
      const size = (rand as any)(i + 3500) * 2 + 0.5;
      const shade = (rand as any)(i + 4000);
      ctx.fillStyle = `rgba(${200 + shade * 30}, ${170 + shade * 40}, ${120 + shade * 30}, 0.6)`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(139, 119, 87, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      const y = (rand as any)(i + 5000) * 512;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y + (rand as any)(i + 5500) * 10 - 5);
      ctx.stroke();
    }
  }

  private generateLimestoneTexture(ctx: CanvasRenderingContext2D, rand: (i: number) => void, stratum: Stratum): void {
    for (let i = 0; i < 2000; i++) {
      const x = (rand as any)(i) * 512;
      const y = (rand as any)(i + 6000) * 512;
      ctx.fillStyle = `rgba(${220 + (rand as any)(i + 6500) * 35}, ${220 + (rand as any)(i + 7000) * 35}, ${220 + (rand as any)(i + 7500) * 35}, 0.5)`;
      ctx.fillRect(x, y, 3, 3);
    }
    ctx.strokeStyle = 'rgba(160, 160, 160, 0.25)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 40; i++) {
      const startX = (rand as any)(i + 8000) * 512;
      const startY = (rand as any)(i + 8500) * 512;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      let cx = startX, cy = startY;
      for (let j = 0; j < 5; j++) {
        cx += (rand as any)(i * 10 + j) * 40 - 20;
        cy += (rand as any)(i * 10 + j + 50) * 40 - 20;
        ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    }
  }

  private generateGraniteTexture(ctx: CanvasRenderingContext2D, rand: (i: number) => void, stratum: Stratum): void {
    for (let i = 0; i < 3000; i++) {
      const x = (rand as any)(i) * 512;
      const y = (rand as any)(i + 9000) * 512;
      const size = (rand as any)(i + 9500) * 4 + 2;
      const type = (rand as any)(i + 10000);
      let color: string;
      if (type < 0.4) {
        color = `rgba(160, 82, 45, 0.8)`;
      } else if (type < 0.7) {
        color = `rgba(220, 220, 220, 0.6)`;
      } else if (type < 0.9) {
        color = `rgba(139, 0, 0, 0.7)`;
      } else {
        color = `rgba(100, 149, 237, 0.5)`;
      }
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x + size * 0.866, y + size * 0.5);
      ctx.lineTo(x - size * 0.866, y + size * 0.5);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }
  }

  private generateBedrockTexture(ctx: CanvasRenderingContext2D, rand: (i: number) => void, stratum: Stratum): void {
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 362);
    gradient.addColorStop(0, '#2a2a2a');
    gradient.addColorStop(1, '#0d0d0d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2000; i++) {
      const x = (rand as any)(i) * 512;
      const y = (rand as any)(i + 11000) * 512;
      const size = (rand as any)(i + 11500) * 2 + 0.5;
      ctx.fillStyle = `rgba(100, 100, 100, 0.3)`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 500; i++) {
      const x = (rand as any)(i + 12000) * 512;
      const y = (rand as any)(i + 12500) * 512;
      ctx.fillStyle = `rgba(60, 60, 60, 0.8)`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  public buildCylinderMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'geological-cylinder';

    const segments = 64;
    const radialSegments = 64;

    for (const stratum of this.strata) {
      const height = stratum.endDepth - stratum.startDepth;
      const yTop = this.CYLINDER_HEIGHT / 2 - stratum.startDepth;
      const yCenter = yTop - height / 2;

      const geometry = new THREE.CylinderGeometry(
        this.CYLINDER_RADIUS,
        this.CYLINDER_RADIUS,
        height,
        radialSegments,
        1,
        true
      );

      const texture = this.createProceduralTexture(stratum);
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        roughness: stratum.name === '基岩层' ? 0.2 : 0.85,
        metalness: stratum.name === '基岩层' ? 0.5 : 0.05
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = yCenter;
      mesh.userData = { stratumName: stratum.name };
      group.add(mesh);

      const edgeGeometry = new THREE.EdgesGeometry(geometry);
      const edgeMaterial = new THREE.LineBasicMaterial({
        color: stratum.edgeColor,
        linewidth: 2,
        transparent: true,
        opacity: 0.9
      });
      const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      edges.position.y = yCenter;
      group.add(edges);
    }

    const topGeometry = new THREE.CircleGeometry(this.CYLINDER_RADIUS, radialSegments);
    const topMaterial = new THREE.MeshStandardMaterial({
      color: this.strata[0].baseColor,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      roughness: 0.9
    });
    const topMesh = new THREE.Mesh(topGeometry, topMaterial);
    topMesh.rotation.x = -Math.PI / 2;
    topMesh.position.y = this.CYLINDER_HEIGHT / 2;
    group.add(topMesh);

    const bottomGeometry = new THREE.CircleGeometry(this.CYLINDER_RADIUS, radialSegments);
    const bottomMaterial = new THREE.MeshStandardMaterial({
      color: this.strata[this.strata.length - 1].baseColor,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      roughness: 0.3,
      metalness: 0.3
    });
    const bottomMesh = new THREE.Mesh(bottomGeometry, bottomMaterial);
    bottomMesh.rotation.x = Math.PI / 2;
    bottomMesh.position.y = -this.CYLINDER_HEIGHT / 2;
    group.add(bottomMesh);

    return group;
  }
}
