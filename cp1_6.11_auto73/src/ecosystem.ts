import * as THREE from 'three';

export class Ecosystem {
  public glassMesh: THREE.Mesh;
  public soilTopMesh: THREE.Mesh;
  public soilBottomMesh: THREE.Mesh;
  public waterMesh: THREE.Mesh;
  public shadowMesh: THREE.Mesh;
  
  private lightIntensity: number = 50;
  private waterAmount: number = 50;
  private glassOpacity: number = 0.3;
  
  private scene: THREE.Scene;
  private group: THREE.Group;

  private readonly GLASS_RADIUS = 3;
  private readonly GLASS_HEIGHT = 6;
  private readonly SOIL_TOP_HEIGHT = 0.3;
  private readonly SOIL_BOTTOM_HEIGHT = 0.5;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    
    this.glassMesh = this.createGlass();
    this.soilBottomMesh = this.createSoilLayer(0x4a3728, this.SOIL_BOTTOM_HEIGHT, -this.SOIL_TOP_HEIGHT / 2);
    this.soilTopMesh = this.createSoilLayer(0xc4a35a, this.SOIL_TOP_HEIGHT, this.SOIL_BOTTOM_HEIGHT / 2);
    this.waterMesh = this.createWaterLayer();
    this.shadowMesh = this.createShadow();
    
    this.createSoilTexture();
    
    this.group.add(this.glassMesh);
    this.group.add(this.soilBottomMesh);
    this.group.add(this.soilTopMesh);
    this.group.add(this.waterMesh);
    this.group.add(this.shadowMesh);
    this.group.position.y = -1;
    
    this.scene.add(this.group);
  }

  private createGlass(): THREE.Mesh {
    const glassGeometry = new THREE.CylinderGeometry(
      this.GLASS_RADIUS, this.GLASS_RADIUS, this.GLASS_HEIGHT, 64, 1, true
    );
    const glassMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: this.glassOpacity,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.9,
      thickness: 0.1,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(glassGeometry, glassMaterial);
    mesh.position.y = this.GLASS_HEIGHT / 2;
    mesh.castShadow = false;
    mesh.receiveShadow = false;

    const lidGeometry = new THREE.CylinderGeometry(
      this.GLASS_RADIUS + 0.05, this.GLASS_RADIUS + 0.05, 0.1, 64
    );
    const lidMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x88aa88,
      transparent: true,
      opacity: 0.7,
      roughness: 0.3,
      metalness: 0.2
    });
    const lid = new THREE.Mesh(lidGeometry, lidMaterial);
    lid.position.y = this.GLASS_HEIGHT + 0.05;
    lid.rotation.z = Math.PI / 8;
    lid.position.x = 1.5;
    mesh.add(lid);

    const lidHinge = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 16);
    const hinge = new THREE.Mesh(lidHinge, lidMaterial);
    hinge.rotation.z = Math.PI / 2;
    hinge.position.x = -this.GLASS_RADIUS + 0.05;
    hinge.position.y = this.GLASS_HEIGHT;
    mesh.add(hinge);

    return mesh;
  }

  private createSoilLayer(color: number, height: number, yOffset: number): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(
      this.GLASS_RADIUS - 0.02, this.GLASS_RADIUS - 0.02, height, 64
    );
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.9,
      metalness: 0.1
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = yOffset;
    mesh.receiveShadow = true;
    return mesh;
  }

  private createSoilTexture(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const size = Math.random() * 2 + 1;
      const alpha = Math.random() * 0.3;
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 1);
    
    const topMaterial = this.soilTopMesh.material as THREE.MeshStandardMaterial;
    topMaterial.roughnessMap = texture;
    topMaterial.needsUpdate = true;

    for (let i = 0; i < 8000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const size = Math.random() * 1.5 + 0.5;
      const alpha = Math.random() * 0.2;
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    const texture2 = new THREE.CanvasTexture(canvas);
    texture2.wrapS = THREE.RepeatWrapping;
    texture2.wrapT = THREE.RepeatWrapping;
    texture2.repeat.set(4, 1);
    
    const bottomMaterial = this.soilBottomMesh.material as THREE.MeshStandardMaterial;
    bottomMaterial.roughnessMap = texture2;
    bottomMaterial.needsUpdate = true;
  }

  private createWaterLayer(): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(
      this.GLASS_RADIUS - 0.05, this.GLASS_RADIUS - 0.05, 0.02, 64
    );
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.8,
      thickness: 0.02
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = this.SOIL_TOP_HEIGHT / 2 + 0.02;
    mesh.visible = false;
    return mesh;
  }

  private createShadow(): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
    gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0.15)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    
    const texture = new THREE.CanvasTexture(canvas);
    
    const geometry = new THREE.PlaneGeometry(this.GLASS_RADIUS * 2.5, this.GLASS_RADIUS * 2.5);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.3,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -this.SOIL_BOTTOM_HEIGHT - 0.01;
    return mesh;
  }

  public setLightIntensity(value: number): void {
    this.lightIntensity = Math.max(0, Math.min(100, value));
  }

  public setWaterAmount(value: number): void {
    this.waterAmount = Math.max(0, Math.min(100, value));
    
    const waterMaterial = this.waterMesh.material as THREE.MeshPhysicalMaterial;
    if (this.waterAmount > 80) {
      this.waterMesh.visible = true;
      waterMaterial.opacity = Math.min(0.4, (this.waterAmount - 80) / 50);
    } else {
      this.waterMesh.visible = false;
      waterMaterial.opacity = 0;
    }
  }

  public setGlassOpacity(zoomLevel: number): void {
    const normalizedZoom = (zoomLevel - 0.5) / 2.5;
    this.glassOpacity = 0.3 - normalizedZoom * 0.2;
    this.glassOpacity = Math.max(0.1, Math.min(0.3, this.glassOpacity));
    
    const glassMaterial = this.glassMesh.material as THREE.MeshPhysicalMaterial;
    glassMaterial.opacity = this.glassOpacity;
  }

  public getGrowthFactor(): { light: number; water: number } {
    let lightFactor = 1;
    if (this.lightIntensity < 20) {
      lightFactor = 0.5 + (this.lightIntensity / 20) * 0.5;
    } else if (this.lightIntensity > 80) {
      lightFactor = 1 - ((this.lightIntensity - 80) / 20) * 0.3;
    }

    let waterFactor = 1;
    if (this.waterAmount < 20) {
      waterFactor = 0.7 + (this.waterAmount / 20) * 0.3;
    } else if (this.waterAmount > 80) {
      waterFactor = 1 - ((this.waterAmount - 80) / 20) * 0.2;
    }

    return {
      light: Math.max(0.2, lightFactor),
      water: Math.max(0.3, waterFactor)
    };
  }

  public getLightIntensity(): number {
    return this.lightIntensity;
  }

  public getWaterAmount(): number {
    return this.waterAmount;
  }

  public update(deltaTime: number): void {
    const time = performance.now() * 0.001;
    if (this.waterMesh.visible) {
      this.waterMesh.position.y = this.SOIL_TOP_HEIGHT / 2 + 0.02 + Math.sin(time * 3) * 0.005;
    }
  }

  public getSoilSurfacePosition(): THREE.Vector3 {
    return new THREE.Vector3(
      this.group.position.x,
      this.group.position.y + this.SOIL_TOP_HEIGHT / 2 + this.SOIL_BOTTOM_HEIGHT / 2,
      this.group.position.z
    );
  }
}
