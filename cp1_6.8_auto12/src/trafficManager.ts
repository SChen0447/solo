import * as THREE from 'three';
import { Vehicle, TrafficLight, VehicleType, LightColor } from './types';
import { updateTrafficLightVisual } from './roadNetwork';

const RED_DURATION = 30;
const YELLOW_DURATION = 3;
const GREEN_DURATION = 30;
const BLINK_DURATION = 1;
const SAFE_DISTANCE = 2;
const STOP_LINE_OFFSET = 8;
const MAX_VEHICLES = 50;
const CAR_COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12, 0x9b59b6, 0x1abc9c, 0xe91e63, 0x607d8b, 0x795548, 0x95a5a6];
const BUS_COLORS = [0x2c3e50, 0x27ae60, 0x2980b9, 0x8e44ad, 0xd35400];

const H_ROAD_POSITIONS = [-20, 20];
const V_ROAD_POSITIONS = [-20, 20];
const ROAD_WIDTH = 16;
const LANE_WIDTH = 4;

interface VehicleSpawnInfo {
  roadPosition: number;
  lane: number;
  direction: 'north' | 'south' | 'east' | 'west';
  spawnX: number;
  spawnZ: number;
  roadType: 'horizontal' | 'vertical';
}

export class TrafficManager {
  private scene: THREE.Scene;
  private vehicles: Vehicle[] = [];
  private trafficLights: TrafficLight[] = [];
  private nextVehicleId = 0;
  private spawnTimer = 0;
  private spawnInterval = 1.5;
  private horizontalLightState: LightColor = 'green';
  private verticalLightState: LightColor = 'red';
  private horizontalTimer = GREEN_DURATION;
  private verticalTimer = RED_DURATION;
  private manualMode = false;
  private yellowBlinkTimer = 0;
  private blinkVisible = true;
  private totalWaitTime = 0;
  private waitingVehicles = 0;
  private statsUpdateTimer = 0;
  private currentAvgWait = 0;
  private currentVehicleCount = 0;

  constructor(scene: THREE.Scene, trafficLights: TrafficLight[]) {
    this.scene = scene;
    this.trafficLights = trafficLights;
    this.initializeLights();
  }

  private initializeLights(): void {
    for (const light of this.trafficLights) {
      if (light.direction === 'horizontal') {
        light.currentColor = this.horizontalLightState;
      } else {
        light.currentColor = this.verticalLightState;
      }
      updateTrafficLightVisual(light);
    }
  }

  public update(deltaTime: number): void {
    this.updateTrafficLights(deltaTime);
    this.updateVehicles(deltaTime);
    this.spawnVehicles(deltaTime);
    this.updateStats(deltaTime);
  }

  private updateTrafficLights(deltaTime: number): void {
    if (this.manualMode) {
      return;
    }

    this.horizontalTimer -= deltaTime;
    this.verticalTimer -= deltaTime;
    this.yellowBlinkTimer -= deltaTime;

    if (this.yellowBlinkTimer <= 0) {
      this.blinkVisible = !this.blinkVisible;
      this.yellowBlinkTimer = 0.5;
    }

    if (this.horizontalLightState === 'green' && this.horizontalTimer <= 0) {
      this.horizontalLightState = 'yellow';
      this.horizontalTimer = YELLOW_DURATION;
      this.yellowBlinkTimer = BLINK_DURATION;
      this.blinkVisible = true;
    } else if (this.horizontalLightState === 'yellow' && this.horizontalTimer <= 0) {
      this.horizontalLightState = 'red';
      this.horizontalTimer = RED_DURATION;
      this.verticalLightState = 'green';
      this.verticalTimer = GREEN_DURATION;
    } else if (this.verticalLightState === 'green' && this.verticalTimer <= 0) {
      this.verticalLightState = 'yellow';
      this.verticalTimer = YELLOW_DURATION;
      this.yellowBlinkTimer = BLINK_DURATION;
      this.blinkVisible = true;
    } else if (this.verticalLightState === 'yellow' && this.verticalTimer <= 0) {
      this.verticalLightState = 'red';
      this.verticalTimer = RED_DURATION;
      this.horizontalLightState = 'green';
      this.horizontalTimer = GREEN_DURATION;
    }

    for (const light of this.trafficLights) {
      if (light.direction === 'horizontal') {
        if (this.horizontalLightState === 'yellow' && this.horizontalTimer <= BLINK_DURATION) {
          light.currentColor = this.blinkVisible ? 'yellow' : ('red' as LightColor);
        } else {
          light.currentColor = this.horizontalLightState;
        }
      } else {
        if (this.verticalLightState === 'yellow' && this.verticalTimer <= BLINK_DURATION) {
          light.currentColor = this.blinkVisible ? 'yellow' : ('red' as LightColor);
        } else {
          light.currentColor = this.verticalLightState;
        }
      }
      updateTrafficLightVisual(light);
    }
  }

