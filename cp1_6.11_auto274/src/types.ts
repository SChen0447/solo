export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export type Handedness = 'Left' | 'Right';

export interface HandLandmark {
  landmarks: Point3D[];
  handedness: Handedness;
}

export type HandGesture = 'open' | 'fist' | 'unknown';

export interface HandState {
  handedness: Handedness;
  landmarks: Point3D[];
  gesture: HandGesture;
  palmAngle: number;
  palmUp: boolean;
  palmDown: boolean;
  palmPosition: Point2D;
}

export interface TrackingData {
  hands: HandState[];
  leftHand: HandState | null;
  rightHand: HandState | null;
  handsDistance: number;
  timestamp: number;
}

export type LightMode = 'starlight' | 'spotlight';

export interface LightParams {
  mode: LightMode;
  colorTemperature: 'warm' | 'cool' | 'mixed';
  mainSpotX: number;
  rotationSpeed: number;
  flashEffect: boolean;
  flashProgress: number;
}
