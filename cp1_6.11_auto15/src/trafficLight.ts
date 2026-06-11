export type Direction = 'east' | 'south' | 'west' | 'north';
export type LightState = 'red' | 'yellow' | 'green';

export interface LightConfig {
  redDuration: number;
  greenDuration: number;
}

export interface LightStatus {
  direction: Direction;
  state: LightState;
  remainingSeconds: number;
  displaySeconds: number;
}

const YELLOW_DURATION = 3;
const MIN_DURATION = 5;
const MAX_DURATION = 30;

const DIRECTION_LABELS: Record<Direction, string> = {
  east: '东向',
  south: '南向',
  west: '西向',
  north: '北向'
};

const DIRECTION_COLORS: Record<Direction, string> = {
  east: '#ff8c42',
  south: '#ffd93d',
  west: '#6bcb77',
  north: '#4d96ff'
};

export class TrafficLight {
  direction: Direction;
  state: LightState;
  redDuration: number;
  greenDuration: number;
  private elapsed: number;
  private currentPhaseDuration: number;
  private previousState: LightState;
  transitionProgress: number;

  constructor(direction: Direction, redDuration: number = 15, greenDuration: number = 15) {
    this.direction = direction;
    this.redDuration = Math.max(MIN_DURATION, Math.min(MAX_DURATION, redDuration));
    this.greenDuration = Math.max(MIN_DURATION, Math.min(MAX_DURATION, greenDuration));
    this.state = 'red';
    this.previousState = 'red';
    this.elapsed = 0;
    this.currentPhaseDuration = this.redDuration;
    this.transitionProgress = 1;
  }

  setRedDuration(duration: number): void {
    this.redDuration = Math.max(MIN_DURATION, Math.min(MAX_DURATION, duration));
    if (this.state === 'red') {
      this.currentPhaseDuration = this.redDuration;
      if (this.elapsed > this.currentPhaseDuration) {
        this.elapsed = this.currentPhaseDuration;
      }
    }
  }

  setGreenDuration(duration: number): void {
    this.greenDuration = Math.max(MIN_DURATION, Math.min(MAX_DURATION, duration));
    if (this.state === 'green') {
      this.currentPhaseDuration = this.greenDuration;
      if (this.elapsed > this.currentPhaseDuration) {
        this.elapsed = this.currentPhaseDuration;
      }
    }
  }

  update(deltaTime: number): void {
    this.elapsed += deltaTime;
    this.transitionProgress = Math.min(1, this.transitionProgress + deltaTime / 0.3);

    if (this.elapsed >= this.currentPhaseDuration) {
      this.transitionToNextState();
    }
  }

  private transitionToNextState(): void {
    this.previousState = this.state;
    this.transitionProgress = 0;
    this.elapsed = 0;

    switch (this.state) {
      case 'green':
        this.state = 'yellow';
        this.currentPhaseDuration = YELLOW_DURATION;
        break;
      case 'yellow':
        this.state = 'red';
        this.currentPhaseDuration = this.redDuration;
        break;
      case 'red':
        this.state = 'green';
        this.currentPhaseDuration = this.greenDuration;
        break;
    }
  }

  forceGreen(): void {
    if (this.state !== 'green') {
      this.previousState = this.state;
      this.transitionProgress = 0;
      this.state = 'green';
      this.elapsed = 0;
      this.currentPhaseDuration = this.greenDuration;
    }
  }

  forceRed(): void {
    if (this.state !== 'red') {
      this.previousState = this.state;
      this.transitionProgress = 0;
      this.state = 'red';
      this.elapsed = 0;
      this.currentPhaseDuration = this.redDuration;
    }
  }

  getRemainingSeconds(): number {
    return Math.max(0, this.currentPhaseDuration - this.elapsed);
  }

  getDisplaySeconds(): number {
    return Math.ceil(this.getRemainingSeconds());
  }

  canPass(): boolean {
    return this.state === 'green' || (this.state === 'yellow' && this.getRemainingSeconds() > 1);
  }

  getStatus(): LightStatus {
    return {
      direction: this.direction,
      state: this.state,
      remainingSeconds: this.getRemainingSeconds(),
      displaySeconds: this.getDisplaySeconds()
    };
  }

