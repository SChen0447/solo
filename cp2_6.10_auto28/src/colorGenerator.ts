export interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
  keywords: string[];
}

const SCENE_PALETTES: ColorPalette[] = [
  {
    id: 'sunset-beach',
    name: '日落沙滩',
    colors: ['#FF6B6B', '#FFA07A', '#FFD93D', '#F9844A', '#C73E1D'],
    keywords: ['日落', '沙滩', 'sunset', 'beach', '夕阳', '海滩', '黄昏']
  },
  {
    id: 'aurora',
    name: '极光',
    colors: ['#00D9FF', '#00FFB3', '#7B68EE', '#9370DB', '#00CED1'],
    keywords: ['极光', 'aurora', '北极光', 'northern', '星空', '梦幻']
  },
  {
    id: 'cyberpunk-city',
    name: '未来城市',
    colors: ['#FF006E', '#8338EC', '#3A86FF', '#00F5D4', '#FB5607'],
    keywords: ['未来', '城市', 'cyberpunk', '赛博朋克', '夜景', '霓虹', '科技']
  },
  {
    id: 'violet-dawn',
    name: '紫罗兰黎明',
    colors: ['#2D1B69', '#5B2A86', '#9B5DE5', '#C77DFF', '#F1C0E8'],
    keywords: ['紫罗兰', '黎明', 'violet', 'dawn', '紫色', '清晨']
  },
  {
    id: 'ocean-deep',
    name: '深海',
    colors: ['#03045E', '#023E8A', '#0077B6', '#0096C7', '#00B4D8'],
    keywords: ['海洋', '深海', 'ocean', 'sea', '蓝色', '海底']
  },
  {
    id: 'forest-morning',
    name: '森林清晨',
    colors: ['#1B4332', '#2D6A4F', '#40916C', '#52B788', '#95D5B2'],
    keywords: ['森林', '清晨', 'forest', 'green', '绿色', '自然', '树林']
  },
  {
    id: 'autumn-leaves',
    name: '秋叶',
    colors: ['#582F0E', '#7F4F24', '#936639', '#B08968', '#DDB892'],
    keywords: ['秋天', '秋叶', 'autumn', 'fall', '橙色', '棕色', '落叶']
  },
  {
    id: 'cherry-blossom',
    name: '樱花',
    colors: ['#FFAFCC', '#FFC8DD', '#FFAFCC', '#BDE0FE', '#A2D2FF'],
    keywords: ['樱花', '春天', 'sakura', 'cherry', '粉色', '浪漫']
  },
  {
    id: 'desert-dune',
    name: '沙漠沙丘',
    colors: ['#E9C46A', '#F4A261', '#E76F51', '#264653', '#2A9D8F'],
    keywords: ['沙漠', '沙丘', 'desert', 'sand', '金色', '荒漠']
  },
  {
    id: 'midnight-galaxy',
    name: '午夜银河',
    colors: ['#0D1B2A', '#1B263B', '#415A77', '#778DA9', '#E0E1DD'],
    keywords: ['银河', '午夜', 'galaxy', 'midnight', '星空', '宇宙', 'night']
  },
  {
    id: 'candy-pop',
    name: '糖果缤纷',
    colors: ['#FF006E', '#FB5607', '#FFBE0B', '#8338EC', '#3A86FF'],
    keywords: ['糖果', '缤纷', 'candy', 'pop', '彩色', '活泼', '彩虹']
  },
  {
    id: 'mountain-fog',
    name: '山雾',
    colors: ['#6C757D', '#ADB5BD', '#DEE2E6', '#495057', '#343A40'],
    keywords: ['山', '雾', 'mountain', 'fog', '灰色', '朦胧', '雾气']
  },
  {
    id: 'tropical-paradise',
    name: '热带天堂',
    colors: ['#06D6A0', '#118AB2', '#073B4C', '#FFD166', '#EF476F'],
    keywords: ['热带', '天堂', 'tropical', 'paradise', '夏威夷', '海岛', '度假']
  },
  {
    id: 'retro-80s',
    name: '80年代复古',
    colors: ['#FF6EC7', '#FC5CFF', '#01CDFE', '#05FFA1', '#FFBE0B'],
    keywords: ['复古', '80年代', 'retro', 'vintage', '怀旧', '80s']
  },
  {
    id: 'lavender-dream',
    name: '薰衣草梦境',
    colors: ['#E0BBE4', '#957DAD', '#D291BC', '#FEC8D8', '#FFDFD3'],
    keywords: ['薰衣草', '梦境', 'lavender', 'dream', '淡紫', '柔和']
  }
];

const PRESET_HUES: string[] = [
  '#FF0000', '#FF4500', '#FF8C00', '#FFD700', '#9ACD32', '#32CD32',
  '#00FA9A', '#00CED1', '#1E90FF', '#6A5ACD', '#9370DB', '#FF69B4'
];

function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

function calculateMatchScore(input: string, palette: ColorPalette): number {
  const normalizedInput = normalizeText(input);
  let score = 0;

  for (const keyword of palette.keywords) {
    const normalizedKeyword = normalizeText(keyword);
    if (normalizedInput.includes(normalizedKeyword)) {
      score += normalizedKeyword.length * 2;
    }
    if (normalizedKeyword.includes(normalizedInput) && normalizedInput.length > 0) {
      score += normalizedInput.length;
    }
  }

  return score;
}

export function generatePalette(input: string): ColorPalette {
  if (!input || input.trim().length === 0) {
    const randomIndex = Math.floor(Math.random() * SCENE_PALETTES.length);
    return { ...SCENE_PALETTES[randomIndex] };
  }

  let bestMatch: ColorPalette = SCENE_PALETTES[0];
  let bestScore = -1;

  for (const palette of SCENE_PALETTES) {
    const score = calculateMatchScore(input, palette);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = palette;
    }
  }

  if (bestScore === 0) {
    const hash = Array.from(input).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const fallbackIndex = hash % SCENE_PALETTES.length;
    return { ...SCENE_PALETTES[fallbackIndex] };
  }

  return { ...bestMatch };
}

export function getPresetHues(): string[] {
  return [...PRESET_HUES];
}

export function getAllPalettes(): ColorPalette[] {
  return [...SCENE_PALETTES];
}

export function generatePaletteId(): string {
  return `palette_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
