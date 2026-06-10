import * as THREE from 'three';
import { SignalController } from './SignalController';
import { ParticleSystem } from './ParticleSystem';

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;
  private raycaster: THREE.Raycaster;

  private signalController: SignalController;
  private particleSystem: ParticleSystem;

  private connectionLine: THREE.Line | null = null;
  private lineGeometry: THREE.BufferGeometry;
  private lineMaterial: THREE.LineBasicMaterial;

  private stars: THREE.Points;
  private groundGrid: THREE.GridHelper;

  private infoPanel: HTMLDivElement;
  private controlPanel: HTMLDivElement;
  private sourceCoordLabel: HTMLDivElement;
  private receiverCoordLabel: HTMLDivElement;
  private strengthLabel: HTMLDivElement;
  private strengthBarFill: HTMLDivElement;
  private pathCountLabel: HTMLDivElement;
  private signalStrengthText: HTMLDivElement;
  private fpsLabel: HTMLDivElement;

  private frameCount: number = 0;
  private lastFpsTime: number = 0;
  private currentFps: number = 0;

  private isOrbiting: boolean = false;
  private orbitAngle: number = 0;
  private orbitRadius: number = 35;
  private orbitHeight: number = 15;
  private isUserRotating: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private cameraTheta: number = 0;
  private cameraPhi: number = Math.PI / 4;
  private cameraDistance: number = 35;
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 2, 0);
  private isRightMouseDown: boolean = false;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();

    this.lineGeometry = new THREE.BufferGeometry();
    this.lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.6
    });

    this.infoPanel = document.createElement('div');
    this.controlPanel = document.createElement('div');
    this.sourceCoordLabel = document.createElement('div');
    this.receiverCoordLabel = document.createElement('div');
    this.strengthLabel = document.createElement('div');
    this.strengthBarFill = document.createElement('div');
    this.pathCountLabel = document.createElement('div');
    this.signalStrengthText = document.createElement('div');
    this.fpsLabel = document.createElement('div');

    this.stars = this.createStars();
    this.groundGrid = this.createGroundGrid();
    this.signalController = new SignalController();
    this.particleSystem = new ParticleSystem(this.signalController);

    this.init();
  }

  private init(): void {
    this.setupRenderer();
    this.setupScene();
    this.setupCamera();
    this.setupLights();
    this.setupSignalObjects();
    this.setupParticleSystem();
    this.setupConnectionLine();
    this.setupUI();
    this.setupEventListeners();
    this.signalController.calculateSignalStrength();
    this.updateUI();
    this.animate();
  }

  private setupRenderer(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('app')!.appendChild(this.renderer.domElement);
  }

  private setupScene(): void {
    this.scene.background = this.createGradientBackground();
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.015);
    this.scene.add(this.stars);
    this.scene.add(this.groundGrid);
  }

  private createGradientBackground(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#000510');
    gradient.addColorStop(0.5, '#0a0f2a');
    gradient.addColorStop(1, '#001020');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createStars(): THREE.Points {
    const starCount = 1500;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const radius = 100 + Math.random() * 200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      const brightness = 0.4 + Math.random() * 0.6;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness * 1.1;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    });
    return new THREE.Points(geo, mat);
  }

  private createGroundGrid(): THREE.GridHelper {
    const grid = new THREE.GridHelper(60, 60, 0x2244aa, 0x1a2a4a);
    grid.position.y = 0;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    return grid;
  }

  private setupCamera(): void {
    this.cameraTheta = Math.PI * 0.25;
    this.cameraPhi = Math.PI / 3.5;
    this.cameraDistance = 35;
    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    const x = this.cameraTarget.x + this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    const y = this.cameraTarget.y + this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraTarget.z + this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x4466aa, 0.5);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    this.scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xffdd66, 1.2, 40);
    pointLight.position.copy(this.signalController.signalSource.position);
    this.signalController.signalSource.add(pointLight);

    const recvLight = new THREE.PointLight(0x66bbff, 0.8, 30);
    recvLight.position.set(0, 1, 0);
    this.signalController.receiver.add(recvLight);
  }

  private setupSignalObjects(): void {
    this.scene.add(this.signalController.signalSource);
    this.scene.add(this.signalController.receiver);

    const obstacles = this.signalController.createObstacles(4);
    obstacles.forEach(ob => this.scene.add(ob));
  }

  private setupParticleSystem(): void {
    this.scene.add(this.particleSystem.points);
  }

  private setupConnectionLine(): void {
    const positions = new Float32Array(2 * 3);
    this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.connectionLine = new THREE.Line(this.lineGeometry, this.lineMaterial);
    this.scene.add(this.connectionLine);
  }

  private updateConnectionLine(): void {
    if (!this.connectionLine) return;

    const src = this.signalController.signalSource.position;
    const rcv = this.signalController.receiver.position;

    const positions = this.lineGeometry.attributes.position.array as Float32Array;
    positions[0] = src.x;
    positions[1] = src.y + 0.5;
    positions[2] = src.z;
    positions[3] = rcv.x;
    positions[4] = rcv.y + 0.5;
    positions[5] = rcv.z;
    this.lineGeometry.attributes.position.needsUpdate = true;

    const strength = this.signalController.signalStrength;
    const color = this.signalController.getSignalColor(strength);
    this.lineMaterial.color.lerp(color, 0.15);

    this.updateSignalStrengthLabel();
  }

  private updateSignalStrengthLabel(): void {
    const src = this.signalController.signalSource.position;
    const rcv = this.signalController.receiver.position;
    const midX = (src.x + rcv.x) / 2;
    const midY = (src.y + rcv.y) / 2 + 1.5;
    const midZ = (src.z + rcv.z) / 2;

    const screenPos = new THREE.Vector3(midX, midY, midZ).project(this.camera);
    const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

    this.signalStrengthText.style.left = `${x}px`;
    this.signalStrengthText.style.top = `${y}px`;
    this.signalStrengthText.textContent = `${Math.round(this.signalController.signalStrength * 100)}%`;
    const hue = this.signalController.signalStrength * 120;
    this.signalStrengthText.style.color = `hsl(${hue}, 100%, 60%)`;
  }

  private setupUI(): void {
    this.infoPanel.style.position = 'absolute';
    this.infoPanel.style.top = '16px';
    this.infoPanel.style.left = '16px';
    this.infoPanel.style.padding = '16px 20px';
    this.infoPanel.style.background = 'rgba(255, 255, 255, 0.1)';
    this.infoPanel.style.backdropFilter = 'blur(12px)';
    this.infoPanel.style.webkitBackdropFilter = 'blur(12px)';
    this.infoPanel.style.borderRadius = '12px';
    this.infoPanel.style.border = '1px solid rgba(255, 255, 255, 0.15)';
    this.infoPanel.style.color = 'white';
    this.infoPanel.style.fontSize = '13px';
    this.infoPanel.style.lineHeight = '1.8';
    this.infoPanel.style.fontFamily = '-apple-system, BlinkMacSystemFont, sans-serif';
    this.infoPanel.style.minWidth = '200px';
    this.infoPanel.style.transition = 'all 0.3s ease-out';
    this.infoPanel.style.zIndex = '10';
    this.infoPanel.innerHTML = '<div style="font-size:15px;font-weight:600;margin-bottom:10px;color:#88ddff;">📡 实时信息</div>';

    this.sourceCoordLabel.style.marginTop = '4px';
    this.receiverCoordLabel.style.marginTop = '4px';
    this.strengthLabel.style.marginTop = '8px';
    this.pathCountLabel.style.marginTop = '4px';
    this.fpsLabel.style.marginTop = '8px';
    this.fpsLabel.style.opacity = '0.7';
    this.fpsLabel.style.fontSize = '11px';

    this.infoPanel.appendChild(this.sourceCoordLabel);
    this.infoPanel.appendChild(this.receiverCoordLabel);
    this.infoPanel.appendChild(this.strengthLabel);
    this.infoPanel.appendChild(this.pathCountLabel);
    this.infoPanel.appendChild(this.fpsLabel);

    document.body.appendChild(this.infoPanel);

    this.controlPanel.style.position = 'absolute';
    this.controlPanel.style.top = '16px';
    this.controlPanel.style.right = '16px';
    this.controlPanel.style.padding = '18px 22px';
    this.controlPanel.style.background = 'rgba(255, 255, 255, 0.6)';
    this.controlPanel.style.backdropFilter = 'blur(16px)';
    this.controlPanel.style.webkitBackdropFilter = 'blur(16px)';
    this.controlPanel.style.borderRadius = '16px';
    this.controlPanel.style.border = '1px solid rgba(255, 255, 255, 0.3)';
    this.controlPanel.style.color = '#1a1a2e';
    this.controlPanel.style.fontSize = '13px';
    this.controlPanel.style.fontFamily = '-apple-system, BlinkMacSystemFont, sans-serif';
    this.controlPanel.style.minWidth = '260px';
    this.controlPanel.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.2)';
    this.controlPanel.style.transition = 'all 0.3s ease-out';
    this.controlPanel.style.zIndex = '10';
    this.controlPanel.innerHTML = '<div style="font-size:16px;font-weight:700;margin-bottom:14px;color:#1a3a5c;">🎛️ 控制面板</div>';

    const coordSection = document.createElement('div');
    coordSection.style.marginBottom = '14px';
    coordSection.innerHTML = '<div style="font-weight:600;margin-bottom:6px;color:#2a4a6c;">坐标信息</div>';
    coordSection.appendChild(this.createInfoRow('信号源', this.sourceCoordLabel));
    coordSection.appendChild(this.createInfoRow('接收器', this.receiverCoordLabel));
    this.controlPanel.appendChild(coordSection);

    const strengthSection = document.createElement('div');
    strengthSection.style.marginBottom = '14px';
    strengthSection.innerHTML = '<div style="font-weight:600;margin-bottom:8px;color:#2a4a6c;">信号强度</div>';
    const strengthBarContainer = document.createElement('div');
    strengthBarContainer.style.width = '100%';
    strengthBarContainer.style.height = '14px';
    strengthBarContainer.style.background = 'rgba(0,0,0,0.1)';
    strengthBarContainer.style.borderRadius = '7px';
    strengthBarContainer.style.overflow = 'hidden';
    strengthBarContainer.style.position = 'relative';

    this.strengthBarFill.style.height = '100%';
    this.strengthBarFill.style.width = '100%';
    this.strengthBarFill.style.borderRadius = '7px';
    this.strengthBarFill.style.background = 'linear-gradient(90deg, #ff4444, #ffaa00, #44dd44)';
    this.strengthBarFill.style.transition = 'width 0.3s ease-out';
    strengthBarContainer.appendChild(this.strengthBarFill);

    const strengthText = document.createElement('div');
    strengthText.style.position = 'absolute';
    strengthText.style.top = '50%';
    strengthText.style.left = '50%';
    strengthText.style.transform = 'translate(-50%, -50%)';
    strengthText.style.fontSize = '11px';
    strengthText.style.fontWeight = '600';
    strengthText.style.color = 'white';
    strengthText.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
    this.strengthBarFill.appendChild(strengthText);
    this.strengthLabel = strengthText;

    strengthSection.appendChild(strengthBarContainer);
    this.controlPanel.appendChild(strengthSection);

    const pathSection = document.createElement('div');
    pathSection.style.marginBottom = '16px';
    this.pathCountLabel.style.fontWeight = '500';
    pathSection.appendChild(this.createInfoRow('多径数量', this.pathCountLabel));
    this.controlPanel.appendChild(pathSection);

    const resetBtn = document.createElement('button');
    resetBtn.textContent = '🔄 重置位置';
    resetBtn.style.width = '100%';
    resetBtn.style.padding = '10px 16px';
    resetBtn.style.marginBottom = '10px';
    resetBtn.style.border = 'none';
    resetBtn.style.borderRadius = '8px';
    resetBtn.style.background = 'linear-gradient(135deg, #4ecdc4, #44a3aa)';
    resetBtn.style.color = 'white';
    resetBtn.style.fontWeight = '600';
    resetBtn.style.fontSize = '13px';
    resetBtn.style.cursor = 'pointer';
    resetBtn.style.transition = 'all 0.3s ease-out';
    resetBtn.style.boxShadow = '0 2px 8px rgba(78, 205, 196, 0.3)';
    resetBtn.onmouseenter = () => {
      resetBtn.style.transform = 'scale(1.03)';
      resetBtn.style.boxShadow = '0 4px 16px rgba(78, 205, 196, 0.5)';
    };
    resetBtn.onmouseleave = () => {
      resetBtn.style.transform = 'scale(1)';
      resetBtn.style.boxShadow = '0 2px 8px rgba(78, 205, 196, 0.3)';
    };
    resetBtn.onclick = () => {
      this.signalController.resetPositions();
      this.updateUI();
    };
    this.controlPanel.appendChild(resetBtn);

    const trailRow = document.createElement('div');
    trailRow.style.display = 'flex';
    trailRow.style.alignItems = 'center';
    trailRow.style.justifyContent = 'space-between';
    trailRow.style.marginTop = '4px';

    const trailLabel = document.createElement('span');
    trailLabel.textContent = '粒子轨迹';
    trailLabel.style.fontWeight = '500';
    trailLabel.style.color = '#2a4a6c';

    const trailToggle = document.createElement('label');
    trailToggle.style.position = 'relative';
    trailToggle.style.display = 'inline-block';
    trailToggle.style.width = '46px';
    trailToggle.style.height = '24px';

    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.style.opacity = '0';
    toggleInput.style.width = '0';
    toggleInput.style.height = '0';
    toggleInput.onchange = () => {
      this.particleSystem.setShowTrails(toggleInput.checked);
    };

    const toggleSlider = document.createElement('span');
    toggleSlider.style.position = 'absolute';
    toggleSlider.style.cursor = 'pointer';
    toggleSlider.style.top = '0';
    toggleSlider.style.left = '0';
    toggleSlider.style.right = '0';
    toggleSlider.style.bottom = '0';
    toggleSlider.style.backgroundColor = '#ccc';
    toggleSlider.style.transition = '.3s';
    toggleSlider.style.borderRadius = '24px';
    toggleSlider.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.2)';

    const toggleDot = document.createElement('span');
    toggleDot.style.position = 'absolute';
    toggleDot.style.content = '""';
    toggleDot.style.height = '18px';
    toggleDot.style.width = '18px';
    toggleDot.style.left = '3px';
    toggleDot.style.bottom = '3px';
    toggleDot.style.backgroundColor = 'white';
    toggleDot.style.transition = '.3s';
    toggleDot.style.borderRadius = '50%';
    toggleDot.style.boxShadow = '0 1px 3px rgba(0,0,0,0.3)';
    toggleSlider.appendChild(toggleDot);

    toggleInput.onchange = () => {
      if (toggleInput.checked) {
        toggleSlider.style.backgroundColor = '#4ecdc4';
        toggleDot.style.transform = 'translateX(22px)';
      } else {
        toggleSlider.style.backgroundColor = '#ccc';
        toggleDot.style.transform = 'translateX(0)';
      }
      this.particleSystem.setShowTrails(toggleInput.checked);
    };

    trailToggle.appendChild(toggleInput);
    trailToggle.appendChild(toggleSlider);
    trailRow.appendChild(trailLabel);
    trailRow.appendChild(trailToggle);
    this.controlPanel.appendChild(trailRow);

    document.body.appendChild(this.controlPanel);

    this.signalStrengthText.style.position = 'absolute';
    this.signalStrengthText.style.fontSize = '18px';
    this.signalStrengthText.style.fontWeight = 'bold';
    this.signalStrengthText.style.pointerEvents = 'none';
    this.signalStrengthText.style.textShadow = '0 0 8px rgba(0,0,0,0.8), 0 0 16px rgba(0,0,0,0.5)';
    this.signalStrengthText.style.transform = 'translate(-50%, -50%)';
    this.signalStrengthText.style.transition = 'color 0.3s ease-out';
    this.signalStrengthText.style.zIndex = '5';
    document.body.appendChild(this.signalStrengthText);

    const hint = document.createElement('div');
    hint.style.position = 'absolute';
    hint.style.bottom = '16px';
    hint.style.left = '50%';
    hint.style.transform = 'translateX(-50%)';
    hint.style.padding = '10px 20px';
    hint.style.background = 'rgba(255,255,255,0.08)';
    hint.style.backdropFilter = 'blur(8px)';
    hint.style.borderRadius = '10px';
    hint.style.color = 'rgba(255,255,255,0.7)';
    hint.style.fontSize = '12px';
    hint.style.fontFamily = '-apple-system, BlinkMacSystemFont, sans-serif';
    hint.style.zIndex = '10';
    hint.textContent = 'WASD：移动信号源 | 左键拖拽：旋转接收器/拖拽障碍物 | Shift+拖拽：移动接收器 | 右键拖拽：旋转视角 | 滚轮：缩放';
    document.body.appendChild(hint);
  }

  private createInfoRow(label: string, valueEl: HTMLDivElement): HTMLDivElement {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.alignItems = 'center';
    row.style.padding = '3px 0';

    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    labelEl.style.opacity = '0.7';
    labelEl.style.fontSize = '12px';

    valueEl.style.fontSize = '12px';
    valueEl.style.fontWeight = '500';
    valueEl.style.fontFamily = 'monospace';
    valueEl.textContent = '---';

    row.appendChild(labelEl);
    row.appendChild(valueEl);
    return row;
  }

  private updateUI(): void {
    const src = this.signalController.signalSource.position;
    const rcv = this.signalController.receiver.position;
    const strength = this.signalController.signalStrength;
    const pathCount = this.signalController.pathCount;

    const fmt = (v: number) => v.toFixed(1).padStart(5, ' ');
    this.sourceCoordLabel.textContent = `(${fmt(src.x)}, ${fmt(src.y)}, ${fmt(src.z)})`;
    this.receiverCoordLabel.textContent = `(${fmt(rcv.x)}, ${fmt(rcv.y)}, ${fmt(rcv.z)})`;

    const strengthPct = Math.round(strength * 100);
    this.strengthLabel.textContent = `${strengthPct}%`;
    this.strengthBarFill.style.width = `${strengthPct}%`;
    this.pathCountLabel.textContent = `${pathCount}`;
    this.fpsLabel.textContent = `FPS: ${this.currentFps}`;
  }

  private setupEventListeners(): void {
    this.signalController.setupInputListeners(
      this.renderer.domElement,
      this.camera,
      this.raycaster
    );

    this.signalController.setOnPositionChange(() => this.updateUI());
    this.signalController.setOnStrengthChange(() => this.updateUI());

    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    this.renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    this.renderer.domElement.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        this.isRightMouseDown = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 2) {
        this.isRightMouseDown = false;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isRightMouseDown) {
        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;
        this.cameraTheta -= deltaX * 0.005;
        this.cameraPhi = THREE.MathUtils.clamp(
          this.cameraPhi - deltaY * 0.005,
          0.1,
          Math.PI / 2 - 0.05
        );
        this.updateCameraPosition();
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    this.renderer.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance = THREE.MathUtils.clamp(
        this.cameraDistance + e.deltaY * 0.03,
        10,
        80
      );
      this.updateCameraPosition();
    }, { passive: false });
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.getElapsedTime();

    this.frameCount++;
    if (elapsed - this.lastFpsTime >= 0.5) {
      this.currentFps = Math.round(this.frameCount / (elapsed - this.lastFpsTime));
      this.frameCount = 0;
      this.lastFpsTime = elapsed;
      this.fpsLabel.textContent = `FPS: ${this.currentFps}`;
    }

    this.signalController.update(delta);
    this.particleSystem.update(delta, elapsed);
    this.updateConnectionLine();

    if (this.particleSystem.trailLines && !this.scene.children.includes(this.particleSystem.trailLines)) {
      this.scene.add(this.particleSystem.trailLines);
    }

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    this.particleSystem.dispose();
    this.renderer.dispose();
  }
}

new App();
