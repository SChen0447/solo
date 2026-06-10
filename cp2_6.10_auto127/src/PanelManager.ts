import { TransformController, TransformParams, ParamKey, Snapshot } from './TransformController';

interface ParamConfig {
  key: ParamKey;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

const PARAM_CONFIGS: ParamConfig[] = [
  { key: 'transformOriginX', label: 'Transform Origin X', min: -200, max: 200, step: 10, unit: '%' },
  { key: 'rotateX', label: 'Rotate X', min: -180, max: 180, step: 1, unit: '°' },
  { key: 'rotateY', label: 'Rotate Y', min: -180, max: 180, step: 1, unit: '°' },
  { key: 'perspective', label: 'Perspective', min: 100, max: 1000, step: 10, unit: 'px' },
  { key: 'translateZ', label: 'Translate Z', min: -200, max: 200, step: 1, unit: 'px' }
];

const PERSPECTIVE_ORIGIN_CONFIGS: ParamConfig[] = [
  { key: 'perspectiveOriginX', label: 'Perspective Origin X', min: 0, max: 100, step: 1, unit: '%' },
  { key: 'perspectiveOriginY', label: 'Perspective Origin Y', min: 0, max: 100, step: 1, unit: '%' }
];

export interface PanelManagerElements {
  controlPanel: HTMLElement;
  previewContainer: HTMLElement;
  bottomPanel: HTMLElement;
}

export class PanelManager {
  private elements: PanelManagerElements;
  private controller: TransformController;
  private paramInputs: Map<ParamKey, { slider: HTMLInputElement; number: HTMLInputElement; value: HTMLElement }> = new Map();
  private snapshotsContainer: HTMLElement | null = null;
  private draggedSnapshotId: string | null = null;
  private activeTab: 'snapshots' | 'timeline' = 'snapshots';
  private keyframeDots: Map<number, HTMLElement> = new Map();
  private progressIndicator: HTMLElement | null = null;
  private progressFill: HTMLElement | null = null;
  private onPlayCallback: (() => void) | null = null;
  private onStopCallback: (() => void) | null = null;

  constructor(elements: PanelManagerElements, controller: TransformController) {
    this.elements = elements;
    this.controller = controller;
    this.buildUI();
  }

  private buildUI(): void {
    this.buildControlPanel();
    this.buildBottomPanel();
  }

  private buildControlPanel(): void {
    const panel = this.elements.controlPanel;
    panel.innerHTML = '';

    const title = document.createElement('h2');
    title.textContent = '3D Transform Parameters';
    panel.appendChild(title);

    PARAM_CONFIGS.forEach(config => {
      this.createParamGroup(panel, config);
    });

    const poTitle = document.createElement('div');
    poTitle.style.cssText = 'margin: 24px 0 12px; font-size: 14px; font-weight: 600; color: #74b9ff;';
    poTitle.textContent = 'Perspective Origin';
    panel.appendChild(poTitle);

    PERSPECTIVE_ORIGIN_CONFIGS.forEach(config => {
      this.createParamGroup(panel, config);
    });

    const btnGroup = document.createElement('div');
    btnGroup.style.cssText = 'display: flex; gap: 8px; margin-top: 24px;';

    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn btn-danger';
    resetBtn.style.flex = '1';
    resetBtn.textContent = 'Reset';
    resetBtn.addEventListener('click', () => {
      this.controller.resetParams();
      this.updateAllParamDisplays();
    });
    btnGroup.appendChild(resetBtn);

    panel.appendChild(btnGroup);
  }

  private createParamGroup(panel: HTMLElement, config: ParamConfig): void {
    const group = document.createElement('div');
    group.className = 'param-group';

    const labelRow = document.createElement('div');
    labelRow.className = 'param-label';

    const label = document.createElement('span');
    label.textContent = config.label;
    labelRow.appendChild(label);

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'param-value';
    const currentValue = this.controller.getParams()[config.key];
    valueDisplay.textContent = `${currentValue}${config.unit}`;
    labelRow.appendChild(valueDisplay);

    group.appendChild(labelRow);

    const sliderContainer = document.createElement('div');
    sliderContainer.className = 'slider-container';

    const tooltip = document.createElement('div');
    tooltip.className = 'value-tooltip';
    tooltip.textContent = `${currentValue}${config.unit}`;
    sliderContainer.appendChild(tooltip);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(config.min);
    slider.max = String(config.max);
    slider.step = String(config.step);
    slider.value = String(currentValue);

    const numberInput = document.createElement('input');
    numberInput.type = 'number';
    numberInput.min = String(config.min);
    numberInput.max = String(config.max);
    numberInput.step = String(config.step);
    numberInput.value = String(currentValue);

    sliderContainer.appendChild(slider);
    sliderContainer.appendChild(numberInput);

    group.appendChild(sliderContainer);
    panel.appendChild(group);

    this.paramInputs.set(config.key, { slider, number: numberInput, value: valueDisplay });

    const updateValue = (val: number) => {
      const clamped = Math.max(config.min, Math.min(config.max, val));
      const display = `${clamped}${config.unit}`;
      valueDisplay.textContent = display;
      tooltip.textContent = display;
      this.controller.setParam(config.key, clamped);
    };

    slider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      numberInput.value = String(val);
      updateValue(val);
      this.showTooltip(slider, tooltip, val, config.min, config.max);
    });

