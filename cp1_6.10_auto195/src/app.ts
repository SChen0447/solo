import { getState, subscribe, GlobalState } from './main';
import { Sidebar } from './sidebar';
import { MapView } from './map';

export class App {
  private container: HTMLElement | null = null;
  private sidebar: Sidebar | null = null;
  private mapView: MapView | null = null;
  private sidebarEl: HTMLElement | null = null;
  private mapContainer: HTMLElement | null = null;
  private animationFrameId: number | null = null;
  private isMobile: boolean = false;

  mount(): void {
    this.container = document.getElementById('app');
    if (!this.container) return;

    this.createLayout();
    this.sidebar = new Sidebar(this.sidebarEl!);
    this.mapView = new MapView(this.mapContainer!);

    subscribe(() => {
      this.sidebar?.update();
    });

    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());

    this.playInitialAnimation();
  }

  private createLayout(): void {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `
      display: flex;
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
    `;

    this.sidebarEl = document.createElement('div');
    this.sidebarEl.style.cssText = `
      width: 35%;
      height: 100%;
      background: linear-gradient(180deg, #1a2744 0%, #24344c 100%);
      border-right: 1px solid rgba(0, 210, 255, 0.2);
      overflow-y: auto;
      flex-shrink: 0;
      transform: translateX(-100%);
      transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 10;
    `;

    this.mapContainer = document.createElement('div');
    this.mapContainer.style.cssText = `
      flex: 1;
      height: 100%;
      position: relative;
      opacity: 0;
      transition: opacity 0.8s ease-out;
    `;

    wrapper.appendChild(this.sidebarEl);
    wrapper.appendChild(this.mapContainer);
    this.container!.appendChild(wrapper);
  }

  private handleResize(): void {
    const width = window.innerWidth;
    this.isMobile = width < 700;

    if (this.isMobile) {
      this.sidebarEl!.style.cssText = `
        width: 100%;
        height: 80px;
        background: linear-gradient(180deg, #1a2744 0%, #24344c 100%);
        border-bottom: 1px solid rgba(0, 210, 255, 0.2);
        overflow-x: auto;
        overflow-y: hidden;
        flex-shrink: 0;
        z-index: 10;
      `;
      this.mapContainer!.style.cssText = `
        width: 100%;
        height: calc(100% - 80px);
        position: relative;
      `;
      const wrapper = this.container!.firstElementChild as HTMLElement;
      if (wrapper) {
        wrapper.style.flexDirection = 'column';
      }
      this.sidebar?.setMobileMode(true);
    } else {
      this.sidebarEl!.style.cssText = `
        width: 35%;
        height: 100%;
        background: linear-gradient(180deg, #1a2744 0%, #24344c 100%);
        border-right: 1px solid rgba(0, 210, 255, 0.2);
        overflow-y: auto;
        flex-shrink: 0;
        z-index: 10;
      `;
      this.mapContainer!.style.cssText = `
        flex: 1;
        height: 100%;
        position: relative;
      `;
      const wrapper = this.container!.firstElementChild as HTMLElement;
      if (wrapper) {
        wrapper.style.flexDirection = 'row';
      }
      this.sidebar?.setMobileMode(false);
    }

    this.mapView?.handleResize();
  }

  private playInitialAnimation(): void {
    requestAnimationFrame(() => {
      if (this.sidebarEl) {
        this.sidebarEl.style.transform = 'translateX(0)';
      }
    });

    setTimeout(() => {
      if (this.mapContainer) {
        this.mapContainer.style.opacity = '1';
      }
    }, 300);

    setTimeout(() => {
      this.sidebar?.playCardsAnimation();
    }, 800);

    setTimeout(() => {
      this.mapView?.playMarkersAnimation();
    }, 1400);
  }

  startAnimationLoop(): void {
    const animate = () => {
      this.mapView?.render();
      this.animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  getState(): GlobalState {
    return getState();
  }

  destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
