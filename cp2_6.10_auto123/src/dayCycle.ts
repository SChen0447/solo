export interface DayCycleParams {
  time: number;
  ambientIntensity: number;
}

export interface DayCycleResult {
  skyColorTop: string;
  skyColorBottom: string;
  ambientLight: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  shadowOpacity: number;
  groundColorTop: string;
  groundColorBottom: string;
  mountainColor: string;
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  return rgbToHex(lerp(c1.r, c2.r, t), lerp(c1.g, c2.g, t), lerp(c1.b, c2.b, t));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

interface ColorStop {
  time: number;
  skyTop: string;
  skyBottom: string;
  groundTop: string;
  groundBottom: string;
  mountain: string;
}

const colorStops: ColorStop[] = [
  {
    time: 0,
    skyTop: '#0a0a2e',
    skyBottom: '#1a1a3e',
    groundTop: '#1a3a2a',
    groundBottom: '#2a4a3a',
    mountain: '#1a1a2a',
  },
  {
    time: 5,
    skyTop: '#0a0a2e',
    skyBottom: '#1a1a3e',
    groundTop: '#1a3a2a',
    groundBottom: '#2a4a3a',
    mountain: '#1a1a2a',
  },
  {
    time: 6.5,
    skyTop: '#4a3a6e',
    skyBottom: '#ff9f43',
    groundTop: '#2d5a3f',
    groundBottom: '#40815c',
    mountain: '#2a2a4a',
  },
  {
    time: 8,
    skyTop: '#6ab0e8',
    skyBottom: '#b8e0f0',
    groundTop: '#2d6a4f',
    groundBottom: '#40916c',
    mountain: '#3a4a5a',
  },
  {
    time: 12,
    skyTop: '#4a90d0',
    skyBottom: '#87ceeb',
    groundTop: '#2d6a4f',
    groundBottom: '#40916c',
    mountain: '#4a5a6a',
  },
  {
    time: 16,
    skyTop: '#5a8ac0',
    skyBottom: '#a8d0e8',
    groundTop: '#2d6a4f',
    groundBottom: '#40916c',
    mountain: '#4a5a6a',
  },
  {
    time: 17.5,
    skyTop: '#5a3a5e',
    skyBottom: '#ff9f43',
    groundTop: '#2d5a3f',
    groundBottom: '#40815c',
    mountain: '#3a3a4a',
  },
  {
    time: 19.5,
    skyTop: '#2a1a4e',
    skyBottom: '#4a2a5e',
    groundTop: '#1a3a2a',
    groundBottom: '#2a4a3a',
    mountain: '#2a2a3a',
  },
  {
    time: 21,
    skyTop: '#0a0a2e',
    skyBottom: '#1a1a3e',
    groundTop: '#1a3a2a',
    groundBottom: '#2a4a3a',
    mountain: '#1a1a2a',
  },
  {
    time: 24,
    skyTop: '#0a0a2e',
    skyBottom: '#1a1a3e',
    groundTop: '#1a3a2a',
    groundBottom: '#2a4a3a',
    mountain: '#1a1a2a',
  },
];

function interpolateColors(time: number): {
  skyTop: string;
  skyBottom: string;
  groundTop: string;
  groundBottom: string;
  mountain: string;
} {
  for (let i = 0; i < colorStops.length - 1; i++) {
    const curr = colorStops[i];
    const next = colorStops[i + 1];
    if (time >= curr.time && time <= next.time) {
      const t = smoothstep(curr.time, next.time, time);
      return {
        skyTop: lerpColor(curr.skyTop, next.skyTop, t),
        skyBottom: lerpColor(curr.skyBottom, next.skyBottom, t),
        groundTop: lerpColor(curr.groundTop, next.groundTop, t),
        groundBottom: lerpColor(curr.groundBottom, next.groundBottom, t),
        mountain: lerpColor(curr.mountain, next.mountain, t),
      };
    }
  }
  const last = colorStops[colorStops.length - 1];
  return {
    skyTop: last.skyTop,
    skyBottom: last.skyBottom,
    groundTop: last.groundTop,
    groundBottom: last.groundBottom,
    mountain: last.mountain,
  };
}

function calculateAmbientLight(time: number): number {
  if (time < 5 || time > 21) {
    return 0.2;
  }
  if (time < 7) {
    return lerp(0.2, 1.0, smoothstep(5, 7, time));
  }
  if (time > 19) {
    return lerp(1.0, 0.2, smoothstep(19, 21, time));
  }
  if (time >= 10 && time <= 14) {
    return 1.0;
  }
  if (time < 10) {
    return lerp(0.8, 1.0, smoothstep(7, 10, time));
  }
  return lerp(1.0, 0.8, smoothstep(14, 19, time));
}

function calculateShadowOffset(time: number): { x: number; y: number } {
  const maxOffset = 30;
  if (time <= 6 || time >= 20) {
    return { x: -maxOffset * 0.5, y: maxOffset * 0.3 };
  }
  if (time < 12) {
    const t = smoothstep(6, 12, time);
    return {
      x: lerp(-maxOffset * 0.8, 0, t),
      y: lerp(maxOffset * 0.5, maxOffset * 0.05, t),
    };
  }
  const t = smoothstep(12, 20, time);
  return {
    x: lerp(0, maxOffset, t),
    y: lerp(maxOffset * 0.05, maxOffset, t),
  };
}

function calculateShadowOpacity(time: number): number {
  if (time < 5 || time > 21) {
    return 0.8;
  }
  if (time < 8) {
    return lerp(0.8, 0.3, smoothstep(5, 8, time));
  }
  if (time > 18) {
    return lerp(0.3, 0.8, smoothstep(18, 21, time));
  }
  if (time >= 11 && time <= 13) {
    return 0.2;
  }
  if (time < 11) {
    return lerp(0.3, 0.2, smoothstep(8, 11, time));
  }
  return lerp(0.2, 0.3, smoothstep(13, 18, time));
}

export function computeDayCycle(params: DayCycleParams): DayCycleResult {
  const { time, ambientIntensity } = params;
  const normalizedTime = ((time % 24) + 24) % 24;
  const colors = interpolateColors(normalizedTime);
  const baseAmbient = calculateAmbientLight(normalizedTime);
  const shadow = calculateShadowOffset(normalizedTime);
  const shadowOpacity = calculateShadowOpacity(normalizedTime);

  return {
    skyColorTop: colors.skyTop,
    skyColorBottom: colors.skyBottom,
    ambientLight: baseAmbient * ambientIntensity,
    shadowOffsetX: shadow.x,
    shadowOffsetY: shadow.y,
    shadowOpacity,
    groundColorTop: colors.groundTop,
    groundColorBottom: colors.groundBottom,
    mountainColor: colors.mountain,
  };
}

export function formatTime(time: number): string {
  const normalizedTime = ((time % 24) + 24) % 24;
  const hours = Math.floor(normalizedTime);
  const minutes = Math.floor((normalizedTime - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
