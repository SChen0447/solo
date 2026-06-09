import * as THREE from 'three';
import type { WaveFrontData } from './wave';

export interface MediumProperties {
  name: string;
  refractiveIndex: number;
  wavelengthScale: number;
  amplitudeScale: number;
  color: number;
}

export const MEDIA: Record<string, MediumProperties> = {
  AIR: {
    name: '空气',
    refractiveIndex: 1.0,
    wavelengthScale: 1.0,
    amplitudeScale: 1.0,
    color: 0x1A237E
  },
  GLASS: {
    name: '玻璃',
    refractiveIndex: 1.5,
    wavelengthScale: 0.7,
    amplitudeScale: 0.6,
    color: 0x64B5F6
  }
};

export interface MediumInterface {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  medium1: MediumProperties;
  medium2: MediumProperties;
}

export interface InteractionResult {
  refractedDirection: THREE.Vector3;
  reflectedDirection: THREE.Vector3;
  refractedAmplitude: number;
  reflectedAmplitude: number;
  refractedWavelength: number;
  reflectedWavelength: number;
  totalInternalReflection: boolean;
}

export class MediumSystem {
  private scene: THREE.Scene;
  private mediumCube: THREE.Mesh;
  private boundaryLine: THREE.Mesh;
  private airFog: THREE.Fog;
  private glassFog: THREE.Fog;
  private mediumInterface: MediumInterface;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.mediumInterface = {
      position: new THREE.Vector3(0, 0, 0),
      normal: new THREE.Vector3(1, 0, 0),
      medium1: MEDIA.AIR,
      medium2: MEDIA.GLASS
    };

    this.mediumCube = this.createMediumCube();
    this.boundaryLine = this.createBoundaryLine();
    this.airFog = new THREE.Fog(0x1A237E, 10, 35);
    this.glassFog = new THREE.Fog(0x64B5F6, 5, 25);

