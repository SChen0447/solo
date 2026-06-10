import * as THREE from 'three';

export type LightState = 'red' | 'yellow' | 'green';
export type Direction = 'north' | 'south' | 'east' | 'west';

interface SingleLight {
  mesh: THREE.Mesh;
  light: THREE.PointLight;
  material: THREE.MeshStandardMaterial;
  baseColor: number;
}

export class TrafficLightUnit {
  public group: THREE.Group;
  public direction: Direction;
  private red: SingleLight;
  private yellow: SingleLight;
  private green: SingleLight;
  private currentState: LightState = 'red';
  private pulseTime: number = 0;

  constructor(direction: Direction) {
    this.direction = direction;
    this.group = new THREE.Group();
    this.createPole();
    this.red = this.createLight(0xff3333, 0xff3333, 1.0);
    this.yellow = this.createLight(0xffcc00, 0xffcc00, 0.5);
    this.green = this.createLight(0x33ff33, 0x33ff33, 0.0);
    this.positionLight();
    this.updateVisualState();
  }

  private createPole(): void {
    const poleMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      roughness: 0.6,
      metalness: 0.8,
    });

    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 3, 12),
      poleMaterial
    );
    pole.position.y = 1.5;
    pole.castShadow = true;
    this.group.add(pole);

    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.08, 0.08),
      poleMaterial
    );
    arm.position.set(0.45, 3, 0);
    arm.castShadow = true;
    this.group.add(arm);

    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.4, 0.35),
      new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.5,
        metalness: 0.7,
      })
    );
    housing.position.set(0.9, 2.7, 0);
    housing.castShadow = true;
    this.group.add(housing);
  }

  private createLight(color: number, emissive: number, intensity: number): SingleLight {
    const material = new THREE.MeshStandardMaterial({
      color: color,
      emissive: emissive,
      emissiveIntensity: intensity,
      roughness: 0.2,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 24, 24),
      material
    );
    mesh.castShadow = true;

    const pointLight = new THREE.PointLight(emissive, intensity * 0.6, 6, 2);
    pointLight.castShadow = false;

    this.group.add(mesh);
    this.group.add(pointLight);

    return {
      mesh,
      light: pointLight,
      material,
      baseColor: emissive,
    };
  }

  private positionLight(): void {
    const housingX = 0.9;
    const housingTopY = 3.35;

    this.red.mesh.position.set(housingX, housingTopY - 0.25, 0);
    this.red.light.position.copy(this.red.mesh.position);

    this.yellow.mesh.position.set(housingX, housingTopY - 0.7, 0);
    this.yellow.light.position.copy(this.yellow.mesh.position);

    this.green.mesh.position.set(housingX, housingTopY - 1.15, 0);
    this.green.light.position.copy(this.green.mesh.position);
  }

  public setState(state: LightState): void {
    if (this.currentState !== state) {
      this.currentState = state;
      this.pulseTime = 0;
      this.updateVisualState();
    }
  }

  public getState(): LightState {
    return this.currentState;
  }

  private updateVisualState(): void {
    const setLightOn = (light: SingleLight, on: boolean) => {
      const intensity = on ? 1.0 : 0.05;
      light.material.emissiveIntensity = intensity;
      light.light.intensity = on ? intensity * 0.6 : 0;
    };

    setLightOn(this.red, this.currentState === 'red');
    setLightOn(this.yellow, this.currentState === 'yellow');
    setLightOn(this.green, this.currentState === 'green');
  }

  public update(deltaTime: number): void {
    if (this.currentState === 'red' || this.currentState === 'green') {
      this.pulseTime += deltaTime;
      const pulsePhase = (this.pulseTime % 0.3) / 0.3;
      const pulseIntensity = 0.8 + 0.4 * (0.5 + 0.5 * Math.sin(pulsePhase * Math.PI * 2));
      const activeLight = this.currentState === 'red' ? this.red : this.green;
      activeLight.material.emissiveIntensity = pulseIntensity;
      activeLight.light.intensity = pulseIntensity * 0.6;
    }
  }
}

export class TrafficLightSystem {
  public group: THREE.Group;
  private lights: Map<Direction, TrafficLightUnit> = new Map();
  private phaseTime: number = 0;
  private currentPhase: number = 0;
  private readonly phaseDurations = [4, 2, 4, 2];
  private readonly phaseDescriptions = ['ns-green', 'ns-yellow', 'ew-green', 'ew-yellow'];

  constructor() {
    this.group = new THREE.Group();
    this.createAllLights();
  }

  private createAllLights(): void {
    const offset = 5;
    const poleOffset = 0.6;

    const northLight = new TrafficLightUnit('north');
    northLight.group.position.set(-poleOffset, 0, -offset);
    northLight.group.rotation.y = Math.PI;
    this.lights.set('north', northLight);
    this.group.add(northLight.group);

    const southLight = new TrafficLightUnit('south');
    southLight.group.position.set(poleOffset, 0, offset);
    southLight.group.rotation.y = 0;
    this.lights.set('south', southLight);
    this.group.add(southLight.group);

    const eastLight = new TrafficLightUnit('east');
    eastLight.group.position.set(offset, 0, -poleOffset);
    eastLight.group.rotation.y = -Math.PI / 2;
    this.lights.set('east', eastLight);
    this.group.add(eastLight.group);

    const westLight = new TrafficLightUnit('west');
    westLight.group.position.set(-offset, 0, poleOffset);
    westLight.group.rotation.y = Math.PI / 2;
    this.lights.set('west', westLight);
    this.group.add(westLight.group);
  }

  public update(deltaTime: number): void {
    this.phaseTime += deltaTime;

    if (this.phaseTime >= this.phaseDurations[this.currentPhase]) {
      this.phaseTime = 0;
      this.currentPhase = (this.currentPhase + 1) % this.phaseDurations.length;
      this.applyPhase();
    }

    this.lights.forEach((light) => light.update(deltaTime));
  }

  private applyPhase(): void {
    const phase = this.phaseDescriptions[this.currentPhase];

    if (phase === 'ns-green') {
      this.lights.get('north')?.setState('green');
      this.lights.get('south')?.setState('green');
      this.lights.get('east')?.setState('red');
      this.lights.get('west')?.setState('red');
    } else if (phase === 'ns-yellow') {
      this.lights.get('north')?.setState('yellow');
      this.lights.get('south')?.setState('yellow');
      this.lights.get('east')?.setState('red');
      this.lights.get('west')?.setState('red');
    } else if (phase === 'ew-green') {
      this.lights.get('north')?.setState('red');
      this.lights.get('south')?.setState('red');
      this.lights.get('east')?.setState('green');
      this.lights.get('west')?.setState('green');
    } else if (phase === 'ew-yellow') {
      this.lights.get('north')?.setState('red');
      this.lights.get('south')?.setState('red');
      this.lights.get('east')?.setState('yellow');
      this.lights.get('west')?.setState('yellow');
    }
  }

  public getLightState(direction: Direction): LightState {
    return this.lights.get(direction)?.getState() ?? 'red';
  }

  public getNSState(): LightState {
    return this.lights.get('north')?.getState() ?? 'red';
  }

  public getEWState(): LightState {
    return this.lights.get('east')?.getState() ?? 'red';
  }

  public getCountdown(): number {
    return Math.ceil(this.phaseDurations[this.currentPhase] - this.phaseTime);
  }

  public addToScene(scene: THREE.Scene): void {
    scene.add(this.group);
  }
}
