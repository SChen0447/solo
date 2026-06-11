import * as THREE from 'three';
import { RenderManager } from './renderManager';
import { FluidSystem } from './fluidSystem';

export interface SimulationParams {
  magneticStrength: number;
  viscosity: number;
  polaritySwapped: boolean;
}

export interface InteractionCallbacks {
  onParamsChange: (params: SimulationParams) => void;
  onPulse: (screenX: number, screenY: number) => void;
  onMagnetMove: (worldPos: THREE.Vector3) => void;
}

export class InteractionHandler {
  private renderManager: RenderManager;
  private fluidSystem: FluidSystem;
  private callbacks: InteractionCallbacks;

  private params: SimulationParams;
  private isDraggingMagnet: boolean = false;
  private isDraggingKnob: boolean = false;
  private activeKnob: HTMLElement | null = null;
  private knobStartAngle: number = 0;
  private knobStartValue: number = 0;
  private knobCenter: { x: number; y: number } = { x: 0, y: 0 };

  private magnetScreenStart: { x: number; y: number } = { x: 0, y: 0 };
  private magnetWorldStart: THREE.Vector3 = new THREE.Vector3();

  private lastPulseDistance: number = Infinity;

  constructor(
    renderManager: RenderManager,
    fluidSystem: FluidSystem,
    callbacks: InteractionCallbacks,
    initialParams: SimulationParams
  ) {
    this.renderManager = renderManager;
    this.fluidSystem = fluidSystem;
    this.callbacks = callbacks;
    this.params = { ...initialParams };

    this.bindMouseEvents();
    this.bindKnobEvents();
    this.bindPolarityButton();
    this.updateKnobUI('strength', this.params.magneticStrength);
    this.updateKnobUI('viscosity', this.params.viscosity);
  }

  private bindMouseEvents(): void {
    const canvas = this.renderManager.renderer.domElement;

    canvas.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (this.isDraggingKnob) return;

      this.isDraggingMagnet = true;
      this.magnetScreenStart = { x: e.clientX, y: e.clientY };
      this.magnetWorldStart.copy(this.renderManager.magnet.position);

      document.body.style.cursor = 'crosshair';
      canvas.style.cursor = 'crosshair';
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.isDraggingKnob && this.activeKnob) {
        this.handleKnobDrag(e);
        return;
      }

      if (this.isDraggingMagnet) {
        this.handleMagnetDrag(e);
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.isDraggingMagnet) {
        this.isDraggingMagnet = false;
        document.body.style.cursor = '';
        canvas.style.cursor = '';
      }

