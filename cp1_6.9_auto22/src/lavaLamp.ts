import * as THREE from 'three';

const CONTAINER_RADIUS = 2;
const CONTAINER_HEIGHT = 5;
const CONTAINER_MIN_Y = -2.5;
const HEAT_SOURCE_RADIUS = 0.5;
const HEAT_START_COLOR = new THREE.Color(0xff5500);
const HEAT_END_COLOR = new THREE.Color(0xffaa00);
const BUBBLE_COLOR = new THREE.Color(0xffdd88);

interface ConvectionBubble {
  mesh: THREE.Mesh;
  speed: number;
  life: number;
  maxLife: number;
}

export class LavaLamp {
  private scene: THREE.Scene;
  private lampGroup: THREE.Group;

  private containerMesh: THREE.Mesh;
  private containerGlass: THREE.MeshPhysicalMaterial;
  private innerLiquid: THREE.Mesh;
  private innerLiquidMaterial: THREE.MeshPhysicalMaterial;

  private heatSource: THREE.Mesh;
  private heatSourceMaterial: THREE.MeshStandardMaterial;
  private heatLight: THREE.PointLight;
  private baseEmissiveIntensity: number = 2.0;
  private currentHeatIntensity: number = 1.0;

  private convectionBubbles: ConvectionBubble[] = [];
  private maxConvectionBubbles: number = 8;
  private bubbleSpawnTimer: number = 0;
  private bubbleMaterial: THREE.MeshBasicMaterial;

  private rimLightBack: THREE.PointLight;
  private rimLightFront: THREE.PointLight;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.lampGroup = new THREE.Group();
    this.scene.add(this.lampGroup);

    this.innerLiquidMaterial = this.createInnerLiquidMaterial();
    this.innerLiquid = this.createInnerLiquid();
    this.lampGroup.add(this.innerLiquid);

    this.containerGlass = this.createGlassMaterial();
    this.containerMesh = this.createGlassContainer();
    this.lampGroup.add(this.containerMesh);

    this.heatSourceMaterial = this.createHeatSourceMaterial();
    this.heatSource = this.createHeatSource();
    this.lampGroup.add(this.heatSource);

    this.heatLight = this.createHeatLight();
    this.lampGroup.add(this.heatLight);

    this.rimLightBack = new THREE.PointLight(0x4488ff, 0.3, 10);
    this.rimLightBack.position.set(0, 0, -3);
    this.lampGroup.add(this.rimLightBack);

    this.rimLightFront = new THREE.PointLight(0xff8844, 0.2, 10);
    this.rimLightFront.position.set(0, 1, 3);
    this.lampGroup.add(this.rimLightFront);

    this.bubbleMaterial = new THREE.MeshBasicMaterial({
      color: BUBBLE_COLOR,
      transparent: true,
      opacity: 0.6
    });