    this.scene.add(this.mediumCube);
    this.scene.add(this.boundaryLine);
  }

  private createMediumCube(): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(4, 4, 4);
    const material = new THREE.MeshPhongMaterial({
      color: 0xE0E0E0,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      shininess: 100,
      specular: 0xffffff
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, 0, 0);
    cube.castShadow = true;
    cube.receiveShadow = true;
    return cube;
  }

  private createBoundaryLine(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(0.02, 10);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    const line = new THREE.Mesh(geometry, material);
    line.position.set(-2, 0, 0);
    line.rotation.y = Math.PI / 2;

    const glowGeometry = new THREE.PlaneGeometry(0.08, 10);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(-2, 0, 0);
    glow.rotation.y = Math.PI / 2;
    line.add(glow);

    return line;
  }

  public computeInteraction(
    incidentDirection: THREE.Vector3,
    incidentAmplitude: number,
    incidentWavelength: number,
    incidentAngleDeg: number
  ): InteractionResult {
    const n1 = this.mediumInterface.medium1.refractiveIndex;
    const n2 = this.mediumInterface.medium2.refractiveIndex;
    const normal = this.mediumInterface.normal.clone().normalize();

    const theta1 = (incidentAngleDeg * Math.PI) / 180;
    const sinTheta2 = (n1 / n2) * Math.sin(theta1);

    const totalInternalReflection = Math.abs(sinTheta2) > 1;

    let refractedDirection: THREE.Vector3;
    let reflectionCoefficient: number;
    let transmissionCoefficient: number;

    if (totalInternalReflection) {
      refractedDirection = new THREE.Vector3(0, 0, 0);
      reflectionCoefficient = 1.0;
      transmissionCoefficient = 0.0;
    } else {
      const theta2 = Math.asin(sinTheta2);
      refractedDirection = new THREE.Vector3(
        Math.cos(theta2),
        0,
        Math.sin(theta2)
      ).normalize();

      const cosTheta1 = Math.cos(theta1);
      const cosTheta2 = Math.cos(theta2);
      const rs = (n1 * cosTheta1 - n2 * cosTheta2) / (n1 * cosTheta1 + n2 * cosTheta2);
      const rp = (n2 * cosTheta1 - n1 * cosTheta2) / (n2 * cosTheta1 + n1 * cosTheta2);
      reflectionCoefficient = (Math.abs(rs) + Math.abs(rp)) / 2;
      transmissionCoefficient = 1 - reflectionCoefficient;
    }

    const incidentDir = incidentDirection.clone().normalize();
    const reflectedDirection = incidentDir
      .clone()
      .sub(normal.clone().multiplyScalar(2 * incidentDir.dot(normal)))
      .normalize();

    const wavelengthScale = this.mediumInterface.medium2.wavelengthScale;
    const amplitudeScale = this.mediumInterface.medium2.amplitudeScale;

    return {
      refractedDirection,
      reflectedDirection,
      refractedAmplitude: incidentAmplitude * amplitudeScale * transmissionCoefficient,
      reflectedAmplitude: incidentAmplitude * reflectionCoefficient,
      refractedWavelength: incidentWavelength * wavelengthScale,
      reflectedWavelength: incidentWavelength,
      totalInternalReflection
    };
  }

  public isInsideMedium(position: THREE.Vector3): boolean {
    const halfSize = 2;
    return (
      position.x >= -halfSize &&
      position.x <= halfSize &&
      position.y >= -halfSize &&
      position.y <= halfSize &&
      position.z >= -halfSize &&
      position.z <= halfSize
    );
  }

  public getBoundaryX(): number {
    return -2;
  }

  public getMediumInterface(): MediumInterface {
    return this.mediumInterface;
  }

  public applyFog(camera: THREE.Camera): void {
    if (camera.position.x < 0) {
      this.scene.fog = this.airFog;
    } else {
      this.scene.fog = this.glassFog;
    }
  }

  public updateWaveFronts(waveFronts: WaveFrontData[]): WaveFrontData[] {
    const result: WaveFrontData[] = [];

    for (const wf of waveFronts) {
      const wasInMedium = wf.inMedium;
      const isNowInMedium = this.isInsideMedium(wf.position);

      if (!wasInMedium && isNowInMedium) {
        const interaction = this.computeInteraction(
          wf.direction,
          wf.amplitude,
          wf.wavelength,
          Math.atan2(wf.direction.z, wf.direction.x) * 180 / Math.PI
        );

        result.push({
          ...wf,
          direction: interaction.refractedDirection.clone(),
          amplitude: interaction.refractedAmplitude,
          wavelength: interaction.refractedWavelength,
          inMedium: true,
          phase: wf.phase
        });

        result.push({
          ...wf,
          position: wf.position.clone(),
          direction: interaction.reflectedDirection.clone(),
          amplitude: interaction.reflectedAmplitude,
          wavelength: interaction.reflectedWavelength,
          inMedium: false,
          phase: wf.phase + Math.PI
        });
      } else if (wf.position.x > 4) {
        continue;
      } else {
        result.push({
          ...wf,
          inMedium: isNowInMedium
        });
      }
    }

    return result;
  }

  public getMediumData() {
    return {
      boundaryX: this.getBoundaryX(),
      wavelengthScale: MEDIA.GLASS.wavelengthScale,
      amplitudeScale: MEDIA.GLASS.amplitudeScale,
      refractiveIndexGlass: MEDIA.GLASS.refractiveIndex,
      refractiveIndexAir: MEDIA.AIR.refractiveIndex
    };
  }

  public dispose(): void {
    this.mediumCube.geometry.dispose();
    (this.mediumCube.material as THREE.Material).dispose();
    this.boundaryLine.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        (obj as THREE.Mesh).geometry.dispose();
        const mat = (obj as THREE.Mesh).material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) {
          mat.forEach(m => m.dispose());
        } else {
          mat.dispose();
        }
      }
    });
    this.scene.remove(this.mediumCube);
    this.scene.remove(this.boundaryLine);
  }
}
