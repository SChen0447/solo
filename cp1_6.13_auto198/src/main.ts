import { CanvasEngine, eventBus, FireworkRecipe, PatternType } from './canvasEngine';
import { audioEngine, WaveformType, getNoteName } from './audioEngine';

interface User {
  id: string;
  username: string;
}

interface SavedRecipe extends FireworkRecipe {
  id: string;
  userId: string;
  isPublic: boolean;
  createdAt: number;
  username?: string;
}

type View = 'login' | 'workshop' | 'collection' | 'gallery';

const PRESET_COLORS = [
  '#ff4757', '#ff6b35', '#ffa502', '#ffd32a',
  '#7bed9f', '#2ed573', '#1e90ff', '#3742fa',
  '#9b59b6', '#e056fd', '#ff6b81', '#ffffff'
];

const PATTERNS: PatternType[] = ['circle', 'star', 'heart', 'butterfly', 'spiral'];
const PATTERN_NAMES: Record<PatternType, string> = {
  circle: '圆形',
  star: '星形',
  heart: '心形',
  butterfly: '蝶形',
  spiral: '漩涡形'
};

const WAVEFORMS: WaveformType[] = ['sine', 'sawtooth', 'square', 'triangle'];
const WAVEFORM_NAMES: Record<WaveformType, string> = {
  sine: '正弦波',
  sawtooth: '锯齿波',
  square: '方波',
  triangle: '三角波'
};

class App {
  private container: HTMLElement;
  private canvasEngine: CanvasEngine | null = null;
  private currentUser: User | null = null;
  private currentView: View = 'login';
  private selectedTube: number | null = null;
  private editingRecipe: FireworkRecipe = {
    name: '新烟花',
    color: '#ff4757',
    pattern: 'circle',
    launchDuration: 1.2,
    pitch: 64
  };
  private savedRecipes: SavedRecipe[] = [];
  private galleryRecipes: SavedRecipe[] = [];
  private performanceRecipes: { recipe: SavedRecipe; time: number; tube: number }[] = [];
  private isPlaying: boolean = false;
  private playTimers: number[] = [];
  private globalBPM: number = 100;
  private globalWaveform: WaveformType = 'sine';
  private loopMode: boolean = false;
  private shuffleMode: boolean = false;

  constructor(container: HTMLElement) {
    this.container = container;
    this.init();
  }

  private async init(): Promise<void> {
    this.injectStyles();
    this.render();
    this.setupGlobalEvents();
    await audioEngine.init();
    window.addEventListener('resize', () => this.handleResize());
  }

  private setupGlobalEvents(): void {
    eventBus.on('firework:exploded', (data: { recipe: FireworkRecipe }) => {
      audioEngine.playNote(data.recipe.pitch, 0.3, 0.5);
    });
  }

  private handleResize(): void {
    if (this.canvasEngine) {
      this.canvasEngine.resize();
    }
  }

  private render(): void {
    this.container.innerHTML = '';
    switch (this.currentView) {
      case 'login': this.renderLogin(); break;
      case 'workshop': this.renderWorkshop(); break;
      case 'collection': this.renderCollection(); break;
      case 'gallery': this.renderGallery(); break;
    }
  }

