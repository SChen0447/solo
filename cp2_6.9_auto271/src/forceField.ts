import * as THREE from 'three';

export type ForceFieldType = 'vortex' | 'gravity' | 'repulsion';

export interface ForceField {
  id: string;
  type: ForceFieldType;
  position: THREE.Vector3;
  strength: number;
  radius: number;
  time?: number;
  lifetime?: number;
  startStrength?: number;
  angle?: number;
  rotationSpeed?: number;
  oscillate?: {
    minStrength: number;
    maxStrength: number;
    period: number;
    phase: number;
  };
}

export class ForceFieldManager {
  private fields: Map<string, ForceField> = new Map();
  private globalStrengthMultiplier: number = 1.0;

  addField(field: ForceField): void {
    this.fields.set(field.id, field);
  }

  removeField(id: string): void {
    this.fields.delete(id);
  }

  clear(): void {
    this.fields.clear();
  }

  getFields(): ForceField[] {
    return Array.from(this.fields.values());
  }

  setGlobalStrengthMultiplier(multiplier: number): void {
    this.globalStrengthMultiplier = multiplier;
  }

  getGlobalStrengthMultiplier(): number {
    return this.globalStrengthMultiplier;
  }

  update(deltaTime: number, elapsedTime: number): void {
    const toRemove: string[] = [];

    for (const field of this.fields.values()) {
      if (field.oscillate) {
        const { minStrength, maxStrength, period, phase } = field.oscillate;
        const t = (elapsedTime + phase) / period;
        const normalized = (Math.sin(t * Math.PI * 2) + 1) / 2;
        field.strength = minStrength + normalized * (maxStrength - minStrength);
      }

      if (field.type === 'vortex' && field.rotationSpeed !== undefined) {
        field.angle = (field.angle || 0) + field.rotationSpeed * deltaTime;
      }

      if (field.lifetime !== undefined) {
        field.time = (field.time || 0) + deltaTime;
        if (field.time >= field.lifetime) {
          toRemove.push(field.id);
        } else if (field.startStrength !== undefined) {
          const fade = 1 - field.time / field.lifetime;
          field.strength = field.startStrength * fade;
        }
      }
    }

    for (const id of toRemove) {
      this.fields.delete(id);
    }
  }

  calculateForce(
    particlePos: THREE.Vector3,
    particleVel: THREE.Vector3,
    outForce: THREE.Vector3
  ): void {
    outForce.set(0, 0, 0);
    const temp = new THREE.Vector3();

    for (const field of this.fields.values()) {
      temp.subVectors(particlePos, field.position);
      const distance = temp.length();

      if (distance > field.radius || distance < 0.001) {
        continue;
      }

      const falloff = 1 - distance / field.radius;
      const effectiveStrength = field.strength * this.globalStrengthMultiplier * falloff;

      switch (field.type) {
        case 'gravity':
          temp.normalize().multiplyScalar(-effectiveStrength);
          outForce.add(temp);
          break;

        case 'repulsion':
          temp.normalize().multiplyScalar(effectiveStrength);
          outForce.add(temp);
          break;

        case 'vortex': {
          const up = new THREE.Vector3(0, 1, 0);
          const tangent = new THREE.Vector3();
          tangent.crossVectors(up, temp).normalize();

          const inwardPull = temp.clone().normalize().multiplyScalar(-effectiveStrength * 0.3);
          tangent.multiplyScalar(effectiveStrength);

          outForce.add(tangent);
          outForce.add(inwardPull);

          const lift = new THREE.Vector3(0, effectiveStrength * 0.1, 0);
          outForce.add(lift);
          break;
        }
      }
    }
  }
}

export function createDefaultForceFields(): ForceField[] {
  const vortexCenter = new THREE.Vector3(
    (Math.random() - 0.5) * 2,
    (Math.random() - 0.5) * 2,
    (Math.random() - 0.5) * 2
  );

  return [
    {
      id: 'main-vortex',
      type: 'vortex',
      position: vortexCenter,
      strength: 0.02,
      radius: 5,
      angle: 0,
      rotationSpeed: 0.5
    },
    {
      id: 'static-gravity',
      type: 'gravity',
      position: new THREE.Vector3(0, 0, 0),
      strength: 0.01,
      radius: 3
    },
    {
      id: 'oscillating-repulsion',
      type: 'repulsion',
      position: new THREE.Vector3(2, 1, -1),
      strength: 0.01,
      radius: 4,
      oscillate: {
        minStrength: 0.005,
        maxStrength: 0.015,
        period: 4,
        phase: 0
      }
    }
  ];
}

export function createDraggedRepulsion(position: THREE.Vector3): ForceField {
  return {
    id: `drag-${Date.now()}-${Math.random()}`,
    type: 'repulsion',
    position: position.clone(),
    strength: 0.05,
    startStrength: 0.05,
    radius: 2,
    time: 0,
    lifetime: 2
  };
}

export function createPresetFields(preset: 'nebula' | 'tornado' | 'fountain'): ForceField[] {
  switch (preset) {
    case 'nebula':
      return createDefaultForceFields();

    case 'tornado':
      return [
        {
          id: 'tornado-vortex',
          type: 'vortex',
          position: new THREE.Vector3(0, 0, 0),
          strength: 0.04,
          radius: 8,
          angle: 0,
          rotationSpeed: 1.2
        },
        {
          id: 'tornado-updraft',
          type: 'gravity',
          position: new THREE.Vector3(0, 5, 0),
          strength: 0.02,
          radius: 6
        }
      ];

    case 'fountain':
      return [
        {
          id: 'fountain-base-repulsion',
          type: 'repulsion',
          position: new THREE.Vector3(0, -3, 0),
          strength: 0.03,
          radius: 2
        },
        {
          id: 'fountain-gravity',
          type: 'gravity',
          position: new THREE.Vector3(0, 3, 0),
          strength: 0.008,
          radius: 8
        },
        {
          id: 'fountain-swirl',
          type: 'vortex',
          position: new THREE.Vector3(0, 2, 0),
          strength: 0.015,
          radius: 6,
          angle: 0,
          rotationSpeed: 0.8
        }
      ];
  }
}
