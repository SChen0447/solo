import { KnowledgeNode, THEME_COLORS, THEME_NAMES } from './data';
import { InteractionManager } from './InteractionManager';

export class UIOverlay {
  private tooltip: HTMLElement;
  private tooltipTitle: HTMLElement;
  private tooltipDesc: HTMLElement;

  private infoPanel: HTMLElement;
  private panelClose: HTMLElement;
  private panelTitle: HTMLElement;
  private panelTheme: HTMLElement;
  private panelDescription: HTMLElement;
  private relatedList: HTMLElement;
  private panelSource: HTMLElement;

  private interactionManager: InteractionManager | null = null;
  private getConnectedNodeIds: ((id: string) => string[]) | null = null;
  private getNodeDataById: ((id: string) => KnowledgeNode | null) | null = null;

  constructor() {
    this.tooltip = document.getElementById('tooltip') as HTMLElement;
    this.tooltipTitle = this.tooltip.querySelector('.tooltip-title') as HTMLElement;
    this.tooltipDesc = this.tooltip.querySelector('.tooltip-desc') as HTMLElement;

    this.infoPanel = document.getElementById('info-panel') as HTMLElement;
    this.panelClose = this.infoPanel.querySelector('.panel-close') as HTMLElement;
    this.panelTitle = this.infoPanel.querySelector('.panel-title') as HTMLElement;
    this.panelTheme = this.infoPanel.querySelector('.panel-theme') as HTMLElement;
    this.panelDescription = this.infoPanel.querySelector('.panel-description') as HTMLElement;
    this.relatedList = this.infoPanel.querySelector('.related-list') as HTMLElement;
    this.panelSource = this.infoPanel.querySelector('.panel-source') as HTMLElement;

    this.panelClose.addEventListener('click', () => {
      this.hideInfoPanel();
      this.interactionManager?.clearSelection();
    });
  }

  public setInteractionManager(manager: InteractionManager): void {
    this.interactionManager = manager;
  }

  public setDataAccessors(
    getConnectedNodeIds: (id: string) => string[],
    getNodeDataById: (id: string) => KnowledgeNode | null
  ): void {
    this.getConnectedNodeIds = getConnectedNodeIds;
    this.getNodeDataById = getNodeDataById;
  }

  public showTooltip(node: KnowledgeNode, screenX: number, screenY: number): void {
    this.tooltipTitle.textContent = node.name;
    this.tooltipDesc.textContent = node.description;

    const offsetX = 15;
    const offsetY = 15;

    const tooltipWidth = this.tooltip.offsetWidth;
    const tooltipHeight = this.tooltip.offsetHeight;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let left = screenX + offsetX;
    let top = screenY + offsetY;

    if (left + tooltipWidth > windowWidth) {
      left = screenX - tooltipWidth - offsetX;
    }
    if (top + tooltipHeight > windowHeight) {
      top = screenY - tooltipHeight - offsetY;
    }

    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
    this.tooltip.classList.add('visible');
  }

  public hideTooltip(): void {
    this.tooltip.classList.remove('visible');
  }

  public showInfoPanel(node: KnowledgeNode): void {
    this.panelTitle.textContent = node.name;

    this.panelTheme.textContent = THEME_NAMES[node.theme];
    this.panelTheme.style.backgroundColor = THEME_COLORS[node.theme] + '30';
    this.panelTheme.style.color = THEME_COLORS[node.theme];
    this.panelTheme.style.border = `1px solid ${THEME_COLORS[node.theme]}50`;

    this.panelDescription.textContent = node.detailedDescription;

    this.relatedList.innerHTML = '';
    const connectedIds = this.getConnectedNodeIds?.(node.id) || [];
    for (const connectedId of connectedIds) {
      const connectedNode = this.getNodeDataById?.(connectedId);
      if (connectedNode) {
        const li = document.createElement('li');
        li.className = 'related-item';
        li.textContent = connectedNode.name;
        li.style.borderLeftColor = THEME_COLORS[connectedNode.theme];
        li.addEventListener('click', () => {
          this.interactionManager?.selectNodeById(connectedId);
        });
        this.relatedList.appendChild(li);
      }
    }

    this.panelSource.textContent = node.source;
    this.infoPanel.classList.add('visible');
  }

  public hideInfoPanel(): void {
    this.infoPanel.classList.remove('visible');
  }
}
