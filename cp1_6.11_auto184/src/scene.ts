import * as THREE from 'three';
import { MaterialType, MATERIAL_CONFIGS } from './audio';

export interface ChimeTube {
  id: number;
  material: MaterialType;
  length: number;
  mesh: THREE.Group;
  tubeMesh: THREE.Mesh;
  string: THREE.Mesh;
  pivot: THREE.Vector3;
  vibration: {
    amplitude: number;
    frequency: number;
    phase: number;
    damping: number;
    axis: THREE.Vector3;
  };
  resonance: number;
  glowIntensity: number;
  targetGlow: number;
}

export class SceneBuilder {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public ambientLight: THREE.AmbientLight;
  public directionalLight: THREE.DirectionalLight;
  public chimeTubes: ChimeTube[] = [];
  public windStrength: number = 5.0;
  public ambientIntensity: number = 0.5;
  public frameGroup: THREE.Group;
  public groundMirror: THREE.Mesh | null = null;

  private tubeIdCounter: number = 0;
  private baseBackgroundColor = new THREE.Color('#050510');

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = this.baseBackgroundColor.clone();
    this.scene.fog = new THREE.FogExp2('#050510', 0.08);

    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 3.5, 6.5);
    this.camera.lookAt(0, 0.5, 0);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.ambientLight = new THREE.AmbientLight(0x6688aa, 0.5);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    this.directionalLight.position.set(5, 8, 4);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.set(2048, 2048);
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 30;
    this.directionalLight.shadow.camera.left = -8;
    this.directionalLight.shadow.camera.right = 8;
    this.directionalLight.shadow.camera.top = 8;
    this.directionalLight.shadow.camera.bottom = -8;
    this.scene.add(this.directionalLight);

    const fillLight = new THREE.DirectionalLight(0x8899ff, 0.3);
    fillLight.position.set(-4, 3, -5);
    this.scene.add(fillLight);

    this.frameGroup = new THREE.Group();
    this.scene.add(this.frameGroup);

    this.createGround();
    this.createChimeFrame();
    this.createChimeTubes();
  }

  private createGround(): void {
    const mirrorGeo = new THREE.PlaneGeometry(40, 40);
    const mirrorMat = new THREE.MeshPhysicalMaterial({
      color: 0x0a1428,
      metalness: 0.9,
      roughness: 0.15,
      transparent: true,
      opacity: 0.3,
      reflectivity: 1.0,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2
    });
    this.groundMirror = new THREE.Mesh(mirrorGeo, mirrorMat);
    this.groundMirror.rotation.x = -Math.PI / 2;
    this.groundMirror.position.y = -3.5;
    this.groundMirror.receiveShadow = true;
    this.scene.add(this.groundMirror);

    const gridHelper = new THREE.GridHelper(20, 40, 0x223355, 0x15203a);
    gridHelper.position.y = -3.49;
    (gridHelper.material as THREE.Material).opacity = 0.2;
    (gridHelper.material as THREE.Material).transparent = true;
    this.scene.add(gridHelper);
  }

  private createChimeFrame(): void {
    const frameGroup = new THREE.Group();
    frameGroup.position.y = 2.2;

    const bronzeColor = 0x8b6914;
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: bronzeColor,
      metalness: 0.85,
      roughness: 0.35,
      emissive: 0x2a1a05,
      emissiveIntensity: 0.15
    });

    const ringRadius = 2.0;
    const ringTubeRadius = 0.08;
    const ringGeo = new THREE.TorusGeometry(ringRadius, ringTubeRadius, 32, 64);
    const ringMesh = new THREE.Mesh(ringGeo, frameMaterial);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.castShadow = true;
    ringMesh.receiveShadow = true;
    frameGroup.add(ringMesh);

    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const endAngle = angle + Math.PI;
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(Math.cos(angle) * ringRadius, 0, Math.sin(angle) * ringRadius),
        new THREE.Vector3(0, 0.6 + Math.sin(i * 0.7) * 0.15, 0),
        new THREE.Vector3(Math.cos(endAngle) * ringRadius, 0, Math.sin(endAngle) * ringRadius)
      );
      const tubeGeo = new THREE.TubeGeometry(curve, 48, 0.06, 12, false);
      const tubeMesh = new THREE.Mesh(tubeGeo, frameMaterial);
      tubeMesh.castShadow = true;
      frameGroup.add(tubeMesh);
    }

    const topRingGeo = new THREE.TorusGeometry(0.25, 0.05, 16, 32);
    const topRing = new THREE.Mesh(topRingGeo, frameMaterial);
    topRing.position.y = 0.8;
    topRing.castShadow = true;
    frameGroup.add(topRing);

    const connectorGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 16);
    const connector = new THREE.Mesh(connectorGeo, frameMaterial);
    connector.position.y = 0.4;
    connector.castShadow = true;
    frameGroup.add(connector);

    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + Math.PI / 6;
      const supportGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.9, 12);
      const support = new THREE.Mesh(supportGeo, frameMaterial);
      const supportCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(Math.cos(angle) * 0.22, 0.75, Math.sin(angle) * 0.22),
        new THREE.Vector3(Math.cos(angle) * 0.8, 0.4, Math.sin(angle) * 0.8),
        new THREE.Vector3(Math.cos(angle) * ringRadius * 0.95, 0.05, Math.sin(angle) * ringRadius * 0.95)
      );
      const supportTubeGeo = new THREE.TubeGeometry(supportCurve, 24, 0.035, 10, false);
      const supportTube = new THREE.Mesh(supportTubeGeo, frameMaterial);
      supportTube.castShadow = true;
      frameGroup.add(supportTube);
    }

    this.frameGroup.add(frameGroup);
  }

  private createChimeTubes(): void {
    const materials: MaterialType[] = ['glass', 'metal', 'bamboo', 'shell', 'glass', 'metal'];
    const ringRadius = 1.35;

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + Math.random() * 0.1;
      const material = materials[i % materials.length];
      const length = 1.0 + Math.random() * 1.0;
      
      const x = Math.cos(angle) * ringRadius;
      const z = Math.sin(angle) * ringRadius;

      const tube = this.createTube(material, length);
      tube.pivot = new THREE.Vector3(x, 2.2, z);
      tube.mesh.position.set(x, 2.2, z);

      this.chimeTubes.push(tube);
      this.frameGroup.add(tube.mesh);
    }
  }

  private createTube(material: MaterialType, length: number): ChimeTube {
    const config = MATERIAL_CONFIGS[material];
    const tubeGroup = new THREE.Group();
    const id = this.tubeIdCounter++;

    const tubeRadius = 0.075;
    const tubeGeo = new THREE.CylinderGeometry(tubeRadius, tubeRadius, length, 24, 1, true);
    
    let tubeMat: THREE.MeshStandardMaterial;
    
    switch (material) {
      case 'glass':
        tubeMat = new THREE.MeshPhysicalMaterial({
          color: 0x88ddff,
          metalness: 0.1,
          roughness: 0.05,
          transparent: true,
          opacity: 0.65,
          transmission: 0.8,
          thickness: 0.15,
          clearcoat: 1.0,
          clearcoatRoughness: 0.05,
          emissive: new THREE.Color(config.glowColor),
          emissiveIntensity: 0.2
        });
        break;
      case 'metal':
        tubeMat = new THREE.MeshStandardMaterial({
          color: 0xc0c8d0,
          metalness: 0.95,
          roughness: 0.15,
          emissive: new THREE.Color(config.glowColor),
          emissiveIntensity: 0.1
        });
        break;
      case 'bamboo':
        tubeMat = new THREE.MeshStandardMaterial({
          color: 0xb88650,
          metalness: 0.05,
          roughness: 0.75,
          emissive: new THREE.Color(config.glowColor),
          emissiveIntensity: 0.08
        });
        break;
      case 'shell':
      default:
        tubeMat = new THREE.MeshPhysicalMaterial({
          color: 0xf0e8dc,
          metalness: 0.2,
          roughness: 0.25,
          transparent: true,
          opacity: 0.9,
          iridescence: 0.6,
          iridescenceIOR: 1.3,
          clearcoat: 0.8,
          clearcoatRoughness: 0.1,
          emissive: new THREE.Color(config.glowColor),
          emissiveIntensity: 0.12
        });
        break;
    }

    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    tubeMesh.position.y = -length / 2;
    tubeMesh.castShadow = true;
    tubeMesh.receiveShadow = true;
    tubeGroup.add(tubeMesh);

    const capGeo = new THREE.CircleGeometry(tubeRadius, 24);
    const capMat = tubeMat.clone();
    (capMat as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    const topCap = new THREE.Mesh(capGeo, capMat);
    topCap.rotation.x = Math.PI / 2;
    topCap.position.y = -0.01;
    tubeGroup.add(topCap);

    const stringGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.35, 8);
    const stringMat = new THREE.MeshStandardMaterial({
      color: 0x3a3020,
      roughness: 0.9,
      metalness: 0
    });
    const string = new THREE.Mesh(stringGeo, stringMat);
    string.position.y = 0.175;
    tubeGroup.add(string);

    const knotGeo = new THREE.SphereGeometry(0.02, 12, 12);
    const knot = new THREE.Mesh(knotGeo, stringMat);
    knot.position.y = 0.02;
    tubeGroup.add(knot);

    const vibrateAxis = new THREE.Vector3(
      Math.random() - 0.5,
      0,
      Math.random() - 0.5
    ).normalize();

    return {
      id,
      material,
      length,
      mesh: tubeGroup,
      tubeMesh,
      string,
      pivot: new THREE.Vector3(),
      vibration: {
        amplitude: 0,
        frequency: 3.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
        damping: 2.5,
        axis: vibrateAxis
      },
      resonance: 0,
      glowIntensity: 0.2,
      targetGlow: 0.2
    };
  }

  triggerTube(tubeId: number, velocity: number = 1.0): ChimeTube | null {
    const tube = this.chimeTubes.find(t => t.id === tubeId);
    if (!tube) return null;

    tube.vibration.amplitude = Math.min(0.35, 0.08 + velocity * 0.22);
    tube.vibration.phase = 0;
    tube.targetGlow = 1.2;
    
    return tube;
  }

  addResonance(tubeId: number, amount: number): ChimeTube | null {
    const tube = this.chimeTubes.find(t => t.id === tubeId);
    if (!tube) return null;

    tube.resonance = Math.min(1.0, tube.resonance + amount);
    tube.vibration.amplitude = Math.min(
      0.12,
      tube.vibration.amplitude + amount * 0.08
    );
    tube.targetGlow = Math.max(tube.targetGlow, 0.5);
    
    return tube;
  }

  setWindStrength(strength: number): void {
    this.windStrength = strength;
  }

  setAmbientIntensity(intensity: number): void {
    this.ambientIntensity = intensity;
    this.ambientLight.intensity = 0.2 + intensity * 0.8;
    this.directionalLight.intensity = 0.5 + intensity * 1.2;

    const t = intensity;
    const bgColor = new THREE.Color().lerpColors(
      new THREE.Color('#03030a'),
      new THREE.Color('#1a2a4a'),
      t
    );
    this.scene.background = bgColor;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(bgColor);
    }
  }

  update(delta: number, time: number): void {
    for (const tube of this.chimeTubes) {
      tube.vibration.amplitude *= Math.exp(-tube.vibration.damping * delta);
      tube.resonance = Math.max(0, tube.resonance - delta * 1.5);
      
      const wind = (this.windStrength / 10) * 0.025;
      const windSwing = Math.sin(time * (0.8 + tube.id * 0.15)) * wind;
      const windSwing2 = Math.cos(time * (0.6 + tube.id * 0.2)) * wind * 0.6;

      const vibAngle = tube.vibration.amplitude * Math.sin(
        time * tube.vibration.frequency * Math.PI * 2 + tube.vibration.phase
      );

      const totalAngle = vibAngle + windSwing;
      const totalAngle2 = windSwing2;

      const axisX = tube.vibration.axis.x;
      const axisZ = tube.vibration.axis.z;
      
      tube.mesh.rotation.set(0, 0, 0);
      tube.mesh.rotateOnAxis(new THREE.Vector3(1, 0, 0), totalAngle * axisZ + totalAngle2);
      tube.mesh.rotateOnAxis(new THREE.Vector3(0, 0, 1), -totalAngle * axisX);

      if (tube.glowIntensity < tube.targetGlow) {
        tube.glowIntensity = Math.min(tube.targetGlow, tube.glowIntensity + delta * 6);
      } else {
        tube.glowIntensity = Math.max(0.2, tube.glowIntensity - delta * 2.5);
        tube.targetGlow = Math.max(0.2, tube.targetGlow - delta * 2);
      }

      const mat = tube.tubeMesh.material as THREE.MeshStandardMaterial;
      if (mat.emissiveIntensity !== undefined) {
        mat.emissiveIntensity = tube.glowIntensity * (0.5 + Math.random() * 0.1);
      }
    }

    const frameFloat = Math.sin(time * 0.5) * 0.03;
    this.frameGroup.position.y = frameFloat;
    this.frameGroup.rotation.y = Math.sin(time * 0.15) * 0.02;
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
