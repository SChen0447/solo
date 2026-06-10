import * as THREE from 'three';
import { TrafficLightSystem, Direction, LightState } from './TrafficLight';

type VehicleColor = 0xff3333 | 0x3366ff | 0xffffff | 0xffcc00;
const VEHICLE_COLORS: VehicleColor[] = [0xff3333, 0x3366ff, 0xffffff, 0xffcc00];

type MovementPhase = 'approach' | 'waiting' | 'crossing' | 'turning' | 'exiting' | 'repositioning';
type TurnType = 'straight' | 'right';

interface Particle {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  velocity: THREE.Vector3;
  initialSize: number;
}

export class Vehicle {
  public group: THREE.Group;
  public mesh: THREE.Mesh;
  public color: VehicleColor;
  public currentSpeed: number = 0.5;
  public readonly maxSpeed: number = 0.5;
  public id: number;

  private spawnDirection: Direction;
  private turnType: TurnType;
  private movementPhase: MovementPhase;
  private positionOnPath: number = 0;
  private particles: Particle[] = [];
  private particleTimer: number = 0;
  private lightSystem: TrafficLightSystem;
  private scene: THREE.Scene;

  private readonly vehicleLength = 2;
  private readonly vehicleWidth = 1;
  private readonly vehicleHeight = 0.6;
  private readonly acceleration = 1.5;
  private readonly deceleration = 3.0;
  private readonly turnRadius = 2.5;
  private readonly stopLineDistance = 4;

  constructor(
    id: number,
    spawnDirection: Direction,
    turnType: TurnType,
    lightSystem: TrafficLightSystem,
    scene: THREE.Scene
  ) {
    this.id = id;
    this.spawnDirection = spawnDirection;
    this.turnType = turnType;
    this.lightSystem = lightSystem;
    this.scene = scene;
    this.color = VEHICLE_COLORS[Math.floor(Math.random() * VEHICLE_COLORS.length)];
    this.movementPhase = 'approach';
    this.group = new THREE.Group();
    this.mesh = this.createVehicleMesh();
    this.group.add(this.mesh);
    this.setInitialPosition();
  }

