import type { Diary, DiaryFormData, MoodTrendPoint, MoodType } from './diaryStore';
import { MOOD_CONFIG, WEATHER_OPTIONS } from './diaryStore';

export interface TimelineCallbacks {
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
  onToggleExpand: (id: string) => void;
  expandedIds: Set<string>;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function renderTimeline(
  container: HTMLElement,
  diaries: Diary[],
  callbacks: TimelineCallbacks
): void {
  container.innerHTML = '';

  if (diaries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <div class="empty-icon">📝</div>
      <h3>还没有日记</h3>
      <p>点击上方"新增日记"开始记录你的心情吧</p>
    `;
    container.appendChild(empty);
    return;
  }

  const timeline = document.createElement('div');
  timeline.className = 'timeline';

  diaries.forEach((diary, index) => {
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.style.animationDelay = `${index * 0.05}s`;

    const isExpanded = callbacks.expandedIds.has(diary.id);
    const moodCfg = MOOD_CONFIG[diary.mood];

    item.innerHTML = `
      <div class="timeline-dot" style="background: ${moodCfg.color}"></div>
      <div class="diary-card ${isExpanded ? 'expanded' : ''}" data-id="${diary.id}">
        <div class="diary-header">
          <div class="diary-mood" title="${moodCfg.label}">${moodCfg.emoji}</div>
          <div class="diary-title-row">
            <h3 class="diary-title">${escapeHtml(diary.title)}</h3>
            <span class="diary-date">${formatDate(diary.date)} ${diary.weather}</span>
          </div>
          <div class="diary-stars">${'★'.repeat(diary.stars)}${'☆'.repeat(5 - diary.stars)}</div>
        </div>
        <div class="diary-content-preview">${escapeHtml(diary.content).slice(0, 80)}${diary.content.length > 80 ? '...' : ''}</div>
        <div class="diary-content-full">${escapeHtml(diary.content)}</div>
        <div class="diary-actions">
          <button class="action-btn" data-action="toggle">${isExpanded ? '收起' : '展开'}</button>
          <button class="action-btn" data-action="edit">编辑</button>
          <button class="action-btn" data-action="delete">删除</button>
          <button class="action-btn" data-action="share">分享</button>
        </div>
      </div>
    `;

    const card = item.querySelector('.diary-card') as HTMLElement;
    const actions = item.querySelectorAll('.action-btn');

    actions.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = (btn as HTMLElement).dataset.action;
        if (action === 'toggle') {
          callbacks.onToggleExpand(diary.id);
        } else if (action === 'edit') {
          callbacks.onEdit(diary.id);
        } else if (action === 'delete') {
          callbacks.onDelete(diary.id);
        } else if (action === 'share') {
          callbacks.onShare(diary.id);
        }
      });
    });

    card.addEventListener('click', () => {
      callbacks.onToggleExpand(diary.id);
    });

    timeline.appendChild(item);
  });

  container.appendChild(timeline);
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function renderChart(
  canvas: HTMLCanvasElement,
  trends: MoodTrendPoint[]
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = rect.height;
  const padding = { top: 30, right: 20, bottom: 40, left: 40 };
  const chartW = W - padding.left - padding.right;
  const chartH = H - padding.top - padding.bottom;

  ctx.clearRect(0, 0, W, H);

  const validPoints = trends.filter(t => t.stars > 0);

  const hasData = validPoints.length > 0;

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#718096';

  for (let i = 1; i <= 5; i++) {
    const y = padding.top + chartH - (chartH * (i / 5);
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(W - padding.right, y);
    ctx.stroke();
    ctx.fillText(`${i}`, padding.left - 20, y + 4);
  }

  const labelStep = Math.max(1, Math.floor(trends.length / 6));
  trends.forEach((t, i) => {
    if (i % labelStep === 0) {
      const x = padding.left + (chartW * i) / (trends.length - 1);
      ctx.fillText(formatShortDate(t.date), x - 12, H - padding.bottom + 15);
    }
  });

  if (!hasData) {
    ctx.fillStyle = '#a0aec0';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('暂无数据', W / 2, H / 2);
    ctx.textAlign = 'left';
    return;
  }

  let animationProgress = 0;
  const animate = () => {
    animationProgress = Math.min(animationProgress + 0.03, 1);

    ctx.clearRect(padding.left, padding.top, chartW, chartH);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 5; i++) {
      const y = padding.top + chartH - (chartH * (i / 5);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(W - padding.right, y);
      ctx.stroke();
    }

    const visibleCount = Math.floor(trends.length * animationProgress);

    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
    gradient.addColorStop(0, '#6BCB77');
    gradient.addColorStop(0.5, '#FFD93D');
    gradient.addColorStop(1, '#E74C3C');

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();

    let started = false;
    for (let i = 0; i <= visibleCount && i < trends.length; i++) {
      const t = trends[i];
      if (t.stars === 0) continue;
      const x = padding.left + (chartW * i) / (trends.length - 1);
      const y = padding.top + chartH - (chartH * (t.stars / 5);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    for (let i = 0; i <= visibleCount && i < trends.length; i++) {
      const t = trends[i];
      if (t.stars === 0) continue;
      const x = padding.left + (chartW * i) / (trends.length - 1);
      const y = padding.top + chartH - (chartH * (t.stars / 5);
      ctx.fillStyle = MOOD_CONFIG[t.mood].color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    if (animationProgress < 1) {
      requestAnimationFrame(animate);
    }
  };

  const tooltip = document.createElement('div');
  tooltip.className = 'chart-tooltip';
  tooltip.style.display = 'none';
  canvas.parentElement?.appendChild(tooltip);

  let lastTooltipUpdate = 0;
  const THROTTLE_MS = 50;

  canvas.addEventListener('mousemove', (e) => {
    const now = performance.now();
    if (now - lastTooltipUpdate < THROTTLE_MS) return;
    lastTooltipUpdate = now;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let closest = -1;
    let closestDist = Infinity;

    trends.forEach((t, i) => {
      if (t.stars === 0) return;
      const x = padding.left + (chartW * i) / (trends.length - 1);
      const y = padding.top + chartH - (chartH * (t.stars / 5);
      const dist = Math.sqrt((mx - x) ** 2 + (my - y) ** 2);
      if (dist < 25 && dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });

    if (closest >= 0) {
      const t = trends[closest];
      const moodCfg = MOOD_CONFIG[t.mood];
      tooltip.style.display = 'block';
      tooltip.style.left = `${e.clientX - rect.left + 12}px`;
      tooltip.style.top = `${e.clientY - rect.top - 40}px`;
      tooltip.innerHTML = `
        <strong>${formatDate(t.date)}</strong><br/>
        心情: ${moodCfg.emoji} ${moodCfg.label}<br/>
        满意度: ${t.stars.toFixed(1)} 星
      `;
    } else {
      tooltip.style.display = 'none';
    }
  });

  canvas.addEventListener('mouseleave', () => {
    tooltip.style.display = 'none';
  });

  requestAnimationFrame(animate);
}

export function renderShareView(container: HTMLElement, diary: Diary): void {
  container.innerHTML = '';
  const moodCfg = MOOD_CONFIG[diary.mood];

  const view = document.createElement('div');
  view.className = 'share-view';
  view.innerHTML = `
    <div class="share-card">
      <div class="share-header">
        <div class="share-mood-bubble" style="background: ${moodCfg.color}">${moodCfg.emoji}</div>
        <div>
          <h1 class="share-title">${escapeHtml(diary.title)}</h1>
          <div class="share-meta">${formatDate(diary.date)} ${diary.weather}</div>
        </div>
        <div class="share-stars">${'★'.repeat(diary.stars)}${'☆'.repeat(5 - diary.stars)}</div>
      </div>
      <div class="share-divider"></div>
      <div class="share-content">${escapeHtml(diary.content)}</div>
      <div class="share-footer">
        <span style="color: ${moodCfg.color}">${moodCfg.emoji} ${moodCfg.label}</span>
      </div>
    </div>
    <button class="back-btn">返回主页面</button>
  `;

  const backBtn = view.querySelector('.back-btn');
  backBtn?.addEventListener('click', () => {
    window.location.hash = '#/';
  });

  container.appendChild(view);
}

export function renderShareNotFound(container: HTMLElement): void {
  container.innerHTML = `
    <div class="share-view">
      <div class="share-card not-found">
        <div class="empty-icon">🔍</div>
        <h3>日记不存在</h3>
        <p>这篇日记可能已被删除或链接无效</p>
      </div>
      <button class="back-btn">返回主页面</button>
    </div>
  `;
  const backBtn = container.querySelector('.back-btn');
  backBtn?.addEventListener('click', () => {
    window.location.hash = '#/';
  });
}

export interface FormCallbacks {
  onSubmit: (data: DiaryFormData) => void;
  onCancel: () => void;
}

export function renderDiaryForm(
  container: HTMLElement,
  callbacks: FormCallbacks,
  initialData?: Diary
): void {
  const today = new Date().toISOString().slice(0, 10);
  const defaultMood: MoodType = initialData?.mood || 'calm';
  const defaultWeather = initialData?.weather || '☀️';
  const defaultStars = initialData?.stars || 3;

  container.innerHTML = `
    <div class="form-overlay">
      <div class="form-modal">
        <h2>${initialData ? '编辑日记' : '新增日记'}</h2>
        <form id="diary-form">
          <div class="form-row">
            <label>日期</label>
            <input type="date" name="date" value="${initialData?.date || today}" required />
          </div>
          <div class="form-row">
            <label>标题</label>
            <input type="text" name="title" value="${escapeHtml(initialData?.title || '')}" placeholder="给今天起个标题" required maxlength="50" />
          </div>
          <div class="form-row">
            <label>心情</label>
            <div class="mood-selector">
              ${(['happy', 'sad', 'angry', 'calm'].map(m => {
                const cfg = MOOD_CONFIG[m as MoodType];
                const selected = (initialData?.mood || 'calm') === m;
                return `<button type="button" class="mood-btn ${selected ? 'selected' : ''}" data-mood="${m}" style="--mood-color: ${cfg.color}">
                  ${cfg.emoji}<span>${cfg.label}</span>
                </button>`;
              }).join('')}
            </div>
            <input type="hidden" name="mood" value="${defaultMood}" />
          </div>
          <div class="form-row">
            <label>天气</label>
            <div class="weather-selector">
              ${WEATHER_OPTIONS.map(w => `
                <button type="button" class="weather-btn ${(initialData?.weather || '☀️') === w ? 'selected' : ''}" data-weather="${w}">${w}</button>
              `).join('')}
            </div>
            <input type="hidden" name="weather" value="${defaultWeather}" />
          </div>
          <div class="form-row">
            <label>满意度</label>
            <div class="stars-selector">
              ${[1, 2, 3, 4, 5].map(s => `
                <button type="button" class="star-btn ${(initialData?.stars || 3) >= s ? 'filled' : ''}" data-star="${s}">★</button>
              `).join('')}
            </div>
            <input type="hidden" name="stars" value="${defaultStars}" />
          </div>
          <div class="form-row">
            <label>内容</label>
            <textarea name="content" rows="5" placeholder="记录今天的故事..." required maxlength="1000">${escapeHtml(initialData?.content || '')}</textarea>
          </div>
          <div class="form-actions">
            <button type="button" class="cancel-btn" type="button">取消</button>
            <button type="submit" class="submit-btn">保存</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const form = container.querySelector('#diary-form') as HTMLFormElement;
  const moodInput = form.querySelector('input[name="mood"]') as HTMLInputElement;
  const weatherInput = form.querySelector('input[name="weather"]') as HTMLInputElement;
  const starsInput = form.querySelector('input[name="stars"]') as HTMLInputElement;

  form.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      form.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      moodInput.value = (btn as HTMLElement).dataset.mood || 'calm';
    });
  });

  form.querySelectorAll('.weather-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      form.querySelectorAll('.weather-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      weatherInput.value = (btn as HTMLElement).dataset.weather || '☀️';
    });
  });

  form.querySelectorAll('.star-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const value = parseInt((btn as HTMLElement).dataset.star || '3');
      starsInput.value = String(value);
      form.querySelectorAll('.star-btn').forEach(b => {
        const s = parseInt((b as HTMLElement).dataset.star || '0');
        b.classList.toggle('filled', s <= value);
      });
    });
  });

  form.querySelector('.cancel-btn')?.addEventListener('click', () => {
    callbacks.onCancel();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    callbacks.onSubmit({
      date: fd.get('date') as string,
      title: fd.get('title') as string,
      content: fd.get('content') as string,
      mood: (fd.get('mood') as MoodType),
      weather: fd.get('weather') as string,
      stars: parseInt(fd.get('stars') as string, 10) as 1 | 2 | 3 | 4 | 5
    });
  });
}
