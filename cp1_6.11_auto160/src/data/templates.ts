export interface LayerConfig {
  id: string;
  index: number;
  paperColor: string;
  opacity: number;
  patternId: string | null;
  customMaskData: string | null;
  zIndex: number;
}

export interface LightConfig {
  horizontalAngle: number;
  verticalAngle: number;
  colorTemperature: number;
  brightness: number;
}

export interface TemplateConfig {
  id: string;
  name: string;
  nameZh: string;
  layers: LayerConfig[];
  light: LightConfig;
}

export const TEMPLATES: TemplateConfig[] = [
  {
    id: "bamboo_moonlight",
    name: "Bamboo Moonlight",
    nameZh: "竹林月光",
    layers: [
      { id: "layer-0", index: 0, paperColor: "#fdf5e6", opacity: 0.85, patternId: "bamboo", customMaskData: null, zIndex: 3 },
      { id: "layer-1", index: 1, paperColor: "#faf0dc", opacity: 0.80, patternId: "moon", customMaskData: null, zIndex: 2 },
      { id: "layer-2", index: 2, paperColor: "#f5ead2", opacity: 0.75, patternId: "cloud", customMaskData: null, zIndex: 1 },
      { id: "layer-3", index: 3, paperColor: "#f0f8ff", opacity: 0.70, patternId: null, customMaskData: null, zIndex: 0 },
    ],
    light: { horizontalAngle: 10, verticalAngle: -5, colorTemperature: 3200, brightness: 75 },
  },
  {
    id: "city_night",
    name: "City Night",
    nameZh: "城市夜景",
    layers: [
      { id: "layer-0", index: 0, paperColor: "#f0f0f0", opacity: 0.90, patternId: "star", customMaskData: null, zIndex: 3 },
      { id: "layer-1", index: 1, paperColor: "#e8e8f0", opacity: 0.80, patternId: "mountain", customMaskData: null, zIndex: 2 },
      { id: "layer-2", index: 2, paperColor: "#e0e0e8", opacity: 0.75, patternId: "geometric_window", customMaskData: null, zIndex: 1 },
      { id: "layer-3", index: 3, paperColor: "#f0f8ff", opacity: 0.70, patternId: null, customMaskData: null, zIndex: 0 },
    ],
    light: { horizontalAngle: -5, verticalAngle: 10, colorTemperature: 4500, brightness: 60 },
  },
  {
    id: "aurora_valley",
    name: "Aurora Valley",
    nameZh: "极光山谷",
    layers: [
      { id: "layer-0", index: 0, paperColor: "#fdf5e6", opacity: 0.85, patternId: "wave", customMaskData: null, zIndex: 3 },
      { id: "layer-1", index: 1, paperColor: "#f5f0e8", opacity: 0.80, patternId: "mountain", customMaskData: null, zIndex: 2 },
      { id: "layer-2", index: 2, paperColor: "#eef5ee", opacity: 0.75, patternId: "cloud", customMaskData: null, zIndex: 1 },
      { id: "layer-3", index: 3, paperColor: "#f0f8ff", opacity: 0.70, patternId: null, customMaskData: null, zIndex: 0 },
    ],
    light: { horizontalAngle: 0, verticalAngle: -15, colorTemperature: 5500, brightness: 80 },
  },
];

export function createBlankProject(): { layers: LayerConfig[]; light: LightConfig } {
  return {
    layers: [
      { id: "layer-0", index: 0, paperColor: "#fdf5e6", opacity: 0.80, patternId: null, customMaskData: null, zIndex: 3 },
      { id: "layer-1", index: 1, paperColor: "#fdf5e6", opacity: 0.80, patternId: null, customMaskData: null, zIndex: 2 },
      { id: "layer-2", index: 2, paperColor: "#fdf5e6", opacity: 0.80, patternId: null, customMaskData: null, zIndex: 1 },
      { id: "layer-3", index: 3, paperColor: "#fdf5e6", opacity: 0.80, patternId: null, customMaskData: null, zIndex: 0 },
    ],
    light: { horizontalAngle: 0, verticalAngle: 0, colorTemperature: 4000, brightness: 70 },
  };
}
