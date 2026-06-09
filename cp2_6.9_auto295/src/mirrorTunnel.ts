import * as THREE from 'three';
import { ColorPalette } from './colorPalette';

interface FragmentData {
  baseColorIndex: number;
  basePosition: THREE.Vector3;
  baseRotation: THREE.Euler;
  baseScale: number;
  brightnessBoost: number;
  brightnessDecay: number;
}

interface PulseWave {
  position: THREE.Vector3;
  light: THREE.PointLight;
  sphere: THREE.Mesh;
  radius: number;
  maxRadius: number;
  duration: number;
  elapsed: number;
  active: boolean;
  color: THREE.Color;
  affectedFragments: Set<number>;
}

export class MirrorTunnel {
  private scene: THREE.Scene;
  private colorPalette: ColorPalette;
  private group: THREE.Group;
  private mergedGeometry!: THREE.BufferGeometry;
  private material!: THREE.MeshPhongMaterial;
  private mesh!: THREE.Mesh;
  private fragmentCount: number;
  private fragmentData: FragmentData[];
  private tunnelLength: number = 100;
  private tunnelRadius: number = 5;

  private targetRotationX: number = 0;
  private targetRotationY: number = 0;
  private currentRotationX: number = 0;
  private currentRotationY: number = 0;
  private targetFragmentScale: number = 1;
  private currentFragmentScale: number = 1;
  private lerpFactor: number = 0.08;

  private pulseWaves: PulseWave[] = [];
  private sphereGeometry: THREE.SphereGeometry;

  private basePositions!: Float32Array;
  private originalColors!: Float32Array;

  constructor(scene: THREE.Scene, colorPalette: ColorPalette) {
    this.scene = scene;
    this.colorPalette = colorPalette;
    this.fragmentCount = 700;
    this.fragmentData = [];
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.sphereGeometry = new THREE.SphereGeometry(0.5, 16, 16);

    this.createTunnel();
  }

