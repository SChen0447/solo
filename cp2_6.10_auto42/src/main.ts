import {
  addDiary,
  updateDiary,
  deleteDiary,
  getDiaries,
  getDiaryById,
  getDiaryByHash,
  getMoodTrends,
  getAvailableYears,
  getStats,
  generateShareHash
} from './diaryStore';
import type { Diary, DiaryFormData } from './diaryStore';
import {
  renderTimeline,
  renderChart,
  renderShareView,
  renderShareNotFound,
  renderDiaryForm
} from './uiRenderer';
import './style.css';

const app = document.getElementById('app') as HTMLElement;

const state = {
  expandedIds: new Set<string>(),
  filterYear: undefined as number | undefined,
  filterMonth: undefined as number | undefined,
  editingId: null as string | null
};

function buildLayout(): {
  layout: HTMLElement;
  chartCanvas: HTMLCanvasElement;
  timelineContainer: HTMLElement;
  statsContainer: HTMLElement;
  filterContainer: HTMLElement;
  formContainer: HTMLElement;
} {
  app.innerHTML = `
    <div class="app-layout">
      <aside class="chart-section">
        <div class="app-header">
          <h1>心情时间轴</h1>
          <p class="app-subtitle">记录每一天的心情故事</p>
        </div>
        <div class="stats-row"></div>
        <div class="chart-wrapper">
          <canvas class="mood-chart"></canvas>
        </div>
        <div class="chart-legend">
          <span>近30天心情趋势</span>
        </div>
      </aside>
      <main class="timeline-section">
        <div class="timeline-header">
          <div class="filter-bar"></div>
          <button class="add-btn">+ 新增日记</button>
        </div>
        <div class="timeline-container"></div>
      </main>
      <div class="form-container"></div>
    </div>
  `;

  return {
    layout: app.querySelector('.app-layout') as HTMLElement,
    chartCanvas: app.querySelector('.mood-chart') as HTMLCanvasElement,
    timelineContainer: app.querySelector('.timeline-container') as HTMLElement,
    statsContainer: app.querySelector('.stats-row') as HTMLElement,
    filterContainer: app.querySelector('.filter-bar') as HTMLElement,
    formContainer: app.querySelector('.form-container') as HTMLElement
  };
}

function renderStats(container: HTMLElement): void {
  const stats = getStats();
  container.innerHTML = `
    <div class="stat-card">
      <span class="stat-value">${stats.total}</span>
      <span class="stat-label">日记总数</span>
    </div>
    <div class="stat-card">
      <span class="stat-value">${stats.avgStars}</span>
      <span class="stat-label">平均满意度</span>
    </div>
  `;
}

function renderFilter(container: HTMLElement): void {
  const years = getAvailableYears();
  const currentYear = new Date().getFullYear();
  const allYears = years.length > 0 ? years : [currentYear];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  container.innerHTML = `
    <select class="filter-select" id="year-filter">
      <option value="">全部年份</option>
      ${allYears.map(y => `<option value="${y}" ${state.filterYear === y ? 'selected' : ''}>${y}年</option>`).join('')}
    </select>
    <select class="filter-select" id="month-filter">
      <option value="">全部月份</option>
      ${months.map(m => `<option value="${m}" ${state.filterMonth === m ? 'selected' : ''}>${m}月</option>`).join('')}
    </select>
  `;

  const yearFilter = container.querySelector('#year-filter') as HTMLSelectElement;
  const monthFilter = container.querySelector('#month-filter') as HTMLSelectElement;

  yearFilter.addEventListener('change', () => {
    state.filterYear = yearFilter.value ? parseInt(yearFilter.value, 10) : undefined;
    refreshTimeline();
  });

  monthFilter.addEventListener('change', () => {
    state.filterMonth = monthFilter.value ? parseInt(monthFilter.value, 10) : undefined;
    refreshTimeline();
  });
}

