export type GradientDirection = 'vertical' | 'horizontal' | 'diagonal';

export interface ConfigState {
  charset: string;
  speed: number;
  density: number;
  gradientDirection: GradientDirection;
  glowEnabled: boolean;
  glowIntensity: number;
}

export type ConfigKey = keyof ConfigState;

export type ConfigUpdateCallback = (key: ConfigKey, value: ConfigState[ConfigKey]) => void;

const DEFAULT_CHARSET = 'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$+-*/=%\"\'#&(),.;:?!|<>[]{}@';

export const DEFAULT_CONFIG: Readonly<ConfigState> = {
  charset: DEFAULT_CHARSET,
  speed: 1.0,
  density: 1.0,
  gradientDirection: 'vertical',
  glowEnabled: false,
  glowIntensity: 0.5
};

class ConfigManager {
  private state: ConfigState;
  private callbacks: Set<ConfigUpdateCallback> = new Set();

  constructor() {
    this.state = { ...DEFAULT_CONFIG };
  }

  get<K extends ConfigKey>(key: K): ConfigState[K] {
    return this.state[key];
  }

  getAll(): Readonly<ConfigState> {
    return { ...this.state };
  }

  set<K extends ConfigKey>(key: K, value: ConfigState[K]): void {
    if (this.state[key] === value) return;
    this.state[key] = value;
    this.callbacks.forEach(cb => cb(key, value));
  }

  reset(): void {
    const keys = Object.keys(DEFAULT_CONFIG) as ConfigKey[];
    keys.forEach(key => {
      this.set(key, DEFAULT_CONFIG[key]);
    });
  }

  subscribe(callback: ConfigUpdateCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }
}

export const config = new ConfigManager();
