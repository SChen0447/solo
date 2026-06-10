import * as THREE from 'three';
import type { ElementalType } from './Elemental';
import { ELEMENTAL_CONFIG } from './Elemental';
import { ParticleSystem } from './ParticleSystem';
import { MusicPlayer } from './MusicPlayer';

export interface StringVibration {
  index: number;
  amplitude: number;
  maxAmplitude: number;
  time: number;
  duration: number;
  frequency: number;
  isResonance: boolean;
}

export interface TriggerResult {
  triggeredStrings: { index: number; frequency: number; color: THREE.Color }[];
  hitPosition: THREE.Vector3;
}

export class Harp {
  private scene: THREE.Scene;
  private group: THREE.Group;
  private stringMeshes: THREE.Line[] = [];
  private stringGeometries: THREE.BufferGeometry[] = [];
  private stringColors: THREE.Color[] = [];
  private vibrations: Map<number, StringVibration> = new Map();
  private frameGroup: THREE.Group;
  private readonly STRING_COUNT = 12;
  private readonly STRING_HEIGHT = 3;
  private readonly STRING_SPACING = 0.35;
  private particleSystem: ParticleSystem;
  private musicPlayer: MusicPlayer;
  private harpGlowMesh: THREE.Mesh | null = null;
  private glowIntensity: number = 0;

  constructor(scene: THREE.Scene, particleSystem: ParticleSystem, musicPlayer: MusicPlayer) {
    this.scene = scene;
    this.particleSystem = particleSystem;
    this.musicPlayer = musicPlayer;

    this.group = new THREE.Group();
    this.group.position.y = 0.5;

    this.frameGroup = new THREE.Group();
    this.createFrame();
    this.group.add(this.frameGroup);

    this.createStrings();

    this.createHarpGlow();

    this.scene.add(this.group);
  }

