import type { MaterialTemplate } from '../../src/types';

export const materialTemplates: MaterialTemplate[] = [
  { id: 'cloth_red', name: '红布', rarity: 'common', icon: '🧵', color: '#e74c3c', weight: 30 },
  { id: 'cloth_blue', name: '蓝布', rarity: 'common', icon: '🧵', color: '#3498db', weight: 30 },
  { id: 'cloth_green', name: '绿布', rarity: 'common', icon: '🧵', color: '#2ecc71', weight: 30 },
  { id: 'cloth_yellow', name: '黄布', rarity: 'common', icon: '🧵', color: '#f1c40f', weight: 25 },
  { id: 'cloth_white', name: '白布', rarity: 'common', icon: '🧵', color: '#ecf0f1', weight: 25 },
  { id: 'button_wood', name: '木纽扣', rarity: 'common', icon: '🔘', color: '#8b4513', weight: 35 },
  { id: 'button_plastic', name: '塑料纽扣', rarity: 'common', icon: '🔘', color: '#95a5a6', weight: 35 },
  { id: 'thread_black', name: '黑线', rarity: 'common', icon: '🧶', color: '#2c3e50', weight: 30 },
  { id: 'thread_white', name: '白线', rarity: 'common', icon: '🧶', color: '#fdfefe', weight: 30 },
  { id: 'paint_red', name: '红颜料', rarity: 'common', icon: '🎨', color: '#c0392b', weight: 20 },
  { id: 'paint_blue', name: '蓝颜料', rarity: 'common', icon: '🎨', color: '#2980b9', weight: 20 },
  { id: 'paint_yellow', name: '黄颜料', rarity: 'common', icon: '🎨', color: '#d4ac0d', weight: 20 },

  { id: 'cloth_purple', name: '紫布', rarity: 'rare', icon: '🧵', color: '#8e44ad', weight: 15 },
  { id: 'cloth_gold', name: '金布', rarity: 'rare', icon: '🧵', color: '#f7c948', weight: 10 },
  { id: 'cloth_silver', name: '银布', rarity: 'rare', icon: '🧵', color: '#bdc3c7', weight: 10 },
  { id: 'button_shell', name: '贝壳纽扣', rarity: 'rare', icon: '🐚', color: '#f5ded1', weight: 15 },
  { id: 'button_metal', name: '金属纽扣', rarity: 'rare', icon: '🔘', color: '#7f8c8d', weight: 15 },
  { id: 'thread_gold', name: '金线', rarity: 'rare', icon: '✨', color: '#f39c12', weight: 12 },
  { id: 'thread_silver', name: '银线', rarity: 'rare', icon: '✨', color: '#95a5a6', weight: 12 },
  { id: 'paint_purple', name: '紫颜料', rarity: 'rare', icon: '🎨', color: '#9b59b6', weight: 12 },
  { id: 'paint_gold', name: '金颜料', rarity: 'rare', icon: '🎨', color: '#f1c40f', weight: 10 },
  { id: 'ribbon_satin', name: '缎带', rarity: 'rare', icon: '🎀', color: '#e91e63', weight: 12 },
  { id: 'feather', name: '羽毛', rarity: 'rare', icon: '🪶', color: '#ecf0f1', weight: 10 },

  { id: 'cloth_starry', name: '星空布', rarity: 'epic', icon: '🌌', color: '#1a1a2e', weight: 5 },
  { id: 'pearl', name: '珍珠', rarity: 'epic', icon: '🔮', color: '#fdfefe', weight: 4 },
  { id: 'crystal', name: '水晶', rarity: 'epic', icon: '💎', color: '#a8e6cf', weight: 3 },
  { id: 'button_jade', name: '玉石纽扣', rarity: 'epic', icon: '💚', color: '#00b894', weight: 3 },
  { id: 'phoenix_feather', name: '凤凰羽', rarity: 'epic', icon: '🔥', color: '#e17055', weight: 2 },
  { id: 'moonlight_thread', name: '月光线', rarity: 'epic', icon: '🌙', color: '#dfe6e9', weight: 3 },
  { id: 'dragon_scale', name: '龙鳞', rarity: 'epic', icon: '🐉', color: '#00cec9', weight: 2 },
  { id: 'stardust', name: '星尘', rarity: 'epic', icon: '✨', color: '#ffeaa7', weight: 3 },
];

export function getRandomMaterialTemplate(): MaterialTemplate {
  const totalWeight = materialTemplates.reduce((sum, t) => sum + t.weight, 0);
  let random = Math.random() * totalWeight;
  for (const template of materialTemplates) {
    random -= template.weight;
    if (random <= 0) return template;
  }
  return materialTemplates[0];
}
