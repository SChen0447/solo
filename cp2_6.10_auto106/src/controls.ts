import { TreeVegetation, BushVegetation, RockVegetation } from './vegetation';

interface VegetationConfig {
  label: string;
  countMin: number;
  countMax: number;
  countDefault: number;
  vegetation: TreeVegetation | BushVegetation | RockVegetation;
}

export function createControls(
  container: HTMLElement,
  trees: TreeVegetation,
  bushes: BushVegetation,
  rocks: RockVegetation,
  onExport: () => void
) {
  const styles = `
    .control-panel {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 300px;
      max-height: calc(100vh - 100px);
      overflow-y: auto;
      background: rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 20px;
      color: white;
      font-size: 14px;
      z-index: 100;
    }
    .control-panel::-webkit-scrollbar {
      width: 6px;
    }
    .control-panel::-webkit-scrollbar-track {
      background: transparent;
    }
    .control-panel::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
    }
    .vegetation-section {
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    }
    .vegetation-section:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 14px;
      color: #ffffff;
    }
    .control-row {
      margin-bottom: 12px;
    }
    .control-label {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      color: rgba(255, 255, 255, 0.9);
    }
    .control-value {
      background: rgba(255, 255, 255, 0.15);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    input[type="range"] {
      width: 100%;
      height: 6px;
      -webkit-appearance: none;
      appearance: none;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
      outline: none;
    }
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #ffffff;
      cursor: pointer;
      transition: transform 0.15s ease;
    }
    input[type="range"]::-webkit-slider-thumb:hover {
      transform: scale(1.2);
    }
    input[type="range"]::-moz-range-thumb {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #ffffff;
      cursor: pointer;
      border: none;
    }
    .button-row {
      display: flex;
      gap: 8px;
      margin-top: 14px;
    }
    .btn {
      flex: 1;
      padding: 8px 14px;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: background-color 0.2s ease, transform 0.1s ease;
    }
    .btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    .btn:active {
      transform: scale(0.95);
    }
    .export-btn {
      position: absolute;
      bottom: 20px;
      right: 20px;
      padding: 10px 20px;
      background: rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      z-index: 100;
      transition: background-color 0.2s ease, transform 0.1s ease;
    }
    .export-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    .export-btn:active {
      transform: scale(0.95);
    }
    .fps-warning {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(220, 53, 69, 0.9);
      color: white;
      padding: 16px 32px;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 500;
      z-index: 200;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
    .fps-warning.show {
      opacity: 1;
    }
  `;

  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);

  const panel = document.createElement('div');
  panel.className = 'control-panel';

  const configs: VegetationConfig[] = [
    { label: '🌲 树木', countMin: 10, countMax: 100, countDefault: 30, vegetation: trees },
    { label: '🌿 灌木', countMin: 10, countMax: 80, countDefault: 20, vegetation: bushes },
    { label: '🪨 石块', countMin: 5, countMax: 40, countDefault: 10, vegetation: rocks },
  ];

  const counts: { [key: string]: number } = {};

  configs.forEach((config) => {
    counts[config.label] = config.countDefault;

    const section = document.createElement('div');
    section.className = 'vegetation-section';

    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = config.label;
    section.appendChild(title);

    const countRow = document.createElement('div');
    countRow.className = 'control-row';
    const countLabel = document.createElement('div');
    countLabel.className = 'control-label';
    countLabel.innerHTML = `<span>数量</span><span class="control-value" id="count-value-${config.label}">${config.countDefault}</span>`;
    countRow.appendChild(countLabel);

    const countSlider = document.createElement('input');
    countSlider.type = 'range';
    countSlider.min = config.countMin.toString();
    countSlider.max = config.countMax.toString();
    countSlider.value = config.countDefault.toString();
    countSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      counts[config.label] = parseInt(target.value);
      const valueEl = document.getElementById(`count-value-${config.label}`);
      if (valueEl) valueEl.textContent = target.value;
    });
    countRow.appendChild(countSlider);
    section.appendChild(countRow);

    const hueRow = document.createElement('div');
    hueRow.className = 'control-row';
    const hueLabel = document.createElement('div');
    hueLabel.className = 'control-label';
    hueLabel.innerHTML = `<span>色相偏移</span><span class="control-value" id="hue-value-${config.label}">0°</span>`;
    hueRow.appendChild(hueLabel);

    const hueSlider = document.createElement('input');
    hueSlider.type = 'range';
    hueSlider.min = '0';
    hueSlider.max = '360';
    hueSlider.value = '0';
    hueSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const hue = parseInt(target.value);
      const valueEl = document.getElementById(`hue-value-${config.label}`);
      if (valueEl) valueEl.textContent = `${hue}°`;
      const satValue = document.getElementById(`sat-value-${config.label}`);
      const sat = satValue ? parseInt(satValue.textContent) : 100;
      config.vegetation.updateColor(hue, sat);
    });
    hueRow.appendChild(hueSlider);
    section.appendChild(hueRow);

    const satRow = document.createElement('div');
    satRow.className = 'control-row';
    const satLabel = document.createElement('div');
    satLabel.className = 'control-label';
    satLabel.innerHTML = `<span>饱和度</span><span class="control-value" id="sat-value-${config.label}">100%</span>`;
    satRow.appendChild(satLabel);

    const satSlider = document.createElement('input');
    satSlider.type = 'range';
    satSlider.min = '0';
    satSlider.max = '100';
    satSlider.value = '100';
    satSlider.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      const sat = parseInt(target.value);
      const valueEl = document.getElementById(`sat-value-${config.label}`);
      if (valueEl) valueEl.textContent = `${sat}%`;
      const hueValue = document.getElementById(`hue-value-${config.label}`);
      const hue = hueValue ? parseInt(hueValue.textContent) : 0;
      config.vegetation.updateColor(hue, sat);
    });
    satRow.appendChild(satSlider);
    section.appendChild(satRow);

    const buttonRow = document.createElement('div');
    buttonRow.className = 'button-row';

    const scatterBtn = document.createElement('button');
    scatterBtn.className = 'btn';
    scatterBtn.textContent = '散布';
    scatterBtn.addEventListener('click', () => {
      config.vegetation.scatter(counts[config.label]);
    });
    buttonRow.appendChild(scatterBtn);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn';
    clearBtn.textContent = '清除';
    clearBtn.addEventListener('click', () => {
      config.vegetation.clear();
    });
    buttonRow.appendChild(clearBtn);

    section.appendChild(buttonRow);
    panel.appendChild(section);
  });

  container.appendChild(panel);

  const exportBtn = document.createElement('button');
  exportBtn.className = 'export-btn';
  exportBtn.textContent = '📷 导出场景截图';
  exportBtn.addEventListener('click', onExport);
  container.appendChild(exportBtn);

  const warning = document.createElement('div');
  warning.className = 'fps-warning';
  warning.textContent = '⚠️ FPS 低于 24，建议减少植被密度';
  container.appendChild(warning);

  return {
    showFpsWarning: () => {
      warning.classList.add('show');
      setTimeout(() => warning.classList.remove('show'), 2000);
    },
  };
}
