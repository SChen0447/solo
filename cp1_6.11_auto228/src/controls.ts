import { Pane } from 'tweakpane';
import gsap from 'gsap';
import type { AuroraParams } from './aurora';
import type { Recorder } from './recorder';

export interface ControlState extends AuroraParams {
  observationTilt: number;
  isPaused: boolean;
  playbackSpeed: number;
}

export interface ControlCallbacks {
  onParamsChange: (params: ControlState) => void;
  onTogglePause: (paused: boolean) => void;
}

export class ControlPanel {
  private pane: Pane;
  private state: ControlState;
  private callbacks: ControlCallbacks;
  private recorder: Recorder;
  private recordingFolder: any;
  private playbackFolder: any;
  private statusMonitor: any;
  private frameMonitor: any;
  private progressMonitor: any;
  private recordBtn: any;
  private playBtn: any;
  private pauseBtn: any;
  private resetBtn: any;
  private stopRecordBtn: any;

  constructor(container: HTMLElement, initialState: ControlState, callbacks: ControlCallbacks, recorder: Recorder) {
    this.state = { ...initialState };
    this.callbacks = callbacks;
    this.recorder = recorder;

    this.pane = new Pane({
      title: '⚙ 极光控制面板',
      container,
      expanded: true
    });

    this.pane.element.style.position = 'fixed';
    this.pane.element.style.right = '32px';
    this.pane.element.style.bottom = '32px';
    this.pane.element.style.width = '280px';
    this.pane.element.style.zIndex = '100';

    this.setupMobileToggle();
    this.createObservationFolder();
    this.createRecordingFolder();
    this.createPlaybackFolder();

    this.setupRecorderListeners();
  }

  private setupMobileToggle(): void {
    const toggleBtn = document.getElementById('mobileToggle');
    if (!toggleBtn) return;

    let isOpen = false;
    toggleBtn.addEventListener('click', () => {
      isOpen = !isOpen;
      if (isOpen) {
        this.pane.element.classList.add('mobile-open');
        gsap.fromTo(this.pane.element,
          { opacity: 0, y: 50 },
          { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
        );
      } else {
        gsap.to(this.pane.element, {
          opacity: 0,
          y: 50,
          duration: 0.2,
          ease: 'power2.in',
          onComplete: () => {
            this.pane.element.classList.remove('mobile-open');
          }
        });
      }
    });
  }

  private createObservationFolder(): void {
    const folder = this.pane.addFolder({
      title: '🌌 观测参数',
      expanded: true
    });

    folder.addBinding(this.state, 'geomagneticIntensity', {
      label: '地磁扰动',
      min: 0.1,
      max: 2.0,
      step: 0.01
    }).on('change', (ev: any) => {
      this.state.geomagneticIntensity = ev.value;
      this.callbacks.onParamsChange(this.state);
    });

    folder.addBinding(this.state, 'solarWindSpeed', {
      label: '太阳风速度',
      min: 1,
      max: 5,
      step: 0.1
    }).on('change', (ev: any) => {
      this.state.solarWindSpeed = ev.value;
      this.callbacks.onParamsChange(this.state);
    });

    folder.addBinding(this.state, 'observationTilt', {
      label: '观测倾角',
      min: -15,
      max: 45,
      step: 0.5,
      unit: '°'
    }).on('change', (ev: any) => {
      this.state.observationTilt = ev.value;
      this.callbacks.onParamsChange(this.state);
    });

    folder.addBinding(this.state, 'isPaused', {
      label: '暂停动画'
    }).on('change', (ev: any) => {
      this.state.isPaused = ev.value;
      this.callbacks.onTogglePause(ev.value);
    });
  }

  private createRecordingFolder(): void {
    this.recordingFolder = this.pane.addFolder({
      title: '🎬 录制控制',
      expanded: true
    });

    this.statusMonitor = this.recordingFolder.addBlade({
      view: 'text',
      label: '状态',
      parse: (v: string) => v,
      value: '待机',
      readonly: true
    });

    this.frameMonitor = this.recordingFolder.addBlade({
      view: 'text',
      label: '已录制',
      parse: (v: string) => v,
      value: '0 / 300 帧',
      readonly: true
    });

    const btnRow = this.recordingFolder.addBlade({
      view: 'list'
    });

    this.recordBtn = this.recordingFolder.addButton({
      title: '▶ 开始录制',
      index: 0
    }).on('click', () => {
      this.recorder.startRecording();
    });

    this.stopRecordBtn = this.recordingFolder.addButton({
      title: '■ 停止录制',
      index: 1
    }).on('click', () => {
      this.recorder.stopRecording();
    });
  }

  private createPlaybackFolder(): void {
    this.playbackFolder = this.pane.addFolder({
      title: '▶ 回放控制',
      expanded: true
    });

    this.progressMonitor = this.playbackFolder.addBlade({
      view: 'text',
      label: '播放进度',
      parse: (v: string) => v,
      value: '0 / 0 帧',
      readonly: true
    });

    this.playbackFolder.addBinding(this.state, 'playbackSpeed', {
      label: '播放速度',
      min: 0.25,
      max: 4,
      step: 0.25
    }).on('change', (ev: any) => {
      this.state.playbackSpeed = ev.value;
      this.recorder.setPlaybackSpeed(ev.value);
    });

    this.playBtn = this.playbackFolder.addButton({
      title: '▶ 播放回放'
    }).on('click', () => {
      this.recorder.startPlayback();
    });

    this.pauseBtn = this.playbackFolder.addButton({
      title: '⏸ 暂停回放'
    }).on('click', () => {
      const status = this.recorder.getStatus();
      if (status === 'playing') {
        this.recorder.pausePlayback();
      } else if (status === 'paused') {
        this.recorder.resumePlayback();
      }
    });

    this.resetBtn = this.playbackFolder.addButton({
      title: '↺ 重置'
    }).on('click', () => {
      this.recorder.resetPlayback();
    });
  }

  private setupRecorderListeners(): void {
    this.recorder.setOnStatusChange((status) => {
      const statusText: Record<string, string> = {
        idle: '待机',
        recording: '录制中...',
        playing: '播放中...',
        paused: '已暂停'
      };
      (this.statusMonitor as any).value = statusText[status] || status;

      if (status === 'recording') {
        (this.recordBtn as any).disabled = true;
        (this.stopRecordBtn as any).disabled = false;
      } else {
        (this.recordBtn as any).disabled = false;
        (this.stopRecordBtn as any).disabled = true;
      }

      if (status === 'playing') {
        (this.playBtn as any).disabled = true;
        (this.pauseBtn as any).title = '⏸ 暂停回放';
      } else if (status === 'paused') {
        (this.pauseBtn as any).title = '▶ 继续播放';
      } else {
        (this.playBtn as any).disabled = this.recorder.getFrameCount() === 0;
        (this.pauseBtn as any).title = '⏸ 暂停回放';
      }
    });

    this.recorder.setOnFrameCountChange((count, max) => {
      (this.frameMonitor as any).value = `${count} / ${max} 帧`;
      (this.playBtn as any).disabled = count === 0;
    });

    this.recorder.setOnPlaybackProgress((index, total) => {
      (this.progressMonitor as any).value = `${index} / ${total} 帧`;
    });
  }

  public getState(): ControlState {
    return { ...this.state };
  }
}
