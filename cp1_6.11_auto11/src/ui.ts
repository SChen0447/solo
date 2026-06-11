export type MaterialPreset = 'matte' | 'metal' | 'glossy';

export interface UIEvents {
  materialChange: MaterialPreset;
  colorChange: { part: 'wall' | 'roof' | 'window' | 'door'; color: string };
  lightIntensity: number;
  roofToggle: boolean;
}

type UIEventCallback = (data: UIEvents[keyof UIEvents]) => void;

const listeners: Map<keyof UIEvents, UIEventCallback[]> = new Map();

function emit<K extends keyof UIEvents>(event: K, data: UIEvents[K]) {
  const cbs = listeners.get(event);
  if (cbs) cbs.forEach((cb) => cb(data));
}

export function onUIEvent<K extends keyof UIEvents>(event: K, cb: (data: UIEvents[K]) => void) {
  if (!listeners.has(event)) listeners.set(event, []);
  listeners.get(event)!.push(cb);
}

export function createUI() {
  const container = document.getElementById('app')!;

  const style = document.createElement('style');
  style.textContent = `
    .panel-toggle {
      display: none;
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 1001;
      width: 44px;
      height: 44px;
      border: none;
      border-radius: 12px;
      background: rgba(255,255,255,0.12);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      color: #fff;
      font-size: 22px;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    .panel-toggle:hover { background: rgba(255,255,255,0.22); }

    @media (max-width: 767px) {
      .panel-toggle { display: flex; align-items: center; justify-content: center; }
      .ctrl-panel {
        transform: translateX(110%);
        transition: transform 0.35s cubic-bezier(0.4,0,0.2,1);
      }
      .ctrl-panel.open {
        transform: translateX(0);
      }
    }

    .ctrl-panel {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 1000;
      width: 260px;
      max-height: calc(100vh - 32px);
      overflow-y: auto;
      padding: 20px;
      border-radius: 16px;
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.12);
      color: #e0e0e0;
      font-size: 13px;
    }

    .ctrl-panel::-webkit-scrollbar { width: 4px; }
    .ctrl-panel::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }

    .ctrl-section { margin-bottom: 16px; }
    .ctrl-section:last-child { margin-bottom: 0; }

    .ctrl-label {
      display: block;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: rgba(255,255,255,0.5);
      margin-bottom: 8px;
    }

    .radio-group { display: flex; gap: 8px; }

    .radio-group label {
      flex: 1;
      text-align: center;
      padding: 6px 0;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.12);
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 12px;
    }
    .radio-group label:hover { border-color: rgba(255,255,255,0.3); }
    .radio-group input { display: none; }
    .radio-group input:checked + span {
      color: #fff;
    }
    .radio-group label:has(input:checked) {
      background: rgba(255,255,255,0.15);
      border-color: rgba(255,255,255,0.35);
    }

    .color-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 6px;
    }
    .color-row span { flex: 1; font-size: 12px; }
    .color-row input[type="color"] {
      -webkit-appearance: none;
      appearance: none;
      width: 32px;
      height: 24px;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      transition: border-color 0.2s ease;
    }
    .color-row input[type="color"]:hover { border-color: rgba(255,255,255,0.5); }
    .color-row input[type="color"]::-webkit-color-swatch-wrapper { padding: 2px; }
    .color-row input[type="color"]::-webkit-color-swatch { border: none; border-radius: 4px; }

    .slider-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .slider-row input[type="range"] {
      flex: 1;
      -webkit-appearance: none;
      appearance: none;
      height: 4px;
      border-radius: 2px;
      background: rgba(255,255,255,0.15);
      outline: none;
    }
    .slider-row input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #fff;
      cursor: pointer;
      transition: box-shadow 0.2s ease;
    }
    .slider-row input[type="range"]::-webkit-slider-thumb:hover {
      box-shadow: 0 0 0 4px rgba(255,255,255,0.15);
    }
    .slider-value {
      min-width: 32px;
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-size: 12px;
      color: rgba(255,255,255,0.7);
    }

    .toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .toggle-row span { font-size: 12px; }
    .toggle-switch {
      position: relative;
      width: 40px;
      height: 22px;
    }
    .toggle-switch input { display: none; }
    .toggle-switch .slider {
      position: absolute;
      inset: 0;
      border-radius: 11px;
      background: rgba(255,255,255,0.12);
      cursor: pointer;
      transition: background 0.2s ease;
    }
    .toggle-switch .slider::before {
      content: '';
      position: absolute;
      top: 3px;
      left: 3px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #fff;
      transition: transform 0.2s ease;
    }
    .toggle-switch input:checked + .slider {
      background: rgba(100,180,255,0.5);
    }
    .toggle-switch input:checked + .slider::before {
      transform: translateX(18px);
    }
  `;
  document.head.appendChild(style);

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'panel-toggle';
  toggleBtn.innerHTML = '&#9776;';
  container.appendChild(toggleBtn);

  const panel = document.createElement('div');
  panel.className = 'ctrl-panel';
  panel.innerHTML = `
    <div class="ctrl-section">
      <span class="ctrl-label">材质</span>
      <div class="radio-group">
        <label><input type="radio" name="material" value="matte" checked /><span>哑光</span></label>
        <label><input type="radio" name="material" value="metal" /><span>金属</span></label>
        <label><input type="radio" name="material" value="glossy" /><span>光泽</span></label>
      </div>
    </div>
    <div class="ctrl-section">
      <span class="ctrl-label">颜色</span>
      <div class="color-row"><span>墙面</span><input type="color" id="color-wall" value="#e0c9a6" /></div>
      <div class="color-row"><span>屋顶</span><input type="color" id="color-roof" value="#8b4513" /></div>
      <div class="color-row"><span>窗户</span><input type="color" id="color-window" value="#87ceeb" /></div>
      <div class="color-row"><span>门</span><input type="color" id="color-door" value="#5c3317" /></div>
    </div>
    <div class="ctrl-section">
      <span class="ctrl-label">光照强度</span>
      <div class="slider-row">
        <input type="range" id="light-intensity" min="0.5" max="2" step="0.01" value="1" />
        <span class="slider-value" id="light-value">1.00</span>
      </div>
    </div>
    <div class="ctrl-section">
      <div class="toggle-row">
        <span>切换屋顶</span>
        <label class="toggle-switch">
          <input type="checkbox" id="roof-toggle" checked />
          <span class="slider"></span>
        </label>
      </div>
    </div>
  `;
  container.appendChild(panel);

  toggleBtn.addEventListener('click', () => {
    panel.classList.toggle('open');
  });

  panel.querySelectorAll<HTMLInputElement>('input[name="material"]').forEach((input) => {
    input.addEventListener('change', () => {
      emit('materialChange', input.value as MaterialPreset);
    });
  });

  const partMap: Record<string, 'wall' | 'roof' | 'window' | 'door'> = {
    'color-wall': 'wall',
    'color-roof': 'roof',
    'color-window': 'window',
    'color-door': 'door',
  };

  Object.entries(partMap).forEach(([id, part]) => {
    const input = document.getElementById(id) as HTMLInputElement;
    input.addEventListener('input', () => {
      emit('colorChange', { part, color: input.value });
    });
  });

  const lightSlider = document.getElementById('light-intensity') as HTMLInputElement;
  const lightValue = document.getElementById('light-value') as HTMLSpanElement;
  lightSlider.addEventListener('input', () => {
    const v = parseFloat(lightSlider.value);
    lightValue.textContent = v.toFixed(2);
    emit('lightIntensity', v);
  });

  const roofToggle = document.getElementById('roof-toggle') as HTMLInputElement;
  roofToggle.addEventListener('change', () => {
    emit('roofToggle', roofToggle.checked);
  });
}