  private createHarpGlow(): void {
    const glowGeo = new THREE.SphereGeometry(2.5, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x66ccff,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide
    });
    this.harpGlowMesh = new THREE.Mesh(glowGeo, glowMat);
    this.group.add(this.harpGlowMesh);
  }

  public triggerFullGlow(): void {
    this.glowIntensity = 1;
    this.particleSystem.emitFullscreenBurst();
    for (let i = 0; i < this.STRING_COUNT; i++) {
      this.startVibration(i, 0.1, 1.0, 261.63, false);
      this.musicPlayer.playNote(261.63 + i * 30, 0.15, 1.0);
    }
  }

  private createFrame(): void {
    const frameColor1 = new THREE.Color(0x33cc66);
    const frameColor2 = new THREE.Color(0x6633cc);

    const leftPillar = this.createPillar(-(this.STRING_COUNT - 1) * this.STRING_SPACING / 2 - 0.3, frameColor1);
    const rightPillar = this.createPillar((this.STRING_COUNT - 1) * this.STRING_SPACING / 2 + 0.3, frameColor2);
    this.frameGroup.add(leftPillar, rightPillar);

    const topArc = this.createTopArc(frameColor1, frameColor2);
    this.frameGroup.add(topArc);

    const bottomBar = this.createBottomBar(frameColor1, frameColor2);
    this.frameGroup.add(bottomBar);
  }

  private createPillar(x: number, color: THREE.Color): THREE.Mesh {
    const height = this.STRING_HEIGHT + 0.8;
    const geo = new THREE.CylinderGeometry(0.1, 0.12, height, 12);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0, 0);
    return mesh;
  }

  private createTopArc(color1: THREE.Color, color2: THREE.Color): THREE.Group {
    const group = new THREE.Group();
    const segments = 40;
    const width = (this.STRING_COUNT - 1) * this.STRING_SPACING + 0.6;
    const height = 0.6;

    for (let i = 0; i < segments; i++) {
      const t1 = i / segments;
      const t2 = (i + 1) / segments;
      const x1 = -width / 2 + t1 * width;
      const x2 = -width / 2 + t2 * width;
      const y1 = this.STRING_HEIGHT / 2 + 0.3 + Math.sin(t1 * Math.PI) * height;
      const y2 = this.STRING_HEIGHT / 2 + 0.3 + Math.sin(t2 * Math.PI) * height;

      const color = new THREE.Color().lerpColors(color1, color2, t1);
      const geo = new THREE.CylinderGeometry(0.08, 0.08, 0.1, 8);
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
      const mesh = new THREE.Mesh(geo, mat);

      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
      mesh.rotation.z = angle - Math.PI / 2;
      mesh.scale.y = len / 0.1;

      group.add(mesh);
    }

    return group;
  }

  private createBottomBar(color1: THREE.Color, color2: THREE.Color): THREE.Mesh {
    const width = (this.STRING_COUNT - 1) * this.STRING_SPACING + 0.6;
    const geo = new THREE.BoxGeometry(width, 0.15, 0.15);

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 1;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 256, 0);
    gradient.addColorStop(0, '#' + color1.getHexString());
    gradient.addColorStop(1, '#' + color2.getHexString());
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 1);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.9 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, -this.STRING_HEIGHT / 2 - 0.2, 0);
    return mesh;
  }

  private createStrings(): void {
    const rainbowColors = [
      0xff3333, 0xff6633, 0xffaa33, 0xffdd33,
      0xaaff33, 0x33ff66, 0x33ffcc, 0x33ccff,
      0x3366ff, 0x6633ff, 0xaa33ff, 0xff33cc
    ];

    for (let i = 0; i < this.STRING_COUNT; i++) {
      const x = (i - (this.STRING_COUNT - 1) / 2) * this.STRING_SPACING;
      const color = new THREE.Color(rainbowColors[i]);
      this.stringColors.push(color);

      const opacity = 0.5 + 0.3 * (i / this.STRING_COUNT);
      const segments = 30;
      const positions: number[] = [];

      for (let j = 0; j <= segments; j++) {
        const t = j / segments;
        const y = -this.STRING_HEIGHT / 2 + t * this.STRING_HEIGHT;
        positions.push(x, y, 0);
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      this.stringGeometries.push(geometry);

      const material = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity
      });

      const line = new THREE.Line(geometry, material);
      this.stringMeshes.push(line);
      this.group.add(line);
    }
  }

  public update(delta: number): void {
    if (this.glowIntensity > 0 && this.harpGlowMesh) {
      this.glowIntensity -= delta * 0.5;
      const mat = this.harpGlowMesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, this.glowIntensity * 0.3);
    }

    this.vibrations.forEach((vib, index) => {
      vib.time += delta;
      if (vib.time >= vib.duration) {
        this.vibrations.delete(index);
        this.resetString(index);
        return;
      }
      this.updateStringVibration(index, vib);
    });

    this.frameGroup.rotation.z = Math.sin(Date.now() * 0.0003) * 0.02;
  }

  private updateStringVibration(index: number, vib: StringVibration): void {
    const geo = this.stringGeometries[index];
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const segments = posAttr.count - 1;
    const baseX = (index - (this.STRING_COUNT - 1) / 2) * this.STRING_SPACING;

    const decay = 1 - vib.time / vib.duration;
    const currentAmplitude = vib.maxAmplitude * Math.pow(decay, 2);

    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      const y = -this.STRING_HEIGHT / 2 + t * this.STRING_HEIGHT;
      const wave = Math.sin(t * Math.PI) * Math.sin(vib.time * vib.frequency * 8) * currentAmplitude;
      posAttr.setXYZ(j, baseX + wave, y, wave * 0.5);
    }
    posAttr.needsUpdate = true;

    const lineMat = this.stringMeshes[index].material as THREE.LineBasicMaterial;
    lineMat.opacity = 0.7 + 0.3 * decay;
  }

  private resetString(index: number): void {
    const geo = this.stringGeometries[index];
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const segments = posAttr.count - 1;
    const baseX = (index - (this.STRING_COUNT - 1) / 2) * this.STRING_SPACING;

    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      const y = -this.STRING_HEIGHT / 2 + t * this.STRING_HEIGHT;
      posAttr.setXYZ(j, baseX, y, 0);
    }
    posAttr.needsUpdate = true;

    const lineMat = this.stringMeshes[index].material as THREE.LineBasicMaterial;
    lineMat.opacity = 0.5 + 0.3 * (index / this.STRING_COUNT);
  }

  public triggerString(stringIndex: number, elementalType: ElementalType): TriggerResult {
    const config = ELEMENTAL_CONFIG[elementalType];
    const frequency = config.frequency;
    const color = new THREE.Color(config.color);

    const triggered: { index: number; frequency: number; color: THREE.Color }[] = [];
    const hitPosition = this.getStringWorldPosition(stringIndex);

    this.startVibration(stringIndex, 0.2, 1.5, frequency, false);
    triggered.push({ index: stringIndex, frequency, color });
    this.musicPlayer.playNote(frequency, 0.3, 1.5);
    this.particleSystem.emitBurst(hitPosition, color, 10 + Math.floor(Math.random() * 6));

    const resonanceChain: { index: number; distance: number }[] = [];
    for (let i = 0; i < this.STRING_COUNT; i++) {
      if (i === stringIndex) continue;
      const distance = Math.abs(i - stringIndex);
      if (distance <= 3) {
        resonanceChain.push({ index: i, distance });
      }
    }

    resonanceChain.sort((a, b) => a.distance - b.distance);

    resonanceChain.forEach((item, chainIdx) => {
      const probabilities: Record<number, number> = { 1: 0.7, 2: 0.5, 3: 0.3 };
      const probability = probabilities[item.distance] || 0;

      if (Math.random() < probability) {
        setTimeout(() => {
          const resFreq = 261.63 + item.index * 35;
          const resColor = this.stringColors[item.index];
          this.startVibration(item.index, 0.1, 1.0, resFreq, true);
          this.musicPlayer.playNote(resFreq, 0.15, 1.0);
          this.particleSystem.emitBurst(this.getStringWorldPosition(item.index), resColor, 4 + Math.floor(Math.random() * 4));

          if (!triggered.find(t => t.index === item.index)) {
            triggered.push({ index: item.index, frequency: resFreq, color: resColor });
          }
        }, chainIdx * 80);
      }
    });

    return {
      triggeredStrings: triggered,
      hitPosition
    };
  }

  private startVibration(index: number, maxAmplitude: number, duration: number, frequency: number, isResonance: boolean): void {
    this.vibrations.set(index, {
      index,
      amplitude: maxAmplitude,
      maxAmplitude,
      time: 0,
      duration,
      frequency,
      isResonance
    });
  }

  public getStringWorldPosition(index: number): THREE.Vector3 {
    const x = (index - (this.STRING_COUNT - 1) / 2) * this.STRING_SPACING;
    const pos = new THREE.Vector3(x, 0, 0);
    this.group.localToWorld(pos);
    return pos;
  }

  public setScale(scale: number): void {
    this.group.scale.setScalar(scale);
  }

  public getGroup(): THREE.Group {
    return this.group;
  }

  public dispose(): void {
    this.scene.remove(this.group);
    this.stringMeshes.forEach(line => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    });
    this.frameGroup.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}
