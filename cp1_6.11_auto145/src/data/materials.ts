import type { Material } from '../types';

export const MATERIALS: Material[] = [
  { id: 'crystal',   name: '魔法水晶',  color: '#e1bee7', icon: '💎' },
  { id: 'petal',     name: '月光花瓣',  color: '#f8bbd0', icon: '🌸' },
  { id: 'scale',     name: '龙鳞',      color: '#ef5350', icon: '🔴' },
  { id: 'feather',   name: '凤凰羽毛',  color: '#ffb74d', icon: '🪶' },
  { id: 'stardust',  name: '星辰沙',    color: '#fff59d', icon: '✨' },
  { id: 'moonstone', name: '月光石',    color: '#90caf9', icon: '🌙' },
  { id: 'moss',      name: '森林苔藓',  color: '#81c784', icon: '🍀' },
  { id: 'tear',      name: '海妖之泪',  color: '#4fc3f7', icon: '💧' },
  { id: 'ember',     name: '余烬',      color: '#ff7043', icon: '🔥' },
  { id: 'violet',    name: '紫罗兰露',  color: '#ce93d8', icon: '🔮' },
];

export const MAX_MATERIALS = 4;