      if (this.isDraggingKnob) {
        this.isDraggingKnob = false;
        this.activeKnob = null;
      }
    });

    canvas.addEventListener('mouseenter', () => {
      if (!this.isDraggingMagnet) {
        canvas.style.cursor = 'grab';
      }
    });

    canvas.addEventListener('mouseleave', () => {
      if (!this.isDraggingMagnet) {
        canvas.style.cursor = '';
      }
    });
  }

  private handleMagnetDrag(e: MouseEvent): void {
    const worldPos = this.renderManager.screenToWorld(e.clientX, e.clientY, 1.5);

    const maxDist = 4.0;
    const horizDist = Math.sqrt(worldPos.x * worldPos.x + worldPos.z * worldPos.z);
    if (horizDist > maxDist) {
      const scale = maxDist / horizDist;
      worldPos.x *= scale;
      worldPos.z *= scale;
    }

    worldPos.y = THREE.MathUtils.clamp(worldPos.y, 0.3, 3.5);

    this.renderManager.setMagnetPosition(worldPos.x, worldPos.y, worldPos.z);
    this.callbacks.onMagnetMove(worldPos);

    this.checkMagnetProximity(e.clientX, e.clientY);
  }

  private checkMagnetProximity(screenX: number, screenY: number): void {
    const magnetPos = this.renderManager.magnet.position;
    const particles = this.fluidSystem.getParticles();
    const count = this.fluidSystem.getParticleCount();

    let minDist = Infinity;
    for (let i = 0; i < Math.min(count, 50); i++) {
      const ix = i * 3;
      const dx = particles[ix] - magnetPos.x;
      const dy = particles[ix + 1] - magnetPos.y;
      const dz = particles[ix + 2] - magnetPos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < minDist) minDist = dist;
    }

    if (minDist < 2.0 && this.lastPulseDistance >= 2.0) {
      this.callbacks.onPulse(screenX, screenY);
    }
    this.lastPulseDistance = minDist;
  }

  private bindKnobEvents(): void {
    const knobs = document.querySelectorAll('.knob');

    knobs.forEach((knob) => {
      const element = knob as HTMLElement;

      element.addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        this.isDraggingKnob = true;
        this.activeKnob = element;

        const rect = element.getBoundingClientRect();
        this.knobCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };

        this.knobStartAngle = this.getAngleFromCenter(e.clientX, e.clientY);
        this.knobStartValue = this.getKnobValue(element);

        const glowId = element.id.replace('Knob', 'Glow');
        const glow = document.getElementById(glowId);
        if (glow) {
          glow.classList.remove('active');
          void glow.offsetWidth;
          glow.classList.add('active');
        }
      });
    });
  }

  private handleKnobDrag(e: MouseEvent): void {
    if (!this.activeKnob) return;

    const currentAngle = this.getAngleFromCenter(e.clientX, e.clientY);
    let angleDelta = currentAngle - this.knobStartAngle;

    if (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
    if (angleDelta < -Math.PI) angleDelta += Math.PI * 2;

    const param = this.activeKnob.dataset.param;
    const min = parseFloat(this.activeKnob.dataset.min || '0');
    const max = parseFloat(this.activeKnob.dataset.max || '1');
    const step = parseFloat(this.activeKnob.dataset.step || '0.01');

    const totalRange = max - min;
    const sensitivity = totalRange / (Math.PI * 1.5);

    let newValue = this.knobStartValue + angleDelta * sensitivity;

    const steppedValue = Math.round(newValue / step) * step;
    newValue = THREE.MathUtils.clamp(steppedValue, min, max);

    if (param === 'strength') {
      const newStrength = THREE.MathUtils.clamp(newValue, 0.1, 2.0);
      if (Math.abs(newStrength - this.params.magneticStrength) >= step * 0.5) {
        this.params.magneticStrength = newStrength;
        this.updateKnobUI('strength', newStrength);
        this.callbacks.onParamsChange({ ...this.params });
      }
    } else if (param === 'viscosity') {
      const newViscosity = THREE.MathUtils.clamp(newValue, 0.2, 1.0);
      if (Math.abs(newViscosity - this.params.viscosity) >= step * 0.5) {
        this.params.viscosity = newViscosity;
        this.updateKnobUI('viscosity', newViscosity);
        this.callbacks.onParamsChange({ ...this.params });
      }
    }
  }

  private updateKnobUI(param: string, value: number): void {
    const knobId = param === 'strength' ? 'strengthKnob' : 'viscosityKnob';
    const valueId = param === 'strength' ? 'strengthValue' : 'viscosityValue';
    const indicatorId = param === 'strength' ? 'strengthIndicator' : 'viscosityIndicator';

    const knob = document.getElementById(knobId);
    const valueEl = document.getElementById(valueId);
    const indicator = document.getElementById(indicatorId);

    if (!knob || !valueEl || !indicator) return;

    const min = parseFloat(knob.dataset.min || '0');
    const max = parseFloat(knob.dataset.max || '1');
    const normalized = (value - min) / (max - min);

    const rotationAngle = -135 + normalized * 270;
    indicator.style.transform = `translate(-50%, -100%) rotate(${rotationAngle}deg)`;

    if (param === 'strength') {
      valueEl.textContent = value.toFixed(2);
    } else {
      valueEl.textContent = value.toFixed(1);
    }
  }

  private getAngleFromCenter(clientX: number, clientY: number): number {
    const dx = clientX - this.knobCenter.x;
    const dy = clientY - this.knobCenter.y;
    return Math.atan2(dy, dx);
  }

  private getKnobValue(element: HTMLElement): number {
    const param = element.dataset.param;
    if (param === 'strength') return this.params.magneticStrength;
    if (param === 'viscosity') return this.params.viscosity;
    return 0;
  }

  private bindPolarityButton(): void {
    const btn = document.getElementById('polarityBtn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      this.params.polaritySwapped = !this.params.polaritySwapped;

      btn.classList.remove('swapping');
      void btn.offsetWidth;
      btn.classList.add('swapping');

      this.renderManager.setMagnetPolarity(this.params.polaritySwapped);
      this.fluidSystem.triggerPolaritySwap();

      this.callbacks.onParamsChange({ ...this.params });

      setTimeout(() => {
        btn.classList.remove('swapping');
      }, 500);
    });
  }

  public getParams(): SimulationParams {
    return { ...this.params };
  }

  public setMagneticStrength(value: number): void {
    const clamped = THREE.MathUtils.clamp(value, 0.1, 2.0);
    this.params.magneticStrength = clamped;
    this.updateKnobUI('strength', clamped);
    this.callbacks.onParamsChange({ ...this.params });
  }

  public setViscosity(value: number): void {
    const clamped = THREE.MathUtils.clamp(value, 0.2, 1.0);
    this.params.viscosity = clamped;
    this.updateKnobUI('viscosity', clamped);
    this.callbacks.onParamsChange({ ...this.params });
  }

  public getMagnetWorldPosition(): THREE.Vector3 {
    return this.renderManager.magnet.position.clone();
  }
}
