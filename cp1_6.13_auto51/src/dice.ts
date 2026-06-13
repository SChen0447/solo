import * as THREE from 'three';
import { DICE_COLORS } from './tower';

const TAROT_SYMBOLS: Record<number, { name: string; meaning: string }> = {
  1: { name: '太阳', meaning: '成功与活力，光明照耀前路' },
  2: { name: '女祭司', meaning: '直觉与智慧，静观其变' },
  3: { name: '皇后', meaning: '丰饶与创造，母性的力量' },
  4: { name: '皇帝', meaning: '权威与秩序，稳固的根基' },
  5: { name: '教皇', meaning: '信仰与传承，精神的指引' },
  6: { name: '恋人', meaning: '和谐与选择，爱的联结' }
};

const BOUNCE_HEIGHTS = [2.5, 1.8, 1.0];
const BOUNCE_DURATIONS = [500, 400, 350];
const TOTAL_BOUNCE_TIME = BOUNCE_DURATIONS.reduce((a, b) => a + b, 0) + 500;

export class Dice {
  public group: THREE.Group;
  public hologramGroup: THREE.Group;
  private diceMesh: THREE.Mesh;
  private numberTextures: THREE.CanvasTexture[] = [];
  private currentValue: number = 1;
  private isRolling: boolean = false;
  private hologramVisible: boolean = false;
  private hologramParticles: THREE.Points;
  private hologramSymbol: THREE.Line;
  private hologramFade: number = 0;
  private targetHologramFade: number = 0;
  private audioContext: AudioContext | null = null;

  constructor() {
    this.group = new THREE.Group();
    this.hologramGroup = new THREE.Group();
    this.hologramGroup.visible = false;

    this.createNumberTextures();
    this.diceMesh = this.createDiceMesh();
    this.group.add(this.diceMesh);

    this.hologramSymbol = this.createHologramSymbol();
    this.hologramGroup.add(this.hologramSymbol);

    this.hologramParticles = this.createHologramParticles();
    this.hologramGroup.add(this.hologramParticles);

    this.hologramGroup.position.set(0, 3.5, 0);
    this.group.add(this.hologramGroup);
  }

