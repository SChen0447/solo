import { Pane } from 'tweakpane';
import { SolarSystem, PlanetData, PLANET_DATA } from './solarSystem';
import { GravitySimulation } from './gravitySim';
import gsap from 'gsap';

export class UI {
  private pane: Pane;
  private solarSystem: SolarSystem;
  private gravitySim: GravitySimulation;
  private params: {
    orbitalSpeed: number;
    gravityStrength: number;
    selectedPlanet: string;
  };
  private planetInfoFolder: any;
  private planetInfoElements: Map<string, any> = new Map();

  constructor(solarSystem: SolarSystem, gravitySim: GravitySimulation) {
    this.solarSystem = solarSystem;
    this.gravitySim = gravitySim;

    this.params = {
      orbitalSpeed: 1.0,
      gravityStrength: 1.0,
      selectedPlanet: '地球'
    };

    this.pane = new Pane({
      title: '控制面板',
      expanded: true
    });

    this.stylePane();
    this.createControls();
  }

  private stylePane(): void {
    const container = this.pane.containerElement;
    container.style.position = 'fixed';
    container.style.left = '16px';
    container.style.top = '16px';
    container.style.zIndex = '200';
    container.style.background = 'rgba(42, 42, 58, 0.85)';
    container.style.borderRadius = '12px';
    container.style.backdropFilter = 'blur(5px)';
    container.style.border = '1px solid rgba(0, 212, 255, 0.2)';
    container.style.boxShadow = '0 4px 24px rgba(0, 0, 0, 0.4)';
    container.style.transition = 'all 0.2s ease-out';
    container.style.color = '#ffffff';
  }

  private createControls(): void {
    const simFolder = this.pane.addFolder({
      title: '模拟参数',
      expanded: true
    });

    simFolder.addBinding(this.params, 'orbitalSpeed', {
      label: '轨道速度',
      min: 0.5,
      max: 5,
      step: 0.1
    }).on('change', (ev: any) => {
      this.solarSystem.setOrbitalSpeed(ev.value);
      gsap.to({}, {
        duration: 0.2,
        ease: 'power2.out'
      });
    });

    simFolder.addBinding(this.params, 'gravityStrength', {
      label: '引力强度',
      min: 0.1,
      max: 2.0,
      step: 0.1
    }).on('change', (ev: any) => {
      this.gravitySim.setGravityStrength(ev.value);
    });

    simFolder.addButton({
      title: '重置卫星'
    }).on('click', () => {
      this.gravitySim.resetSatellite();
    });

    this.planetInfoFolder = this.pane.addFolder({
      title: '行星数据',
      expanded: true
    });

    const planetNames = PLANET_DATA.map((p) => p.name);
    this.planetInfoFolder.addBinding(this.params, 'selectedPlanet', {
      label: '选择行星',
      options: planetNames.reduce((acc: any, name) => {
        acc[name] = name;
        return acc;
      }, {})
    }).on('change', (ev: any) => {
      this.updatePlanetInfo(ev.value);
      this.solarSystem.selectPlanet(ev.value);
    });

    this.updatePlanetInfo(this.params.selectedPlanet);

    const helpFolder = this.pane.addFolder({
      title: '操作说明',
      expanded: false
    });

    helpFolder.addBlade({
      view: 'text',
      label: '视角',
      parse: () => '',
      value: '左键拖拽旋转 / 滚轮缩放 / 右键平移'
    });

    helpFolder.addBlade({
      view: 'text',
      label: '发射',
      parse: () => '',
      value: 'Shift+左键拖拽发射卫星'
    });

    helpFolder.addBlade({
      view: 'text',
      label: '悬停',
      parse: () => '',
      value: '鼠标悬停行星查看名称'
    });
  }

