const STORAGE_KEY = 'color_perception_scores';
const GAME_DURATION = 30;
export class UIController {
    constructor(colorMatrix, colorChecker) {
        Object.defineProperty(this, "colorMatrix", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "colorChecker", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "state", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "timerInterval", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "resizeTimer", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: null
        });
        Object.defineProperty(this, "$matrix", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "$statsPanel", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "$timerDisplay", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "$foundCount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "$accuracyDisplay", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "$historyList", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "$startBtn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "$filterGroup", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "$toggleLabelsBtn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "$colorInput", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "$checkBtn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "$preview1", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "$preview2", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "$contrastResult", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "$alternativesSection", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "$alternativesGrid", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.colorMatrix = colorMatrix;
        this.colorChecker = colorChecker;
        this.state = {
            gameActive: false,
            timeLeft: GAME_DURATION,
            foundCount: 0,
            totalClicks: 0,
            correctClicks: 0,
            scores: this.loadScores(),
            currentFilter: 'none',
            showLabels: false,
        };
    }
    initLayout() {
        this.cacheDomReferences();
        this.renderHistory();
        this.renderMatrix();
        this.bindEvents();
        this.handleResize();
        requestAnimationFrame(() => {
            this.$statsPanel.classList.add('visible');
        });
    }
    cacheDomReferences() {
        this.$matrix = document.getElementById('colorMatrix');
        this.$statsPanel = document.getElementById('statsPanel');
        this.$timerDisplay = document.getElementById('timerDisplay');
        this.$foundCount = document.getElementById('foundCount');
        this.$accuracyDisplay = document.getElementById('accuracyDisplay');
        this.$historyList = document.getElementById('historyList');
        this.$startBtn = document.getElementById('startBtn');
        this.$filterGroup = document.getElementById('filterGroup');
        this.$toggleLabelsBtn = document.getElementById('toggleLabelsBtn');
        this.$colorInput = document.getElementById('colorInput');
        this.$checkBtn = document.getElementById('checkBtn');
        this.$preview1 = document.getElementById('preview1');
        this.$preview2 = document.getElementById('preview2');
        this.$contrastResult = document.getElementById('contrastResult');
        this.$alternativesSection = document.getElementById('alternativesSection');
        this.$alternativesGrid = document.getElementById('alternativesGrid');
    }
    bindEvents() {
        this.$startBtn.addEventListener('click', () => this.startGame());
        this.$filterGroup.addEventListener('click', (e) => {
            const target = e.target;
            if (target.dataset.filter) {
                this.setFilter(target.dataset.filter);
            }
        });
        this.$toggleLabelsBtn.addEventListener('click', () => {
            this.state.showLabels = !this.state.showLabels;
            this.$matrix.classList.toggle('show-labels', this.state.showLabels);
            this.$toggleLabelsBtn.textContent = this.state.showLabels ? '隐藏颜色标注' : '显示颜色标注';
        });
        this.$matrix.addEventListener('click', (e) => this.handleMatrixClick(e));
        this.$checkBtn.addEventListener('click', () => this.handleContrastCheck());
        this.$colorInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.handleContrastCheck();
            }
        });
        window.addEventListener('resize', () => {
            if (this.resizeTimer) {
                window.clearTimeout(this.resizeTimer);
            }
            this.resizeTimer = window.setTimeout(() => this.handleResize(), 100);
        });
    }
    renderMatrix() {
        const blocks = this.colorMatrix.generateMatrix();
        const fragment = document.createDocumentFragment();
        blocks.forEach((block) => {
            const el = document.createElement('div');
            el.className = 'color-block';
            el.style.backgroundColor = `hsl(${block.hsl.h}, ${block.hsl.s}%, ${block.hsl.l}%)`;
            el.dataset.row = String(block.row);
            el.dataset.col = String(block.col);
            el.dataset.index = String(block.row * this.colorMatrix.cols + block.col);
            const glowColor = block.hex;
            el.style.setProperty('--glow-color', glowColor);
            const label = document.createElement('div');
            label.className = 'color-label';
            label.textContent = `${block.name} ${block.hex}`;
            el.appendChild(label);
            fragment.appendChild(el);
        });
        this.$matrix.innerHTML = '';
        this.$matrix.appendChild(fragment);
        if (this.state.showLabels) {
            this.$matrix.classList.add('show-labels');
        }
        this.colorMatrix.applyFilter(this.state.currentFilter, this.$matrix);
    }
    handleMatrixClick(e) {
        const target = e.target;
        const blockEl = target.closest('.color-block');
        if (!blockEl)
            return;
        if (!this.state.gameActive) {
            return;
        }
        const index = parseInt(blockEl.dataset.index || '-1', 10);
        if (index < 0)
            return;
        const block = this.colorMatrix.matrix[index];
        if (!block)
            return;
        this.state.totalClicks++;
        if (block.isTarget && !block.found) {
            block.found = true;
            this.state.correctClicks++;
            this.state.foundCount++;
            blockEl.classList.add('found');
            this.showRipple(blockEl);
            this.updateStats();
            if (this.state.foundCount >= this.colorMatrix.targetCount) {
                this.endGame();
            }
        }
        else if (!block.isTarget) {
            this.flashError(blockEl);
            this.state.timeLeft = Math.max(0, this.state.timeLeft - 1);
            this.updateStats();
            if (this.state.timeLeft <= 0) {
                this.endGame();
            }
        }
        this.updateAccuracy();
    }
    showRipple(element) {
        const ripple = document.createElement('div');
        ripple.className = 'ripple';
        element.appendChild(ripple);
        setTimeout(() => ripple.remove(), 500);
    }
    flashError(element) {
        element.classList.add('error');
        setTimeout(() => element.classList.remove('error'), 300);
    }
    startGame() {
        this.state.gameActive = true;
        this.state.timeLeft = GAME_DURATION;
        this.state.foundCount = 0;
        this.state.totalClicks = 0;
        this.state.correctClicks = 0;
        this.renderMatrix();
        this.updateStats();
        this.updateAccuracy();
        this.$timerDisplay.classList.remove('warning');
        if (this.timerInterval) {
            window.clearInterval(this.timerInterval);
        }
        this.timerInterval = window.setInterval(() => {
            this.state.timeLeft--;
            this.updateStats();
            if (this.state.timeLeft <= 5) {
                this.$timerDisplay.classList.add('warning');
            }
            if (this.state.timeLeft <= 0) {
                this.endGame();
            }
        }, 1000);
    }
    endGame() {
        if (this.timerInterval) {
            window.clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        this.state.gameActive = false;
        const accuracy = this.state.totalClicks > 0
            ? Math.round((this.state.correctClicks / this.state.totalClicks) * 100)
            : 0;
        const usedTime = GAME_DURATION - this.state.timeLeft;
        const avgTime = this.state.correctClicks > 0
            ? Math.round((usedTime / this.state.correctClicks) * 10) / 10
            : 0;
        this.saveScore(accuracy, avgTime);
        this.renderHistory();
    }
    updateStats() {
        this.$timerDisplay.textContent = String(this.state.timeLeft);
        this.$foundCount.textContent = String(this.state.foundCount);
    }
    updateAccuracy() {
        if (this.state.totalClicks > 0) {
            const acc = Math.round((this.state.correctClicks / this.state.totalClicks) * 100);
            this.$accuracyDisplay.textContent = `${acc}%`;
        }
        else {
            this.$accuracyDisplay.textContent = '--';
        }
    }
    setFilter(type) {
        this.state.currentFilter = type;
        this.colorMatrix.applyFilter(type, this.$matrix);
        const buttons = this.$filterGroup.querySelectorAll('.filter-btn');
        buttons.forEach((btn) => {
            const el = btn;
            el.classList.toggle('active', el.dataset.filter === type);
        });
    }
    handleContrastCheck() {
        const raw = this.$colorInput.value.trim();
        const parts = raw.split(',').map(p => p.trim());
        if (parts.length !== 2) {
            this.$contrastResult.innerHTML = '<span style="color:#f85149">请输入两个颜色，用逗号分隔</span>';
            return;
        }
        const c1 = this.colorChecker.parseColor(parts[0]);
        const c2 = this.colorChecker.parseColor(parts[1]);
        if (!c1 || !c2) {
            this.$contrastResult.innerHTML = '<span style="color:#f85149">颜色格式无效，请使用 #RRGGBB 或标准颜色名称</span>';
            return;
        }
        this.$preview1.style.backgroundColor = c1;
        this.$preview2.style.backgroundColor = c2;
        this.$preview1.style.color = this.getTextColor(c1);
        this.$preview2.style.color = this.getTextColor(c2);
        this.$preview1.textContent = c1;
        this.$preview2.textContent = c2;
        const result = this.colorChecker.checkContrast(c1, c2);
        this.renderContrastResult(result);
    }
    getTextColor(bgHex) {
        const r = parseInt(bgHex.slice(1, 3), 16);
        const g = parseInt(bgHex.slice(3, 5), 16);
        const b = parseInt(bgHex.slice(5, 7), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#0d1117' : '#f0f6fc';
    }
    renderContrastResult(result) {
        const aaClass = result.passAA ? 'pass' : 'fail';
        const aaaClass = result.passAAA ? 'pass' : 'fail';
        let html = `
      <div class="contrast-ratio">${result.ratio.toFixed(2)} : 1</div>
      <div class="contrast-badges">
        <span class="badge ${aaClass}">WCAG AA ${result.passAA ? '✓ 通过' : '✗ 未达'}</span>
        <span class="badge ${aaaClass}">WCAG AAA ${result.passAAA ? '✓ 通过' : '✗ 未达'}</span>
      </div>
    `;
        if (!result.passAA) {
            html += '<div class="warning-text">⚠ 当前对比度不足</div>';
        }
        this.$contrastResult.innerHTML = html;
        if (result.alternatives.length > 0) {
            this.renderAlternatives(result.alternatives);
            this.$alternativesSection.style.display = 'block';
        }
        else {
            this.$alternativesSection.style.display = 'none';
        }
    }
    renderAlternatives(alts) {
        this.$alternativesGrid.innerHTML = '';
        alts.forEach((alt) => {
            const item = document.createElement('div');
            item.className = 'alt-item';
            const swatches = document.createElement('div');
            swatches.className = 'alt-swatches';
            const s1 = document.createElement('div');
            s1.className = 'alt-swatch';
            s1.style.backgroundColor = alt.color1;
            const s2 = document.createElement('div');
            s2.className = 'alt-swatch';
            s2.style.backgroundColor = alt.color2;
            swatches.appendChild(s1);
            swatches.appendChild(s2);
            const ratio = document.createElement('div');
            ratio.className = 'alt-ratio';
            ratio.textContent = `${alt.ratio.toFixed(2)}:1 ${alt.color1} / ${alt.color2}`;
            item.appendChild(swatches);
            item.appendChild(ratio);
            item.addEventListener('click', () => {
                this.$colorInput.value = `${alt.color1}, ${alt.color2}`;
                this.handleContrastCheck();
            });
            this.$alternativesGrid.appendChild(item);
        });
    }
    saveScore(accuracy, avgTime) {
        this.state.scores.unshift({
            accuracy,
            avgTime,
            timestamp: Date.now(),
        });
        this.state.scores = this.state.scores.slice(0, 5);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state.scores));
        }
        catch (e) {
            // ignore storage errors
        }
    }
    loadScores() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    return parsed.slice(0, 5);
                }
            }
        }
        catch (e) {
            // ignore
        }
        return [];
    }
    renderHistory() {
        if (this.state.scores.length === 0) {
            this.$historyList.innerHTML = '<div style="color:#6e7681;font-size:12px">暂无历史记录，开始游戏吧！</div>';
            return;
        }
        this.$historyList.innerHTML = '';
        this.state.scores.forEach((score, i) => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
        <span style="color:#8b949e">#${i + 1}</span>
        <span class="history-acc">${score.accuracy}%</span>
        <span class="history-time">${score.avgTime}s/个</span>
      `;
            this.$historyList.appendChild(item);
        });
    }
    handleResize() {
        // responsive adjustments handled via CSS media queries
        // this method can be extended for JS-based responsive logic if needed
    }
}