  private createNumberTextures() {
    const dotPositions: Record<number, number[][]> = {
      1: [[0.5, 0.5]],
      2: [[0.25, 0.25], [0.75, 0.75]],
      3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
      4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
      5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
      6: [[0.25, 0.2], [0.75, 0.2], [0.25, 0.5], [0.75, 0.5], [0.25, 0.8], [0.75, 0.8]]
    };

    for (let i = 1; i <= 6; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;

      const colorHex = DICE_COLORS[i].toString(16).padStart(6, '0');
      ctx.fillStyle = `#${colorHex}`;
      ctx.fillRect(0, 0, 256, 256);

      ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
      ctx.strokeStyle = 'rgba(180, 140, 20, 0.8)';
      ctx.lineWidth = 3;

      const dots = dotPositions[i];
      const dotRadius = 25;

      dots.forEach(([x, y]) => {
        const px = x * 256;
        const py = y * 256;

        const gradient = ctx.createRadialGradient(px - 5, py - 5, 0, px, py, dotRadius);
        gradient.addColorStop(0, 'rgba(255, 240, 150, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 215, 0, 0.9)');
        gradient.addColorStop(1, 'rgba(200, 160, 40, 0.8)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      this.numberTextures.push(texture);
    }
  }

  private createDiceMesh(): THREE.Mesh {
    const size = 0.7;
    const geometry = new THREE.BoxGeometry(size, size, size);

    const materials: THREE.MeshPhysicalMaterial[] = [];

    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshPhysicalMaterial({
        map: this.numberTextures[i],
        metalness: 0.1,
        roughness: 0.3,
        clearcoat: 0.6,
        clearcoatRoughness: 0.2,
        bumpScale: 0.02
      });
      materials.push(mat);
    }

    const mesh = new THREE.Mesh(geometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  private createHologramSymbol(): THREE.Line {
    const points: THREE.Vector3[] = [];
    const segments = 64;
    const radius = 1;

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const r = radius + Math.sin(angle * 6) * 0.15;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r * 0.8;
      points.push(new THREE.Vector3(x, y, 0));
    }

    for (let i = 0; i <= 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const innerR = radius * 0.5;
      const outerR = radius * 0.85;
      points.push(new THREE.Vector3(Math.cos(angle) * innerR, Math.sin(angle) * innerR * 0.8, 0));
      points.push(new THREE.Vector3(Math.cos(angle) * outerR, Math.sin(angle) * outerR * 0.8, 0));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.8
    });

    return new THREE.Line(geometry, material);
  }

  private createHologramParticles(): THREE.Points {
    const particleCount = 100;
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.8 + Math.random() * 0.6;
      const height = (Math.random() - 0.5) * 1.5;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
      sizes[i] = Math.random() * 3 + 1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      color: 0x88ccff,
      size: 0.05,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    return new THREE.Points(geometry, material);
  }

  public roll(targetValue: number, spawnPos: THREE.Vector3): Promise<number> {
    return new Promise((resolve) => {
      if (this.isRolling) {
        resolve(this.currentValue);
        return;
      }

      this.isRolling = true;
      this.currentValue = targetValue;
      this.hideHologram();

      this.group.position.copy(spawnPos);
      this.diceMesh.rotation.set(0, 0, 0);

      const finalY = 0.4;
      const startX = spawnPos.x;
      const startZ = spawnPos.z;
      const endX = 0.3;
      const endZ = 0.2;

      let bounceIndex = 0;
      let bounceStartTime = performance.now();

      const rollRotation = () => {
        this.diceMesh.rotation.x += 0.3;
        this.diceMesh.rotation.y += 0.2;
        this.diceMesh.rotation.z += 0.15;
      };

      const animate = (now: number) => {
        const elapsed = now - bounceStartTime;
        const duration = BOUNCE_DURATIONS[bounceIndex];
        const t = Math.min(elapsed / duration, 1);

        const height = BOUNCE_HEIGHTS[bounceIndex];
        const yOffset = height * (1 - Math.pow(t * 2 - 1, 2));

        const baseY = bounceIndex === 0 ? spawnPos.y : finalY;
        const targetBaseY = finalY;
        const interpBaseY = baseY + (targetBaseY - baseY) * (1 - yOffset / height);

        this.group.position.y = interpBaseY + yOffset;

        const progress = Math.min(1, (now - bounceStartTime + bounceIndex * 400) / (TOTAL_BOUNCE_TIME - 200));
        this.group.position.x = startX + (endX - startX) * progress;
        this.group.position.z = startZ + (endZ - startZ) * progress;

        rollRotation();

        if (t >= 0.5 && t < 0.55) {
          this.playBounceSound(0.3 + bounceIndex * 0.2);
        }

        if (t >= 1) {
          bounceIndex++;
          bounceStartTime = now;

          if (bounceIndex >= BOUNCE_HEIGHTS.length) {
            this.group.position.y = finalY;
            this.group.position.x = endX;
            this.group.position.z = endZ;
            this.settleDice(targetValue);
            this.isRolling = false;
            resolve(targetValue);
            return;
          }
        }

        requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);
    });
  }

  private settleDice(value: number) {
    const rotations: Record<number, { x: number; y: number; z: number }> = {
      1: { x: 0, y: 0, z: 0 },
      2: { x: Math.PI / 2, y: 0, z: 0 },
      3: { x: 0, y: -Math.PI / 2, z: 0 },
      4: { x: 0, y: Math.PI / 2, z: 0 },
      5: { x: -Math.PI / 2, y: 0, z: 0 },
      6: { x: Math.PI, y: 0, z: 0 }
    };

    const targetRot = rotations[value];
    const startX = this.diceMesh.rotation.x;
    const startY = this.diceMesh.rotation.y;
    const startZ = this.diceMesh.rotation.z;
    const duration = 300;
    const startTime = performance.now();

    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);

      this.diceMesh.rotation.x = startX + (targetRot.x - startX) * eased;
      this.diceMesh.rotation.y = startY + (targetRot.y - startY) * eased;
      this.diceMesh.rotation.z = startZ + (targetRot.z - startZ) * eased;

      if (t < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  public showHologram(value: number): Promise<void> {
    return new Promise((resolve) => {
      this.hologramVisible = true;
      this.hologramGroup.visible = true;
      this.targetHologramFade = 1;

      const color = new THREE.Color(DICE_COLORS[value] || 0xffffff);
      (this.hologramSymbol.material as THREE.LineBasicMaterial).color.copy(color);
      (this.hologramParticles.material as THREE.PointsMaterial).color.copy(color);

      const symbolData = TAROT_SYMBOLS[value];
      console.log(`塔罗符号: ${symbolData.name} - ${symbolData.meaning}`);

      setTimeout(() => {
        this.hideHologram();
        setTimeout(resolve, 1000);
      }, 3000);
    });
  }

  public hideHologram() {
    this.targetHologramFade = 0;
    setTimeout(() => {
      if (this.targetHologramFade === 0) {
        this.hologramGroup.visible = false;
        this.hologramVisible = false;
      }
    }, 1000);
  }

  private playBounceSound(volume: number) {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = this.audioContext;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.1);

      gainNode.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.15);
    } catch (e) {
    }
  }

  public update(delta: number, time: number) {
    this.hologramFade += (this.targetHologramFade - this.hologramFade) * delta * 4;

    if (this.hologramGroup.visible) {
      (this.hologramSymbol.material as THREE.LineBasicMaterial).opacity = this.hologramFade * 0.8;
      (this.hologramParticles.material as THREE.PointsMaterial).opacity = this.hologramFade * 0.6;

      this.hologramGroup.rotation.y += delta * 0.5;
      this.hologramSymbol.rotation.z += delta * 0.3;

      const positions = this.hologramParticles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3 + 1] += Math.sin(time * 2 + i) * delta * 0.1;
      }
      this.hologramParticles.geometry.attributes.position.needsUpdate = true;

      const scale = 1 + Math.sin(time * 1.5) * 0.05;
      this.hologramGroup.scale.setScalar(scale);
    }
  }

  public getCurrentValue(): number {
    return this.currentValue;
  }

  public getTarotInfo(value: number): { name: string; meaning: string } {
    return TAROT_SYMBOLS[value] || { name: '未知', meaning: '神秘的启示' };
  }
}