    slider.addEventListener('mousedown', () => {
      tooltip.classList.add('visible');
    });

    slider.addEventListener('mouseup', () => {
      setTimeout(() => tooltip.classList.remove('visible'), 300);
    });

    slider.addEventListener('mouseleave', () => {
      tooltip.classList.remove('visible');
    });

    numberInput.addEventListener('change', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      if (!isNaN(val)) {
        slider.value = String(val);
        updateValue(val);
      } else {
        numberInput.value = String(this.controller.getParams()[config.key]);
      }
    });
  }

  private showTooltip(
    slider: HTMLInputElement,
    tooltip: HTMLElement,
    value: number,
    min: number,
    max: number
  ): void {
    const percent = ((value - min) / (max - min)) * 100;
    const sliderWidth = slider.offsetWidth;
    const thumbOffset = (percent / 100) * sliderWidth;
    tooltip.style.left = `${thumbOffset}px`;
  }

  private buildBottomPanel(): void {
    const panel = this.elements.bottomPanel;
    panel.innerHTML = '';

    const tabs = document.createElement('div');
    tabs.className = 'bottom-tabs';

    const snapshotsTab = document.createElement('button');
    snapshotsTab.className = 'tab-btn active';
    snapshotsTab.textContent = 'Snapshots';
    snapshotsTab.addEventListener('click', () => {
      this.switchTab('snapshots', snapshotsTab, timelineTab);
    });

    const timelineTab = document.createElement('button');
    timelineTab.className = 'tab-btn';
    timelineTab.textContent = 'Timeline';
    timelineTab.addEventListener('click', () => {
      this.switchTab('timeline', timelineTab, snapshotsTab);
    });

    tabs.appendChild(snapshotsTab);
    tabs.appendChild(timelineTab);
    panel.appendChild(tabs);

    const snapshotsContent = document.createElement('div');
    snapshotsContent.className = 'tab-content';
    snapshotsContent.style.display = 'flex';
    this.buildSnapshotsPanel(snapshotsContent);
    panel.appendChild(snapshotsContent);

    const timelineContent = document.createElement('div');
    timelineContent.className = 'tab-content';
    timelineContent.style.display = 'none';
    this.buildTimelinePanel(timelineContent);
    panel.appendChild(timelineContent);
  }

  private switchTab(tab: 'snapshots' | 'timeline', activeBtn: HTMLButtonElement, inactiveBtn: HTMLButtonElement): void {
    this.activeTab = tab;
    activeBtn.classList.add('active');
    inactiveBtn.classList.remove('active');

    const contents = this.elements.bottomPanel.querySelectorAll('.tab-content');
    contents.forEach((c, i) => {
      (c as HTMLElement).style.display = (tab === 'snapshots' && i === 0) || (tab === 'timeline' && i === 1) ? 'flex' : 'none';
    });
  }

  private buildSnapshotsPanel(container: HTMLElement): void {
    container.style.flexDirection = 'row';
    container.style.alignItems = 'center';
    container.style.gap = '12px';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary';
    saveBtn.textContent = 'Save Snapshot';
    saveBtn.addEventListener('click', () => {
      const snapshot = this.controller.saveSnapshot();
      if (snapshot) {
        this.renderSnapshots();
      } else {
        saveBtn.textContent = 'Max 4 snapshots';
        setTimeout(() => {
          saveBtn.textContent = 'Save Snapshot';
        }, 1500);
      }
    });
    container.appendChild(saveBtn);

    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'snapshots-scroll';
    this.snapshotsContainer = scrollContainer;
    container.appendChild(scrollContainer);

    this.renderSnapshots();
  }

  private renderSnapshots(): void {
    if (!this.snapshotsContainer) return;

    const container = this.snapshotsContainer;
    container.innerHTML = '';

    const snapshots = this.controller.getSnapshots();

    if (snapshots.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty-snapshot';
      empty.textContent = 'No snapshots yet. Click "Save Snapshot" to save current parameters.';
      container.appendChild(empty);
      return;
    }

    const activeId = this.controller.getActiveSnapshotId();

    snapshots.forEach((snapshot, index) => {
      const card = this.createSnapshotCard(snapshot, index, activeId === snapshot.id);
      container.appendChild(card);
    });
  }

  private createSnapshotCard(snapshot: Snapshot, index: number, isActive: boolean): HTMLElement {
    const card = document.createElement('div');
    card.className = 'snapshot-card';
    if (isActive) card.classList.add('active');
    card.draggable = true;
    card.dataset.snapshotId = snapshot.id;

    const indexLabel = document.createElement('div');
    indexLabel.className = 'snapshot-index';
    indexLabel.textContent = `#${index + 1}`;
    card.appendChild(indexLabel);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'snapshot-delete';
    deleteBtn.textContent = '×';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.controller.deleteSnapshot(snapshot.id);
      this.renderSnapshots();
    });
    card.appendChild(deleteBtn);

    const preview = document.createElement('div');
    preview.className = 'snapshot-preview';
    preview.innerHTML = `
      <div style="position: relative; width: 60px; height: 60px; transform-style: preserve-3d; perspective: ${snapshot.params.perspective}px;">
        <div style="position: absolute; width: 100%; height: 100%; background: #3498db; backface-visibility: hidden; border-radius: 3px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; font-size: 14px; transform: translateZ(${snapshot.params.translateZ * 0.3}px) rotateX(${snapshot.params.rotateX}deg) rotateY(${snapshot.params.rotateY}deg);">3D</div>
        <div style="position: absolute; width: 100%; height: 100%; background: #e74c3c; backface-visibility: hidden; border-radius: 3px; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; font-size: 12px; transform: translateZ(${snapshot.params.translateZ * 0.3}px) rotateX(${snapshot.params.rotateX}deg) rotateY(${snapshot.params.rotateY + 180}deg);">BACK</div>
      </div>
    `;
    card.appendChild(preview);

    card.addEventListener('click', () => {
      this.controller.applySnapshot(snapshot.id);
      this.updateAllParamDisplays();
      this.renderSnapshots();
    });

    card.addEventListener('dragstart', (e) => {
      this.draggedSnapshotId = snapshot.id;
      card.classList.add('dragging');
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', snapshot.id);
      }
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      this.draggedSnapshotId = null;
      document.querySelectorAll('.snapshot-card').forEach(c => c.classList.remove('drag-over'));
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (this.draggedSnapshotId && this.draggedSnapshotId !== snapshot.id) {
        card.classList.add('drag-over');
      }
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-over');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      if (this.draggedSnapshotId && this.draggedSnapshotId !== snapshot.id) {
        const snapshots = this.controller.getSnapshots();
        const fromIndex = snapshots.findIndex(s => s.id === this.draggedSnapshotId);
        const toIndex = snapshots.findIndex(s => s.id === snapshot.id);
        this.controller.reorderSnapshots(fromIndex, toIndex);
        this.renderSnapshots();
      }
    });

    return card;
  }

  private buildTimelinePanel(container: HTMLElement): void {
    container.style.flexDirection = 'column';
    container.style.justifyContent = 'space-between';

    const timelinePanel = document.createElement('div');
    timelinePanel.className = 'timeline-panel';

    const controls = document.createElement('div');
    controls.className = 'timeline-controls';

    const playBtn = document.createElement('button');
    playBtn.className = 'btn btn-secondary btn-small';
    playBtn.textContent = '▶ Play';
    playBtn.addEventListener('click', () => {
      if (this.controller.isAnimationPlaying()) {
        this.controller.stopAnimation();
        playBtn.textContent = '▶ Play';
        if (this.onStopCallback) this.onStopCallback();
      } else {
        playBtn.textContent = '⏹ Stop';
        this.controller.playAnimation((time) => {
          this.updateTimelineProgress(time);
        });
        if (this.onPlayCallback) this.onPlayCallback();
        const checkStop = setInterval(() => {
          if (!this.controller.isAnimationPlaying()) {
            playBtn.textContent = '▶ Play';
            clearInterval(checkStop);
            if (this.onStopCallback) this.onStopCallback();
          }
        }, 50);
      }
    });
    controls.appendChild(playBtn);

    const recordBtn = document.createElement('button');
    recordBtn.className = 'btn btn-primary btn-small';
    recordBtn.textContent = '🎬 Record';
    recordBtn.addEventListener('click', () => {
      const selectedTime = this.getSelectedKeyframeTime();
      if (selectedTime !== null) {
        this.controller.recordKeyframe(selectedTime);
        this.updateKeyframeDots();
      }
    });
    controls.appendChild(recordBtn);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn btn-danger btn-small';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', () => {
      const selectedTime = this.getSelectedKeyframeTime();
      if (selectedTime !== null) {
        this.controller.clearKeyframe(selectedTime);
        this.updateKeyframeDots();
      }
    });
    controls.appendChild(clearBtn);

    const speedLabel = document.createElement('span');
    speedLabel.style.cssText = 'font-size: 12px; color: #b2bec3; margin-left: auto;';
    speedLabel.textContent = 'Speed:';
    controls.appendChild(speedLabel);

    const speedSelector = document.createElement('div');
    speedSelector.className = 'speed-selector';

    [0.5, 1, 2].forEach(speed => {
      const speedBtn = document.createElement('button');
      speedBtn.className = 'speed-btn';
      if (speed === 1) speedBtn.classList.add('active');
      speedBtn.textContent = `${speed}x`;
      speedBtn.addEventListener('click', () => {
        this.controller.setPlaybackSpeed(speed);
        speedSelector.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        speedBtn.classList.add('active');
      });
      speedSelector.appendChild(speedBtn);
    });

    controls.appendChild(speedSelector);
    timelinePanel.appendChild(controls);

    const track = document.createElement('div');
    track.className = 'timeline-track';

    const progress = document.createElement('div');
    progress.className = 'timeline-progress';
    const progressFill = document.createElement('div');
    progressFill.className = 'timeline-progress-fill';
    progress.appendChild(progressFill);
    this.progressFill = progressFill;
    track.appendChild(progress);

    const indicator = document.createElement('div');
    indicator.className = 'timeline-indicator';
    indicator.style.left = '20px';
    this.progressIndicator = indicator;
    track.appendChild(indicator);

    const marks = document.createElement('div');
    marks.className = 'timeline-marks';

    this.controller.getKeyframeTimes().forEach(time => {
      const mark = document.createElement('div');
      mark.className = 'timeline-mark';

      const dot = document.createElement('div');
      dot.className = 'timeline-keyframe';
      dot.dataset.time = String(time);
      if (this.controller.hasKeyframe(time)) {
        dot.classList.add('recorded');
      }
      dot.addEventListener('click', () => {
        this.keyframeDots.forEach(d => d.style.outline = 'none');
        dot.style.outline = '2px solid #f1c40f';
        if (this.controller.hasKeyframe(time)) {
          const kf = this.controller.getKeyframe(time);
          if (kf) {
            this.controller.setParams(kf);
            this.updateAllParamDisplays();
          }
        }
      });
      mark.appendChild(dot);
      this.keyframeDots.set(time, dot);

      const label = document.createElement('div');
      label.className = 'timeline-mark-label';
      label.textContent = `${time}s`;
      mark.appendChild(label);

      marks.appendChild(mark);
    });

    track.appendChild(marks);
    timelinePanel.appendChild(track);
    timelinePanel.appendChild(document.createElement('div'));

    container.appendChild(timelinePanel);
  }

  private getSelectedKeyframeTime(): number | null {
    for (const [time, dot] of this.keyframeDots) {
      if (dot.style.outline) {
        return time;
      }
    }
    const firstTime = this.controller.getKeyframeTimes()[0];
    if (firstTime !== undefined) {
      const dot = this.keyframeDots.get(firstTime);
      if (dot) dot.style.outline = '2px solid #f1c40f';
      return firstTime;
    }
    return null;
  }

  private updateKeyframeDots(): void {
    this.keyframeDots.forEach((dot, time) => {
      if (this.controller.hasKeyframe(time)) {
        dot.classList.add('recorded');
      } else {
        dot.classList.remove('recorded');
      }
    });
  }

  private updateTimelineProgress(currentTime: number): void {
    if (this.progressIndicator && this.progressFill) {
      const trackWidth = this.progressIndicator.parentElement?.clientWidth || 0;
      const usableWidth = trackWidth - 40;
      const percent = currentTime / 3;
      const left = 20 + percent * usableWidth;
      this.progressIndicator.style.left = `${left}px`;
      this.progressFill.style.width = `${percent * 100}%`;
    }
  }

  updateAllParamDisplays(): void {
    const params = this.controller.getParams();
    const allConfigs = [...PARAM_CONFIGS, ...PERSPECTIVE_ORIGIN_CONFIGS];

    allConfigs.forEach(config => {
      const inputs = this.paramInputs.get(config.key);
      if (inputs) {
        const val = params[config.key];
        inputs.slider.value = String(val);
        inputs.number.value = String(val);
        inputs.value.textContent = `${val}${config.unit}`;
      }
    });
  }

  onPlay(callback: () => void): void {
    this.onPlayCallback = callback;
  }

  onStop(callback: () => void): void {
    this.onStopCallback = callback;
  }

  updateSnapshotActiveState(): void {
    this.renderSnapshots();
  }
}
