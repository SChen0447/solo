import * as THREE from 'three';

export interface BookData {
  id: string;
  title: string;
  author: string;
  color: string;
  shelf: number;
  position: number;
  height: number;
  rating: number;
  comments: Array<{ id: string; text: string }>;
}

export class BookCard {
  mesh: THREE.Group;
  data: BookData;
  private bookBody: THREE.Mesh;
  private isAnimating: boolean = false;

  constructor(data: BookData) {
    this.data = data;
    this.mesh = new THREE.Group();
    
    const width = 20;
    const thickness = 10;
    const height = data.height;
    
    const geometry = new THREE.BoxGeometry(width, height, thickness);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(data.color),
      roughness: 0.7,
      metalness: 0.1
    });
    
    this.bookBody = new THREE.Mesh(geometry, material);
    this.bookBody.castShadow = true;
    this.bookBody.receiveShadow = true;
    this.mesh.add(this.bookBody);
    
    const spineCanvas = document.createElement('canvas');
    spineCanvas.width = 256;
    spineCanvas.height = 512;
    const ctx = spineCanvas.getContext('2d')!;
    
    ctx.fillStyle = data.color;
    ctx.fillRect(0, 0, 256, 512);
    
    ctx.save();
    ctx.translate(128, 256);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const displayTitle = data.title.length > 15 ? data.title.slice(0, 15) + '...' : data.title;
    ctx.fillText(displayTitle, 0, 0);
    ctx.restore();
    
    const spineTexture = new THREE.CanvasTexture(spineCanvas);
    const spineMaterial = new THREE.MeshStandardMaterial({
      map: spineTexture,
      roughness: 0.7,
      metalness: 0.1
    });
    
    const materials = [
      material,
      material,
      material,
      material,
      spineMaterial,
      material
    ];
    this.bookBody.material = materials;
    
    this.mesh.userData.bookId = data.id;
    this.mesh.userData.isBook = true;
  }

  setPosition(x: number, y: number, z: number): void {
    this.mesh.position.set(x, y, z);
  }

  flyTo(targetX: number, targetY: number, targetZ: number, duration: number = 300): Promise<void> {
    return new Promise((resolve) => {
      const startX = this.mesh.position.x;
      const startY = this.mesh.position.y;
      const startZ = this.mesh.position.z;
      const startTime = performance.now();
      this.isAnimating = true;

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        this.mesh.position.x = startX + (targetX - startX) * eased;
        this.mesh.position.y = startY + (targetY - startY) * eased;
        this.mesh.position.z = startZ + (targetZ - startZ) * eased;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.isAnimating = false;
          resolve();
        }
      };
      animate();
    });
  }

  fadeIn(duration: number = 500): Promise<void> {
    return new Promise((resolve) => {
      this.mesh.scale.set(0.01, 0.01, 0.01);
      const startTime = performance.now();
      this.isAnimating = true;

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        this.mesh.scale.setScalar(eased);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          this.isAnimating = false;
          resolve();
        }
      };
      animate();
    });
  }

  highlight(on: boolean): void {
    const materials = this.bookBody.material as THREE.MeshStandardMaterial[];
    materials.forEach(mat => {
      if (mat.emissive) {
        mat.emissive.setHex(on ? 0x333333 : 0x000000);
      }
    });
  }

  isBookObject(obj: THREE.Object3D): boolean {
    return obj.userData?.isBook === true;
  }
}