  private createVehicleMesh(): THREE.Mesh {
    const container = new THREE.Group();

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      roughness: 0.3,
      metalness: 0.6,
    });
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(this.vehicleLength, this.vehicleHeight * 0.6, this.vehicleWidth),
      bodyMaterial
    );
    body.position.y = this.vehicleHeight * 0.3;
    body.castShadow = true;
    container.add(body);

    const cabinMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.7,
    });
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(this.vehicleLength * 0.6, this.vehicleHeight * 0.5, this.vehicleWidth * 0.85),
      cabinMaterial
    );
    cabin.position.set(-this.vehicleLength * 0.05, this.vehicleHeight * 0.65, 0);
    cabin.castShadow = true;
    container.add(cabin);

    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.9,
    });
    const wheelPositions = [
      [-this.vehicleLength * 0.35, 0.15, this.vehicleWidth * 0.5],
      [-this.vehicleLength * 0.35, 0.15, -this.vehicleWidth * 0.5],
      [this.vehicleLength * 0.35, 0.15, this.vehicleWidth * 0.5],
      [this.vehicleLength * 0.35, 0.15, -this.vehicleWidth * 0.5],
    ];
    wheelPositions.forEach((pos) => {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.12, 16),
        wheelMaterial
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos[0], pos[1], pos[2]);
      wheel.castShadow = true;
      container.add(wheel);
    });

    const wrapper = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), new THREE.MeshBasicMaterial({ visible: false }));
    wrapper.add(container);
    return wrapper;
  }

  private setInitialPosition(): void {
    const laneOffset = this.turnType === 'right' ? 0.75 : -0.75;
    const spawnDistance = 10 + Math.random() * 4;

    switch (this.spawnDirection) {
      case 'south':
        this.group.position.set(laneOffset, 0.2, spawnDistance);
        this.group.rotation.y = Math.PI;
        this.positionOnPath = spawnDistance;
        break;
      case 'north':
        this.group.position.set(-laneOffset, 0.2, -spawnDistance);
        this.group.rotation.y = 0;
        this.positionOnPath = spawnDistance;
        break;
      case 'east':
        this.group.position.set(spawnDistance, 0.2, laneOffset);
        this.group.rotation.y = -Math.PI / 2;
        this.positionOnPath = spawnDistance;
        break;
      case 'west':
        this.group.position.set(-spawnDistance, 0.2, -laneOffset);
        this.group.rotation.y = Math.PI / 2;
        this.positionOnPath = spawnDistance;
        break;
    }
  }

  public update(deltaTime: number, vehicles: Vehicle[]): void {
    this.updateMovement(deltaTime, vehicles);
    this.updateParticles(deltaTime);
    this.emitParticles(deltaTime);
  }

  private updateMovement(deltaTime: number, vehicles: Vehicle[]): void {
    const shouldStop = this.shouldStopForLight() || this.shouldStopForVehicle(vehicles);

    if (shouldStop && this.movementPhase === 'approach') {
      this.currentSpeed = Math.max(0, this.currentSpeed - this.deceleration * deltaTime);
      if (this.currentSpeed <= 0.01) {
        this.currentSpeed = 0;
        this.movementPhase = 'waiting';
      }
    } else if (this.movementPhase === 'waiting' && !this.shouldStopForLight()) {
      this.movementPhase = 'crossing';
    } else if (this.movementPhase === 'waiting') {
      this.currentSpeed = 0;
    } else {
      this.currentSpeed = Math.min(this.maxSpeed, this.currentSpeed + this.acceleration * deltaTime);
    }

    if (this.currentSpeed > 0.01) {
      this.moveAlongPath(deltaTime);
    }
  }

  private shouldStopForLight(): boolean {
    const state = this.getAffectedLightState();
    const stopZone = this.stopLineDistance + this.vehicleLength * 0.5;

    if (this.movementPhase !== 'approach') return false;
    if (this.positionOnPath > stopZone + 0.5) return false;
    if (this.positionOnPath < stopZone - 1) return false;

    return state === 'red' || state === 'yellow';
  }

  private getAffectedLightState(): LightState {
    const isNS = this.spawnDirection === 'north' || this.spawnDirection === 'south';
    return isNS ? this.lightSystem.getNSState() : this.lightSystem.getEWState();
  }

  private shouldStopForVehicle(vehicles: Vehicle[]): boolean {
    const minGap = 3;
    for (const other of vehicles) {
      if (other.id === this.id) continue;
      if (other.spawnDirection !== this.spawnDirection) continue;
      if (other.turnType !== this.turnType) continue;

      const dx = this.group.position.x - other.group.position.x;
      const dz = this.group.position.z - other.group.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      const direction = this.getForwardVector();
      const toOther = new THREE.Vector3(dx, 0, dz).normalize();
      const dot = direction.dot(toOther);

      if (dot > 0.7 && dist < minGap && dist > 0.1) {
        return true;
      }
    }
    return false;
  }

  private getForwardVector(): THREE.Vector3 {
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.group.quaternion);
    return forward.normalize();
  }

  private moveAlongPath(deltaTime: number): void {
    const moveDistance = this.currentSpeed * deltaTime;
    this.positionOnPath -= moveDistance;

    const laneOffset = this.turnType === 'right' ? 0.75 : -0.75;

    if (this.movementPhase === 'approach' || this.movementPhase === 'waiting') {
      this.moveApproach(moveDistance, laneOffset);
      if (this.positionOnPath <= this.stopLineDistance && !this.shouldStopForLight()) {
        this.movementPhase = this.turnType === 'right' ? 'turning' : 'crossing';
      }
    } else if (this.movementPhase === 'crossing') {
      this.moveCrossing(moveDistance, laneOffset);
      if (this.positionOnPath <= -this.stopLineDistance) {
        this.movementPhase = 'exiting';
      }
    } else if (this.movementPhase === 'turning') {
      this.moveTurning(moveDistance, laneOffset);
    } else if (this.movementPhase === 'exiting') {
      this.moveExiting(moveDistance, laneOffset);
      if (this.positionOnPath <= -12) {
        this.movementPhase = 'repositioning';
      }
    } else if (this.movementPhase === 'repositioning') {
      this.reposition();
    }
  }

  private moveApproach(distance: number, laneOffset: number): void {
    switch (this.spawnDirection) {
      case 'south':
        this.group.position.z -= distance;
        this.group.position.x += (laneOffset - this.group.position.x) * 0.05;
        break;
      case 'north':
        this.group.position.z += distance;
        this.group.position.x += (-laneOffset - this.group.position.x) * 0.05;
        break;
      case 'east':
        this.group.position.x -= distance;
        this.group.position.z += (laneOffset - this.group.position.z) * 0.05;
        break;
      case 'west':
        this.group.position.x += distance;
        this.group.position.z += (-laneOffset - this.group.position.z) * 0.05;
        break;
    }
  }

  private moveCrossing(distance: number, laneOffset: number): void {
    this.moveApproach(distance, laneOffset);
  }

  private moveTurning(_distance: number, laneOffset: number): void {
    const turnProgress = 1 - (this.positionOnPath + this.stopLineDistance) / (this.turnRadius * Math.PI / 2 + 2);
    const clampedProgress = Math.max(0, Math.min(1, turnProgress));
    const angle = clampedProgress * Math.PI / 2;
    const r = this.turnRadius;

    let centerX = 0, centerZ = 0, startAngle = 0, turnDir = 1;

    switch (this.spawnDirection) {
      case 'south':
        centerX = laneOffset + r;
        centerZ = -r;
        startAngle = Math.PI / 2;
        turnDir = -1;
        break;
      case 'north':
        centerX = -laneOffset - r;
        centerZ = r;
        startAngle = -Math.PI / 2;
        turnDir = -1;
        break;
      case 'east':
        centerX = r;
        centerZ = laneOffset + r;
        startAngle = Math.PI;
        turnDir = -1;
        break;
      case 'west':
        centerX = -r;
        centerZ = -laneOffset - r;
        startAngle = 0;
        turnDir = -1;
        break;
    }

    const currentAngle = startAngle + turnDir * angle;
    this.group.position.x = centerX + r * Math.cos(currentAngle);
    this.group.position.z = centerZ + r * Math.sin(currentAngle);

    let baseRotation = 0;
    switch (this.spawnDirection) {
      case 'south': baseRotation = Math.PI; break;
      case 'north': baseRotation = 0; break;
      case 'east': baseRotation = -Math.PI / 2; break;
      case 'west': baseRotation = Math.PI / 2; break;
    }
    this.group.rotation.y = baseRotation + turnDir * angle;

    if (clampedProgress >= 1) {
      this.movementPhase = 'exiting';
      this.positionOnPath = -this.stopLineDistance - 0.1;
    }
  }

  private moveExiting(distance: number, laneOffset: number): void {
    let exitDirection: Direction;
    if (this.turnType === 'straight') {
      exitDirection = this.spawnDirection;
    } else {
      const turnMap: Record<Direction, Direction> = {
        south: 'west',
        north: 'east',
        east: 'south',
        west: 'north',
      };
      exitDirection = turnMap[this.spawnDirection];
    }

    switch (exitDirection) {
      case 'south':
        this.group.position.z += distance;
        this.group.rotation.y = 0;
        this.group.position.x += (-laneOffset - this.group.position.x) * 0.05;
        break;
      case 'north':
        this.group.position.z -= distance;
        this.group.rotation.y = Math.PI;
        this.group.position.x += (laneOffset - this.group.position.x) * 0.05;
        break;
      case 'east':
        this.group.position.x += distance;
        this.group.rotation.y = -Math.PI / 2;
        this.group.position.z += (laneOffset - this.group.position.z) * 0.05;
        break;
      case 'west':
        this.group.position.x -= distance;
        this.group.rotation.y = Math.PI / 2;
        this.group.position.z += (-laneOffset - this.group.position.z) * 0.05;
        break;
    }
  }

  private reposition(): void {
    this.movementPhase = 'approach';
    this.currentSpeed = this.maxSpeed;
    this.setInitialPosition();
  }

  private emitParticles(deltaTime: number): void {
    if (this.currentSpeed < 0.05) return;

    this.particleTimer += deltaTime;
    if (this.particleTimer >= 0.03) {
      this.particleTimer = 0;
      this.spawnParticle();
    }
  }

  private spawnParticle(): void {
    const size = 0.1;
    const material = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.8,
    });
    const geometry = new THREE.SphereGeometry(size, 6, 6);
    const mesh = new THREE.Mesh(geometry, material);

    const rearOffset = this.getForwardVector().multiplyScalar(this.vehicleLength * 0.4);
    mesh.position.copy(this.group.position).add(rearOffset);
    mesh.position.y = 0.15;

    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      Math.random() * 0.5,
      (Math.random() - 0.5) * 0.3
    );

    this.scene.add(mesh);
    this.particles.push({
      mesh,
      life: 0.5,
      maxLife: 0.5,
      velocity,
      initialSize: size,
    });
  }

  private updateParticles(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }

      p.mesh.position.add(p.velocity.clone().multiplyScalar(deltaTime));
      p.velocity.y -= deltaTime * 0.5;

      const lifeRatio = p.life / p.maxLife;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = lifeRatio * 0.8;
      const scale = Math.max(0.01, lifeRatio);
      p.mesh.scale.setScalar(scale);
    }
  }

  public getSpeed(): number {
    return this.currentSpeed;
  }

  public addToScene(scene: THREE.Scene): void {
    scene.add(this.group);
  }

  public dispose(): void {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    this.particles = [];
  }
}

