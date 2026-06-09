export interface UIState {
  nodeCount: number;
  totalLength: number;
  pulseEventCount: number;
}

export type ResetCallback = () => void;

export class UIManager {
  private container: HTMLElement;
  private infoPanel: HTMLDivElement;
  private nodeCountEl: HTMLSpanElement;
  private totalLengthEl: HTMLSpanElement;
  private pulseCountEl: HTMLSpanElement;
  private resetBtn: HTMLButtonElement;
  private onReset: ResetCallback;

  constructor(containerId: string, onReset: ResetCallback) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id ${containerId} not found`);
    }
    this.container = container;
    this.onReset = onReset;

    this.infoPanel = document.createElement('div');
    this.infoPanel.style.cssText = `
      position: fixed;
      left: 20px;
      bottom: 20px;
      padding: 16px 20px;
      background: rgba(17, 17, 34, 0.7);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      border-radius: 12px;
      color: #ddeeff;
      font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      font-size: 13px;
      line-height: 1.8;
      z-index: 10;
      min-width: 180px;
      border: 1px solid rgba(136, 170, 255, 0.15);
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
    `;

    const titleEl = document.createElement('div');
    titleEl.textContent = '✨ 星尘织网者';
    titleEl.style.cssText = `
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #bb88ff;
      letter-spacing: 1px;
    `;
    this.infoPanel.appendChild(titleEl);

    const nodeRow = document.createElement('div');
    nodeRow.innerHTML = '节点总数：<span style="color:#88ffaa;font-weight:600">0</span>';
    this.nodeCountEl = nodeRow.querySelector('span') as HTMLSpanElement;
    this.infoPanel.appendChild(nodeRow);

    const lengthRow = document.createElement('div');
    lengthRow.innerHTML = '蛛丝长度：<span style="color:#88aaff;font-weight:600">0</span> px';
    this.totalLengthEl = lengthRow.querySelector('span') as HTMLSpanElement;
    this.infoPanel.appendChild(lengthRow);

    const pulseRow = document.createElement('div');
    pulseRow.innerHTML = '脉冲事件：<span style="color:#ff88aa;font-weight:600">0</span>';
    this.pulseCountEl = pulseRow.querySelector('span') as HTMLSpanElement;
    this.infoPanel.appendChild(pulseRow);

    this.container.appendChild(this.infoPanel);

    this.resetBtn = document.createElement('button');
    this.resetBtn.innerHTML = '↺';
    this.resetBtn.title = '重置蛛网';
    this.resetBtn.style.cssText = `
      position: fixed;
      right: 20px;
      bottom: 20px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: #443366;
      color: #fff;
      border: none;
      font-size: 22px;
      cursor: pointer;
      z-index: 10;
      transition: background 0.2s ease, transform 0.15s ease;
      box-shadow: 0 4px 16px rgba(68, 51, 102, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    this.resetBtn.addEventListener('mouseenter', () => {
      this.resetBtn.style.background = '#665588';
    });
    this.resetBtn.addEventListener('mouseleave', () => {
      this.resetBtn.style.background = '#443366';
    });
    this.resetBtn.addEventListener('mousedown', () => {
      this.resetBtn.style.transform = 'scale(0.92)';
    });
    this.resetBtn.addEventListener('mouseup', () => {
      this.resetBtn.style.transform = 'scale(1)';
    });
    this.resetBtn.addEventListener('click', () => {
      this.onReset();
    });

    this.container.appendChild(this.resetBtn);
  }

  update(state: UIState): void {
    this.nodeCountEl.textContent = String(state.nodeCount);
    this.totalLengthEl.textContent = String(Math.round(state.totalLength));
    this.pulseCountEl.textContent = String(state.pulseEventCount);
  }

  destroy(): void {
    if (this.infoPanel.parentNode) {
      this.infoPanel.parentNode.removeChild(this.infoPanel);
    }
    if (this.resetBtn.parentNode) {
      this.resetBtn.parentNode.removeChild(this.resetBtn);
    }
  }
}
