export interface DataPacket {
  id: string;
  sourceId: number;
  targetId: number;
  latency: number;
  packetLoss: number;
  size: number;
  timestamp: number;
}

export interface NodeStats {
  nodeId: number;
  connectionCount: number;
  totalTraffic: number;
  avgLatency: number;
}

export interface LinkStats {
  sourceId: number;
  targetId: number;
  load: number;
  avgLatency: number;
  packetCount: number;
}

export interface GlobalStats {
  avgLatency: number;
  throughput: number;
  activeConnections: number;
  congestionRatio: number;
}

type EventHandler = (...args: any[]) => void;

class EventEmitter {
  private events: Map<string, EventHandler[]> = new Map();

  on(event: string, handler: EventHandler): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(handler);
  }

  off(event: string, handler: EventHandler): void {
    const handlers = this.events.get(event);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx !== -1) handlers.splice(idx, 1);
    }
  }

  emit(event: string, ...args: any[]): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach((h) => h(...args));
    }
  }
}

export class DataSimulator extends EventEmitter {
  private nodeCount: number;
  private packetRate: number = 3;
  private lastUpdate: number = 0;
  private updateInterval: number = 1000 / 60;
  private packetCounter: number = 0;
  private isRunning: boolean = false;
  private rafId: number | null = null;
  private startTime: number = 0;
  private congestionThreshold: number = 0.7;

  private linkLoads: Map<string, number> = new Map();
  private linkLatencies: Map<string, number[]> = new Map();
  private linkPackets: Map<string, number> = new Map();
  private nodeTraffic: Map<number, number> = new Map();
  private nodeLatencies: Map<number, number[]> = new Map();
  private nodeConnections: Map<number, Set<number>> = new Map();
  private recentPackets: DataPacket[] = [];
  private throughputWindow: number[] = [];

  constructor(nodeCount: number = 20) {
    super();
    this.nodeCount = nodeCount;
    this.initStats();
  }

  private initStats(): void {
    for (let i = 0; i < this.nodeCount; i++) {
      this.nodeTraffic.set(i, 0);
      this.nodeLatencies.set(i, []);
      this.nodeConnections.set(i, new Set());
    }
  }

  private getLinkKey(a: number, b: number): string {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
  }

  setPacketRate(rate: number): void {
    this.packetRate = Math.max(1, Math.min(10, rate));
  }

  setCongestionThreshold(threshold: number): void {
    this.congestionThreshold = threshold;
  }

  getCongestionThreshold(): number {
    return this.congestionThreshold;
  }

  getNodeCount(): number {
    return this.nodeCount;
  }

  getNodeStats(nodeId: number): NodeStats {
    const connections = this.nodeConnections.get(nodeId)?.size || 0;
    const traffic = this.nodeTraffic.get(nodeId) || 0;
    const latencies = this.nodeLatencies.get(nodeId) || [];
    const avgLat = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;

    return {
      nodeId,
      connectionCount: connections,
      totalTraffic: traffic,
      avgLatency: avgLat,
    };
  }

  getLinkStats(sourceId: number, targetId: number): LinkStats {
    const key = this.getLinkKey(sourceId, targetId);
    return {
      sourceId,
      targetId,
      load: this.linkLoads.get(key) || 0,
      avgLatency: (this.linkLatencies.get(key) || []).reduce((a, b) => a + b, 0) /
        Math.max(1, (this.linkLatencies.get(key) || []).length),
      packetCount: this.linkPackets.get(key) || 0,
    };
  }

  getAllLinkStats(): LinkStats[] {
    const stats: LinkStats[] = [];
    this.linkLoads.forEach((load, key) => {
      const [a, b] = key.split('-').map(Number);
      stats.push(this.getLinkStats(a, b));
    });
    return stats;
  }

