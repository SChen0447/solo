export class ControlsManager {
    constructor(gridManager, placedWordsEl) {
        this.state = {
            isActive: false,
            handle: null,
            wordId: null,
            startX: 0,
            startY: 0,
            startRotation: 0,
            startScale: 1,
            startOpacity: 1,
            centerX: 0,
            centerY: 0
        };
        this.tooltip = null;
        this.gridManager = gridManager;
        this.placedWordsEl = placedWordsEl;
    }
    handleDoubleClick(wordId, clientX, clientY) {
        this.gridManager.selectWord(wordId);
    }
    handleClickOutside() {
        if (!this.state.isActive) {
            this.gridManager.selectWord(null);
        }
    }
    startInteraction(wordId, handle, clientX, clientY) {
        const word = this.gridManager.getWordById(wordId);
        if (!word)
            return;
        const wordEl = this.placedWordsEl.querySelector(`[data-id="${wordId}"]`);
        const rect = wordEl.getBoundingClientRect();
        this.state = {
            isActive: true,
            handle,
            wordId,
            startX: clientX,
            startY: clientY,
            startRotation: word.rotation,
            startScale: word.scale,
            startOpacity: word.opacity,
            centerX: rect.left + rect.width / 2,
            centerY: rect.top + rect.height / 2
        };
        if (handle === 'zindex') {
            this.gridManager.bringToFront(wordId);
            this.showTooltip('置顶', clientX, clientY);
        }
    }
    handleMove(clientX, clientY) {
        if (!this.state.isActive || !this.state.wordId || !this.state.handle)
            return;
        const word = this.gridManager.getWordById(this.state.wordId);
        if (!word)
            return;
        switch (this.state.handle) {
            case 'rotate':
                this.handleRotate(word, clientX, clientY);
                break;
            case 'scale':
                this.handleScale(word, clientX, clientY);
                break;
            case 'opacity':
                this.handleOpacity(word, clientX, clientY);
                break;
        }
    }
    endInteraction() {
        this.state.isActive = false;
        this.state.handle = null;
        this.state.wordId = null;
        this.hideTooltip();
    }
    isActive() {
        return this.state.isActive;
    }
    handleRotate(word, clientX, clientY) {
        const angle = this.getAngle(this.state.centerX, this.state.centerY, clientX, clientY);
        const startAngle = this.getAngle(this.state.centerX, this.state.centerY, this.state.startX, this.state.startY);
        let rotation = this.state.startRotation + (angle - startAngle);
        rotation = ((rotation % 360) + 360) % 360;
        rotation = Math.round(rotation);
        this.gridManager.updateWord(word.id, { rotation });
        this.showTooltip(`${rotation}°`, clientX, clientY);
    }
    handleScale(word, clientX, clientY) {
        const startDist = this.getDistance(this.state.centerX, this.state.centerY, this.state.startX, this.state.startY);
        const currentDist = this.getDistance(this.state.centerX, this.state.centerY, clientX, clientY);
        if (startDist === 0)
            return;
        let scale = this.state.startScale * (currentDist / startDist);
        scale = Math.max(0.5, Math.min(2, scale));
        scale = Math.round(scale * 100) / 100;
        this.gridManager.updateWord(word.id, { scale });
        this.showTooltip(`${scale.toFixed(2)}x`, clientX, clientY);
    }
    handleOpacity(word, clientX, clientY) {
        const dy = clientY - this.state.startY;
        let opacity = this.state.startOpacity - dy / 200;
        opacity = Math.max(0.1, Math.min(1, opacity));
        opacity = Math.round(opacity * 100) / 100;
        this.gridManager.updateWord(word.id, { opacity });
        this.showTooltip(`${Math.round(opacity * 100)}%`, clientX, clientY);
    }
    getAngle(cx, cy, x, y) {
        return (Math.atan2(y - cy, x - cx) * 180) / Math.PI + 90;
    }
    getDistance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    }
    showTooltip(text, x, y) {
        if (!this.tooltip) {
            this.tooltip = document.createElement('div');
            this.tooltip.className = 'value-tooltip';
            document.body.appendChild(this.tooltip);
        }
        this.tooltip.textContent = text;
        this.tooltip.style.left = `${x + 15}px`;
        this.tooltip.style.top = `${y - 25}px`;
        this.tooltip.style.display = 'block';
    }
    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.style.display = 'none';
        }
    }
}
