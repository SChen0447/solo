export type ComponentType =
  | 'buttonNormal'
  | 'buttonHover'
  | 'buttonDisabled'
  | 'cardBackground'
  | 'inputBorder'
  | 'textTitle'
  | 'progressFill'
  | 'shadowEffect';

export interface ColorSwatch {
  id: string;
  name: string;
  color: string;
  group: 'neutral' | 'vibrant' | 'dark';
}

export interface ThemeColors {
  buttonNormal: string;
  buttonHover: string;
  buttonDisabled: string;
  cardBackground: string;
  inputBorder: string;
  textTitle: string;
  progressFill: string;
  shadowEffect: string;
}

export interface Theme {
  id: string;
  name: string;
  palette: ColorSwatch[];
  colors: ThemeColors;
  panelBg: string;
  panelText: string;
}

export const COMPONENT_LABELS: Record<ComponentType, string> = {
  buttonNormal: '按钮(默认)',
  buttonHover: '按钮(悬停)',
  buttonDisabled: '按钮(禁用)',
  cardBackground: '卡片背景',
  inputBorder: '输入框边框',
  textTitle: '文字标题',
  progressFill: '进度条填充',
  shadowEffect: '阴影效果'
};

export const COMPONENT_CSS_PROPS: Record<ComponentType, keyof CSSStyleDeclaration> = {
  buttonNormal: 'backgroundColor',
  buttonHover: 'backgroundColor',
  buttonDisabled: 'backgroundColor',
  cardBackground: 'backgroundColor',
  inputBorder: 'borderColor',
  textTitle: 'color',
  progressFill: 'backgroundColor',
  shadowEffect: 'color'
};

const neutralColors: ColorSwatch[] = [
  { id: 'n1', name: '白色', color: '#FFFFFF', group: 'neutral' },
  { id: 'n2', name: '浅灰', color: '#F5F5F7', group: 'neutral' },
  { id: 'n3', name: '淡灰', color: '#E5E5EA', group: 'neutral' },
  { id: 'n4', name: '中灰', color: '#C7C7CC', group: 'neutral' },
  { id: 'n5', name: '灰', color: '#8E8E93', group: 'neutral' },
  { id: 'n6', name: '深灰', color: '#636366', group: 'neutral' },
  { id: 'n7', name: '暗灰', color: '#3A3A3C', group: 'neutral' },
  { id: 'n8', name: '近黑', color: '#1C1C1E', group: 'neutral' },
];

const vibrantColors: ColorSwatch[] = [
  { id: 'v1', name: '系统蓝', color: '#007AFF', group: 'vibrant' },
  { id: 'v2', name: '系统绿', color: '#34C759', group: 'vibrant' },
  { id: 'v3', name: '系统红', color: '#FF3B30', group: 'vibrant' },
  { id: 'v4', name: '系统橙', color: '#FF9500', group: 'vibrant' },
  { id: 'v5', name: '系统黄', color: '#FFCC00', group: 'vibrant' },
  { id: 'v6', name: '系统粉', color: '#FF2D55', group: 'vibrant' },
  { id: 'v7', name: '系统紫', color: '#AF52DE', group: 'vibrant' },
  { id: 'v8', name: '系统青', color: '#5AC8FA', group: 'vibrant' },
];

const darkColors: ColorSwatch[] = [
  { id: 'd1', name: '深海军蓝', color: '#1A237E', group: 'dark' },
  { id: 'd2', name: '深森林绿', color: '#1B5E20', group: 'dark' },
  { id: 'd3', name: '深酒红', color: '#B71C1C', group: 'dark' },
  { id: 'd4', name: '深棕', color: '#3E2723', group: 'dark' },
];

export const DEFAULT_PALETTE: ColorSwatch[] = [
  ...neutralColors,
  ...vibrantColors,
  ...darkColors,
];

export const MAX_HISTORY = 50;

export const THEMES: Theme[] = [
  {
    id: 'light',
    name: '浅色模式',
    palette: DEFAULT_PALETTE,
    colors: {
      buttonNormal: '#007AFF',
      buttonHover: '#0066D6',
      buttonDisabled: '#C7C7CC',
      cardBackground: '#FFFFFF',
      inputBorder: '#C7C7CC',
      textTitle: '#1C1C1E',
      progressFill: '#34C759',
      shadowEffect: 'rgba(0,0,0,0.15)',
    },
    panelBg: '#F5F5F7',
    panelText: '#1C1C1E',
  },
  {
    id: 'dark',
    name: '深色模式',
    palette: [
      ...neutralColors.map(c => ({ ...c, id: 'dk-' + c.id })),
      ...vibrantColors.map(c => ({ ...c, id: 'dk-' + c.id })),
      ...darkColors.map(c => ({ ...c, id: 'dk-' + c.id })),
    ],
    colors: {
      buttonNormal: '#0A84FF',
      buttonHover: '#409CFF',
      buttonDisabled: '#38383A',
      cardBackground: '#2C2C2E',
      inputBorder: '#48484A',
      textTitle: '#FFFFFF',
      progressFill: '#30D158',
      shadowEffect: 'rgba(0,0,0,0.5)',
    },
    panelBg: '#1C1C1E',
    panelText: '#FFFFFF',
  },
  {
    id: 'highContrast',
    name: '高对比度模式',
    palette: [
      { id: 'hc-n1', name: '纯白', color: '#FFFFFF', group: 'neutral' },
      { id: 'hc-n2', name: '浅灰', color: '#E0E0E0', group: 'neutral' },
      { id: 'hc-n3', name: '中灰', color: '#808080', group: 'neutral' },
      { id: 'hc-n4', name: '深灰', color: '#404040', group: 'neutral' },
      { id: 'hc-n5', name: '纯黑', color: '#000000', group: 'dark' },
      { id: 'hc-v1', name: '纯蓝', color: '#0000FF', group: 'vibrant' },
      { id: 'hc-v2', name: '纯绿', color: '#00FF00', group: 'vibrant' },
      { id: 'hc-v3', name: '纯红', color: '#FF0000', group: 'vibrant' },
      { id: 'hc-v4', name: '纯黄', color: '#FFFF00', group: 'vibrant' },
      { id: 'hc-v5', name: '纯青', color: '#00FFFF', group: 'vibrant' },
      { id: 'hc-v6', name: '纯品红', color: '#FF00FF', group: 'vibrant' },
      { id: 'hc-d1', name: '深蓝', color: '#000080', group: 'dark' },
      { id: 'hc-d2', name: '深绿', color: '#008000', group: 'dark' },
      { id: 'hc-d3', name: '深红', color: '#800000', group: 'dark' },
    ],
    colors: {
      buttonNormal: '#0000FF',
      buttonHover: '#000080',
      buttonDisabled: '#808080',
      cardBackground: '#FFFFFF',
      inputBorder: '#000000',
      textTitle: '#000000',
      progressFill: '#00FF00',
      shadowEffect: '#000000',
    },
    panelBg: '#FFFFFF',
    panelText: '#000000',
  },
];
