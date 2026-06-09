import * as THREE from 'three';
import { Direction, RoadNetwork, ROAD_LENGTH, INTERSECTION_SIZE } from './RoadNetwork';
import { TrafficLightSystem } from './TrafficLight';

const CAR_COLORS = [0xff3333, 0x3366ff, 0x33cc33, 0xffcc00, 0xffffff, 0x222222];
const CAR_WIDTH = 1.8;
const CAR_HEIGHT = 1.2;
const CAR_LENGTH = 3.5;
const WHEEL_RADIUS = 0.2;
const WHEEL_HEIGHT = 0.1;
const MIN_SPEED = 20;
const MAX_SPEED = 40;
const SAFE_DISTANCE = 5;
const STOP_LINE_DISTANCE = 11;
const LIGHT_DETECTION_DISTANCE = 15;
const MAX_UPDATES_PER_FRAME = 50;

class Car {
  public group: THREE.Group;
  public mesh: THREE.Mesh;
  public direction: Direction;
  public laneIndex: number;
  public baseSpeed: number;
  public currentSpeed: number;
  public targetSpeed: number;
  public distanceTraveled: number;
  public passedStopLine: boolean;
  public previousPosition: THREE.Vector3;
  public needsPhysicsUpdate: boolean;

  constructor(
    color: number,
    direction: Direction,
    laneIndex: number,
    startPosition: { x: number; z: number; rotation: number },
    speed: number
  ) {
    this.direction = direction;
    this.laneIndex = laneIndex;
    this.baseSpeed = speed;
    this.currentSpeed = speed;
    this.targetSpeed = speed;
    this.distanceTraveled = 0;
    this.passedStopLine = false;
    this.needsPhysicsUpdate = true;
    this.previousPosition = new THREE.Vector3();

    this.group = new THREE.Group();
    this.mesh = this.buildCarMesh(color);
    this.group.add(this.mesh);

    this.group.position.set(startPosition.x, CAR_HEIGHT / 2 + 0.1, startPosition.z);
    this.group.rotation.y = startPosition.rotation;
    this.previousPosition.copy(this.group.position);
  }

  private buildCarMesh(color: number): THREE.Mesh {
    const carGroup = new THREE.Group();

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.3,
      roughness: 0.6
    });

    const bodyGeometry = new THREE.BoxGeometry(CAR_WIDTH, CAR_HEIGHT * 0.6, CAR_LENGTH);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = CAR_HEIGHT * 0.3;
    carGroup.add(body);

    const topGeometry = new THREE.BoxGeometry(CAR_WIDTH * 0.8, CAR_HEIGHT * 0.5, CAR_LENGTH * 0.5);
    const top = new THREE.Mesh(topGeometry, bodyMaterial);
    top.position.y = CAR_HEIGHT * 0.8;
    top.position.z = -CAR_LENGTH * 0.05;
    carGroup.add(top);

    const windowMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      metalness: 0.9,
      roughness: 0.1,
      transparent: true,
      opacity: 0.7
    });

    const windshieldGeometry = new THREE.BoxGeometry(CAR_WIDTH * 0.75, CAR_HEIGHT * 0.4, 0.05);
    const windshield = new THREE.Mesh(windshieldGeometry, windowMaterial);
    windshield.position.set(0, CAR_HEIGHT * 0.75, CAR_LENGTH * 0.18);
    carGroup.add(windshield);

    const rearWindow = new THREE.Mesh(windshieldGeometry, windowMaterial);
    rearWindow.position.set(0, CAR_HEIGHT * 0.75, -CAR_LENGTH * 0.28);
    carGroup.add(rearWindow);

    const wheelMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.9
    });

    const wheelGeometry = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, WHEEL_HEIGHT, 12);

    const wheelPositions = [
      { x: -CAR_WIDTH / 2 + WHEEL_HEIGHT / 2, z: CAR_LENGTH / 3 },
      { x: CAR_WIDTH / 2 - WHEEL_HEIGHT / 2, z: CAR_LENGTH / 3 },
      { x: -CAR_WIDTH / 2 + WHEEL_HEIGHT / 2, z: -CAR_LENGTH / 3 },
      { x: CAR_WIDTH / 2 - WHEEL_HEIGHT / 2, z: -CAR_LENGTH / 3 }
    ];

    for (const pos of wheelPositions) {
      const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos.x, WHEEL_RADIUS, pos.z);
      carGroup.add(wheel);
    }

    const headlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffcc,
      emissive: 0xffffcc,
      emissiveIntensity: 0.5
    });

    const headlightGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    leftHeadlight.position.set(-CAR_WIDTH * 0.3, CAR_HEIGHT * 0.25, CAR_LENGTH / 2 + 0.01);
    carGroup.add(leftHeadlight);

    const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
    rightHeadlight.position.set(CAR_WIDTH * 0.3, CAR_HEIGHT * 0.25, CAR_LENGTH / 2 + 0.01);
    carGroup.add(rightHeadlight);

    const taillightMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.3
    });

    const taillightGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const leftTaillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
    leftTaillight.position.set(-CAR_WIDTH * 0.3, CAR_HEIGHT * 0.25, -CAR_LENGTH / 2 - 0.01);
    carGroup.add(leftTaillight);

    const rightTaillight = new THREE.Mesh(taillightGeometry, taillightMaterial);
    rightTaillight.position.set(CAR_WIDTH * 0.3, CAR_HEIGHT * 0.25, -CAR_LENGTH / 2 - 0.01);
    carGroup.add(rightTaillight);

    const carMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
    carMesh.add(carGroup);

    return carMesh;
  }

  public getPosition(): THREE.Vector3 {
    return this.group.position;
  }

  public getDistanceToIntersection(): number {
    const totalRoad = ROAD_LENGTH / 2 + INTERSECTION_SIZE / 2;
    return totalRoad - this.distanceTraveled;
  }

  public hasPassedStopLine(): boolean {
    const totalRoad = ROAD_LENGTH / 2 + INTERSECTION_SIZE / 2;
    const stopLineDist = totalRoad - STOP_LINE_DISTANCE;
    return this.distanceTraveled > stopLineDist;
  }

  public getDistanceToStopLine(): number {
    const totalRoad = ROAD_LENGTH / 2 + INTERSECTION_SIZE / 2;
    const stopLineDist = totalRoad - STOP_LINE_DISTANCE;
    return stopLineDist - this.distanceTraveled;
  }
}

