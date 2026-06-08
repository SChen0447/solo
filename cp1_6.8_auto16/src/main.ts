import * as THREE from 'three';
import { fetchEarthquakeData, EarthquakeData, filterEarthquakes, groupEarthquakesByDay } from './dataFetcher';
import { EarthRenderer } from './earthRenderer';
import { QuakeMarker } from './quakeMarker';
import { TextOverlay } from './textOverlay';

class EarthquakeVisualization {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  private earthRenderer: EarthRenderer;
  private textOverlay: TextOverlay;

  private allQuakes: EarthquakeData[] = [];
  private visibleQuakes: EarthquakeData[] = [];
  private markers: Map<string, QuakeMarker> = new Map();
  private markerGroup: THREE.Group;

  private stars: THREE.Points;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredMarker: QuakeMarker | null = null;

  private isDragging: boolean = false;
  private previousMouseX: number = 0;
  private previousMouseY: number = 0;
  private targetRotationX: number = 0;
  private targetRotationY: number = 0;
  private currentRotationX: number = 0;
  private currentRotationY: number = 0;
  private cameraDistance: number = 15;
  private targetCameraDistance: number = 15;

  private minDistance: number = 6;
  private maxDistance: number = 30;

  private clock: THREE.Clock;

  private minMagnitude: number = 2.5;
  private depthShallow: boolean = true;
  private depthMid: boolean = true;
  private depthDeep: boolean = true;

  private isPlaying: boolean = false;
  private playbackSpeed: number = 2;
  private playbackTime: number = 0;
  private groupedQuakes: Map<string, EarthquakeData[]> = new Map();
  private sortedDays: string[] = [];
  private normalRotationSpeed: number = 1;

  private animationFrameId: number | null = null;

  constructor() {
    this.container = document.getElementById('canvas-container')!;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0b0f19);

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 15;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.container.appendChild(this.renderer.domElement);

    this.earthRenderer = new EarthRenderer(5);
    this.scene.add(this.earthRenderer.group);

    this.markerGroup = new THREE.Group();
    this.scene.add(this.markerGroup);

    this.textOverlay = new TextOverlay();

    this.stars = this.createStars();
    this.scene.add(this.stars);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.clock = new THREE.Clock();

    this.addLights();
    this.setupEventListeners();
    this.setupControls();

    this.targetCameraDistance = 15;
    this.cameraDistance = 15;

    this.loadData();