    this.createBaseStand();
  }

  private createInnerLiquidMaterial(): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: 0x1a0f0a,
      transparent: true,
      opacity: 0.7,
      transmission: 0.4,
      roughness: 0.2,
      metalness: 0.0,
      thickness: 1.0,
      ior: 1.33,
      side: THREE.BackSide,
      depthWrite: false
    });
  }

  private createGlassMaterial(): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: 0xaaccff,
      transparent: true,
      opacity: 0.4,
      transmission: 0.9,
      roughness: 0.05,
      metalness: 0.0,
      thickness: 0.3,
      ior: 1.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      reflectivity: 0.3,
      side: THREE.DoubleSide,
      envMapIntensity: 0.8
    });
  }

  private createHeatSourceMaterial(): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color: HEAT_START_COLOR.clone(),
      emissive: HEAT_START_COLOR.clone(),
      emissiveIntensity: this.baseEmissiveIntensity,
      transparent: true,
      opacity: 0.95,
      roughness: 0.3,
      metalness: 0.1
    });
  }

  private createGlassContainer(): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(
      CONTAINER_RADIUS,
      CONTAINER_RADIUS,
      CONTAINER_HEIGHT,
      48,
      2,
      false
    );

    const mesh = new THREE.Mesh(geometry, this.containerGlass);
    mesh.position.y = 0;
    return mesh;
  }

  private createInnerLiquid(): THREE.Mesh {
    const geometry = new THREE.CylinderGeometry(
      CONTAINER_RADIUS - 0.05,
      CONTAINER_RADIUS - 0.05,
      CONTAINER_HEIGHT - 0.1,
      48,
      1,
      false
    );

    const mesh = new THREE.Mesh(geometry, this.innerLiquidMaterial);
    mesh.position.y = 0;
    return mesh;
  }

  private createHeatSource(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(HEAT_SOURCE_RADIUS, 32, 32);
    const mesh = new THREE.Mesh(geometry, this.heatSourceMaterial);
    mesh.position.y = CONTAINER_MIN_Y + 0.3;
    return mesh;
  }

  private createHeatLight(): THREE.PointLight {
    const light = new THREE.PointLight(0xff6600, 2.0, 8, 2);
    light.position.copy(this.heatSource.position);
    return light;
  }

  private createBaseStand(): void {
    const baseGeo = new THREE.CylinderGeometry(CONTAINER_RADIUS + 0.15, CONTAINER_RADIUS + 0.2, 0.3, 32);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      metalness: 0.8,
      roughness: 0.3
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = CONTAINER_MIN_Y - CONTAINER_HEIGHT / 2 - 0.15;
    this.lampGroup.add(base);

    const topGeo = new THREE.CylinderGeometry(CONTAINER_RADIUS + 0.15, CONTAINER_RADIUS + 0.2, 0.2, 32);
    const top = new THREE.Mesh(topGeo, baseMat);
    top.position.y = CONTAINER_MIN_Y + CONTAINER_HEIGHT / 2 + 0.1;
    this.lampGroup.add(top);
  }

  public update(deltaTime: number, globalTime: number): void {
    const pulse = Math.sin(globalTime * 2.0) * 0.5 + 0.5;
    const heatColor = new THREE.Color().lerpColors(
      HEAT_START_COLOR,
      HEAT_END_COLOR,
      pulse
    );
    this.heatSourceMaterial.color.copy(heatColor);
    this.heatSourceMaterial.emissive.copy(heatColor);
    this.heatSourceMaterial.emissiveIntensity =
      this.baseEmissiveIntensity * this.currentHeatIntensity * (0.85 + pulse * 0.3);

    this.heatLight.color.copy(heatColor);
    this.heatLight.intensity = 2.0 * this.currentHeatIntensity * (0.8 + pulse * 0.4);

    const heatScale = 1 + pulse * 0.05;
    this.heatSource.scale.setScalar(heatScale);

    this.bubbleSpawnTimer += deltaTime;
    const spawnInterval = 0.5 / this.currentHeatIntensity;
    if (this.bubbleSpawnTimer > spawnInterval && this.convectionBubbles.length < this.maxConvectionBubbles) {
      this.bubbleSpawnTimer = 0;
      this.spawnConvectionBubble();
    }

    this.updateConvectionBubbles(deltaTime);
  }

  private spawnConvectionBubble(): void {
    const radius = 0.06 + Math.random() * 0.08;
    const geometry = new THREE.SphereGeometry(radius, 8, 8);
    const material = this.bubbleMaterial.clone();

    const mesh = new THREE.Mesh(geometry, material);
    const angle = Math.random() * Math.PI * 2;
    const rDist = Math.random() * 0.5;
    mesh.position.set(
      Math.cos(angle) * rDist,
      CONTAINER_MIN_Y + 0.5,
      Math.sin(angle) * rDist
    );

    this.lampGroup.add(mesh);
    this.convectionBubbles.push({
      mesh,
      speed: 0.3 + Math.random() * 0.4,
      life: 0,
      maxLife: 2.5 + Math.random() * 1.5
    });
  }

  private updateConvectionBubbles(deltaTime: number): void {
    for (let i = this.convectionBubbles.length - 1; i >= 0; i--) {
      const bubble = this.convectionBubbles[i];
      bubble.life += deltaTime;

      bubble.mesh.position.y += bubble.speed * deltaTime * this.currentHeatIntensity;

      const wobble = Math.sin(bubble.life * 3 + bubble.mesh.position.y * 2) * 0.05;
      bubble.mesh.position.x += wobble * deltaTime * 5;
      bubble.mesh.position.z += wobble * deltaTime * 3;

      const progress = bubble.life / bubble.maxLife;
      const mat = bubble.mesh.material as THREE.MeshBasicMaterial;
      if (progress > 0.7) {
        mat.opacity = 0.6 * (1 - (progress - 0.7) / 0.3);
      }

      if (bubble.life >= bubble.maxLife || bubble.mesh.position.y > CONTAINER_MIN_Y + CONTAINER_HEIGHT - 0.5) {
        this.lampGroup.remove(bubble.mesh);
        bubble.mesh.geometry.dispose();
        mat.dispose();
        this.convectionBubbles.splice(i, 1);
      }
    }
  }

  public setContainerBackgroundColor(color: THREE.Color | string | number): void {
    const c = new THREE.Color(color);
    this.innerLiquidMaterial.color.copy(c).multiplyScalar(0.4);
    this.scene.background = new THREE.Color(0x0a0a1a);
  }

  public setHeatIntensity(multiplier: number): void {
    this.currentHeatIntensity = THREE.MathUtils.clamp(multiplier, 0, 2);
  }

  public getGroup(): THREE.Group {
    return this.lampGroup;
  }

  public dispose(): void {
    this.scene.remove(this.lampGroup);

    for (const bubble of this.convectionBubbles) {
      bubble.mesh.geometry.dispose();
      (bubble.mesh.material as THREE.Material).dispose();
    }
    this.convectionBubbles = [];
    this.bubbleMaterial.dispose();

    this.containerMesh.geometry.dispose();
    this.containerGlass.dispose();
    this.innerLiquid.geometry.dispose();
    this.innerLiquidMaterial.dispose();
    this.heatSource.geometry.dispose();
    this.heatSourceMaterial.dispose();
  }
}
