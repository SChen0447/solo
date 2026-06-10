import {
  getState,
  setSelectedStation,
  setCurrentHour,
  setSelectedDate,
  getAQIColor,
  getStationById,
  getCurrentHourlyData,
  getPrimaryPollutant,
  get24HourRange
} from './main';

export class Sidebar {
  private container: HTMLElement;
  private stationListEl: HTMLElement | null = null;
  private stationItems: HTMLElement[] = [];
  private timeSliderEl: HTMLInputElement | null = null;
  private timeDisplayEl: HTMLElement | null = null;
  private aqiCardEl: HTMLElement | null = null;
  private pollutantCardEl: HTMLElement | null = null;
  private rangeCardEl: HTMLElement | null = null;
  private cardsContainer: HTMLElement | null = null;
  private todayBtn: HTMLElement | null = null;
  private yesterdayBtn: HTMLElement | null = null;
  private dateBtnContainer: HTMLElement | null = null;
  private isMobile: boolean = false;
  private listCollapsed: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.update();
  }

  setMobileMode(mobile: boolean): void {
    this.isMobile = mobile;
    this.render();
    this.update();
  }

  private render(): void {
    this.container.innerHTML = '';
    this.stationItems = [];

    if (this.isMobile) {
      this.renderMobile();
    } else {
      this.renderDesktop();
    }
  }

  private renderDesktop(): void {
    const padding = 'padding: 20px;';

    const header = document.createElement('div');
    header.style.cssText = `
      ${padding}
      border-bottom: 1px solid rgba(0, 210, 255, 0.2);
    `;
    header.innerHTML = `<h1 style="font-size: 20px; color: #00d2ff; font-weight: 600; letter-spacing: 1px;">城市空气质量监测</h1>`;
    this.container.appendChild(header);

    this.createStationList(padding);
    this.createTimeSlider(padding);
    this.createStatsCards(padding);
    this.createDateButtons(padding);
  }

  private renderMobile(): void {
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      align-items: center;
      height: 100%;
      padding: 0 15px;
      gap: 15px;
      white-space: nowrap;
    `;

    const title = document.createElement('div');
    title.style.cssText = `font-size: 16px; color: #00d2ff; font-weight: 600; flex-shrink: 0;`;
    title.textContent = 'AQI监测';
    container.appendChild(title);

    const aqiDisplay = document.createElement('div');
    aqiDisplay.style.cssText = `flex-shrink: 0;`;
    this.aqiCardEl = aqiDisplay;
    container.appendChild(aqiDisplay);

    this.timeSliderEl = document.createElement('input');
    this.timeSliderEl.type = 'range';
    this.timeSliderEl.min = '0';
    this.timeSliderEl.max = '23';
    this.timeSliderEl.step = '1';
    this.timeSliderEl.style.cssText = `
      flex: 1;
      min-width: 100px;
      height: 4px;
      -webkit-appearance: none;
      background: #1a2744;
      border-radius: 2px;
      outline: none;
    `;
    this.timeSliderEl.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value);
      setCurrentHour(val);
    });
    container.appendChild(this.timeSliderEl);

    this.timeDisplayEl = document.createElement('div');
    this.timeDisplayEl.style.cssText = `
      font-family: 'Courier New', monospace;
      font-size: 18px;
      color: #00d2ff;
      flex-shrink: 0;
      font-weight: bold;
    `;
    container.appendChild(this.timeDisplayEl);

    this.container.appendChild(container);
  }

  private createStationList(padding: string): void {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = padding;

    const headerRow = document.createElement('div');
    headerRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      margin-bottom: 12px;
      user-select: none;
    `;

    const title = document.createElement('span');
    title.style.cssText = `font-size: 14px; color: #8fb8d4; font-weight: 500;`;
    title.textContent = '监测站点';

    const toggle = document.createElement('span');
    toggle.style.cssText = `font-size: 14px; color: #00d2ff; transition: transform 0.3s;`;
    toggle.textContent = '▼';

    headerRow.appendChild(title);
    headerRow.appendChild(toggle);
    headerRow.addEventListener('click', () => {
      this.listCollapsed = !this.listCollapsed;
      this.stationListEl!.style.maxHeight = this.listCollapsed ? '0' : '400px';
      this.stationListEl!.style.opacity = this.listCollapsed ? '0' : '1';
      toggle.style.transform = this.listCollapsed ? 'rotate(-90deg)' : 'rotate(0)';
    });

    this.stationListEl = document.createElement('div');
    this.stationListEl.style.cssText = `
      overflow: hidden;
      max-height: 400px;
      opacity: 1;
      transition: max-height 0.3s ease, opacity 0.3s ease;
    `;

    const state = getState();
    state.stations.forEach((station) => {
      const item = this.createStationItem(station);
      this.stationListEl!.appendChild(item);
      this.stationItems.push(item);
    });

    wrapper.appendChild(headerRow);
    wrapper.appendChild(this.stationListEl);
    this.container.appendChild(wrapper);
  }

  private createStationItem(station: { id: number; name: string }): HTMLElement {
    const item = document.createElement('div');
    item.style.cssText = `
      display: flex;
      align-items: center;
      padding: 10px 12px;
      margin-bottom: 6px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
      background: rgba(0, 210, 255, 0.05);
    `;

    item.addEventListener('mouseenter', () => {
      item.style.background = 'rgba(0, 210, 255, 0.12)';
    });
    item.addEventListener('mouseleave', () => {
      const state = getState();
      if (station.id !== state.selectedStationId) {
        item.style.background = 'rgba(0, 210, 255, 0.05)';
      }
    });
    item.addEventListener('click', () => {
      setSelectedStation(station.id);
    });

    const dot = document.createElement('div');
    dot.style.cssText = `
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 12px;
      flex-shrink: 0;
      box-shadow: 0 0 8px currentColor;
    `;
    (dot as HTMLElement & { _stationId: number })._stationId = station.id;

    const name = document.createElement('span');
    name.style.cssText = `font-size: 13px; color: #ffffff; flex: 1;`;
    name.textContent = station.name;

    item.appendChild(dot);
    item.appendChild(name);
    return item;
  }

  private createTimeSlider(padding: string): void {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = padding + 'border-top: 1px solid rgba(0, 210, 255, 0.15);';

    const label = document.createElement('div');
    label.style.cssText = `font-size: 14px; color: #8fb8d4; margin-bottom: 12px; font-weight: 500;`;
    label.textContent = '时间轴 (24小时)';

    this.timeDisplayEl = document.createElement('div');
    this.timeDisplayEl.style.cssText = `
      font-family: 'Courier New', monospace;
      font-size: 24px;
      color: #00d2ff;
      text-align: center;
      margin-bottom: 16px;
      font-weight: bold;
      letter-spacing: 2px;
      text-shadow: 0 0 10px rgba(0, 210, 255, 0.5);
    `;

    this.timeSliderEl = document.createElement('input');
    this.timeSliderEl.type = 'range';
    this.timeSliderEl.min = '0';
    this.timeSliderEl.max = '23';
    this.timeSliderEl.step = '1';
    this.timeSliderEl.style.cssText = `
      width: 100%;
      height: 6px;
      -webkit-appearance: none;
      background: #1a2744;
      border-radius: 3px;
      outline: none;
    `;
    const sliderStyle = document.createElement('style');
    sliderStyle.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #00d2ff;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(0, 210, 255, 0.6);
        border: 2px solid #ffffff;
      }
      input[type="range"]::-moz-range-thumb {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #00d2ff;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(0, 210, 255, 0.6);
        border: 2px solid #ffffff;
      }
    `;
    this.container.appendChild(sliderStyle);

    this.timeSliderEl.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value);
      setCurrentHour(val);
    });

    const ticks = document.createElement('div');
    ticks.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
      font-size: 11px;
      color: #6a8ca8;
    `;
    for (let i = 0; i <= 24; i += 6) {
      const tick = document.createElement('span');
      tick.textContent = `${String(i).padStart(2, '0')}:00`;
      ticks.appendChild(tick);
    }

    wrapper.appendChild(label);
    wrapper.appendChild(this.timeDisplayEl);
    wrapper.appendChild(this.timeSliderEl);
    wrapper.appendChild(ticks);
    this.container.appendChild(wrapper);
  }

  private createStatsCards(padding: string): void {
    this.cardsContainer = document.createElement('div');
    this.cardsContainer.style.cssText = padding + 'border-top: 1px solid rgba(0, 210, 255, 0.15);';

    const grid = document.createElement('div');
    grid.style.cssText = `
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
    `;

    this.aqiCardEl = this.createCard('当前AQI', '', '#00d2ff', '0');
    this.pollutantCardEl = this.createCard('主要污染物', '', '#f39c12', '1');
    this.rangeCardEl = this.createCard('24小时区间', '', '#2ecc71', '2');

    grid.appendChild(this.aqiCardEl);
    grid.appendChild(this.pollutantCardEl);
    grid.appendChild(this.rangeCardEl);
    this.cardsContainer.appendChild(grid);
    this.container.appendChild(this.cardsContainer);
  }

  private createCard(label: string, _value: string, accentColor: string, index: string): HTMLElement {
    const card = document.createElement('div');
    card.style.cssText = `
      background: rgba(0, 210, 255, 0.05);
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 0 15px rgba(0, 210, 255, 0.15);
      border: 1px solid rgba(0, 210, 255, 0.1);
      transform: translateY(20px);
      opacity: 0;
      transition: transform 0.4s ease, opacity 0.4s ease;
    `;
    (card as HTMLElement & { _cardIndex: string })._cardIndex = index;

    const labelEl = document.createElement('div');
    labelEl.style.cssText = `font-size: 12px; color: #8fb8d4; margin-bottom: 8px;`;
    labelEl.textContent = label;

    const valueEl = document.createElement('div');
    valueEl.style.cssText = `
      font-size: 24px;
      font-weight: bold;
      color: ${accentColor};
    `;
    (valueEl as HTMLElement & { _cardValue: boolean })._cardValue = true;

    card.appendChild(labelEl);
    card.appendChild(valueEl);
    return card;
  }

  private createDateButtons(padding: string): void {
    this.dateBtnContainer = document.createElement('div');
    this.dateBtnContainer.style.cssText = padding + 'border-top: 1px solid rgba(0, 210, 255, 0.15);';

    const label = document.createElement('div');
    label.style.cssText = `font-size: 14px; color: #8fb8d4; margin-bottom: 12px; font-weight: 500;`;
    label.textContent = '历史记录';

    const btnWrapper = document.createElement('div');
    btnWrapper.style.cssText = `display: flex; gap: 10px;`;

    this.todayBtn = this.createDateBtn('今日', true);
    this.yesterdayBtn = this.createDateBtn('昨日', false);

    this.todayBtn.addEventListener('click', () => {
      setSelectedDate('today');
      this.updateDateButtons();
    });
    this.yesterdayBtn.addEventListener('click', () => {
      setSelectedDate('yesterday');
      this.updateDateButtons();
    });

    btnWrapper.appendChild(this.todayBtn);
    btnWrapper.appendChild(this.yesterdayBtn);
    this.dateBtnContainer.appendChild(label);
    this.dateBtnContainer.appendChild(btnWrapper);
    this.container.appendChild(this.dateBtnContainer);
  }

  private createDateBtn(text: string, active: boolean): HTMLElement {
    const btn = document.createElement('button');
    btn.style.cssText = `
      flex: 1;
      padding: 10px 20px;
      border-radius: 999px;
      border: none;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.3s ease;
      font-family: inherit;
      background: ${active ? '#3498db' : '#1a2744'};
      color: ${active ? '#ffffff' : '#8fb8d4'};
      box-shadow: ${active ? '0 0 12px rgba(52, 152, 219, 0.4)' : 'none'};
    `;
    btn.textContent = text;
    return btn;
  }

  playCardsAnimation(): void {
    if (!this.cardsContainer) return;
    const cards = this.cardsContainer.querySelectorAll('div[style*="transform: translateY"]');
    cards.forEach((card, i) => {
      setTimeout(() => {
        (card as HTMLElement).style.transform = 'translateY(0)';
        (card as HTMLElement).style.opacity = '1';
      }, i * 200);
    });
  }

  update(): void {
    const state = getState();
    const station = getStationById(state, state.selectedStationId);

    this.updateStationList();

    if (this.timeSliderEl) {
      this.timeSliderEl.value = String(state.currentHour);
    }

    if (this.timeDisplayEl) {
      this.updateTimeDisplay(state.currentHour);
    }

    if (station && !this.isMobile) {
      const hourly = getCurrentHourlyData(station, state.selectedDate, state.currentHour);
      const range = get24HourRange(station, state.selectedDate);

      if (this.aqiCardEl) {
        const valEl = this.aqiCardEl.querySelector('div[_cardValue]') || this.aqiCardEl.children[1];
        if (valEl) {
          (valEl as HTMLElement).textContent = String(hourly.aqi);
          (valEl as HTMLElement).style.color = getAQIColor(hourly.aqi);
        }
      }
      if (this.pollutantCardEl) {
        const valEl = this.pollutantCardEl.querySelector('div[_cardValue]') || this.pollutantCardEl.children[1];
        if (valEl) {
          (valEl as HTMLElement).textContent = getPrimaryPollutant(hourly.pollutants);
        }
      }
      if (this.rangeCardEl) {
        const valEl = this.rangeCardEl.querySelector('div[_cardValue]') || this.rangeCardEl.children[1];
        if (valEl) {
          (valEl as HTMLElement).textContent = `${range.min} ~ ${range.max}`;
        }
      }
    }

    if (this.isMobile && station) {
      const hourly = getCurrentHourlyData(station, state.selectedDate, state.currentHour);
      if (this.aqiCardEl) {
        this.aqiCardEl.innerHTML = `<span style="font-size:20px;font-weight:bold;color:${getAQIColor(hourly.aqi)}">${hourly.aqi}</span>`;
      }
    }

    this.updateDateButtons();
  }

  private updateStationList(): void {
    const state = getState();
    this.stationItems.forEach((item) => {
      const dot = item.children[0] as HTMLElement;
      const stationId = (dot as HTMLElement & { _stationId?: number })._stationId;
      const station = getStationById(state, stationId!);
      if (station) {
        const hourly = getCurrentHourlyData(station, state.selectedDate, state.currentHour);
        const color = getAQIColor(hourly.aqi);
        dot.style.background = color;
        dot.style.color = color;
      }
      if (stationId === state.selectedStationId) {
        item.style.background = 'rgba(0, 210, 255, 0.2)';
        item.style.border = '1px solid rgba(0, 210, 255, 0.4)';
      } else {
        item.style.background = 'rgba(0, 210, 255, 0.05)';
        item.style.border = '1px solid transparent';
      }
    });
  }

  private updateDateButtons(): void {
    const state = getState();
    if (!this.todayBtn || !this.yesterdayBtn) return;
    this.setDateBtnStyle(this.todayBtn, state.selectedDate === 'today');
    this.setDateBtnStyle(this.yesterdayBtn, state.selectedDate === 'yesterday');
  }

  private setDateBtnStyle(btn: HTMLElement, active: boolean): void {
    btn.style.background = active ? '#3498db' : '#1a2744';
    btn.style.color = active ? '#ffffff' : '#8fb8d4';
    btn.style.boxShadow = active ? '0 0 12px rgba(52, 152, 219, 0.4)' : 'none';
  }

  private lastColon: boolean = true;
  private updateTimeDisplay(hour: number): void {
    this.lastColon = !this.lastColon;
    const colon = this.lastColon ? ':' : ' ';
    const date = new Date();
    if (getState().selectedDate === 'yesterday') {
      date.setDate(date.getDate() - 1);
    }
    const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
    if (this.timeDisplayEl) {
      this.timeDisplayEl.textContent = `${dateStr} ${String(hour).padStart(2, '0')}${colon}00`;
    }
  }
}
