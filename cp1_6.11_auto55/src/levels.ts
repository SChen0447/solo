export interface LevelConfig {
  id: number;
  name: string;
  hint: string;
  targetX: number;
  targetY: number;
  initialPlatformAngleX: number;
  initialPlatformAngleZ: number;
  magneticFieldFrequency: number;
  magneticFieldAmplitude: number;
  magneticFieldRandomness: number;
  magneticFieldEnabled: boolean;
}

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: '第 1 关',
    hint: '调整平台角度，引导小球击中正上方靶心',
    targetX: 0,
    targetY: -320,
    initialPlatformAngleX: 0,
    initialPlatformAngleZ: 0,
    magneticFieldFrequency: 0,
    magneticFieldAmplitude: 0,
    magneticFieldRandomness: 0,
    magneticFieldEnabled: false
  },
  {
    id: 2,
    name: '第 2 关',
    hint: '磁场开始波动，注意轨道偏移',
    targetX: 280,
    targetY: -240,
    initialPlatformAngleX: 0,
    initialPlatformAngleZ: 15,
    magneticFieldFrequency: 0.8,
    magneticFieldAmplitude: 25,
    magneticFieldRandomness: 0.1,
    magneticFieldEnabled: true
  },
  {
    id: 3,
    name: '第 3 关',
    hint: '强磁场干扰，精确控制激光脉冲！',
    targetX: -300,
    targetY: 220,
    initialPlatformAngleX: 0,
    initialPlatformAngleZ: -20,
    magneticFieldFrequency: 1.5,
    magneticFieldAmplitude: 40,
    magneticFieldRandomness: 0.3,
    magneticFieldEnabled: true
  }
];

export const CONSTANTS = {
  SCENE_RADIUS: 420,
  PLATFORM_SIZE: 120,
  PLATFORM_HALF: 60,
  MAGNETIC_RING_RADIUS: 80,
  BALL_RADIUS: 10,
  TARGET_SIZE: 28,
  GRAVITY: 80,
  FRICTION: 0.985,
  LASER_IMPULSE: 520,
  LASER_COOLDOWN: 0.5,
  MAX_BALLS: 3,
  TRAIL_LENGTH: 80,
  CAMERA_ROTATION_SPEED: Math.PI / 4,
  PLATFORM_ANGLE_SPEED: 45,
  MAX_PLATFORM_ANGLE: 30
};
