import { AlchemySystem, ELEMENTS, SUBSTANCES, ElementType, LogEntry } from './AlchemySystem';
import { GameEngine } from './GameEngine';

function main(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
  const explodeBtn = document.getElementById('explode-btn') as HTMLButtonElement;
  const toggleLogBtn = document.getElementById('toggle-log-btn') as HTMLButtonElement;
  const logList = document.getElementById('log-list') as HTMLUListElement;
  const logContent = document.querySelector('.log-content') as HTMLDivElement;
  const fusionCountValue = document.getElementById('fusion-count-value') as HTMLSpanElement;
  const statusDots = document.querySelectorAll('.status-dot') as NodeListOf<HTMLDivElement>;
  const elementSlots = document.querySelectorAll('.element-slot') as NodeListOf<HTMLDivElement>;

  const alchemy = new AlchemySystem();
  const engine = new GameEngine(canvas, alchemy);

  let isLogCollapsed = false;
  let draggedElement: ElementType | null = null;

  alchemy.setOnStateChange(() => {
    updateStatusDots();
    updateFusionCount();
  });

  alchemy.setOnLogChange(() => {
    updateLogList();
  });

  alchemy.setOnFusion(() => {
    animateFusionCount();
  });

  function updateStatusDots(): void {
    const container = alchemy.getContainer();
    statusDots.forEach((dot, index) => {
      if (index < container.length) {
        dot.style.backgroundColor = ELEMENTS[container[index]].color;
        dot.style.boxShadow = `0 0 8px ${ELEMENTS[container[index]].color}`;
      } else {
        dot.style.backgroundColor = '#666';
        dot.style.boxShadow = 'none';
      }
    });
  }

  function updateFusionCount(): void {
    fusionCountValue.textContent = alchemy.getFusionCount().toString();
  }

  function animateFusionCount(): void {
    fusionCountValue.style.transform = 'scale(1.5)';
    fusionCountValue.style.transition = 'transform 0.2s ease';
    setTimeout(() => {
      fusionCountValue.style.transform = 'scale(1)';
    }, 200);
  }

  function updateLogList(): void {
    const logs = alchemy.getLogs();
    logList.innerHTML = '';

    const displayLogs = isLogCollapsed ? logs.slice(0, 1) : logs;

    for (const entry of displayLogs) {
      const li = document.createElement('li');
      li.className = 'log-entry';
      li.innerHTML = formatLogEntry(entry);
      logList.appendChild(li);
    }
  }

  function formatLogEntry(entry: LogEntry): string {
    const elementStrs = entry.elements.map(e => {
      const info = ELEMENTS[e];
      return `<span style="color: ${info.logColor}">${info.name}</span>`;
    });

    const substanceInfo = SUBSTANCES[entry.result];
    const resultStr = `<span style="color: #FFD700; font-weight: bold;">${substanceInfo.name}</span>`;

    return `加入${elementStrs.join(' + ')} → ${resultStr}`;
  }

  function setupDragAndDrop(): void {
    elementSlots.forEach(slot => {
      const element = slot.dataset.element as ElementType;

      slot.addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault();
        draggedElement = element;
        slot.classList.add('pressing');
        engine.startDrag(element, e.clientX, e.clientY);
        document.body.style.cursor = 'grabbing';
      });

      slot.addEventListener('mouseup', () => {
        slot.classList.remove('pressing');
      });

      slot.addEventListener('mouseleave', () => {
        slot.classList.remove('pressing');
      });

      slot.addEventListener('touchstart', (e: TouchEvent) => {
        e.preventDefault();
        const touch = e.touches[0];
        draggedElement = element;
        slot.classList.add('pressing');
        engine.startDrag(element, touch.clientX, touch.clientY);
      }, { passive: false });

      slot.addEventListener('touchend', () => {
        slot.classList.remove('pressing');
      });
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (draggedElement) {
        engine.updateDrag(e.clientX, e.clientY);
      }
    });

    document.addEventListener('mouseup', (e: MouseEvent) => {
      if (draggedElement) {
        engine.endDrag(e.clientX, e.clientY);
        draggedElement = null;
        document.body.style.cursor = '';
      }
    });

    document.addEventListener('touchmove', (e: TouchEvent) => {
      if (draggedElement) {
        const touch = e.touches[0];
        engine.updateDrag(touch.clientX, touch.clientY);
      }
    }, { passive: false });

    document.addEventListener('touchend', (e: TouchEvent) => {
      if (draggedElement) {
        const touch = e.changedTouches[0];
        engine.endDrag(touch.clientX, touch.clientY);
        draggedElement = null;
      }
    });
  }

  function setupButtons(): void {
    clearBtn.addEventListener('click', () => {
      engine.triggerClear();
    });

    explodeBtn.addEventListener('click', () => {
      engine.triggerExplosion();
    });

    toggleLogBtn.addEventListener('click', () => {
      isLogCollapsed = !isLogCollapsed;
      toggleLogBtn.textContent = isLogCollapsed ? '▲' : '▼';
      logContent.style.display = isLogCollapsed ? 'none' : 'block';
      updateLogList();
    });
  }

  function handleResize(): void {
    updateStatusDots();
  }

  setupDragAndDrop();
  setupButtons();
  updateStatusDots();
  updateLogList();
  updateFusionCount();

  window.addEventListener('resize', handleResize);

  engine.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
