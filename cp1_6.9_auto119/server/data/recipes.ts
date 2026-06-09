import type { Recipe } from '../../src/types';

export const recipes: Recipe[] = [
  {
    id: 'starry_pouch',
    name: '星空锦囊',
    description: '蕴含星辰之力的神秘锦囊，由蓝布、金线与珍珠编织而成',
    requiredMaterials: ['cloth_blue', 'thread_gold', 'pearl'],
  },
  {
    id: 'royal_scroll',
    name: '皇家画卷',
    description: '金光闪闪的华贵画卷，彰显主人尊贵身份',
    requiredMaterials: ['cloth_gold', 'paint_gold', 'thread_gold'],
  },
  {
    id: 'dream_catcher',
    name: '捕梦网',
    description: '能捕捉美梦的神奇挂件',
    requiredMaterials: ['thread_silver', 'feather', 'crystal'],
  },
  {
    id: 'phoenix_robe',
    name: '凤凰羽衣',
    description: '传说中凤凰涅槃所化的神衣',
    requiredMaterials: ['cloth_red', 'phoenix_feather', 'thread_gold'],
  },
  {
    id: 'jade_charm',
    name: '玉坠',
    description: '温润如玉的护身符',
    requiredMaterials: ['button_jade', 'thread_silver', 'pearl'],
  },
  {
    id: 'moonlight_veil',
    name: '月光面纱',
    description: '在月光下若隐若现的神秘面纱',
    requiredMaterials: ['cloth_silver', 'moonlight_thread', 'stardust'],
  },
  {
    id: 'dragon_amulet',
    name: '龙纹护符',
    description: '带有龙鳞纹路的强力护符',
    requiredMaterials: ['dragon_scale', 'cloth_purple', 'button_metal'],
  },
  {
    id: 'forest_ribbon',
    name: '森林缎带',
    description: '来自精灵森林的魔法缎带',
    requiredMaterials: ['cloth_green', 'ribbon_satin', 'feather'],
  },
  {
    id: 'sunrise_painting',
    name: '日出图',
    description: '描绘壮丽日出的精美画作',
    requiredMaterials: ['paint_red', 'paint_yellow', 'cloth_white'],
  },
  {
    id: 'ocean_brooch',
    name: '海洋胸针',
    description: '散发着深海气息的精美胸针',
    requiredMaterials: ['paint_blue', 'button_shell', 'crystal'],
  },
  {
    id: 'simple_bag',
    name: '简易布袋',
    description: '用普通布料缝制的简单布袋',
    requiredMaterials: ['cloth_white', 'thread_white', 'button_wood'],
  },
  {
    id: 'colorful_embroidery',
    name: '五彩绣品',
    description: '色彩斑斓的手工刺绣',
    requiredMaterials: ['cloth_white', 'thread_black', 'paint_red'],
  },
];

export function matchRecipe(materialTemplateIds: string[]): Recipe | null {
  const sortedInput = [...materialTemplateIds].sort();
  for (const recipe of recipes) {
    const sortedRecipe = [...recipe.requiredMaterials].sort();
    if (sortedInput.length === sortedRecipe.length &&
        sortedInput.every((id, i) => id === sortedRecipe[i])) {
      return recipe;
    }
  }
  return null;
}
