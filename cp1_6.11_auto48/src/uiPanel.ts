import gsap from 'gsap';

export interface VentData {
  temperature: number;
  velocity: number;
  radius: number;
  density: number;
  pressure: number;
}

export interface UIPanelSystem {
  show: (data: VentData) => void;
  hide: () => void;
  updateData: (data: Partial<VentData>) => void;
  isVisible: () => boolean;
}

export const createUIPanel = (): UIPanelSystem => {
  const panel = document.getElementById('data-panel') as HTMLDivElement;
  const closeBtn = document.getElementById('close-panel') as HTMLButtonElement;
  const tempEl = document.getElementById('data-temp')!;
  const velocityEl = document.getElementById('data-velocity')!;
  const radiusEl = document.getElementById('data-radius')!;
  const densityEl = document.getElementById('data-density')!;
  const pressureEl = document.getElementById('data-pressure')!;

  let visible = false;
  let currentData: VentData = {
    temperature: 300,
    velocity: 2.5,
    radius: 45.2,
    density: 1250,
    pressure: 25.8
  };

  const animateValue = (el: HTMLElement, newValue: number, suffix: string, decimals = 1): void => {
    const currentText = el.textContent || '0';
    const currentMatch = currentText.match(/[\d.]+/);
    const start = currentMatch ? parseFloat(currentMatch[0]) : 0;

    const obj = { value: start };
    gsap.to(obj, {
      value: newValue,
      duration: 0.5,
      ease: 'power2.out',
      onUpdate: () => {
        const formatted = decimals > 0
          ? obj.value.toFixed(decimals)
          : Math.floor(obj.value).toLocaleString();
        el.innerHTML = `${formatted}<span class="unit">${suffix}</span>`;
      }
    });
  };

  const show = (data: VentData): void => {
    if (visible) return;
    visible = true;
    currentData = { ...data };

    panel.classList.add('visible');
    updateData(data);
  };

  const hide = (): void => {
    if (!visible) return;
    visible = false;
    panel.classList.remove('visible');
  };

  const updateData = (data: Partial<VentData>): void => {
    currentData = { ...currentData, ...data };

    if (data.temperature !== undefined) {
      animateValue(tempEl, data.temperature, '°C', 0);
    }
    if (data.velocity !== undefined) {
      animateValue(velocityEl, data.velocity, 'm/s', 2);
    }
    if (data.radius !== undefined) {
      animateValue(radiusEl, data.radius, 'm', 1);
    }
    if (data.density !== undefined) {
      animateValue(densityEl, data.density, '个', 0);
    }
    if (data.pressure !== undefined) {
      animateValue(pressureEl, data.pressure, 'MPa', 1);
    }
  };

  const isVisible = (): boolean => visible;

  closeBtn.addEventListener('click', hide);

  document.addEventListener('click', (e) => {
    if (visible && !panel.contains(e.target as Node) && !(e.target as HTMLElement).closest('.tp-dfwv')) {
      const target = e.target as HTMLElement;
      if (!target.closest('canvas')) {
        hide();
      }
    }
  });

  return {
    show,
    hide,
    updateData,
    isVisible
  };
};

export const createMobileToggle = (): void => {
  const toggle = document.getElementById('tweakpane-toggle') as HTMLButtonElement;
  const container = document.getElementById('tweakpane-container') as HTMLDivElement;

  if (!toggle || !container) return;

  toggle.addEventListener('click', () => {
    container.classList.toggle('mobile-visible');
  });
};
