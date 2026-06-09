export interface Planet {
  id: string;
  name: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  cargoBacklog: number;
  maxBacklog: number;
  isCentral: boolean;
}

export interface Route {
  from: string;
  to: string;
  hasGate: boolean;
}

export interface Stargate {
  id: string;
  planetId?: string;
  routeIndex?: number;
  x: number;
  y: number;
  animProgress: number;
  isCentral: boolean;
  flyInStart?: { x: number; y: number };
}

const PLANET_COLORS = ['#4FC3F7', '#FFD54F', '#FF8A65'];
const PLANET_NAMES = [
  'Alpha Prime', 'Beta Nexus', 'Gamma Station', 'Delta Hub',
  'Epsilon Outpost', 'Zeta Core', 'Echo Base', 'Theta Point'
];

export class PlanetNetwork {
  planets: Planet[] = [];
  routes: Route[] = [];
  stargates: Stargate[] = [];
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.generate();
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  generate(): void {
    this.planets = [];
    this.routes = [];
    this.stargates = [];

    const planetCount = 5 + Math.floor(Math.random() * 4);
    const minDistance = 120;
    const margin = 80;

    for (let i = 0; i < planetCount; i++) {
      let attempts = 0;
      let placed = false;

      while (!placed && attempts < 100) {
        const x = margin + Math.random() * (this.width - margin * 2);
        const y = margin + Math.random() * (this.height - margin * 2);

        let valid = true;
        for (const p of this.planets) {
          const dx = p.x - x;
          const dy = p.y - y;
          if (Math.sqrt(dx * dx + dy * dy) < minDistance) {
            valid = false;
            break;
          }
        }

        if (valid) {
          const color = PLANET_COLORS[Math.floor(Math.random() * PLANET_COLORS.length)];
          const radius = 20 + Math.random() * 10;
          this.planets.push({
            id: `planet-${i}`,
            name: PLANET_NAMES[i % PLANET_NAMES.length],
            x,
            y,
            radius,
            color,
            cargoBacklog: Math.floor(Math.random() * 6),
            maxBacklog: 10,
            isCentral: false
          });
          placed = true;
        }
        attempts++;
      }
    }

    let centerDist = Infinity;
    let centerIdx = 0;
    const cx = this.width / 2;
    const cy = this.height / 2;
    for (let i = 0; i < this.planets.length; i++) {
  const dx = this.planets[i].x - cx;
      const dy = this.planets[i].y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < centerDist) {
        centerDist = d;
        centerIdx = i;
      }
    }
    this.planets[centerIdx].isCentral = true;

    this.generateRoutes();
    this.ensureConnectivity();

