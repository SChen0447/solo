import * as THREE from 'three';

export interface ForestConfig {
  treeCount: number;
  areaSize: number;
}

export class Forest {
  public group: THREE.Group;
  public ground: THREE.Mesh;
  private config: ForestConfig;

  constructor(config: ForestConfig = { treeCount: 15, areaSize: 40 }) {
    this.config = config;
    this.group = new THREE.Group();
    this.ground = this.createGround();
    this.group.add(this.ground);
    this.createTrees();
    this.createShrubs();
  }

  private createNoiseTexture(color1: THREE.Color, color2: THREE.Color): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    const imageData = ctx.createImageData(256, 256);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = Math.random();
      const t = noise;
      const r = Math.floor(color1.r * 255 * (1 - t) + color2.r * 255 * t);
      const g = Math.floor(color1.g * 255 * (1 - t) + color2.g * 255 * t);
      const b = Math.floor(color1.b * 255 * (1 - t) + color2.b * 255 * t);
      imageData.data[i] = r;
      imageData.data[i + 1] = g;
      imageData.data[i + 2] = b;
      imageData.data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private createGround(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(this.config.areaSize * 2, this.config.areaSize * 2, 100, 100);
    const positions = geometry.attributes.position;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const noise = Math.sin(x * 0.3) * Math.cos(y * 0.3) * 0.5 + Math.random() * 0.2;
      positions.setZ(i, noise);
    }
    
    geometry.computeVertexNormals();
    
    const texture = this.createNoiseTexture(
      new THREE.Color(0x2a1f1a),
      new THREE.Color(0x3a2a20)
    );
    texture.repeat.set(10, 10);
    
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      color: 0x2a1f1a,
      roughness: 0.9,
      metalness: 0.1
    });
    
    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    
    return ground;
  }

  private createTree(position: THREE.Vector3, height: number, rotation: number): THREE.Group {
    const tree = new THREE.Group();
    
    const trunkHeight = height * 0.7;
    const trunkRadius = 0.3 + height * 0.03;
    const trunkGeometry = new THREE.CylinderGeometry(
      trunkRadius * 0.7,
      trunkRadius,
      trunkHeight,
      8
    );
    
    const positions = trunkGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const noise = (Math.random() - 0.5) * 0.1;
      positions.setX(i, x + noise);
      positions.setZ(i, z + noise);
    }
    trunkGeometry.computeVertexNormals();
    
    const trunkTexture = this.createNoiseTexture(
      new THREE.Color(0x4a3728),
      new THREE.Color(0x3a2718)
    );
    trunkTexture.repeat.set(2, 4);
    
    const trunkMaterial = new THREE.MeshStandardMaterial({
      map: trunkTexture,
      color: 0x4a3728,
      roughness: 0.8,
      metalness: 0.1
    });
    
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    tree.add(trunk);
    
    const foliageCount = 3 + Math.floor(Math.random() * 2);
    const baseFoliageY = trunkHeight;
    
    for (let i = 0; i < foliageCount; i++) {
      const fHeight = (height - trunkHeight) / foliageCount * 1.2;
      const fRadius = 1.5 + (height - trunkHeight) * 0.15 - i * 0.3;
      const fGeometry = new THREE.ConeGeometry(Math.max(fRadius, 0.5), fHeight, 8);
      
      const fPositions = fGeometry.attributes.position;
      for (let j = 0; j < fPositions.count; j++) {
        const x = fPositions.getX(j);
        const z = fPositions.getZ(j);
        const noise = (Math.random() - 0.5) * 0.2;
        fPositions.setX(j, x + noise);
        fPositions.setZ(j, z + noise);
      }
      fGeometry.computeVertexNormals();
      
      const greenVariation = 0x1a3a1a + Math.floor(Math.random() * 0x0a1a0a);
      const fMaterial = new THREE.MeshStandardMaterial({
        color: greenVariation,
        roughness: 0.9,
        metalness: 0.0
      });
      
      const foliage = new THREE.Mesh(fGeometry, fMaterial);
      foliage.position.y = baseFoliageY + i * fHeight * 0.6;
      foliage.castShadow = true;
      foliage.receiveShadow = true;
      tree.add(foliage);
      
      if (Math.random() > 0.5) {
        const sGeometry = new THREE.SphereGeometry(fRadius * 0.7, 8, 6);
        const sPositions = sGeometry.attributes.position;
        for (let j = 0; j < sPositions.count; j++) {
          const noise = (Math.random() - 0.5) * 0.15;
          sPositions.setX(j, sPositions.getX(j) + noise);
          sPositions.setY(j, sPositions.getY(j) + noise * 0.5);
          sPositions.setZ(j, sPositions.getZ(j) + noise);
        }
        sGeometry.computeVertexNormals();
        
        const sphere = new THREE.Mesh(sGeometry, fMaterial.clone());
        sphere.position.y = baseFoliageY + i * fHeight * 0.6 + fHeight * 0.3;
        sphere.position.x = (Math.random() - 0.5) * fRadius;
        sphere.position.z = (Math.random() - 0.5) * fRadius;
        sphere.castShadow = true;
        tree.add(sphere);
      }
    }
    
    tree.position.copy(position);
    tree.rotation.y = rotation;
    
    return tree;
  }

  private createTrees(): void {
    const { treeCount, areaSize } = this.config;
    
    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 5 + Math.random() * (areaSize - 10);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const height = 5 + Math.random() * 7;
      const rotation = Math.random() * Math.PI * 2;
      
      const position = new THREE.Vector3(x, 0, z);
      const tree = this.createTree(position, height, rotation);
      this.group.add(tree);
    }
  }

  private createShrubs(): void {
    const { areaSize } = this.config;
    const shrubCount = 30;
    
    for (let i = 0; i < shrubCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 3 + Math.random() * (areaSize - 5);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const shrub = new THREE.Group();
      
      const stemHeight = 0.5 + Math.random() * 1;
      const stemGeometry = new THREE.CylinderGeometry(0.05, 0.08, stemHeight, 5);
      const stemMaterial = new THREE.MeshStandardMaterial({
        color: 0x5a4738,
        roughness: 0.9
      });
      const stem = new THREE.Mesh(stemGeometry, stemMaterial);
      stem.position.y = stemHeight / 2;
      shrub.add(stem);
      
      const leafCount = 3 + Math.floor(Math.random() * 4);
      for (let j = 0; j < leafCount; j++) {
        const leafSize = 0.2 + Math.random() * 0.3;
        const leafGeometry = new THREE.SphereGeometry(leafSize, 6, 4);
        const greenVariation = 0x1a4a1a + Math.floor(Math.random() * 0x0a2a0a);
        const leafMaterial = new THREE.MeshStandardMaterial({
          color: greenVariation,
          roughness: 0.9
        });
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        leaf.position.y = stemHeight + Math.random() * 0.5;
        leaf.position.x = (Math.random() - 0.5) * 0.5;
        leaf.position.z = (Math.random() - 0.5) * 0.5;
        leaf.castShadow = true;
        shrub.add(leaf);
      }
      
      shrub.position.set(x, 0, z);
      shrub.rotation.y = Math.random() * Math.PI * 2;
      this.group.add(shrub);
    }
  }

  public getTerrainHeight(x: number, z: number): number {
    return Math.sin(x * 0.3) * Math.cos(z * 0.3) * 0.5;
  }
}
