export interface AnimationConfig {
  type: string;
  duration: number;
  delay: number;
  easing: string;
  iterationCount: string;
  direction: string;
  fillMode: string;
}

export interface AnimationPreset {
  name: string;
  icon: string;
  config: AnimationConfig;
}

export const presets: AnimationPreset[] = [
  {
    name: '心跳',
    icon: '💓',
    config: {
      type: 'heartbeat',
      duration: 1.2,
      delay: 0,
      easing: 'ease-in-out',
      iterationCount: 'infinite',
      direction: 'normal',
      fillMode: 'both'
    }
  },
  {
    name: '抖动',
    icon: '📳',
    config: {
      type: 'shake',
      duration: 0.6,
      delay: 0,
      easing: 'ease-in-out',
      iterationCount: 'infinite',
      direction: 'normal',
      fillMode: 'both'
    }
  },
  {
    name: '渐变位移',
    icon: '🌈',
    config: {
      type: 'gradientShift',
      duration: 3,
      delay: 0,
      easing: 'linear',
      iterationCount: 'infinite',
      direction: 'normal',
      fillMode: 'both'
    }
  },
  {
    name: '弹跳入场',
    icon: '🏀',
    config: {
      type: 'bounce',
      duration: 1.5,
      delay: 0,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      iterationCount: 'infinite',
      direction: 'alternate',
      fillMode: 'both'
    }
  },
  {
    name: '脉冲',
    icon: '💫',
    config: {
      type: 'pulse',
      duration: 2,
      delay: 0,
      easing: 'ease-in-out',
      iterationCount: 'infinite',
      direction: 'normal',
      fillMode: 'both'
    }
  },
  {
    name: '浮动',
    icon: '🎈',
    config: {
      type: 'float',
      duration: 3,
      delay: 0,
      easing: 'ease-in-out',
      iterationCount: 'infinite',
      direction: 'alternate',
      fillMode: 'both'
    }
  },
  {
    name: '旋转发光',
    icon: '🌀',
    config: {
      type: 'rotate',
      duration: 2,
      delay: 0,
      easing: 'linear',
      iterationCount: 'infinite',
      direction: 'normal',
      fillMode: 'both'
    }
  }
];

export const defaultConfig: AnimationConfig = {
  type: 'fadeIn',
  duration: 1,
  delay: 0,
  easing: 'ease-in-out',
  iterationCount: 'infinite',
  direction: 'normal',
  fillMode: 'forwards'
};