    this.animate();
  }

  private createStars(): THREE.Points {
    const starCount = 200;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const radius = 80 + Math.random() * 40;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      const brightness = 0.6 + Math.random() * 0.4;
      colors[i3] = brightness;
      colors[i3 + 1] = brightness;
      colors[i3 + 2] = brightness;

      sizes[i] = 0.5 + Math.random();
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 1.2,
      map: texture,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    return new THREE.Points(geometry, material);
  }

  private addLights(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 5, 10);
    this.scene.add(directionalLight);

    const rimLight = new THREE.DirectionalLight(0x00d4ff, 0.3);
    rimLight.position.set(-10, -5, -10);
    this.scene.add(rimLight);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onWindowResize());

    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.onMouseUp());
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });

    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', () => this.onTouchEnd());
  }

  private setupControls(): void {
    const magSlider = document.getElementById('magnitude-slider') as HTMLInputElement;
    const magValue = document.getElementById('magnitude-value')!;

    magSlider.addEventListener('input', () => {
      this.minMagnitude = parseFloat(magSlider.value);
      magValue.textContent = this.minMagnitude.toFixed(1);
      this.applyFilters();
    });

    const shallowCheckbox = document.getElementById('depth-shallow') as HTMLInputElement;
    const midCheckbox = document.getElementById('depth-mid') as HTMLInputElement;
    const deepCheckbox = document.getElementById('depth-deep') as HTMLInputElement;

    shallowCheckbox.addEventListener('change', () => {
      this.depthShallow = shallowCheckbox.checked;
      this.applyFilters();
    });

    midCheckbox.addEventListener('change', () => {
      this.depthMid = midCheckbox.checked;
      this.applyFilters();
    });

    deepCheckbox.addEventListener('change', () => {
      this.depthDeep = deepCheckbox.checked;
      this.applyFilters();
    });

    const playBtn = document.getElementById('play-btn')!;
    playBtn.addEventListener('click', () => this.togglePlayback());

    const speedBtns = document.querySelectorAll('.speed-btn');
    speedBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        speedBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.playbackSpeed = parseFloat((btn as HTMLElement).dataset.speed || '2');
      });
    });
  }

  private async loadData(): Promise<void> {
    try {
      this.allQuakes = await fetchEarthquakeData(2.5, 500);
      this.groupedQuakes = groupEarthquakesByDay(this.allQuakes);
      this.sortedDays = Array.from(this.groupedQuakes.keys());

      this.createMarkers(this.allQuakes);
      this.applyFilters();

      const lastUpdate = new Date();
      this.textOverlay.updateLastUpdate(lastUpdate);
    } catch (error) {
      console.error('Failed to load earthquake data:', error);
      const statusDot = document.querySelector('.status-dot') as HTMLElement;
      if (statusDot) {
        statusDot.style.background = '#ff6b6b';
        statusDot.style.animation = 'none';
      }
    }
  }

  private createMarkers(quakes: EarthquakeData[]): void {
    const earthRadius = this.earthRenderer.getRadius();

    quakes.forEach((quake) => {
      if (!this.markers.has(quake.id)) {
        const marker = new QuakeMarker({
          lat: quake.lat,
          lng: quake.lng,
          depth: quake.depth,
          magnitude: quake.magnitude,
          earthRadius: earthRadius,
        });
        this.markers.set(quake.id, marker);
        this.markerGroup.add(marker.group);
        marker.setVisible(false, false);
      }
    });
  }

  private applyFilters(): void {
    if (this.isPlaying) return;

    const filtered = filterEarthquakes(this.allQuakes, {
      minMagnitude: this.minMagnitude,
      shallow: this.depthShallow,
      mid: this.depthMid,
      deep: this.depthDeep,
    });

    this.visibleQuakes = filtered;

    this.markers.forEach((marker, id) => {
      const isVisible = filtered.some((q) => q.id === id);
      marker.setVisible(isVisible, true);
    });

    this.textOverlay.updateEventCount(filtered.length);
    this.textOverlay.updateTimeline(null, 0);
  }

  private togglePlayback(): void {
    const playBtn = document.getElementById('play-btn')!;

    if (this.isPlaying) {
      this.isPlaying = false;
      playBtn.classList.remove('playing');
      playBtn.textContent = '▶';
      this.earthRenderer.setRotationSpeed(this.normalRotationSpeed);
      this.applyFilters();
    } else {
      if (this.sortedDays.length === 0) return;

      this.isPlaying = true;
      playBtn.classList.add('playing');
      playBtn.textContent = '⏸';

      this.playbackTime = 0;

      this.normalRotationSpeed = 1;
      this.earthRenderer.setRotationSpeed(3);

      this.markers.forEach((marker) => {
        marker.setVisible(false, true);
      });
    }
  }

  private updatePlayback(delta: number): void {
    if (!this.isPlaying || this.sortedDays.length === 0) return;

    const dayDuration = 2.8 / this.playbackSpeed;
    const totalDays = this.sortedDays.length;
    const totalDuration = dayDuration * totalDays;

    this.playbackTime += delta;

    if (this.playbackTime >= totalDuration) {
      this.togglePlayback();
      return;
    }

    const currentDayIndex = Math.floor(this.playbackTime / dayDuration);
    const dayProgress = (this.playbackTime % dayDuration) / dayDuration;

    const fadeInDuration = 0.8 / this.playbackSpeed / dayDuration;
    const fadeOutDuration = 0.8 / this.playbackSpeed / dayDuration;

    for (let i = 0; i < totalDays; i++) {
      const dayKey = this.sortedDays[i];
      const quakes = this.groupedQuakes.get(dayKey)!;

      let targetOpacity = 0;

      if (i === currentDayIndex) {
        if (dayProgress < fadeInDuration) {
          targetOpacity = dayProgress / fadeInDuration;
        } else if (dayProgress > 1 - fadeOutDuration) {
          targetOpacity = (1 - dayProgress) / fadeOutDuration;
        } else {
          targetOpacity = 1;
        }
      } else if (i < currentDayIndex) {
        targetOpacity = 0;
      }

      quakes.forEach((quake) => {
        const marker = this.markers.get(quake.id);
        if (marker) {
          const passesFilter =
            quake.magnitude >= this.minMagnitude &&
            ((quake.depth < 70 && this.depthShallow) ||
              (quake.depth >= 70 && quake.depth <= 300 && this.depthMid) ||
              (quake.depth > 300 && this.depthDeep));

          if (passesFilter) {
            marker.targetOpacity = targetOpacity;
            marker.group.visible = targetOpacity > 0.01 || marker.currentOpacity > 0.01;
          } else {
            marker.targetOpacity = 0;
          }
        }
      });
    }

    const currentDate = new Date(this.sortedDays[Math.min(currentDayIndex, totalDays - 1)]);
    const progress = this.playbackTime / totalDuration;
    this.textOverlay.updateTimeline(currentDate, progress);

    const visibleCount = Array.from(this.markers.values()).filter(
      (m) => m.currentOpacity > 0.5
    ).length;
    this.textOverlay.updateEventCount(visibleCount);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
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

      this.targetRotationX = Math.max(
        -Math.PI / 2 + 0.1,
        Math.min(Math.PI / 2 - 0.1, this.targetRotationX)
      );

      this.previousMouseX = e.clientX;
      this.previousMouseY = e.clientY;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    if (!this.isDragging) {
      this.checkHover();
    }
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const zoomSpeed = 0.002;
    this.targetCameraDistance += e.deltaY * zoomSpeed;
    this.targetCameraDistance = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.targetCameraDistance)
    );
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.previousMouseX = e.touches[0].clientX;
      this.previousMouseY = e.touches[0].clientY;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();

    if (e.touches.length === 1 && this.isDragging) {
      const deltaX = e.touches[0].clientX - this.previousMouseX;
      const deltaY = e.touches[0].clientY - this.previousMouseY;

      this.targetRotationY += deltaX * 0.005;
      this.targetRotationX += deltaY * 0.005;
      this.targetRotationX = Math.max(
        -Math.PI / 2 + 0.1,
        Math.min(Math.PI / 2 - 0.1, this.targetRotationX)
      );

      this.previousMouseX = e.touches[0].clientX;
      this.previousMouseY = e.touches[0].clientY;
    }
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const markerMeshes: THREE.Mesh[] = [];
    const markerMap: Map<THREE.Mesh, QuakeMarker> = new Map();

    this.markers.forEach((marker) => {
      if (marker.group.visible && marker.currentOpacity > 0.3) {
        markerMeshes.push(marker.marker);
        markerMap.set(marker.marker, marker);
      }
    });

    const intersects = this.raycaster.intersectObjects(markerMeshes);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const marker = markerMap.get(mesh);

      if (marker && marker !== this.hoveredMarker) {
        if (this.hoveredMarker) {
          this.hoveredMarker.setHovered(false);
        }

        this.hoveredMarker = marker;
        marker.setHovered(true);

        const quake = this.allQuakes.find((q) => q.id === marker.group.userData.marker.data.id);
        if (quake) {
          this.textOverlay.show(quake);
        }

        this.renderer.domElement.style.cursor = 'pointer';
      }
    } else {
      if (this.hoveredMarker) {
        this.hoveredMarker.setHovered(false);
        this.hoveredMarker = null;
        this.textOverlay.hide();
        this.renderer.domElement.style.cursor = 'grab';
      }
    }
  }

  private updateCamera(delta: number): void {
    this.cameraDistance += (this.targetCameraDistance - this.cameraDistance) * 0.1;
    this.currentRotationX += (this.targetRotationX - this.currentRotationX) * 0.1;
    this.currentRotationY += (this.targetRotationY - this.currentRotationY) * 0.1;

    const x = this.cameraDistance * Math.cos(this.currentRotationX) * Math.sin(this.currentRotationY);
    const y = this.cameraDistance * Math.sin(this.currentRotationX);
    const z = this.cameraDistance * Math.cos(this.currentRotationX) * Math.cos(this.currentRotationY);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  private updateStars(time: number): void {
    const positions = this.stars.geometry.attributes.position as THREE.BufferAttribute;
    const colors = this.stars.geometry.attributes.color as THREE.BufferAttribute;

    for (let i = 0; i < positions.count; i++) {
      const twinkle = Math.sin(time * (0.5 + (i % 5) * 0.2) + i * 0.5) * 0.3 + 0.7;
      colors.setX(i, twinkle);
      colors.setY(i, twinkle);
      colors.setZ(i, twinkle);
    }

    colors.needsUpdate = true;

    this.stars.rotation.y += 0.0001;
  }

  private updateMarkerVisibility(): void {
    const cameraPosition = this.camera.position;
    const earthCenter = new THREE.Vector3(0, 0, 0);

    const cameraDir = new THREE.Vector3()
      .subVectors(cameraPosition, earthCenter)
      .normalize();

    this.markers.forEach((marker) => {
      if (!marker.group.visible && marker.targetOpacity === 0) return;

      const markerPos = marker.group.position;
      const markerDir = new THREE.Vector3().copy(markerPos).normalize();

      const dot = cameraDir.dot(markerDir);

      const shouldBeVisible = dot < -0.1;

      if (marker.isVisible !== shouldBeVisible && marker.targetOpacity > 0) {
        marker.isVisible = shouldBeVisible;
        if (!shouldBeVisible) {
          marker.group.visible = false;
        }
      }

      if (shouldBeVisible && marker.targetOpacity > 0) {
        marker.group.visible = true;
      }
    });
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    this.updateCamera(delta);
    this.earthRenderer.update(delta);
    this.updateStars(time);

    if (!this.isPlaying) {
      this.updateMarkerVisibility();
    }

    this.markers.forEach((marker) => {
      if (marker.group.visible || Math.abs(marker.targetOpacity - marker.currentOpacity) > 0.01) {
        marker.update(delta, time);
      }
    });

    if (this.isPlaying) {
      this.updatePlayback(delta);
    }

    this.renderer.render(this.scene, this.camera);
  };

  public dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.markers.forEach((marker) => marker.dispose());
    this.earthRenderer.dispose();

    this.renderer.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new EarthquakeVisualization();
});