  getColor(): string {
    const colors: Record<LightState, string> = {
      red: '#ff4757',
      yellow: '#ffd93d',
      green: '#00ff88'
    };

    if (this.transitionProgress >= 1) {
      return colors[this.state];
    }

    const prevColor = colors[this.previousState];
    const nextColor = colors[this.state];
    return this.interpolateColor(prevColor, nextColor, this.transitionProgress);
  }

  private interpolateColor(color1: string, color2: string, t: number): string {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}

export class TrafficLightController {
  private lights: Record<Direction, TrafficLight>;
  private lastDisplaySeconds: Record<Direction, number>;
  private changeTimers: Record<Direction, number | null>;

  constructor() {
    this.lights = {
      east: new TrafficLight('east', 15, 15),
      south: new TrafficLight('south', 15, 15),
      west: new TrafficLight('west', 15, 15),
      north: new TrafficLight('north', 15, 15)
    };

    this.lights.east.forceGreen();
    this.lights.west.forceGreen();
    this.lights.south.forceRed();
    this.lights.north.forceRed();

    this.lastDisplaySeconds = {
      east: this.lights.east.getDisplaySeconds(),
      south: this.lights.south.getDisplaySeconds(),
      west: this.lights.west.getDisplaySeconds(),
      north: this.lights.north.getDisplaySeconds()
    };

    this.changeTimers = {
      east: null,
      south: null,
      west: null,
      north: null
    };
  }

  update(deltaTime: number): void {
    const eastWest = this.lights.east;
    const west = this.lights.west;
    const south = this.lights.south;
    const north = this.lights.north;

    eastWest.update(deltaTime);
    west.update(deltaTime);
    south.update(deltaTime);
    north.update(deltaTime);

    if (eastWest.state === 'red' && eastWest.transitionProgress >= 1) {
      if (south.state === 'red') {
        south.forceGreen();
        north.forceGreen();
      }
    }

    if (south.state === 'red' && south.transitionProgress >= 1) {
      if (eastWest.state === 'red') {
        eastWest.forceGreen();
        west.forceGreen();
      }
    }

    this.updateCountdownDisplay();
  }

  private updateCountdownDisplay(): void {
    (['east', 'south', 'west', 'north'] as Direction[]).forEach(direction => {
      const light = this.lights[direction];
      const displaySeconds = light.getDisplaySeconds();
      
      if (displaySeconds !== this.lastDisplaySeconds[direction]) {
        const countdownEl = document.getElementById(`countdown-${direction}`);
        if (countdownEl) {
          countdownEl.classList.add('changing');
          
          if (this.changeTimers[direction]) {
            clearTimeout(this.changeTimers[direction]!);
          }
          
          this.changeTimers[direction] = window.setTimeout(() => {
            countdownEl.textContent = displaySeconds.toString();
            countdownEl.classList.remove('changing');
            this.changeTimers[direction] = null;
          }, 150);
        }
        this.lastDisplaySeconds[direction] = displaySeconds;
      }
    });
  }

  setDuration(direction: Direction, type: 'red' | 'green', duration: number): void {
    const light = this.lights[direction];
    if (type === 'red') {
      light.setRedDuration(duration);
      if (direction === 'east' || direction === 'west') {
        this.lights.west.setRedDuration(duration);
        this.lights.east.setRedDuration(duration);
      } else {
        this.lights.south.setRedDuration(duration);
        this.lights.north.setRedDuration(duration);
      }
    } else {
      light.setGreenDuration(duration);
      if (direction === 'east' || direction === 'west') {
        this.lights.west.setGreenDuration(duration);
        this.lights.east.setGreenDuration(duration);
      } else {
        this.lights.south.setGreenDuration(duration);
        this.lights.north.setGreenDuration(duration);
      }
    }
  }

  getLight(direction: Direction): TrafficLight {
    return this.lights[direction];
  }

  getStatus(direction: Direction): LightStatus {
    return this.lights[direction].getStatus();
  }

  getAllStatuses(): Record<Direction, LightStatus> {
    return {
      east: this.lights.east.getStatus(),
      south: this.lights.south.getStatus(),
      west: this.lights.west.getStatus(),
      north: this.lights.north.getStatus()
    };
  }

  canPass(direction: Direction): boolean {
    return this.lights[direction].canPass();
  }

