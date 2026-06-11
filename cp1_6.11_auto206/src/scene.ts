import * as THREE from 'three';

export interface SceneParams {
  moonlightIntensity: number;
  windStrength: number;
}

interface LotusFlower {
  group: THREE.Group;
  petals: THREE.Mesh[];
  stamen: THREE.Mesh;
  hovered: boolean;
  openAmount: number;
  targetOpen: number;
  basePosition: THREE.Vector3;
}

interface LotusLeaf {
  mesh: THREE.Mesh;
  veins: THREE.LineSegments;
  hovered: boolean;
  veinOpacity: number;
  rotationOffset: number;
  baseRotation: number;
}

export class PondScene {
  public scene: THREE.Scene;
  private params: SceneParams;

  private waterMesh: THREE.Mesh;
  private waterGeometry: THREE.PlaneGeometry;
  private waterMaterial: THREE.ShaderMaterial;

  private moonBeamGroup: THREE.Group;
  private moonBeamParticles: THREE.Points;
  private moonBeamGeometry: THREE.BufferGeometry;
  private moonBeamAngle: number = 45;
  private moonBeamParticlesData: { speed: number; phase: number }[] = [];

  private lotusFlowers: LotusFlower[] = [];
  private lotusLeaves: LotusLeaf[] = [];

  private mousePosition: THREE.Vector2 = new THREE.Vector2(0, 0);
  private raycaster: THREE.Raycaster;

  private width: number = 0;
  private height: number = 0;

  constructor(params: SceneParams) {
    this.params = { ...params };
    this.scene = new THREE.Scene();
    this.raycaster = new THREE.Raycaster();

    this.waterGeometry = new THREE.PlaneGeometry(2000, 2000, 100, 50);
    this.waterMaterial = this.createWaterMaterial();
    this.waterMesh = new THREE.Mesh(this.waterGeometry, this.waterMaterial);
    this.waterMesh.position.y = -100;
    this.waterMesh.position.z = -50;
    this.scene.add(this.waterMesh);

    this.moonBeamGroup = new THREE.Group();
    this.scene.add(this.moonBeamGroup);
    this.createMoonBeam();

    this.createLotusFlowers();
    this.createLotusLeaves();
  }

  private createWaterMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWaveAmplitude: { value: 3 },
        uWindStrength: { value: this.params.windStrength },
        uMoonlightIntensity: { value: this.params.moonlightIntensity },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uWaveAmplitude;
        uniform float uWindStrength;
        varying vec2 vUv;
        varying float vWaveHeight;

