export interface RGB {
  r: number;
  g: number;
  b: number;
}

const COLOR_STOPS: Array<{ temp: number; color: RGB }> = [
  { temp: 0,   color: { r: 58,  g: 58,  b: 58  } },
  { temp: 20,  color: { r: 74,  g: 74,  b: 74  } },
  { temp: 30,  color: { r: 90,  g: 26,  b: 26  } },
  { temp: 40,  color: { r: 139, g: 0,   b: 0   } },
  { temp: 60,  color: { r: 178, g: 34,  b: 34  } },
  { temp: 80,  color: { r: 255, g: 69,  b: 0   } },
  { temp: 95,  color: { r: 255, g: 165, b: 0   } },
  { temp: 100, color: { r: 255, g: 204, b: 0   } },
];

export class TemperatureController {
  private _temperature: number = 0;
  private readonly BLOW_RATE: number = 3;
  private readonly COOL_RATE_PER_SEC: number = 3;
  private readonly MIN_TEMP: number = 0;
  private readonly MAX_TEMP: number = 100;
  private readonly FORGE_THRESHOLD: number = 50;
  private readonly QUENCH_THRESHOLD: number = 40;
  private readonly SPARK_THRESHOLD: number = 70;
  private readonly SPARK_DOUBLE_THRESHOLD: number = 90;

  get temperature(): number {
    return this._temperature;
  }

  blowAir(): number {
    this._temperature = Math.min(this.MAX_TEMP, this._temperature + this.BLOW_RATE);
    return this._temperature;
  }

  update(dtSeconds: number): number {
    if (this._temperature > this.MIN_TEMP) {
      this._temperature = Math.max(
        this.MIN_TEMP,
        this._temperature - this.COOL_RATE_PER_SEC * dtSeconds
      );
    }
    return this._temperature;
  }

  canForge(): boolean {
    return this._temperature > this.FORGE_THRESHOLD;
  }

  canQuench(): boolean {
    return this._temperature > this.QUENCH_THRESHOLD;
  }

  getSparkDensity(): number {
    if (this._temperature > this.SPARK_DOUBLE_THRESHOLD) {
      return 2;
    }
    if (this._temperature > this.SPARK_THRESHOLD) {
      return 1;
    }
    return 0;
  }

  getColor(): RGB {
    return this.interpolateColor(this._temperature);
  }

  getHexColor(): string {
    const rgb = this.getColor();
    return `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
  }

  getGlowAlpha(): number {
    if (this._temperature < 30) return 0;
    return Math.min(1, (this._temperature - 30) / 60);
  }

  private interpolateColor(temp: number): RGB {
    if (temp <= COLOR_STOPS[0].temp) {
      return { ...COLOR_STOPS[0].color };
    }
    if (temp >= COLOR_STOPS[COLOR_STOPS.length - 1].temp) {
      return { ...COLOR_STOPS[COLOR_STOPS.length - 1].color };
    }
    for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
      const lower = COLOR_STOPS[i];
      const upper = COLOR_STOPS[i + 1];
      if (temp >= lower.temp && temp <= upper.temp) {
        const t = (temp - lower.temp) / (upper.temp - lower.temp);
        return {
          r: lower.color.r + (upper.color.r - lower.color.r) * t,
          g: lower.color.g + (upper.color.g - lower.color.g) * t,
          b: lower.color.b + (upper.color.b - lower.color.b) * t,
        };
      }
    }
    return { r: 58, g: 58, b: 58 };
  }

  reset(): void {
    this._temperature = 0;
  }

  quench(): { effective: boolean; hardnessBonus: number; toughnessPenalty: number } {
    const temp = this._temperature;
    if (temp > this.QUENCH_THRESHOLD) {
      const factor = Math.min(1, (temp - this.QUENCH_THRESHOLD) / 60);
      this._temperature = 10;
      return {
        effective: true,
        hardnessBonus: 20 + 25 * factor,
        toughnessPenalty: 10 + 15 * factor,
      };
    }
    const halfFactor = Math.min(0.5, temp / this.QUENCH_THRESHOLD * 0.5);
    this._temperature = Math.max(5, temp * 0.5);
    return {
      effective: false,
      hardnessBonus: 10 * halfFactor,
      toughnessPenalty: 5 * halfFactor,
    };
  }
}
