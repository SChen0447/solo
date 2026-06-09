import { matchRecipe } from '../data/recipes';
import * as materialRepo from '../repositories/materialRepository';
import * as artworkRepo from '../repositories/artworkRepository';
import * as userRepo from '../repositories/userRepository';
import type { Artwork, Material } from '../../src/types';

export interface CraftResult {
  success: boolean;
  artwork?: Artwork;
  message?: string;
}

export async function craftArtwork(userId: string, materialIds: string[]): Promise<CraftResult> {
  if (materialIds.length === 0) {
    return { success: false, message: '请至少放入一种材料' };
  }
  if (materialIds.length > 9) {
    return { success: false, message: '合成槽最多容纳9种材料' };
  }

  const materials = await materialRepo.getMaterialsByIds(materialIds);
  if (materials.length !== materialIds.length) {
    return { success: false, message: '部分材料不存在或已被使用' };
  }

  for (const m of materials) {
    if (m.userId !== userId) {
      return { success: false, message: '材料不属于当前用户' };
    }
  }

  const templateIds = materials.map(m => m.templateId);
  const recipe = matchRecipe(templateIds);

  if (!recipe) {
    return { success: false, message: '材料组合不匹配任何配方' };
  }

  const thumbnailColors = extractThumbnailColors(materials);
  await materialRepo.deleteMaterialsByIds(materialIds);
  const artwork = await artworkRepo.createArtwork(
    userId,
    recipe.name,
    recipe.description,
    thumbnailColors,
    materialIds
  );

  return { success: true, artwork };
}

function extractThumbnailColors(materials: Material[]): string[] {
  const uniqueColors = [...new Set(materials.map(m => m.color))];
  return uniqueColors.slice(0, 4);
}
