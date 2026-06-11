export interface Star {
  id: number;
  x: number;
  y: number;
  baseRadius: number;
  brightness: number;
  magnitude: number;
  name: string;
  constellationName: string | null;
  twinklePhase: number;
  twinkleSpeed: number;
}

export interface Constellation {
  id: string;
  name: string;
  nameEn: string;
  starIds: number[];
  connections: [number, number][];
  labelX: number;
  labelY: number;
}

export interface CustomConnection {
  starId1: number;
  starId2: number;
  opacity: number;
  removing: boolean;
  removeTimer: number;
  id: number;
}

export interface HighlightState {
  starIds: number[];
  startTime: number;
  duration: number;
}

export class StarField {
  stars: Star[] = [];
  constellations: Constellation[] = [];
  customConnections: CustomConnection[] = [];
  showConstellations = false;
  highlightState: HighlightState | null = null;
  private customConnectionIdCounter = 0;
  worldWidth: number;
  worldHeight: number;

  constructor(worldWidth: number, worldHeight: number) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.generateStars();
    this.defineConstellations();
  }

  private rand(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private generateStars(): void {
    const count = Math.floor(this.rand(350, 450));
    for (let i = 0; i < count; i++) {
      const magnitude = this.rand(0, 6);
      const brightness = 1 - magnitude / 6;
      const baseRadius = 0.8 + brightness * 2.5;
      this.stars.push({
        id: i,
        x: this.rand(50, this.worldWidth - 50),
        y: this.rand(50, this.worldHeight - 50),
        baseRadius,
        brightness,
        magnitude: Math.round(magnitude * 10) / 10,
        name: this.generateStarName(),
        constellationName: null,
        twinklePhase: this.rand(0, Math.PI * 2),
        twinkleSpeed: this.rand(0.5, 2)
      });
    }
  }

  private generateStarName(): string {
    const prefixes = ['天', '北', '南', '东', '西', '紫微', '太微', '天市', '河', '海', '山', '谷', '星', '辰', '曜'];
    const suffixes = ['枢', '璇', '玑', '权', '衡', '开', '光', '元', '亨', '利', '贞', '明', '辉', '耀', '华', '英', '睿', '景'];
    return prefixes[Math.floor(Math.random() * prefixes.length)] +
           suffixes[Math.floor(Math.random() * suffixes.length)] +
           '·' + Math.floor(Math.random() * 900 + 100);
  }

  private defineConstellations(): void {
    this.constellations = [
      this.createBigDipper(),
      this.createOrion(),
      this.createCassiopeia(),
      this.createUrsaMinor(),
      this.createLeo()
    ];

    this.constellations.forEach(c => {
      c.starIds.forEach(sid => {
        const star = this.stars[sid];
        if (star) star.constellationName = c.name;
      });
    });
  }

  private createBigDipper(): Constellation {
    const cx = this.worldWidth * 0.25;
    const cy = this.worldHeight * 0.3;
    const positions: [number, number][] = [
      [0, -60], [40, -40], [80, -10], [120, 20], [160, 10], [200, -20], [240, -50]
    ];
    const starIds: number[] = [];

    for (let i = 0; i < positions.length; i++) {
      const idx = this.findOrCreateStar(cx + positions[i][0], cy + positions[i][1], 2 - i * 0.15);
      starIds.push(idx);
    }

    const connections: [number, number][] = [];
    for (let i = 0; i < starIds.length - 1; i++) {
      connections.push([starIds[i], starIds[i + 1]]);
    }

    return {
      id: 'big-dipper',
      name: '北斗七星',
      nameEn: 'Big Dipper',
      starIds,
      connections,
      labelX: cx + 120,
      labelY: cy - 90
    };
  }

  private createOrion(): Constellation {
    const cx = this.worldWidth * 0.6;
    const cy = this.worldHeight * 0.45;
    const positions: [number, number][] = [
      [-50, -100], [50, -100], [-70, -30], [70, -30],
      [-30, 0], [0, 0], [30, 0], [-60, 70], [60, 70]
    ];
    const starIds: number[] = [];

    for (let i = 0; i < positions.length; i++) {
      const mag = i < 2 ? 0.8 : (i >= 4 && i <= 6 ? 2.5 : 1.5);
      const idx = this.findOrCreateStar(cx + positions[i][0], cy + positions[i][1], mag);
      starIds.push(idx);
    }

    const connections: [number, number][] = [
      [starIds[0], starIds[2]], [starIds[1], starIds[3]],
      [starIds[2], starIds[4]], [starIds[2], starIds[5]], [starIds[2], starIds[6]],
      [starIds[3], starIds[4]], [starIds[3], starIds[5]], [starIds[3], starIds[6]],
      [starIds[4], starIds[5]], [starIds[5], starIds[6]],
      [starIds[4], starIds[7]], [starIds[6], starIds[8]]
    ];

    return {
      id: 'orion',
      name: '猎户座',
      nameEn: 'Orion',
      starIds,
      connections,
      labelX: cx,
      labelY: cy - 130
    };
  }

  private createCassiopeia(): Constellation {
    const cx = this.worldWidth * 0.78;
    const cy = this.worldHeight * 0.22;
    const positions: [number, number][] = [
      [-80, 40], [-40, -30], [0, 40], [40, -30], [80, 40]
    ];
    const starIds: number[] = [];

    for (let i = 0; i < positions.length; i++) {
      const idx = this.findOrCreateStar(cx + positions[i][0], cy + positions[i][1], 1.5);
      starIds.push(idx);
    }

    const connections: [number, number][] = [];
    for (let i = 0; i < starIds.length - 1; i++) {
      connections.push([starIds[i], starIds[i + 1]]);
    }

    return {
      id: 'cassiopeia',
      name: '仙后座',
      nameEn: 'Cassiopeia',
      starIds,
      connections,
      labelX: cx,
      labelY: cy - 70
    };
  }

  private createUrsaMinor(): Constellation {
    const cx = this.worldWidth * 0.15;
    const cy = this.worldHeight * 0.65;
    const positions: [number, number][] = [
      [0, 0], [35, 25], [55, 60], [30, 90], [5, 110], [-25, 95], [-40, 60]
    ];
    const starIds: number[] = [];

    for (let i = 0; i < positions.length; i++) {
      const mag = i === 0 ? 0.5 : 2.5;
      const idx = this.findOrCreateStar(cx + positions[i][0], cy + positions[i][1], mag);
      starIds.push(idx);
    }

    const connections: [number, number][] = [];
    for (let i = 0; i < starIds.length - 1; i++) {
      connections.push([starIds[i], starIds[i + 1]]);
    }
    connections.push([starIds[starIds.length - 1], starIds[0]]);

    return {
      id: 'ursa-minor',
      name: '小熊座',
      nameEn: 'Ursa Minor',
      starIds,
      connections,
      labelX: cx - 10,
      labelY: cy - 40
    };
  }

  private createLeo(): Constellation {
    const cx = this.worldWidth * 0.4;
    const cy = this.worldHeight * 0.7;
    const positions: [number, number][] = [
      [-80, -50], [-50, -30], [-30, 0], [-60, 20], [-90, 10],
      [0, 0], [50, -10], [90, -40], [110, 0]
    ];
    const starIds: number[] = [];

    for (let i = 0; i < positions.length; i++) {
      const mag = i === 5 ? 1 : (i === 7 ? 1.8 : 2.8);
      const idx = this.findOrCreateStar(cx + positions[i][0], cy + positions[i][1], mag);
      starIds.push(idx);
    }

    const connections: [number, number][] = [
      [starIds[0], starIds[1]], [starIds[1], starIds[2]], [starIds[2], starIds[3]],
      [starIds[3], starIds[4]], [starIds[4], starIds[0]],
      [starIds[2], starIds[5]], [starIds[5], starIds[6]], [starIds[6], starIds[7]],
      [starIds[7], starIds[8]]
    ];

    return {
      id: 'leo',
      name: '狮子座',
      nameEn: 'Leo',
      starIds,
      connections,
      labelX: cx,
      labelY: cy - 80
    };
  }

  private findOrCreateStar(x: number, y: number, magnitude: number): number {
    const brightness = 1 - magnitude / 6;
    const baseRadius = 0.8 + brightness * 2.5;

    let nearestIdx = -1;
    let nearestDist = 40;

    for (let i = 0; i < this.stars.length; i++) {
      const dx = this.stars[i].x - x;
      const dy = this.stars[i].y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    if (nearestIdx >= 0 && !this.stars[nearestIdx].constellationName) {
      this.stars[nearestIdx].x = x;
      this.stars[nearestIdx].y = y;
      this.stars[nearestIdx].magnitude = magnitude;
      this.stars[nearestIdx].brightness = brightness;
      this.stars[nearestIdx].baseRadius = baseRadius;
      return nearestIdx;
    }

    const newIdx = this.stars.length;
    const names = ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι'];
    this.stars.push({
      id: newIdx,
      x, y,
      baseRadius,
      brightness,
      magnitude,
      name: names[newIdx % names.length] + '星·' + Math.floor(Math.random() * 900 + 100),
      constellationName: null,
      twinklePhase: this.rand(0, Math.PI * 2),
      twinkleSpeed: this.rand(0.5, 2)
    });
    return newIdx;
  }

  addCustomConnection(starId1: number, starId2: number): void {
    if (starId1 === starId2) return;
    const exists = this.customConnections.some(c =>
      (c.starId1 === starId1 && c.starId2 === starId2) ||
      (c.starId1 === starId2 && c.starId2 === starId1)
    );
    if (exists) return;

    this.customConnections.push({
      starId1, starId2,
      opacity: 1,
      removing: false,
      removeTimer: 0,
      id: this.customConnectionIdCounter++
    });
  }

  removeCustomConnection(id: number): void {
    const conn = this.customConnections.find(c => c.id === id);
    if (conn && !conn.removing) {
      conn.removing = true;
      conn.removeTimer = 0;
    }
  }

  removeAllCustomConnections(): void {
    this.customConnections.forEach((conn, i) => {
      setTimeout(() => {
        if (conn) {
          conn.removing = true;
          conn.removeTimer = 0;
        }
      }, i * 100);
    });
  }

  findStarAt(worldX: number, worldY: number, hitRadius: number): Star | null {
    for (const star of this.stars) {
      const dx = star.x - worldX;
      const dy = star.y - worldY;
      const r = Math.max(star.baseRadius * 2, hitRadius);
      if (dx * dx + dy * dy <= r * r) {
        return star;
      }
    }
    return null;
  }

  findCustomConnectionAt(worldX: number, worldY: number, threshold: number): CustomConnection | null {
    for (const conn of this.customConnections) {
      if (conn.removing) continue;
      const s1 = this.stars[conn.starId1];
      const s2 = this.stars[conn.starId2];
      if (!s1 || !s2) continue;

      const dist = this.pointToSegmentDistance(worldX, worldY, s1.x, s1.y, s2.x, s2.y);
      if (dist <= threshold) return conn;
    }
    return null;
  }

  private pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) {
      const ex = px - x1, ey = py - y1;
      return Math.sqrt(ex * ex + ey * ey);
    }
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const cx = x1 + t * dx;
    const cy = y1 + t * dy;
    const ex = px - cx, ey = py - cy;
    return Math.sqrt(ex * ex + ey * ey);
  }

  findConstellationByName(query: string): Constellation | null {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return this.constellations.find(c =>
      c.name.toLowerCase().includes(q) ||
      c.nameEn.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q)
    ) || null;
  }

  highlightConstellation(constellation: Constellation): void {
    this.highlightState = {
      starIds: [...constellation.starIds],
      startTime: performance.now(),
      duration: 3000
    };
  }

  getConstellationCenter(constellation: Constellation): { x: number; y: number } {
    let sx = 0, sy = 0;
    for (const sid of constellation.starIds) {
      const star = this.stars[sid];
      if (star) { sx += star.x; sy += star.y; }
    }
    return {
      x: sx / constellation.starIds.length,
      y: sy / constellation.starIds.length
    };
  }

  update(deltaTime: number, currentTime: number): void {
    for (let i = this.customConnections.length - 1; i >= 0; i--) {
      const conn = this.customConnections[i];
      if (conn.removing) {
        conn.removeTimer += deltaTime;
        const blinkPeriod = 200;
        const blinkCount = 2;
        const blinkDuration = blinkPeriod * blinkCount * 2;
        if (conn.removeTimer < blinkDuration) {
          const phase = Math.floor(conn.removeTimer / blinkPeriod);
          conn.opacity = phase % 2 === 0 ? 1 : 0;
        } else {
          conn.opacity = Math.max(0, 1 - (conn.removeTimer - blinkDuration) / 300);
          if (conn.opacity <= 0) {
            this.customConnections.splice(i, 1);
          }
        }
      }
    }

    if (this.highlightState) {
      const elapsed = currentTime - this.highlightState.startTime;
      if (elapsed >= this.highlightState.duration) {
        this.highlightState = null;
      }
    }
  }
}
