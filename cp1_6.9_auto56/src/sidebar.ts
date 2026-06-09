import type { CulturalWork } from './data';

export type WorkSelectCallback = (civilizationId: string) => void;

export class Sidebar {
  private sidebar: HTMLElement;
  private toggleBtn: HTMLElement;
  private content: HTMLElement;
  private works: CulturalWork[];
  private currentYear: number = 1000;
  private callback: WorkSelectCallback | null = null;

  constructor(works: CulturalWork[]) {
    this.works = works;
    this.sidebar = document.getElementById('sidebar') as HTMLElement;
    this.toggleBtn = document.getElementById('sidebar-toggle') as HTMLElement;
    this.content = document.getElementById('sidebar-content') as HTMLElement;

    this.initToggle();
    this.render();
  }

  private initToggle(): void {
    this.toggleBtn.addEventListener('click', () => {
      this.sidebar.classList.toggle('collapsed');
      const isCollapsed = this.sidebar.classList.contains('collapsed');
      this.toggleBtn.textContent = isCollapsed ? '文化' : '收起';
    });
  }

  public updateForYear(year: number): void {
    this.currentYear = year;
    this.render();
  }

  private getCategoryLabel(category: CulturalWork['category']): string {
    const labels: Record<CulturalWork['category'], string> = {
      literature: '文学',
      architecture: '建筑',
      painting: '绘画'
    };
    return labels[category];
  }

  private render(): void {
    const relevantWorks = this.works.filter(
      (w) => Math.abs(w.year - this.currentYear) <= 500
    );

    const centuryGroups = new Map<number, CulturalWork[]>();
    relevantWorks.forEach((work) => {
      const key = work.century;
      if (!centuryGroups.has(key)) {
        centuryGroups.set(key, []);
      }
      centuryGroups.get(key)!.push(work);
    });

    const sortedCenturies = Array.from(centuryGroups.keys()).sort((a, b) => b - a);

    this.content.innerHTML = '';

    sortedCenturies.forEach((century) => {
      const group = document.createElement('div');
      group.className = 'century-group';

      const centuryLabel = century > 0 ? `${century}世纪` : `公元前${-century}世纪`;
      const title = document.createElement('div');
      title.className = 'century-title';
      title.textContent = centuryLabel;
      group.appendChild(title);

      centuryGroups.get(century)!.forEach((work) => {
        const item = document.createElement('div');
        item.className = 'work-item';
        item.dataset.civId = work.civilizationId;

        const yearLabel = work.year >= 0
          ? `公元${work.year}年`
          : `公元前${-work.year}年`;

        item.innerHTML = `
          <div class="work-name">
            <span class="work-category">${this.getCategoryLabel(work.category)}</span>
            ${work.name}
          </div>
          <div class="work-meta">${work.creator} · ${yearLabel}</div>
          <div class="work-desc">${work.description}</div>
        `;

        item.addEventListener('click', () => {
          if (this.callback) {
            this.callback(work.civilizationId);
          }
        });

        group.appendChild(item);
      });

      this.content.appendChild(group);
    });

    if (relevantWorks.length === 0) {
      this.content.innerHTML = '<div style="padding: 20px; text-align: center; color: rgba(212,175,55,0.6); font-size: 14px;">暂无对应年代文化作品</div>';
    }
  }

  public onWorkSelect(callback: WorkSelectCallback): void {
    this.callback = callback;
  }
}