function refreshTimeline(): void {
  const timelineContainer = app.querySelector('.timeline-container');
  const filterContainer = app.querySelector('.filter-bar') as HTMLElement;
  const statsContainer = app.querySelector('.stats-row') as HTMLElement;
  if (!timelineContainer) return;

  const diaries = getDiaries(state.filterYear, state.filterMonth);

  renderFilter(filterContainer);
  renderStats(statsContainer);
  renderTimeline(timelineContainer as HTMLElement, diaries, {
    onEdit: (id) => openEditForm(id),
    onDelete: (id) => handleDelete(id),
    onShare: (id) => handleShare(id),
    onToggleExpand: (id) => {
      if (state.expandedIds.has(id)) {
        state.expandedIds.delete(id);
      } else {
        state.expandedIds.add(id);
      }
      refreshTimeline();
    },
    expandedIds: state.expandedIds
  });
}

function refreshChart(): void {
  const canvas = app.querySelector('.mood-chart') as HTMLCanvasElement;
  if (!canvas) {
    const trends = getMoodTrends(30);
    renderChart(canvas, trends);
  }
}

function openAddForm(): void {
  const formContainer = app.querySelector('.form-container') as HTMLElement;
  state.editingId = null;
  renderDiaryForm(formContainer, {
    onSubmit: (data: DiaryFormData) => {
      addDiary(data);
      closeForm();
      refreshTimeline();
      refreshChart();
    },
    onCancel: closeForm
  });
}

function openEditForm(id: string): void {
  const formContainer = app.querySelector('.form-container') as HTMLElement;
  const diary = getDiaryById(id);
  if (!diary) return;
  state.editingId = id;
  renderDiaryForm(formContainer, {
    onSubmit: (data: DiaryFormData) => {
      updateDiary(id, data);
      closeForm();
      refreshTimeline();
      refreshChart();
    },
    onCancel: closeForm
  }, diary);
}

function closeForm(): void {
  const formContainer = app.querySelector('.form-container') as HTMLElement;
  formContainer.innerHTML = '';
  state.editingId = null;
}

function handleDelete(id: string): void {
  if (confirm('确定要删除这篇日记吗？')) {
    deleteDiary(id);
    state.expandedIds.delete(id);
    refreshTimeline();
    refreshChart();
  }
}

function handleShare(id: string): void {
  const hash = generateShareHash(id);
  const url = `${window.location.origin}${window.location.pathname}#/share/${hash}`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      showToast('分享链接已复制到剪贴板');
    }).catch(() => {
      prompt('请手动复制链接:', url);
    });
  } else {
    prompt('请复制分享链接:', url);
  }
}

function showToast(message: string): void {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

function renderHome(): void {
  const elements = buildLayout();
  renderStats(elements.statsContainer);
  renderFilter(elements.filterContainer);

  const addBtn = app.querySelector('.add-btn');
  addBtn?.addEventListener('click', openAddForm);

  const diaries = getDiaries(state.filterYear, state.filterMonth);
  renderTimeline(elements.timelineContainer, diaries, {
    onEdit: (id) => openEditForm(id),
    onDelete: (id) => handleDelete(id),
    onShare: (id) => handleShare(id),
    onToggleExpand: (id) => {
      if (state.expandedIds.has(id)) {
        state.expandedIds.delete(id);
      } else {
        state.expandedIds.add(id);
      }
      refreshTimeline();
    },
    expandedIds: state.expandedIds
  });

  const trends = getMoodTrends(30);
  renderChart(elements.chartCanvas, trends);

  let resizeTimer: number | null = null;
  window.addEventListener('resize', () => {
    if (resizeTimer && clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      refreshChart();
    }, 200);
  });
}

function renderShare(hash: string): void {
  app.innerHTML = '';
  const diary = getDiaryByHash(hash);
  if (diary) {
    renderShareView(app, diary);
  } else {
    renderShareNotFound(app);
  }
}

function route(): void {
  const hash = window.location.hash;
  const shareMatch = hash.match(/^#\/share\/(.+)$/);
  if (shareMatch) {
    renderShare(shareMatch[1]);
  } else {
    renderHome();
  }
}

window.addEventListener('hashchange', route);
route();