    const centralPlanet = this.planets[centerIdx];
    this.stargates.push({
      id: 'gate-central',
      planetId: centralPlanet.id,
      x: centralPlanet.x,
      y: centralPlanet.y,
      animProgress: 1,
      isCentral: true
    });
  }

  private generateRoutes(): void {
    for (let i = 0; i < this.planets.length; i++) {
      const distances: { idx: number; dist: number }[] = [];
      for (let j = 0; j < this.planets.length; j++) {
        if (i === j) continue;
        const dx = this.planets[i].x - this.planets[j].x;
        const dy = this.planets[i].y - this.planets[j].y;
        distances.push({ idx: j, dist: Math.sqrt(dx * dx + dy * dy) });
      }
      distances.sort((a, b) => a.dist - b.dist);

      const connectCount = 2 + Math.floor(Math.random() * 2);
      for (let k = 0; k < Math.min(connectCount, distances.length); k++) {
        const j = distances[k].idx;
        if (i < j) {
          const fromId = this.planets[i].id;
          const toId = this.planets[j].id;
          if (!this.routes.some(r =>
            (r.from === fromId && r.to === toId) ||
            (r.from === toId && r.to === fromId)
          )) {
            this.routes.push({ from: fromId, to: toId, hasGate: false });
          }
        }
      }
    }
  }

  private ensureConnectivity(): void {
    const visited = new Set<string>();
    const queue = [this.planets[0].id];
    visited.add(this.planets[0].id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const route of this.routes) {
        let neighbor: string | null = null;
        if (route.from === current) neighbor = route.to;
        else if (route.to === current) neighbor = route.from;
        if (neighbor && !visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    for (const planet of this.planets) {
      if (!visited.has(planet.id)) {
        let nearestDist = Infinity;
        let nearestId: string | null = null;
        for (const v of visited) {
          const vp = this.planets.find(p => p.id === v)!;
          const dx = vp.x - planet.x;
          const dy = vp.y - planet.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < nearestDist) {
            nearestDist = d;
            nearestId = vp.id;
          }
        }
        if (nearestId) {
          this.routes.push({ from: nearestId, to: planet.id, hasGate: false });
          visited.add(planet.id);
        }
      }
    }
  }

  getPlanet(id: string): Planet | undefined {
    return this.planets.find(p => p.id === id);
  }

  getCentralPlanet(): Planet | undefined {
    return this.planets.find(p => p.isCentral);
  }

  getRouteMidpoint(routeIndex: number): { x: number; y: number } {
    const route = this.routes[routeIndex];
    if (!route) return { x: 0, y: 0 };
    const from = this.getPlanet(route.from)!;
    const to = this.getPlanet(route.to)!;
    return {
      x: (from.x + to.x) / 2,
      y: (from.y + to.y) / 2
    };
  }

  findShortestPath(fromId: string, toId: string): string[] {
    if (fromId === toId) return [fromId];

    const distances: Record<string, number> = {};
    const previous: Record<string, string | null> = {};
    const unvisited = new Set<string>();

    for (const p of this.planets) {
      distances[p.id] = Infinity;
      previous[p.id] = null;
      unvisited.add(p.id);
    }
    distances[fromId] = 0;

    while (unvisited.size > 0) {
      let current: string | null = null;
      let minDist = Infinity;
      for (const id of unvisited) {
        if (distances[id] < minDist) {
          minDist = distances[id];
          current = id;
        }
      }

      if (current === null || current === toId) break;
      unvisited.delete(current);

      for (const route of this.routes) {
        let neighbor: string | null = null;
        if (route.from === current) neighbor = route.to;
        else if (route.to === current) neighbor = route.from;

        if (neighbor && unvisited.has(neighbor)) {
          const fromP = this.getPlanet(current)!;
          const toP = this.getPlanet(neighbor)!;
          const dx = fromP.x - toP.x;
          const dy = fromP.y - toP.y;
          let weight = Math.sqrt(dx * dx + dy * dy);
          if (route.hasGate) weight *= 0.5;

          const alt = distances[current] + weight;
          if (alt < distances[neighbor]) {
            distances[neighbor] = alt;
            previous[neighbor] = current;
          }
        }
      }
    }

    const path: string[] = [];
    let node: string | null = toId;
    while (node !== null) {
      path.unshift(node);
      node = previous[node];
    }
    return path[0] === fromId ? path : [];
  }

  findNearestStargatePlanetId(fromX: number, fromY: number): string | null {
    let bestId: string | null = null;
    let bestDist = Infinity;

    for (const gate of this.stargates) {
      let gx: number, gy: number;
      if (gate.planetId) {
        const p = this.getPlanet(gate.planetId);
        if (!p) continue;
        gx = p.x;
        gy = p.y;
      } else {
        gx = gate.x;
        gy = gate.y;
      }
      const dx = gx - fromX;
      const dy = gy - fromY;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) {
        bestDist = d;
        if (gate.planetId) {
          bestId = gate.planetId;
        } else if (gate.routeIndex !== undefined) {
          const mid = this.getRouteMidpoint(gate.routeIndex);
          const route = this.routes[gate.routeIndex];
          const fromP = this.getPlanet(route.from);
          const toP = this.getPlanet(route.to);
          if (fromP && toP) {
            bestId = route.from;
          }
        }
      }
    }
    return bestId;
  }

  addStargateOnRoute(routeIndex: number): Stargate | null {
    const route = this.routes[routeIndex];
    if (!route || route.hasGate) return null;

    route.hasGate = true;
    const mid = this.getRouteMidpoint(routeIndex);

    const edgeX = Math.random() < 0.5 ? -50 : this.width + 50;
    const edgeY = Math.random() < 0.5 ? -50 : this.height + 50;

    const gate: Stargate = {
      id: `gate-${Date.now()}`,
      routeIndex,
      x: edgeX,
      y: edgeY,
      animProgress: 0,
      isCentral: false,
      flyInStart: { x: edgeX, y: edgeY }
    };
    this.stargates.push(gate);

    const targetX = mid.x;
    const targetY = mid.y;
    gate.x = targetX;
    gate.y = targetY;

    return gate;
  }

  getGatePlanetIds(): string[] {
    return this.stargates
      .filter(g => g.planetId)
      .map(g => g.planetId!);
  }
}