        void main() {
          vUv = uv;
          vec3 pos = position;
          float wave1 = sin(pos.x * 0.01 + uTime * 0.5 * (1.0 + uWindStrength)) * uWaveAmplitude;
          float wave2 = sin(pos.x * 0.02 + pos.y * 0.01 + uTime * 0.7 * (1.0 + uWindStrength)) * uWaveAmplitude * 0.6;
          float wave3 = cos(pos.y * 0.015 + uTime * 0.4 * (1.0 + uWindStrength)) * uWaveAmplitude * 0.4;
          pos.z += wave1 + wave2 + wave3;
          vWaveHeight = (wave1 + wave2 + wave3) / uWaveAmplitude;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uMoonlightIntensity;
        varying vec2 vUv;
        varying float vWaveHeight;

        void main() {
          vec3 deepColor = vec3(0.08, 0.12, 0.25);
          vec3 shallowColor = vec3(0.15, 0.25, 0.4);
          vec3 moonReflect = vec3(0.8, 0.85, 1.0);

          float depthFactor = smoothstep(0.3, 0.7, vUv.y);
          vec3 waterColor = mix(shallowColor, deepColor, depthFactor);

          float reflect = smoothstep(-0.3, 1.0, vWaveHeight) * 0.3;
          waterColor += moonReflect * reflect * uMoonlightIntensity;

          float highlight = pow(max(vWaveHeight, 0.0), 3.0) * 0.5;
          waterColor += moonReflect * highlight * uMoonlightIntensity * 0.5;

          gl_FragColor = vec4(waterColor, 0.92);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }

  private createMoonBeam(): void {
    const beamCanvas = document.createElement('canvas');
    beamCanvas.width = 512;
    beamCanvas.height = 512;
    const ctx = beamCanvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(256, 0, 0, 256, 256, 256);
    gradient.addColorStop(0, 'rgba(255, 255, 240, 0.4)');
    gradient.addColorStop(0.3, 'rgba(220, 230, 255, 0.25)');
    gradient.addColorStop(0.6, 'rgba(180, 200, 240, 0.1)');
    gradient.addColorStop(1, 'rgba(150, 180, 220, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    const beamTexture = new THREE.CanvasTexture(beamCanvas);

    const beamGeometry = new THREE.PlaneGeometry(600, 800);
    const beamMaterial = new THREE.MeshBasicMaterial({
      map: beamTexture,
      transparent: true,
      opacity: 0.5 * this.params.moonlightIntensity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const beamMesh = new THREE.Mesh(beamGeometry, beamMaterial);
    beamMesh.name = 'moonBeam';
    beamMesh.position.set(400, 300, -10);
    beamMesh.rotation.z = -this.moonBeamAngle * Math.PI / 180;
    this.moonBeamGroup.add(beamMesh);

    this.moonBeamGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(250 * 3);
    const colors = new Float32Array(250 * 3);
    const sizes = new Float32Array(250);

    for (let i = 0; i < 250; i++) {
      const t = Math.random();
      const offset = (Math.random() - 0.5) * 200;
      positions[i * 3] = 400 + offset - t * 500;
      positions[i * 3 + 1] = 350 - t * 700;
      positions[i * 3 + 2] = -5;

      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0.98;
      colors[i * 3 + 2] = 0.9;

      sizes[i] = 1 + Math.random() * 2;

      this.moonBeamParticlesData.push({
        speed: 0.3 + Math.random() * 0.7,
        phase: Math.random() * Math.PI * 2,
      });
    }

    this.moonBeamGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.moonBeamGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.moonBeamGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const sparkleCanvas = document.createElement('canvas');
    sparkleCanvas.width = 32;
    sparkleCanvas.height = 32;
    const sctx = sparkleCanvas.getContext('2d')!;
    const sgrad = sctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    sgrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    sgrad.addColorStop(0.4, 'rgba(255, 255, 220, 0.6)');
    sgrad.addColorStop(1, 'rgba(255, 255, 200, 0)');
    sctx.fillStyle = sgrad;
    sctx.fillRect(0, 0, 32, 32);
    const sparkleTexture = new THREE.CanvasTexture(sparkleCanvas);

    const particleMaterial = new THREE.PointsMaterial({
      size: 3,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: sparkleTexture,
    });

    this.moonBeamParticles = new THREE.Points(this.moonBeamGeometry, particleMaterial);
    this.moonBeamGroup.add(this.moonBeamParticles);
  }

  private createLotusFlowers(): void {
    const petalColorStart = new THREE.Color(0xffdae0);
    const petalColorEnd = new THREE.Color(0xd4b6e0);

    for (let i = 0; i < 12; i++) {
      const group = new THREE.Group();
      const petals: THREE.Mesh[] = [];

      const angle = (i / 12) * Math.PI * 2;
      const radius = 150 + Math.random() * 150;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius * 0.6 - 50;
      const scale = 0.7 + Math.random() * 0.6;

      const petalCount = 8;
      for (let j = 0; j < petalCount; j++) {
        const petalAngle = (j / petalCount) * Math.PI * 2;
        const petalShape = new THREE.Shape();
        petalShape.moveTo(0, 0);
        petalShape.bezierCurveTo(8, 5, 12, 20, 0, 35);
        petalShape.bezierCurveTo(-12, 20, -8, 5, 0, 0);

        const petalGeometry = new THREE.ShapeGeometry(petalShape);
        const colorMix = 0.3 + Math.random() * 0.7;
        const petalColor = new THREE.Color().lerpColors(petalColorStart, petalColorEnd, colorMix);
        const petalMaterial = new THREE.MeshBasicMaterial({
          color: petalColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9,
        });

        const petal = new THREE.Mesh(petalGeometry, petalMaterial);
        petal.position.set(0, 5, 0);
        petal.rotation.z = petalAngle;
        petal.rotation.x = -0.3;
        petal.scale.y = 1;
        petal.userData = { baseAngle: petalAngle, baseScaleY: 1 };

        petals.push(petal);
        group.add(petal);
      }

      const stamenGeometry = new THREE.CircleGeometry(6, 16);
      const stamenMaterial = new THREE.MeshBasicMaterial({
        color: 0xfff8b8,
        side: THREE.DoubleSide,
      });
      const stamen = new THREE.Mesh(stamenGeometry, stamenMaterial);
      stamen.position.set(0, 2, 1);
      group.add(stamen);

      group.position.set(x, y, -20);
      group.scale.setScalar(scale);

      const flower: LotusFlower = {
        group,
        petals,
        stamen,
        hovered: false,
        openAmount: 0.6,
        targetOpen: 0.6,
        basePosition: new THREE.Vector3(x, y, -20),
      };

      this.lotusFlowers.push(flower);
      this.scene.add(group);
    }
  }

  private createLotusLeaves(): void {
    const leafCount = 20;

    for (let i = 0; i < leafCount; i++) {
      const radius = 35 + Math.random() * 30;

      const leafCanvas = document.createElement('canvas');
      leafCanvas.width = 256;
      leafCanvas.height = 256;
      const ctx = leafCanvas.getContext('2d')!;
      const gradient = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
      gradient.addColorStop(0, '#5b8a5b');
      gradient.addColorStop(0.7, '#3d6a45');
      gradient.addColorStop(1, '#2d5a3d');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(128, 128, 120, 115, 0, 0, Math.PI * 2);
      ctx.fill();

      const leafTexture = new THREE.CanvasTexture(leafCanvas);
      const leafGeometry = new THREE.CircleGeometry(radius, 32);
      const leafMaterial = new THREE.MeshBasicMaterial({
        map: leafTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
      });
      const leafMesh = new THREE.Mesh(leafGeometry, leafMaterial);

      const veinCount = 12;
      const veinPoints: number[] = [];
      for (let j = 0; j < veinCount; j++) {
        const angle = (j / veinCount) * Math.PI * 2;
        veinPoints.push(0, 0, 1);
        veinPoints.push(Math.cos(angle) * radius * 0.9, Math.sin(angle) * radius * 0.85, 1);
      }
      const veinGeometry = new THREE.BufferGeometry();
      veinGeometry.setAttribute('position', new THREE.Float32BufferAttribute(veinPoints, 3));
      const veinMaterial = new THREE.LineBasicMaterial({
        color: 0x1a3a25,
        transparent: true,
        opacity: 0,
      });
      const veins = new THREE.LineSegments(veinGeometry, veinMaterial);

      const angle = Math.random() * Math.PI * 2;
      const dist = 100 + Math.random() * 250;
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist * 0.6 - 80;
      const baseRotation = Math.random() * Math.PI;

      leafMesh.position.set(x, y, -30);
      leafMesh.rotation.z = baseRotation;
      veins.position.set(x, y, -29);
      veins.rotation.z = baseRotation;

      const leaf: LotusLeaf = {
        mesh: leafMesh,
        veins,
        hovered: false,
        veinOpacity: 0,
        rotationOffset: 0,
        baseRotation,
      };

      this.lotusLeaves.push(leaf);
      this.scene.add(leafMesh);
      this.scene.add(veins);
    }
  }

  public setMousePosition(x: number, y: number): void {
    this.mousePosition.set(x, y);
  }

  public setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  public setMoonlightIntensity(value: number): void {
    this.params.moonlightIntensity = value;
    this.waterMaterial.uniforms.uMoonlightIntensity.value = value;

    const beamMesh = this.moonBeamGroup.children.find(c => c.name === 'moonBeam') as THREE.Mesh;
    if (beamMesh && beamMesh.material instanceof THREE.MeshBasicMaterial) {
      beamMesh.material.opacity = 0.5 * value;
    }

    if (this.moonBeamParticles.material instanceof THREE.PointsMaterial) {
      this.moonBeamParticles.material.opacity = 0.6 * value + 0.2;
    }
  }

  public setWindStrength(value: number): void {
    this.params.windStrength = value;
    this.waterMaterial.uniforms.uWindStrength.value = value;
  }

  public setWaveAmplitude(amplitude: number): void {
    this.waterMaterial.uniforms.uWaveAmplitude.value = amplitude;
  }

  public setMoonBeamAngle(angle: number): void {
    this.moonBeamAngle = angle;
    const beamMesh = this.moonBeamGroup.children.find(c => c.name === 'moonBeam') as THREE.Mesh;
    if (beamMesh) {
      beamMesh.rotation.z = -angle * Math.PI / 180;
    }
  }

  public update(deltaTime: number, time: number, camera: THREE.Camera): void {
    this.waterMaterial.uniforms.uTime.value = time;

    const positions = this.moonBeamGeometry.attributes.position.array as Float32Array;
    const sizes = this.moonBeamGeometry.attributes.size.array as Float32Array;

    for (let i = 0; i < 250; i++) {
      const data = this.moonBeamParticlesData[i];
      const t = ((time * 0.1 * data.speed + data.phase) % 1);
      const offset = Math.sin(time * 0.5 + data.phase) * 30;
      const angleRad = -this.moonBeamAngle * Math.PI / 180;

      const baseX = 450 + offset - t * 600;
      const baseY = 350 - t * 700;

      positions[i * 3] = baseX;
      positions[i * 3 + 1] = baseY;

      const twinkle = 0.5 + Math.sin(time * 3 + data.phase * 5) * 0.5;
      sizes[i] = (1 + twinkle * 2) * this.params.moonlightIntensity;
    }

    this.moonBeamGeometry.attributes.position.needsUpdate = true;
    this.moonBeamGeometry.attributes.size.needsUpdate = true;

    const ndcX = (this.mousePosition.x / this.width) * 2 - 1;
    const ndcY = -(this.mousePosition.y / this.height) * 2 + 1;
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);

    const flowerMeshes: THREE.Object3D[] = [];
    this.lotusFlowers.forEach(f => flowerMeshes.push(f.group));

    const flowerIntersects = this.raycaster.intersectObjects(flowerMeshes, true);
    this.lotusFlowers.forEach(flower => {
      let hovered = false;
      for (const intersect of flowerIntersects) {
        if (intersect.object.parent === flower.group || intersect.object === flower.group) {
          hovered = true;
          break;
        }
      }
      flower.hovered = hovered;
      flower.targetOpen = hovered ? 1.0 : 0.5;
      flower.openAmount += (flower.targetOpen - flower.openAmount) * 0.05;

      flower.petals.forEach((petal, idx) => {
        const baseAngle = petal.userData.baseAngle;
        const openSpread = flower.openAmount * 0.4;
        petal.rotation.z = baseAngle + Math.sin(time * 2 + idx) * 0.03;
        petal.rotation.x = -0.3 - openSpread;
        petal.scale.y = 0.8 + flower.openAmount * 0.4;
      });

      flower.group.position.y = flower.basePosition.y + Math.sin(time * 1.5 + flower.basePosition.x * 0.01) * 3 * (1 + this.params.windStrength * 0.5);
    });

    const leafMeshes = this.lotusLeaves.map(l => l.mesh);
    const leafIntersects = this.raycaster.intersectObjects(leafMeshes);
    const hoveredLeaves = new Set<THREE.Object3D>();
    leafIntersects.forEach(i => hoveredLeaves.add(i.object));

    this.lotusLeaves.forEach(leaf => {
      leaf.hovered = hoveredLeaves.has(leaf.mesh);
      const targetOpacity = leaf.hovered ? 0.8 : 0;
      leaf.veinOpacity += (targetOpacity - leaf.veinOpacity) * 0.1;

      if (leaf.veins.material instanceof THREE.LineBasicMaterial) {
        leaf.veins.material.opacity = leaf.veinOpacity;
      }

      if (leaf.hovered) {
        const dx = this.mousePosition.x - leaf.mesh.position.x;
        leaf.rotationOffset = dx * 0.0005;
      } else {
        leaf.rotationOffset *= 0.95;
      }

      leaf.veins.rotation.z = leaf.baseRotation + leaf.rotationOffset;
      leaf.mesh.position.y = leaf.mesh.position.y + Math.sin(time * 1.2 + leaf.mesh.position.x * 0.02) * 0.02;
    });
  }

  public dispose(): void {
    this.waterGeometry.dispose();
    this.waterMaterial.dispose();

    this.moonBeamGeometry.dispose();
    if (this.moonBeamParticles.material instanceof THREE.PointsMaterial) {
      this.moonBeamParticles.material.dispose();
      if (this.moonBeamParticles.material.map) {
        this.moonBeamParticles.material.map.dispose();
      }
    }

    this.lotusFlowers.forEach(flower => {
      flower.petals.forEach(petal => {
        petal.geometry.dispose();
        if (petal.material instanceof THREE.MeshBasicMaterial) {
          petal.material.dispose();
        }
      });
      flower.stamen.geometry.dispose();
      if (flower.stamen.material instanceof THREE.MeshBasicMaterial) {
        flower.stamen.material.dispose();
      }
    });

    this.lotusLeaves.forEach(leaf => {
      leaf.mesh.geometry.dispose();
      if (leaf.mesh.material instanceof THREE.MeshBasicMaterial && leaf.mesh.material.map) {
        leaf.mesh.material.map.dispose();
      }
      if (leaf.mesh.material instanceof THREE.MeshBasicMaterial) {
        leaf.mesh.material.dispose();
      }
      leaf.veins.geometry.dispose();
      if (leaf.veins.material instanceof THREE.LineBasicMaterial) {
        leaf.veins.material.dispose();
      }
    });
  }
}
