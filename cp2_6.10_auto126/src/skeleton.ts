import { JointName, JOINT_NAMES, Keyframe, JointKeyframes, JointState, Point } from './types';
import { cloneDeep, sortBy } from 'lodash';

export const JOINT_CONFIG: Record<JointName, { length: number; parent: JointName | null; baseAngle: number }> = {
  torso: { length: 40, parent: null, baseAngle: -90 },
  head: { length: 10, parent: 'torso', baseAngle: 0 },
  leftArm: { length: 30, parent: 'torso', baseAngle: 45 },
  rightArm: { length: 30, parent: 'torso', baseAngle: -45 },
  leftLeg: { length: 35, parent: 'torso', baseAngle: 30 },
  rightLeg: { length: 35, parent: 'torso', baseAngle: -30 }
};

export function createInitialKeyframes(): JointKeyframes {
  const result: Partial<JointKeyframes> = {};
  for (const name of JOINT_NAMES) {
    result[name] = [];
  }
  return result as JointKeyframes;
}

export function addKeyframe(keyframes: JointKeyframes, joint: JointName, frame: number, angle: number): JointKeyframes {
  const next = cloneDeep(keyframes);
  const list = next[joint];
  const existing = list.findIndex(k => k.frame === frame);
  if (existing >= 0) {
    list[existing].angle = angle;
  } else {
    list.push({ frame, angle });
  }
  next[joint] = sortBy(list, 'frame');
  return next;
}

export function removeKeyframe(keyframes: JointKeyframes, joint: JointName, frame: number): JointKeyframes {
  const next = cloneDeep(keyframes);
  next[joint] = next[joint].filter(k => k.frame !== frame);
  return next;
}

export function clearJointKeyframes(keyframes: JointKeyframes, joint: JointName): JointKeyframes {
  const next = cloneDeep(keyframes);
  next[joint] = [];
  return next;
}

export function copyKeyframe(keyframes: JointKeyframes, joint: JointName, fromFrame: number, toFrame: number): JointKeyframes {
  const src = keyframes[joint].find(k => k.frame === fromFrame);
  if (!src) return keyframes;
  return addKeyframe(keyframes, joint, toFrame, src.angle);
}

export function moveKeyframe(keyframes: JointKeyframes, joint: JointName, fromFrame: number, toFrame: number): JointKeyframes {
  const src = keyframes[joint].find(k => k.frame === fromFrame);
  if (!src) return keyframes;
  let next = removeKeyframe(keyframes, joint, fromFrame);
  next = addKeyframe(next, joint, toFrame, src.angle);
  return next;
}

export function normalizeAngle(angle: number): number {
  while (angle > 180) angle -= 360;
  while (angle < -180) angle += 360;
  return angle;
}

function linearInterpolate(a: number, b: number, t: number): number {
  const diff = b - a;
  const shortest = ((diff + 180) % 360) - 180;
  return normalizeAngle(a + shortest * t);
}

export function getJointAngleAtFrame(keyframes: JointKeyframes, joint: JointName, frame: number): number {
  const base = JOINT_CONFIG[joint].baseAngle;
  const list = keyframes[joint];
  if (list.length === 0) return base;

  if (frame <= list[0].frame) return base + list[0].angle;
  if (frame >= list[list.length - 1].frame) return base + list[list.length - 1].angle;

  for (let i = 0; i < list.length - 1; i++) {
    const k1 = list[i];
    const k2 = list[i + 1];
    if (frame >= k1.frame && frame <= k2.frame) {
      const t = (frame - k1.frame) / (k2.frame - k1.frame);
      const a = k1.angle;
      const b = k2.angle;
      return base + linearInterpolate(a, b, t);
    }
  }

  return base;
}

export function getAllJointAngles(keyframes: JointKeyframes, frame: number): Record<JointName, number> {
  const result: Partial<Record<JointName, number>> = {};
  for (const name of JOINT_NAMES) {
    result[name] = getJointAngleAtFrame(keyframes, name, frame);
  }
  return result as Record<JointName, number>;
}

function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function computeJointPositions(angles: Record<JointName, number>, origin: Point): Record<JointName, { start: Point; end: Point; jointPoint: Point }> {
  const result: Partial<Record<JointName, { start: Point; end: Point; jointPoint: Point }>> = {};

  const torsoAngle = angles.torso;
  const torsoLen = JOINT_CONFIG.torso.length;
  const torsoEnd: Point = {
    x: origin.x + Math.cos(deg2rad(torsoAngle)) * torsoLen,
    y: origin.y + Math.sin(deg2rad(torsoAngle)) * torsoLen
  };
  result.torso = { start: origin, end: torsoEnd, jointPoint: origin };

  const headLen = JOINT_CONFIG.head.length;
  const headAngle = torsoAngle + 90 + angles.head;
  const headPos: Point = {
    x: torsoEnd.x + Math.cos(deg2rad(headAngle - 90)) * headLen,
    y: torsoEnd.y + Math.sin(deg2rad(headAngle - 90)) * headLen
  };
  result.head = { start: torsoEnd, end: headPos, jointPoint: torsoEnd };

  function computeLimb(name: JointName, parentEnd: Point, parentAngle: number): { start: Point; end: Point; jointPoint: Point } {
    const cfg = JOINT_CONFIG[name];
    const angle = parentAngle + angles[name] - cfg.baseAngle;
    const end: Point = {
      x: parentEnd.x + Math.cos(deg2rad(angle)) * cfg.length,
      y: parentEnd.y + Math.sin(deg2rad(angle)) * cfg.length
    };
    return { start: parentEnd, end, jointPoint: parentEnd };
  }

  result.leftArm = computeLimb('leftArm', torsoEnd, torsoAngle + 90);
  result.rightArm = computeLimb('rightArm', torsoEnd, torsoAngle + 90);
  result.leftLeg = computeLimb('leftLeg', origin, torsoAngle + 90);
  result.rightLeg = computeLimb('rightLeg', origin, torsoAngle + 90);

  return result as Record<JointName, { start: Point; end: Point; jointPoint: Point }>;
}

export function angleFromJointToPoint(joint: JointName, jointPos: Point, target: Point, parentAngle: number): number {
  const cfg = JOINT_CONFIG[joint];
  const dx = target.x - jointPos.x;
  const dy = target.y - jointPos.y;
  const absoluteAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
  let rel = absoluteAngle - (parentAngle + 90 - cfg.baseAngle);
  if (joint === 'torso') {
    rel = absoluteAngle - cfg.baseAngle;
  }
  return normalizeAngle(rel);
}
