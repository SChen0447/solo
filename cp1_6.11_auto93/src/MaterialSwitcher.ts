import * as THREE from 'three';
import { gsap } from 'gsap';

export interface MaterialPreset {
  name: string;
  color: number;
  roughness: number;
  metalness: number;
  transparent?: boolean;
  opacity?: number;
  ior?: number;
  map?: THREE.Texture | null;
  swatchColor: string;
}

function generateWoodTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 512, 0);
  gradient.addColorStop(0, '#8B4513');
  gradient.addColorStop(0.3, '#A0522D');
  gradient.addColorStop(0.5, '#8B4513');
  gradient.addColorStop(0.7, '#6B3510');
  gradient.addColorStop(1, '#8B4513');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 80; i++) {
    ctx.strokeStyle = `rgba(60, 30, 10, ${0.15 + Math.random() * 0.25})`;
    ctx.lineWidth = 1 + Math.random() * 3;
    ctx.beginPath();
    const y = Math.random() * 512;
    ctx.moveTo(0, y);
    for (let x = 0; x < 512; x += 20) {
      const offset = Math.sin(x * 0.02 + i * 0.5) * (5 + Math.random() * 10);
      ctx.lineTo(x, y + offset);
    }
    ctx.stroke();
  }

  for (let i = 0; i < 20; i++) {
    ctx.fillStyle = `rgba(40, 20, 5, ${0.3 + Math.random() * 0.3})`;
    ctx.beginPath();
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 3 + Math.random() * 8;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function generateMarbleTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f5f5f0';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 150; i++) {
    const gray = 200 + Math.random() * 40;
    ctx.strokeStyle = `rgba(${gray - 30}, ${gray - 25}, ${gray - 10}, ${0.2 + Math.random() * 0.4})`;
    ctx.lineWidth = 0.5 + Math.random() * 4;
    ctx.beginPath();
    const startX = Math.random() * 512;
    const startY = Math.random() * 512;
    ctx.moveTo(startX, startY);
    let x = startX;
    let y = startY;
    for (let j = 0; j < 50; j++) {
      x += (Math.random() - 0.5) * 40;
      y += (Math.random() - 0.5) * 40;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  for (let i = 0; i < 100; i++) {
    ctx.fillStyle = `rgba(180, 180, 190, ${0.1 + Math.random() * 0.2})`;
    ctx.beginPath();
    ctx.arc(Math.random() * 512, Math.random() * 512, Math.random() * 15, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.5, 1.5);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function generateBrushedMetalTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#888888');
  gradient.addColorStop(0.5, '#aaaaaa');
  gradient.addColorStop(1, '#888888');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 500; i++) {
    ctx.strokeStyle = `rgba(${200 + Math.random() * 55}, ${200 + Math.random() * 55}, ${200 + Math.random() * 55}, ${0.05 + Math.random() * 0.15})`;
    ctx.lineWidth = 0.3 + Math.random() * 1;
    ctx.beginPath();
    const y = Math.random() * 512;
    ctx.moveTo(0, y);
    ctx.lineTo(512, y + (Math.random() - 0.5) * 5);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function generateFabricTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#4a4a5a';
  ctx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y += 4) {
    for (let x = 0; x < 512; x += 4) {
      const shade = 60 + Math.random() * 40;
      ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade + 10})`;
      ctx.fillRect(x, y, 2, 2);
      ctx.fillStyle = `rgb(${shade + 20}, ${shade + 20}, ${shade + 30})`;
      ctx.fillRect(x + 2, y + 2, 2, 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class MaterialSwitcher {
  private presets: MaterialPreset[];
  private currentIndex: number = 0;
  private targets: THREE.Mesh[] = [];
  private activeTweens: gsap.core.Tween[] = [];

  constructor() {
    this.presets = [
      {
        name: '橡木',
        color: 0x8B4513,
        roughness: 0.7,
        metalness: 0.05,
        map: generateWoodTexture(),
        swatchColor: '#8B4513',
      },
      {
        name: '白色大理石',
        color: 0xf0f0eb,
        roughness: 0.3,
        metalness: 0.02,
        map: generateMarbleTexture(),
        swatchColor: '#f0f0eb',
      },
      {
        name: '拉丝金属',
        color: 0xaaaaaa,
        roughness: 0.2,
        metalness: 0.9,
        map: generateBrushedMetalTexture(),
        swatchColor: '#b8b8b8',
      },
      {
        name: '磨砂织物',
        color: 0x5a5a6a,
        roughness: 0.8,
        metalness: 0.0,
        map: generateFabricTexture(),
        swatchColor: '#5a5a6a',
      },
      {
        name: '镜面玻璃',
        color: 0xaaddff,
        roughness: 0.05,
        metalness: 0.0,
        transparent: true,
        opacity: 0.3,
        ior: 1.5,
        map: null,
        swatchColor: '#88ccff',
      },
      {
        name: '哑光黑漆',
        color: 0x111111,
        roughness: 0.6,
        metalness: 0.1,
        map: null,
        swatchColor: '#1a1a1a',
      },
    ];
  }

  setTargets(meshes: THREE.Mesh[]): void {
    this.targets = meshes;
    if (this.targets.length > 0) {
      this.applyMaterial(this.currentIndex, false);
    }
  }

  getPresets(): MaterialPreset[] {
    return this.presets;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  switchTo(index: number, animate: boolean = true): void {
    if (index < 0 || index >= this.presets.length || index === this.currentIndex) {
      if (index === this.currentIndex && this.targets.length > 0) {
        this.applyMaterial(index, animate);
      }
      return;
    }
    this.applyMaterial(index, animate);
  }

  private applyMaterial(index: number, animate: boolean): void {
    const preset = this.presets[index];
    this.currentIndex = index;

    this.activeTweens.forEach(t => t.kill());
    this.activeTweens = [];

    this.targets.forEach(mesh => {
      const currentMat = mesh.material as THREE.MeshPhysicalMaterial;
      
      const newMat = new THREE.MeshPhysicalMaterial({
        color: preset.color,
        roughness: preset.roughness,
        metalness: preset.metalness,
        transparent: preset.transparent || false,
        opacity: preset.opacity !== undefined ? preset.opacity : 1.0,
        ior: preset.ior !== undefined ? preset.ior : 1.5,
        transmission: preset.ior !== undefined ? 0.9 : 0,
        thickness: preset.ior !== undefined ? 0.5 : 0,
        map: preset.map,
      });
      newMat.needsUpdate = true;

      if (animate) {
        const proxyObj = {
          r: currentMat.color.r,
          g: currentMat.color.g,
          b: currentMat.color.b,
          roughness: currentMat.roughness,
          metalness: currentMat.metalness,
          opacity: currentMat.opacity,
        };

        const targetColor = new THREE.Color(preset.color);

        const tween = gsap.to(proxyObj, {
          r: targetColor.r,
          g: targetColor.g,
          b: targetColor.b,
          roughness: preset.roughness,
          metalness: preset.metalness,
          opacity: preset.opacity !== undefined ? preset.opacity : 1.0,
          duration: 0.4,
          ease: 'power2.out',
          onUpdate: () => {
            const mat = mesh.material as THREE.MeshPhysicalMaterial;
            mat.color.setRGB(proxyObj.r, proxyObj.g, proxyObj.b);
            mat.roughness = proxyObj.roughness;
            mat.metalness = proxyObj.metalness;
            mat.opacity = proxyObj.opacity;
            mat.needsUpdate = true;
          },
          onComplete: () => {
            mesh.material = newMat;
            currentMat.dispose();
          },
        });

        this.activeTweens.push(tween);
      } else {
        mesh.material = newMat;
        currentMat.dispose();
      }
    });
  }

  getCurrentColor(): THREE.Color {
    const preset = this.presets[this.currentIndex];
    return new THREE.Color(preset.color);
  }

  dispose(): void {
    this.activeTweens.forEach(t => t.kill());
    this.presets.forEach(p => {
      if (p.map) {
        p.map.dispose();
      }
    });
  }
}
