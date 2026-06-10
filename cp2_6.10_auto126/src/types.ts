export type JointName = 'head' | 'torso' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg';

export const JOINT_NAMES: JointName[] = ['head', 'torso', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'];

export const JOINT_LABELS: Record<JointName, string> = {
  head: '头部',
  torso: '躯干',
  leftArm: '左臂',
  rightArm: '右臂',
  leftLeg: '左腿',
  rightLeg: '右腿'
};

export interface Keyframe {
  frame: number;
  angle: number;
}

export type JointKeyframes = Record<JointName, Keyframe[]>;

export interface AnimationData {
  character: string;
  totalFrames: number;
  keyframes: JointKeyframes;
}

export interface JointState {
  name: JointName;
  angle: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface EditorState {
  totalFrames: number;
  currentFrame: number;
  selectedJoint: JointName | null;
  selectedKeyframe: { joint: JointName; frame: number } | null;
  isPlaying: boolean;
  fps: number;
}
