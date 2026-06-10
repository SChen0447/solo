import { JointName, JOINT_NAMES, JOINT_LABELS, JointKeyframes, EditorState, AnimationData } from './types';

export interface EditorCallbacks {
  onFrameChange: (frame: number) => void;
  onKeyframeAdd: (joint: JointName, frame: number) => void;
  onKeyframeSelect: (joint: JointName | null, frame: number | null) => void;
  onKeyframeDelete: (joint: JointName, frame: number) => void;
  onKeyframeClear: (joint: JointName) => void;
  onKeyframeCopyNext: (joint: JointName, frame: number) => void;
  onKeyframeMove: (joint: JointName, fromFrame: number, toFrame: number) => void;
  onPlayToggle: () => void;
  onFpsChange: (fps: number) => void;
  onExport: () => void;
}

interface NewKeyframeAnim {
  joint: JointName;
  frame: number;
  startTime: number;
}

interface BounceAnim {
  joint: JointName;
  frame: number;
  startTime: number;
}

export class Editor {
  private container: HTMLElement;
  private callbacks: EditorCallbacks;
  private keyframes: JointKeyframes;
  private state: EditorState;
  private timelineContainer!: HTMLElement;
  private timelineCanvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private dpr: number = 1;
  private newKeyframeAnims: NewKeyframeAnim[] = [];
  private bounceAnims: BounceAnim[] = [];
  private contextMenu: HTMLElement | null = null;
  private dragState: { joint: JointName; fromFrame: number } | null = null;
  private timelineWidth: number = 0;
  private rowHeight: number = 40;
  private labelWidth: number = 70;
  private rafId: number = 0;

  constructor(container: HTMLElement, callbacks: EditorCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.keyframes = {} as JointKeyframes;
    this.state = {
      totalFrames: 30,
      currentFrame: 1,
      selectedJoint: null,
      selectedKeyframe: null,
      isPlaying: false,
      fps: 24
    };

    this.buildDOM();
    this.bindGlobalEvents();
    this.startAnimLoop();
  }

