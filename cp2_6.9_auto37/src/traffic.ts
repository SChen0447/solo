import * as THREE from 'three';
import { RoadSegment, Intersection, getTrafficLightStateForDirection } from './city';

export interface Vehicle {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  targetSpeed: number;
  maxSpeed: number;
  currentRoad: RoadSegment | null;
  progress: number;
  path: RoadSegment[];
  pathIndex: number;
  waiting: boolean;
  stoppingDistance: number;
  id: number;
}

export interface TrafficStats {
  totalVehicles: number;
  averageSpeed: number;
}

const COLOR_LOW_SPEED = new THREE.Color(0xFF4343);
const COLOR_MEDIUM_SPEED = new THREE.Color(0xFFC857);
const COLOR_HIGH_SPEED = new THREE.Color(0x4ECDC4);

const LOW_SPEED_THRESHOLD = 20;
const HIGH_SPEED_THRESHOLD = 40;
const COLLISION_DISTANCE = 1.5;
const STOPPING_DISTANCE = 2;
const INTERSECTION_STOP_DISTANCE = 5;

export class TrafficSystem {
  private scene: THREE.Scene;
  private vehicles: Vehicle[] = [];
  private roadSegments: RoadSegment[];
  private intersections: Intersection[];
  private vehicleIdCounter = 0;
  private initialVehicleCount = 300;

  constructor(
    scene: THREE.Scene,
    roadSegments: RoadSegment[],
    intersections: Intersection[]
  ) {
    this.scene = scene;
    this.roadSegments = roadSegments;
    this.intersections = intersections;
  }

  init(vehicleCount: number = 300) {
    this.initialVehicleCount = vehicleCount;
    this.spawnVehicles(vehicleCount);
  }

  private spawnVehicles(count: number) {
    for (let i = 0; i < count; i++) {
      this.createVehicle();
    }
  }

  private createVehicle(): Vehicle {
    const geometry = new THREE.BoxGeometry(1.2, 0.6, 2);
    const material = new THREE.MeshStandardMaterial({
      color: COLOR_MEDIUM_SPEED,
      roughness: 0.5,
      metalness: 0.3
    });
    const mesh = new THREE.Mesh(geometry, material);

    const mainRoads = this.roadSegments.filter(r => r.isMainRoad);
    const roads = mainRoads.length > 0 && Math.random() > 0.3
      ? mainRoads
      : this.roadSegments;

    const road = roads[Math.floor(Math.random() * roads.length)];
    const progress = Math.random();
    const position = road.start.clone().lerp(road.end, progress);

    mesh.position.copy(position);
    mesh.position.y = 0.4;

    const angle = Math.atan2(road.direction.x, road.direction.z);
    mesh.rotation.y = angle;

    mesh.castShadow = true;
    this.scene.add(mesh);

    const vehicle: Vehicle = {
      mesh,
      position: position.clone(),
      direction: road.direction.clone(),
      speed: 20 + Math.random() * 20,
      targetSpeed: 30 + Math.random() * 20,
      maxSpeed: 50 + Math.random() * 20,
      currentRoad: road,
      progress,
      path: [road],
      pathIndex: 0,
      waiting: false,
      stoppingDistance: STOPPING_DISTANCE,
      id: this.vehicleIdCounter++
    };

    this.vehicles.push(vehicle);
    return vehicle;
  }

  setVehicleCount(targetCount: number) {
    const currentCount = this.vehicles.length;

    if (targetCount > currentCount) {
      const toAdd = Math.min(targetCount - currentCount, 20);
      for (let i = 0; i < toAdd; i++) {
        this.createVehicle();
      }
    } else if (targetCount < currentCount) {
      const toRemove = Math.min(currentCount - targetCount, 20);
      for (let i = 0; i < toRemove; i++) {
        if (this.vehicles.length > 0) {
          const vehicle = this.vehicles.pop()!;
          this.scene.remove(vehicle.mesh);
          vehicle.mesh.geometry.dispose();
          (vehicle.mesh.material as THREE.Material).dispose();
        }
      }
    }
  }

  setAverageSpeedMultiplier(multiplier: number) {
    this.vehicles.forEach(vehicle => {
      vehicle.targetSpeed = vehicle.maxSpeed * multiplier * (0.6 + Math.random() * 0.4);
    });
  }

