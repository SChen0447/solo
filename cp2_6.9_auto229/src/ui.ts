import { PhysicsSystem } from './seedPhysics';

export interface UIControls {
  seedCount: number;
  windStrength: number;
  gravity: number;
  onRebloom: () => void;
}

export function createControlPanel(controls: UIControls, physics: PhysicsSystem): void {
  const panel = document.createElement('div');
  panel.className = 'control-panel';
  panel.innerHTML = `
    <div class="panel-title">🌼 蒲公英控制面板</div>
    <div class="control-group">
      <div class="control-label">
        <span>种子数量</span>
        <span class="control-value" id="seedCountValue">${controls.seedCount}</span>
      </div>
      <input type="range" class="slider" id="seedCount" min="100" max="500" step="10" value="${controls.seedCount}" />
    </div>
    <div class="control-group">
      <div class="control-label">
        <span>风速强度</span>
        <span class="control-value" id="windStrengthValue">${controls.windStrength.toFixed(2)}</span>
      </div>
      <input type="range" class="slider" id="windStrength" min="0" max="2" step="0.05" value="${controls.windStrength}" />
    </div>
    <div class="control-group">
      <div class="control-label">
        <span>重力加速度</span>
        <span class="control-value" id="gravityValue">${controls.gravity.toFixed(2)}</span>
      </div>
      <input type="range" class="slider" id="gravity" min="0.5" max="2" step="0.05" value="${controls.gravity}" />
    </div>
    <button class="btn" id="rebloomBtn">🌸 重新开花</button>
  `;

  document.body.appendChild(panel);

  const seedCountSlider = document.getElementById('seedCount') as HTMLInputElement;
  const seedCountValue = document.getElementById('seedCountValue') as HTMLElement;
  const windStrengthSlider = document.getElementById('windStrength') as HTMLInputElement;
  const windStrengthValue = document.getElementById('windStrengthValue') as HTMLElement;
  const gravitySlider = document.getElementById('gravity') as HTMLInputElement;
  const gravityValue = document.getElementById('gravityValue') as HTMLElement;
  const rebloomBtn = document.getElementById('rebloomBtn') as HTMLButtonElement;

  seedCountSlider.addEventListener('input', () => {
    controls.seedCount = parseInt(seedCountSlider.value);
    seedCountValue.textContent = seedCountSlider.value;
  });

  windStrengthSlider.addEventListener('input', () => {
    controls.windStrength = parseFloat(windStrengthSlider.value);
    windStrengthValue.textContent = controls.windStrength.toFixed(2);
    physics.windStrength = controls.windStrength;
  });

  gravitySlider.addEventListener('input', () => {
    controls.gravity = parseFloat(gravitySlider.value);
    gravityValue.textContent = controls.gravity.toFixed(2);
    physics.gravity = controls.gravity;
  });

  rebloomBtn.addEventListener('click', () => {
    controls.onRebloom();
  });
}
