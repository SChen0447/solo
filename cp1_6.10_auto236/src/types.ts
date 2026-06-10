export type FractalType = 'mandelbrot' | 'julia' | 'burningship';

export interface Viewport {
  centerX: number;
  centerY: number;
  zoom: number;
}

export interface ColorStop {
  position: number;
  color: string;
}

export interface ColorScheme {
  id: string;
  name: string;
  stops: ColorStop[];
}

export interface FractalParams {
  fractalType: FractalType;
  maxIterations: number;
  colorScheme: ColorScheme;
  juliaConstant?: { re: number; im: number };
}

export interface AppState {
  viewport: Viewport;
  params: FractalParams;
}

export const COLOR_SCHEMES: ColorScheme[] = [
  {
    id: 'fire',
    name: '火焰红橙',
    stops: [
      { position: 0.0, color: '#000000' },
      { position: 0.25, color: '#330000' },
      { position: 0.5, color: '#990000' },
      { position: 0.75, color: '#ff3300' },
      { position: 1.0, color: '#ffaa00' }
    ]
  },
  {
    id: 'ocean',
    name: '海洋蓝绿',
    stops: [
      { position: 0.0, color: '#000022' },
      { position: 0.25, color: '#003366' },
      { position: 0.5, color: '#0088aa' },
      { position: 0.75, color: '#00cccc' },
      { position: 1.0, color: '#aaffee' }
    ]
  },
  {
    id: 'aurora',
    name: '极光紫青',
    stops: [
      { position: 0.0, color: '#000033' },
      { position: 0.25, color: '#330066' },
      { position: 0.5, color: '#9900cc' },
      { position: 0.75, color: '#00ccff' },
      { position: 1.0, color: '#99ffcc' }
    ]
  },
  {
    id: 'lava',
    name: '熔岩红黑',
    stops: [
      { position: 0.0, color: '#000000' },
      { position: 0.25, color: '#1a0000' },
      { position: 0.5, color: '#660000' },
      { position: 0.75, color: '#cc0000' },
      { position: 1.0, color: '#ff4400' }
    ]
  },
  {
    id: 'starry',
    name: '星空蓝紫',
    stops: [
      { position: 0.0, color: '#000011' },
      { position: 0.25, color: '#110033' },
      { position: 0.5, color: '#333399' },
      { position: 0.75, color: '#6666ff' },
      { position: 1.0, color: '#9999ff' }
    ]
  },
  {
    id: 'neon',
    name: '霓虹彩虹',
    stops: [
      { position: 0.0, color: '#000000' },
      { position: 0.25, color: '#ff00ff' },
      { position: 0.5, color: '#00ffff' },
      { position: 0.75, color: '#ffff00' },
      { position: 1.0, color: '#ffffff' }
    ]
  }
];

export const DEFAULT_VIEWPORT: Viewport = {
  centerX: -0.5,
  centerY: 0,
  zoom: 1
};

export const DEFAULT_PARAMS: FractalParams = {
  fractalType: 'mandelbrot',
  maxIterations: 50,
  colorScheme: COLOR_SCHEMES[0],
  juliaConstant: { re: -0.7, im: 0.27015 }
};