  update(deltaTime: number, timeOfDayMinutes: number) {
    const isPeak = this.isPeakHour(timeOfDayMinutes);
    const isLunch = this.isLunchHour(timeOfDayMinutes);
    const isEveningPeak = this.isEveningPeak(timeOfDayMinutes);
    const isNight = this.isNight(timeOfDayMinutes);

    this.vehicles.forEach(vehicle => {
      this.updateVehicle(vehicle, deltaTime, isPeak, isLunch, isEveningPeak, isNight);
    });

    this.performCollisionDetection();
    this.updateVehicleColors();
  }

  private isPeakHour(minutes: number): boolean {
    return minutes >= 420 && minutes < 540;
  }

  private isLunchHour(minutes: number): boolean {
    return minutes >= 720 && minutes < 840;
  }

  private isEveningPeak(minutes: number): boolean {
    return minutes >= 1020 && minutes < 1140;
  }

  private isNight(minutes: number): boolean {
    return minutes >= 1320 || minutes < 360;
  }

  private updateVehicle(
    vehicle: Vehicle,
    deltaTime: number,
    isPeak: boolean,
    isLunch: boolean,
    isEveningPeak: boolean,
    isNight: boolean
  ) {
    if (!vehicle.currentRoad) return;

    let shouldStop = false;
    let stopDistance = 0;

    const trafficLightCheck = this.checkTrafficLight(vehicle);
    if (trafficLightCheck.shouldStop) {
      shouldStop = true;
      stopDistance = trafficLightCheck.distance;
    }

    if (shouldStop && stopDistance < INTERSECTION_STOP_DISTANCE) {
      vehicle.waiting = true;
      vehicle.speed = Math.max(0, vehicle.speed - deltaTime * 60);
      if (stopDistance < 0.5) {
        vehicle.speed = 0;
      }
    } else {
      vehicle.waiting = false;
      if (vehicle.speed < vehicle.targetSpeed) {
        vehicle.speed = Math.min(
          vehicle.targetSpeed,
          vehicle.speed + deltaTime * 30
        );
      } else if (vehicle.speed > vehicle.targetSpeed) {
        vehicle.speed = Math.max(
          vehicle.targetSpeed,
          vehicle.speed - deltaTime * 20
        );
      }
    }

    const speedUnitsPerSecond = vehicle.speed / 3.6;
    const moveDistance = speedUnitsPerSecond * deltaTime;

    if (vehicle.currentRoad) {
      const roadLength = vehicle.currentRoad.length;
      const progressIncrement = moveDistance / roadLength;

      vehicle.progress += progressIncrement;

      if (vehicle.progress >= 1) {
        vehicle.progress = 0;
        this.chooseNextRoad(vehicle, isLunch, isEveningPeak, isNight);
      }

      if (vehicle.currentRoad) {
        const newPos = vehicle.currentRoad.start.clone().lerp(
          vehicle.currentRoad.end,
          vehicle.progress
        );
        vehicle.position.copy(newPos);
        vehicle.position.y = 0.4;
        vehicle.mesh.position.copy(vehicle.position);

        const angle = Math.atan2(vehicle.direction.x, vehicle.direction.z);
        vehicle.mesh.rotation.y = angle;
      }
    }
  }

  private checkTrafficLight(vehicle: Vehicle): { shouldStop: boolean; distance: number } {
    if (!vehicle.currentRoad) return { shouldStop: false, distance: Infinity };

    const remainingDist = vehicle.currentRoad.length * (1 - vehicle.progress);
    const endPoint = vehicle.currentRoad.end;

    for (const intersection of this.intersections) {
      const distToIntersection = endPoint.distanceTo(intersection.position);

      if (distToIntersection < 8) {
        const lightState = getTrafficLightStateForDirection(
          intersection.trafficLight,
          vehicle.direction
        );

        if (lightState === 'red' || lightState === 'yellow') {
          if (remainingDist < INTERSECTION_STOP_DISTANCE + 2 && remainingDist > 0.5) {
            return { shouldStop: true, distance: remainingDist };
          }
        }
        break;
      }
    }

    return { shouldStop: false, distance: Infinity };
  }

