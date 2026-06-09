export type ClothingType = 'shirt' | 'tshirt' | 'hoodie' | 'dress';

export type ExpressionType = 'smile' | 'surprised' | 'pout' | 'wink';

export type HairStyleType = 'short' | 'ponytail' | 'curly' | 'bald';

export const HAIR_COLORS = [
  '#8B4513',
  '#1a1a1a',
  '#D4A574',
  '#8B0000',
  '#696969',
  '#9932CC',
] as const;

export const SKIN_COLOR_RANGE = {
  start: '#F5D0B5',
  end: '#8B5A2B',
} as const;

export interface AvatarFeatures {
  clothing: ClothingType;
  expression: ExpressionType;
  hairStyle: HairStyleType;
  skinColor: string;
  hairColor: string;
}

export interface ClothingConfig {
  baseColor: string;
  accentColor: string;
  pattern?: 'stripes' | 'dots' | 'solid';
  label: string;
}

export interface ExpressionConfig {
  label: string;
  mouthCurve: number;
  mouthOpen: number;
  eyeSize: number;
  eyeSquint: number;
  browAngle: number;
}

export interface HairStyleConfig {
  label: string;
}

export const CLOTHING_CONFIGS: Record<ClothingType, ClothingConfig> = {
  shirt:   { baseColor: '#87CEEB', accentColor: '#5DA8C9', pattern: 'solid', label: '衬衫' },
  tshirt:  { baseColor: '#E74C3C', accentColor: '#C0392B', pattern: 'solid', label: 'T恤' },
  hoodie:  { baseColor: '#2C3E50', accentColor: '#1A252F', pattern: 'solid', label: '卫衣' },
  dress:   { baseColor: '#9B59B6', accentColor: '#7D3C98', pattern: 'dots',  label: '连衣裙' },
};

export const EXPRESSION_CONFIGS: Record<ExpressionType, ExpressionConfig> = {
  smile:     { label: '微笑', mouthCurve: 0.5, mouthOpen: 0, eyeSize: 1, eyeSquint: 0, browAngle: 0 },
  surprised: { label: '惊讶', mouthCurve: 0,   mouthOpen: 1, eyeSize: 1.4, eyeSquint: 0, browAngle: -0.3 },
  pout:      { label: '撇嘴', mouthCurve: -0.4, mouthOpen: 0.2, eyeSize: 0.9, eyeSquint: 0.1, browAngle: 0.2 },
  wink:      { label: '眨眼', mouthCurve: 0.4, mouthOpen: 0, eyeSize: 1, eyeSquint: 1, browAngle: 0 },
};

export const HAIRSTYLE_CONFIGS: Record<HairStyleType, HairStyleConfig> = {
  short:    { label: '短发' },
  ponytail: { label: '马尾' },
  curly:    { label: '卷发' },
  bald:     { label: '光头' },
};

export const CLOTHING_OPTIONS: ClothingType[] = ['shirt', 'tshirt', 'hoodie', 'dress'];
export const EXPRESSION_OPTIONS: ExpressionType[] = ['smile', 'surprised', 'pout', 'wink'];
export const HAIRSTYLE_OPTIONS: HairStyleType[] = ['short', 'ponytail', 'curly', 'bald'];

export const DEFAULT_FEATURES: AvatarFeatures = {
  clothing: 'shirt',
  expression: 'smile',
  hairStyle: 'short',
  skinColor: SKIN_COLOR_RANGE.start,
  hairColor: HAIR_COLORS[0],
};
