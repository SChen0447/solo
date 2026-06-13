export interface HexCoord {
  q: number;
  r: number;
}

export interface HexNode {
  coord: HexCoord;
  isTarget: boolean;
  isPath: boolean;
}

export interface Edge {
  from: HexCoord;
  to: HexCoord;
  brightness: number;
}

const HEX_DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export class Maze {
  public nodes: Map<string, HexNode> = new Map();
  public edges: Map<string, Edge> = new Map();
  public size: number;
  public targetCount: number;
  public nodeSpacing: number = 60;

  constructor(level: number) {
    this.size = 4 + level;
    this.targetCount = 2 + level;
    this.generate();
  }

  private coordKey(coord: HexCoord): string {
    return `${coord.q},${coord.r}`;
  }

  private edgeKey(a: HexCoord, b: HexCoord): string {
    const keys = [this.coordKey(a), this.coordKey(b)].sort();
    return keys.join('-');
  }

  private generate(): void {
    this.nodes.clear();
    this.edges.clear();

    const radius = Math.floor(this.size / 2);

    for (let q = -radius; q <= radius; q++) {
      const r1 = Math.max(-radius, -q - radius);
      const r2 = Math.min(radius, -q + radius);
      for (let r = r1; r <= r2; r++) {
        const coord = { q, r };
        this.nodes.set(this.coordKey(coord), {
          coord,
          isTarget: false,
          isPath: true,
        });
      }
    }

    this.nodes.forEach((node) => {
      const neighbors = this.getNeighbors(node.coord);
      neighbors.forEach((neighbor) => {
        const key = this.edgeKey(node.coord, neighbor);
        if (!this.edges.has(key)) {
          this.edges.set(key, {
            from: node.coord,
            to: neighbor,
            brightness: 0.3,
          });
        }
      });
    });

    this.placeTargets();
  }

  private placeTargets(): void {
    const nodeArray = Array.from(this.nodes.values());
    const nonCornerNodes = nodeArray.filter((node) => {
      const { q, r } = node.coord;
      return !(q === 0 && r === 0) && !(Math.abs(q) + Math.abs(r) + Math.abs(-q - r) > this.size - 1);
    });

    const shuffled = nonCornerNodes.sort(() => Math.random() - 0.5);
    const targets = shuffled.slice(0, this.targetCount);

    targets.forEach((node) => {
      node.isTarget = true;
    });
  }

  public getNeighbors(coord: HexCoord): HexCoord[] {
    const neighbors: HexCoord[] = [];
    HEX_DIRECTIONS.forEach((dir) => {
      const neighbor = { q: coord.q + dir.q, r: coord.r + dir.r };
      if (this.nodes.has(this.coordKey(neighbor))) {
        neighbors.push(neighbor);
      }
    });
    return neighbors;
  }

  public isAdjacent(a: HexCoord, b: HexCoord): boolean {
    const dq = Math.abs(a.q - b.q);
    const dr = Math.abs(a.r - b.r);
    const ds = Math.abs((-a.q - a.r) - (-b.q - b.r));
    return (dq + dr + ds) === 2 && dq <= 1 && dr <= 1 && ds <= 1;
  }

  public getNode(coord: HexCoord): HexNode | undefined {
    return this.nodes.get(this.coordKey(coord));
  }

  public hexToPixel(coord: HexCoord, centerX: number, centerY: number): { x: number; y: number } {
    const x = this.nodeSpacing * (3 / 2 * coord.q);
    const y = this.nodeSpacing * (Math.sqrt(3) / 2 * coord.q + Math.sqrt(3) * coord.r);
    return { x: x + centerX, y: y + centerY };
  }

  public pixelToHex(px: number, py: number, centerX: number, centerY: number): HexCoord {
    const x = px - centerX;
    const y = py - centerY;
    const q = (2 / 3 * x) / this.nodeSpacing;
    const r = (-1 / 3 * x + Math.sqrt(3) / 3 * y) / this.nodeSpacing;
    return this.roundHex({ q, r });
  }

  private roundHex(coord: HexCoord): HexCoord {
    let q = Math.round(coord.q);
    let r = Math.round(coord.r);
    const s = Math.round(-coord.q - coord.r);

    const qDiff = Math.abs(q - coord.q);
    const rDiff = Math.abs(r - coord.r);
    const sDiff = Math.abs(s - (-coord.q - coord.r));

    if (qDiff > rDiff && qDiff > sDiff) {
      q = -r - s;
    } else if (rDiff > sDiff) {
      r = -q - s;
    }

    return { q, r };
  }

  public setEdgeBrightness(from: HexCoord, to: HexCoord, brightness: number): void {
    const key = this.edgeKey(from, to);
    const edge = this.edges.get(key);
    if (edge) {
      edge.brightness = brightness;
    }
  }

  public updateEdges(deltaTime: number): void {
    this.edges.forEach((edge) => {
      if (edge.brightness > 0.3) {
        edge.brightness -= deltaTime * 2.5;
        if (edge.brightness < 0.3) {
          edge.brightness = 0.3;
        }
      }
    });
  }

  public getStartPosition(): HexCoord {
    const nodeArray = Array.from(this.nodes.values());
    let minCoord = nodeArray[0].coord;
    let minPixel = this.hexToPixel(minCoord, 0, 0);

    nodeArray.forEach((node) => {
      const pixel = this.hexToPixel(node.coord, 0, 0);
      if (pixel.x < minPixel.x || (pixel.x === minPixel.x && pixel.y < minPixel.y)) {
        minCoord = node.coord;
        minPixel = pixel;
      }
    });

    return minCoord;
  }

  public getNonTargetNodes(): HexNode[] {
    return Array.from(this.nodes.values()).filter((node) => !node.isTarget);
  }

  public getTargetNodes(): HexNode[] {
    return Array.from(this.nodes.values()).filter((node) => node.isTarget);
  }

  public getAllNodeCoords(): HexCoord[] {
    return Array.from(this.nodes.values()).map((node) => node.coord);
  }
}
