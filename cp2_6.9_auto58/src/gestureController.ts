import * as THREE from 'three';
import { HandLandmark } from './handTracker';

export type GestureType = 'none' | 'open' | 'fist' | 'wave';

export interface GestureState {
  gesture: GestureType;
  confidence: number;
}

export type GestureCallback = (state: GestureState) => void;

const FINGERTIP_INDICES = [8, 12, 16, 20];
const FINGER_PIP_INDICES = [6, 10, 14, 18];
const WRIST_INDEX = 0;
const PALM_CENTER_INDEX = 9;

export class GestureController {
  private onGestureChange: GestureCallback;
  private lastGesture: GestureType = 'none';
  private lastPalmPositions: THREE.Vector3[] = [];
  private gestureHistory: GestureType[] = [];
  private openGestureFired: boolean = false;
  private fistGestureFired: boolean = false;

  constructor(onGestureChange: GestureCallback) {
    this.onGestureChange = onGestureChange;
  }

  public analyze(landmarks: THREE.Vector3[]): GestureState {
    if (landmarks.length < 21) {
      this.resetState();
      return { gesture: 'none', confidence: 0 };
    }

    const isFist = this.detectFist(landmarks);
    const isOpen = this.detectOpenPalm(landmarks);
    const isWave = this.detectWave(landmarks);

    let gesture: GestureType = 'none';
    let confidence = 0;

    if (isFist) {
      gesture = 'fist';
      confidence = 0.9;
    } else if (isWave) {
      gesture = 'wave';
      confidence = 0.75;
    } else if (isOpen) {
      gesture = 'open';
      confidence = 0.85;
    }

    this.gestureHistory.push(gesture);
    if (this.gestureHistory.length > 5) {
      this.gestureHistory.shift();
    }

    const stableGesture = this.getStableGesture();

    if (stableGesture === 'open' && !this.openGestureFired && this.lastGesture !== 'open') {
      this.openGestureFired = true;
      this.fistGestureFired = false;
      this.onGestureChange({ gesture: stableGesture, confidence });
    } else if (stableGesture === 'fist' && !this.fistGestureFired && this.lastGesture !== 'fist') {
      this.fistGestureFired = true;
      this.openGestureFired = false;
      this.onGestureChange({ gesture: stableGesture, confidence });
    } else {
      if (stableGesture !== this.lastGesture) {
        this.onGestureChange({ gesture: stableGesture, confidence });
      }
      this.fistGestureFired = false;
      this.openGestureFired = false;
    }

    this.lastGesture = stableGesture;
    return { gesture: stableGesture, confidence };
  }

  private getStableGesture(): GestureType {
    if (this.gestureHistory.length < 3) return this.gestureHistory[this.gestureHistory.length - 1] || 'none';
    const counts: Record<string, number> = {};
    for (const g of this.gestureHistory) {
      counts[g] = (counts[g] || 0) + 1;
    }
    let maxGesture: GestureType = 'none';
    let maxCount = 0;
    for (const [g, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        maxGesture = g as GestureType;
      }
    }
    return maxGesture;
  }

  private detectFist(landmarks: THREE.Vector3[]): boolean {
    const palm = landmarks[PALM_CENTER_INDEX];
    let curledFingers = 0;

    for (let i = 0; i < FINGERTIP_INDICES.length; i++) {
      const tip = landmarks[FINGERTIP_INDICES[i]];
      const pip = landmarks[FINGER_PIP_INDICES[i]];
      const tipToPalm = tip.distanceTo(palm);
      const pipToPalm = pip.distanceTo(palm);

      if (tipToPalm < pipToPalm * 1.1) {
        curledFingers++;
      }
    }

    const thumbTip = landmarks[4];
    const thumbPalm = thumbTip.distanceTo(palm);
    if (thumbPalm < 0.7) curledFingers++;

    return curledFingers >= 4;
  }

  private detectOpenPalm(landmarks: THREE.Vector3[]): boolean {
    const palm = landmarks[PALM_CENTER_INDEX];
    const wrist = landmarks[WRIST_INDEX];
    const palmSize = palm.distanceTo(wrist);

    let extendedFingers = 0;
    for (let i = 0; i < FINGERTIP_INDICES.length; i++) {
      const tip = landmarks[FINGERTIP_INDICES[i]];
      const pip = landmarks[FINGER_PIP_INDICES[i]];
      const tipToPalm = tip.distanceTo(palm);
      const pipToPalm = pip.distanceTo(palm);

      if (tipToPalm > pipToPalm * 1.4 && tipToPalm > palmSize * 1.2) {
        extendedFingers++;
      }
    }

    const thumbTip = landmarks[4];
    if (thumbTip.distanceTo(palm) > palmSize * 0.9) extendedFingers++;

    return extendedFingers >= 4;
  }

  private detectWave(landmarks: THREE.Vector3[]): boolean {
    const palm = landmarks[PALM_CENTER_INDEX].clone();
    this.lastPalmPositions.push(palm);
    if (this.lastPalmPositions.length > 15) {
      this.lastPalmPositions.shift();
    }

    if (this.lastPalmPositions.length < 10) return false;

    let movementX = 0;
    let directionChanges = 0;
    let lastDirection = 0;

    for (let i = 1; i < this.lastPalmPositions.length; i++) {
      const dx = this.lastPalmPositions[i].x - this.lastPalmPositions[i - 1].x;
      movementX += Math.abs(dx);
      const direction = dx > 0.01 ? 1 : dx < -0.01 ? -1 : 0;
      if (direction !== 0 && lastDirection !== 0 && direction !== lastDirection) {
        directionChanges++;
      }
      if (direction !== 0) lastDirection = direction;
    }

    return movementX > 0.5 && directionChanges >= 2;
  }

  public getIsFist(landmarks: THREE.Vector3[]): boolean {
    if (landmarks.length < 21) return false;
    return this.detectFist(landmarks);
  }

  public resetState(): void {
    this.lastGesture = 'none';
    this.lastPalmPositions = [];
    this.gestureHistory = [];
    this.openGestureFired = false;
    this.fistGestureFired = false;
  }
}

export type { HandLandmark };
