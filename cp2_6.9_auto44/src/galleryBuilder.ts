import * as THREE from 'three';
import { GALLERY_CONFIG, ARTWORKS, Artwork } from './galleryData';

export interface PaintingObject {
  mesh: THREE.Mesh;
  frame: THREE.LineSegments;
  artwork: Artwork;
  originalScale: THREE.Vector3;
}

export class GalleryBuilder {
  private scene: THREE.Scene;
  private textureLoader: THREE.TextureLoader;
  private paintings: PaintingObject[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.textureLoader = new THREE.TextureLoader();
  }

  static build(scene: THREE.Scene): Promise<PaintingObject[]> {
    const builder = new GalleryBuilder(scene);
    return builder.buildAll();
  }

  private async buildAll(): Promise<PaintingObject[]> {
    this.createFloor();
    this.createWalls();
    this.createCeiling();
    this.createLighting();
    await this.createPaintings();
    return this.paintings;
  }

  private createFloor(): void {
    const { width, depth } = GALLERY_CONFIG;
    const geometry = new THREE.PlaneGeometry(width, depth, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0xdcdcdc,
      roughness: 0.8,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(geometry, material);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = false;
    this.scene.add(floor);
  }

  private createWalls(): void {
    const { width, depth, wallHeight } = GALLERY_CONFIG;
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5f0e8,
      roughness: 0.9,
      metalness: 0.05
    });

    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(width, wallHeight),
      wallMaterial
    );
    backWall.position.set(0, wallHeight / 2, -depth / 2);
    this.scene.add(backWall);

    const frontWall = new THREE.Mesh(
      new THREE.PlaneGeometry(width, wallHeight),
      wallMaterial
    );
    frontWall.position.set(0, wallHeight / 2, depth / 2);
    frontWall.rotation.y = Math.PI;
    this.scene.add(frontWall);

    const leftWall = new THREE.Mesh(
      new THREE.PlaneGeometry(depth, wallHeight),
      wallMaterial
    );
    leftWall.position.set(-width / 2, wallHeight / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    this.scene.add(leftWall);

    const rightWall = new THREE.Mesh(
      new THREE.PlaneGeometry(depth, wallHeight),
      wallMaterial
    );
    rightWall.position.set(width / 2, wallHeight / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    this.scene.add(rightWall);
  }

  private createCeiling(): void {
    const { width, depth, wallHeight } = GALLERY_CONFIG;
    const geometry = new THREE.PlaneGeometry(width, depth, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0x2c2c2c,
      roughness: 0.95,
      metalness: 0
    });
    const ceiling = new THREE.Mesh(geometry, material);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = wallHeight;
    this.scene.add(ceiling);
  }

  private createLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const { width, depth, wallHeight } = GALLERY_CONFIG;

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.5);
    mainLight.position.set(0, wallHeight - 0.5, depth / 4);
    mainLight.castShadow = false;
    this.scene.add(mainLight);

    const fillLight1 = new THREE.PointLight(0xfff5e6, 0.4, 20);
    fillLight1.position.set(-width / 3, wallHeight - 0.5, 0);
    this.scene.add(fillLight1);

    const fillLight2 = new THREE.PointLight(0xfff5e6, 0.4, 20);
    fillLight2.position.set(width / 3, wallHeight - 0.5, 0);
    this.scene.add(fillLight2);

    const spotLight1 = new THREE.PointLight(0xfffaf0, 0.6, 15);
    spotLight1.position.set(0, wallHeight - 0.3, -depth / 2 + 0.5);
    this.scene.add(spotLight1);

    const spotLight2 = new THREE.PointLight(0xfffaf0, 0.6, 15);
    spotLight2.position.set(0, wallHeight - 0.3, depth / 2 - 0.5);
    this.scene.add(spotLight2);
  }

  private async createPaintings(): Promise<void> {
    const { width, depth, paintingWidth, paintingHeight, paintingY } = GALLERY_CONFIG;

    const positions: Array<{ position: THREE.Vector3; rotationY: number }> = [];

    const frontCount = 3;
    const frontStartX = -((frontCount - 1) / 2) * (paintingWidth + GALLERY_CONFIG.paintingSpacing);
    for (let i = 0; i < frontCount; i++) {
      positions.push({
        position: new THREE.Vector3(frontStartX + i * (paintingWidth + GALLERY_CONFIG.paintingSpacing), paintingY, -depth / 2 + 0.02),
        rotationY: 0
      });
    }

    const backCount = 3;
    const backStartX = -((backCount - 1) / 2) * (paintingWidth + GALLERY_CONFIG.paintingSpacing);
    for (let i = 0; i < backCount; i++) {
      positions.push({
        position: new THREE.Vector3(backStartX + i * (paintingWidth + GALLERY_CONFIG.paintingSpacing), paintingY, depth / 2 - 0.02),
        rotationY: Math.PI
      });
    }

    positions.push({
      position: new THREE.Vector3(-width / 2 + 0.02, paintingY, -depth / 4),
      rotationY: Math.PI / 2
    });
    positions.push({
      position: new THREE.Vector3(width / 2 - 0.02, paintingY, depth / 4),
      rotationY: -Math.PI / 2
    });

    for (let i = 0; i < ARTWORKS.length && i < positions.length; i++) {
      const artwork = ARTWORKS[i];
      const pos = positions[i];
      const painting = await this.createSinglePainting(artwork, paintingWidth, paintingHeight);
      painting.mesh.position.copy(pos.position);
      painting.mesh.rotation.y = pos.rotationY;
      painting.frame.position.copy(pos.position);
      painting.frame.rotation.y = pos.rotationY;
      this.paintings.push(painting);
    }
  }

  private async createSinglePainting(
    artwork: Artwork,
    width: number,
    height: number
  ): Promise<PaintingObject> {
    const texture = await this.loadTexture(artwork.imageUrl);

    const geometry = new THREE.PlaneGeometry(width, height, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.7,
      metalness: 0.05
    });
    const mesh = new THREE.Mesh(geometry, material);

    const frameGeometry = new THREE.EdgesGeometry(
      new THREE.PlaneGeometry(width + 0.1, height + 0.1)
    );
    const frameMaterial = new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 2
    });
    const frame = new THREE.LineSegments(frameGeometry, frameMaterial);

    mesh.userData = { artworkId: artwork.id, type: 'painting' };
    frame.userData = { artworkId: artwork.id, type: 'paintingFrame' };

    this.scene.add(mesh);
    this.scene.add(frame);

    return {
      mesh,
      frame,
      artwork,
      originalScale: mesh.scale.clone()
    };
  }

  private loadTexture(url: string): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = true;
          texture.anisotropy = 4;
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }
}
