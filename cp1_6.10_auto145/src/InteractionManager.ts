import * as THREE from 'three';
import { PlanetSystem, PlanetObject } from './PlanetSystem';

export class InteractionManager {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private camera: THREE.PerspectiveCamera;
  private planetSystem: PlanetSystem;
  private domElement: HTMLElement;
  private infoPanel: HTMLElement;

  private hoveredPlanet: PlanetObject | null = null;
  private selectedPlanet: PlanetObject | null = null;

  private onPlanetHover?: (planet: PlanetObject | null) => void;
  private onPlanetClick?: (planet: PlanetObject | null) => void;

  constructor(
    camera: THREE.PerspectiveCamera,
    planetSystem: PlanetSystem,
    domElement: HTMLElement
  ) {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.camera = camera;
    this.planetSystem = planetSystem;
    this.domElement = domElement;

    this.infoPanel = document.getElementById('planet-info')!;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.addEventListener('click', this.onClick.bind(this));
    this.domElement.addEventListener('mouseleave', this.onMouseLeave.bind(this));
  }

  private updateMouse(event: MouseEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getIntersectedPlanet(): PlanetObject | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.planetSystem.getPlanetMeshes();
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      return this.planetSystem.getPlanetByMesh(mesh);
    }
    return null;
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMouse(event);
    const planet = this.getIntersectedPlanet();

    if (planet !== this.hoveredPlanet) {
      if (this.hoveredPlanet) {
        this.setPlanetHighlight(this.hoveredPlanet, false);
      }

      this.hoveredPlanet = planet;

      if (planet) {
        this.setPlanetHighlight(planet, true);
        this.domElement.style.cursor = 'pointer';
      } else {
        this.domElement.style.cursor = 'default';
      }

      if (this.onPlanetHover) {
        this.onPlanetHover(planet);
      }
    }
  }

  private onClick(event: MouseEvent): void {
    this.updateMouse(event);
    const planet = this.getIntersectedPlanet();

    if (planet) {
      this.selectedPlanet = planet;
      this.showPlanetInfo(planet);
    } else {
      this.selectedPlanet = null;
      this.hidePlanetInfo();
    }

    if (this.onPlanetClick) {
      this.onPlanetClick(planet);
    }
  }

  private onMouseLeave(): void {
    if (this.hoveredPlanet) {
      this.setPlanetHighlight(this.hoveredPlanet, false);
      this.hoveredPlanet = null;
      this.domElement.style.cursor = 'default';
    }
  }

  private setPlanetHighlight(planet: PlanetObject, highlight: boolean): void {
    const index = this.planetSystem.planets.indexOf(planet);
    if (index !== -1) {
      this.planetSystem.setPlanetHighlight(highlight ? index : null);
    }
  }

  private showPlanetInfo(planet: PlanetObject): void {
    const data = planet.data;
    const html = `
      <h3>${data.nameCN} <span style="color:#888;font-size:13px;font-weight:normal;">(${data.name})</span></h3>
      <div class="info-row">
        <span class="info-label">质量</span>
        <span class="info-value highlight">${data.mass} M⊕</span>
      </div>
      <div class="info-row">
        <span class="info-label">半径</span>
        <span class="info-value">${data.radiusEarth} R⊕</span>
      </div>
      <div class="info-row">
        <span class="info-label">轨道周期</span>
        <span class="info-value">${data.orbitPeriod} 地球年</span>
      </div>
      <div class="info-row">
        <span class="info-label">自转周期</span>
        <span class="info-value">${data.rotationPeriod} 地球日</span>
      </div>
      <div class="info-row">
        <span class="info-label">距太阳距离</span>
        <span class="info-value">${data.distanceAU} AU</span>
      </div>
      <div class="info-row">
        <span class="info-label">轴倾角</span>
        <span class="info-value">${data.axialTilt}°</span>
      </div>
    `;
    this.infoPanel.innerHTML = html;
    this.infoPanel.classList.add('visible');
  }

  private hidePlanetInfo(): void {
    this.infoPanel.classList.remove('visible');
  }

  public setOnPlanetHover(callback: (planet: PlanetObject | null) => void): void {
    this.onPlanetHover = callback;
  }

  public setOnPlanetClick(callback: (planet: PlanetObject | null) => void): void {
    this.onPlanetClick = callback;
  }

  public dispose(): void {
    this.domElement.removeEventListener('mousemove', this.onMouseMove.bind(this));
    this.domElement.removeEventListener('click', this.onClick.bind(this));
    this.domElement.removeEventListener('mouseleave', this.onMouseLeave.bind(this));
  }
}