  private createTunnel(): void {
    this.fragmentData = [];
    const geometries: THREE.BufferGeometry[] = [];

    for (let i = 0; i < this.fragmentCount; i++) {
      const triangleGeometry = this.createTriangleFragment(i);
      geometries.push(triangleGeometry);
    }

    this.mergedGeometry = this.mergeGeometries(geometries);

    this.material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      specular: new THREE.Color(0xffffff),
      shininess: 100,
      reflectivity: 0.8,
      side: THREE.DoubleSide
    });
    (this.material as any).envMapIntensity = 0.3;

    this.mesh = new THREE.Mesh(this.mergedGeometry, this.material);
    this.group.add(this.mesh);

    const positionAttr = this.mergedGeometry.getAttribute('position') as THREE.BufferAttribute;
    this.basePositions = new Float32Array(positionAttr.array as Float32Array);

    const colorAttr = this.mergedGeometry.getAttribute('color') as THREE.BufferAttribute;
    this.originalColors = new Float32Array(colorAttr.array as Float32Array);
  }

  private createTriangleFragment(index: number): THREE.BufferGeometry {
    const z = (index / this.fragmentCount) * this.tunnelLength - this.tunnelLength / 2;
    const helixAngle = (index / this.fragmentCount) * Math.PI * 8 + (index * 0.1);
    const radialOffset = (index % 7) / 7 * Math.PI * 2;
    const angle = helixAngle + radialOffset;

    const radius = this.tunnelRadius + Math.sin(index * 0.05) * 1.5;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    const fragmentSize = 0.6 + Math.random() * 0.4;
    const gap = 0.015;

    const shape = new THREE.Shape();
    const s = fragmentSize;
    shape.moveTo(0, s);
    shape.lineTo(-s * 0.866, -s * 0.5);
    shape.lineTo(s * 0.866, -s * 0.5);
    shape.closePath();

    const triangleShape = new THREE.ShapeGeometry(shape);
    const positionAttr = triangleShape.getAttribute('position') as THREE.BufferAttribute;
    const positions = positionAttr.array as Float32Array;

    const rotX = Math.sin(index * 0.03) * 0.4;
    const rotY = angle;
    const rotZ = index * 0.02;

    for (let i = 0; i < positions.length; i += 3) {
      let px = positions[i];
      let py = positions[i + 1];
      let pz = positions[i + 2];

      const cosZ = Math.cos(rotZ);
      const sinZ = Math.sin(rotZ);
      const x1 = px * cosZ - py * sinZ;
      const y1 = px * sinZ + py * cosZ;
      px = x1;
      py = y1;

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const x2 = px * cosY + pz * sinY;
      const z2 = -px * sinY + pz * cosY;
      px = x2;
      pz = z2;

      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const y3 = py * cosX - pz * sinX;
      const z3 = py * sinX + pz * cosX;
      py = y3;
      pz = z3;

      const dirX = x / radius;
      const dirY = y / radius;
      px += dirX * gap;
      py += dirY * gap;

      positions[i] = px + x;
      positions[i + 1] = py + y;
      positions[i + 2] = pz + z;
    }

    triangleShape.computeVertexNormals();

    const colorIndex = Math.floor(Math.random() * 5);
    const baseColor = this.colorPalette.getColor(colorIndex);
    const colors = new Float32Array(9);
    for (let i = 0; i < 3; i++) {
      const variation = 0.85 + Math.random() * 0.3;
      colors[i * 3] = Math.min(baseColor.r * variation, 1);
      colors[i * 3 + 1] = Math.min(baseColor.g * variation, 1);
      colors[i * 3 + 2] = Math.min(baseColor.b * variation, 1);
    }
    triangleShape.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.fragmentData.push({
      baseColorIndex: colorIndex,
      basePosition: new THREE.Vector3(x, y, z),
      baseRotation: new THREE.Euler(rotX, rotY, rotZ),
      baseScale: fragmentSize,
      brightnessBoost: 1.0,
      brightnessDecay: 0
    });

    return triangleShape;
  }

  private mergeGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
    const merged = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    let vertexOffset = 0;

    for (let i = 0; i < geometries.length; i++) {
      const geo = geometries[i];
      const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
      const normAttr = geo.getAttribute('normal') as THREE.BufferAttribute;
      const colorAttr = geo.getAttribute('color') as THREE.BufferAttribute;
      const indexAttr = geo.getIndex();

      for (let j = 0; j < posAttr.count; j++) {
        positions.push(posAttr.getX(j), posAttr.getY(j), posAttr.getZ(j));
        normals.push(normAttr.getX(j), normAttr.getY(j), normAttr.getZ(j));
        colors.push(colorAttr.getX(j), colorAttr.getY(j), colorAttr.getZ(j));
      }

      if (indexAttr) {
        for (let j = 0; j < indexAttr.count; j++) {
          indices.push(indexAttr.getX(j) + vertexOffset);
        }
      } else {
        for (let j = 0; j < posAttr.count; j++) {
          indices.push(j + vertexOffset);
        }
      }

      vertexOffset += posAttr.count;
      geometries[i].dispose();
    }

    merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    merged.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    merged.setIndex(indices);

    return merged;
  }

  setMouseInput(mouseX: number, mouseY: number): void {
    this.targetRotationY = mouseX * Math.PI * 0.5;
    this.targetRotationX = mouseY * Math.PI * 0.3;
    this.targetFragmentScale = 1 + Math.abs(mouseX) * 0.15 + Math.abs(mouseY) * 0.1;
  }

  triggerPulse(): void {
    const randomColor = this.colorPalette.getRandomColor().clone();
    const complementColor = this.colorPalette.getComplementaryColor(randomColor);

    const light = new THREE.PointLight(randomColor, 2, 10);
    light.position.set(0, 0, 0);
    this.scene.add(light);

    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: complementColor,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    const sphere = new THREE.Mesh(this.sphereGeometry, sphereMaterial);
    sphere.position.set(0, 0, 0);
    this.scene.add(sphere);

    this.pulseWaves.push({
      position: new THREE.Vector3(0, 0, 0),
      light,
      sphere,
      radius: 0.5,
      maxRadius: 15,
      duration: 1,
      elapsed: 0,
      active: true,
      color: randomColor,
      affectedFragments: new Set()
    });
  }

  update(deltaTime: number, time: number): void {
    this.currentRotationX += (this.targetRotationX - this.currentRotationX) * this.lerpFactor;
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * this.lerpFactor;
    this.currentFragmentScale += (this.targetFragmentScale - this.currentFragmentScale) * this.lerpFactor;

    this.group.rotation.x = this.currentRotationX + Math.sin(time * 0.1) * 0.05;
    this.group.rotation.y = this.currentRotationY + time * 0.02;

    this.updateColors();
    this.updateFragmentScales();
    this.updateBrightness(deltaTime);
    this.updatePulseWaves(deltaTime);
  }

  private updateColors(): void {
    const colorAttr = this.mergedGeometry.getAttribute('color') as THREE.BufferAttribute;
    const colors = colorAttr.array as Float32Array;

    for (let i = 0; i < this.fragmentCount; i++) {
      const data = this.fragmentData[i];
      const paletteColor = this.colorPalette.getColor(data.baseColorIndex);
      const baseIdx = i * 9;

      for (let v = 0; v < 3; v++) {
        const vidx = baseIdx + v * 3;
        const origR = this.originalColors[vidx];
        const origG = this.originalColors[vidx + 1];
        const origB = this.originalColors[vidx + 2];

        const origLum = (origR + origG + origB) / 3;
        const variation = 0.85 + origLum * 0.3;

        colors[vidx] = Math.min(paletteColor.r * variation * data.brightnessBoost, 1);
        colors[vidx + 1] = Math.min(paletteColor.g * variation * data.brightnessBoost, 1);
        colors[vidx + 2] = Math.min(paletteColor.b * variation * data.brightnessBoost, 1);
      }
    }

    colorAttr.needsUpdate = true;
  }

  private updateFragmentScales(): void {
    const posAttr = this.mergedGeometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const scale = this.currentFragmentScale;

    for (let i = 0; i < this.fragmentCount; i++) {
      const data = this.fragmentData[i];
      const baseIdx = i * 9;
      const cx = data.basePosition.x;
      const cy = data.basePosition.y;
      const cz = data.basePosition.z;

      for (let v = 0; v < 3; v++) {
        const vidx = baseIdx + v * 3;
        const origX = this.basePositions[vidx];
        const origY = this.basePositions[vidx + 1];
        const origZ = this.basePositions[vidx + 2];

        positions[vidx] = cx + (origX - cx) * scale;
        positions[vidx + 1] = cy + (origY - cy) * scale;
        positions[vidx + 2] = cz + (origZ - cz) * scale;
      }
    }

    posAttr.needsUpdate = true;
    this.mergedGeometry.computeVertexNormals();
  }

  private updateBrightness(deltaTime: number): void {
    for (let i = 0; i < this.fragmentCount; i++) {
      const data = this.fragmentData[i];
      if (data.brightnessBoost > 1.0) {
        data.brightnessBoost -= deltaTime * (1 / 0.3);
        if (data.brightnessBoost < 1.0) {
          data.brightnessBoost = 1.0;
        }
      }
    }
  }

  private updatePulseWaves(deltaTime: number): void {
    for (let i = this.pulseWaves.length - 1; i >= 0; i--) {
      const pulse = this.pulseWaves[i];
      if (!pulse.active) continue;

      pulse.elapsed += deltaTime;
      const t = pulse.elapsed / pulse.duration;

      if (t >= 1) {
        this.scene.remove(pulse.light);
        this.scene.remove(pulse.sphere);
        (pulse.sphere.material as THREE.Material).dispose();
        pulse.active = false;
        this.pulseWaves.splice(i, 1);
        continue;
      }

      pulse.radius = 0.5 + t * (pulse.maxRadius - 0.5);
      pulse.light.distance = pulse.radius * 1.5;
      pulse.light.intensity = 2 * (1 - t);

      const sphereScale = pulse.radius / 0.5;
      pulse.sphere.scale.set(sphereScale, sphereScale, sphereScale);
      const sphereMat = pulse.sphere.material as THREE.MeshBasicMaterial;
      sphereMat.opacity = 0.6 * (1 - t);

      this.checkFragmentPulseCollision(pulse);
    }
  }

  private checkFragmentPulseCollision(pulse: PulseWave): void {
    for (let i = 0; i < this.fragmentCount; i++) {
      if (pulse.affectedFragments.has(i)) continue;

      const data = this.fragmentData[i];
      const dx = data.basePosition.x - pulse.position.x;
      const dy = data.basePosition.y - pulse.position.y;
      const dz = data.basePosition.z - pulse.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist <= pulse.radius) {
        pulse.affectedFragments.add(i);
        data.brightnessBoost = 1.5;
      }
    }
  }

  dispose(): void {
    this.mergedGeometry.dispose();
    this.material.dispose();
    this.sphereGeometry.dispose();
    this.scene.remove(this.group);

    for (const pulse of this.pulseWaves) {
      this.scene.remove(pulse.light);
      this.scene.remove(pulse.sphere);
      (pulse.sphere.material as THREE.Material).dispose();
    }
  }
}