export class TrafficManager {
  public group: THREE.Group;
  public cars: Car[];
  private roadNetwork: RoadNetwork;
  private lightSystem: TrafficLightSystem;
  private updateOffset: number;

  constructor(roadNetwork: RoadNetwork, lightSystem: TrafficLightSystem) {
    this.group = new THREE.Group();
    this.cars = [];
    this.roadNetwork = roadNetwork;
    this.lightSystem = lightSystem;
    this.updateOffset = 0;

    this.spawnCars(100);
  }

  private spawnCars(count: number): void {
    const directions: Direction[] = ['north', 'south', 'east', 'west'];

    for (let i = 0; i < count; i++) {
      const direction = directions[i % 4];
      const laneIndex = (i % 2);
      const color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
      const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);

      const lanePos = this.roadNetwork.getLanePosition(direction, laneIndex);
      const startDist = Math.random() * 30;

      const car = new Car(color, direction, laneIndex, lanePos, speed);

      this.offsetCarPosition(car, startDist);
      car.distanceTraveled = startDist;

      this.cars.push(car);
      this.group.add(car.group);
    }

    this.sortCars();
  }

  private offsetCarPosition(car: Car, distance: number): void {
    switch (car.direction) {
      case 'north':
        car.group.position.z += distance;
        break;
      case 'south':
        car.group.position.z -= distance;
        break;
      case 'east':
        car.group.position.x += distance;
        break;
      case 'west':
        car.group.position.x -= distance;
        break;
    }
  }

  private sortCars(): void {
    this.cars.sort((a, b) => {
      if (a.direction !== b.direction) return a.direction.localeCompare(b.direction);
      if (a.laneIndex !== b.laneIndex) return a.laneIndex - b.laneIndex;
      return b.distanceTraveled - a.distanceTraveled;
    });
  }

  public update(deltaTime: number): void {
    const totalCars = this.cars.length;
    const startIdx = this.updateOffset;
    const endIdx = Math.min(startIdx + MAX_UPDATES_PER_FRAME, totalCars);
    const carsToUpdate = endIdx - startIdx;

    for (let i = 0; i < totalCars; i++) {
      this.cars[i].needsPhysicsUpdate = (i >= startIdx && i < endIdx);
    }

    this.updateOffset = (this.updateOffset + carsToUpdate) % totalCars;

    this.sortCars();

    for (let i = 0; i < this.cars.length; i++) {
      const car = this.cars[i];

      if (car.needsPhysicsUpdate) {
        this.updateCarPhysics(car, i, deltaTime);
        car.previousPosition.copy(car.group.position);
      } else {
        this.interpolateCarPosition(car, deltaTime);
      }

      this.moveCar(car, deltaTime);
      this.checkCarReset(car);
    }
  }

  private updateCarPhysics(car: Car, index: number, deltaTime: number): void {
    let targetSpeed = car.baseSpeed;

    const frontCar = this.findFrontCar(car, index);
    if (frontCar) {
      const distance = this.getDistanceBetweenCars(car, frontCar);
      if (distance < SAFE_DISTANCE) {
        targetSpeed = Math.min(targetSpeed, frontCar.currentSpeed * 0.8);
        if (distance < 2) {
          targetSpeed = 0;
        }
      }
    }

    const distToIntersection = car.getDistanceToIntersection();
    if (distToIntersection < LIGHT_DETECTION_DISTANCE && distToIntersection > -INTERSECTION_SIZE) {
      const lightState = this.lightSystem.getLightState(car.direction);
      const distToStopLine = car.getDistanceToStopLine();

      if (distToStopLine > 0) {
        if (lightState === 'red') {
          if (distToStopLine < 10) {
            const brakeFactor = Math.max(0, distToStopLine / 10);
            targetSpeed = Math.min(targetSpeed, car.baseSpeed * brakeFactor);
          }
          if (distToStopLine < 1) {
            targetSpeed = 0;
          }
        } else if (lightState === 'yellow') {
          if (distToStopLine > 3) {
            targetSpeed = Math.min(targetSpeed, car.baseSpeed * 0.3);
          }
          if (distToStopLine < 1) {
            targetSpeed = 0;
          }
        }
      }
    }

    car.targetSpeed = targetSpeed;
    const acceleration = 15;
    if (car.currentSpeed < car.targetSpeed) {
      car.currentSpeed = Math.min(car.currentSpeed + acceleration * deltaTime, car.targetSpeed);
    } else if (car.currentSpeed > car.targetSpeed) {
      car.currentSpeed = Math.max(car.currentSpeed - acceleration * 2 * deltaTime, car.targetSpeed);
    }
  }

  private interpolateCarPosition(car: Car, deltaTime: number): void {
    car.currentSpeed += (car.targetSpeed - car.currentSpeed) * deltaTime * 2;
  }

  private moveCar(car: Car, deltaTime: number): void {
    const distance = car.currentSpeed * deltaTime;
    car.distanceTraveled += distance;

    switch (car.direction) {
      case 'north':
        car.group.position.z += distance;
        break;
      case 'south':
        car.group.position.z -= distance;
        break;
      case 'east':
        car.group.position.x += distance;
        break;
      case 'west':
        car.group.position.x -= distance;
        break;
    }
  }

  private findFrontCar(car: Car, currentIndex: number): Car | null {
    for (let i = currentIndex - 1; i >= 0; i--) {
      const other = this.cars[i];
      if (other.direction === car.direction && other.laneIndex === car.laneIndex) {
        return other;
      }
    }
    return null;
  }

  private getDistanceBetweenCars(back: Car, front: Car): number {
    const dx = front.group.position.x - back.group.position.x;
    const dz = front.group.position.z - back.group.position.z;

    switch (back.direction) {
      case 'north':
        return -dz - CAR_LENGTH;
      case 'south':
        return dz - CAR_LENGTH;
      case 'east':
        return -dx - CAR_LENGTH;
      case 'west':
        return dx - CAR_LENGTH;
    }
  }

  private checkCarReset(car: Car): void {
    const totalLength = ROAD_LENGTH + INTERSECTION_SIZE + 30;
    if (car.distanceTraveled > totalLength) {
      car.distanceTraveled = 0;
      car.currentSpeed = car.baseSpeed;
      car.targetSpeed = car.baseSpeed;
      car.passedStopLine = false;

      const lanePos = this.roadNetwork.getLanePosition(car.direction, car.laneIndex);
      car.group.position.set(lanePos.x, CAR_HEIGHT / 2 + 0.1, lanePos.z);
      car.previousPosition.copy(car.group.position);
    }
  }

  public getTotalCars(): number {
    return this.cars.length;
  }

  public getAverageSpeed(): number {
    if (this.cars.length === 0) return 0;
    const total = this.cars.reduce((sum, car) => sum + car.currentSpeed, 0);
    return (total / this.cars.length) * 3.6;
  }
}
