import * as THREE from 'three';

export class Forest {
  public group: THREE.Group;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.setupBackground();
    this.setupFog();
    this.createGround();
    this.createTrees();
    this.setupLighting();
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#05081a');
    gradient.addColorStop(1, '#0a1a0a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  private setupFog(): void {
    this.scene.fog = new THREE.FogExp2(0x051015, 0.08);
  }

  private createGround(): void {
    const geometry = new THREE.PlaneGeometry(6, 6, 32, 32);
    const positions = geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const noise = Math.sin(x * 3) * Math.cos(y * 3) * 0.08 + Math.random() * 0.04;
      positions.setZ(i, noise);
    }
    geometry.computeVertexNormals();

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(256, 256);

    for (let i = 0; i < imgData.data.length; i += 4) {
      const t = Math.random();
      const r = Math.floor(0x1a + t * 0x10);
      const g = Math.floor(0x3a + t * 0x10);
      const b = Math.floor(0x1a + t * 0x10);
      imgData.data[i] = r;
      imgData.data[i + 1] = g;
      imgData.data[i + 2] = b;
      imgData.data[i + 3] = 220;
    }
    ctx.putImageData(imgData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);

    const material = new THREE.MeshLambertMaterial({
      map: texture,
      transparent: true,
      opacity: 0.92
    });

    const ground = new THREE.Mesh(geometry, material);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    this.group.add(ground);
  }

  private createTrees(): void {
    const trunkColor = new THREE.Color(0x3a2a1a);
    const foliageColors = [
      new THREE.Color(0x1a4a1a),
      new THREE.Color(0x215521),
      new THREE.Color(0x2a5a2a)
    ];

    const placed: THREE.Vector3[] = [];
    let attempts = 0;
    let treeCount = 0;

    while (treeCount < 20 && attempts < 500) {
      attempts++;
      const x = (Math.random() - 0.5) * 5;
      const z = (Math.random() - 0.5) * 5;
      const pos = new THREE.Vector3(x, 0, z);

      let valid = true;
      for (const p of placed) {
        if (pos.distanceTo(p) < 0.8) {
          valid = false;
          break;
        }
      }
      if (!valid) continue;
      if (Math.random() > 0.5) {
        for (const p of placed) {
          if (pos.distanceTo(p) > 1.5) continue;
        }
      }

      placed.push(pos);
      treeCount++;

      const tree = new THREE.Group();
      const trunkH = 0.6 + Math.random() * 0.4;
      const trunkGeom = new THREE.CylinderGeometry(0.05, 0.08, trunkH, 5);
      const trunkMat = new THREE.MeshLambertMaterial({ color: trunkColor });
      const trunk = new THREE.Mesh(trunkGeom, trunkMat);
      trunk.position.y = trunkH / 2;
      tree.add(trunk);

      const coneSizes = [
        { r: 0.35, h: 0.5, y: trunkH + 0.1 },
        { r: 0.28, h: 0.45, y: trunkH + 0.35 },
        { r: 0.2, h: 0.4, y: trunkH + 0.6 }
      ];

      for (let i = 0; i < 3; i++) {
        const s = coneSizes[i];
        const coneGeom = new THREE.ConeGeometry(s.r, s.h, 6);
        const coneMat = new THREE.MeshLambertMaterial({
          color: foliageColors[i]
        });
        const cone = new THREE.Mesh(coneGeom, coneMat);
        cone.position.y = s.y;
        tree.add(cone);
      }

      tree.position.copy(pos);
      tree.rotation.y = Math.random() * Math.PI * 2;
      const scale = 0.85 + Math.random() * 0.3;
      tree.scale.setScalar(scale);

      this.group.add(tree);
    }
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0x1a2530, 0.6);
    this.scene.add(ambient);

    const moonLight = new THREE.DirectionalLight(0x8899bb, 0.4);
    moonLight.position.set(3, 5, 2);
    this.scene.add(moonLight);

    const fillLight = new THREE.PointLight(0x1a4a2a, 0.5, 8);
    fillLight.position.set(0, 2, 0);
    this.scene.add(fillLight);
  }
}
