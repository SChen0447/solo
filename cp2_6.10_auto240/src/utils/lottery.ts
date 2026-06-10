import { v4 as uuidv4 } from 'uuid';
import type { Batch, Prize, DrawRecord, Rarity } from '../types';

const BLESSINGS = [
  '愿你喝到这杯咖啡时，京都正下着樱花雨',
  '每一次相遇，都是久别重逢的幸运',
  '祝你今天比昨天更幸福一点点',
  '好运正在路上，请耐心等候',
  '生活就像盲盒，永远有惊喜',
  '愿这份小小礼物，温暖你的一整天',
  '愿你被这个世界温柔以待',
  '今日份的小确幸，请查收',
  '好事正在发生，只是你还不知道',
  '愿你的笑容像阳光一样灿烂'
];

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateRedeemCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function getRandomBlessing(): string {
  return BLESSINGS[Math.floor(Math.random() * BLESSINGS.length)];
}

export function createBatch(
  name: string,
  totalQuantity: number,
  prizeConfigs: Array<{
    name: string;
    rarity: Rarity;
    ratio: number;
    isPhysical: boolean;
  }>,
  startTime: number,
  maxDrawsPerUser: number
): Batch {
  const prizes: Prize[] = prizeConfigs.map((config) => {
    const count = Math.round((config.ratio / 100) * totalQuantity);
    return {
      id: uuidv4(),
      name: config.name,
      rarity: config.rarity,
      ratio: config.ratio,
      total: count,
      remaining: count,
      isPhysical: config.isPhysical
    };
  });

  return {
    id: uuidv4(),
    name,
    inviteCode: generateInviteCode(),
    totalQuantity,
    prizes,
    startTime,
    maxDrawsPerUser,
    participantCount: 0,
    createdAt: Date.now()
  };
}

export function performDraw(
  batch: Batch,
  userId: string,
  userDrawCount: number
): { record: DrawRecord; updatedBatch: Batch } | null {
  if (Date.now() < batch.startTime) {
    return null;
  }
  if (userDrawCount >= batch.maxDrawsPerUser) {
    return null;
  }

  const availablePrizes = batch.prizes.filter((p) => p.remaining > 0);
  if (availablePrizes.length === 0) {
    return null;
  }

  const totalRatio = availablePrizes.reduce((sum, p) => sum + p.ratio, 0);
  let random = Math.random() * totalRatio;
  let selectedPrize: Prize | null = null;

  for (const prize of availablePrizes) {
    random -= prize.ratio;
    if (random <= 0) {
      selectedPrize = prize;
      break;
    }
  }

  if (!selectedPrize) {
    selectedPrize = availablePrizes[availablePrizes.length - 1];
  }

  const isWin = selectedPrize.rarity !== 'participation';
  const redeemCode =
    isWin && selectedPrize.isPhysical ? generateRedeemCode() : undefined;
  const now = Date.now();

  const record: DrawRecord = {
    id: uuidv4(),
    batchId: batch.id,
    userId,
    prizeId: selectedPrize.id,
    prizeName: selectedPrize.name,
    rarity: selectedPrize.rarity,
    isWin,
    redeemCode,
    redeemed: false,
    redeemExpireAt: redeemCode ? now + 30 * 24 * 60 * 60 * 1000 : undefined,
    createdAt: now
  };

  const updatedPrizes = batch.prizes.map((p) =>
    p.id === selectedPrize!.id ? { ...p, remaining: p.remaining - 1 } : p
  );

  const updatedBatch: Batch = {
    ...batch,
    prizes: updatedPrizes,
    participantCount: batch.participantCount + 1
  };

  return { record, updatedBatch };
}

export function getUserDrawCount(
  records: DrawRecord[],
  batchId: string,
  userId: string
): number {
  return records.filter((r) => r.batchId === batchId && r.userId === userId)
    .length;
}

export function redeemPrizeByCode(
  records: DrawRecord[],
  code: string
): DrawRecord | null {
  const record = records.find(
    (r) => r.redeemCode === code && !r.redeemed && r.redeemExpireAt && r.redeemExpireAt > Date.now()
  );
  if (!record) return null;

  return {
    ...record,
    redeemed: true,
    redeemedAt: Date.now()
  };
}

export function findBatchByInviteCode(
  batches: Batch[],
  code: string
): Batch | undefined {
  return batches.find((b) => b.inviteCode === code.toUpperCase());
}
