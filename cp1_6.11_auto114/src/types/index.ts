export interface GameConfig {
  width: number;
  height: number;
  gravity: number;
  baseSpeed: number;
  jumpForce: number;
  maxJumpChargeTime: number;
  jumpChargeMultiplier: number;
  slideDuration: number;
  slideSpeedMultiplier: number;
  grappleMaxDistance: number;
  grapplePullSpeed: number;
  highSpeedThreshold: number;
}

export interface PlatformData {
  x: number;
  y: number;
  width: number;
  height: number;
  layer: number;
  hasGap: boolean;
  gapStart?: number;
  gapWidth?: number;
}

export interface CollectibleData {
  x: number;
  y: number;
  color: CollectibleColor;
  collected: boolean;
}

export type CollectibleColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';
export type ColorGroup = 'warm' | 'cool';

export const COLOR_HEX: Record<CollectibleColor, string> = {
  red: '#ff0040',
  orange: '#ff8c00',
  yellow: '#ffe600',
  green: '#39ff14',
  blue: '#00bfff',
  purple: '#bf00ff'
};

export const COLOR_GROUP: Record<CollectibleColor, ColorGroup> = {
  red: 'warm',
  orange: 'warm',
  yellow: 'warm',
  green: 'cool',
  blue: 'cool',
  purple: 'cool'
};

export const COLOR_ORDER: CollectibleColor[] = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

export interface DroneData {
  x: number;
  y: number;
  baseY: number;
  amplitude: number;
  frequency: number;
  phase: number;
  rotation: number;
  rotationSpeed: number;
  active: boolean;
}

export interface GrappleState {
  active: boolean;
  targetX: number;
  targetY: number;
  pulling: boolean;
  lineGraphics?: Phaser.GameObjects.Graphics;
  endPoint?: Phaser.GameObjects.Arc;
}

export interface PlayerState {
  isJumping: boolean;
  isSliding: boolean;
  isGrappling: boolean;
  jumpChargeTime: number;
  jumpCharging: boolean;
  slideTimer: number;
  velocityX: number;
  velocityY: number;
  originalHeight: number;
}

export interface ComboState {
  currentGroup: ColorGroup | null;
  count: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  width: 1280,
  height: 720,
  gravity: 1200,
  baseSpeed: 300,
  jumpForce: 600,
  maxJumpChargeTime: 0.5,
  jumpChargeMultiplier: 1.5,
  slideDuration: 0.4,
  slideSpeedMultiplier: 1.2,
  grappleMaxDistance: 300,
  grapplePullSpeed: 800,
  highSpeedThreshold: 200
};
