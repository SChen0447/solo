export interface SatelliteTelemetry {
  id: string;
  name: string;
  color: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
}

export interface UIData {
  fps: number;
  time: Date;
  satellites: SatelliteTelemetry[];
}

type FocusCallback = (satelliteId: string) => void;

export class UIManager {
  private fpsElement: HTMLElement;
  private timeElement: HTMLElement;
  private satelliteListElement: HTMLElement;
  private focusCallback: FocusCallback | null = null;
  private lastValues: Map<string, { lat: number; lng: number; speed: number }> = new Map();
  private lastUpdateTime: number = 0;
  private activeSatelliteId: string | null = null;

  constructor() {
    this.fpsElement = document.getElementById('hud-fps') as HTMLElement;
    this.timeElement = document.getElementById('hud-time') as HTMLElement;
    this.satelliteListElement = document.getElementById('satellite-list') as HTMLElement;
  }

  setFocusCallback(callback: FocusCallback): void {
    this.focusCallback = callback;
  }

  setActiveSatellite(id: string | null): void {
    this.activeSatelliteId = id;
    const rows = this.satelliteListElement.querySelectorAll('.satellite-row');
    rows.forEach((row) => {
      if (id && row.getAttribute('data-id') === id) {
        row.classList.add('active');
      } else {
        row.classList.remove('active');
      }
    });
  }

  update(data: UIData): void {
    this.fpsElement.textContent = Math.round(data.fps).toString();
    this.timeElement.textContent = this.formatTime(data.time);

    const now = Date.now();
    if (now - this.lastUpdateTime >= 1000) {
      this.updateSatellitePanel(data.satellites);
      this.lastUpdateTime = now;
    }
  }

  private formatTime(date: Date): string {
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    const s = date.getSeconds().toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  private updateSatellitePanel(satellites: SatelliteTelemetry[]): void {
    if (this.satelliteListElement.children.length === 0) {
      this.buildSatelliteRows(satellites);
    }

    satellites.forEach((sat) => {
      const row = this.satelliteListElement.querySelector(`[data-id="${sat.id}"]`) as HTMLElement;
      if (!row) return;

      const latEl = row.querySelector('.data-lat') as HTMLElement;
      const lngEl = row.querySelector('.data-lng') as HTMLElement;
      const speedEl = row.querySelector('.data-speed') as HTMLElement;

      const prev = this.lastValues.get(sat.id);
      const latStr = `${sat.latitude.toFixed(2)}°`;
      const lngStr = `${sat.longitude.toFixed(2)}°`;
      const speedStr = `${sat.speed.toFixed(1)} km/s`;

      if (prev) {
        if (Math.abs(prev.lat - sat.latitude) >= 0.01) {
          this.triggerUpdateAnimation(latEl);
        }
        if (Math.abs(prev.lng - sat.longitude) >= 0.01) {
          this.triggerUpdateAnimation(lngEl);
        }
        if (Math.abs(prev.speed - sat.speed) >= 0.1) {
          this.triggerUpdateAnimation(speedEl);
        }
      }

      latEl.textContent = latStr;
      lngEl.textContent = lngStr;
      speedEl.textContent = speedStr;

      this.lastValues.set(sat.id, {
        lat: sat.latitude,
        lng: sat.longitude,
        speed: sat.speed
      });
    });
  }

  private triggerUpdateAnimation(el: HTMLElement): void {
    el.classList.remove('updated');
    void el.offsetWidth;
    el.classList.add('updated');
  }

  private buildSatelliteRows(satellites: SatelliteTelemetry[]): void {
    const fragment = document.createDocumentFragment();

    satellites.forEach((sat) => {
      const row = document.createElement('div');
      row.className = 'satellite-row';
      row.setAttribute('data-id', sat.id);
      if (this.activeSatelliteId === sat.id) {
        row.classList.add('active');
      }

      const dot = document.createElement('div');
      dot.className = 'orbit-dot';
      dot.style.color = sat.color;
      dot.style.backgroundColor = sat.color;

      const info = document.createElement('div');
      info.className = 'satellite-info';

      const name = document.createElement('div');
      name.className = 'satellite-name';
      name.textContent = sat.name;

      const data = document.createElement('div');
      data.className = 'satellite-data';

      const latItem = document.createElement('div');
      latItem.className = 'data-item';
      const latLabel = document.createElement('span');
      latLabel.className = 'data-label';
      latLabel.textContent = '纬度';
      const latVal = document.createElement('span');
      latVal.className = 'data-value data-lat';
      latVal.textContent = '0.00°';
      latItem.appendChild(latLabel);
      latItem.appendChild(latVal);

      const lngItem = document.createElement('div');
      lngItem.className = 'data-item';
      const lngLabel = document.createElement('span');
      lngLabel.className = 'data-label';
      lngLabel.textContent = '经度';
      const lngVal = document.createElement('span');
      lngVal.className = 'data-value data-lng';
      lngVal.textContent = '0.00°';
      lngItem.appendChild(lngLabel);
      lngItem.appendChild(lngVal);

      const speedItem = document.createElement('div');
      speedItem.className = 'data-item';
      const speedLabel = document.createElement('span');
      speedLabel.className = 'data-label';
      speedLabel.textContent = '速度';
      const speedVal = document.createElement('span');
      speedVal.className = 'data-value data-speed';
      speedVal.textContent = '0.0 km/s';
      speedItem.appendChild(speedLabel);
      speedItem.appendChild(speedVal);

      data.appendChild(latItem);
      data.appendChild(lngItem);
      data.appendChild(speedItem);

      info.appendChild(name);
      info.appendChild(data);

      const btn = document.createElement('button');
      btn.className = 'focus-btn';
      btn.textContent = '聚焦';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.focusCallback) {
          this.focusCallback(sat.id);
        }
      });

      row.addEventListener('click', () => {
        if (this.focusCallback) {
          this.focusCallback(sat.id);
        }
      });

      row.appendChild(dot);
      row.appendChild(info);
      row.appendChild(btn);

      fragment.appendChild(row);
    });

    this.satelliteListElement.appendChild(fragment);
  }
}
