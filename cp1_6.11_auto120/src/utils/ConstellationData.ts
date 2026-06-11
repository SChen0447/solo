import type { IConstellation, IComboGroup, ElementType, IStarlight } from '../types/game';

const CONSTELLATIONS: IConstellation[] = [
  { id: 'aries', name: '白羊座', nameEn: 'Aries', element: 'fire', energy: 3, symbol: '♈', iconColor: '#ff6b6b' },
  { id: 'leo', name: '狮子座', nameEn: 'Leo', element: 'fire', energy: 5, symbol: '♌', iconColor: '#ffa502' },
  { id: 'sagittarius', name: '射手座', nameEn: 'Sagittarius', element: 'fire', energy: 4, symbol: '♐', iconColor: '#ff7f50' },
  { id: 'cancer', name: '巨蟹座', nameEn: 'Cancer', element: 'water', energy: 3, symbol: '♋', iconColor: '#4ecdc4' },
  { id: 'scorpio', name: '天蝎座', nameEn: 'Scorpio', element: 'water', energy: 5, symbol: '♏', iconColor: '#2ecc71' },
  { id: 'pisces', name: '双鱼座', nameEn: 'Pisces', element: 'water', energy: 4, symbol: '♓', iconColor: '#74b9ff' },
  { id: 'taurus', name: '金牛座', nameEn: 'Taurus', element: 'earth', energy: 4, symbol: '♉', iconColor: '#a29bfe' },
  { id: 'virgo', name: '处女座', nameEn: 'Virgo', element: 'earth', energy: 4, symbol: '♍', iconColor: '#fdcb6e' },
  { id: 'capricorn', name: '摩羯座', nameEn: 'Capricorn', element: 'earth', energy: 5, symbol: '♑', iconColor: '#e17055' },
  { id: 'gemini', name: '双子座', nameEn: 'Gemini', element: 'air', energy: 3, symbol: '♊', iconColor: '#00b894' },
  { id: 'libra', name: '天秤座', nameEn: 'Libra', element: 'air', energy: 4, symbol: '♎', iconColor: '#0984e3' },
  { id: 'aquarius', name: '水瓶座', nameEn: 'Aquarius', element: 'air', energy: 5, symbol: '♒', iconColor: '#6c5ce7' }
];

const COMBO_GROUPS: IComboGroup[] = [
  {
    id: 'fire-triangle',
    name: '烈焰三角',
    element: 'fire',
    constellations: ['aries', 'leo', 'sagittarius'],
    damage: 5
  },
  {
    id: 'water-triangle',
    name: '潮汐三角',
    element: 'water',
    constellations: ['cancer', 'scorpio', 'pisces'],
    damage: 5
  },
  {
    id: 'earth-triangle',
    name: '大地三角',
    element: 'earth',
    constellations: ['taurus', 'virgo', 'capricorn'],
    damage: 5
  },
  {
    id: 'air-triangle',
    name: '风暴三角',
    element: 'air',
    constellations: ['gemini', 'libra', 'aquarius'],
    damage: 5
  }
];

export function getConstellationById(id: string): IConstellation | undefined {
  return CONSTELLATIONS.find(c => c.id === id);
}

export function getAllConstellations(): IConstellation[] {
  return [...CONSTELLATIONS];
}

export function getComboGroups(): IComboGroup[] {
  return [...COMBO_GROUPS];
}

export function getElementColor(element: ElementType): string {
  const colors: Record<ElementType, string> = {
    fire: '#ff6b6b',
    water: '#74b9ff',
    earth: '#a29bfe',
    air: '#00b894'
  };
  return colors[element];
}

export function checkCombo(starlights: IStarlight[]): IComboGroup | null {
  const occupiedSlots = starlights
    .filter(s => s !== null)
    .sort((a, b) => a.slotIndex - b.slotIndex);

  if (occupiedSlots.length < 3) return null;

  const occupiedIndices = occupiedSlots.map(s => s.slotIndex);

  for (let i = 0; i < occupiedIndices.length; i++) {
    const slots = [
      occupiedIndices[i],
      occupiedIndices[(i + 1) % occupiedIndices.length],
      occupiedIndices[(i + 2) % occupiedIndices.length]
    ];

    const isAdjacent = slots.every((slot, idx) => {
      if (idx === 0) return true;
      const diff = Math.abs(slot - slots[idx - 1]);
      return diff === 1 || diff === 11;
    });

    if (!isAdjacent) continue;

    const constellationIds = slots
      .map(slot => occupiedSlots.find(s => s.slotIndex === slot)?.constellationId)
      .filter(Boolean) as string[];

    for (const combo of COMBO_GROUPS) {
      const sortedIds = [...constellationIds].sort();
      const sortedCombo = [...combo.constellations].sort();
      if (sortedIds.join(',') === sortedCombo.join(',')) {
        return combo;
      }
    }
  }

  return null;
}
