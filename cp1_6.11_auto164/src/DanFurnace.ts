import * as THREE from 'three';
import { COLOR_SCHEME } from './constants';

export class DanFurnace {
  public group: THREE.Group;
  private furnaceBody!: THREE.Mesh;
  private furnaceLid!: THREE.Mesh;
  private furnaceRing!: THREE.Mesh;
  private smokeParticles!: THREE.Points;
  private smokeVelocities: number[] = [];
  private smokeNum = 80;
  private textureCanvas: HTMLCanvasElement;

  constructor() {
    this.group = new THREE.Group();
    this.textureCanvas = document.createElement('canvas');
    this.createTexture();
    this.createFurnace();
    this.createSmoke();
  }

  private createTexture(): void {
    const canvas = this.textureCanvas;
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = '#4a3728';
    ctx.fillRect(0, 0, 512, 512);
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#6b4423');
    gradient.addColorStop(0.5, '#4a3728');
    gradient.addColorStop(1, '#2d1f14');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.6;
    
    for (let y = 30; y < 512; y += 60) {
      ctx.beginPath();
      this.drawTaotiePattern(ctx, y);
      ctx.stroke();
    }
    
    ctx.globalAlpha = 1;
    
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const radius = Math.random() * 2 + 1;
      ctx.fillStyle = `rgba(${100 + Math.random() * 50}, ${60 + Math.random() * 30}, ${20 + Math.random() * 20}, ${0.3 + Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawTaotiePattern(ctx: CanvasRenderingContext2D, y: number): void {
    const width = 512;
    const patternWidth = 100;
    const numPatterns = Math.floor(width / patternWidth);
    
    for (let i = 0; i < numPatterns; i++) {
      const x = i * patternWidth + patternWidth / 2;
      const h = 40;
      
      ctx.moveTo(x - 40, y);
      ctx.lineTo(x - 20, y - h / 2);
      ctx.lineTo(x, y - h);
      ctx.lineTo(x + 20, y - h / 2);
      ctx.lineTo(x + 40, y);
      ctx.lineTo(x + 20, y + h / 2);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x - 20, y + h / 2);
      ctx.closePath();
      
      ctx.moveTo(x - 15, y - 10);
      ctx.arc(x - 15, y - 10, 5, 0, Math.PI * 2);
      
      ctx.moveTo(x + 15, y - 10);
      ctx.arc(x + 15, y - 10, 5, 0, Math.PI * 2);
    }
  }

  private createFurnace(): void {
    const texture = new THREE.CanvasTexture(this.textureCanvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 3);
    
    const bodyGeometry = new THREE.CylinderGeometry(1.5, 1.2, 2.5, 32, 1, true);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      color: 0x8b6914,
      roughness: 0.7,
      metalness: 0.3,
      side: THREE.DoubleSide
    });
    this.furnaceBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.furnaceBody.position.y = 0;
    this.group.add(this.furnaceBody);
    
    const bottomGeometry = new THREE.CircleGeometry(1.2, 32);
    const bottomMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.8,
      metalness: 0.2,
      side: THREE.DoubleSide
    });
    const bottom = new THREE.Mesh(bottomGeometry, bottomMaterial);
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = -1.25;
    this.group.add(bottom);
    
    const ringGeometry = new THREE.TorusGeometry(1.6, 0.15, 16, 32);
    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0x6b4423,
      roughness: 0.6,
      metalness: 0.4
    });
    this.furnaceRing = new THREE.Mesh(ringGeometry, ringMaterial);
    this.furnaceRing.rotation.x = Math.PI / 2;
    this.furnaceRing.position.y = 1.2;
    this.group.add(this.furnaceRing);
    
    const lidGeometry = new THREE.ConeGeometry(1.4, 1, 32, 1, true);
    const lidMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      color: 0x8b6914,
      roughness: 0.7,
      metalness: 0.3
    });
    this.furnaceLid = new THREE.Mesh(lidGeometry, lidMaterial);
    this.furnaceLid.position.y = 2;
    this.group.add(this.furnaceLid);
    
    const lidTopGeometry = new THREE.SphereGeometry(0.25, 16, 16);
    const lidTopMaterial = new THREE.MeshStandardMaterial({
      color: 0x6b4423,
      roughness: 0.5,
      metalness: 0.5
    });
    const lidTop = new THREE.Mesh(lidTopGeometry, lidTopMaterial);
    lidTop.position.y = 2.6;
    this.group.add(lidTop);
    
    const legGeometry = new THREE.CylinderGeometry(0.15, 0.2, 1, 16);
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.7,
      metalness: 0.3
    });
    
    for (let i = 0; i < 3; i++) {
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      const angle = (i / 3) * Math.PI * 2;
      leg.position.set(
        Math.cos(angle) * 0.9,
        -1.7,
        Math.sin(angle) * 0.9
      );
      this.group.add(leg);
    }
  }

  private createSmoke(): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.smokeNum * 3);
    const sizes = new Float32Array(this.smokeNum);
    const opacities = new Float32Array(this.smokeNum);
    
    for (let i = 0; i < this.smokeNum; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 1.5;
      positions[i * 3 + 1] = 2 + Math.random() * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
      
      sizes[i] = Math.random() * 3 + 2;
      opacities[i] = Math.random() * 0.5 + 0.2;
      
      this.smokeVelocities.push(Math.random() * 0.02 + 0.01);
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
    
    const sprite = this.createSmokeSprite();
    
    const material = new THREE.PointsMaterial({
      map: sprite,
      size: 0.3,
      vertexColors: false,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: new THREE.Color(COLOR_SCHEME.smokeStart)
    });
    
    this.smokeParticles = new THREE.Points(geometry, material);
    this.smokeParticles.position.y = 0.5;
    this.group.add(this.smokeParticles);
  }

  private createSmokeSprite(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(212, 201, 168, 0.8)');
    gradient.addColorStop(0.4, 'rgba(212, 201, 168, 0.4)');
    gradient.addColorStop(1, 'rgba(168, 168, 168, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    return new THREE.CanvasTexture(canvas);
  }

  public update(delta: number): void {
    const positions = this.smokeParticles.geometry.attributes.position.array as Float32Array;
    const opacities = this.smokeParticles.geometry.attributes.opacity.array as Float32Array;
    const sizes = this.smokeParticles.geometry.attributes.size.array as Float32Array;
    
    for (let i = 0; i < this.smokeNum; i++) {
      positions[i * 3 + 1] += this.smokeVelocities[i] * delta * 60;
      
      positions[i * 3] += Math.sin(Date.now() * 0.001 + i) * 0.002;
      positions[i * 3 + 2] += Math.cos(Date.now() * 0.001 + i) * 0.002;
      
      const height = positions[i * 3 + 1] - 2;
      const maxHeight = 4;
      if (height > maxHeight) {
        positions[i * 3] = (Math.random() - 0.5) * 1.5;
        positions[i * 3 + 1] = 2;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
        opacities[i] = Math.random() * 0.5 + 0.2;
        sizes[i] = Math.random() * 3 + 2;
      } else {
        const alpha = 1 - height / maxHeight;
        opacities[i] = alpha * 0.6;
        sizes[i] = (2 + height / maxHeight * 3) * 0.1;
      }
    }
    
    this.smokeParticles.geometry.attributes.position.needsUpdate = true;
    this.smokeParticles.geometry.attributes.opacity.needsUpdate = true;
    this.smokeParticles.geometry.attributes.size.needsUpdate = true;
  }

  public getMouthPosition(): THREE.Vector3 {
    return new THREE.Vector3(0, 1.5, 0);
  }
}
