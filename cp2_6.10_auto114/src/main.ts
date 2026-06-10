import { EventCollector, type EventType, type CollectedEvent } from './eventCollector';
import { HeatmapRenderer } from './heatmapRenderer';
import { formatTimestamp } from './utils';

const EVENT_COLORS: Record<EventType, string> = {
  click: '#d63031',
  mousemove: '#fdcb6e',
  scroll: '#00b894'
};

const EVENT_LABELS: Record<EventType, string> = {
  click: '点击',
  mousemove: '移动',
  scroll: '滚动'
};

function createControlPanel(): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'control-panel';
  panel.innerHTML = `
    <div class="panel-header">
      <h2>控制面板</h2>
    </div>
    <div class="panel-section">
      <label class="section-title">事件类型</label>
      <div class="event-options">
        <label class="event-option">
          <span class="color-box" style="background:${EVENT_COLORS.click}"></span>
          <input type="checkbox" id="event-click" value="click" checked>
          <span>Click 点击</span>
        </label>
        <label class="event-option">
          <span class="color-box" style="background:${EVENT_COLORS.mousemove}"></span>
          <input type="checkbox" id="event-mousemove" value="mousemove" checked>
          <span>MouseMove 移动</span>
        </label>
        <label class="event-option">
          <span class="color-box" style="background:${EVENT_COLORS.scroll}"></span>
          <input type="checkbox" id="event-scroll" value="scroll" checked>
          <span>Scroll 滚动</span>
        </label>
      </div>
    </div>
    <div class="panel-section">
      <label class="section-title" for="opacity-slider">
        透明度 <span id="opacity-value">60%</span>
      </label>
      <input type="range" id="opacity-slider" min="30" max="100" value="60" class="slider">
    </div>
    <div class="panel-section">
      <label class="section-title" for="radius-slider">
        点半径 <span id="radius-value">40px</span>
      </label>
      <input type="range" id="radius-slider" min="20" max="80" value="40" class="slider">
    </div>
    <div class="panel-section buttons">
      <button id="export-btn" class="action-btn">导出 JSON</button>
      <button id="reset-btn" class="action-btn secondary">重置数据</button>
    </div>
    <div class="panel-section stats">
      <div class="stat-item">
        <span class="stat-label">总事件数</span>
        <span class="stat-value" id="stat-count">0</span>
      </div>
    </div>
  `;
  return panel;
}

function createMockPage(): HTMLElement {
  const mockPage = document.createElement('div');
  mockPage.className = 'mock-page';
  mockPage.innerHTML = `
    <div class="mock-page-header">
      <h3>📊 模拟仪表盘 - 交互测试区域</h3>
    </div>
    <div class="scroll-list" id="scroll-list">
      ${Array.from({ length: 100 }, (_, i) => `
        <div class="list-row ${i % 2 === 0 ? 'even' : 'odd'}">
          <span class="row-index">${i + 1}</span>
          <span class="row-text">数据行-${i + 1}</span>
          <span class="row-status">●</span>
        </div>
      `).join('')}
    </div>
    <div class="button-group">
      ${['A', 'B', 'C', 'D', 'E'].map((letter) => `
        <button class="mock-btn" data-action="${letter}">操作${letter}</button>
      `).join('')}
    </div>
    <div class="hover-area" id="hover-area">
      <span class="hover-text">🖱️ 鼠标悬停区域<br><small>移动鼠标查看热力图效果</small></span>
    </div>
  `;
  return mockPage;
}

function createHeatmapCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.className = 'heatmap-canvas';
  return canvas;
}

function createLogPanel(): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'log-panel';
  panel.innerHTML = `
    <div class="log-header" id="log-toggle">
      <span>📋 事件日志 (最近20条)</span>
      <span class="toggle-icon" id="log-icon">▼</span>
    </div>
    <div class="log-content" id="log-content">
      <table class="log-table">
        <thead>
          <tr>
            <th>类型</th>
            <th>坐标</th>
            <th>目标元素</th>
            <th>时间</th>
          </tr>
        </thead>
        <tbody id="log-body">
        </tbody>
      </table>
    </div>
  `;
  return panel;
}

