import * as THREE from 'three';

export class Environment {
  private scene: THREE.Scene;
  private domeMesh: THREE.Mesh;
  private groundMesh: THREE.Mesh;
  private stars: THREE.Points;
  private starCount: number = 200;
  private domeRadius: number = 100;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    this.domeMesh = this.createDome();
    this.groundMesh = this.createGround();
    this.stars = this.createStars();
    
    this.scene.add(this.domeMesh);
    this.scene.add(this.groundMesh);
    this.scene.add(this.stars);
  }

  private createDome(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(this.domeRadius, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    
    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    
    const topColor = new THREE.Color(0x0a0e2a);
    const bottomColor = new THREE.Color(0x1a2744);
    
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i) / this.domeRadius;
      const t = Math.max(0, Math.min(1, y));
      
      const color = new THREE.Color().lerpColors(bottomColor, topColor, t);
      
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      fog: false
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    return mesh;
  }

  private createSnowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    
    const ctx = canvas.getContext('2d')!;
    
    ctx.fillStyle = '#1a2040';
    ctx.fillRect(0, 0, 512, 512);
    
    const imageData = ctx.getImageData(0, 0, 512, 512);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const noise = Math.random() * 60;
      const baseValue = 40 + noise;
      data[i] = Math.min(255, baseValue + 30);
      data[i + 1] = Math.min(255, baseValue + 40);
      data[i + 2] = Math.min(255, baseValue + 60);
      data[i + 3] = 255;
    }
    
    for (let i = 0; i < 2000; i++) {
      const x = Math.floor(Math.random() * 512);
      const y = Math.floor(Math.random() * 512);
      const size = Math.random() * 2 + 1;
      const brightness = Math.random() * 100 + 155;
      
      const index = (y * 512 + x) * 4;
      data[index] = Math.min(255, data[index] + brightness);
      data[index + 1] = Math.min(255, data[index + 1] + brightness);
      data[index + 2] = Math.min(255, data[index + 2] + brightness);
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    
    return texture;
  }

  private createGround(): THREE.Mesh {
    const geometry = new THREE.CircleGeometry(this.domeRadius * 0.95, 64);
    const texture = this.createSnowTexture();
    
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      color: 0x88aadd,
      transparent: true,
      opacity: 0.9
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0;
    
    return mesh;
  }

  private createStars(): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.starCount * 3);
    const colors = new Float32Array(this.starCount * 3);
    const sizes = new Float32Array(this.starCount);
    
    for (let i = 0; i < this.starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.4 + Math.PI * 0.1;
      const r = this.domeRadius * 0.95;
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      
      const brightness = 0.5 + Math.random() * 0.5;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness * 1.1;
      
      sizes[i] = 0.3 + Math.random() * 0.7;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    
    const points = new THREE.Points(geometry, material);
    return points;
  }

  update(time: number): void {
    const positions = this.stars.geometry.attributes.position as THREE.BufferAttribute;
    const colors = this.stars.geometry.attributes.color as THREE.BufferAttribute;
    
    for (let i = 0; i < this.starCount; i++) {
      const twinkle = 0.7 + Math.sin(time * 0.5 + i * 0.7) * 0.3;
      colors.setXYZ(
        i,
        twinkle * (0.8 + Math.random() * 0.2),
        twinkle * (0.8 + Math.random() * 0.2),
        twinkle * (0.9 + Math.random() * 0.1)
      );
    }
    
    colors.needsUpdate = true;
  }

  dispose(): void {
    (this.domeMesh.geometry as THREE.BufferGeometry).dispose();
    (this.domeMesh.material as THREE.Material).dispose();
    
    (this.groundMesh.geometry as THREE.BufferGeometry).dispose();
    const groundMaterial = this.groundMesh.material as THREE.MeshBasicMaterial;
    if (groundMaterial.map) {
      groundMaterial.map.dispose();
    }
    groundMaterial.dispose();
    
    (this.stars.geometry as THREE.BufferGeometry).dispose();
    (this.stars.material as THREE.Material).dispose();
  }
}
