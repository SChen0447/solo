import * as THREE from 'three';

const CAMERA_CONFIG = {
  fov: 60,
  near: 0.1,
  far: 100,
  initialDistance: 3,
  minDistance: 1,
  maxDistance: 5,
  damping: 0.85,
  minPolarAngle: -Math.PI / 6,
  maxPolarAngle: Math.PI / 6,
};

const LAKE_VERTEX_SHADER = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  
  void main() {
    vUv = uv;
    vNormal = normal;
    
    vec3 pos = position;
    float wave = sin(pos.x * 0.5 + uTime * 0.8) * 0.02 + 
                 cos(pos.z * 0.7 + uTime * 0.6) * 0.015 +
                 sin((pos.x + pos.z) * 0.3 + uTime * 0.4) * 0.01;
    pos.y += wave;
    
    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPosition.xyz;
    
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const LAKE_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform vec3 uColorBottom;
  uniform vec3 uColorTop;
  uniform float uReflectivity;
  
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  
  void main() {
    vec3 normal = normalize(vNormal);
    float wave = sin(vUv.x * 20.0 + uTime * 2.0) * 0.02 + 
                 cos(vUv.y * 25.0 + uTime * 1.5) * 0.015;
    normal.x += wave;
    normal = normalize(normal);
    
    float fresnel = pow(1.0 - abs(dot(normal, vec3(0.0, 1.0, 0.0))), 2.0);
    float reflectivity = mix(uReflectivity * 0.5, uReflectivity, fresnel);
    
    float skyGradient = clamp(vWorldPosition.y * 0.1 + 0.5, 0.0, 1.0);
    vec3 skyColor = mix(uColorBottom, uColorTop, skyGradient);
    
    float ripple = sin(length(vUv - 0.5) * 50.0 - uTime * 3.0) * 0.5 + 0.5;
    vec3 waterColor = vec3(0.05, 0.08, 0.15);
    vec3 reflectionColor = mix(skyColor, waterColor, 0.3);
    
    vec3 finalColor = mix(waterColor, reflectionColor, reflectivity);
    finalColor += ripple * 0.02;
    
    float alpha = 0.85;
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export class SceneBuilder {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private lakeMaterial!: THREE.ShaderMaterial;
  
  private targetAzimuthAngle = 0;
  private targetPolarAngle = 0;
  private targetDistance = CAMERA_CONFIG.initialDistance;
  private currentAzimuthAngle = 0;
  private currentPolarAngle = 0;
  private currentDistance = CAMERA_CONFIG.initialDistance;
  
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  
  private fadeOpacity = 0;
  private fadeInComplete = false;
  
  private snowMountains: THREE.Group = new THREE.Group();

  constructor(container: HTMLElement) {
    this.container = container;
    
    this.scene = new THREE.Scene();
    this.setupBackground();
    
    this.camera = new THREE.PerspectiveCamera(
      CAMERA_CONFIG.fov,
      window.innerWidth / window.innerHeight,
      CAMERA_CONFIG.near,
      CAMERA_CONFIG.far
    );
    this.updateCameraPosition();
    
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    
    this.container.appendChild(this.renderer.domElement);
    
    this.setupLighting();
    this.createSnowMountains();
    this.createLake();
    this.setupEventListeners();
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#000510');
    gradient.addColorStop(0.3, '#001030');
    gradient.addColorStop(0.6, '#001a4d');
    gradient.addColorStop(1, '#000510');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    this.scene.background = texture;
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);
    
    const moonLight = new THREE.DirectionalLight(0xccccff, 0.3);
    moonLight.position.set(10, 20, 10);
    this.scene.add(moonLight);
    
    const rimLight = new THREE.DirectionalLight(0x8888ff, 0.2);
    rimLight.position.set(-10, 10, -10);
    this.scene.add(rimLight);
  }

  private createSnowMountains(): void {
    const mountainMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.8,
      metalness: 0.1,
      flatShading: true
    });
    
    const mountainCount = 8;
    const ridgeRadius = 15;
    
    for (let i = 0; i < mountainCount; i++) {
      const angle = (i / mountainCount) * Math.PI * 2;
      const distance = ridgeRadius + (Math.random() - 0.5) * 5;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      
      const baseWidth = 3 + Math.random() * 4;
      const baseDepth = 2 + Math.random() * 3;
      const height = 2 + Math.random() * 4;
      
      const mountain = this.createLowPolyMountain(baseWidth, baseDepth, height, mountainMaterial);
      mountain.position.set(x, height * 0.3 - 0.5, z);
      mountain.rotation.y = angle + Math.PI / 2 + (Math.random() - 0.5) * 0.3;
      
      this.snowMountains.add(mountain);
    }
    
    this.scene.add(this.snowMountains);
  }

  private createLowPolyMountain(
    width: number,
    depth: number,
    height: number,
    material: THREE.Material
  ): THREE.Mesh {
    const geometry = new THREE.BufferGeometry();
    const vertices: number[] = [];
    const indices: number[] = [];
    
    const segments = 5;
    const halfWidth = width / 2;
    const halfDepth = depth / 2;
    
    const peakHeight = height;
    const midHeight = height * 0.5;
    
    let vertexIndex = 0;
    
    vertices.push(0, peakHeight, 0);
    vertexIndex++;
    
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const radiusVariation = 0.7 + Math.random() * 0.6;
      const x = Math.cos(angle) * halfWidth * radiusVariation;
      const z = Math.sin(angle) * halfDepth * radiusVariation;
      const y = midHeight + (Math.random() - 0.5) * midHeight * 0.3;
      
      vertices.push(x, y, z);
      vertexIndex++;
    }
    
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const radiusVariation = 0.8 + Math.random() * 0.4;
      const x = Math.cos(angle) * halfWidth * radiusVariation;
      const z = Math.sin(angle) * halfDepth * radiusVariation;
      const y = 0;
      
      vertices.push(x, y, z);
      vertexIndex++;
    }
    
    for (let i = 1; i <= segments; i++) {
      const next = (i % segments) + 1;
      indices.push(0, i, next);
    }
    
    for (let i = 1; i <= segments; i++) {
      const next = (i % segments) + 1;
      const bottomI = i + segments;
      const bottomNext = next + segments;
      indices.push(i, bottomI, next);
      indices.push(next, bottomI, bottomNext);
    }
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    
    return new THREE.Mesh(geometry, material);
  }

  private createLake(): void {
    const lakeGeometry = new THREE.PlaneGeometry(40, 40, 64, 64);
    lakeGeometry.rotateX(-Math.PI / 2);
    
    this.lakeMaterial = new THREE.ShaderMaterial({
      vertexShader: LAKE_VERTEX_SHADER,
      fragmentShader: LAKE_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uColorBottom: { value: new THREE.Color(0x001030) },
        uColorTop: { value: new THREE.Color(0x00ff88) },
        uReflectivity: { value: 0.6 }
      },
      transparent: true,
      side: THREE.DoubleSide
    });
    
    const lake = new THREE.Mesh(lakeGeometry, this.lakeMaterial);
    lake.position.y = -0.5;
    this.scene.add(lake);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;
    
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this));
    
    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
    
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    
    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;
    
    this.targetAzimuthAngle -= deltaX * 0.005;
    this.targetPolarAngle -= deltaY * 0.005;
    
    this.targetPolarAngle = THREE.MathUtils.clamp(
      this.targetPolarAngle,
      CAMERA_CONFIG.minPolarAngle,
      CAMERA_CONFIG.maxPolarAngle
    );
    
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.targetDistance += e.deltaY * 0.005;
    this.targetDistance = THREE.MathUtils.clamp(
      this.targetDistance,
      CAMERA_CONFIG.minDistance,
      CAMERA_CONFIG.maxDistance
    );
  }

  private touchStartDistance = 0;

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this.touchStartDistance = Math.sqrt(dx * dx + dy * dy);
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging) {
      const deltaX = e.touches[0].clientX - this.lastMouseX;
      const deltaY = e.touches[0].clientY - this.lastMouseY;
      
      this.targetAzimuthAngle -= deltaX * 0.005;
      this.targetPolarAngle -= deltaY * 0.005;
      
      this.targetPolarAngle = THREE.MathUtils.clamp(
        this.targetPolarAngle,
        CAMERA_CONFIG.minPolarAngle,
        CAMERA_CONFIG.maxPolarAngle
      );
      
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      const delta = this.touchStartDistance - distance;
      this.targetDistance += delta * 0.01;
      this.targetDistance = THREE.MathUtils.clamp(
        this.targetDistance,
        CAMERA_CONFIG.minDistance,
        CAMERA_CONFIG.maxDistance
      );
      
      this.touchStartDistance = distance;
    }
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateCameraPosition(): void {
    const x = this.currentDistance * 
              Math.cos(this.currentPolarAngle) * 
              Math.sin(this.currentAzimuthAngle);
    const y = this.currentDistance * Math.sin(this.currentPolarAngle) + 1;
    const z = this.currentDistance * 
              Math.cos(this.currentPolarAngle) * 
              Math.cos(this.currentAzimuthAngle);
    
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  update(deltaTime: number, elapsedTime: number): void {
    if (!this.fadeInComplete) {
      this.fadeOpacity = Math.min(this.fadeOpacity + deltaTime / 1.5, 1);
      if (this.fadeOpacity >= 1) {
        this.fadeInComplete = true;
      }
    }
    
    const dampingFactor = 1 - CAMERA_CONFIG.damping;
    this.currentAzimuthAngle += (this.targetAzimuthAngle - this.currentAzimuthAngle) * dampingFactor;
    this.currentPolarAngle += (this.targetPolarAngle - this.currentPolarAngle) * dampingFactor;
    this.currentDistance += (this.targetDistance - this.currentDistance) * dampingFactor;
    
    this.updateCameraPosition();
    
    this.lakeMaterial.uniforms.uTime.value = elapsedTime;
    
    this.renderer.setClearColor(0x000000, this.fadeOpacity);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  resetCamera(): void {
    this.targetAzimuthAngle = 0;
    this.targetPolarAngle = 0;
    this.targetDistance = CAMERA_CONFIG.initialDistance;
  }

  setAuroraColors(bottom: THREE.Color, top: THREE.Color): void {
    this.lakeMaterial.uniforms.uColorBottom.value.copy(top);
    this.lakeMaterial.uniforms.uColorTop.value.copy(bottom);
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getFadeOpacity(): number {
    return this.fadeOpacity;
  }

  isFadeInComplete(): boolean {
    return this.fadeInComplete;
  }

  dispose(): void {
    window.removeEventListener('resize', this.onResize.bind(this));
    this.renderer.dispose();
  }
}
