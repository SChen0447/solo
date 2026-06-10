import * as THREE from 'three';

export interface StrataTransform {
  rotationX: number;
  rotationY: number;
  offsetZ: number;
  foldAmplitude: number;
}

interface StratumLayer {
  mesh: THREE.Mesh;
  edges: THREE.LineSegments;
  material: THREE.ShaderMaterial;
  height: number;
  baseY: number;
}

const vertexShader = `
  uniform float uFoldAmplitude;
  uniform float uFoldFrequency;
  uniform float uOffsetZ;
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 pos = position;
    float fold = sin(pos.z * uFoldFrequency + uTime * 0.3) * uFoldAmplitude;
    pos.y += fold;
    pos.z += uOffsetZ * (pos.y * 0.2);
    vNormal = normal;
    vPosition = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 uColor;
  varying vec3 vNormal;
  varying vec3 vPosition;

  void main() {
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.8));
    float diff = max(dot(vNormal, lightDir), 0.0);
    vec3 ambient = uColor * 0.4;
    vec3 diffuse = uColor * diff * 0.6;
    gl_FragColor = vec4(ambient + diffuse, 1.0);
  }
`;

function hexToRgb(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

function lerpColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(color1, color2, t);
}

export class StrataScene {
  public group: THREE.Group;
  private layers: StratumLayer[] = [];
  private materials: THREE.ShaderMaterial[] = [];
  private currentTransform: StrataTransform = {
    rotationX: 0,
    rotationY: 0,
    offsetZ: 0,
    foldAmplitude: 0.5
  };
  private targetTransform: StrataTransform = {
    rotationX: 0,
    rotationY: 0,
    offsetZ: 0,
    foldAmplitude: 0.5
  };
  private startTime = 0;
  private animating = false;
  private animationDuration = 0.3;
  private clock: THREE.Clock;
  private readonly foldFrequency = 0.5;
  private readonly strataWidth = 6;
  private readonly strataDepth = 8;

  constructor() {
    this.group = new THREE.Group();
    this.clock = new THREE.Clock();
    this.generateStrata();
  }

  private generateStrata(): void {
    const layerCount = Math.floor(Math.random() * 6) + 10;
    const colorStart = hexToRgb('#8B4513');
    const colorEnd = hexToRgb('#D2B48C');
    let currentY = 0;
    const totalHeights: number[] = [];
    let totalHeight = 0;

    for (let i = 0; i < layerCount; i++) {
      const height = 0.3 + Math.random() * 0.5;
      totalHeights.push(height);
      totalHeight += height;
    }

    currentY = -totalHeight / 2;

    for (let i = 0; i < layerCount; i++) {
      const height = totalHeights[i];
      const colorT = i / (layerCount - 1);
      const color = lerpColor(colorStart, colorEnd, colorT);

      const geometry = new THREE.BoxGeometry(this.strataWidth, height, this.strataDepth, 20, 1, 20);

      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uFoldAmplitude: { value: this.currentTransform.foldAmplitude },
          uFoldFrequency: { value: this.foldFrequency },
          uOffsetZ: { value: this.currentTransform.offsetZ },
          uTime: { value: 0 },
          uColor: { value: color }
        }
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = currentY + height / 2;

      const edgeGeometry = new THREE.EdgesGeometry(geometry);
      const edgeMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
        linewidth: 1
      });
      const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      edges.position.copy(mesh.position);

      this.group.add(mesh);
      this.group.add(edges);
      this.layers.push({ mesh, edges, material, height, baseY: currentY });
      this.materials.push(material);

      currentY += height;
    }
  }

  public updateTransform(transform: Partial<StrataTransform>): void {
    this.targetTransform = { ...this.targetTransform, ...transform };
    this.startTime = performance.now();
    this.animating = true;
  }

  public reset(): void {
    this.targetTransform = {
      rotationX: 0,
      rotationY: 0,
      offsetZ: 0,
      foldAmplitude: 0.5
    };
    this.startTime = performance.now();
    this.animating = true;
  }

  public animate(): void {
    const elapsed = this.clock.getElapsedTime();

    if (this.animating) {
      const now = performance.now();
      const t = Math.min((now - this.startTime) / (this.animationDuration * 1000), 1);
      const easeT = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      this.currentTransform.rotationX += (this.targetTransform.rotationX - this.currentTransform.rotationX) * easeT * 0.2;
      this.currentTransform.rotationY += (this.targetTransform.rotationY - this.currentTransform.rotationY) * easeT * 0.2;
      this.currentTransform.offsetZ += (this.targetTransform.offsetZ - this.currentTransform.offsetZ) * easeT * 0.2;
      this.currentTransform.foldAmplitude += (this.targetTransform.foldAmplitude - this.currentTransform.foldAmplitude) * easeT * 0.2;

      if (t >= 1) {
        this.currentTransform = { ...this.targetTransform };
        this.animating = false;
      }
    }

    this.materials.forEach((mat) => {
      mat.uniforms.uFoldAmplitude.value = this.currentTransform.foldAmplitude;
      mat.uniforms.uOffsetZ.value = this.currentTransform.offsetZ;
      mat.uniforms.uTime.value = elapsed;
    });

    this.group.rotation.x = this.currentTransform.rotationX;
    this.group.rotation.y = this.currentTransform.rotationY;
  }

  public getCurrentTransform(): StrataTransform {
    return { ...this.currentTransform };
  }
}
