import { WeatherRenderer } from './weatherRenderer';
import {
  fetchWeatherData,
  refreshWeatherData,
  getWeatherIcon,
  getWeatherLabel,
  type WeatherDay,
  type CityKey,
} from './weatherData';

const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el as T;
};

let renderer: WeatherRenderer;
let weatherList: WeatherDay[] = [];
let selectedDayIndex = 0;
let currentCity: CityKey = 'beijing';

const panelEl = $('weather-panel');
const panelDateEl = $('panel-date');
const panelWeekdayEl = $('panel-weekday');
const panelIconEl = $('panel-icon');
const panelTempEl = <HTMLSpanElement>$('panel-temp');
const panelTempRangeEl = $('panel-temp-range');
const panelTypeEl = $('panel-type');
const panelWindEl = $('panel-wind');
const panelHumidityEl = $('panel-humidity');
const clockEl = $('clock');
const citySelectEl = <HTMLSelectElement>$('city-select');
const timelineEl = $('timeline');
const timelineContainerEl = $('timeline-container');
const loadingEl = $('loading-overlay');
const transitionOverlayEl = $('transition-overlay');

function updateClock(): void {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  clockEl.textContent = `${hh}:${mm}:${ss}`;
}

function renderPanel(day: WeatherDay): void {
  const today = new Date();
  const fullDate = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate() + selectedDayIndex}日`;
  panelDateEl.textContent = fullDate;
  panelWeekdayEl.textContent = day.weekday;
  panelIconEl.textContent = getWeatherIcon(day.weatherType);
  panelTempEl.textContent = String(day.temperature);
  panelTempRangeEl.textContent = `${day.tempLow}° ~ ${day.tempHigh}°`;
  panelTypeEl.textContent = getWeatherLabel(day.weatherType);
  panelWindEl.textContent = `${day.windSpeed} km/h`;
  panelHumidityEl.textContent = `${day.humidity}%`;
}

function renderTimeline(): void {
  timelineEl.innerHTML = '';
  weatherList.forEach((day, index) => {
    const item = document.createElement('div');
    item.className = 'timeline-item' + (index === selectedDayIndex ? ' active' : '');
    item.innerHTML = `
      <div class="timeline-date">${day.date}</div>
      <div class="timeline-weather">
        <span class="timeline-icon">${getWeatherIcon(day.weatherType)}</span>
        <span class="timeline-temp">${day.temperature}°</span>
      </div>
    `;
    item.addEventListener('click', () => selectDay(index, true));
    timelineEl.appendChild(item);
  });
}

function selectDay(index: number, animate: boolean): void {
  if (index === selectedDayIndex && !animate) return;
  selectedDayIndex = index;
  const day = weatherList[index];

  if (animate) {
    transitionOverlayEl.classList.add('fading');
    setTimeout(() => {
      renderer.setWeather(day.weatherType, 'fade');
      renderPanel(day);
      renderTimeline();
    }, 750);
    setTimeout(() => {
      transitionOverlayEl.classList.remove('fading');
    }, 1500);
  } else {
    renderer.setWeather(day.weatherType, 'fade');
    renderPanel(day);
    renderTimeline();
  }
}

async function loadCityWeather(city: CityKey, refresh: boolean = false): Promise<void> {
  currentCity = city;
  selectedDayIndex = 0;
  loadingEl.classList.remove('hidden');

  const data = refresh
    ? await refreshWeatherData(city)
    : await fetchWeatherData(city);

  weatherList = data;

  transitionOverlayEl.classList.add('fading');
  setTimeout(() => {
    selectDay(0, false);
    loadingEl.classList.add('hidden');
  }, 500);
  setTimeout(() => {
    transitionOverlayEl.classList.remove('fading');
  }, 1500);
}

function setupPanelDrag(): void {
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let panelStartLeft = 0;
  let panelStartTop = 0;
  let rafId = 0;

  const onDown = (e: PointerEvent) => {
    if (window.innerWidth < 768) return;
    const target = e.target as HTMLElement;
    if (target.closest('.temp-value')) return;
    isDragging = true;
    panelEl.setPointerCapture(e.pointerId);
    startX = e.clientX;
    startY = e.clientY;
    const rect = panelEl.getBoundingClientRect();
    panelStartLeft = rect.left;
    panelStartTop = rect.top;
    panelEl.style.left = panelStartLeft + 'px';
    panelEl.style.top = panelStartTop + 'px';
    panelEl.style.right = 'auto';
  };

  const onMove = (e: PointerEvent) => {
    if (!isDragging) return;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let newLeft = panelStartLeft + dx;
      let newTop = panelStartTop + dy;
      const rect = panelEl.getBoundingClientRect();
      const maxLeft = window.innerWidth - rect.width - 8;
      const maxTop = window.innerHeight - rect.height - 8;
      newLeft = Math.max(8, Math.min(maxLeft, newLeft));
      newTop = Math.max(8, Math.min(maxTop, newTop));
      panelEl.style.left = newLeft + 'px';
      panelEl.style.top = newTop + 'px';
    });
  };

  const onUp = (e: PointerEvent) => {
    if (!isDragging) return;
    isDragging = false;
    panelEl.releasePointerCapture(e.pointerId);
  };

  panelEl.addEventListener('pointerdown', onDown);
  panelEl.addEventListener('pointermove', onMove);
  panelEl.addEventListener('pointerup', onUp);
  panelEl.addEventListener('pointercancel', onUp);
}

function setupTempHover(): void {
  panelTempEl.addEventListener('mouseenter', () => {
    panelTempEl.classList.add('hovered');
  });
  panelTempEl.addEventListener('mouseleave', () => {
    panelTempEl.classList.remove('hovered');
  });
}

function setupCitySelect(): void {
  citySelectEl.value = currentCity;
  citySelectEl.addEventListener('change', (e) => {
    const city = (e.target as HTMLSelectElement).value as CityKey;
    if (city !== currentCity) {
      loadCityWeather(city, true);
    }
  });
}

function setupTimelineWheel(): void {
  timelineContainerEl.addEventListener('wheel', (e) => {
    e.preventDefault();
    timelineContainerEl.scrollLeft += e.deltaY;
  }, { passive: false });
}

function setupResize(): void {
  let rafId = 0;
  window.addEventListener('resize', () => {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      renderer.resize();
    });
  });
}

async function init(): Promise<void> {
  const canvas = $('weather-canvas') as HTMLCanvasElement;
  renderer = new WeatherRenderer(canvas);
  renderer.start();

  updateClock();
  setInterval(updateClock, 1000);

  setupPanelDrag();
  setupTempHover();
  setupCitySelect();
  setupTimelineWheel();
  setupResize();

  await loadCityWeather('beijing', false);
}

init().catch(console.error);