function initApp(): void {
  const app = document.getElementById('app')!;
  app.innerHTML = '';

  const layout = document.createElement('div');
  layout.className = 'app-layout';

  const controlPanel = createControlPanel();
  const mainArea = document.createElement('div');
  mainArea.className = 'main-area';

  const viewport = document.createElement('div');
  viewport.className = 'viewport';
  viewport.style.position = 'relative';

  const mockPage = createMockPage();
  const heatmapCanvas = createHeatmapCanvas();
  const logPanel = createLogPanel();

  viewport.appendChild(mockPage);
  viewport.appendChild(heatmapCanvas);
  mainArea.appendChild(viewport);
  mainArea.appendChild(logPanel);
  layout.appendChild(controlPanel);
  layout.appendChild(mainArea);
  app.appendChild(layout);

  const scrollList = mockPage.querySelector('.scroll-list') as HTMLElement;

  const eventCollector = new EventCollector({
    targetElement: mockPage,
    enabledEvents: ['click', 'mousemove', 'scroll'],
    maxQueueSize: 5000
  });

  const getScrollOffset = () => ({
    top: scrollList?.scrollTop ?? 0,
    left: scrollList?.scrollLeft ?? 0
  });

  const heatmapRenderer = new HeatmapRenderer(
    heatmapCanvas,
    () => eventCollector.getEvents(),
    getScrollOffset,
    { opacity: 0.6, radius: 40 }
  );

  const logBody = document.getElementById('log-body')!;
  const statCount = document.getElementById('stat-count')!;
  let lastRenderedEventId: string | null = null;

  function updateLog(): void {
    const recentEvents = eventCollector.getRecentEvents(20);
    statCount.textContent = String(eventCollector.getEventCount());

    if (recentEvents.length === 0 || recentEvents[recentEvents.length - 1].id === lastRenderedEventId) {
      return;
    }

    logBody.innerHTML = recentEvents.map((event, idx) => {
      const shortSelector = event.selector.length > 40
        ? event.selector.slice(-40)
        : event.selector;
      return `
        <tr class="log-row ${idx === recentEvents.length - 1 ? 'fade-in' : ''}" style="background:${idx % 2 === 0 ? '#636e72' : '#4a4a4a'}">
          <td><span class="event-tag" style="background:${EVENT_COLORS[event.type]}">${EVENT_LABELS[event.type]}</span></td>
          <td>(${Math.round(event.x)}, ${Math.round(event.y)})</td>
          <td class="selector-cell" title="${event.selector}">${shortSelector}</td>
          <td>${formatTimestamp(event.timestamp)}</td>
        </tr>
      `;
    }).join('');

    lastRenderedEventId = recentEvents[recentEvents.length - 1].id;
  }

  heatmapRenderer.startRenderLoop(100);
  setInterval(updateLog, 200);

  const opacitySlider = document.getElementById('opacity-slider') as HTMLInputElement;
  const opacityValue = document.getElementById('opacity-value')!;
  opacitySlider.addEventListener('input', () => {
    const val = Number(opacitySlider.value);
    opacityValue.textContent = `${val}%`;
    heatmapRenderer.setOpacity(val / 100);
  });

  const radiusSlider = document.getElementById('radius-slider') as HTMLInputElement;
  const radiusValue = document.getElementById('radius-value')!;
  radiusSlider.addEventListener('input', () => {
    const val = Number(radiusSlider.value);
    radiusValue.textContent = `${val}px`;
    heatmapRenderer.setRadius(val);
  });

  (['click', 'mousemove', 'scroll'] as EventType[]).forEach((type) => {
    const checkbox = document.getElementById(`event-${type}`) as HTMLInputElement;
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        eventCollector.enableEvent(type);
      } else {
        eventCollector.disableEvent(type);
      }
    });
  });

  document.getElementById('export-btn')!.addEventListener('click', () => {
    const events = eventCollector.getEvents();
    const dataStr = JSON.stringify(events, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `heatmap-events-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('reset-btn')!.addEventListener('click', () => {
    eventCollector.clearEvents();
    heatmapRenderer.clear();
    logBody.innerHTML = '';
    lastRenderedEventId = null;
    statCount.textContent = '0';
  });

  const logToggle = document.getElementById('log-toggle')!;
  const logContent = document.getElementById('log-content')!;
  const logIcon = document.getElementById('log-icon')!;
  let logExpanded = true;

  logToggle.addEventListener('click', () => {
    logExpanded = !logExpanded;
    logContent.style.display = logExpanded ? 'block' : 'none';
    logIcon.textContent = logExpanded ? '▼' : '▲';
  });

  function handleResize(): void {
    if (window.innerWidth < 768) {
      layout.classList.add('mobile-layout');
    } else {
      layout.classList.remove('mobile-layout');
    }
  }
  handleResize();
  window.addEventListener('resize', handleResize);
}

document.addEventListener('DOMContentLoaded', initApp);