  private buildDOM(): void {
    this.container.innerHTML = '';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.height = '100%';
    this.container.style.overflow = 'hidden';

    const header = document.createElement('div');
    header.className = 'header';
    header.innerHTML = `
      <h1>关键帧编辑器</h1>
      <button class="btn btn-primary" id="btn-export">导出JSON</button>
    `;
    this.container.appendChild(header);

    const body = document.createElement('div');
    body.style.flex = '1';
    body.style.display = 'flex';
    body.style.flexDirection = 'column';
    body.style.minHeight = '0';
    body.style.padding = '12px';
    body.style.gap = '12px';
    this.container.appendChild(body);

    this.timelineContainer = document.createElement('div');
    this.timelineContainer.style.flex = '1';
    this.timelineContainer.style.minHeight = '0';
    this.timelineContainer.style.position = 'relative';
    this.timelineContainer.style.background = '#1e1e2e';
    this.timelineContainer.style.borderRadius = '6px';
    this.timelineContainer.style.overflow = 'hidden';
    body.appendChild(this.timelineContainer);

    this.timelineCanvas = document.createElement('canvas');
    this.timelineCanvas.style.display = 'block';
    this.timelineCanvas.style.width = '100%';
    this.timelineCanvas.style.height = '100%';
    this.timelineContainer.appendChild(this.timelineCanvas);

    const ctx = this.timelineCanvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.flexDirection = 'column';
    controls.style.gap = '8px';
    controls.style.padding = '8px 0';
    body.appendChild(controls);

    const playRow = document.createElement('div');
    playRow.style.display = 'flex';
    playRow.style.alignItems = 'center';
    playRow.style.gap = '12px';
    controls.appendChild(playRow);

    const playBtn = document.createElement('button');
    playBtn.className = 'btn btn-primary';
    playBtn.id = 'btn-play';
    playBtn.textContent = '播放';
    playBtn.style.minWidth = '70px';
    playRow.appendChild(playBtn);

    const frameInfo = document.createElement('div');
    frameInfo.id = 'frame-info';
    frameInfo.style.fontSize = '13px';
    frameInfo.style.color = '#b2bec3';
    frameInfo.textContent = `帧: 1 / ${this.state.totalFrames}`;
    playRow.appendChild(frameInfo);

    const fpsRow = document.createElement('div');
    fpsRow.style.display = 'flex';
    fpsRow.style.alignItems = 'center';
    fpsRow.style.gap = '10px';
    controls.appendChild(fpsRow);

    const fpsLabel = document.createElement('span');
    fpsLabel.style.fontSize = '13px';
    fpsLabel.style.color = '#b2bec3';
    fpsLabel.textContent = '帧率:';
    fpsRow.appendChild(fpsLabel);

    const fpsSlider = document.createElement('input');
    fpsSlider.type = 'range';
    fpsSlider.id = 'fps-slider';
    fpsSlider.min = '10';
    fpsSlider.max = '60';
    fpsSlider.value = String(this.state.fps);
    fpsSlider.style.flex = '1';
    fpsSlider.style.accentColor = '#6c5ce7';
    fpsRow.appendChild(fpsSlider);

    const fpsValue = document.createElement('span');
    fpsValue.id = 'fps-value';
    fpsValue.style.fontSize = '13px';
    fpsValue.style.color = '#00cec9';
    fpsValue.style.minWidth = '40px';
    fpsValue.style.textAlign = 'right';
    fpsValue.textContent = `${this.state.fps} fps`;
    fpsRow.appendChild(fpsValue);

    const exportBtn = header.querySelector('#btn-export') as HTMLButtonElement;
    exportBtn.addEventListener('click', () => this.callbacks.onExport());

    playBtn.addEventListener('click', () => this.callbacks.onPlayToggle());

    fpsSlider.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      fpsValue.textContent = `${val} fps`;
      this.callbacks.onFpsChange(val);
    });

    this.setupDPR();
    this.bindTimelineEvents();

    window.addEventListener('resize', () => {
      this.setupDPR();
      this.render();
    });
  }

  private setupDPR(): void {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.timelineContainer.getBoundingClientRect();
    this.timelineCanvas.width = rect.width * this.dpr;
    this.timelineCanvas.height = rect.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.timelineWidth = rect.width;
  }

  private bindTimelineEvents(): void {
    this.timelineCanvas.addEventListener('click', this.handleClick);
    this.timelineCanvas.addEventListener('contextmenu', this.handleContextMenu);
    this.timelineCanvas.addEventListener('mousedown', this.handleMouseDown);
    this.timelineCanvas.addEventListener('mousemove', this.handleMouseMove);
    this.timelineCanvas.addEventListener('mouseup', this.handleMouseUp);
    this.timelineCanvas.addEventListener('mouseleave', this.handleMouseUp);
  }

  private bindGlobalEvents(): void {
    document.addEventListener('click', (e) => {
      if (this.contextMenu && !this.contextMenu.contains(e.target as Node)) {
        this.removeContextMenu();
      }
    });
  }

  private getTimelinePos(e: MouseEvent): { x: number; y: number } {
    const rect = this.timelineCanvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private frameToX(frame: number): number {
    const usable = this.timelineWidth - this.labelWidth;
    return this.labelWidth + ((frame - 1) / (this.state.totalFrames - 1)) * usable;
  }

  private xToFrame(x: number): number {
    const usable = this.timelineWidth - this.labelWidth;
    const frac = (x - this.labelWidth) / usable;
    return Math.round(frac * (this.state.totalFrames - 1) + 1);
  }

  private yToRow(y: number): JointName | null {
    const header = 30;
    const idx = Math.floor((y - header) / this.rowHeight);
    if (idx >= 0 && idx < JOINT_NAMES.length) {
      return JOINT_NAMES[idx];
    }
    return null;
  }

  private hitTestKeyframe(x: number, y: number): { joint: JointName; frame: number } | null {
    const hitRadius = 8;
    const header = 30;
    for (let i = 0; i < JOINT_NAMES.length; i++) {
      const joint = JOINT_NAMES[i];
      const cy = header + i * this.rowHeight + this.rowHeight / 2;
      for (const kf of this.keyframes[joint]) {
        const kx = this.frameToX(kf.frame);
        const dx = x - kx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= hitRadius * hitRadius) {
          return { joint, frame: kf.frame };
        }
      }
    }
    return null;
  }

  private handleClick = (e: MouseEvent): void => {
    if (this.contextMenu) {
      this.removeContextMenu();
      return;
    }
    const pos = this.getTimelinePos(e);
    if (pos.x < this.labelWidth) return;

    const hit = this.hitTestKeyframe(pos.x, pos.y);
    if (hit) {
      this.callbacks.onKeyframeSelect(hit.joint, hit.frame);
      this.triggerBounce(hit.joint, hit.frame);
      this.callbacks.onFrameChange(hit.frame);
      return;
    }

    const row = this.yToRow(pos.y);
    if (row) {
      const frame = this.xToFrame(pos.x);
      this.callbacks.onKeyframeAdd(row, frame);
      this.callbacks.onKeyframeSelect(row, frame);
      this.callbacks.onFrameChange(frame);
      this.triggerNewAnim(row, frame);
    } else {
      const frame = this.xToFrame(pos.x);
      this.callbacks.onFrameChange(frame);
      this.callbacks.onKeyframeSelect(null, null);
    }
  };

  private handleMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    const pos = this.getTimelinePos(e);
    const hit = this.hitTestKeyframe(pos.x, pos.y);
    if (hit) {
      this.dragState = { joint: hit.joint, fromFrame: hit.frame };
      e.preventDefault();
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.dragState) return;
    const pos = this.getTimelinePos(e);
    if (pos.x < this.labelWidth) return;
    const toFrame = Math.max(1, Math.min(this.state.totalFrames, this.xToFrame(pos.x)));
    if (toFrame !== this.dragState.fromFrame) {
      this.callbacks.onKeyframeMove(this.dragState.joint, this.dragState.fromFrame, toFrame);
      this.dragState.fromFrame = toFrame;
    }
  };

  private handleMouseUp = (): void => {
    this.dragState = null;
  };

  private handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
    const pos = this.getTimelinePos(e);
    const hit = this.hitTestKeyframe(pos.x, pos.y);
    if (!hit) return;

    this.removeContextMenu();

    const menu = document.createElement('div');
    menu.style.position = 'fixed';
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    menu.style.background = '#2d2d44';
    menu.style.border = '1px solid #6c5ce7';
    menu.style.borderRadius = '4px';
    menu.style.padding = '4px 0';
    menu.style.zIndex = '10000';
    menu.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
    menu.style.minWidth = '160px';

    const items = [
      { label: '删除帧', action: () => this.callbacks.onKeyframeDelete(hit.joint, hit.frame) },
      { label: '复制帧到下一帧', action: () => this.callbacks.onKeyframeCopyNext(hit.joint, hit.frame) },
      { label: '清空该关节所有关键帧', action: () => this.callbacks.onKeyframeClear(hit.joint) }
    ];

    for (const item of items) {
      const div = document.createElement('div');
      div.textContent = item.label;
      div.style.padding = '8px 14px';
      div.style.fontSize = '13px';
      div.style.color = '#dfe6e9';
      div.style.cursor = 'pointer';
      div.addEventListener('mouseenter', () => { div.style.background = '#3d3d5c'; });
      div.addEventListener('mouseleave', () => { div.style.background = 'transparent'; });
      div.addEventListener('click', () => {
        item.action();
        this.removeContextMenu();
      });
      menu.appendChild(div);
    }

    this.contextMenu = menu;
    document.body.appendChild(menu);
  };

  private removeContextMenu(): void {
    if (this.contextMenu) {
      this.contextMenu.remove();
      this.contextMenu = null;
    }
  }

  private triggerNewAnim(joint: JointName, frame: number): void {
    this.newKeyframeAnims.push({ joint, frame, startTime: performance.now() });
  }

  private triggerBounce(joint: JointName, frame: number): void {
    this.bounceAnims.push({ joint, frame, startTime: performance.now() });
  }

  private startAnimLoop(): void {
    const loop = () => {
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  setData(keyframes: JointKeyframes, state: EditorState): void {
    this.keyframes = keyframes;
    this.state = state;
    const info = this.container.querySelector('#frame-info');
    if (info) info.textContent = `帧: ${state.currentFrame} / ${state.totalFrames}`;
    const playBtn = this.container.querySelector('#btn-play') as HTMLButtonElement;
    if (playBtn) playBtn.textContent = state.isPlaying ? '暂停' : '播放';
  }

  render(): void {
    const ctx = this.ctx;
    const rect = this.timelineContainer.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const now = performance.now();

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#1e1e2e';
    ctx.fillRect(0, 0, w, h);

    const headerH = 30;

    ctx.fillStyle = '#252540';
    ctx.fillRect(0, 0, this.labelWidth, h);
    ctx.fillRect(0, 0, w, headerH);

    ctx.strokeStyle = '#3d3d5c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.labelWidth, 0);
    ctx.lineTo(this.labelWidth, h);
    ctx.moveTo(0, headerH);
    ctx.lineTo(w, headerH);
    ctx.stroke();

    ctx.fillStyle = '#636e72';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const stepFrames = this.state.totalFrames <= 30 ? 1 : (this.state.totalFrames <= 60 ? 5 : 10);
    for (let f = 1; f <= this.state.totalFrames; f += stepFrames) {
      const x = this.frameToX(f);
      ctx.fillText(String(f), x, headerH / 2);
      ctx.strokeStyle = '#3d3d5c';
      ctx.beginPath();
      ctx.moveTo(x, headerH);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    ctx.textAlign = 'left';
    for (let i = 0; i < JOINT_NAMES.length; i++) {
      const name = JOINT_NAMES[i];
      const y = headerH + i * this.rowHeight + this.rowHeight / 2;
      ctx.fillStyle = this.state.selectedJoint === name ? '#00cec9' : '#dfe6e9';
      ctx.font = '12px sans-serif';
      ctx.fillText(JOINT_LABELS[name], 10, y);
      ctx.strokeStyle = '#3d3d5c';
      ctx.beginPath();
      ctx.moveTo(this.labelWidth, headerH + (i + 1) * this.rowHeight);
      ctx.lineTo(w, headerH + (i + 1) * this.rowHeight);
      ctx.stroke();
    }

    for (let i = 0; i < JOINT_NAMES.length; i++) {
      const joint = JOINT_NAMES[i];
      const cy = headerH + i * this.rowHeight + this.rowHeight / 2;
      for (const kf of this.keyframes[joint]) {
        const x = this.frameToX(kf.frame);
        const isSelected = this.state.selectedKeyframe &&
          this.state.selectedKeyframe.joint === joint &&
          this.state.selectedKeyframe.frame === kf.frame;

        let scale = 1;
        const newAnim = this.newKeyframeAnims.find(a => a.joint === joint && a.frame === kf.frame);
        if (newAnim) {
          const t = Math.min(1, (now - newAnim.startTime) / 200);
          scale = t;
          if (t >= 1) this.newKeyframeAnims = this.newKeyframeAnims.filter(a => a !== newAnim);
        }

        let bounceOffset = 0;
        const bounceAnim = this.bounceAnims.find(a => a.joint === joint && a.frame === kf.frame);
        if (bounceAnim) {
          const t = Math.min(1, (now - bounceAnim.startTime) / 300);
          bounceOffset = Math.sin(t * Math.PI) * -6;
          if (t >= 1) this.bounceAnims = this.bounceAnims.filter(a => a !== bounceAnim);
        }

        const radius = 5 * scale;

        if (isSelected) {
          ctx.strokeStyle = '#ffeb3b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, cy + bounceOffset, radius + 4, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = '#00b894';
        ctx.beginPath();
        ctx.arc(x, cy + bounceOffset, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const playX = this.frameToX(this.state.currentFrame);
    ctx.strokeStyle = '#ff7675';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playX, headerH);
    ctx.lineTo(playX, h);
    ctx.stroke();

    ctx.fillStyle = '#ff7675';
    ctx.beginPath();
    ctx.moveTo(playX - 6, headerH);
    ctx.lineTo(playX + 6, headerH);
    ctx.lineTo(playX, headerH + 8);
    ctx.closePath();
    ctx.fill();
  }

  exportAnimation(): AnimationData {
    return {
      character: 'hero',
      totalFrames: this.state.totalFrames,
      keyframes: JSON.parse(JSON.stringify(this.keyframes))
    };
  }

  destroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.removeContextMenu();
  }
}
