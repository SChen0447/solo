export interface ConfigData {
  concentration: number;
  diffusionSpeed: number;
  dryingSpeed: number;
}

export type ConfigKey = keyof ConfigData;

class Config {
  private data: ConfigData = {
    concentration: 5,
    diffusionSpeed: 1.5,
    dryingSpeed: 2.5
  };

  private listeners: Map<ConfigKey, Set<(value: number) => void>> = new Map();

  get<K extends ConfigKey>(key: K): number {
    return this.data[key];
  }

  getAll(): ConfigData {
    return { ...this.data };
  }

  set<K extends ConfigKey>(key: K, value: number): void {
    if (this.data[key] !== value) {
      this.data[key] = value;
      const keyListeners = this.listeners.get(key);
      if (keyListeners) {
        keyListeners.forEach(fn => fn(value));
      }
    }
  }

  on<K extends ConfigKey>(key: K, callback: (value: number) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(callback);
    return () => {
      this.listeners.get(key)?.delete(callback);
    };
  }
}

export const config = new Config();
