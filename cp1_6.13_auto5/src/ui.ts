export interface UIHandlers {
  onReset: () => void;
  onUndo: () => void;
  onExport: () => void;
}

export interface StatsData {
  nodeCount: number;
  connectionCount: number;
  zoomPercent: number;
}

let statElements: {
  nodes: HTMLElement;
  connections: HTMLElement;
  zoom: HTMLElement;
} | null = null;

let prevStats: StatsData = {
  nodeCount: -1,
  connectionCount: -1,
  zoomPercent: -1,
};

let toolbarEl: HTMLElement | null = null;
let menuToggleEl: HTMLElement | null = null;
let toolbarVisible = false;

export function initUI(handlers: UIHandlers): void {
  const btnReset = document.getElementById('btn-reset');
  const btnUndo = document.getElementById('btn-undo');
  const btnExport = document.getElementById('btn-export');

  if (btnReset) {
    btnReset.addEventListener('click', handlers.onReset);
  }
  if (btnUndo) {
    btnUndo.addEventListener('click', handlers.onUndo);
  }
  if (btnExport) {
    btnExport.addEventListener('click', handlers.onExport);
  }

  const statNodes = document.getElementById('stat-nodes');
  const statConnections = document.getElementById('stat-connections');
  const statZoom = document.getElementById('stat-zoom');

  if (statNodes && statConnections && statZoom) {
    statElements = {
      nodes: statNodes,
      connections: statConnections,
      zoom: statZoom,
    };
  }

  toolbarEl = document.getElementById('toolbar');
  menuToggleEl = document.getElementById('menu-toggle');

  const toolbar = toolbarEl;
  const menuToggle = menuToggleEl;

  if (menuToggle && toolbar) {
    menuToggle.addEventListener('click', () => {
      toolbarVisible = !toolbarVisible;
      if (toolbarVisible) {
        toolbar.classList.add('visible');
      } else {
        toolbar.classList.remove('visible');
      }
    });
  }

  if (window.innerWidth > 768 && toolbar) {
    toolbar.classList.add('visible');
  }
}

export function updateStats(stats: StatsData): void {
  if (!statElements) return;

  if (stats.nodeCount !== prevStats.nodeCount) {
    statElements.nodes.textContent = String(stats.nodeCount);
    animateStatValue(statElements.nodes);
    prevStats.nodeCount = stats.nodeCount;
  }

  if (stats.connectionCount !== prevStats.connectionCount) {
    statElements.connections.textContent = String(stats.connectionCount);
    animateStatValue(statElements.connections);
    prevStats.connectionCount = stats.connectionCount;
  }

  const zoomStr = `${Math.round(stats.zoomPercent)}%`;
  if (stats.zoomPercent !== prevStats.zoomPercent) {
    statElements.zoom.textContent = zoomStr;
    animateStatValue(statElements.zoom);
    prevStats.zoomPercent = stats.zoomPercent;
  }
}

function animateStatValue(el: HTMLElement): void {
  el.classList.remove('animate');
  void el.offsetWidth;
  el.classList.add('animate');
}

export function hideLoading(): void {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.add('hidden');
  }
}

export function isMobileLayout(): boolean {
  return window.innerWidth <= 768;
}

export function closeMobileToolbar(): void {
  if (toolbarEl && isMobileLayout()) {
    toolbarVisible = false;
    toolbarEl.classList.remove('visible');
  }
}
