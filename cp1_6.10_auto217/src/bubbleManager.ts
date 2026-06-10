import * as THREE from 'three';
import { TimeUtils, ClockMode, TimeState } from './timeUtils';

type BubbleGroup = 'hour' | 'minute' | 'second' | 'decoration' | 'center';

interface Bubble {
  mesh: THREE.Mesh;
  baseRadius: number;
  basePosition: THREE.Vector3;
  group: BubbleGroup;
  index: number;
  vibrateOffset: number;
  rotateSpeed: number;
  targetScale: number;
  currentScale: number;
  clickAnimating: boolean;
  clickStartTime: number;
  visible: boolean;
  baseColor: THREE.Color;
  targetColor: THREE.Color;
  colorTransitionStart: number;
  colorTransitioning: boolean;
  glowMesh?: THREE.Mesh;
  shrinkProgress?: number;
  disappeared?: boolean;
}

interface ParticleStream {
  line: THREE.Line;
  startTime: number;
  duration: number;
}

interface FireworkParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  startTime: number;
  duration: number;
}

interface RippleEffect {
  mesh: THREE.Mesh;
  startTime: number;
  duration: number;
}

export class BubbleManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private timeUtils: TimeUtils;
  private container: HTMLElement;

  private hourBubbles: Bubble[] = [];
  private minuteBubbles: Bubble[] = [];
  private secondBubbles: Bubble[] = [];
  private decorationBubbles: Bubble[] = [];
  private particleStreams: ParticleStream[] = [];
  private fireworkParticles: FireworkParticle[] = [];
  private rippleEffects: RippleEffect[] = [];
  private centerBubble: Bubble | null = null;
  private clockFaceGroup: THREE.Group | null = null;

  private hourOrbitRadius = 3.5;
  private minuteOrbitRadius = 2.5;
  private secondOrbitRadius = 1.5;
  private clockFaceRadius = 4.5;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private isDragging: boolean = false;
  private previousMouseX: number = 0;
  private previousMouseY: number = 0;
  private cameraRotationX: number = 0;
  private cameraRotationY: number = 0;
  private targetRotationX: number = 0;
  private targetRotationY: number = 0;
  private cameraDistance: number = 8;
  private targetCameraDistance: number = 8;

  private modeButtons: HTMLDivElement[] = [];
  private infoDisplay: HTMLDivElement | null = null;
  private fpsDisplay: HTMLDivElement | null = null;

  private lastDecorationTime: number = 0;
  private modeTransitionStart: number = 0;
  private modeTransitioning: boolean = false;
  private previousMode: ClockMode = 'clock';
  private fireworkTriggered: boolean = false;
  private lastSecondValue: number = -1;
  private lastHourValue: number = -1;
  private lastMinuteValue: number = -1;

  private readonly MAX_PARTICLE_STREAMS = 200;

  private clickAnimationDuration = 200;
  private colorTransitionDuration = 1000;
  private particleStreamDuration = 2000;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    timeUtils: TimeUtils,
    container: HTMLElement
  ) {
    this.scene = scene;
    this.camera = camera;
    this.timeUtils = timeUtils;
    this.container = container;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.updateOrbitScaling();
    this.createClockFace();
    this.createAllBubbles();
    this.createUI();
    this.setupEventListeners();
  }

  private updateOrbitScaling(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const scale = Math.min(width / 1920, height / 1080, 1);
    this.hourOrbitRadius = 3.5 * (0.8 + scale * 0.4);
    this.minuteOrbitRadius = 2.5 * (0.8 + scale * 0.4);
    this.secondOrbitRadius = 1.5 * (0.8 + scale * 0.4);
    this.clockFaceRadius = 4.5 * (0.8 + scale * 0.4);
  }

  private createClockFace(): void {
    this.clockFaceGroup = new THREE.Group();

    const wireframeGeometry = new THREE.SphereGeometry(this.clockFaceRadius, 24, 16);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x3a4a9a,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });
    const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
    this.clockFaceGroup.add(wireframe);

    this.scene.add(this.clockFaceGroup);
  }

  private createBubbleMaterial(color: number, opacity: number = 0.6): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide
    });
  }

  private createGlowMaterial(color: number, opacity: number = 0.15): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.BackSide
    });
  }

  private lerpColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
    return new THREE.Color(
      color1.r + (color2.r - color1.r) * t,
      color1.g + (color2.g - color1.g) * t,
      color1.b + (color2.b - color1.b) * t
    );
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  private getModeColors(mode: ClockMode): { hour: THREE.Color; minute: THREE.Color; second: THREE.Color; bg: THREE.Color } {
    switch (mode) {
      case 'clock':
        return {
          hour: new THREE.Color(0xff6b8a),
          minute: new THREE.Color(0x4fc3f7),
          second: new THREE.Color(0xffd54f),
          bg: new THREE.Color(0x1a1a30)
        };
      case 'countdown':
        return {
          hour: new THREE.Color(0xba68c8),
          minute: new THREE.Color(0x7e57c2),
          second: new THREE.Color(0xff4081),
          bg: new THREE.Color(0x2a1a3a)
        };
      case 'stopwatch':
        return {
          hour: new THREE.Color(0x26c6da),
          minute: new THREE.Color(0x4dd0e1),
          second: new THREE.Color(0x84ffff),
          bg: new THREE.Color(0x0d2a30)
        };
    }
  }

  private createAllBubbles(): void {
    this.createHourBubbles();
    this.createMinuteBubbles();
    this.createSecondBubbles();
    this.createCenterBubble();
  }

  private createHourBubbles(): void {
    for (let i = 1; i <= 12; i++) {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * this.hourOrbitRadius;
      const y = Math.sin(angle) * this.hourOrbitRadius;
      const z = 0;
      const radius = 0.6 + Math.random() * 0.6;
      const colorT = (i - 1) / 11;
      const color = this.lerpColor(new THREE.Color(0xff6b8a), new THREE.Color(0xff9a6b), colorT);
      const bubble = this.createBubble(
        radius,
        new THREE.Vector3(x, y, z),
        color,
        'hour',
        i,
        0.7
      );
      this.hourBubbles.push(bubble);
    }
  }

  private createMinuteBubbles(): void {
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * this.minuteOrbitRadius;
      const y = Math.sin(angle) * this.minuteOrbitRadius;
      const z = 0;
      const radius = 0.2 + Math.random() * 0.2;
      const colorT = i / 59;
      const color = this.lerpColor(new THREE.Color(0x4fc3f7), new THREE.Color(0x81d4fa), colorT);
      const bubble = this.createBubble(
        radius,
        new THREE.Vector3(x, y, z),
        color,
        'minute',
        i,
        0.5
      );
      this.minuteBubbles.push(bubble);
    }
  }

  private createSecondBubbles(): void {
    for (let i = 0; i < 60; i++) {
      const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * this.secondOrbitRadius;
      const y = Math.sin(angle) * this.secondOrbitRadius;
      const z = 0;
      const radius = 0.15 + Math.random() * 0.1;
      const color = new THREE.Color(0xffd54f);
      const bubble = this.createBubble(
        radius,
        new THREE.Vector3(x, y, z),
        color,
        'second',
        i,
        0.5
      );
      this.secondBubbles.push(bubble);
    }
  }

  private createCenterBubble(): void {
    const color = new THREE.Color(0xffffff);
    this.centerBubble = this.createBubble(
      0.5,
      new THREE.Vector3(0, 0, 0),
      color,
      'center',
      0,
      0.3
    );
  }

  private createBubble(
    radius: number,
    position: THREE.Vector3,
    color: THREE.Color,
    group: BubbleGroup,
    index: number,
    opacity: number
  ): Bubble {
    const geometry = new THREE.SphereGeometry(radius, 16, 12);
    const material = this.createBubbleMaterial(color.getHex(), opacity);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    this.scene.add(mesh);

    const glowGeometry = new THREE.SphereGeometry(radius * 1.3, 16, 12);
    const glowMaterial = this.createGlowMaterial(color.getHex(), 0.15);
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.copy(position);
    this.scene.add(glowMesh);

    return {
      mesh,
      glowMesh,
      baseRadius: radius,
      basePosition: position.clone(),
      group,
      index,
      vibrateOffset: Math.random() * Math.PI * 2,
      rotateSpeed: 0.5 + Math.random() * 0.3,
      targetScale: 1,
      currentScale: 1,
      clickAnimating: false,
      clickStartTime: 0,
      visible: true,
      baseColor: color.clone(),
      targetColor: color.clone(),
      colorTransitionStart: 0,
      colorTransitioning: false
    };
  }

  private createDecorationBubble(): void {
    if (this.decorationBubbles.length >= 20) return;
    const radius = 0.15 + Math.random() * 0.15;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    const r = this.clockFaceRadius * (0.3 + Math.random() * 0.6);
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    const colors = [0xff6b8a, 0x4fc3f7, 0xffd54f, 0xba68c8, 0x26c6da];
    const color = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
    const opacity = 0.2 + Math.random() * 0.2;

    const bubble = this.createBubble(
      radius,
      new THREE.Vector3(x, y, z),
      color,
      'decoration',
      Date.now(),
      opacity
    );
    (bubble as Bubble & { birthTime: number; lifeTime: number }).birthTime = performance.now();
    (bubble as Bubble & { birthTime: number; lifeTime: number }).lifeTime = 3000;
    this.decorationBubbles.push(bubble);
  }

  private createUI(): void {
    const buttonContainer = document.createElement('div');
    buttonContainer.style.position = 'absolute';
    buttonContainer.style.top = '20px';
    buttonContainer.style.right = '20px';
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '10px';
    buttonContainer.style.zIndex = '100';

    const buttonLabels: { label: string; mode: ClockMode }[] = [
      { label: 'clock', mode: 'clock' },
      { label: 'countdown', mode: 'countdown' },
      { label: 'stopwatch', mode: 'stopwatch' }
    ];

    buttonLabels.forEach(({ label, mode }) => {
      const btn = document.createElement('div');
      btn.dataset.mode = mode;
      btn.style.padding = '8px 16px';
      btn.style.borderRadius = '8px';
      btn.style.backgroundColor = mode === 'clock' ? '#4a4a70' : '#2a2a40';
      btn.style.color = '#ffffff';
      btn.style.fontSize = '14px';
      btn.style.cursor = 'pointer';
      btn.style.userSelect = 'none';
      btn.style.transition = 'background-color 0.2s, box-shadow 0.1s';
      btn.style.fontFamily = 'sans-serif';
      btn.textContent = label;

      btn.addEventListener('mouseenter', () => {
        if (this.timeUtils.getMode() !== mode) {
          btn.style.backgroundColor = '#4a4a70';
        }
      });
      btn.addEventListener('mouseleave', () => {
        if (this.timeUtils.getMode() !== mode) {
          btn.style.backgroundColor = '#2a2a40';
        }
      });
      btn.addEventListener('mousedown', () => {
        btn.style.boxShadow = 'inset 2px 2px 4px rgba(0,0,0,0.5)';
      });
      btn.addEventListener('mouseup', () => {
        btn.style.boxShadow = 'none';
      });
      btn.addEventListener('click', () => {
        this.switchMode(mode);
      });

      buttonContainer.appendChild(btn);
      this.modeButtons.push(btn);
    });

    this.container.appendChild(buttonContainer);

    this.infoDisplay = document.createElement('div');
    this.infoDisplay.style.position = 'absolute';
    this.infoDisplay.style.bottom = '20px';
    this.infoDisplay.style.left = '50%';
    this.infoDisplay.style.transform = 'translateX(-50%)';
    this.infoDisplay.style.padding = '6px 12px';
    this.infoDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    this.infoDisplay.style.borderRadius = '8px';
    this.infoDisplay.style.color = '#ffffff';
    this.infoDisplay.style.fontSize = '16px';
    this.infoDisplay.style.fontFamily = 'sans-serif';
    this.infoDisplay.style.zIndex = '100';
    this.container.appendChild(this.infoDisplay);

    this.fpsDisplay = document.createElement('div');
    this.fpsDisplay.style.position = 'absolute';
    this.fpsDisplay.style.bottom = '20px';
    this.fpsDisplay.style.right = '20px';
    this.fpsDisplay.style.padding = '6px 12px';
    this.fpsDisplay.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
    this.fpsDisplay.style.borderRadius = '8px';
    this.fpsDisplay.style.color = '#ffffff';
    this.fpsDisplay.style.fontSize = '14px';
    this.fpsDisplay.style.fontFamily = 'sans-serif';
    this.fpsDisplay.style.zIndex = '100';
    this.container.appendChild(this.fpsDisplay);
  }

  private setupEventListeners(): void {
    this.container.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.container.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.container.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.container.addEventListener('mouseleave', this.onMouseUp.bind(this));
    this.container.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.container.addEventListener('click', this.onClick.bind(this));
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.previousMouseX = e.clientX;
    this.previousMouseY = e.clientY;
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      const deltaX = e.clientX - this.previousMouseX;
      const deltaY = e.clientY - this.previousMouseY;

      this.targetRotationY += deltaX * 0.005;
      this.targetRotationX += deltaY * 0.005;
      this.targetRotationX = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.targetRotationX));

      this.previousMouseX = e.clientX;
      this.previousMouseY = e.clientY;
    }

    this.mouse.x = (e.clientX / this.container.clientWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / this.container.clientHeight) * 2 + 1;
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.targetCameraDistance += e.deltaY * 0.01;
    this.targetCameraDistance = Math.max(3, Math.min(12, this.targetCameraDistance));
  }

  private onClick(e: MouseEvent): void {
    if (this.isDragging) return;

    this.mouse.x = (e.clientX / this.container.clientWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / this.container.clientHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const allMeshes: THREE.Object3D[] = [];
    this.hourBubbles.forEach(b => allMeshes.push(b.mesh));
    this.minuteBubbles.forEach(b => allMeshes.push(b.mesh));
    this.secondBubbles.forEach(b => allMeshes.push(b.mesh));
    if (this.centerBubble) allMeshes.push(this.centerBubble.mesh);

    const intersects = this.raycaster.intersectObjects(allMeshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      this.handleBubbleClick(hitMesh);
    }
  }

  private handleBubbleClick(mesh: THREE.Mesh): void {
    const mode = this.timeUtils.getMode();

    const bubble =
      this.hourBubbles.find(b => b.mesh === mesh) ||
      this.minuteBubbles.find(b => b.mesh === mesh) ||
      this.secondBubbles.find(b => b.mesh === mesh) ||
      (this.centerBubble?.mesh === mesh ? this.centerBubble : null);

    if (!bubble) return;

    this.triggerClickAnimation(bubble);

    if (mode === 'countdown') {
      if (!this.timeUtils.isCountdownRunning()) {
        if (bubble.group === 'minute') {
          this.timeUtils.addCountdownMinutes(5);
        } else if (bubble.group === 'second') {
          this.timeUtils.addCountdownSeconds(10);
        } else if (bubble.group === 'center') {
          if (this.timeUtils.getCountdownTargetMs() > 0) {
            this.timeUtils.startCountdown();
            this.fireworkTriggered = false;
          }
        }
      }
    } else if (mode === 'stopwatch') {
      if (bubble.group === 'center') {
        if (this.timeUtils.isStopwatchRunning()) {
          this.timeUtils.stopStopwatch();
        } else {
          this.timeUtils.startStopwatch();
        }
      }
    }
  }

  private triggerClickAnimation(bubble: Bubble): void {
    bubble.clickAnimating = true;
    bubble.clickStartTime = performance.now();
  }

  public switchMode(mode: ClockMode): void {
    if (this.timeUtils.getMode() === mode) return;

    this.previousMode = this.timeUtils.getMode();
    this.timeUtils.setMode(mode);
    this.modeTransitionStart = performance.now();
    this.modeTransitioning = true;
    this.fireworkTriggered = false;

    this.modeButtons.forEach(btn => {
      const btnMode = btn.dataset.mode as ClockMode;
      if (btnMode === mode) {
        btn.style.backgroundColor = '#4a4a70';
      } else {
        btn.style.backgroundColor = '#2a2a40';
      }
    });

    const targetColors = this.getModeColors(mode);

    const allBubbles: Bubble[] = [...this.hourBubbles, ...this.minuteBubbles, ...this.secondBubbles];
    allBubbles.forEach(bubble => {
      let newColor: THREE.Color;
      if (bubble.group === 'hour') {
        newColor = bubble.index > 0 && bubble.index <= 12
          ? this.lerpColor(new THREE.Color(0xff6b8a), new THREE.Color(0xff9a6b), (bubble.index - 1) / 11)
          : targetColors.hour;
      } else if (bubble.group === 'minute') {
        newColor = this.lerpColor(new THREE.Color(0x4fc3f7), new THREE.Color(0x81d4fa), bubble.index / 59);
      } else {
        newColor = targetColors.second;
      }
      if (mode === 'countdown') {
        if (bubble.group === 'hour') newColor = new THREE.Color(0xba68c8);
        if (bubble.group === 'minute') newColor = this.lerpColor(new THREE.Color(0x7e57c2), new THREE.Color(0x9575cd), bubble.index / 59);
        if (bubble.group === 'second') newColor = new THREE.Color(0xff4081);
      } else if (mode === 'stopwatch') {
        if (bubble.group === 'hour') newColor = new THREE.Color(0x26c6da);
        if (bubble.group === 'minute') newColor = this.lerpColor(new THREE.Color(0x4dd0e1), new THREE.Color(0x80deea), bubble.index / 59);
        if (bubble.group === 'second') newColor = new THREE.Color(0x84ffff);
      }
      bubble.targetColor = newColor.clone();
      bubble.colorTransitionStart = performance.now();
      bubble.colorTransitioning = true;
    });
  }

  private createParticleStream(from: THREE.Vector3): void {
    if (this.particleStreams.length >= this.MAX_PARTICLE_STREAMS) return;

    const to = new THREE.Vector3(0, 0, 0);
    const points: THREE.Vector3[] = [];
    const direction = new THREE.Vector3().subVectors(to, from).normalize();
    const length = 0.8;

    for (let i = 0; i < 20; i++) {
      const t = i / 19;
      const point = from.clone().add(direction.clone().multiplyScalar(length * t));
      point.x += (Math.random() - 0.5) * 0.05;
      point.y += (Math.random() - 0.5) * 0.05;
      point.z += (Math.random() - 0.5) * 0.05;
      points.push(point);
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const colors = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      const t = i / (points.length - 1);
      colors[i * 3] = 1 - t * 0.5;
      colors[i * 3 + 1] = 0.8 - t * 0.3;
      colors[i * 3 + 2] = 1;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1,
      linewidth: 2
    });

    const line = new THREE.Line(geometry, material);
    this.scene.add(line);

    this.particleStreams.push({
      line,
      startTime: performance.now(),
      duration: this.particleStreamDuration
    });
  }

  private createFirework(): void {
    const colors = [0xff6b8a, 0x4fc3f7, 0xffd54f, 0xba68c8, 0x26c6da, 0xff9a6b];

    for (let i = 0; i < 60; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 0.02 + Math.random() * 0.04;
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );

      const radius = 0.05 + Math.random() * 0.08;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const geometry = new THREE.SphereGeometry(radius, 8, 6);
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(0, 0, 0);
      this.scene.add(mesh);

      this.fireworkParticles.push({
        mesh,
        velocity,
        startTime: performance.now(),
        duration: 1500
      });
    }
  }

  private createRipple(center: THREE.Vector3, color: number): void {
    const geometry = new THREE.RingGeometry(0.05, 0.1, 32);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(center);
    mesh.lookAt(new THREE.Vector3(0, 0, -10));
    this.scene.add(mesh);

    this.rippleEffects.push({
      mesh,
      startTime: performance.now(),
      duration: 500
    });
  }

  private updateCamera(_deltaTime: number): void {
    this.cameraRotationX += (this.targetRotationX - this.cameraRotationX) * 0.2;
    this.cameraRotationY += (this.targetRotationY - this.cameraRotationY) * 0.2;
    this.cameraDistance += (this.targetCameraDistance - this.cameraDistance) * 0.1;

    const x = Math.sin(this.cameraRotationY) * Math.cos(this.cameraRotationX) * this.cameraDistance;
    const y = Math.sin(this.cameraRotationX) * this.cameraDistance;
    const z = Math.cos(this.cameraRotationY) * Math.cos(this.cameraRotationX) * this.cameraDistance;

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private updateClockFace(time: number): void {
    if (!this.clockFaceGroup) return;
    const breathe = 1 + Math.sin(time * Math.PI) * 0.02;
    this.clockFaceGroup.scale.setScalar(breathe);
  }

  private updateBubble(bubble: Bubble, time: number, now: number, elapsed: number): void {
    if (bubble.group === 'decoration') {
      const life = (bubble as Bubble & { birthTime: number; lifeTime: number }).lifeTime;
      const birth = (bubble as Bubble & { birthTime: number; lifeTime: number }).birthTime;
      const age = now - birth;
      if (age >= life) {
        this.removeBubble(bubble);
        return;
      }
      const lifeRatio = age / life;
      const opacity = lifeRatio < 0.2
        ? lifeRatio * 5 * 0.3
        : lifeRatio > 0.8
          ? (1 - lifeRatio) * 5 * 0.3
          : 0.3;
      (bubble.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
      if (bubble.glowMesh) {
        (bubble.glowMesh.material as THREE.MeshBasicMaterial).opacity = opacity * 0.5;
      }
      bubble.mesh.position.y += 0.001;
    }

    const vibrate = Math.sin(time * 2 * Math.PI * 2 + bubble.vibrateOffset) * 0.15;
    const baseY = bubble.basePosition.y;
    bubble.mesh.position.y = baseY + vibrate;
    if (bubble.glowMesh) {
      bubble.glowMesh.position.y = baseY + vibrate;
    }
    bubble.mesh.position.x = bubble.basePosition.x;
    bubble.mesh.position.z = bubble.basePosition.z;
    if (bubble.glowMesh) {
      bubble.glowMesh.position.x = bubble.basePosition.x;
      bubble.glowMesh.position.z = bubble.basePosition.z;
    }

    bubble.mesh.rotation.y += bubble.rotateSpeed * elapsed / 1000;
    if (bubble.glowMesh) {
      bubble.glowMesh.rotation.y += bubble.rotateSpeed * elapsed / 1000;
    }

    if (bubble.clickAnimating) {
      const clickElapsed = now - bubble.clickStartTime;
      if (clickElapsed >= this.clickAnimationDuration) {
        bubble.clickAnimating = false;
        bubble.currentScale = bubble.targetScale;
      } else {
        const t = clickElapsed / this.clickAnimationDuration;
        const scale = t < 0.5 ? 0.8 + t * 0.4 : 1.0 - (t - 0.5) * 0;
        bubble.currentScale = scale * bubble.targetScale;
      }
    } else {
      bubble.currentScale += (bubble.targetScale - bubble.currentScale) * 0.1;
    }

    if (bubble.group === 'minute' || bubble.group === 'second') {
      if (bubble.shrinkProgress !== undefined) {
        bubble.currentScale = Math.max(0, 1 - bubble.shrinkProgress) * bubble.targetScale;
        (bubble.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - bubble.shrinkProgress);
        if (bubble.glowMesh) {
          (bubble.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.15 * (1 - bubble.shrinkProgress);
        }
        if (bubble.shrinkProgress >= 1) {
          bubble.visible = false;
          bubble.mesh.visible = false;
          if (bubble.glowMesh) bubble.glowMesh.visible = false;
        }
      }
    }

    bubble.mesh.scale.setScalar(bubble.currentScale);
    if (bubble.glowMesh) {
      bubble.glowMesh.scale.setScalar(bubble.currentScale * 1.3);
    }

    if (bubble.colorTransitioning) {
      const colorElapsed = now - bubble.colorTransitionStart;
      if (colorElapsed >= this.colorTransitionDuration) {
        bubble.colorTransitioning = false;
        bubble.baseColor = bubble.targetColor.clone();
        (bubble.mesh.material as THREE.MeshBasicMaterial).color.copy(bubble.targetColor);
        if (bubble.glowMesh) {
          (bubble.glowMesh.material as THREE.MeshBasicMaterial).color.copy(bubble.targetColor);
        }
      } else {
        const t = this.easeInOut(colorElapsed / this.colorTransitionDuration);
        const color = this.lerpColor(bubble.baseColor, bubble.targetColor, t);
        (bubble.mesh.material as THREE.MeshBasicMaterial).color.copy(color);
        if (bubble.glowMesh) {
          (bubble.glowMesh.material as THREE.MeshBasicMaterial).color.copy(color);
        }
      }
    }
  }

  private removeBubble(bubble: Bubble): void {
    this.scene.remove(bubble.mesh);
    bubble.mesh.geometry.dispose();
    (bubble.mesh.material as THREE.Material).dispose();
    if (bubble.glowMesh) {
      this.scene.remove(bubble.glowMesh);
      bubble.glowMesh.geometry.dispose();
      (bubble.glowMesh.material as THREE.Material).dispose();
    }
    const idx = this.decorationBubbles.indexOf(bubble);
    if (idx >= 0) this.decorationBubbles.splice(idx, 1);
  }

  private updateParticleStreams(now: number): void {
    for (let i = this.particleStreams.length - 1; i >= 0; i--) {
      const stream = this.particleStreams[i];
      const elapsed = now - stream.startTime;
      if (elapsed >= stream.duration) {
        this.scene.remove(stream.line);
        stream.line.geometry.dispose();
        (stream.line.material as THREE.Material).dispose();
        this.particleStreams.splice(i, 1);
      } else {
        const t = elapsed / stream.duration;
        (stream.line.material as THREE.LineBasicMaterial).opacity = 1 - t;
      }
    }
  }

  private updateFireworks(now: number): void {
    for (let i = this.fireworkParticles.length - 1; i >= 0; i--) {
      const p = this.fireworkParticles[i];
      const elapsed = now - p.startTime;
      if (elapsed >= p.duration) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.fireworkParticles.splice(i, 1);
      } else {
        p.mesh.position.add(p.velocity);
        p.velocity.multiplyScalar(0.98);
        const t = elapsed / p.duration;
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1 - t;
      }
    }
  }

  private updateRipples(now: number): void {
    for (let i = this.rippleEffects.length - 1; i >= 0; i--) {
      const r = this.rippleEffects[i];
      const elapsed = now - r.startTime;
      if (elapsed >= r.duration) {
        this.scene.remove(r.mesh);
        r.mesh.geometry.dispose();
        (r.mesh.material as THREE.Material).dispose();
        this.rippleEffects.splice(i, 1);
      } else {
        const t = elapsed / r.duration;
        const scale = 1 + t * 3;
        r.mesh.scale.setScalar(scale);
        (r.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6 * (1 - t);
      }
    }
  }

  private highlightBubbles(state: TimeState): void {
    const mode = this.timeUtils.getMode();

    this.hourBubbles.forEach(bubble => {
      const shouldHighlight = mode === 'clock' && bubble.index === state.hours;
      bubble.targetScale = shouldHighlight ? 1.3 : 1;
      if (shouldHighlight && bubble.group === 'hour') {
        (bubble.mesh.material as THREE.MeshBasicMaterial).opacity = 0.9;
      } else if (bubble.group === 'hour') {
        (bubble.mesh.material as THREE.MeshBasicMaterial).opacity = 0.7;
      }
    });

    this.minuteBubbles.forEach(bubble => {
      let shouldHighlight = false;
      if (mode === 'clock') {
        shouldHighlight = bubble.index === state.minutes;
      } else if (mode === 'countdown') {
        shouldHighlight = bubble.index === state.minutes;
      } else if (mode === 'stopwatch') {
        shouldHighlight = bubble.index === state.minutes;
      }
      bubble.targetScale = shouldHighlight ? 1.3 : 1;
    });

    this.secondBubbles.forEach(bubble => {
      let shouldHighlight = false;
      if (mode === 'clock') {
        shouldHighlight = bubble.index === state.seconds;
      } else if (mode === 'countdown') {
        shouldHighlight = bubble.index === state.seconds;
      } else if (mode === 'stopwatch') {
        shouldHighlight = bubble.index === state.seconds;
      }
      bubble.targetScale = shouldHighlight ? 1.3 : 1;
    });
  }

  private triggerParticleStreams(state: TimeState, _now: number): void {
    const mode = this.timeUtils.getMode();

    if (mode === 'clock') {
      if (state.hours !== this.lastHourValue) {
        const bubble = this.hourBubbles.find(b => b.index === state.hours);
        if (bubble) {
          this.createParticleStream(bubble.basePosition.clone());
        }
        this.lastHourValue = state.hours;
      }
      if (state.minutes !== this.lastMinuteValue) {
        const bubble = this.minuteBubbles.find(b => b.index === state.minutes);
        if (bubble) {
          this.createParticleStream(bubble.basePosition.clone());
        }
        this.lastMinuteValue = state.minutes;
      }
    }

    if (state.seconds !== this.lastSecondValue) {
      const bubble = this.secondBubbles.find(b => b.index === state.seconds);
      if (bubble && (mode === 'clock' || mode === 'countdown')) {
        this.createParticleStream(bubble.basePosition.clone());
      }
      if (mode === 'stopwatch' && this.timeUtils.isStopwatchRunning() && bubble) {
        this.createRipple(bubble.basePosition.clone(), 0x84ffff);
      }
      this.lastSecondValue = state.seconds;
    }
  }

  private updateCountdownBubbles(state: TimeState): void {
    if (this.timeUtils.getMode() !== 'countdown') {
      this.minuteBubbles.forEach(b => {
        if (b.shrinkProgress !== undefined) {
          b.shrinkProgress = undefined;
          b.visible = true;
          b.mesh.visible = true;
          if (b.glowMesh) b.glowMesh.visible = true;
          (b.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5;
        }
      });
      this.secondBubbles.forEach(b => {
        if (b.shrinkProgress !== undefined) {
          b.shrinkProgress = undefined;
          b.visible = true;
          b.mesh.visible = true;
          if (b.glowMesh) b.glowMesh.visible = true;
          (b.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5;
        }
      });
      return;
    }

    if (!this.timeUtils.isCountdownRunning() && !state.finished) {
      this.minuteBubbles.forEach(b => {
        b.shrinkProgress = undefined;
        b.visible = true;
        b.mesh.visible = true;
        if (b.glowMesh) b.glowMesh.visible = true;
        (b.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5;
      });
      this.secondBubbles.forEach(b => {
        b.shrinkProgress = undefined;
        b.visible = true;
        b.mesh.visible = true;
        if (b.glowMesh) b.glowMesh.visible = true;
        (b.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5;
      });
      return;
    }

    const minCount = state.minutes;
    const secCount = state.seconds;

    this.minuteBubbles.forEach(bubble => {
      if (bubble.index >= minCount) {
        if (bubble.index === minCount) {
          const secProgress = 1 - state.seconds / 60;
          bubble.shrinkProgress = secProgress;
          bubble.visible = true;
          bubble.mesh.visible = true;
          if (bubble.glowMesh) bubble.glowMesh.visible = true;
        } else {
          bubble.shrinkProgress = 1;
          bubble.visible = false;
          bubble.mesh.visible = false;
          if (bubble.glowMesh) bubble.glowMesh.visible = false;
        }
      } else {
        bubble.shrinkProgress = 0;
        bubble.visible = true;
        bubble.mesh.visible = true;
        if (bubble.glowMesh) bubble.glowMesh.visible = true;
        (bubble.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5;
      }
    });

    this.secondBubbles.forEach(bubble => {
      if (bubble.index >= secCount) {
        if (bubble.index === secCount && state.minutes > 0) {
          bubble.shrinkProgress = 1 - state.milliseconds / 1000;
          bubble.visible = true;
          bubble.mesh.visible = true;
          if (bubble.glowMesh) bubble.glowMesh.visible = true;
        } else {
          bubble.shrinkProgress = 1;
          bubble.visible = false;
          bubble.mesh.visible = false;
          if (bubble.glowMesh) bubble.glowMesh.visible = false;
        }
      } else {
        bubble.shrinkProgress = 0;
        bubble.visible = true;
        bubble.mesh.visible = true;
        if (bubble.glowMesh) bubble.glowMesh.visible = true;
        (bubble.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5;
      }
    });

    if (state.finished && !this.fireworkTriggered) {
      this.fireworkTriggered = true;
      this.createFirework();
    }
  }

  private updateStopwatchBubbles(state: TimeState): void {
    if (this.timeUtils.getMode() !== 'stopwatch') return;

    this.secondBubbles.forEach(bubble => {
      if (bubble.index <= state.seconds) {
        bubble.visible = true;
        bubble.mesh.visible = true;
        if (bubble.glowMesh) bubble.glowMesh.visible = true;
        (bubble.mesh.material as THREE.MeshBasicMaterial).opacity = 0.6;
      } else {
        bubble.visible = false;
        bubble.mesh.visible = false;
        if (bubble.glowMesh) bubble.glowMesh.visible = false;
      }
    });

    this.minuteBubbles.forEach(bubble => {
      if (bubble.index < state.minutes) {
        bubble.visible = true;
        bubble.mesh.visible = true;
        if (bubble.glowMesh) bubble.glowMesh.visible = true;
        (bubble.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5;
      } else {
        bubble.visible = false;
        bubble.mesh.visible = false;
        if (bubble.glowMesh) bubble.glowMesh.visible = false;
      }
    });
  }

  public getBackgroundColor(): THREE.Color {
    const mode = this.timeUtils.getMode();
    const targetColors = this.getModeColors(mode);
    const prevColors = this.getModeColors(this.previousMode);

    if (this.modeTransitioning) {
      const elapsed = performance.now() - this.modeTransitionStart;
      if (elapsed >= 500) {
        this.modeTransitioning = false;
        return targetColors.bg;
      }
      const t = this.easeInOut(elapsed / 500);
      return this.lerpColor(prevColors.bg, targetColors.bg, t);
    }
    return targetColors.bg;
  }

  private onResize(): void {
    this.updateOrbitScaling();
  }

  public update(time: number, elapsed: number, deltaTime: number): void {
    const now = performance.now();
    const state = this.timeUtils.getTimeState();

    this.updateCamera(deltaTime);
    this.updateClockFace(time);

    if (now - this.lastDecorationTime > 5000) {
      this.createDecorationBubble();
      this.lastDecorationTime = now;
    }

    const allBubbles: Bubble[] = [
      ...this.hourBubbles,
      ...this.minuteBubbles,
      ...this.secondBubbles,
      ...this.decorationBubbles
    ];
    if (this.centerBubble) allBubbles.push(this.centerBubble);

    allBubbles.forEach(bubble => {
      this.updateBubble(bubble, time, now, elapsed);
    });

    this.highlightBubbles(state);
    this.triggerParticleStreams(state, now);
    this.updateCountdownBubbles(state);
    this.updateStopwatchBubbles(state);
    this.updateParticleStreams(now);
    this.updateFireworks(now);
    this.updateRipples(now);

    if (this.infoDisplay) {
      this.infoDisplay.textContent = this.timeUtils.formatTimeDisplay();
    }
  }

  public updateFPS(fps: number): void {
    if (this.fpsDisplay) {
      this.fpsDisplay.textContent = `FPS: ${fps.toFixed(0)}`;
    }
  }

  public getTotalBubbleCount(): number {
    return this.hourBubbles.length +
      this.minuteBubbles.length +
      this.secondBubbles.length +
      this.decorationBubbles.length;
  }
}
