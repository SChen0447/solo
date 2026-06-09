import { getRandomMaterialTemplate } from '../data/materialTemplates';
import * as materialRepo from '../repositories/materialRepository';
import * as userRepo from '../repositories/userRepository';
import type { Material } from '../../src/types';

export async function openBox(userId: string): Promise<{ materials: Material[]; remainingBoxes: number }> {
  const user = await userRepo.findUserById(userId);
  if (!user) {
    throw new Error('用户不存在');
  }
  if (user.remainingBoxes <= 0) {
    throw new Error('盲盒数量不足');
  }

  const count = 4 + Math.floor(Math.random() * 3);
  const materials: Material[] = [];

  for (let i = 0; i < count; i++) {
    const template = getRandomMaterialTemplate();
    const material = await materialRepo.createMaterial(
      userId,
      template.id,
      template.name,
      template.rarity,
      template.icon,
      template.color
    );
    materials.push(material);
  }

  const remainingBoxes = user.remainingBoxes - 1;
  await userRepo.updateRemainingBoxes(userId, remainingBoxes);

  return { materials, remainingBoxes };
}
