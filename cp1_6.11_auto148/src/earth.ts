import * as THREE from 'three';
import {
  atmosphereVertexShader,
  atmosphereFragmentShader,
  glowVertexShader,
  glowFragmentShader
} from '@shaders/atmosphereShaders';
import { ClimateZoneName } from './climateManager';

export class Earth {
  public mesh: THREE.Mesh;
  public glowMesh: THREE.Mesh;
  public group: THREE.Group;
  public material: THREE.ShaderMaterial;
  public glowMaterial: THREE.ShaderMaterial;
  public sphereRadius: number;

  private zoneClickAreas: Map<ClimateZoneName, THREE.Vector3[]> = new Map();

  constructor(radius: number = 2) {
    this.sphereRadius = radius;
    this.group = new THREE.Group();

    const geometry = new THREE.SphereGeometry(radius, 64, 64);
    this.material = this.createAtmosphereMaterial();
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.rotation.y = Math.PI * 0.3;
    this.group.add(this.mesh);

    const glowGeometry = new THREE.SphereGeometry(radius * 1.1, 64, 64);
    this.glowMaterial = this.createGlowMaterial();
    this.glowMesh = new THREE.Mesh(glowGeometry, this.glowMaterial);
    this.group.add(this.glowMesh);

    this.calculateZoneClickAreas();
  }

  private createAtmosphereMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      uniforms: {
        uTropicalColor: { value: new THREE.Color('#ff6b35') },
        uTemperateColor: { value: new THREE.Color('#4caf50') },
        uPolarColor: { value: new THREE.Color('#55aaff') },
        uAtmosphereIntensity: { value: 1 }
      }
    });
  }

  private createGlowMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: glowVertexShader,
      fragmentShader: glowFragmentShader,
      uniforms: {
        uGlowColor: { value: new THREE.Color(0.3, 0.6, 1.0) },
        uGlowIntensity: { value: 1.5 }
      },
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
  }

  private calculateZoneClickAreas(): void {
    const zones: { name: ClimateZoneName; latRange: [number, number] }[] = [
      { name: 'tropical', latRange: [-23, 23] },
      { name: 'temperate', latRange: [23, 66] },
      { name: 'polar', latRange: [66, 90] }
    ];

    zones.forEach(({ name, latRange }) => {
      const points: THREE.Vector3[] = [];
      const segments = 32;

      for (let i = 0; i < segments; i++) {
        const lon = (i / segments) * Math.PI * 2;
        const lat = ((latRange[0] + latRange[1]) / 2) * (Math.PI / 180);
        const x = this.sphereRadius * Math.cos(lat) * Math.cos(lon);
        const y = this.sphereRadius * Math.sin(lat);
        const z = this.sphereRadius * Math.cos(lat) * Math.sin(lon);
        points.push(new THREE.Vector3(x, y, z));
      }

      this.zoneClickAreas.set(name, points);
    });
  }

  public getZoneCenter(zoneName: ClimateZoneName): THREE.Vector3 {
    let lat = 0;
    switch (zoneName) {
      case 'tropical':
        lat = 0;
        break;
      case 'temperate':
        lat = 45;
        break;
      case 'polar':
        lat = 80;
        break;
    }

    const latRad = (lat * Math.PI) / 180;
    const lon = 0;

    const distance = this.sphereRadius * 2.5;
    const x = distance * Math.cos(latRad) * Math.cos(lon);
    const y = distance * Math.sin(latRad);
    const z = distance * Math.cos(latRad) * Math.sin(lon);

    return new THREE.Vector3(x, y, z);
  }

  public getZoneFromLatitude(lat: number): ClimateZoneName {
    const absLat = Math.abs(lat);
    if (absLat < 23) return 'tropical';
    if (absLat < 66) return 'temperate';
    return 'polar';
  }

  public setAtmosphereIntensity(value: number): void {
    this.material.uniforms.uAtmosphereIntensity.value = value;
  }

  public update(time: number): void {
    this.mesh.rotation.y += 0.0003;
    this.glowMesh.rotation.y = this.mesh.rotation.y;
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.glowMesh.geometry.dispose();
    this.glowMaterial.dispose();
  }
}
