export enum Season {
  SPRING = 'spring',
  SUMMER = 'summer',
  AUTUMN = 'autumn',
  WINTER = 'winter'
}

export enum WeatherType {
  SUNNY = 'sunny',
  CLOUDY = 'cloudy',
  STARRY = 'starry',
  RAINY = 'rainy',
  SUNSET = 'sunset'
}

export interface SkyColors {
  top: string;
  bottom: string;
}

export interface SceneConfig {
  season: Season;
  weather: WeatherType;
  skyColors: SkyColors;
  groundColor: string;
  effects: EffectType[];
  soundName?: string;
}

export enum EffectType {
  CHERRY_BLOSSOMS = 'cherry_blossoms',
  FIREFLIES = 'fireflies',
  MAPLE_LEAVES = 'maple_leaves',
  SNOWFLAKES = 'snowflakes',
  RAIN = 'rain',
  STARS = 'stars'
}

export interface Cloud {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  speed: number;
}

export interface Bird {
  x: number;
  y: number;
  baseY: number;
  speed: number;
  amplitude: number;
  phase: number;
  direction: 1 | -1;
  active: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  size: number;
  color?: string;
  life?: number;
  active: boolean;
}

export interface Firefly extends Particle {
  brightness: number;
  brightnessSpeed: number;
  glowRadius: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

export interface Raindrop {
  x: number;
  y: number;
  speed: number;
  length: number;
  opacity: number;
}

export interface SceneState {
  currentScene: SceneConfig;
  transitionProgress: number;
  isTransitioning: boolean;
  previousScene?: SceneConfig;
}

export interface WindowSize {
  width: number;
  height: number;
}

export interface WindowResizeEvent {
  size: WindowSize;
  scale: number;
}
