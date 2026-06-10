import * as THREE from 'three';
import SimplexNoise from 'simplex-noise';

const simplex = new SimplexNoise();

export interface CapsuleData {
  id: string;
  emotionColor: string;
  createdAt: number;
  unlockAt: number;
}

interface PoolCapsule {
  mesh: THREE.Group;
  data: CapsuleData;
  baseZ: number;
  floatOffset: number;
  rising: boolean;
  riseStart: number;
  crackTexture?: THREE.Texture;
  mossTexture?: THREE.Texture;
}

const waterVertexShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying float vElevation;
  uniform float uNoiseScale;
  uniform float uNoiseStrength;
  
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec2 mod289(vec2 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
  
  float snoise(vec2 v){
    const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
    vec2 i=floor(v+dot(v,C.yy));
    vec2 x0=v-i+dot(i,C.xx);
    vec2 i1;
    i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);
    vec4 x12=x0.xyxy+C.xxzz;
    x12.xy-=i1;
    i=mod289(i);
    vec3 p=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
    vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);
    m=m*m;
    m=m*m;
    vec3 x=2.*fract(p*C.www)-1.;
    vec3 h=abs(x)-.5;
    vec3 ox=floor(x+.5);
    vec3 a0=x-ox;
    m*=1.79284291400159-.85373472095314*(a0*a0+h*h);
    vec3 g;
    g.x=a0.x*x0.x+h.x*x0.y;
    g.yz=a0.yz*x12.xz+h.yz*x12.yw;
    return 130.*dot(m,g);
  }
  
  void main() {
    vUv = uv;
    vec3 pos = position;
    float noiseFreq = uNoiseScale;
    float noiseAmp = uNoiseStrength;
    vec2 noisePos = pos.xy * noiseFreq + uTime * 0.5;
    float noise1 = snoise(noisePos) * noiseAmp;
    float noise2 = snoise(noisePos * 2.0) * noiseAmp * 0.5;
    float elevation = noise1 + noise2;
    pos.z += elevation;
    vElevation = elevation;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const waterFragmentShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying float vElevation;
  
  void main() {
    vec3 deepColor = vec3(0.0, 0.1, 0.2);
    vec3 shallowColor = vec3(0.0, 0.8, 0.6);
    float mixFactor = (vElevation + 0.5) * 0.5;
    vec3 color = mix(deepColor, shallowColor, mixFactor);
    float fresnel = pow(1.0 - abs(dot(vec3(0.0, 0.0, 1.0), vec3(0.0, 0.0, 1.0))), 2.0);
    color += fresnel * 0.1;
    gl_FragColor = vec4(color, 0.7);
  }
`;

export class WorkshopScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private clock: THREE.Clock;
  private animationId: number | null = null;
  private noise2D = createNoise2D();
  
  private workbench!: THREE.Mesh;
  private bottles: THREE.Group[] = [];
  private clockGroup!: THREE.Group;
  private clockHour!: THREE.Mesh;
  private clockMinute!: THREE.Mesh;
  private pool!: THREE.Mesh;
  private poolMaterial!: THREE.ShaderMaterial;
  
  private poolCapsules: PoolCapsule[] = [];
  private particleSystems: THREE.Points[] = [];
  
  private draggingCapsule: THREE.Group | null = null;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  
  public onCapsuleDropped: (() => void) | null = null;
  public onPoolHover: ((hovering: boolean) => void) | null = null;
  public onCapsuleUnlocked: ((capsule: CapsuleData) => void) | null = null;
  
  private bottleColors = ['#e74c3c', '#f39c12', '#2ecc71', '#3498db', '#9b59b6'];
  
  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a0a0a);
    
    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 2, 6);
    this.camera.lookAt(0, 0, 0);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.id = 'three-canvas';
    
    this.setupLights();
    this.createWorkbench();
    this.createBottles();
    this.createWallClock();
    this.createTimePool();
    this.createSparkles();
    
    window.addEventListener('resize', this.handleResize);
    this.renderer.domElement.addEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.addEventListener('click', this.handleClick);
  }
  
  private setupLights() {
    const ambient = new THREE.AmbientLight(0xffcc88, 0.4);
    this.scene.add(ambient);
    
    const warmLight = new THREE.DirectionalLight(0xffcc88, 0.8);
    warmLight.position.set(3, 5, 3);
    warmLight.castShadow = true;
    warmLight.shadow.mapSize.width = 1024;
    warmLight.shadow.mapSize.height = 1024;
    this.scene.add(warmLight);
    
    const fillLight = new THREE.PointLight(0xffaa66, 0.5, 10);
    fillLight.position.set(-2, 2, 2);
    this.scene.add(fillLight);
  }
  
  private createWorkbench() {
    const geometry = new THREE.BoxGeometry(8, 0.3, 5);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#8b5e3c');
    gradient.addColorStop(1, '#6b3e1c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 50; i++) {
      ctx.strokeStyle = `rgba(60, 30, 10, ${Math.random() * 0.3})`;
      ctx.lineWidth = Math.random() * 3;
      ctx.beginPath();
      ctx.moveTo(0, Math.random() * 512);
      ctx.bezierCurveTo(100, Math.random() * 512, 400, Math.random() * 512, 512, Math.random() * 512);
      ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.8,
      metalness: 0.1,
    });
    
    this.workbench = new THREE.Mesh(geometry, material);
    this.workbench.position.y = -0.5;
    this.workbench.receiveShadow = true;
    this.scene.add(this.workbench);
    
    const legGeometry = new THREE.BoxGeometry(0.3, 2, 0.3);
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x5a3a1a });
    const legPositions = [
      [-3.6, -1.5, -2.2], [3.6, -1.5, -2.2],
      [-3.6, -1.5, 2.2], [3.6, -1.5, 2.2]
    ];
    legPositions.forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      this.scene.add(leg);
    });
  }
  
  private createBottles() {
    this.bottleColors.forEach((color, index) => {
      const bottleGroup = new THREE.Group();
      
      const bodyGeometry = new THREE.CylinderGeometry(0.25, 0.3, 0.8, 16);
      const bodyMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.6,
        roughness: 0.1,
        metalness: 0,
        transmission: 0.9,
        thickness: 0.5,
      });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.castShadow = true;
      bottleGroup.add(body);
      
      const neckGeometry = new THREE.CylinderGeometry(0.12, 0.2, 0.2, 16);
      const neckMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.5,
        roughness: 0.1,
        transmission: 0.9,
      });
      const neck = new THREE.Mesh(neckGeometry, neckMaterial);
      neck.position.y = 0.5;
      bottleGroup.add(neck);
      
      const sparkleCount = 30;
      const sparkleGeometry = new THREE.BufferGeometry();
      const sparklePositions = new Float32Array(sparkleCount * 3);
      for (let i = 0; i < sparkleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.2 + Math.random() * 0.08;
        sparklePositions[i * 3] = Math.cos(angle) * radius;
        sparklePositions[i * 3 + 1] = (Math.random() - 0.5) * 0.7;
        sparklePositions[i * 3 + 2] = Math.sin(angle) * radius;
      }
      sparkleGeometry.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));
      const sparkleMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.02,
        transparent: true,
        opacity: 0.9,
      });
      const sparkles = new THREE.Points(sparkleGeometry, sparkleMaterial);
      bottleGroup.add(sparkles);
      
      bottleGroup.position.set(-2.8, 0.2, -1.5 + index * 0.8);
      bottleGroup.userData = { color, isBottle: true, index };
      this.bottles.push(bottleGroup);
      this.scene.add(bottleGroup);
    });
  }
  
  private createWallClock() {
    this.clockGroup = new THREE.Group();
    
    const frameGeometry = new THREE.TorusGeometry(0.6, 0.08, 16, 48);
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0xb8860b,
      metalness: 0.8,
      roughness: 0.3,
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    this.clockGroup.add(frame);
    
    const faceGeometry = new THREE.CircleGeometry(0.55, 48);
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 256;
    faceCanvas.height = 256;
    const faceCtx = faceCanvas.getContext('2d')!;
    faceCtx.fillStyle = '#f5eedc';
    faceCtx.beginPath();
    faceCtx.arc(128, 128, 125, 0, Math.PI * 2);
    faceCtx.fill();
    faceCtx.strokeStyle = '#8b4513';
    faceCtx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const x1 = 128 + Math.cos(angle) * 100;
      const y1 = 128 + Math.sin(angle) * 100;
      const x2 = 128 + Math.cos(angle) * 115;
      const y2 = 128 + Math.sin(angle) * 115;
      faceCtx.beginPath();
      faceCtx.moveTo(x1, y1);
      faceCtx.lineTo(x2, y2);
      faceCtx.stroke();
    }
    const faceTexture = new THREE.CanvasTexture(faceCanvas);
    const faceMaterial = new THREE.MeshStandardMaterial({ map: faceTexture });
    const face = new THREE.Mesh(faceGeometry, faceMaterial);
    this.clockGroup.add(face);
    
    const hourGeometry = new THREE.BoxGeometry(0.04, 0.3, 0.02);
    const hourMaterial = new THREE.MeshStandardMaterial({ color: 0x2a1a0a });
    this.clockHour = new THREE.Mesh(hourGeometry, hourMaterial);
    this.clockHour.position.set(0, 0.15, 0.02);
    this.clockGroup.add(this.clockHour);
    
    const minuteGeometry = new THREE.BoxGeometry(0.02, 0.4, 0.02);
    const minuteMaterial = new THREE.MeshStandardMaterial({ color: 0x2a1a0a });
    this.clockMinute = new THREE.Mesh(minuteGeometry, minuteMaterial);
    this.clockMinute.position.set(0, 0.2, 0.03);
    this.clockGroup.add(this.clockMinute);
    
    const centerGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.05, 16);
    const centerMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4a017,
      metalness: 0.9,
    });
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    center.rotation.x = Math.PI / 2;
    center.position.z = 0.04;
    this.clockGroup.add(center);
    
    this.clockGroup.position.set(3, 1.5, -2.2);
    this.clockGroup.rotation.y = -0.3;
    this.scene.add(this.clockGroup);
    
    for (let i = 0; i < 8; i++) {
      const gearGeometry = new THREE.TorusGeometry(0.1 + Math.random() * 0.15, 0.03, 8, 16);
      const gearMaterial = new THREE.MeshStandardMaterial({
        color: 0xb8860b,
        metalness: 0.7,
        roughness: 0.4,
      });
      const gear = new THREE.Mesh(gearGeometry, gearMaterial);
      gear.position.set(
        2.5 + Math.random() * 1.5,
        0.8 + Math.random() * 1.5,
        -2.2
      );
      gear.rotation.y = -0.3;
      gear.userData = { spinSpeed: (Math.random() - 0.5) * 0.5 };
      this.scene.add(gear);
    }
  }
  
  private createTimePool() {
    const size = 3;
    const segments = 64;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    
    this.poolMaterial = new THREE.ShaderMaterial({
      vertexShader: waterVertexShader,
      fragmentShader: waterFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uNoiseScale: { value: 2 },
        uNoiseStrength: { value: 0.08 },
      },
      transparent: true,
      side: THREE.DoubleSide,
    });
    
    this.pool = new THREE.Mesh(geometry, this.poolMaterial);
    this.pool.position.set(0.5, -0.34, 0);
    this.pool.userData = { isPool: true };
    this.scene.add(this.pool);
    
    const poolRimGeometry = new THREE.TorusGeometry(1.5, 0.08, 16, 48);
    poolRimGeometry.rotateX(-Math.PI / 2);
    const poolRimMaterial = new THREE.MeshStandardMaterial({
      color: 0x5a7a5a,
      roughness: 0.8,
    });
    const poolRim = new THREE.Mesh(poolRimGeometry, poolRimMaterial);
    poolRim.position.set(0.5, -0.33, 0);
    this.scene.add(poolRim);
  }
  
  private createSparkles() {
    const sparkleCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(sparkleCount * 3);
    for (let i = 0; i < sparkleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = Math.random() * 3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xffcc88,
      size: 0.03,
      transparent: true,
      opacity: 0.4,
    });
    const sparkles = new THREE.Points(geometry, material);
    sparkles.userData = { ambientSparkles: true };
    this.scene.add(sparkles);
  }
  
  private createCapsuleMesh(color: string, scale: number = 1): THREE.Group {
    const group = new THREE.Group();
    
    const bodyGeometry = new THREE.CapsuleGeometry(0.15 * scale, 0.4 * scale, 8, 16);
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.5,
      roughness: 0.05,
      metalness: 0,
      transmission: 0.8,
      thickness: 0.5,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    group.add(body);
    
    const glowGeometry = new THREE.CapsuleGeometry(0.17 * scale, 0.42 * scale, 8, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glow);
    
    return group;
  }
  
  public startDragging(color: string) {
    if (this.draggingCapsule) {
      this.scene.remove(this.draggingCapsule);
    }
    this.draggingCapsule = this.createCapsuleMesh(color, 1);
    this.draggingCapsule.userData = { color, isDragging: true };
    this.scene.add(this.draggingCapsule);
  }
  
  private handleMouseMove = (event: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    if (this.draggingCapsule) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.3);
      const point = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(plane, point);
      if (point) {
        this.draggingCapsule.position.copy(point);
      }
    }
    
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.pool);
    if (this.onPoolHover) {
      this.onPoolHover(intersects.length > 0);
    }
  };
  
  private handleClick = (event: MouseEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    if (this.draggingCapsule) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.workbench);
      if (intersects.length > 0) {
        const point = intersects[0].point;
        if (Math.abs(point.x) < 1.5 && Math.abs(point.z) < 1.5) {
          this.scene.remove(this.draggingCapsule);
          this.draggingCapsule = null;
          if (this.onCapsuleDropped) {
            this.onCapsuleDropped();
          }
          return;
        }
      }
      this.scene.remove(this.draggingCapsule);
      this.draggingCapsule = null;
    }
  };
  
  public spawnGoldParticles(position: THREE.Vector3) {
    const count = 300;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 0.02 + Math.random() * 0.05;
      velocities.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed,
        Math.sin(phi) * Math.sin(theta) * speed
      ));
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      sizes[i] = 0.01 + Math.random() * 0.03;
    }
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const material = new THREE.PointsMaterial({
      color: 0xffd700,
      size: 0.03,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    });
    
    const particles = new THREE.Points(geometry, material);
    particles.userData = { velocities, startTime: Date.now(), lifetime: 500 };
    this.particleSystems.push(particles);
    this.scene.add(particles);
  }
  
  public addCapsuleToPool(data: CapsuleData) {
    const capsule = this.createCapsuleMesh(data.emotionColor, 0.8);
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.3 + Math.random() * 1;
    capsule.position.set(
      0.5 + Math.cos(angle) * radius,
      -0.5,
      Math.sin(angle) * radius
    );
    
    const baseZ = -1 - Math.random() * 2;
    capsule.position.z += baseZ * 0;
    
    const poolCapsule: PoolCapsule = {
      mesh: capsule,
      data,
      baseZ,
      floatOffset: Math.random() * Math.PI * 2,
      rising: false,
      riseStart: 0,
    };
    
    this.poolCapsules.push(poolCapsule);
    this.scene.add(capsule);
    
    const startPos = capsule.position.clone();
    startPos.y = 0.5;
    const targetPos = capsule.position.clone();
    targetPos.y = -0.35 - Math.random() * 0.2;
    
    const startTime = Date.now();
    const sinkDuration = 1000;
    const animateSink = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / sinkDuration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      capsule.position.lerpVectors(startPos, targetPos, eased);
      if (t < 1) {
        requestAnimationFrame(animateSink);
      }
    };
    animateSink();
  }
  
  public createLightWave(position: THREE.Vector3) {
    const geometry = new THREE.RingGeometry(0.1, 0.2, 64);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.position.copy(position);
    ring.position.y = -0.3;
    this.scene.add(ring);
    
    const startTime = Date.now();
    const duration = 1500;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const scale = 1 + t * 10;
      ring.scale.set(scale, 1, scale);
      material.opacity = 0.8 * (1 - t);
      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(ring);
        geometry.dispose();
        material.dispose();
      }
    };
    animate();
  }
  
  private updateAgingTexture(capsule: PoolCapsule, elapsedHours: number) {
    const body = capsule.mesh.children[0] as THREE.Mesh;
    if (!body || !(body.material instanceof THREE.MeshPhysicalMaterial)) return;
    
    if (elapsedHours > 168) {
      body.material.color = new THREE.Color('#4a7c59');
      body.material.opacity = 0.7;
    } else if (elapsedHours > 24) {
      const currentColor = body.material.color;
      const mossColor = new THREE.Color('#4a7c59');
      body.material.color.lerpColors(currentColor, mossColor, 0.3);
    }
  }
  
  private handleResize = () => {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  };
  
  public start() {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      const elapsed = this.clock.getElapsedTime();
      
      this.poolMaterial.uniforms.uTime.value = elapsed;
      
      if (this.clockHour && this.clockMinute) {
        this.clockHour.rotation.z = -elapsed * 0.05;
        this.clockMinute.rotation.z = -elapsed * 0.3;
      }
      
      this.scene.children.forEach(child => {
        if (child.userData.spinSpeed) {
          child.rotation.z += child.userData.spinSpeed * 0.01;
        }
      });
      
      this.bottles.forEach((bottle, index) => {
        bottle.position.y = 0.2 + Math.sin(elapsed * 2 + index) * 0.02;
      });
      
      this.poolCapsules.forEach(capsule => {
        const now = Date.now();
        const ageHours = (now - capsule.data.createdAt) / (1000 * 60 * 60);
        this.updateAgingTexture(capsule, ageHours);
        
        if (!capsule.rising) {
          capsule.mesh.position.y = -0.4 + Math.sin(elapsed * 0.5 + capsule.floatOffset) * 0.05;
          capsule.mesh.rotation.y = elapsed * 0.2 + capsule.floatOffset;
        }
        
        if (capsule.data.unlockAt > 0 && now >= capsule.data.unlockAt && !capsule.rising) {
          capsule.rising = true;
          capsule.riseStart = now;
          this.createLightWave(capsule.mesh.position.clone());
          if (this.onCapsuleUnlocked) {
            this.onCapsuleUnlocked(capsule.data);
          }
        }
        
        if (capsule.rising) {
          const riseElapsed = now - capsule.riseStart;
          const t = Math.min(riseElapsed / 2000, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          capsule.mesh.position.y = -0.4 + eased * 1.2;
          if (t >= 1) {
            capsule.mesh.position.y = 0.8 + Math.sin(elapsed * 2) * 0.05;
          }
        }
      });
      
      this.particleSystems = this.particleSystems.filter(system => {
        const elapsed = Date.now() - system.userData.startTime;
        if (elapsed > system.userData.lifetime) {
          this.scene.remove(system);
          (system.geometry as THREE.BufferGeometry).dispose();
          (system.material as THREE.PointsMaterial).dispose();
          return false;
        }
        const positions = system.geometry.getAttribute('position') as THREE.BufferAttribute;
        const velocities = system.userData.velocities as THREE.Vector3[];
        for (let i = 0; i < positions.count; i++) {
          positions.setX(i, positions.getX(i) + velocities[i].x);
          positions.setY(i, positions.getY(i) + velocities[i].y - 0.001);
          positions.setZ(i, positions.getZ(i) + velocities[i].z);
        }
        positions.needsUpdate = true;
        (system.material as THREE.PointsMaterial).opacity = 1 - elapsed / system.userData.lifetime;
        return true;
      });
      
      this.renderer.render(this.scene, this.camera);
    };
    
    animate();
    
    setTimeout(() => {
      const loading = document.querySelector('.loading-screen');
      if (loading) loading.remove();
    }, 500);
  }
  
  public stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.handleResize);
    this.renderer.domElement.removeEventListener('mousemove', this.handleMouseMove);
    this.renderer.domElement.removeEventListener('click', this.handleClick);
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
  
  public getPoolCapsules(): CapsuleData[] {
    return this.poolCapsules.map(c => c.data);
  }
}
