import { CardIcon } from './types';

export const ICONS: CardIcon[] = [
  {
    id: 'sword',
    name: '剑',
    svg: '<path d="M12 2L8 20M12 2L16 20M8 14H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M5 18L12 11L19 18M12 11L12 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
  },
  {
    id: 'shield',
    name: '盾',
    svg: '<path d="M12 2L3 6V11C3 16.55 6.84 21.74 12 22C17.16 21.74 21 16.55 21 11V6L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
  },
  {
    id: 'potion',
    name: '药水',
    svg: '<path d="M10 2V7L5 13V15C5 18.866 8.134 22 12 22C15.866 22 19 18.866 19 15V13L14 7V2H10Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M8 2H16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
  },
  {
    id: 'chest',
    name: '宝箱',
    svg: '<path d="M3 10V19H21V10" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M3 10V7C3 5.895 3.895 5 5 5H19C20.105 5 21 5.895 21 7V10" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><rect x="9" y="10" width="6" height="5" rx="0.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>'
  },
  {
    id: 'crown',
    name: '王冠',
    svg: '<path d="M3 18H21V8L7 13L12 5L17 13L21 8V18Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
  },
  {
    id: 'skull',
    name: '骷髅',
    svg: '<circle cx="12" cy="10" r="7" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="9" cy="10" r="1.5" fill="currentColor"/><circle cx="15" cy="10" r="1.5" fill="currentColor"/><path d="M10 17V20H14V17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
  },
  {
    id: 'heart',
    name: '红心',
    svg: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
  },
  {
    id: 'star',
    name: '星星',
    svg: '<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
  },
  {
    id: 'diamond',
    name: '钻石',
    svg: '<polygon points="12,2 22,10 12,22 2,10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M2 10H22M12 2L8 10L12 22L16 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
  },
  {
    id: 'key',
    name: '钥匙',
    svg: '<circle cx="7.5 7.5" r="4.5" stroke="currentColor" stroke-width="2" fill="none"/><path d="M10.5 10.5L22 22M16 20L19 17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
  },
  {
    id: 'scroll',
    name: '卷轴',
    svg: '<path d="M16 2H8C6.895 2 6 2.895 6 4V20C6 21.105 6.895 22 8 22H16C17.105 22 18 21.105 18 20V4C18 2.895 17.105 2 16 2Z" stroke="currentColor" stroke-width="2" fill="none"/><path d="M6 8H18M6 14H18" stroke="currentColor" stroke-width="2"/>'
  },
  {
    id: 'dice',
    name: '骰子',
    svg: '<rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="8" cy="8" r="1.5" fill="currentColor"/><circle cx="16" cy="8" r="1.5" fill="currentColor"/><circle cx="8" cy="16" r="1.5" fill="currentColor"/><circle cx="16" cy="16" r="1.5" fill="currentColor"/>'
  }
];

export const PRESET_BORDER_COLORS = [
  '#000000',
  '#FF4444',
  '#44AA44',
  '#4477FF',
  '#FFAA00',
  '#AA44AA',
  '#44AAAA',
  '#FFFFFF'
];

export const FONTS = [
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Pacifico', label: 'Pacifico' }
];
