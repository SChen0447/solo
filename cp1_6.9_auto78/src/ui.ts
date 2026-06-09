export class UI {
  private fpsElement: HTMLElement;
  private datapointCountElement: HTMLElement;
  private legendPanel: HTMLElement;
  private legendToggle: HTMLElement;
  private loadingElement: HTMLElement;
  private isCollapsed: boolean = false;

  constructor() {
    this.fpsElement = document.getElementById('fps-value')!;
    this.datapointCountElement = document.getElementById('datapoint-count')!;
    this.legendPanel = document.getElementById('legend-panel')!;
    this.legendToggle = document.getElementById('legend-toggle')!;
    this.loadingElement = document.getElementById('loading')!;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.legendToggle.addEventListener('click', () => {
      this.toggleLegend();
    });
  }

  private toggleLegend(): void {
    this.isCollapsed = !this.isCollapsed;
    if (this.isCollapsed) {
      this.legendPanel.classList.add('collapsed');
      this.legendToggle.textContent = '+';
    } else {
      this.legendPanel.classList.remove('collapsed');
      this.legendToggle.textContent = '×';
    }
  }

  public updateFPS(fps: number): void {
    this.fpsElement.textContent = Math.round(fps).toString();
  }

  public updateDatapointCount(count: number): void {
    this.datapointCountElement.textContent = count.toString();
  }

  public hideLoading(): void {
    setTimeout(() => {
      this.loadingElement.classList.add('hidden');
      setTimeout(() => {
        this.loadingElement.style.display = 'none';
      }, 800);
    }, 500);
  }
}