export class VehicleManager {
  public vehicles: Vehicle[] = [];
  private scene: THREE.Scene;
  private lightSystem: TrafficLightSystem;

  constructor(scene: THREE.Scene, lightSystem: TrafficLightSystem) {
    this.scene = scene;
    this.lightSystem = lightSystem;
    this.spawnVehicles();
  }

  private spawnVehicles(): void {
    const directions: Direction[] = ['north', 'south', 'east', 'west'];
    const turnTypes: TurnType[] = ['straight', 'straight', 'straight', 'right'];

    for (let i = 0; i < 6; i++) {
      const direction = directions[Math.floor(Math.random() * directions.length)];
      const turnType = turnTypes[Math.floor(Math.random() * turnTypes.length)];
      const vehicle = new Vehicle(i + 1, direction, turnType, this.lightSystem, this.scene);
      this.vehicles.push(vehicle);
      vehicle.addToScene(this.scene);
    }
  }

  public update(deltaTime: number): void {
    for (const vehicle of this.vehicles) {
      vehicle.update(deltaTime, this.vehicles);
    }
  }

  public getVehicleCount(): number {
    return this.vehicles.length;
  }

  public getVehicleSpeeds(): { id: number; speed: number }[] {
    return this.vehicles.map((v) => ({ id: v.id, speed: v.getSpeed() }));
  }

  public dispose(): void {
    for (const vehicle of this.vehicles) {
      vehicle.dispose();
      this.scene.remove(vehicle.group);
    }
    this.vehicles = [];
  }
}