  private renderLogin(): void {
    const wrap = document.createElement('div');
    wrap.className = 'login-container';
    wrap.innerHTML = `
      <div class="login-box">
        <h1 class="title">和弦·花火工坊</h1>
        <p class="subtitle">创造属于你的烟花交响曲</p>
        <div class="tabs">
          <button class="tab active" data-tab="login">登录</button>
          <button class="tab" data-tab="register">注册</button>
        </div>
        <form id="auth-form" class="auth-form">
          <div class="form-group">
            <label>用户名</label>
            <input type="text" id="username" required>
          </div>
          <div class="form-group">
            <label>密码</label>
            <input type="password" id="password" required>
          </div>
          <button type="submit" class="btn-primary">登录</button>
          <p class="error-message" id="error-msg"></p>
        </form>
      </div>
    `;
    this.container.appendChild(wrap);

    let isLogin = true;
    const tabs = wrap.querySelectorAll('.tab');
    const form = wrap.querySelector('#auth-form') as HTMLFormElement;
    const submitBtn = form.querySelector('.btn-primary') as HTMLButtonElement;
    const errorMsg = wrap.querySelector('#error-msg') as HTMLElement;

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        isLogin = (tab as HTMLElement).dataset.tab === 'login';
        submitBtn.textContent = isLogin ? '登录' : '注册';
        errorMsg.textContent = '';
      });
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = (form.querySelector('#username') as HTMLInputElement).value;
      const password = (form.querySelector('#password') as HTMLInputElement).value;
      try {
        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error);
        }
        const user = await res.json();
        this.currentUser = user;
        this.loadUserRecipes();
        this.currentView = 'workshop';
        this.render();
      } catch (err: any) {
        errorMsg.textContent = err.message;
      }
    });
  }

  private renderWorkshop(): void {
    this.container.innerHTML = `
      <div class="workshop-container">
        <nav class="top-nav">
          <div class="nav-left"><span class="nav-title">和弦·花火工坊</span></div>
          <div class="nav-center">
            <button class="nav-btn active" data-view="workshop">工坊</button>
            <button class="nav-btn" data-view="collection">收藏室</button>
            <button class="nav-btn" data-view="gallery">画廊</button>
          </div>
          <div class="nav-right">
            <span class="user-name">${this.currentUser?.username}</span>
            <button class="btn-logout" id="logout-btn">退出</button>
          </div>
        </nav>
        <div class="workshop-main">
          <canvas id="workshop-canvas"></canvas>
          <div class="timeline-panel">
            <div class="timeline-header">
              <span class="timeline-title">表演序列</span>
              <div class="timeline-controls">
                <button class="ctrl-btn" id="play-btn" title="播放">▶</button>
                <button class="ctrl-btn" id="stop-btn" title="停止">⏹</button>
                <label class="ctrl-label"><input type="checkbox" id="loop-check"> 循环</label>
                <label class="ctrl-label"><input type="checkbox" id="shuffle-check"> 随机</label>
              </div>
            </div>
            <div class="timeline-track" id="timeline-track">
              <div class="timeline-ruler" id="timeline-ruler"></div>
              <div class="timeline-content" id="timeline-content"></div>
            </div>
            <div class="timeline-footer">
              <div class="control-group">
                <label>BPM: <span id="bpm-value">100</span></label>
                <input type="range" id="bpm-slider" min="40" max="180" value="100">
              </div>
              <div class="control-group">
                <label>音色:</label>
                <div class="waveform-btns">
                  ${WAVEFORMS.map(w => `<button class="waveform-btn ${w === this.globalWaveform ? 'active' : ''}" data-wave="${w}">${WAVEFORM_NAMES[w]}</button>`).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="edit-overlay" id="edit-overlay" style="display:none;">
          <div class="edit-panel">
            <div class="edit-header">
              <h3>编辑烟花 <span id="tube-label">- 发射筒 1</span></h3>
              <button class="close-btn" id="close-edit">×</button>
            </div>
            <div class="edit-body">
              <div class="edit-section">
                <label class="section-label">烟花名称</label>
                <input type="text" id="recipe-name" value="新烟花" class="name-input">
              </div>
              <div class="edit-section">
                <label class="section-label">烟花颜色</label>
                <div class="color-palette">
                  ${PRESET_COLORS.map((c, i) => `<button class="color-swatch ${c === this.editingRecipe.color ? 'selected' : ''}" style="background:${c};" data-color="${c}"></button>`).join('')}
                </div>
              </div>
              <div class="edit-section">
                <label class="section-label">爆炸图案</label>
                <div class="pattern-grid">
                  ${PATTERNS.map(p => `
                    <button class="pattern-btn ${p === this.editingRecipe.pattern ? 'selected' : ''}" data-pattern="${p}">
                      <canvas class="pattern-preview" data-pattern-canvas="${p}" width="50" height="50"></canvas>
                      <span>${PATTERN_NAMES[p]}</span>
                    </button>
                  `).join('')}
                </div>
              </div>
              <div class="edit-section">
                <label class="section-label">升空时长: <span id="duration-value">1.2</span>秒</label>
                <input type="range" id="duration-slider" min="0.5" max="2" step="0.1" value="1.2" class="slider">
              </div>
              <div class="edit-section">
                <label class="section-label">配乐音高</label>
                <div class="piano-roll" id="piano-roll"></div>
              </div>
            </div>
            <div class="edit-footer">
              <button class="btn-secondary" id="save-recipe">保存配方</button>
              <button class="btn-primary" id="test-fire">试射</button>
            </div>
          </div>
        </div>
      </div>
    `;
    this.initWorkshopCanvas();
    this.setupWorkshopEvents();
    this.renderPatternPreviews();
    this.renderPianoRoll();
    this.renderTimeline();
  }

  private initWorkshopCanvas(): void {
    const canvas = document.getElementById('workshop-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    this.canvasEngine = new CanvasEngine(canvas);
    this.canvasEngine.start();
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const tubeIndex = this.canvasEngine?.getTubeIndexAtPosition(x, y);
      if (tubeIndex !== null && tubeIndex !== undefined) {
        this.selectedTube = tubeIndex;
        this.openEditPanel(tubeIndex);
      }
    });
  }

  private setupWorkshopEvents(): void {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = (btn as HTMLElement).dataset.view as View;
        if (view) {
          this.currentView = view;
          if (view === 'collection') this.loadUserRecipes();
          if (view === 'gallery') this.loadGallery();
          if (view !== 'workshop') this.canvasEngine?.stop();
          this.render();
        }
      });
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());

    const closeEdit = document.getElementById('close-edit');
    const editOverlay = document.getElementById('edit-overlay');
    if (closeEdit && editOverlay) {
      closeEdit.addEventListener('click', () => {
        editOverlay.style.display = 'none';
        this.selectedTube = null;
      });
    }

    document.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        const color = (swatch as HTMLElement).dataset.color;
        if (color) {
          this.editingRecipe.color = color;
          document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
          swatch.classList.add('selected');
          this.renderPatternPreviews();
        }
      });
    });

    document.querySelectorAll('.pattern-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pattern = (btn as HTMLElement).dataset.pattern as PatternType;
        if (pattern) {
          this.editingRecipe.pattern = pattern;
          document.querySelectorAll('.pattern-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          this.renderPatternPreviews();
        }
      });
    });

    const durationSlider = document.getElementById('duration-slider') as HTMLInputElement;
    const durationValue = document.getElementById('duration-value');
    if (durationSlider && durationValue) {
      durationSlider.addEventListener('input', () => {
        this.editingRecipe.launchDuration = parseFloat(durationSlider.value);
        durationValue.textContent = durationSlider.value;
      });
    }

    const nameInput = document.getElementById('recipe-name') as HTMLInputElement;
    if (nameInput) {
      nameInput.addEventListener('input', () => { this.editingRecipe.name = nameInput.value; });
    }

    const testFireBtn = document.getElementById('test-fire');
    if (testFireBtn) {
      testFireBtn.addEventListener('click', () => {
        if (this.selectedTube !== null && this.canvasEngine) {
          audioEngine.resume();
          this.canvasEngine.launchFirework(this.selectedTube, this.editingRecipe);
        }
      });
    }

    const saveRecipeBtn = document.getElementById('save-recipe');
    if (saveRecipeBtn) {
      saveRecipeBtn.addEventListener('click', async () => {
        if (!this.currentUser) return;
        try {
          const res = await fetch('/api/recipes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: this.currentUser.id, ...this.editingRecipe })
          });
          if (res.ok) {
            const recipe = await res.json();
            this.savedRecipes.push(recipe);
            alert('配方已保存！');
          }
        } catch (err) { console.error('保存失败', err); }
      });
    }

    const bpmSlider = document.getElementById('bpm-slider') as HTMLInputElement;
    const bpmValue = document.getElementById('bpm-value');
    if (bpmSlider && bpmValue) {
      bpmSlider.addEventListener('input', () => {
        this.globalBPM = parseInt(bpmSlider.value);
        bpmValue.textContent = bpmSlider.value;
        audioEngine.setBPM(this.globalBPM);
      });
    }

    document.querySelectorAll('.waveform-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const wave = (btn as HTMLElement).dataset.wave as WaveformType;
        if (wave) {
          this.globalWaveform = wave;
          audioEngine.setWaveform(wave);
          document.querySelectorAll('.waveform-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        }
      });
    });

    const playBtn = document.getElementById('play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        if (this.isPlaying) { this.stopPerformance(); playBtn.textContent = '▶'; }
        else { audioEngine.resume(); this.playPerformance(); playBtn.textContent = '⏸'; }
      });
    }
    const stopBtn = document.getElementById('stop-btn');
    if (stopBtn) {
      stopBtn.addEventListener('click', () => {
        this.stopPerformance();
        const pb = document.getElementById('play-btn');
        if (pb) pb.textContent = '▶';
      });
    }

    const loopCheck = document.getElementById('loop-check') as HTMLInputElement;
    if (loopCheck) loopCheck.addEventListener('change', () => { this.loopMode = loopCheck.checked; });

    const shuffleCheck = document.getElementById('shuffle-check') as HTMLInputElement;
    if (shuffleCheck) shuffleCheck.addEventListener('change', () => { this.shuffleMode = shuffleCheck.checked; });
  }

  private renderPatternPreviews(): void {
    PATTERNS.forEach(pattern => {
      const canvas = document.querySelector(`[data-pattern-canvas="${pattern}"]`) as HTMLCanvasElement;
      if (canvas && this.canvasEngine) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 50, 50);
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(0, 0, 50, 50);
          const thumb = this.canvasEngine.generateThumbnail({ ...this.editingRecipe, pattern }, 50);
          ctx.drawImage(thumb, 0, 0);
        }
      }
    });
  }

  private renderPianoRoll(): void {
    const pianoRoll = document.getElementById('piano-roll');
    if (!pianoRoll) return;
    const notes = [];
    for (let i = 60; i <= 72; i++) notes.push(i);
    notes.reverse();

    pianoRoll.innerHTML = `<div class="piano-keys">${notes.map(note => {
      const noteName = getNoteName(note);
      const isBlack = noteName.includes('#');
      return `<div class="piano-key ${isBlack ? 'black' : 'white'} ${this.editingRecipe.pitch === note ? 'active' : ''}" data-note="${note}"><span class="key-label">${noteName}</span></div>`;
    }).join('')}</div>`;

    pianoRoll.querySelectorAll('.piano-key').forEach(key => {
      key.addEventListener('click', () => {
        const note = parseInt((key as HTMLElement).dataset.note || '60');
        this.editingRecipe.pitch = note;
        pianoRoll.querySelectorAll('.piano-key').forEach(k => k.classList.remove('active'));
        key.classList.add('active');
        audioEngine.resume();
        audioEngine.playNote(note, 0.2, 0.3);
      });
    });
  }

  private openEditPanel(tubeIndex: number): void {
    const overlay = document.getElementById('edit-overlay');
    const tubeLabel = document.getElementById('tube-label');
    const nameInput = document.getElementById('recipe-name') as HTMLInputElement;
    if (overlay) overlay.style.display = 'flex';
    if (tubeLabel) tubeLabel.textContent = `- 发射筒 ${tubeIndex + 1}`;
    if (nameInput) nameInput.value = this.editingRecipe.name;
    const durationSlider = document.getElementById('duration-slider') as HTMLInputElement;
    const durationValue = document.getElementById('duration-value');
    if (durationSlider && durationValue) {
      durationSlider.value = this.editingRecipe.launchDuration.toString();
      durationValue.textContent = this.editingRecipe.launchDuration.toString();
    }
    this.renderPatternPreviews();
    this.renderPianoRoll();
  }

  private renderTimeline(): void {
    const ruler = document.getElementById('timeline-ruler');
    const content = document.getElementById('timeline-content');
    if (!ruler || !content) return;
    const duration = Math.max(10, Math.ceil(Math.max(...this.performanceRecipes.map(r => r.time)) + 3));
    const rulerWidth = duration * 50;
    ruler.innerHTML = '';
    for (let i = 0; i <= duration; i += 1) {
      const tick = document.createElement('div');
      tick.className = 'ruler-tick';
      tick.style.left = `${i * 50}px`;
      tick.textContent = `${i}s`;
      ruler.appendChild(tick);
    }
    ruler.style.width = `${rulerWidth}px`;
    content.innerHTML = '';
    content.style.width = `${rulerWidth}px`;

    this.performanceRecipes.forEach((item, index) => {
      const block = document.createElement('div');
      block.className = 'timeline-block';
      block.style.left = `${item.time * 50}px`;
      block.style.background = item.recipe.color;
      block.draggable = true;
      block.innerHTML = `<span class="block-name">${item.recipe.name}</span><span class="block-tube">筒${item.tube + 1}</span><button class="block-delete" data-index="${index}">×</button>`;
      block.addEventListener('dragstart', (e) => {
        (e as DragEvent).dataTransfer?.setData('recipe-index', index.toString());
      });
      const deleteBtn = block.querySelector('.block-delete');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.performanceRecipes.splice(index, 1);
          this.renderTimeline();
        });
      }
      content.appendChild(block);
    });

    content.addEventListener('dragover', (e) => { e.preventDefault(); });
    content.addEventListener('drop', (e) => {
      e.preventDefault();
      const rect = content.getBoundingClientRect();
      const x = (e as DragEvent).clientX - rect.left + content.scrollLeft;
      const time = Math.round(x / 50 * 10) / 10;
      const recipeId = (e as DragEvent).dataTransfer?.getData('recipe-id');
      const recipeIndex = (e as DragEvent).dataTransfer?.getData('recipe-index');
      if (recipeId) {
        const recipe = this.savedRecipes.find(r => r.id === recipeId);
        if (recipe) {
          const tube = this.performanceRecipes.length % 12;
          this.performanceRecipes.push({ recipe, time: Math.max(0, time), tube });
          this.performanceRecipes.sort((a, b) => a.time - b.time);
          this.renderTimeline();
        }
      } else if (recipeIndex !== undefined && recipeIndex !== '') {
        const idx = parseInt(recipeIndex);
        if (!isNaN(idx) && this.performanceRecipes[idx]) {
          this.performanceRecipes[idx].time = Math.max(0, time);
          this.performanceRecipes.sort((a, b) => a.time - b.time);
          this.renderTimeline();
        }
      }
    });
  }

  private playPerformance(): void {
    if (this.performanceRecipes.length === 0) {
      alert('请先从收藏室拖拽烟花到时间线！');
      return;
    }
    this.isPlaying = true;
    this.playTimers = [];
    let recipes = [...this.performanceRecipes];
    if (this.shuffleMode) recipes = recipes.sort(() => Math.random() - 0.5);
    const maxTime = Math.max(...recipes.map(r => r.time)) + 3;

    recipes.forEach(item => {
      const timer = window.setTimeout(() => {
        if (this.canvasEngine && this.isPlaying) {
          audioEngine.setWaveform(this.globalWaveform);
          this.canvasEngine.launchFirework(item.tube, item.recipe);
        }
      }, item.time * 1000);
      this.playTimers.push(timer);
    });

    const endTimer = window.setTimeout(() => {
      if (this.loopMode && this.isPlaying) {
        this.stopPerformance();
        this.playPerformance();
      } else {
        this.stopPerformance();
        const pb = document.getElementById('play-btn');
        if (pb) pb.textContent = '▶';
      }
    }, maxTime * 1000);
    this.playTimers.push(endTimer);
  }

  private stopPerformance(): void {
    this.isPlaying = false;
    this.playTimers.forEach(t => clearTimeout(t));
    this.playTimers = [];
  }

  private async loadUserRecipes(): Promise<void> {
    if (!this.currentUser) return;
    try {
      const res = await fetch(`/api/recipes?userId=${this.currentUser.id}`);
      if (res.ok) this.savedRecipes = await res.json();
    } catch (err) { console.error('加载配方失败', err); }
  }

  private async loadGallery(): Promise<void> {
    try {
      const res = await fetch('/api/gallery');
      if (res.ok) this.galleryRecipes = await res.json();
    } catch (err) { console.error('加载画廊失败', err); }
  }

  private logout(): void {
    this.currentUser = null;
    this.currentView = 'login';
    this.canvasEngine?.stop();
    this.canvasEngine = null;
    this.render();
  }

  private renderCollection(): void {
    this.container.innerHTML = `
      <div class="collection-container">
        <nav class="top-nav">
          <div class="nav-left"><span class="nav-title">和弦·花火工坊</span></div>
          <div class="nav-center">
            <button class="nav-btn" data-view="workshop">工坊</button>
            <button class="nav-btn active" data-view="collection">收藏室</button>
            <button class="nav-btn" data-view="gallery">画廊</button>
          </div>
          <div class="nav-right">
            <span class="user-name">${this.currentUser?.username}</span>
            <button class="btn-logout" id="logout-btn">退出</button>
          </div>
        </nav>
        <div class="collection-content">
          <h2 class="section-title">我的烟花收藏</h2>
          <p class="hint">提示：拖拽配方到工坊的时间线可添加到表演序列</p>
          <div class="shelf-container">
            ${[0, 1, 2].map(layer => `
              <div class="shelf shelf-${layer + 1}">
                <div class="shelf-label">第 ${layer + 1} 层</div>
                <div class="shelf-items">
                  ${this.savedRecipes.slice(layer * 8, layer * 8 + 8).map(recipe => `
                    <div class="recipe-card" draggable="true" data-recipe-id="${recipe.id}">
                      <canvas class="recipe-thumb" data-thumb-id="${recipe.id}" width="60" height="60"></canvas>
                      <span class="recipe-name">${recipe.name}</span>
                      <div class="recipe-actions">
                        <button class="action-btn" data-action="public" data-id="${recipe.id}" title="${recipe.isPublic ? '取消公开' : '公开到画廊'}">${recipe.isPublic ? '🌐' : '🔒'}</button>
                        <button class="action-btn" data-action="delete" data-id="${recipe.id}" title="删除">🗑️</button>
                      </div>
                    </div>
                  `).join('')}
                  ${Array(Math.max(0, 8 - this.savedRecipes.slice(layer * 8, layer * 8 + 8).length)).fill(0).map(() => `<div class="recipe-card empty"><span class="empty-slot">空</span></div>`).join('')}
                </div>
              </div>
            `).join('')}
          </div>
          <div class="action-section">
            <h3>复制配方给好友</h3>
            <div class="copy-form">
              <input type="text" id="search-user" placeholder="输入用户名搜索..." class="search-input">
              <div id="user-search-results" class="search-results"></div>
              <select id="recipe-select" class="recipe-select">
                <option value="">选择要复制的配方</option>
                ${this.savedRecipes.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
              </select>
              <button class="btn-primary" id="copy-btn">复制</button>
            </div>
          </div>
        </div>
      </div>
    `;
    this.setupCollectionEvents();
    this.renderRecipeThumbnails();
  }

  private renderRecipeThumbnails(): void {
    this.savedRecipes.forEach(recipe => {
      const canvas = document.querySelector(`[data-thumb-id="${recipe.id}"]`) as HTMLCanvasElement;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0d1117';
          ctx.fillRect(0, 0, 60, 60);
          const cx = 30, cy = 30;
          const particleCount = 25;
          for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            let r = 20;
            switch (recipe.pattern) {
              case 'circle': r = 15 + Math.random() * 10; break;
              case 'star':
                const sp = 5;
                const io = Math.floor(i / (particleCount / sp)) % 2 === 0;
                r = io ? 22 : 12;
                break;
              case 'heart':
                const t = (i / particleCount) * Math.PI * 2;
                const hx = 16 * Math.pow(Math.sin(t), 3);
                const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
                r = Math.sqrt(hx * hx + hy * hy) / 20 * 25;
                break;
              case 'butterfly':
                r = Math.abs(Math.cos(2 * angle)) * 18 + 5;
                break;
              case 'spiral':
                const p = i / particleCount;
                r = p * 22;
                const sa = p * Math.PI * 4;
                ctx.beginPath();
                ctx.arc(cx + Math.cos(sa) * r, cy + Math.sin(sa) * r, 2, 0, Math.PI * 2);
                ctx.fillStyle = recipe.color;
                ctx.fill();
                continue;
            }
            ctx.beginPath();
            ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = recipe.color;
            ctx.fill();
          }
        }
      }
    });
  }

  private setupCollectionEvents(): void {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = (btn as HTMLElement).dataset.view as View;
        if (view) {
          this.currentView = view;
          if (view === 'gallery') this.loadGallery();
          if (view === 'workshop') { /* will create canvas in render */ }
          this.render();
        }
      });
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());

    const searchInput = document.getElementById('search-user') as HTMLInputElement;
    const searchResults = document.getElementById('user-search-results');
    let searchTimeout: number;
    if (searchInput && searchResults) {
      searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = window.setTimeout(async () => {
          const q = searchInput.value.trim();
          if (q.length < 1) { searchResults.innerHTML = ''; return; }
          try {
            const res = await fetch(`/api/users?q=${encodeURIComponent(q)}`);
            if (res.ok) {
              const users = await res.json();
              searchResults.innerHTML = users.map((u: User) => `<div class="search-result-item" data-user-id="${u.id}" data-username="${u.username}">${u.username}</div>`).join('');
              searchResults.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                  searchInput.value = (item as HTMLElement).dataset.username || '';
                  searchResults.innerHTML = '';
                });
              });
            }
          } catch (err) { console.error('搜索失败', err); }
        }, 300);
      });
    }

    const copyBtn = document.getElementById('copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const username = (document.getElementById('search-user') as HTMLInputElement).value.trim();
        const recipeId = (document.getElementById('recipe-select') as HTMLSelectElement).value;
        if (!username || !recipeId) { alert('请选择用户名和配方'); return; }
        try {
          const userRes = await fetch(`/api/users?q=${encodeURIComponent(username)}`);
          const users = await userRes.json();
          const targetUser = users.find((u: User) => u.username === username);
          if (!targetUser) { alert('用户不存在'); return; }
          const res = await fetch(`/api/recipes/${recipeId}/copy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUserId: targetUser.id })
          });
          if (res.ok) alert('配方已复制！');
        } catch (err) { console.error('复制失败', err); }
      });
    }

    document.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = (btn as HTMLElement).dataset.action;
        const id = (btn as HTMLElement).dataset.id;
        if (!id) return;
        if (action === 'delete') {
          if (confirm('确定要删除这个配方吗？')) {
            try {
              const res = await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
              if (res.ok) { await this.loadUserRecipes(); this.render(); }
            } catch (err) { console.error('删除失败', err); }
          }
        } else if (action === 'public') {
          const recipe = this.savedRecipes.find(r => r.id === id);
          if (recipe) {
            try {
              const res = await fetch(`/api/recipes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPublic: !recipe.isPublic })
              });
              if (res.ok) { await this.loadUserRecipes(); this.render(); }
            } catch (err) { console.error('操作失败', err); }
          }
        }
      });
    });

    document.querySelectorAll('.recipe-card[draggable="true"]').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        const recipeId = (card as HTMLElement).dataset.recipeId;
        if (recipeId) (e as DragEvent).dataTransfer?.setData('recipe-id', recipeId);
      });
    });
  }

  private renderGallery(): void {
    this.container.innerHTML = `
      <div class="gallery-container">
        <nav class="top-nav">
          <div class="nav-left"><span class="nav-title">和弦·花火工坊</span></div>
          <div class="nav-center">
            <button class="nav-btn" data-view="workshop">工坊</button>
            <button class="nav-btn" data-view="collection">收藏室</button>
            <button class="nav-btn active" data-view="gallery">画廊</button>
          </div>
          <div class="nav-right">
            <span class="user-name">${this.currentUser?.username}</span>
            <button class="btn-logout" id="logout-btn">退出</button>
          </div>
        </nav>
        <div class="gallery-content">
          <h2 class="section-title">社区画廊</h2>
          <div class="gallery-grid">
            ${this.galleryRecipes.map(recipe => `
              <div class="gallery-item">
                <canvas class="gallery-thumb" data-gallery-id="${recipe.id}" width="60" height="60"></canvas>
                <div class="gallery-info">
                  <span class="gallery-name">${recipe.name}</span>
                  <span class="gallery-author">by ${recipe.username || '匿名'}</span>
                </div>
                <button class="btn-secondary collect-btn" data-id="${recipe.id}">收藏</button>
              </div>
            `).join('')}
          </div>
          ${this.galleryRecipes.length === 0 ? '<p class="empty-tip">画廊暂无公开配方</p>' : ''}
        </div>
      </div>
    `;
    this.setupGalleryEvents();
    this.renderGalleryThumbnails();
  }

  private renderGalleryThumbnails(): void {
    this.galleryRecipes.forEach(recipe => {
      const canvas = document.querySelector(`[data-gallery-id="${recipe.id}"]`) as HTMLCanvasElement;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0d1117';
          ctx.fillRect(0, 0, 60, 60);
          const cx = 30, cy = 30;
          const particleCount = 25;
          for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            let r = 20;
            switch (recipe.pattern) {
              case 'circle': r = 15 + Math.random() * 10; break;
              case 'star':
                const sp = 5;
                const io = Math.floor(i / (particleCount / sp)) % 2 === 0;
                r = io ? 22 : 12;
                break;
              case 'heart':
                const t = (i / particleCount) * Math.PI * 2;
                const hx = 16 * Math.pow(Math.sin(t), 3);
                const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
                r = Math.sqrt(hx * hx + hy * hy) / 20 * 25;
                break;
              case 'butterfly':
                r = Math.abs(Math.cos(2 * angle)) * 18 + 5;
                break;
              case 'spiral':
                const p = i / particleCount;
                r = p * 22;
                const sa = p * Math.PI * 4;
                ctx.beginPath();
                ctx.arc(cx + Math.cos(sa) * r, cy + Math.sin(sa) * r, 2, 0, Math.PI * 2);
                ctx.fillStyle = recipe.color;
                ctx.fill();
                continue;
            }
            ctx.beginPath();
            ctx.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = recipe.color;
            ctx.fill();
          }
        }
      }
    });
  }

  private setupGalleryEvents(): void {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = (btn as HTMLElement).dataset.view as View;
        if (view) {
          this.currentView = view;
          if (view === 'collection') this.loadUserRecipes();
          this.render();
        }
      });
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());

    document.querySelectorAll('.collect-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).dataset.id;
        if (!id || !this.currentUser) return;
        try {
          const res = await fetch(`/api/recipes/${id}/copy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUserId: this.currentUser!.id })
          });
          if (res.ok) {
            alert('已收藏到我的收藏室！');
            await this.loadUserRecipes();
          }
        } catch (err) { console.error('收藏失败', err); }
      });
    });
  }

  private injectStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; }
      .login-container {
        width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
        background: linear-gradient(135deg, #0b0f24 0%, #1a0e30 100%);
      }
      .login-box {
        background: rgba(26, 26, 46, 0.9); border-radius: 16px; padding: 40px; width: 400px;
        box-shadow: 0 0 40px rgba(100, 100, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.1);
      }
      .title {
        text-align: center; font-size: 28px; font-weight: bold; margin-bottom: 8px;
        background: linear-gradient(90deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #9b59b6);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      }
      .subtitle { text-align: center; color: #888; margin-bottom: 30px; font-size: 14px; }
      .tabs { display: flex; margin-bottom: 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
      .tab {
        flex: 1; padding: 12px; background: none; border: none; color: #888; cursor: pointer;
        font-size: 16px; border-bottom: 2px solid transparent; transition: all 0.3s;
      }
      .tab.active { color: #e0e0e0; border-bottom-color: #4d96ff; text-shadow: 0 0 10px rgba(77, 150, 255, 0.5); }
      .form-group { margin-bottom: 20px; }
      .form-group label { display: block; margin-bottom: 8px; color: #aaa; font-size: 14px; }
      .form-group input {
        width: 100%; padding: 12px; background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: #e0e0e0;
        font-size: 14px; outline: none; transition: border-color 0.3s;
      }
      .form-group input:focus { border-color: #4d96ff; box-shadow: 0 0 10px rgba(77, 150, 255, 0.3); }
      .btn-primary {
        width: 100%; padding: 12px; background: linear-gradient(135deg, #4d96ff, #6bcbff);
        border: none; border-radius: 8px; color: white; font-size: 16px; font-weight: bold;
        cursor: pointer; transition: all 0.3s;
      }
      .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 5px 20px rgba(77, 150, 255, 0.4); }
      .btn-secondary {
        padding: 8px 16px; background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 6px; color: #e0e0e0;
        font-size: 14px; cursor: pointer; transition: all 0.3s;
      }
      .btn-secondary:hover { background: rgba(255, 255, 255, 0.2); }
      .error-message { color: #ff6b6b; text-align: center; margin-top: 12px; font-size: 14px; min-height: 20px; }
      
      .workshop-container, .collection-container, .gallery-container {
        width: 100%; height: 100%; display: flex; flex-direction: column; background: #0a0e27;
      }
      .top-nav {
        height: 56px; background: rgba(26, 26, 46, 0.95); display: flex; align-items: center;
        justify-content: space-between; padding: 0 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      .nav-title {
        font-size: 18px; font-weight: bold;
        background: linear-gradient(90deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      }
      .nav-center { display: flex; gap: 10px; }
      .nav-btn {
        padding: 8px 20px; background: none; border: none; color: #888; cursor: pointer;
        font-size: 14px; border-radius: 6px; transition: all 0.3s;
      }
      .nav-btn.active, .nav-btn:hover { color: #e0e0e0; background: rgba(77, 150, 255, 0.2); }
      .nav-right { display: flex; align-items: center; gap: 15px; }
      .user-name { color: #aaa; font-size: 14px; }
      .btn-logout {
        padding: 6px 14px; background: rgba(255, 107, 107, 0.2);
        border: 1px solid rgba(255, 107, 107, 0.3); border-radius: 6px; color: #ff6b6b;
        font-size: 12px; cursor: pointer; transition: all 0.3s;
      }
      .btn-logout:hover { background: rgba(255, 107, 107, 0.3); }
      
      .workshop-main { flex: 1; display: flex; flex-direction: column; position: relative; overflow: hidden; }
      #workshop-canvas { flex: 1; width: 100%; display: block; }
      
      .timeline-panel {
        height: 200px; background: rgba(26, 26, 46, 0.95);
        border-top: 1px solid rgba(255, 255, 255, 0.1); display: flex; flex-direction: column;
      }
      .timeline-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 10px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      .timeline-title { font-size: 14px; font-weight: bold; color: #e0e0e0; }
      .timeline-controls { display: flex; align-items: center; gap: 10px; }
      .ctrl-btn {
        width: 32px; height: 32px; background: rgba(77, 150, 255, 0.2);
        border: 1px solid rgba(77, 150, 255, 0.4); border-radius: 6px; color: #6bcbff;
        cursor: pointer; font-size: 14px; transition: all 0.3s;
      }
      .ctrl-btn:hover { background: rgba(77, 150, 255, 0.4); }
      .ctrl-label { display: flex; align-items: center; gap: 4px; color: #aaa; font-size: 12px; cursor: pointer; }
      .timeline-track { flex: 1; overflow-x: auto; overflow-y: hidden; position: relative; }
      .timeline-ruler { height: 24px; position: relative; background: rgba(0, 0, 0, 0.2); border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
      .ruler-tick {
        position: absolute; top: 0; font-size: 10px; color: #666; padding-left: 4px;
        border-left: 1px solid rgba(255, 255, 255, 0.1); height: 100%; width: 50px;
      }
      .timeline-content { height: 60px; position: relative; background: rgba(0, 0, 0, 0.1); }
      .timeline-block {
        position: absolute; top: 10px; width: 44px; height: 40px; border-radius: 6px;
        cursor: move; display: flex; flex-direction: column; align-items: center; justify-content: center;
        font-size: 10px; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        box-shadow: 0 0 10px currentColor; border: 1px solid rgba(255,255,255,0.3);
      }
      .block-name { font-size: 9px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; padding: 0 2px; }
      .block-tube { font-size: 8px; opacity: 0.8; }
      .block-delete {
        position: absolute; top: -6px; right: -6px; width: 16px; height: 16px; border-radius: 50%;
        background: #ff4757; border: none; color: white; font-size: 10px; cursor: pointer;
        display: none; line-height: 1;
      }
      .timeline-block:hover .block-delete { display: block; }
      .timeline-footer {
        display: flex; align-items: center; justify-content: space-around;
        padding: 10px 20px; border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
      .control-group { display: flex; align-items: center; gap: 10px; }
      .control-group label { font-size: 12px; color: #aaa; min-width: 60px; }
      .control-group input[type="range"] { width: 120px; }
      .waveform-btns { display: flex; gap: 4px; }
      .waveform-btn {
        padding: 4px 10px; background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px;
        color: #888; font-size: 11px; cursor: pointer; transition: all 0.3s;
      }
      .waveform-btn.active {
        background: rgba(77, 150, 255, 0.3); border-color: rgba(77, 150, 255, 0.6); color: #6bcbff;
      }
      
      .edit-overlay {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center; z-index: 1000;
      }
      .edit-panel {
        background: rgba(26, 26, 46, 0.92); border-radius: 16px; width: 500px; max-width: 90vw;
        max-height: 90vh; overflow-y: auto; box-shadow: 0 0 60px rgba(77, 150, 255, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1); position: relative;
      }
      .edit-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      .edit-header h3 { font-size: 18px; color: #e0e0e0; }
      #tube-label { color: #888; font-size: 14px; font-weight: normal; }
      .close-btn {
        width: 32px; height: 32px; background: none; border: none; color: #888;
        font-size: 24px; cursor: pointer; border-radius: 6px; transition: all 0.3s;
      }
      .close-btn:hover { background: rgba(255, 255, 255, 0.1); color: #e0e0e0; }
      .edit-body { padding: 20px; }
      .edit-section { margin-bottom: 24px; }
      .section-label { display: block; margin-bottom: 12px; color: #aaa; font-size: 14px; font-weight: 500; }
      .name-input {
        width: 100%; padding: 10px 14px; background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px;
        color: #e0e0e0; font-size: 14px; outline: none;
      }
      .name-input:focus { border-color: #4d96ff; box-shadow: 0 0 10px rgba(77, 150, 255, 0.3); }
      .color-palette { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
      .color-swatch {
        aspect-ratio: 1; border: 3px solid transparent; border-radius: 8px;
        cursor: pointer; transition: all 0.3s; position: relative;
      }
      .color-swatch.selected {
        border-color: #fff; transform: scale(1.1); box-shadow: 0 0 20px currentColor;
      }
      .pattern-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
      .pattern-btn {
        display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 10px 6px;
        background: rgba(0, 0, 0, 0.3); border: 2px solid transparent; border-radius: 8px;
        cursor: pointer; transition: all 0.3s;
      }
      .pattern-btn:hover { background: rgba(77, 150, 255, 0.1); }
      .pattern-btn.selected {
        border-color: #4d96ff; background: rgba(77, 150, 255, 0.2); box-shadow: 0 0 15px rgba(77, 150, 255, 0.3);
      }
      .pattern-preview { border-radius: 4px; }
      .pattern-btn span { font-size: 12px; color: #aaa; }
      .pattern-btn.selected span { color: #e0e0e0; }
      .slider {
        width: 100%; height: 6px; -webkit-appearance: none; appearance: none;
        background: rgba(255, 255, 255, 0.1); border-radius: 3px; outline: none;
      }
      .slider::-webkit-slider-thumb {
        -webkit-appearance: none; appearance: none; width: 18px; height: 18px;
        background: #4d96ff; border-radius: 50%; cursor: pointer;
        box-shadow: 0 0 10px rgba(77, 150, 255, 0.5);
      }
      .piano-roll { display: flex; justify-content: center; }
      .piano-keys { display: flex; flex-direction: column; gap: 2px; }
      .piano-key {
        height: 28px; width: 120px; display: flex; align-items: center; justify-content: space-between;
        padding: 0 12px; cursor: pointer; border-radius: 4px; transition: all 0.2s; font-size: 11px;
      }
      .piano-key.white { background: rgba(255, 255, 255, 0.9); color: #333; }
      .piano-key.black {
        background: #2a2a3a; color: #aaa; width: 90px; margin-left: 30px; font-size: 10px;
      }
      .piano-key:hover { background: #4d96ff; color: white; }
      .piano-key.active {
        background: linear-gradient(135deg, #4d96ff, #6bcbff); color: white;
        box-shadow: 0 0 15px rgba(77, 150, 255, 0.5);
      }
      .key-label { font-family: monospace; }
      .edit-footer {
        display: flex; justify-content: space-between; padding: 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.1); gap: 10px;
      }
      .edit-footer .btn-primary { flex: 1; }
      .edit-footer .btn-secondary { flex: 1; width: auto; }
      
      .collection-content, .gallery-content {
        flex: 1; overflow-y: auto; padding: 30px;
        background: radial-gradient(ellipse at center top, rgba(139, 92, 246, 0.1), transparent 50%), #0d1117;
      }
      .section-title {
        font-size: 24px; color: #e0e0e0; margin-bottom: 8px; text-align: center;
        text-shadow: 0 0 20px rgba(77, 150, 255, 0.3);
      }
      .hint { text-align: center; color: #666; margin-bottom: 20px; font-size: 13px; }
      
      .shelf-container {
        max-width: 900px; margin: 0 auto; padding: 20px 0;
      }
      .shelf {
        margin-bottom: 30px;
        background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%);
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.05);
        padding: 15px 20px;
      }
      .shelf-label {
        font-size: 14px; color: #888; margin-bottom: 12px; font-weight: 500;
      }
      .shelf-items {
        display: flex; gap: 15px; justify-content: flex-start; flex-wrap: nowrap;
      }
      .recipe-card {
        width: 80px; display: flex; flex-direction: column; align-items: center; gap: 6px;
        padding: 8px; background: rgba(0, 0, 0, 0.2); border-radius: 8px;
        border: 1px solid #444; cursor: grab; transition: all 0.3s; position: relative;
      }
      .recipe-card:hover {
        transform: translateY(-3px); border-color: #4d96ff;
        box-shadow: 0 5px 20px rgba(77, 150, 255, 0.3);
      }
      .recipe-card.empty { cursor: default; opacity: 0.3; }
      .recipe-card.empty:hover { transform: none; border-color: #444; box-shadow: none; }
      .recipe-thumb { border-radius: 4px; }
      .recipe-name {
        font-size: 11px; color: #ccc; text-align: center; overflow: hidden;
        text-overflow: ellipsis; white-space: nowrap; width: 100%;
      }
      .empty-slot { color: #555; font-size: 12px; padding: 20px 0; }
      .recipe-actions {
        position: absolute; top: 2px; right: 2px; display: flex; gap: 2px; opacity: 0;
        transition: opacity 0.3s;
      }
      .recipe-card:hover .recipe-actions { opacity: 1; }
      .action-btn {
        width: 20px; height: 20px; border: none; border-radius: 4px;
        background: rgba(0, 0, 0, 0.5); cursor: pointer; font-size: 10px; padding: 0;
      }
      .action-btn:hover { background: rgba(255, 255, 255, 0.2); }
      
      .action-section {
        max-width: 600px; margin: 30px auto 0; padding: 20px;
        background: rgba(26, 26, 46, 0.6); border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.05);
      }
      .action-section h3 {
        font-size: 16px; color: #e0e0e0; margin-bottom: 16px; text-align: center;
      }
      .copy-form { display: flex; flex-direction: column; gap: 10px; align-items: center; }
      .search-input, .recipe-select {
        width: 100%; padding: 10px 14px; background: rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px;
        color: #e0e0e0; font-size: 14px; outline: none;
      }
      .search-input:focus, .recipe-select:focus {
        border-color: #4d96ff; box-shadow: 0 0 10px rgba(77, 150, 255, 0.3);
      }
      .search-results {
        width: 100%; max-height: 150px; overflow-y: auto; background: rgba(0, 0, 0, 0.5);
        border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1); display: none;
      }
      .search-results:not(:empty) { display: block; }
      .search-result-item {
        padding: 8px 12px; cursor: pointer; font-size: 13px; color: #ccc;
      }
      .search-result-item:hover { background: rgba(77, 150, 255, 0.2); }
      
      .gallery-grid {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 20px; max-width: 900px; margin: 0 auto;
      }
      .gallery-item {
        background: rgba(26, 26, 46, 0.6); border-radius: 12px;
        padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 10px;
        border: 1px solid rgba(255, 255, 255, 0.05); transition: all 0.3s;
      }
      .gallery-item:hover {
        transform: translateY(-3px); border-color: #4d96ff;
        box-shadow: 0 5px 20px rgba(77, 150, 255, 0.2);
      }
      .gallery-thumb { border-radius: 6px; }
      .gallery-info {
        display: flex; flex-direction: column; align-items: center; gap: 2px;
      }
      .gallery-name { font-size: 13px; color: #e0e0e0; font-weight: 500; }
      .gallery-author { font-size: 11px; color: #888; }
      .collect-btn { width: 100%; }
      .empty-tip { text-align: center; color: #666; padding: 40px; }
      
      @media (max-width: 768px) {
        .workshop-main { overflow: visible; }
        .timeline-panel { height: 180px; }
        .edit-panel { width: 95vw; max-width: 95vw; max-height: 95vh; }
        .shelf-items { overflow-x: auto; }
        .gallery-grid { grid-template-columns: repeat(2, 1fr); }
        .nav-btn { padding: 8px 12px; font-size: 12px; }
        .nav-title { font-size: 14px; }
      }
    `;
    document.head.appendChild(style);
  }
}

const app = document.getElementById('app');
if (app) {
  new App(app);
}
