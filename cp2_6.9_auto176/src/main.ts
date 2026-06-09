import { createWelcomeAnimation, fadeIn } from './animations';
import { createOlfactoryWheel, WheelSelection } from './olfactoryWheel';
import { createScentTimeline } from './scentTimeline';
import { ScentRecord } from './types';
import './styles.css';

const app = document.getElementById('app')!;

function initApp(): void {
  const searchBar = document.createElement('div');
  searchBar.className = 'search-bar';

  const title = document.createElement('h1');
  title.textContent = '🌸 气味记忆日记';
  searchBar.appendChild(title);

  const searchWrapper = document.createElement('div');
  searchWrapper.className = 'search-input-wrapper';

  const searchIcon = document.createElement('span');
  searchIcon.className = 'search-icon';
  searchIcon.innerHTML = '🔍';

  const searchInput = document.createElement('input');
  searchInput.className = 'search-input';
  searchInput.type = 'text';
  searchInput.placeholder = '搜索气味名称或笔记内容...';

  searchWrapper.appendChild(searchIcon);
  searchWrapper.appendChild(searchInput);
  searchBar.appendChild(searchWrapper);

  const main = document.createElement('div');
  main.className = 'app-main';

  const wheelPanel = document.createElement('div');
  wheelPanel.className = 'wheel-panel';

  const wheelHeader = document.createElement('div');
  wheelHeader.className = 'wheel-panel-header';
  const wheelTitle = document.createElement('h2');
  wheelTitle.textContent = '感官轮盘';
  const wheelDesc = document.createElement('p');
  wheelDesc.textContent = '从内到外依次选择基调 → 气味 → 描述词';
  wheelHeader.appendChild(wheelTitle);
  wheelHeader.appendChild(wheelDesc);
  wheelPanel.appendChild(wheelHeader);

  const wheelContainer = document.createElement('div');
  wheelContainer.className = 'wheel-container';
  wheelPanel.appendChild(wheelContainer);

  const timelinePanel = document.createElement('div');
  timelinePanel.className = 'timeline-panel';

  main.appendChild(wheelPanel);
  main.appendChild(timelinePanel);
  app.appendChild(searchBar);
  app.appendChild(main);

  let searchTimeout: ReturnType<typeof setTimeout> | null = null;

  const timeline = createScentTimeline(timelinePanel);

  const wheel = createOlfactoryWheel(wheelContainer, (selection: WheelSelection) => {
    const record: ScentRecord = {
      id: `scent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      categoryId: selection.category.id,
      categoryName: selection.category.name,
      subCategoryId: selection.subCategory.id,
      subCategoryName: selection.subCategory.name,
      descriptorId: selection.descriptor.id,
      descriptorName: selection.descriptor.name,
      color: selection.category.color,
      timestamp: Date.now()
    };
    timeline.addRecord(record);
    wheel.resetSelection();
  });

  searchInput.addEventListener('input', () => {
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const query = searchInput.value.trim();
      if (!query) {
        timeline.clearHighlights();
        timeline.showNoResultTip(false);
        return;
      }
      const results = timeline.searchAndHighlight(query);
      if (results.length === 0) {
        timeline.showNoResultTip(true, () => {
          searchInput.value = '';
          timeline.showNoResultTip(false);
          wheelPanel.scrollIntoView({ behavior: 'smooth' });
        });
      } else {
        timeline.showNoResultTip(false);
      }
    }, 80);
  });

  createWelcomeAnimation(app, () => {
    main.classList.add('visible');
    fadeIn(searchBar, 800);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