  private updateVehicles(deltaTime: number): void {
    this.totalWaitTime = 0;
    this.waitingVehicles = 0;

    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      const vehicle = this.vehicles[i];
      this.updateVehicle(vehicle, deltaTime);

      if (vehicle.isWaiting) {
        this.totalWaitTime += vehicle.waitTime;
        this.waitingVehicles++;
      }

      if (this.isVehicleOutOfBounds(vehicle)) {
        this.removeVehicle(vehicle, i);
      }
    }
  }

  private updateVehicle(vehicle: Vehicle, deltaTime: number): void {
    const targetVelocity = this.calculateTargetVelocity(vehicle);

    if (targetVelocity < vehicle.velocity) {
      vehicle.velocity = Math.max(0, vehicle.velocity - vehicle.acceleration * 2 * deltaTime);
    } else {
      vehicle.velocity = Math.min(vehicle.maxVelocity, vehicle.velocity + vehicle.acceleration * deltaTime);
    }

    const isStopping = vehicle.velocity < 0.5 && targetVelocity === 0;
    vehicle.stopState = isStopping;

    if (isStopping) {
      vehicle.brakeLightDuration = Math.min(1, vehicle.brakeLightDuration + deltaTime);
      vehicle.isWaiting = true;
      vehicle.waitTime += deltaTime;
    } else {
      vehicle.brakeLightDuration = Math.max(0, vehicle.brakeLightDuration - deltaTime * 2);
      if (vehicle.velocity > 0.5) {
        vehicle.isWaiting = false;
      }
    }

    this.updateBrakeLights(vehicle);

    const moveDistance = vehicle.velocity * deltaTime;
    switch (vehicle.direction) {
      case 'east':
        vehicle.position.x += moveDistance;
        break;
      case 'west':
        vehicle.position.x -= moveDistance;
        break;
      case 'north':
        vehicle.position.z += moveDistance;
        break;
      case 'south':
        vehicle.position.z -= moveDistance;
        break;
    }

    vehicle.mesh.position.copy(vehicle.position);
  }

  private calculateTargetVelocity(vehicle: Vehicle): number {
    const vehicleAhead = this.findVehicleAhead(vehicle);
    const distanceToAhead = vehicleAhead ? this.getDistanceBetween(vehicle, vehicleAhead) : Infinity;

    if (distanceToAhead < SAFE_DISTANCE) {
      return 0;
    }

    const lightStopDistance = this.getDistanceToRedLight(vehicle);
    if (lightStopDistance !== null && lightStopDistance < SAFE_DISTANCE + 2) {
      return 0;
    }

    if (distanceToAhead < SAFE_DISTANCE * 3) {
      const ratio = (distanceToAhead - SAFE_DISTANCE) / (SAFE_DISTANCE * 2);
      return vehicle.maxVelocity * Math.max(0.3, ratio);
    }

    if (lightStopDistance !== null && lightStopDistance < 15) {
      const ratio = (lightStopDistance - SAFE_DISTANCE) / 10;
      return vehicle.maxVelocity * Math.max(0.2, ratio);
    }

    return vehicle.maxVelocity;
  }

  private findVehicleAhead(vehicle: Vehicle): Vehicle | null {
    let closest: Vehicle | null = null;
    let closestDistance = Infinity;

    for (const other of this.vehicles) {
      if (other.id === vehicle.id) continue;
      if (other.direction !== vehicle.direction) continue;

      const sameRoad = this.isSameRoad(vehicle, other);
      if (!sameRoad) continue;

      const distance = this.getDistanceBetween(vehicle, other);
      if (distance > 0 && distance < closestDistance) {
        closestDistance = distance;
        closest = other;
      }
    }

    return closest;
  }

  private isSameRoad(v1: Vehicle, v2: Vehicle): boolean {
    if (v1.direction === 'east' || v1.direction === 'west') {
      return Math.abs(v1.position.z - v2.position.z) < LANE_WIDTH * 0.5;
    } else {
      return Math.abs(v1.position.x - v2.position.x) < LANE_WIDTH * 0.5;
    }
  }

  private getDistanceBetween(v1: Vehicle, v2: Vehicle): number {
    switch (v1.direction) {
      case 'east':
        return v2.position.x - v1.position.x;
      case 'west':
        return v1.position.x - v2.position.x;
      case 'north':
        return v2.position.z - v1.position.z;
      case 'south':
        return v1.position.z - v2.position.z;
    }
  }

  private getDistanceToRedLight(vehicle: Vehicle): number | null {
    const roadType = (vehicle.direction === 'east' || vehicle.direction === 'west') ? 'horizontal' : 'vertical';
    const lightState = roadType === 'horizontal' ? this.horizontalLightState : this.verticalLightState;

    if (lightState === 'green') {
      return null;
    }

    if (lightState === 'yellow') {
      const timer = roadType === 'horizontal' ? this.horizontalTimer : this.verticalTimer;
      if (timer > BLINK_DURATION) {
        return null;
      }
    }

    const intersections = this.getIntersectionsAhead(vehicle);
    if (intersections.length === 0) return null;

    let minDistance = Infinity;
    for (const intersection of intersections) {
      const dist = this.getDistanceToIntersection(vehicle, intersection);
      if (dist > 0 && dist < minDistance) {
        minDistance = dist;
      }
    }

    return minDistance === Infinity ? null : minDistance - STOP_LINE_OFFSET;
  }

  private getIntersectionsAhead(vehicle: Vehicle): { x: number; z: number }[] {
    const intersections: { x: number; z: number }[] = [];

    if (vehicle.direction === 'east' || vehicle.direction === 'west') {
      for (const vx of V_ROAD_POSITIONS) {
        if (vehicle.direction === 'east' && vx > vehicle.position.x) {
          intersections.push({ x: vx, z: vehicle.position.z });
        } else if (vehicle.direction === 'west' && vx < vehicle.position.x) {
          intersections.push({ x: vx, z: vehicle.position.z });
        }
      }
    } else {
      for (const hz of H_ROAD_POSITIONS) {
        if (vehicle.direction === 'north' && hz > vehicle.position.z) {
          intersections.push({ x: vehicle.position.x, z: hz });
        } else if (vehicle.direction === 'south' && hz < vehicle.position.z) {
          intersections.push({ x: vehicle.position.x, z: hz });
        }
      }
    }

    return intersections;
  }

  private getDistanceToIntersection(vehicle: Vehicle, intersection: { x: number; z: number }): number {
    switch (vehicle.direction) {
      case 'east':
        return intersection.x - vehicle.position.x;
      case 'west':
        return vehicle.position.x - intersection.x;
      case 'north':
        return intersection.z - vehicle.position.z;
      case 'south':
        return vehicle.position.z - intersection.z;
    }
  }

  private updateBrakeLights(vehicle: Vehicle): void {
    const brakeIntensity = vehicle.brakeLightDuration;
    
    const tailLights = vehicle.mesh.getObjectByName('brakeLights');
    if (tailLights) {
      (tailLights as THREE.Mesh).visible = brakeIntensity > 0.3;
    }
  }

  private isVehicleOutOfBounds(vehicle: Vehicle): boolean {
    const bound = 50;
    return (
      vehicle.position.x > bound ||
      vehicle.position.x < -bound ||
      vehicle.position.z > bound ||
      vehicle.position.z < -bound
    );
  }

  private removeVehicle(vehicle: Vehicle, index: number): void {
    this.scene.remove(vehicle.mesh);
    this.vehicles.splice(index, 1);
  }

  private spawnVehicles(deltaTime: number): void {
    if (this.vehicles.length >= MAX_VEHICLES) return;

    this.spawnTimer += deltaTime;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnInterval = 1 + Math.random() * 2;
      this.spawnVehicle();
    }
  }

  private spawnVehicle(): void {
    if (this.vehicles.length >= MAX_VEHICLES) return;

    const spawnInfos = this.getSpawnInfos();
    const availableSpawns = spawnInfos.filter(info => this.canSpawnAt(info));

    if (availableSpawns.length === 0) return;

    const spawnInfo = availableSpawns[Math.floor(Math.random() * availableSpawns.length)];
    const vehicleType: VehicleType = Math.random() < 0.7 ? 'car' : 'bus';

    const position = new THREE.Vector3(spawnInfo.spawnX, 0, spawnInfo.spawnZ);
    const mesh = this.createVehicleMesh(vehicleType, spawnInfo.direction);
    mesh.position.copy(position);

    const color = vehicleType === 'car'
      ? CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]
      : BUS_COLORS[Math.floor(Math.random() * BUS_COLORS.length)];

    const bodyMesh = mesh.getObjectByName('body') as THREE.Mesh;
    if (bodyMesh) {
      (bodyMesh.material as THREE.MeshStandardMaterial).color.setHex(color);
    }

    const baseVelocity = 0.5 + Math.random() * 1.0;

    const vehicle: Vehicle = {
      id: this.nextVehicleId++,
      type: vehicleType,
      position,
      velocity: baseVelocity,
      maxVelocity: baseVelocity,
      color,
      lane: spawnInfo.lane,
      direction: spawnInfo.direction,
      mesh,
      stopState: false,
      brakeLightDuration: 0,
      waitTime: 0,
      isWaiting: false,
      acceleration: 2
    };

    this.scene.add(mesh);
    this.vehicles.push(vehicle);
  }

  private getSpawnInfos(): VehicleSpawnInfo[] {
    const infos: VehicleSpawnInfo[] = [];

    for (const zPos of H_ROAD_POSITIONS) {
      for (let lane = 0; lane < 2; lane++) {
        const laneOffset = -ROAD_WIDTH / 2 + LANE_WIDTH / 2 + lane * LANE_WIDTH;
        infos.push({
          roadPosition: zPos,
          lane,
          direction: 'east',
          spawnX: -45,
          spawnZ: zPos + laneOffset,
          roadType: 'horizontal'
        });
      }
      for (let lane = 0; lane < 2; lane++) {
        const laneOffset = ROAD_WIDTH / 2 - LANE_WIDTH / 2 - lane * LANE_WIDTH;
        infos.push({
          roadPosition: zPos,
          lane: lane + 2,
          direction: 'west',
          spawnX: 45,
          spawnZ: zPos + laneOffset,
          roadType: 'horizontal'
        });
      }
    }

    for (const xPos of V_ROAD_POSITIONS) {
      for (let lane = 0; lane < 2; lane++) {
        const laneOffset = ROAD_WIDTH / 2 - LANE_WIDTH / 2 - lane * LANE_WIDTH;
        infos.push({
          roadPosition: xPos,
          lane,
          direction: 'north',
          spawnX: xPos + laneOffset,
          spawnZ: -45,
          roadType: 'vertical'
        });
      }
      for (let lane = 0; lane < 2; lane++) {
        const laneOffset = -ROAD_WIDTH / 2 + LANE_WIDTH / 2 + lane * LANE_WIDTH;
        infos.push({
          roadPosition: xPos,
          lane: lane + 2,
          direction: 'south',
          spawnX: xPos + laneOffset,
          spawnZ: 45,
          roadType: 'vertical'
        });
      }
    }

    return infos;
  }

  private canSpawnAt(info: VehicleSpawnInfo): boolean {
    const spawnPoint = new THREE.Vector3(info.spawnX, 0, info.spawnZ);
    
    for (const vehicle of this.vehicles) {
      if (vehicle.direction !== info.direction) continue;
      
      let distance: number;
      if (info.roadType === 'horizontal') {
        if (Math.abs(vehicle.position.z - info.spawnZ) > LANE_WIDTH * 0.3) continue;
        distance = info.direction === 'east'
          ? vehicle.position.x - info.spawnX
          : info.spawnX - vehicle.position.x;
      } else {
        if (Math.abs(vehicle.position.x - info.spawnX) > LANE_WIDTH * 0.3) continue;
        distance = info.direction === 'north'
          ? vehicle.position.z - info.spawnZ
          : info.spawnZ - vehicle.position.z;
      }
      
      if (distance > 0 && distance < SAFE_DISTANCE * 3) {
        return false;
      }
    }
    
    return true;
  }

  private createVehicleMesh(type: VehicleType, direction: string): THREE.Group {
    const group = new THREE.Group();

    const isCar = type === 'car';
    const bodyWidth = isCar ? 1.2 : 1.8;
    const bodyHeight = isCar ? 0.6 : 1.2;
    const bodyLength = isCar ? 2.5 : 5;
    const wheelRadius = isCar ? 0.3 : 0.45;
    const wheelWidth = isCar ? 0.2 : 0.35;

    const bodyGeometry = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyLength);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.6,
      roughness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.name = 'body';
    body.position.y = bodyHeight / 2 + wheelRadius;
    body.castShadow = true;
    group.add(body);

    const cabinHeight = isCar ? 0.45 : 0.7;
    const cabinWidth = isCar ? bodyWidth * 0.8 : bodyWidth * 0.9;
    const cabinLength = isCar ? bodyLength * 0.5 : bodyLength * 0.7;
    const cabinGeometry = new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinLength);
    const cabinMaterial = new THREE.MeshStandardMaterial({
      color: 0x222233,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.7
    });
    const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);
    cabin.position.y = bodyHeight + wheelRadius + cabinHeight / 2 - 0.1;
    cabin.position.z = isCar ? 0.1 : 0;
    cabin.castShadow = true;
    group.add(cabin);

    const wheelGeometry = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 16);
    wheelGeometry.rotateZ(Math.PI / 2);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });

    const wheelPositions = [
      { x: bodyWidth / 2 - wheelWidth / 2, z: bodyLength / 3 },
      { x: -bodyWidth / 2 + wheelWidth / 2, z: bodyLength / 3 },
      { x: bodyWidth / 2 - wheelWidth / 2, z: -bodyLength / 3 },
      { x: -bodyWidth / 2 + wheelWidth / 2, z: -bodyLength / 3 }
    ];

    for (const pos of wheelPositions) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.position.set(pos.x, wheelRadius, pos.z);
      group.add(wheel);
    }

    const brakeLightGeometry = new THREE.BoxGeometry(bodyWidth * 0.6, 0.15, 0.1);
    const brakeLightMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.8
    });
    const brakeLights = new THREE.Mesh(brakeLightGeometry, brakeLightMaterial);
    brakeLights.name = 'brakeLights';
    brakeLights.position.set(0, bodyHeight / 2 + wheelRadius, -bodyLength / 2 + 0.05);
    brakeLights.visible = false;
    group.add(brakeLights);

    const headlightGeometry = new THREE.BoxGeometry(bodyWidth * 0.5, 0.12, 0.08);
    const headlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    const headlights = new THREE.Mesh(headlightGeometry, headlightMaterial);
    headlights.position.set(0, bodyHeight / 2 + wheelRadius, bodyLength / 2 - 0.04);
    group.add(headlights);

    if (!isCar) {
      const busWindowMat = new THREE.MeshStandardMaterial({
        color: 0x334455,
        metalness: 0.7,
        roughness: 0.2,
        transparent: true,
        opacity: 0.6
      });
      for (let i = 0; i < 4; i++) {
        const windowGeometry = new THREE.BoxGeometry(cabinWidth * 0.9, cabinHeight * 0.6, 0.05);
        const windowMesh = new THREE.Mesh(windowGeometry, busWindowMat);
        windowMesh.position.set(
          0,
          bodyHeight + wheelRadius + cabinHeight / 2 - 0.1,
          -bodyLength * 0.3 + i * (bodyLength * 0.2)
        );
        group.add(windowMesh);
      }
    }

    let rotationY = 0;
    switch (direction) {
      case 'north':
        rotationY = Math.PI / 2;
        break;
      case 'south':
        rotationY = -Math.PI / 2;
        break;
      case 'west':
        rotationY = Math.PI;
        break;
      case 'east':
        rotationY = 0;
        break;
    }
    group.rotation.y = rotationY;

    return group;
  }

  public toggleSignal(lightId?: number): void {
    if (lightId !== undefined) {
      const light = this.trafficLights.find(l => l.id === lightId);
      if (light) {
        light.manualMode = !light.manualMode;
        this.manualMode = this.trafficLights.some(l => l.manualMode);
        
        if (light.manualMode) {
          const nextColor: LightColor = light.currentColor === 'red' ? 'green' : light.currentColor === 'green' ? 'red' : 'green';
          light.currentColor = nextColor;
          updateTrafficLightVisual(light);
          
          const sameDirLights = this.trafficLights.filter(l => l.direction === light.direction);
          for (const dl of sameDirLights) {
            dl.manualMode = true;
            dl.currentColor = nextColor;
            updateTrafficLightVisual(dl);
          }
          
          const oppDirLights = this.trafficLights.filter(l => l.direction !== light.direction);
          const oppColor: LightColor = nextColor === 'green' ? 'red' : 'green';
          for (const dl of oppDirLights) {
            dl.manualMode = true;
            dl.currentColor = oppColor;
            updateTrafficLightVisual(dl);
          }
          
          if (light.direction === 'horizontal') {
            this.horizontalLightState = nextColor;
            this.verticalLightState = oppColor;
          } else {
            this.verticalLightState = nextColor;
            this.horizontalLightState = oppColor;
          }
        } else {
          for (const dl of this.trafficLights) {
            dl.manualMode = false;
          }
          this.manualMode = false;
          this.horizontalTimer = this.horizontalLightState === 'green' ? GREEN_DURATION : this.horizontalLightState === 'yellow' ? YELLOW_DURATION : RED_DURATION;
          this.verticalTimer = this.verticalLightState === 'green' ? GREEN_DURATION : this.verticalLightState === 'yellow' ? YELLOW_DURATION : RED_DURATION;
        }
      }
    } else {
      this.manualMode = !this.manualMode;
      for (const light of this.trafficLights) {
        light.manualMode = this.manualMode;
      }
      
      if (!this.manualMode) {
        this.horizontalTimer = this.horizontalLightState === 'green' ? GREEN_DURATION : this.horizontalLightState === 'yellow' ? YELLOW_DURATION : RED_DURATION;
        this.verticalTimer = this.verticalLightState === 'green' ? GREEN_DURATION : this.verticalLightState === 'yellow' ? YELLOW_DURATION : RED_DURATION;
      }
    }
  }

  public reset(): void {
    for (let i = this.vehicles.length - 1; i >= 0; i--) {
      this.scene.remove(this.vehicles[i].mesh);
    }
    this.vehicles = [];
    this.nextVehicleId = 0;
    this.spawnTimer = 0;

    this.horizontalLightState = 'green';
    this.verticalLightState = 'red';
    this.horizontalTimer = GREEN_DURATION;
    this.verticalTimer = RED_DURATION;
    this.manualMode = false;
    this.blinkVisible = true;
    this.yellowBlinkTimer = 0;

    for (const light of this.trafficLights) {
      light.manualMode = false;
      if (light.direction === 'horizontal') {
        light.currentColor = 'green';
      } else {
        light.currentColor = 'red';
      }
      updateTrafficLightVisual(light);
    }
  }

  private updateStats(deltaTime: number): void {
    this.statsUpdateTimer += deltaTime;
    if (this.statsUpdateTimer >= 1) {
      this.statsUpdateTimer = 0;
      this.currentVehicleCount = this.vehicles.length;
      this.currentAvgWait = this.waitingVehicles > 0
        ? this.totalWaitTime / this.waitingVehicles
        : 0;
    }
  }

  public getVehicleCount(): number {
    return this.currentVehicleCount;
  }

  public getAvgWaitTime(): number {
    return this.currentAvgWait;
  }

  public isManualMode(): boolean {
    return this.manualMode;
  }

  public getHorizontalLightState(): LightColor {
    return this.horizontalLightState;
  }

  public getVerticalLightState(): LightColor {
    return this.verticalLightState;
  }

  public getTrafficLights(): TrafficLight[] {
    return this.trafficLights;
  }

  public getCongestionLevel(): number {
    return Math.min(1, this.vehicles.length / MAX_VEHICLES);
  }
}
