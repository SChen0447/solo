export interface JointAngles {
  head: number;
  torso: number;
  leftArm: number;
  rightArm: number;
  leftLeg: number;
  rightLeg: number;
}

export interface Keyframe {
  index: number;
  joints: JointAngles;
}

export interface AnimationState {
  totalFrames: number;
  currentFrame: number;
  isPlaying: boolean;
  isLooping: boolean;
  keyframes: Keyframe[];
}

export interface JointNode {
  id: keyof JointAngles;
  x: number;
  y: number;
  angle: number;
  length: number;
  parentId?: keyof JointAngles;
  baseAngle: number;
}

export type JointId = keyof JointAngles;
