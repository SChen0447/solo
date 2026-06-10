import { GraphRenderer } from './renderer';
import {
  getImageryData,
  filterByEmotion,
  getPoemsByImagery,
  searchImagery,
  getEmotionLabel,
  type ImageryNode,
  type EmotionCategory,
  type Poem
} from './data';

class App {
  private renderer!: GraphRenderer;
  private searchInput!: HTMLInputElement;
  private emotionFilter!: HTMLSelectElement;
  private sidebar!: HTMLElement;
  private sidebarTitle!: HTMLElement;
  private sidebarContent!: HTMLElement;
  private sidebarClose!: HTMLButtonElement;
  private tooltip!: HTMLElement;
  private svg!: SVGElement;

  private currentEmotionFilter: EmotionCategory | 'all' = 'all';
  private currentSearchQuery = '';
  private searchDebounceTimer: number | null = null;

  constructor() {
    this.initDOMReferences();
    this.initRenderer();
    this.bindEvents();
    this.renderInitialData();
  }

  private initDOMReferences(): void {
    this.searchInput = document.getElementById('searchInput') as HTMLInputElement;
    this.emotionFilter = document.getElementById('emotionFilter') as HTMLSelectElement;
    this.sidebar = document.getElementById('sidebar') as HTMLElement;
    this.sidebarTitle = document.getElementById('sidebarTitle') as HTMLElement;
    this.sidebarContent = document.getElementById('sidebarContent') as HTMLElement;
    this.sidebarClose = document.getElementById('sidebarClose') as HTMLButtonElement;
    this.tooltip = document.getElementById('tooltip') as HTMLElement;
    this.svg = document.getElementById('graph') as unknown as SVGElement;
  }

  private initRenderer(): void {
    this.renderer = new GraphRenderer({
      container: this.svg,
      tooltipElement: this.tooltip,
      onNodeClick: (node) => this.handleNodeClick(node),
      onNodeHover: (node) => this.handleNodeHover(node)
    });

    this.renderer.startTick();
  }

  private bindEvents(): void {
    this.searchInput.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      this.handleSearch(target.value);
    });

    this.emotionFilter.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      this.handleFilterChange(target.value as EmotionCategory | 'all');
    });

    this.sidebarClose.addEventListener('click', () => {
      this.closeSidebar();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeSidebar();
      }
      if (e.key === '/' && document.activeElement !== this.searchInput) {
        e.preventDefault();
        this.searchInput.focus();
      }
    });
  }

  private renderInitialData(): void {
    const data = getImageryData();
    this.renderer.render(data, true);
  }

  private handleSearch(query: string): void {
    this.currentSearchQuery = query;

    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    this.searchDebounceTimer = window.setTimeout(() => {
      const matches = searchImagery(query);
      const matchedIds = matches.map((m) => m.id);
      this.renderer.highlightSearch(matchedIds);
    }, 100);
  }

  private handleFilterChange(emotion: EmotionCategory | 'all'): void {
    this.currentEmotionFilter = emotion;

    const allData = getImageryData();
    const filteredData = filterByEmotion(allData, emotion);

    this.renderer.render(filteredData, false);
  }

  private handleNodeClick(node: ImageryNode): void {
    this.openSidebar(node);
  }

  private handleNodeHover(_node: ImageryNode | null): void {
  }

  private openSidebar(node: ImageryNode): void {
    this.sidebarTitle.textContent = `${node.name} · ${getEmotionLabel(node.emotion)}`;

    const poems = getPoemsByImagery(node.id);
    this.sidebarContent.innerHTML = this.renderPoems(node, poems);

    this.sidebar.classList.add('open');
  }

  private closeSidebar(): void {
    this.sidebar.classList.remove('open');
  }

  private renderPoems(node: ImageryNode, poems: Poem[]): string {
    const infoHtml = `
      <div class="poem-card" style="border-left-color: ${this.getEmotionColor(node.emotion)};">
        <div class="poem-title">意象信息</div>
        <div class="poem-content" style="font-size: 13px;">
          <div>名称：${node.name}</div>
          <div>出现频率：${node.frequency} 次</div>
          <div>情感分类：${getEmotionLabel(node.emotion)}</div>
        </div>
      </div>
    `;

    if (poems.length === 0) {
      return infoHtml + `
        <div class="empty-sidebar" style="height: auto; padding: 40px 20px;">
          <div class="empty-sidebar-icon" style="font-size: 36px;">📜</div>
          <div class="empty-sidebar-text">暂无相关诗词数据</div>
        </div>
      `;
    }

    const poemsHtml = poems
      .map(
        (poem) => `
          <div class="poem-card" style="border-left-color: ${this.getEmotionColor(node.emotion)};">
            <div class="poem-title">${poem.title}</div>
            <div class="poem-author">${poem.dynasty} · ${poem.author}</div>
            <div class="poem-content">${this.escapeHtml(poem.content)}</div>
          </div>
        `
      )
      .join('');

    return infoHtml + poemsHtml;
  }

  private getEmotionColor(emotion: EmotionCategory): string {
    switch (emotion) {
      case 'positive':
        return '#e74c3c';
      case 'negative':
        return '#8e44ad';
      default:
        return '#bdc3c7';
    }
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
