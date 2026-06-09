import * as THREE from 'three';
import type { VolumeData } from './DataLoader';

export type RenderMode = 'isosurface' | 'volumerender' | 'overlay';

const volumeVertexShader = `
  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;

  void main() {
    vLocalPosition = position * 0.5 + 0.5;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const volumeFragmentShader = `
  precision highp float;

  uniform sampler3D uVolumeTexture;
  uniform float uThreshold;
  uniform float uOpacity;
  uniform int uRenderMode;
  uniform vec3 uVolumeSize;
  uniform vec3 uCameraPos;

  varying vec3 vWorldPosition;
  varying vec3 vLocalPosition;

  float getDensity(vec3 pos) {
    if (pos.x < 0.0 || pos.x > 1.0 || pos.y < 0.0 || pos.y > 1.0 || pos.z < 0.0 || pos.z > 1.0) {
      return 0.0;
    }
    return texture(uVolumeTexture, pos).r;
  }

  vec3 getGradient(vec3 pos) {
    float delta = 1.0 / 128.0;
    float dx = getDensity(pos + vec3(delta, 0.0, 0.0)) - getDensity(pos - vec3(delta, 0.0, 0.0));
    float dy = getDensity(pos + vec3(0.0, delta, 0.0)) - getDensity(pos - vec3(0.0, delta, 0.0));
    float dz = getDensity(pos + vec3(0.0, 0.0, delta)) - getDensity(pos - vec3(0.0, 0.0, delta));
    return normalize(vec3(dx, dy, dz) + vec3(0.0001));
  }

  vec4 transferFunction(float density) {
    float normalized = density / 255.0;

    if (density < uThreshold) {
      return vec4(0.0);
    }

    vec3 color;
    float alpha;

    if (uRenderMode == 0) {
      color = mix(vec3(0.7, 0.75, 0.9), vec3(1.0, 0.95, 0.9), normalized);
      alpha = 1.0 * uOpacity;
    } else if (uRenderMode == 1) {
      if (normalized < 0.3) {
        color = vec3(0.2, 0.4, 0.6);
        alpha = 0.05 * uOpacity;
      } else if (normalized < 0.6) {
        color = vec3(0.4, 0.6, 0.5);
        alpha = 0.15 * uOpacity;
      } else if (normalized < 0.85) {
        color = vec3(0.8, 0.5, 0.4);
        alpha = 0.35 * uOpacity;
      } else {
        color = vec3(1.0, 0.95, 0.85);
        alpha = 0.7 * uOpacity;
      }
    } else {
      if (normalized < 0.3) {
        color = vec3(0.3, 0.5, 0.8);
        alpha = 0.08 * uOpacity;
      } else if (normalized < 0.7) {
        color = vec3(0.9, 0.6, 0.5);
        alpha = 0.25 * uOpacity;
      } else {
        color = vec3(1.0, 0.95, 0.9);
        alpha = 0.85 * uOpacity;
      }
    }

    return vec4(color, alpha);
  }

  bool intersectBox(vec3 ro, vec3 rd, out float tNear, out float tFar) {
    vec3 invR = 1.0 / rd;
    vec3 tbot = invR * (vec3(0.0) - ro);
    vec3 ttop = invR * (vec3(1.0) - ro);
    vec3 tmin = min(ttop, tbot);
    vec3 tmax = max(ttop, tbot);
    tNear = max(max(tmin.x, tmin.y), tmin.z);
    tFar = min(min(tmax.x, tmax.y), tmax.z);
    return tNear < tFar && tFar > 0.0;
  }

  void main() {
    vec3 rayOrigin = vLocalPosition;
    vec3 rayDir = normalize(vWorldPosition - uCameraPos);

    vec3 localCameraPos = (inverse(modelMatrix) * vec4(uCameraPos, 1.0)).xyz * 0.5 + 0.5;
    vec3 localRayDir = normalize(rayOrigin - localCameraPos);

    float tNear, tFar;
    if (!intersectBox(localCameraPos, localRayDir, tNear, tFar)) {
      discard;
    }

    tNear = max(tNear, 0.0);

    const int MAX_STEPS = 256;
    float stepSize = (tFar - tNear) / float(MAX_STEPS);

    vec4 accumulatedColor = vec4(0.0);
    float t = tNear;

    for (int i = 0; i < MAX_STEPS; i++) {
      if (t > tFar || accumulatedColor.a >= 0.98) break;

      vec3 samplePos = localCameraPos + localRayDir * t;
      float density = getDensity(samplePos) * 255.0;
      vec4 color = transferFunction(density);

      if (color.a > 0.001) {
        vec3 gradient = getGradient(samplePos);
        vec3 lightDir = normalize(vec3(0.5, 0.8, 0.6));
        float diffuse = max(dot(gradient, lightDir), 0.0);
        float ambient = 0.3;
        vec3 litColor = color.rgb * (ambient + diffuse * 0.7);

        accumulatedColor.rgb += (1.0 - accumulatedColor.a) * color.a * litColor;
        accumulatedColor.a += (1.0 - accumulatedColor.a) * color.a;
      }

      t += stepSize;
    }

    if (accumulatedColor.a < 0.01) {
      discard;
    }

    gl_FragColor = accumulatedColor;
  }
