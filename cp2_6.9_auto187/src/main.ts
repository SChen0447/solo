import { PLANTS } from './data';
import { AppStateManager } from './state';
import { Gallery } from './gallery';
import { PlantView } from './plantView';
import { Greenhouse } from './greenhouse';

function initApp(): void {
  const state = new AppStateManager(PLANTS);

  const gallery = new Gallery(
    'galleryGrid',
    'searchInput',
    'noResults',
    state,
    (plantId) => state.selectPlant(plantId)
  );

  const plantView = new PlantView(
    'plantViewContent',
    state,
    (plantId) => state.toggleFavorite(plantId)
  );

  const greenhouse = new Greenhouse(
    'greenhouseCanvas',
    'favoritesList',
    state,
    (plantId) => state.selectPlant(plantId)
  );

  const initialState = state.getState();
  gallery.render(initialState);
  plantView.render(initialState);
  greenhouse.render(initialState);

  state.subscribe((s) => {
    gallery.render(s);
    plantView.render(s);
    greenhouse.render(s);
  });

  bindModalEvents();
  bindResponsiveToggle();
}

function bindModalEvents(): void {
  const aboutBtn = document.getElementById('aboutBtn');
  const modal = document.getElementById('aboutModal');
  if (!aboutBtn || !modal) return;

  aboutBtn.addEventListener('click', () => {
    modal.classList.remove('hidden');
  });

  modal.querySelectorAll('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      modal.classList.add('hidden');
    }
  });
}

function bindResponsiveToggle(): void {
  const toggleBtn = document.getElementById('toggleGreenhouse');
  const greenhousePanel = document.getElementById('greenhousePanel');
  const greenhouseBody = document.getElementById('greenhouseBody');
  if (!toggleBtn || !greenhousePanel || !greenhouseBody) return;

  const checkResponsive = (): void => {
    if (window.innerWidth < 900) {
      toggleBtn.classList.remove('hidden');
    } else {
      toggleBtn.classList.add('hidden');
      greenhouseBody.classList.remove('collapsed');
      toggleBtn.querySelector('.toggle-icon')!.textContent = '▼';
    }
  };

  toggleBtn.addEventListener('click', () => {
    const icon = toggleBtn.querySelector('.toggle-icon');
    if (greenhouseBody.classList.contains('collapsed')) {
      greenhouseBody.classList.remove('collapsed');
      if (icon) icon.textContent = '▼';
    } else {
      greenhouseBody.classList.add('collapsed');
      if (icon) icon.textContent = '▲';
    }
  });

  window.addEventListener('resize', checkResponsive);
  checkResponsive();
}

document.addEventListener('DOMContentLoaded', initApp);
