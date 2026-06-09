import * as THREE from 'three';
import { Direction, INTERSECTION_SIZE } from './RoadNetwork';

export type LightState = 'red' | 'yellow' | 'green';

const RED_DURATION = 10;
const GREEN_DURATION = 8;
const YELLOW_DURATION = 2;
const CYCLE_DURATION = RED_DURATION + GREEN_DURATION + YELLOW_DURATION;

export class TrafficLight {
  public group: THREE.Group;
  public direction: Direction;
  private redLight!: THREE.Mesh;
  private yellowLight!: THREE.Mesh;
  private greenLight!: THREE.Mesh;
  private currentState: LightState;
  private stateTimer: number;
  private timeOffset: number;

  constructor(direction: Direction, timeOffset: number = 0) {
    this.direction = direction;
    this.group = new THREE.Group();
    this.currentState = 'red';
    this.stateTimer = 0;
    this.timeOffset = timeOffset;

    this.build();
    this.setInitialState();
  }

  private build(): void {
    const poleMaterial = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.7,
      metalness: 0.8
    });

    const poleHeight = 5;
    const poleRadius = 0.15;
    const poleGeometry = new THREE.CylinderGeometry(poleRadius, poleRadius, poleHeight, 12);
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = poleHeight / 2;
    this.group.add(pole);

    const armLength = 2.5;
    const armGeometry = new THREE.BoxGeometry(0.1, 0.1, armLength);
    const arm = new THREE.Mesh(armGeometry, poleMaterial);
    arm.position.y = poleHeight - 0.3;
    arm.position.z = armLength / 2;
    this.group.add(arm);

    const housingMaterial = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.5,
      metalness: 0.9
    });

    const housingWidth = 1;
    const housingHeight = 2.5;
    const housingDepth = 0.6;
    const housingGeometry = new THREE.BoxGeometry(housingWidth, housingHeight, housingDepth);
    const housing = new THREE.Mesh(housingGeometry, housingMaterial);
    housing.position.y = poleHeight - 0.3;
    housing.position.z = armLength + housingDepth / 2;
    this.group.add(housing);

    const lightRadius = 0.3;
    const lightSpacing = 0.7;

    const redMatOff = new THREE.MeshStandardMaterial({
      color: 0x331111,
      roughness: 0.3,
      metalness: 0.1
    });
    const redMatOn = new THREE.MeshStandardMaterial({
      color: 0xff3333,
      roughness: 0.3,
      metalness: 0.1,
      emissive: 0xff3333,
      emissiveIntensity: 1
    });

    const yellowMatOff = new THREE.MeshStandardMaterial({
      color: 0x333311,
      roughness: 0.3,
      metalness: 0.1
    });
    const yellowMatOn = new THREE.MeshStandardMaterial({
      color: 0xffcc00,
      roughness: 0.3,
      metalness: 0.1,
      emissive: 0xffcc00,
      emissiveIntensity: 1
    });

    const greenMatOff = new THREE.MeshStandardMaterial({
      color: 0x113311,
      roughness: 0.3,
      metalness: 0.1
    });
    const greenMatOn = new THREE.MeshStandardMaterial({
      color: 0x33cc33,
      roughness: 0.3,
      metalness: 0.1,
      emissive: 0x33cc33,
      emissiveIntensity: 1
    });

    const lightGeometry = new THREE.SphereGeometry(lightRadius, 16, 16);

    this.redLight = new THREE.Mesh(lightGeometry, redMatOff);
    this.redLight.position.set(0, lightSpacing, armLength + housingDepth + 0.05);
    (this.redLight as any).matOff = redMatOff;
    (this.redLight as any).matOn = redMatOn;
    this.group.add(this.redLight);

    this.yellowLight = new THREE.Mesh(lightGeometry, yellowMatOff);
    this.yellowLight.position.set(0, 0, armLength + housingDepth + 0.05);
    (this.yellowLight as any).matOff = yellowMatOff;
    (this.yellowLight as any).matOn = yellowMatOn;
    this.group.add(this.yellowLight);

    this.greenLight = new THREE.Mesh(lightGeometry, greenMatOff);
    this.greenLight.position.set(0, -lightSpacing, armLength + housingDepth + 0.05);
    (this.greenLight as any).matOff = greenMatOff;
    (this.greenLight as any).matOn = greenMatOn;
    this.group.add(this.greenLight);

    this.setPosition();
  }

  private setPosition(): void {
    const offset = INTERSECTION_SIZE / 2 + 1;
    const poleOffset = 5;

    switch (this.direction) {
      case 'north':
        this.group.position.set(-poleOffset, 0, -offset);
        this.group.rotation.y = Math.PI / 2;
        break;
      case 'south':
        this.group.position.set(poleOffset, 0, offset);
        this.group.rotation.y = -Math.PI / 2;
        break;
      case 'east':
        this.group.position.set(offset, 0, -poleOffset);
        this.group.rotation.y = Math.PI;
        break;
      case 'west':
        this.group.position.set(-offset, 0, poleOffset);
        this.group.rotation.y = 0;
        break;
    }
  }

  private setInitialState(): void {
    const isVertical = this.direction === 'north' || this.direction === 'south';
    const adjustedTime = (this.timeOffset + (isVertical ? 0 : CYCLE_DURATION / 2)) % CYCLE_DURATION;

    if (adjustedTime < RED_DURATION) {
      this.currentState = 'red';
      this.stateTimer = adjustedTime;
    } else if (adjustedTime < RED_DURATION + GREEN_DURATION) {
      this.currentState = 'green';
      this.stateTimer = adjustedTime - RED_DURATION;
    } else {
      this.currentState = 'yellow';
      this.stateTimer = adjustedTime - RED_DURATION - GREEN_DURATION;
    }

    this.updateLightVisuals();
  }

  public update(deltaTime: number): void {
    this.stateTimer += deltaTime;

    switch (this.currentState) {
      case 'red':
        if (this.stateTimer >= RED_DURATION) {
          this.currentState = 'green';
          this.stateTimer = 0;
          this.updateLightVisuals();
        }
        break;
      case 'green':
        if (this.stateTimer >= GREEN_DURATION) {
          this.currentState = 'yellow';
          this.stateTimer = 0;
          this.updateLightVisuals();
        }
        break;
      case 'yellow':
        if (this.stateTimer >= YELLOW_DURATION) {
          this.currentState = 'red';
          this.stateTimer = 0;
          this.updateLightVisuals();
        }
        break;
    }
  }

  private updateLightVisuals(): void {
    this.setLightOn(this.redLight, this.currentState === 'red');
    this.setLightOn(this.yellowLight, this.currentState === 'yellow');
    this.setLightOn(this.greenLight, this.currentState === 'green');
  }

  private setLightOn(light: THREE.Mesh, on: boolean): void {
    const matOff = (light as any).matOff;
    const matOn = (light as any).matOn;
    light.material = on ? matOn : matOff;
  }

  public getState(): LightState {
    return this.currentState;
  }

  public getTimeInState(): number {
    return this.stateTimer;
  }

  public getDuration(): number {
    switch (this.currentState) {
      case 'red': return RED_DURATION;
      case 'green': return GREEN_DURATION;
      case 'yellow': return YELLOW_DURATION;
    }
  }
}

export class TrafficLightSystem {
  public lights: Map<Direction, TrafficLight>;
  public group: THREE.Group;
  private elapsedTime: number;

  constructor() {
    this.group = new THREE.Group();
    this.lights = new Map();
    this.elapsedTime = 0;
    this.build();
  }

  private build(): void {
    const directions: Direction[] = ['north', 'south', 'east', 'west'];

    for (const dir of directions) {
      const light = new TrafficLight(dir, this.elapsedTime);
      this.lights.set(dir, light);
      this.group.add(light.group);
    }
  }

  public update(deltaTime: number): void {
    this.elapsedTime += deltaTime;
    for (const light of this.lights.values()) {
      light.update(deltaTime);
    }
  }

  public getLight(direction: Direction): TrafficLight | undefined {
    return this.lights.get(direction);
  }

  public getLightState(direction: Direction): LightState {
    const light = this.lights.get(direction);
    return light ? light.getState() : 'red';
  }
}