  private chooseNextRoad(
    vehicle: Vehicle,
    isLunch: boolean,
    isEveningPeak: boolean,
    isNight: boolean
  ) {
    if (!vehicle.currentRoad) return;

    const currentEnd = vehicle.currentRoad.end;
    const currentDir = vehicle.currentRoad.direction;

    const candidates: RoadSegment[] = [];

    for (const road of this.roadSegments) {
      const dist = road.start.distanceTo(currentEnd);
      if (dist < 3) {
        const dot = road.direction.dot(currentDir);
        if (dot > -0.5) {
          candidates.push(road);
        }
      }
    }

    if (candidates.length === 0) {
      for (const road of this.roadSegments) {
        const dist = road.start.distanceTo(currentEnd);
        if (dist < 5) {
          candidates.push(road);
        }
      }
    }

    if (candidates.length > 0) {
      let selectedRoad: RoadSegment;

      const straightCandidates = candidates.filter(r => {
        const dot = r.direction.dot(currentDir);
        return dot > 0.7;
      });

      if (isLunch || isEveningPeak) {
        const commercialCandidates = candidates.filter(r => {
          const mid = r.start.clone().lerp(r.end, 0.5);
          return mid.x > -40 && mid.x < 40 && mid.z > -40 && mid.z < 40;
        });
        if (commercialCandidates.length > 0 && Math.random() > 0.4) {
          selectedRoad = commercialCandidates[Math.floor(Math.random() * commercialCandidates.length)];
        } else if (straightCandidates.length > 0 && Math.random() > 0.3) {
          selectedRoad = straightCandidates[Math.floor(Math.random() * straightCandidates.length)];
        } else {
          selectedRoad = candidates[Math.floor(Math.random() * candidates.length)];
        }
      } else if (isNight) {
        const mainRoadCandidates = candidates.filter(r => r.isMainRoad);
        if (mainRoadCandidates.length > 0 && Math.random() > 0.3) {
          selectedRoad = mainRoadCandidates[Math.floor(Math.random() * mainRoadCandidates.length)];
        } else if (straightCandidates.length > 0 && Math.random() > 0.4) {
          selectedRoad = straightCandidates[Math.floor(Math.random() * straightCandidates.length)];
        } else {
          selectedRoad = candidates[Math.floor(Math.random() * candidates.length)];
        }
      } else {
        if (straightCandidates.length > 0 && Math.random() > 0.35) {
          selectedRoad = straightCandidates[Math.floor(Math.random() * straightCandidates.length)];
        } else {
          selectedRoad = candidates[Math.floor(Math.random() * candidates.length)];
        }
      }

      vehicle.currentRoad = selectedRoad;
      vehicle.direction = selectedRoad.direction.clone();
      vehicle.progress = 0;
    }
  }

  private performCollisionDetection() {
    const vehicles = this.vehicles;
    const len = vehicles.length;

    for (let i = 0; i < len; i++) {
      const v1 = vehicles[i];
      if (!v1.currentRoad) continue;

      let minDist = Infinity;
      let frontVehicle: Vehicle | null = null;

      for (let j = 0; j < len; j++) {
        if (i === j) continue;
        const v2 = vehicles[j];
        if (!v2.currentRoad) continue;

        if (v1.currentRoad.id !== v2.currentRoad.id) continue;

        if (v2.progress <= v1.progress) continue;

        const progressDist = (v2.progress - v1.progress) * v1.currentRoad.length;

        if (progressDist < minDist && progressDist < 10) {
          minDist = progressDist;
          frontVehicle = v2;
        }
      }

      if (frontVehicle && minDist < COLLISION_DISTANCE) {
        v1.speed = Math.min(v1.speed, frontVehicle.speed);
        if (minDist < 1) {
          v1.speed = Math.max(0, v1.speed - 5);
        }
      }
    }
  }

  private updateVehicleColors() {
    this.vehicles.forEach(vehicle => {
      const material = vehicle.mesh.material as THREE.MeshStandardMaterial;
      const speed = vehicle.speed;

      let targetColor: THREE.Color;
      if (speed < LOW_SPEED_THRESHOLD) {
        targetColor = COLOR_LOW_SPEED;
      } else if (speed < HIGH_SPEED_THRESHOLD) {
        const t = (speed - LOW_SPEED_THRESHOLD) / (HIGH_SPEED_THRESHOLD - LOW_SPEED_THRESHOLD);
        targetColor = COLOR_LOW_SPEED.clone().lerp(COLOR_HIGH_SPEED, t);
      } else {
        targetColor = COLOR_HIGH_SPEED;
      }

      material.color.lerp(targetColor, 0.1);
    });
  }

  getStats(): TrafficStats {
    const totalVehicles = this.vehicles.length;
    let totalSpeed = 0;

    this.vehicles.forEach(v => {
      totalSpeed += v.speed;
    });

    const averageSpeed = totalVehicles > 0 ? totalSpeed / totalVehicles : 0;

    return {
      totalVehicles,
      averageSpeed
    };
  }

  getVehicles(): Vehicle[] {
    return this.vehicles;
  }
}
