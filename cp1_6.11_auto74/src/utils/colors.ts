export const PRESET_COLORS = [
  '#FEF3C7',
  '#DBEAFE',
  '#FCE7F3',
  '#D1FAE5',
  '#E0E7FF',
  '#FFEDD5',
  '#F3E8FF',
  '#DCFCE7',
];

export function getDarkerColor(color: string): string {
  const hex = color.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  
  const darkerR = Math.max(0, Math.floor(r * 0.65));
  const darkerG = Math.max(0, Math.floor(g * 0.65));
  const darkerB = Math.max(0, Math.floor(b * 0.65));
  
  return `#${darkerR.toString(16).padStart(2, '0')}${darkerG.toString(16).padStart(2, '0')}${darkerB.toString(16).padStart(2, '0')}`;
}

export function getTransparentColor(color: string, opacity: number = 0.25): string {
  const hex = color.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