`;

const sliceVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const sliceFragmentShader = `
  precision highp float;

  uniform sampler2D uSliceTexture;
  uniform vec3 uPlaneColor;
  uniform float uOpacity;

  varying vec2 vUv;

  void main() {
    float density = texture2D(uSliceTexture, vUv).r;
    if (density < 0.01) {
      discard;
    }
    vec3 baseColor = mix(vec3(0.0), uPlaneColor, 0.6);
    vec3 dataColor = vec3(density);
    vec3 finalColor = mix(baseColor, dataColor, 0.7);
    gl_FragColor = vec4(finalColor, uOpacity * 0.8);
  }
`;

export class VolumeRenderer {
  private scene: THREE.Scene;
  private volumeMesh: THREE.Mesh | null = null;
  private volumeMaterial: THREE.ShaderMaterial | null = null;
  private slicePlanes: Map<string, THREE.Mesh> = new Map();
  private sliceEdges: Map<string, THREE.LineSegments> = new Map();
  private currentVolume: VolumeData | null = null;
  private threshold: number = 100;
  private opacity: number = 1.0;
  private renderMode: RenderMode = 'isosurface';
  private fadeTransitionActive: boolean = false;
  private fadeDirection: number = 0;
  private fadeStartTime: number = 0;
  private readonly FADE_DURATION: number = 500;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public async setVolume(volume: VolumeData, animate: boolean = true): Promise<void> {
    if (animate && this.currentVolume) {
      await this.fadeOut();
    }

    this.currentVolume = volume;
    this.createVolumeMesh(volume);

    if (animate) {
      await this.fadeIn();
    } else {
      this.opacity = 1.0;
      this.updateMaterialUniforms();
    }
  }

  private createVolumeMesh(volume: VolumeData): void {
    if (this.volumeMesh) {
      this.scene.remove(this.volumeMesh);
      (this.volumeMesh.geometry as THREE.BufferGeometry).dispose();
      (this.volumeMesh.material as THREE.Material).dispose();
    }

    const geometry = new THREE.BoxGeometry(1, 1, 1);

    this.volumeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uVolumeTexture: { value: volume.dataTexture },
        uThreshold: { value: this.threshold },
        uOpacity: { value: this.opacity },
        uRenderMode: { value: this.getRenderModeIndex() },
        uVolumeSize: { value: new THREE.Vector3(volume.width, volume.height, volume.depth) },
        uCameraPos: { value: new THREE.Vector3() }
      },
      vertexShader: volumeVertexShader,
      fragmentShader: volumeFragmentShader,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.volumeMesh = new THREE.Mesh(geometry, this.volumeMaterial);
    this.volumeMesh.position.set(0, 0, 0);
    this.scene.add(this.volumeMesh);
  }

  private getRenderModeIndex(): number {
    switch (this.renderMode) {
      case 'isosurface': return 0;
      case 'volumerender': return 1;
      case 'overlay': return 2;
    }
  }

  public setThreshold(threshold: number): void {
    this.threshold = Math.max(0, Math.min(255, threshold));
    this.updateMaterialUniforms();
  }

  public setOpacity(opacity: number): void {
    this.opacity = Math.max(0, Math.min(1, opacity));
    this.updateMaterialUniforms();
  }

  public setRenderMode(mode: RenderMode): void {
    this.renderMode = mode;
    this.updateMaterialUniforms();
  }

  public setScale(scale: number): void {
    if (this.volumeMesh) {
      this.volumeMesh.scale.setScalar(scale);
    }
    this.updateSlicePlanesScale(scale);
  }

  private updateMaterialUniforms(): void {
    if (this.volumeMaterial) {
      this.volumeMaterial.uniforms.uThreshold.value = this.threshold;
      this.volumeMaterial.uniforms.uOpacity.value = this.opacity;
      this.volumeMaterial.uniforms.uRenderMode.value = this.getRenderModeIndex();
      this.volumeMaterial.needsUpdate = true;
    }
  }

  public updateCameraPosition(camera: THREE.Camera): void {
    if (this.volumeMaterial) {
      this.volumeMaterial.uniforms.uCameraPos.value.copy(camera.position);
    }
  }

  public updateSlicePlane(
    plane: 'sagittal' | 'coronal' | 'axial',
    index: number,
    volume: VolumeData
  ): void {
    const planeKey = plane;
    const size = 1.0;
    const normalizedIndex = index / (
      plane === 'sagittal' ? volume.width :
      plane === 'coronal' ? volume.height :
      volume.depth
    );

    let geometry: THREE.PlaneGeometry;
    let position: THREE.Vector3;
    let rotation: THREE.Euler;
    let color: THREE.Color;

    switch (plane) {
      case 'sagittal':
        geometry = new THREE.PlaneGeometry(size, size);
        position = new THREE.Vector3(normalizedIndex - 0.5, 0, 0);
        rotation = new THREE.Euler(0, Math.PI / 2, 0);
        color = new THREE.Color(0xFF4444);
        break;
      case 'coronal':
        geometry = new THREE.PlaneGeometry(size, size);
        position = new THREE.Vector3(0, normalizedIndex - 0.5, 0);
        rotation = new THREE.Euler(-Math.PI / 2, 0, 0);
        color = new THREE.Color(0x44FF44);
        break;
      case 'axial':
      default:
        geometry = new THREE.PlaneGeometry(size, size);
        position = new THREE.Vector3(0, 0, normalizedIndex - 0.5);
        rotation = new THREE.Euler(0, 0, 0);
        color = new THREE.Color(0x4444FF);
        break;
    }

    const sliceTexture = this.createSliceTexture(volume, plane, index);

    if (this.slicePlanes.has(planeKey)) {
      const oldMesh = this.slicePlanes.get(planeKey)!;
      this.scene.remove(oldMesh);
      (oldMesh.geometry as THREE.BufferGeometry).dispose();
      const oldMat = oldMesh.material as THREE.ShaderMaterial;
      (oldMat.uniforms.uSliceTexture.value as THREE.Texture).dispose();
      oldMat.dispose();
    }

    if (this.sliceEdges.has(planeKey)) {
      const oldEdges = this.sliceEdges.get(planeKey)!;
      this.scene.remove(oldEdges);
      (oldEdges.geometry as THREE.BufferGeometry).dispose();
      (oldEdges.material as THREE.Material).dispose();
    }

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uSliceTexture: { value: sliceTexture },
        uPlaneColor: { value: color },
        uOpacity: { value: 0.3 }
      },
      vertexShader: sliceVertexShader,
      fragmentShader: sliceFragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const planeMesh = new THREE.Mesh(geometry, material);
    planeMesh.position.copy(position);
    planeMesh.rotation.copy(rotation);
    this.scene.add(planeMesh);
    this.slicePlanes.set(planeKey, planeMesh);

    const edgeGeometry = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 0.05,
      gapSize: 0.03,
      transparent: true,
      opacity: 0.8
    });
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    edges.position.copy(position);
    edges.rotation.copy(rotation);
    edges.computeLineDistances();
    this.scene.add(edges);
    this.sliceEdges.set(planeKey, edges);

    if (this.volumeMesh) {
      const scale = this.volumeMesh.scale.x;
      this.updateSlicePlanesScale(scale);
    }
  }

  private createSliceTexture(
    volume: VolumeData,
    plane: 'sagittal' | 'coronal' | 'axial',
    index: number
  ): THREE.DataTexture {
    let width: number;
    let height: number;
    let data: Uint8Array;

    if (plane === 'sagittal') {
      width = volume.height;
      height = volume.depth;
      data = new Uint8Array(width * height);
      for (let z = 0; z < volume.depth; z++) {
        for (let y = 0; y < volume.height; y++) {
          const srcIdx = (z * volume.height * volume.width) + (y * volume.width) + index;
          const dstIdx = (z * width) + y;
          data[dstIdx] = volume.data[srcIdx];
        }
      }
    } else if (plane === 'coronal') {
      width = volume.width;
      height = volume.depth;
      data = new Uint8Array(width * height);
      for (let z = 0; z < volume.depth; z++) {
        for (let x = 0; x < volume.width; x++) {
          const srcIdx = (z * volume.height * volume.width) + (index * volume.width) + x;
          const dstIdx = (z * width) + x;
          data[dstIdx] = volume.data[srcIdx];
        }
      }
    } else {
      width = volume.width;
      height = volume.height;
      data = new Uint8Array(width * height);
      for (let y = 0; y < volume.height; y++) {
        for (let x = 0; x < volume.width; x++) {
          const srcIdx = (index * volume.height * volume.width) + (y * volume.width) + x;
          const dstIdx = (y * width) + x;
          data[dstIdx] = volume.data[srcIdx];
        }
      }
    }

    const texture = new THREE.DataTexture(data as unknown as BufferSource, width, height, THREE.RedFormat);
    texture.type = THREE.UnsignedByteType;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.unpackAlignment = 1;
    texture.needsUpdate = true;
    return texture;
  }

  private updateSlicePlanesScale(scale: number): void {
    this.slicePlanes.forEach((mesh) => {
      mesh.scale.setScalar(scale);
    });
    this.sliceEdges.forEach((edges) => {
      edges.scale.setScalar(scale);
    });
  }

  public removeSlicePlanes(): void {
    this.slicePlanes.forEach((mesh) => {
      this.scene.remove(mesh);
      (mesh.geometry as THREE.BufferGeometry).dispose();
      const mat = mesh.material as THREE.ShaderMaterial;
      (mat.uniforms.uSliceTexture.value as THREE.Texture).dispose();
      mat.dispose();
    });
    this.slicePlanes.clear();

    this.sliceEdges.forEach((edges) => {
      this.scene.remove(edges);
      (edges.geometry as THREE.BufferGeometry).dispose();
      (edges.material as THREE.Material).dispose();
    });
    this.sliceEdges.clear();
  }

  private fadeOut(): Promise<void> {
    return new Promise((resolve) => {
      this.fadeTransitionActive = true;
      this.fadeDirection = -1;
      this.fadeStartTime = performance.now();

      const checkFade = () => {
        if (!this.fadeTransitionActive || this.fadeDirection !== -1) {
          resolve();
          return;
        }
        requestAnimationFrame(checkFade);
      };
      checkFade();
    });
  }

  private fadeIn(): Promise<void> {
    return new Promise((resolve) => {
      this.fadeTransitionActive = true;
      this.fadeDirection = 1;
      this.fadeStartTime = performance.now();

      const checkFade = () => {
        if (!this.fadeTransitionActive || this.fadeDirection !== 1) {
          resolve();
          return;
        }
        requestAnimationFrame(checkFade);
      };
      checkFade();
    });
  }

  public renderVolume(camera: THREE.Camera): void {
    this.updateCameraPosition(camera);

    if (this.fadeTransitionActive) {
      const elapsed = performance.now() - this.fadeStartTime;
      const progress = Math.min(elapsed / this.FADE_DURATION, 1.0);
      const eased = 1 - Math.pow(1 - progress, 3);

      if (this.fadeDirection === 1) {
        this.opacity = eased;
      } else {
        this.opacity = 1 - eased;
      }

      this.updateMaterialUniforms();

      if (progress >= 1.0) {
        this.fadeTransitionActive = false;
        this.fadeDirection = 0;
      }
    }
  }

  public getVolumeMesh(): THREE.Mesh | null {
    return this.volumeMesh;
  }

  public getThreshold(): number {
    return this.threshold;
  }

  public getOpacity(): number {
    return this.opacity;
  }

  public getRenderMode(): RenderMode {
    return this.renderMode;
  }

  public dispose(): void {
    if (this.volumeMesh) {
      this.scene.remove(this.volumeMesh);
      (this.volumeMesh.geometry as THREE.BufferGeometry).dispose();
      (this.volumeMesh.material as THREE.Material).dispose();
      this.volumeMesh = null;
    }
    this.removeSlicePlanes();
  }
}