  getGlobalStats(): GlobalStats {
    let totalLat = 0;
    let latCount = 0;
    let congestedLinks = 0;
    let totalLinks = 0;

    this.linkLatencies.forEach((lats) => {
      if (lats.length > 0) {
        totalLat += lats.reduce((a, b) => a + b, 0);
        latCount += lats.length;
      }
      totalLinks++;
    });

    this.linkLoads.forEach((load) => {
      if (load > this.congestionThreshold) congestedLinks++;
    });

    const throughput = this.throughputWindow.length > 0
      ? this.throughputWindow.reduce((a, b) => a + b, 0) / this.throughputWindow.length
      : 0;

    return {
      avgLatency: latCount > 0 ? totalLat / latCount : 0,
      throughput,
      activeConnections: this.recentPackets.length,
      congestionRatio: totalLinks > 0 ? congestedLinks / totalLinks : 0,
    };
  }

  getElapsedTime(): number {
    return this.isRunning ? (performance.now() - this.startTime) / 1000 : 0;
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.startTime = performance.now();
    this.lastUpdate = this.startTime;
    this.scheduleUpdate();
  }

  stop(): void {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private scheduleUpdate(): void {
    if (!this.isRunning) return;
    this.rafId = requestAnimationFrame(() => this.tick());
  }

  private tick(): void {
    if (!this.isRunning) return;

    const now = performance.now();
    const delta = now - this.lastUpdate;

    if (delta >= this.updateInterval) {
      this.lastUpdate = now;
      this.update(delta / 1000);
      this.emit('stats', this.getGlobalStats());
    }

    this.scheduleUpdate();
  }

  private update(dt: number): void {
    const now = performance.now();
    const packetsToGenerate = Math.floor(this.packetRate * dt + Math.random());

    for (let i = 0; i < packetsToGenerate; i++) {
      this.generatePacket();
    }

    this.recentPackets = this.recentPackets.filter((p) => now - p.timestamp < 5000);

    this.throughputWindow.push(
      this.recentPackets.reduce((acc, p) => acc + p.size, 0) / 5
    );
    if (this.throughputWindow.length > 30) {
      this.throughputWindow.shift();
    }

    this.linkLoads.forEach((load, key) => {
      const decay = Math.max(0, load - dt * 0.05);
      this.linkLoads.set(key, Math.min(1, decay));
    });
  }

  private generatePacket(): void {
    const sourceId = Math.floor(Math.random() * this.nodeCount);
    let targetId = Math.floor(Math.random() * this.nodeCount);
    while (targetId === sourceId) {
      targetId = Math.floor(Math.random() * this.nodeCount);
    }

    const baseLatency = 20 + Math.random() * 80;
    const spike = Math.random() < 0.1 ? Math.random() * 150 : 0;
    const latency = baseLatency + spike;
    const packetLoss = Math.random() < 0.05 ? Math.random() * 0.1 : 0;
    const size = 0.1 + Math.random() * 2.0;

    const packet: DataPacket = {
      id: `pkt-${this.packetCounter++}`,
      sourceId,
      targetId,
      latency,
      packetLoss,
      size,
      timestamp: performance.now(),
    };

    const linkKey = this.getLinkKey(sourceId, targetId);

    const currentLoad = this.linkLoads.get(linkKey) || 0;
    const loadIncrease = 0.02 + (size / 10) * 0.1;
    this.linkLoads.set(linkKey, Math.min(1, currentLoad + loadIncrease));

    if (!this.linkLatencies.has(linkKey)) {
      this.linkLatencies.set(linkKey, []);
    }
    const latList = this.linkLatencies.get(linkKey)!;
    latList.push(latency);
    if (latList.length > 50) latList.shift();

    this.linkPackets.set(linkKey, (this.linkPackets.get(linkKey) || 0) + 1);

    this.nodeTraffic.set(sourceId, (this.nodeTraffic.get(sourceId) || 0) + size);
    this.nodeTraffic.set(targetId, (this.nodeTraffic.get(targetId) || 0) + size);

    const srcLat = this.nodeLatencies.get(sourceId)!;
    srcLat.push(latency);
    if (srcLat.length > 50) srcLat.shift();

    const tgtLat = this.nodeLatencies.get(targetId)!;
    tgtLat.push(latency);
    if (tgtLat.length > 50) tgtLat.shift();

    this.nodeConnections.get(sourceId)!.add(targetId);
    this.nodeConnections.get(targetId)!.add(sourceId);

    this.recentPackets.push(packet);
    this.emit('packet', packet);
  }
}