  private updatePlanetInfo(planetName: string): void {
    this.planetInfoElements.forEach((elem) => {
      try {
        this.planetInfoFolder.remove(elem);
      } catch (e) {}
    });
    this.planetInfoElements.clear();

    const planetData = PLANET_DATA.find((p) => p.name === planetName);
    if (!planetData) return;

    const periodBlade = this.planetInfoFolder.addBlade({
      view: 'text',
      label: '公转周期',
      parse: () => '',
      value: `${planetData.orbitalPeriod} 地球日`
    });
    this.planetInfoElements.set('period', periodBlade);

    const inclBlade = this.planetInfoFolder.addBlade({
      view: 'text',
      label: '轨道倾角',
      parse: () => '',
      value: `${planetData.inclination.toFixed(1)}°`
    });
    this.planetInfoElements.set('inclination', inclBlade);

    const distBlade = this.planetInfoFolder.addBlade({
      view: 'text',
      label: '与太阳距离',
      parse: () => '',
      value: `${planetData.distance.toFixed(1)} 天文单位`
    });
    this.planetInfoElements.set('distance', distBlade);

    const tempBlade = this.planetInfoFolder.addBlade({
      view: 'text',
      label: '表面温度',
      parse: () => '',
      value: `${planetData.temperature} K (${(planetData.temperature - 273.15).toFixed(0)}°C)`
    });
    this.planetInfoElements.set('temperature', tempBlade);

    const radiusBlade = this.planetInfoFolder.addBlade({
      view: 'text',
      label: '行星半径',
      parse: () => '',
      value: `${planetData.radius.toFixed(1)} 单位`
    });
    this.planetInfoElements.set('radius', radiusBlade);
  }

  public updateCameraInfo(
    cameraInfoEl: HTMLElement,
    cameraPosition: { x: number; y: number; z: number },
    zoomLevel: number
  ): void {
    cameraInfoEl.innerHTML = `
      <div style="color: #00d4ff; margin-bottom: 4px; font-weight: bold;">📷 相机状态</div>
      <div>缩放: ${zoomLevel.toFixed(2)}x</div>
      <div>X: ${cameraPosition.x.toFixed(2)}</div>
      <div>Y: ${cameraPosition.y.toFixed(2)}</div>
      <div>Z: ${cameraPosition.z.toFixed(2)}</div>
    `;
  }

  public showPlanetLabel(
    labelEl: HTMLElement,
    planet: PlanetData,
    screenX: number,
    screenY: number
  ): void {
    labelEl.innerHTML = `
      <div style="color: #00d4ff; font-weight: bold; margin-bottom: 2px;">${planet.name}</div>
      <div style="font-size: 11px; opacity: 0.8;">
        距离: ${planet.distance.toFixed(1)} | 周期: ${planet.orbitalPeriod}天
      </div>
    `;
    labelEl.style.display = 'block';
    labelEl.style.left = `${screenX + 15}px`;
    labelEl.style.top = `${screenY - 10}px`;
    gsap.to(labelEl, {
      opacity: 1,
      duration: 0.2,
      ease: 'power2.out'
    });
  }

  public hidePlanetLabel(labelEl: HTMLElement): void {
    gsap.to(labelEl, {
      opacity: 0,
      duration: 0.15,
      ease: 'power2.out',
      onComplete: () => {
        labelEl.style.display = 'none';
      }
    });
  }

  public showSatelliteLabel(
    labelEl: HTMLElement,
    deflectionAngle: number,
    inGravityField: boolean,
    screenX: number,
    screenY: number
  ): void {
    if (deflectionAngle > 0) {
      const fieldStatus = inGravityField ? '<span style="color:#ff6644;">● 引力场</span>' : '<span style="color:#88cc88;">○ 自由飞行</span>';
      labelEl.innerHTML = `
        ${fieldStatus}<br/>
        偏转: ${deflectionAngle.toFixed(1)}°
      `;
      labelEl.style.display = 'block';
      labelEl.style.left = `${screenX + 15}px`;
      labelEl.style.top = `${screenY - 20}px`;
    } else {
      this.hideSatelliteLabel(labelEl);
    }
  }

  public hideSatelliteLabel(labelEl: HTMLElement): void {
    labelEl.style.display = 'none';
  }
}
