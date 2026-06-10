import { StateManager } from '../store';
import { CONTINENTS, YEAR_RANGE } from '../utils/data';

export function initControls(container: HTMLElement, store: StateManager): void {
  const state = store.getState();

  const hamburgerBtn = document.createElement('button');
  hamburgerBtn.className = 'hamburger-btn';
  hamburgerBtn.innerHTML = '&#9776; 筛选';
  hamburgerBtn.addEventListener('click', () => {
    container.classList.toggle('mobile-open');
  });

  const yearGroup = document.createElement('div');
  yearGroup.className = 'control-group year-control';
  const yearLabel = document.createElement('span');
  yearLabel.className = 'control-label';
  yearLabel.textContent = '选择年份';
  const yearSliderGroup = document.createElement('div');
  yearSliderGroup.className = 'year-slider-group';
  const yearSlider = document.createElement('input');
  yearSlider.type = 'range';
  yearSlider.id = 'yearSlider';
  yearSlider.min = String(YEAR_RANGE.min);
  yearSlider.max = String(YEAR_RANGE.max);
  yearSlider.step = '1';
  yearSlider.value = String(state.selectedYear);
  const yearValue = document.createElement('span');
  yearValue.id = 'yearValue';
  yearValue.textContent = String(state.selectedYear);
  yearSliderGroup.appendChild(yearSlider);
  yearSliderGroup.appendChild(yearValue);
  yearGroup.appendChild(yearLabel);
  yearGroup.appendChild(yearSliderGroup);

  const continentGroup = document.createElement('div');
  continentGroup.className = 'control-group';
  const continentLabel = document.createElement('span');
  continentLabel.className = 'control-label';
  continentLabel.textContent = '选择地区';
  const continentGroups = document.createElement('div');
  continentGroups.className = 'continent-groups';
  CONTINENTS.forEach((continent) => {
    const label = document.createElement('label');
    label.className = 'continent-group';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = continent;
    checkbox.checked = state.selectedContinents.includes(continent);
    const span = document.createElement('span');
    span.textContent = continent;
    label.appendChild(checkbox);
    label.appendChild(span);
    continentGroups.appendChild(label);
  });
  continentGroup.appendChild(continentLabel);
  continentGroup.appendChild(continentGroups);

  const resetBtn = document.createElement('button');
  resetBtn.id = 'resetBtn';
  resetBtn.textContent = '重置筛选';

  container.innerHTML = '';
  container.appendChild(hamburgerBtn);
  container.appendChild(yearGroup);
  container.appendChild(continentGroup);
  container.appendChild(resetBtn);

  yearSlider.addEventListener('input', (e) => {
    const value = Number((e.target as HTMLInputElement).value);
    yearValue.textContent = String(value);
    store.setYear(value);
  });

  continentGroups.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener('change', () => {
      store.toggleContinent(cb.value);
    });
  });

  resetBtn.addEventListener('click', () => {
    store.reset();
  });

  store.subscribe('yearChange', () => {
    const s = store.getState();
    yearSlider.value = String(s.selectedYear);
    yearValue.textContent = String(s.selectedYear);
  });

  store.subscribe('continentChange', () => {
    const s = store.getState();
    continentGroups.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((cb) => {
      cb.checked = s.selectedContinents.includes(cb.value);
    });
  });

  store.subscribe('reset', () => {
    const s = store.getState();
    yearSlider.value = String(s.selectedYear);
    yearValue.textContent = String(s.selectedYear);
    continentGroups.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((cb) => {
      cb.checked = s.selectedContinents.includes(cb.value);
    });
    container.classList.remove('mobile-open');
  });
}
