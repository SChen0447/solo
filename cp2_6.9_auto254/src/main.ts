import { PlanetNetwork, type Planet } from './PlanetNetwork';
import { DroneManager, type Drone } from './DroneManager';
import { UIHandler } from './UIHandler';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

interface SuccessTrail {
  points: { x: number; y: number }[];
  life: number;
  maxLife: number;
}

interface FlyingNumber {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  private network!: PlanetNetwork;
  private droneManager!: DroneManager;
  private ui!: UIHandler;

  private currency: number = 100;
  private cargoDelivered: number = 0;
  private progress: number = 0;

  private particles: Particle[] = [];
  private successTrails: SuccessTrail[] = [];
  private flyingNumbers: FlyingNumber[] = [];

  private lastTime: number = 0;
  private currencyTimer: number = 0;
  private gatePulseTime: number = 0;
  private isVictoryAnimating: boolean = false;
  private victoryTimer: number = 0;

  private hoveredPlanet: Planet | null = null;

  private readonly GATE_COST = 50;
  private readonly SPEED_COST = 30;
  private readonly DRONE_COST = 80;
  private readonly PROGRESS_PER_CARGO = 0.5;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.init();
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.network) {
      this.network.resize(this.width, this.height);
    }
  }

  private init(): void {
    this.network = new PlanetNetwork(this.width, this.height);
    const central = this.network.getCentralPlanet()!;
    this.droneManager = new DroneManager(central.x, central.y);
    this.droneManager.onCargoDelivered = () => this.handleCargoDelivered();

    this.ui = new UIHandler(this.canvas);
    this.ui.populatePlanetSelectors(this.network.planets, central.id);
    this.ui.onDispatch = () => this.handleDispatch();
    this.ui.onBuildGate = () => this.handleBuildGate();
    this.ui.onUpgradeSpeed = () => this.handleUpgradeSpeed();
    this.ui.onAddDrone = () => this.handleAddDrone();
    this.ui.onPlanetHover = (_p, x, y) => this.handlePlanetHover(x, y);

    this.updateUI();
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  private handleDispatch(): void {
    const startId = this.ui.getSelectedStartId();
    const endId = this.ui.getSelectedEndId();
    if (!startId || !endId || startId === endId) return;

    const idleDrone = this.droneManager.getIdleDrone();
    if (!idleDrone) return;

    const central = this.network.getCentralPlanet()!;
    const gatePlanetId = central.id;

    const pathToPickup = this.network.findShortestPath(gatePlanetId, startId);
    const pathToDeliver = this.network.findShortestPath(startId, endId);
    const pathToReturn = this.network.findShortestPath(endId, gatePlanetId);

    if (pathToPickup.length < 2 || pathToDeliver.length < 2) return;

    const gatePlanet = this.network.getPlanet(gatePlanetId)!;
    idleDrone.x = gatePlanet.x;
    idleDrone.y = gatePlanet.y;

    idleDrone.gateStartId = gatePlanetId;
    idleDrone.startPlanetId = startId;
    idleDrone.endPlanetId = endId;
    idleDrone.path = [...pathToPickup];
    idleDrone.currentPathIndex = 1;
    idleDrone.state = 'toPickup';
    idleDrone.hasCargo = false;
    idleDrone.trail = [];
    idleDrone.cargoColor = this.randomCargoColor();

    (idleDrone as any).pathToDeliver = pathToDeliver;
    (idleDrone as any).pathToReturn = pathToReturn;
  }

  private handleBuildGate(): void {
    if (this.currency < this.GATE_COST) return;

    const availableRoutes = this.network.routes
      .map((r, i) => ({ route: r, index: i }))
      .filter(x => !x.route.hasGate);

    if (availableRoutes.length === 0) return;

    const choice = availableRoutes[Math.floor(Math.random() * availableRoutes.length)];
    const gate = this.network.addStargateOnRoute(choice.index);
    if (gate) {
      this.currency -= this.GATE_COST;
      this.updateUI();
      this.spawnFlyingNumber(gate.x, gate.y, '-50', '#FF6B6B');
    }
  }

  private handleUpgradeSpeed(): void {
    if (this.currency < this.SPEED_COST) return;
    if (this.droneManager.upgradeSpeed()) {
      this.currency -= this.SPEED_COST;
      this.updateUI();
    }
  }

  private handleAddDrone(): void {
    if (this.currency < this.DRONE_COST) return;
    const central = this.network.getCentralPlanet()!;
    if (this.droneManager.addDrone(central.x, central.y)) {
      this.currency -= this.DRONE_COST;
      this.updateUI();
    }
  }

  private handleCargoDelivered(): void {
    this.cargoDelivered++;
    this.progress = Math.min(100, this.progress + this.PROGRESS_PER_CARGO);
    this.currency += 5;

    this.addSuccessTrail();
    this.updateUI();

    if (this.progress >= 100 && !this.isVictoryAnimating) {
      this.triggerVictory();
    }
  }

  private addSuccessTrail(): void {
    for (const drone of this.droneManager.drones) {
      if (drone.state === 'unloading' && drone.trail.length > 1) {
        this.successTrails.push({
          points: drone.trail.map(t => ({ x: t.x, y: t.y })),
          life: 500,
          maxLife: 500
        });
      }
    }
  }

  private triggerVictory(): void {
    this.isVictoryAnimating = true;
    this.victoryTimer = 0;

    for (const planet of this.network.planets) {
      for (let i = 0; i < 500 / this.network.planets.length; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 4;
        this.particles.push({
          x: planet.x,
          y: planet.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: planet.color,
          life: 3000,
          maxLife: 3000,
          size: 2 + Math.random() * 3
        });
      }
    }
  }

  private resetGame(): void {
    this.currency = 100;
    this.cargoDelivered = 0;
    this.progress = 0;
    this.particles = [];
    this.successTrails = [];
    this.flyingNumbers = [];
    this.isVictoryAnimating = false;

    this.network.generate();
    const central = this.network.getCentralPlanet()!;
    this.droneManager.resetAll(central.x, central.y);
    this.ui.populatePlanetSelectors(this.network.planets, central.id);
    this.updateUI();
  }

  private handlePlanetHover(x: number, y: number): void {
    let found: Planet | null = null;
    for (const p of this.network.planets) {
      const dx = p.x - x;
      const dy = p.y - y;
      if (Math.sqrt(dx * dx + dy * dy) <= p.radius + 5) {
        found = p;
        break;
      }
    }
    this.hoveredPlanet = found;

    if (found) {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = rect.width / this.width;
      const scaleY = rect.height / this.height;
      this.ui.showTooltip(found, x * scaleX + rect.left, y * scaleY + rect.top);
    } else {
      this.ui.hideTooltip();
    }
  }

  private updateUI(): void {
    this.ui.updateResourceBar(
      this.currency,
      this.droneManager,
      this.cargoDelivered,
      this.progress
    );
  }

  private spawnFlyingNumber(x: number, y: number, text: string, color: string): void {
    this.flyingNumbers.push({
      x, y, text, color,
      life: 1000,
      maxLife: 1000
    });
  }

  private randomCargoColor(): string {
    const colors = ['#FF6B9D', '#C084FC', '#FBBF24', '#34D399', '#60A5FA', '#F472B6'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  private loop(time: number): void {
    const dt = Math.min(50, time - this.lastTime);
    this.lastTime = time;
    this.update(dt);
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number): void {
    this.gatePulseTime += dt;

    if (!this.isVictoryAnimating) {
      this.currencyTimer += dt;
      if (this.currencyTimer >= 1000) {
        this.currencyTimer -= 1000;
        this.currency += 1;
        this.ui.spawnCurrencyPopup(1);
        this.updateUI();
      }

      this.network.stargates.forEach(gate => {
        if (gate.animProgress < 1) {
          gate.animProgress = Math.min(1, gate.animProgress + dt / 500);
        }
      });

      this.updateDronePaths();
      this.droneManager.update(
        this.network.planets,
        (id) => this.network.getPlanet(id),
        dt
      );
    }

    this.updateParticles(dt);
    this.updateSuccessTrails(dt);
    this.updateFlyingNumbers(dt);

    if (this.isVictoryAnimating) {
      this.victoryTimer += dt;
      if (this.victoryTimer >= 3000 && this.particles.length === 0) {
        this.resetGame();
      }
    }
  }

  private updateDronePaths(): void {
    for (const drone of this.droneManager.drones) {
      if (drone.state === 'toPickup' && drone.currentPathIndex >= drone.path.length) {
        const nextPath = (drone as any).pathToDeliver as string[] | undefined;
        if (nextPath && nextPath.length > 0 && !drone.hasCargo) {
          const startP = this.network.getPlanet(drone.startPlanetId!);
          if (startP && startP.cargoBacklog > 0) {
            startP.cargoBacklog--;
            drone.hasCargo = true;
            drone.path = nextPath;
            drone.currentPathIndex = 1;
            drone.state = 'toDeliver';
          } else if (startP) {
            const returnPath = (drone as any).pathToReturn as string[] | undefined;
            if (returnPath) {
              drone.path = returnPath;
              drone.currentPathIndex = 1;
              drone.state = 'returning';
            }
          }
        }
      } else if (drone.state === 'toDeliver' && drone.currentPathIndex >= drone.path.length) {
        if (drone.hasCargo) {
          const endP = this.network.getPlanet(drone.endPlanetId!);
          if (endP) {
            endP.cargoBacklog = Math.min(endP.cargoBacklog + 1, endP.maxBacklog);
          }
          this.handleCargoDelivered();
          drone.hasCargo = false;
        }
        const returnPath = (drone as any).pathToReturn as string[] | undefined;
        if (returnPath) {
          drone.path = returnPath;
          drone.currentPathIndex = 1;
          drone.state = 'returning';
        }
      } else if (drone.state === 'returning' && drone.currentPathIndex >= drone.path.length) {
        this.droneManager.resetDrone(drone);
      }
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.x += p.vx * (dt / 16.67);
      p.y += p.vy * (dt / 16.67);
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  private updateSuccessTrails(dt: number): void {
    for (const t of this.successTrails) {
      t.life -= dt;
    }
    this.successTrails = this.successTrails.filter(t => t.life > 0);
  }

  private updateFlyingNumbers(dt: number): void {
    for (const f of this.flyingNumbers) {
      f.y -= dt * 0.05;
      f.life -= dt;
    }
    this.flyingNumbers = this.flyingNumbers.filter(f => f.life > 0);
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawStarfield(ctx);
    this.drawRoutes(ctx);
    this.drawSuccessTrails(ctx);
    this.drawPlanets(ctx);
    this.drawStargates(ctx);
    this.drawDrones(ctx);
    this.drawParticles(ctx);
    this.drawFlyingNumbers(ctx);
  }

  private drawStarfield(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#0E0B1A';
    ctx.fillRect(0, 0, this.width, this.height);

    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#0E0B1A');
    grad.addColorStop(1, '#1A1528');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    const seed = 12345;
    for (let i = 0; i < 100; i++) {
      const x = ((seed * (i + 1) * 7919) % this.width);
      const y = ((seed * (i + 1) * 104729) % this.height);
      const r = ((i % 3) === 0) ? 1 : 0.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawRoutes(ctx: CanvasRenderingContext2D): void {
    for (const route of this.network.routes) {
      const from = this.network.getPlanet(route.from);
      const to = this.network.getPlanet(route.to);
      if (!from || !to) continue;

      ctx.strokeStyle = route.hasGate ? '#FFD70066' : '#3A3A5A';
      ctx.lineWidth = route.hasGate ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
  }

  private drawSuccessTrails(ctx: CanvasRenderingContext2D): void {
    for (const trail of this.successTrails) {
      const alpha = trail.life / trail.maxLife;
      ctx.strokeStyle = `rgba(0, 230, 118, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00E676';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let i = 0; i < trail.points.length; i++) {
        const p = trail.points[i];
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  private drawPlanets(ctx: CanvasRenderingContext2D): void {
    for (const planet of this.network.planets) {
      const hovered = this.hoveredPlanet?.id === planet.id;

      const glowRadius = planet.radius * 2.2;
      const glow = ctx.createRadialGradient(
        planet.x, planet.y, planet.radius * 0.5,
        planet.x, planet.y, glowRadius
      );
      glow.addColorStop(0, planet.color + '55');
      glow.addColorStop(1, planet.color + '00');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowColor = planet.color;
      ctx.shadowBlur = hovered ? 20 : 10;
      ctx.fillStyle = planet.color;
      ctx.beginPath();
      ctx.arc(planet.x, planet.y, planet.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.arc(
        planet.x - planet.radius * 0.3,
        planet.y - planet.radius * 0.3,
        planet.radius * 0.4,
        0, Math.PI * 2
      );
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '11px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(planet.name, planet.x, planet.y + planet.radius + 18);
    }
  }

  private drawStargates(ctx: CanvasRenderingContext2D): void {
    for (const gate of this.network.stargates) {
      let gx = gate.x, gy = gate.y;

      if (gate.flyInStart && gate.animProgress < 1) {
        const t = gate.animProgress;
        const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        gx = gate.flyInStart.x + (gate.x - gate.flyInStart.x) * easeT;
        gy = gate.flyInStart.y + (gate.y - gate.flyInStart.y) * easeT;
      }

      if (gate.isCentral) {
        const pulse = (Math.sin(this.gatePulseTime / 1000) + 1) / 2;
        const pulseRadius = 20 + pulse * 15;
        ctx.strokeStyle = `rgba(0, 230, 118, ${0.6 - pulse * 0.4})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(gx, gy, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(0, 230, 118, ${0.3 - pulse * 0.2})`;
        ctx.beginPath();
        ctx.arc(gx, gy, pulseRadius + 10, 0, Math.PI * 2);
        ctx.stroke();
      }

      this.drawOctagram(ctx, gx, gy, gate.isCentral ? '#00E676' : '#FFD700', gate.isCentral ? 20 : 18);
    }
  }

  private drawOctagram(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    color: string,
    outerRadius: number
  ): void {
    const innerRadius = outerRadius * 0.5;

    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.fillStyle = color;
    ctx.beginPath();

    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 - Math.PI / 2;
      const r = (i % 2 === 0) ? outerRadius : innerRadius;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private drawDrones(ctx: CanvasRenderingContext2D): void {
    for (const drone of this.droneManager.drones) {
      if (drone.state === 'idle') continue;

      if (drone.trail.length > 1) {
        ctx.strokeStyle = 'rgba(0, 230, 118, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < drone.trail.length; i++) {
          const t = drone.trail[i];
          if (i === 0) ctx.moveTo(t.x, t.y);
          else ctx.lineTo(t.x, t.y);
        }
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(drone.x, drone.y);
      ctx.rotate(drone.rotation);

      ctx.shadowColor = '#00000040';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      ctx.fillStyle = '#00E676';
      ctx.shadowColor = '#00E676';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-6, -6);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-6, 6);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
      ctx.shadowBlur = 0;

      if (drone.hasCargo) {
        ctx.fillStyle = drone.cargoColor;
        ctx.shadowColor = drone.cargoColor;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(drone.x, drone.y + 8, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  private drawFlyingNumbers(ctx: CanvasRenderingContext2D): void {
    for (const f of this.flyingNumbers) {
      const alpha = f.life / f.maxLife;
      ctx.fillStyle = f.color;
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