  bindControlPanel(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) return;

    const directions: Direction[] = ['east', 'south', 'west', 'north'];
    const pairedDirections: Record<Direction, string> = {
      east: '东西方向',
      west: '东西方向',
      south: '南北方向',
      north: '南北方向'
    };

    const processed = new Set<string>();

    directions.forEach(direction => {
      const groupKey = pairedDirections[direction];
      if (processed.has(groupKey)) return;
      processed.add(groupKey);

      const light = this.lights[direction];
      const group = document.createElement('div');
      group.className = 'control-group';

      group.innerHTML = `
        <div class="control-group-title">
          <span class="direction-indicator" style="background: ${DIRECTION_COLORS[direction]}"></span>
          ${groupKey}
        </div>
        <div class="slider-group">
          <div class="slider-label">
            <span>红灯时长</span>
            <span class="slider-value" id="value-${direction}-red">${light.redDuration}s</span>
          </div>
          <input type="range" 
                 id="slider-${direction}-red" 
                 min="${MIN_DURATION}" 
                 max="${MAX_DURATION}" 
                 value="${light.redDuration}"
                 step="1" />
        </div>
        <div class="slider-group">
          <div class="slider-label">
            <span>绿灯时长</span>
            <span class="slider-value" id="value-${direction}-green">${light.greenDuration}s</span>
          </div>
          <input type="range" 
                 id="slider-${direction}-green" 
                 min="${MIN_DURATION}" 
                 max="${MAX_DURATION}" 
                 value="${light.greenDuration}"
                 step="1" />
        </div>
      `;

      container.appendChild(group);

      const redSlider = group.querySelector(`#slider-${direction}-red`) as HTMLInputElement;
      const redValue = group.querySelector(`#value-${direction}-red`) as HTMLElement;
      const greenSlider = group.querySelector(`#slider-${direction}-green`) as HTMLInputElement;
      const greenValue = group.querySelector(`#value-${direction}-green`) as HTMLElement;

      redSlider.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        redValue.textContent = `${value}s`;
        this.setDuration(direction, 'red', value);
      });

      greenSlider.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        greenValue.textContent = `${value}s`;
        this.setDuration(direction, 'green', value);
      });
    });
  }

  renderLights(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, scale: number): void {
    const lightRadius = 12 * scale;
    const lightSpacing = 30 * scale;
    const offset = 60 * scale;

    const positions: Record<Direction, { x: number; y: number; angle: number }> = {
      north: { x: centerX - offset, y: centerY - offset, angle: 0 },
      east: { x: centerX + offset, y: centerY - offset, angle: 0 },
      south: { x: centerX + offset, y: centerY + offset, angle: 0 },
      west: { x: centerX - offset, y: centerY + offset, angle: 0 }
    };

    (['east', 'south', 'west', 'north'] as Direction[]).forEach(direction => {
      const pos = positions[direction];
      const light = this.lights[direction];
      const status = light.getStatus();

      for (let i = 0; i < 3; i++) {
        const lightX = pos.x;
        const lightY = pos.y + (i - 1) * lightSpacing;
        
        const stateIndex: Record<LightState, number> = { red: 0, yellow: 1, green: 2 };
        const currentIndex = stateIndex[light.state];
        
        let color: string;
        if (i === currentIndex) {
          color = light.getColor();
        } else {
          color = '#2a3142';
        }

        ctx.beginPath();
        ctx.arc(lightX, lightY, lightRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#0f141f';
        ctx.fill();
        ctx.strokeStyle = '#3a4152';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(lightX, lightY, lightRadius * 0.75, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        if (i === currentIndex) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(lightX, lightY, lightRadius * 0.75, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      ctx.fillStyle = '#e8eaed';
      ctx.font = `bold ${14 * scale}px 'Segoe UI', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const seconds = status.displaySeconds;
      ctx.fillText(seconds.toString(), pos.x, pos.y + lightSpacing * 1.5);

      ctx.fillStyle = DIRECTION_COLORS[direction];
      ctx.font = `${11 * scale}px 'Segoe UI', sans-serif`;
      ctx.fillText(DIRECTION_LABELS[direction], pos.x, pos.y - lightSpacing * 1.5);
    });
  }
}
