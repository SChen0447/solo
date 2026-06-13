import * as THREE from 'three';
import { DiceTower } from './tower';
import { Dice } from './dice';
import { DivinationLog } from './log';

const WISDOMS = [
  '命运之轮，永不停息',
  '星星指引方向，心决定道路',
  '每一次选择都是新的开始',
  '月亮守护夜晚，太阳带来黎明',
  '愚人之旅，始于足下',
  '沉默之中，智慧生长',
  '力量不在于征服，而在于平衡',
  '死亡不是终点，而是蜕变',
  '节制之心，调和万物',
  '恶魔的锁链，由自己锻造'
];

class CrystalDiceTowerApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private tower: DiceTower;
  private dice: Dice;
  private log: DivinationLog;
  private stars: THREE.Points;
  private clock: THREE.Clock;
  private isRolling: boolean = false;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private container: HTMLElement;

  constructor() {
    this.container = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0D0D2B);

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 3, 8);
    this.camera.lookAt(0, 1.5, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.tower = new DiceTower();
    this.tower.group.position.set(-1, 0, 0);
    this.scene.add(this.tower.group);

    this.dice = new Dice();
    this.dice.group.position.set(-1, 0.4, 0.2);
    this.scene.add(this.dice.group);

    this.log = new DivinationLog();

    this.stars = this.createStars();
    this.scene.add(this.stars);

    this.setupLighting();
    this.setupEvents();

    this.updateWisdom();

    this.hideLoading();

    this.animate();
  }

  private createStars(): THREE.Points {
    const starCount = 200;
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const phases = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = Math.random() * 15;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 5;
      sizes[i] = 0.5 + Math.random() * 1.5;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.05,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    const points = new THREE.Points(geometry, material);
    points.userData.phases = phases;

    return points;
  }

  private setupLighting() {
    const ambientLight = new THREE.AmbientLight(0x303050, 0.5);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 10, 7);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 50;
    mainLight.shadow.camera.left = -10;
    mainLight.shadow.camera.right = 10;
    mainLight.shadow.camera.top = 10;
    mainLight.shadow.camera.bottom = -10;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x6688cc, 0.3);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);

    const bottomLight = new THREE.PointLight(0x8866ff, 0.4, 10);
    bottomLight.position.set(0, -1, 0);
    this.scene.add(bottomLight);
  }

  private setupEvents() {
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('click', (e) => this.onClick(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseMove(event: MouseEvent) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  private onClick(event: MouseEvent) {
    const logToggle = document.getElementById('log-toggle');
    if (logToggle && logToggle.contains(event.target as Node)) {
      return;
    }

    const logPanel = document.getElementById('log-panel');
    if (logPanel && logPanel.contains(event.target as Node)) {
      return;
    }

    if (this.isRolling) return;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.tower.group, true);

    if (intersects.length > 0) {
      const hitPoint = intersects[0].point;
      const leverPos = this.tower.getLeverPosition();
      const worldLeverPos = leverPos.clone().add(this.tower.group.position);

      const distance = hitPoint.distanceTo(worldLeverPos);

      if (distance < 1.5) {
        this.rollDice();
      }
    }
  }

  private async rollDice() {
    if (this.isRolling) return;
    this.isRolling = true;

    this.tower.resetLights();
    this.dice.hideHologram();

    await this.tower.pullLever();

    const randomPoint = Math.floor(Math.random() * 6) + 1;
    const spawnPos = this.tower.getDiceSpawnPosition();
    spawnPos.add(this.tower.group.position);

    const result = await this.dice.roll(randomPoint, spawnPos);

    await this.tower.lightUpTower(result);

    await this.dice.showHologram(result);

    this.log.addEntry(result);
    this.updateWisdom();

    this.isRolling = false;
  }

  private updateWisdom() {
    const wisdomText = document.getElementById('wisdom-text');
    if (wisdomText) {
      const randomWisdom = WISDOMS[Math.floor(Math.random() * WISDOMS.length)];
      wisdomText.style.opacity = '0';
      setTimeout(() => {
        wisdomText.textContent = randomWisdom;
        wisdomText.style.opacity = '0.9';
        wisdomText.style.transition = 'opacity 0.5s ease';
      }, 300);
    }
  }

  private updateStars(time: number) {
    const phases = this.stars.userData.phases as Float32Array;
    const material = this.stars.material as THREE.PointsMaterial;

    const avgOpacity = 0.5 + 0.3 * Math.sin(time * 0.5);
    material.opacity = avgOpacity;

    const positions = this.stars.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length / 3; i++) {
      positions[i * 3 + 1] += Math.sin(time + phases[i]) * 0.001;
    }
    this.stars.geometry.attributes.position.needsUpdate = true;
  }

  private hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
      setTimeout(() => {
        loading.classList.add('hidden');
        setTimeout(() => {
          loading.style.display = 'none';
        }, 500);
      }, 500);
    }
  }

  private animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.updateStars(time);
    this.tower.update(delta);
    this.dice.update(delta, time);

    const targetX = this.mouse.x * 0.3;
    this.tower.group.rotation.y += (targetX - this.tower.group.rotation.y) * 0.02;

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new CrystalDiceTowerApp();
});
