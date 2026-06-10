import { JointName, JOINT_NAMES, JointKeyframes, Point, EditorState } from './types';
import { getAllJointAngles, computeJointPositions, JOINT_CONFIG, normalizeAngle } from './skeleton';

export interface PreviewCallbacks {
  onJointDragStart: (joint: JointName) => void;
  onJointDragMove: (joint: JointName, angle: number) => void;
  onJointDragEnd: () => void;
}

export class Preview {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: PreviewCallbacks;
  private keyframes: JointKeyframes;
  private state: EditorState;
  private dpr: number = 1;
  private draggingJoint: JointName | null = null;
  private characterOrigin: Point = { x: 0, y: 0 };

  constructor(container: HTMLElement, callbacks: PreviewCallbacks) {
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

    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    container.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.setupDPR();
    this.bindEvents();
    window.addEventListener('resize', () => {
      this.setupDPR();
      this.render();
    });
  }

  private setupDPR(): void {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const w = rect.width;
    const h = rect.height;
    this.characterOrigin = { x: w / 2, y: h / 2 + 40 };
  }

  setData(keyframes: JointKeyframes, state: EditorState): void {
    this.keyframes = keyframes;
    this.state = state;
    this.render();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseUp);
  }

  private getMousePos(e: MouseEvent): Point {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private hitTestJoint(pos: Point): JointName | null {
    const angles = getAllJointAngles(this.keyframes, this.state.currentFrame);
    const positions = computeJointPositions(angles, this.characterOrigin);
    const hitRadius = 10;
    for (const name of JOINT_NAMES) {
      const jp = positions[name].jointPoint;
      const dx = pos.x - jp.x;
      const dy = pos.y - jp.y;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return name;
      }
    }
    return null;
  }

  private handleMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    const pos = this.getMousePos(e);
    const joint = this.hitTestJoint(pos);
    if (joint) {
      this.draggingJoint = joint;
      this.callbacks.onJointDragStart(joint);
      this.handleMouseMove(e);
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.draggingJoint) return;
    const pos = this.getMousePos(e);
    const angles = getAllJointAngles(this.keyframes, this.state.currentFrame);
    const positions = computeJointPositions(angles, this.characterOrigin);
    const joint = this.draggingJoint;
    const jp = positions[joint].jointPoint;
    const cfg = JOINT_CONFIG[joint];

    let parentAngle = 0;
    if (cfg.parent) {
      parentAngle = angles[cfg.parent];
    } else {
      parentAngle = cfg.baseAngle;
    }

    const dx = pos.x - jp.x;
    const dy = pos.y - jp.y;
    const absoluteAngle = (Math.atan2(dy, dx) * 180) / Math.PI;

    let relAngle: number;
    if (joint === 'torso') {
      relAngle = normalizeAngle(absoluteAngle - cfg.baseAngle);
    } else if (joint === 'head') {
      relAngle = normalizeAngle(absoluteAngle - (angles.torso + 90));
    } else if (joint === 'leftArm' || joint === 'rightArm') {
      relAngle = normalizeAngle(absoluteAngle - (angles.torso + 90) + cfg.baseAngle);
    } else {
      relAngle = normalizeAngle(absoluteAngle - (angles.torso + 90) + cfg.baseAngle);
    }

    relAngle = Math.max(-180, Math.min(180, relAngle));
    this.callbacks.onJointDragMove(joint, relAngle);
  };

  private handleMouseUp = (): void => {
    if (this.draggingJoint) {
      this.draggingJoint = null;
      this.callbacks.onJointDragEnd();
    }
  };

  render(): void {
    const ctx = this.ctx;
    const rect = this.container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#0f0f23');
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    const angles = getAllJointAngles(this.keyframes, this.state.currentFrame);
    const positions = computeJointPositions(angles, this.characterOrigin);

    if (this.state.isPlaying) {
      ctx.save();
      ctx.shadowColor = '#00cec9';
      ctx.shadowBlur = 6;
      ctx.globalAlpha = 0.3;
      this.drawCharacter(positions);
      ctx.restore();
    }

    this.drawCharacter(positions);

    for (const name of JOINT_NAMES) {
      const jp = positions[name].jointPoint;
      const isSelected = this.state.selectedJoint === name;
      ctx.beginPath();
      ctx.arc(jp.x, jp.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ff7675';
      ctx.fill();
      if (isSelected) {
        ctx.strokeStyle = '#ffeb3b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(jp.x, jp.y, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  private drawCharacter(positions: Record<JointName, { start: Point; end: Point; jointPoint: Point }>): void {
    const ctx = this.ctx;
    ctx.strokeStyle = '#00cec9';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(positions.torso.start.x, positions.torso.start.y);
    ctx.lineTo(positions.torso.end.x, positions.torso.end.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(positions.head.end.x, positions.head.end.y, 10, 0, Math.PI * 2);
    ctx.stroke();

    for (const limb of ['leftArm', 'rightArm', 'leftLeg', 'rightLeg'] as JointName[]) {
      const p = positions[limb];
      ctx.beginPath();
      ctx.moveTo(p.start.x, p.start.y);
      ctx.lineTo(p.end.x, p.end.y);
      ctx.stroke();
    }
  }
}
