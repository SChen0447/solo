import { JointName, JointKeyframes, EditorState, AnimationData } from './types';
import { createInitialKeyframes, addKeyframe, removeKeyframe, clearJointKeyframes, copyKeyframe, moveKeyframe, normalizeAngle, getAllJointAngles } from './skeleton';
import { Editor, EditorCallbacks } from './editor';
import { Preview, PreviewCallbacks } from './preview';

export class App {
  private container: HTMLElement;
  private editorPanel!: HTMLElement;
  private previewPanel!: HTMLElement;
  private editor!: Editor;
  private preview!: Preview;
  private keyframes: JointKeyframes;
  private state: EditorState;
  private playTimerId: number | null = null;
  private lastFrameTime: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.keyframes = createInitialKeyframes();
    this.state = {
      totalFrames: 30,
      currentFrame: 1,
      selectedJoint: null,
      selectedKeyframe: null,
      isPlaying: false,
      fps: 24
    };

    this.buildLayout();
    this.createEditor();
    this.createPreview();
    this.syncUI();
  }

  private buildLayout(): void {
    this.container.innerHTML = '';

    this.editorPanel = document.createElement('div');
    this.editorPanel.className = 'editor-panel';

    this.previewPanel = document.createElement('div');
    this.previewPanel.className = 'preview-panel';

    this.container.appendChild(this.editorPanel);
    this.container.appendChild(this.previewPanel);
  }

  private createEditor(): void {
    const callbacks: EditorCallbacks = {
      onFrameChange: (frame) => this.handleFrameChange(frame),
      onKeyframeAdd: (joint, frame) => this.handleKeyframeAdd(joint, frame),
      onKeyframeSelect: (joint, frame) => this.handleKeyframeSelect(joint, frame),
      onKeyframeDelete: (joint, frame) => this.handleKeyframeDelete(joint, frame),
      onKeyframeClear: (joint) => this.handleKeyframeClear(joint),
      onKeyframeCopyNext: (joint, frame) => this.handleKeyframeCopyNext(joint, frame),
      onKeyframeMove: (joint, fromFrame, toFrame) => this.handleKeyframeMove(joint, fromFrame, toFrame),
      onPlayToggle: () => this.handlePlayToggle(),
      onFpsChange: (fps) => this.handleFpsChange(fps),
      onExport: () => this.handleExport()
    };
    this.editor = new Editor(this.editorPanel, callbacks);
  }

  private createPreview(): void {
    const callbacks: PreviewCallbacks = {
      onJointDragStart: (joint) => this.handleJointDragStart(joint),
      onJointDragMove: (joint, angle) => this.handleJointDragMove(joint, angle),
      onJointDragEnd: () => this.handleJointDragEnd()
    };
    this.preview = new Preview(this.previewPanel, callbacks);
  }

  private syncUI(): void {
    this.editor.setData(this.keyframes, this.state);
    this.preview.setData(this.keyframes, this.state);
  }

  private handleFrameChange(frame: number): void {
    this.state.currentFrame = Math.max(1, Math.min(this.state.totalFrames, frame));
    this.syncUI();
  }

  private handleKeyframeAdd(joint: JointName, frame: number): void {
    const angles = getAllJointAngles(this.keyframes, frame);
    const cfgBase: Record<JointName, number> = {
      head: 0, torso: -90, leftArm: 45, rightArm: -45, leftLeg: 30, rightLeg: -35
    };
    const currentAngle = angles[joint] - cfgBase[joint];
    this.keyframes = addKeyframe(this.keyframes, joint, frame, normalizeAngle(currentAngle));
    this.state.selectedJoint = joint;
    this.state.selectedKeyframe = { joint, frame };
    this.syncUI();
  }

  private handleKeyframeSelect(joint: JointName | null, frame: number | null): void {
    this.state.selectedJoint = joint;
    if (joint && frame !== null) {
      this.state.selectedKeyframe = { joint, frame };
    } else {
      this.state.selectedKeyframe = null;
    }
    this.syncUI();
  }

  private handleKeyframeDelete(joint: JointName, frame: number): void {
    this.keyframes = removeKeyframe(this.keyframes, joint, frame);
    if (this.state.selectedKeyframe &&
        this.state.selectedKeyframe.joint === joint &&
        this.state.selectedKeyframe.frame === frame) {
      this.state.selectedKeyframe = null;
      this.state.selectedJoint = null;
    }
    this.syncUI();
  }

  private handleKeyframeClear(joint: JointName): void {
    this.keyframes = clearJointKeyframes(this.keyframes, joint);
    if (this.state.selectedJoint === joint) {
      this.state.selectedJoint = null;
      this.state.selectedKeyframe = null;
    }
    this.syncUI();
  }

  private handleKeyframeCopyNext(joint: JointName, frame: number): void {
    const next = Math.min(this.state.totalFrames, frame + 1);
    this.keyframes = copyKeyframe(this.keyframes, joint, frame, next);
    this.syncUI();
  }

  private handleKeyframeMove(joint: JointName, fromFrame: number, toFrame: number): void {
    if (toFrame < 1 || toFrame > this.state.totalFrames) return;
    this.keyframes = moveKeyframe(this.keyframes, joint, fromFrame, toFrame);
    if (this.state.selectedKeyframe &&
        this.state.selectedKeyframe.joint === joint &&
        this.state.selectedKeyframe.frame === fromFrame) {
      this.state.selectedKeyframe = { joint, frame: toFrame };
    }
    this.state.currentFrame = toFrame;
    this.syncUI();
  }

  private handleJointDragStart(joint: JointName): void {
    this.state.selectedJoint = joint;
    if (this.state.isPlaying) {
      this.stopPlayback();
    }
    this.syncUI();
  }

  private handleJointDragMove(joint: JointName, angle: number): void {
    const frame = this.state.currentFrame;
    const list = this.keyframes[joint];
    const existsOnFrame = list.some(k => k.frame === frame);

    if (existsOnFrame || this.state.selectedKeyframe) {
      const targetFrame = existsOnFrame ? frame : (this.state.selectedKeyframe?.frame ?? frame);
      const targetJoint = this.state.selectedKeyframe?.joint ?? joint;
      this.keyframes = addKeyframe(this.keyframes, targetJoint, targetFrame, normalizeAngle(angle));
      if (this.state.selectedKeyframe === null && existsOnFrame) {
        this.state.selectedKeyframe = { joint: targetJoint, frame: targetFrame };
      }
    } else {
      this.keyframes = addKeyframe(this.keyframes, joint, frame, normalizeAngle(angle));
      this.state.selectedKeyframe = { joint, frame };
    }
    this.syncUI();
  }

  private handleJointDragEnd(): void {
    this.syncUI();
  }

  private handlePlayToggle(): void {
    if (this.state.isPlaying) {
      this.stopPlayback();
    } else {
      this.startPlayback();
    }
  }

  private startPlayback(): void {
    this.state.isPlaying = true;
    this.lastFrameTime = performance.now();
    this.syncUI();
    this.scheduleNextFrame();
  }

  private stopPlayback(): void {
    this.state.isPlaying = false;
    if (this.playTimerId !== null) {
      cancelAnimationFrame(this.playTimerId);
      this.playTimerId = null;
    }
    this.syncUI();
  }

  private scheduleNextFrame(): void {
    const tick = (now: number) => {
      if (!this.state.isPlaying) return;
      const frameInterval = 1000 / this.state.fps;
      const elapsed = now - this.lastFrameTime;
      if (elapsed >= frameInterval) {
        this.lastFrameTime = now - (elapsed % frameInterval);
        let next = this.state.currentFrame + 1;
        if (next > this.state.totalFrames) next = 1;
        this.state.currentFrame = next;
        this.preview.setData(this.keyframes, this.state);
        this.editor.setData(this.keyframes, this.state);
      }
      this.playTimerId = requestAnimationFrame(tick);
    };
    this.playTimerId = requestAnimationFrame(tick);
  }

  private handleFpsChange(fps: number): void {
    this.state.fps = fps;
    this.syncUI();
  }

  private handleExport(): void {
    const data: AnimationData = this.editor.exportAnimation();
    const json = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(json).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = json;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch {}
      document.body.removeChild(ta);
    });

    const hint = document.createElement('div');
    hint.textContent = '已导出JSON到剪贴板';
    hint.style.position = 'fixed';
    hint.style.top = '20px';
    hint.style.right = '20px';
    hint.style.background = '#00b894';
    hint.style.color = '#fff';
    hint.style.padding = '10px 18px';
    hint.style.borderRadius = '4px';
    hint.style.fontSize = '13px';
    hint.style.zIndex = '100000';
    hint.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
    document.body.appendChild(hint);
    setTimeout(() => hint.remove(), 1600);
  }

  destroy(): void {
    if (this.playTimerId !== null) cancelAnimationFrame(this.playTimerId);
    this.editor.destroy();
  }
}
