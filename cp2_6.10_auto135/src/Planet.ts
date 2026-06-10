import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export interface PlanetInitialState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  semiMajorAxis: number;
  eccentricity: number;
}

export class Planet {
  public name: string;
  public mesh: THREE.Mesh;
  public group: THREE.Group;
  public label: CSS2DObject;
  public orbitLine: THREE.Line;
  public trailPoints: THREE.Vector3[] = [];
  public trailGeometry: THREE.BufferGeometry;
  public trailMesh: THREE.Points;
  public velocity: THREE.Vector3;
  public mass: number;
  public initialState: PlanetInitialState;
  public currentEccentricity: number;
  public perturbationStrength: number = 0;
  private color: THREE.Color;
  private maxTrailLength: number = 20;
  private radius: number;

  constructor(
    name: string,
    radius: number,
    color: string,
    initialPosition: THREE.Vector3,
    initialVelocity: THREE.Vector3,
    semiMajorAxis: number,
    eccentricity: number,
    mass: number
  ) {
    this.name = name;
    this.radius = radius;
    this.color = new THREE.Color(color);
    this.mass = mass;
    this.velocity = initialVelocity.clone();
    this.currentEccentricity = eccentricity;

    this.initialState = {
      position: initialPosition.clone(),
      velocity: initialVelocity.clone(),
      semiMajorAxis: semiMajorAxis,
      eccentricity: eccentricity
    };

    this.group = new THREE.Group();

    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: this.color,
      roughness: 0.7,
      metalness: 0.1,
      emissive: this.color.clone().multiplyScalar(0.1)
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.group.add(this.mesh);

    const labelDiv = document.createElement('div');
    labelDiv.textContent = name;
    labelDiv.style.cssText = `
      color: white;
      font-size: 12px;
      font-family: 'Segoe UI', Arial, sans-serif;
      text-shadow: 0 0 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7);
      padding: 2px 6px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 4px;
      white-space: nowrap;
      pointer-events: none;
      user-select: none;
    `;
    this.label = new CSS2DObject(labelDiv);
    this.label.position.set(0, radius + 0.5, 0);
    this.group.add(this.label);

    this.orbitLine = this.createOrbitLine(semiMajorAxis, eccentricity);
    this.group.add(this.orbitLine);

    this.trailGeometry = new THREE.BufferGeometry();
    const trailMaterial = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.trailMesh = new THREE.Points(this.trailGeometry, trailMaterial);
    this.group.add(this.trailMesh);

    this.group.position.copy(initialPosition);
  }

  private createOrbitLine(semiMajorAxis: number, eccentricity: number): THREE.Line {
    const points: THREE.Vector3[] = [];
    const segments = 128;
    const semiMinorAxis = semiMajorAxis * Math.sqrt(1 - eccentricity * eccentricity);
    const focusOffset = semiMajorAxis * eccentricity;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = semiMajorAxis * Math.cos(angle) - focusOffset;
      const z = semiMinorAxis * Math.sin(angle);
      points.push(new THREE.Vector3(x, 0, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.25,
      dashSize: 0.3,
      gapSize: 0.2
    });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    return line;
  }

  public updateTrail(perturbationStrength: number): void {
    this.perturbationStrength = perturbationStrength;
    const currentPos = this.group.position.clone();
    this.trailPoints.unshift(currentPos);

    const dynamicLength = Math.max(5, Math.min(this.maxTrailLength, Math.floor(5 + perturbationStrength * 15)));
    while (this.trailPoints.length > dynamicLength) {
      this.trailPoints.pop();
    }

    const positions = new Float32Array(this.trailPoints.length * 3);
    const colors = new Float32Array(this.trailPoints.length * 3);

    for (let i = 0; i < this.trailPoints.length; i++) {
      const alpha = 1.0 - i / this.trailPoints.length;
      positions[i * 3] = this.trailPoints[i].x;
      positions[i * 3 + 1] = this.trailPoints[i].y;
      positions[i * 3 + 2] = this.trailPoints[i].z;

      colors[i * 3] = this.color.r * alpha;
      colors[i * 3 + 1] = this.color.g * alpha;
      colors[i * 3 + 2] = this.color.b * alpha;
    }

    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.trailGeometry.attributes.position.needsUpdate = true;
    this.trailGeometry.attributes.color.needsUpdate = true;
  }

  public getPosition(): THREE.Vector3 {
    return this.group.position.clone();
  }

  public getSpeed(): number {
    return this.velocity.length();
  }

  public getEccentricityChangePercent(): number {
    if (this.initialState.eccentricity === 0) {
      return this.currentEccentricity * 100;
    }
    return ((this.currentEccentricity - this.initialState.eccentricity) / this.initialState.eccentricity) * 100;
  }

  public reset(): void {
    this.group.position.copy(this.initialState.position);
    this.velocity.copy(this.initialState.velocity);
    this.currentEccentricity = this.initialState.eccentricity;
    this.trailPoints = [];
    this.perturbationStrength = 0;
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(0), 3));
  }

  public addToScene(scene: THREE.Scene): void {
    scene.add(this.group);
  }
}
