export interface PuzzlePiece {
  id: number;
  branchIndex: number;
  unlockText: string;
  illusionIndex: number;
  color: string;
}

export interface BranchNode {
  id: number;
  x: number;
  y: number;
  parentId: number | null;
  length: number;
  angle: number;
  thickness: number;
  repaired: boolean;
}

export const ILLUSION_TEXTS: string[] = [
  '远古时代，飞龙盘旋于浮空岛屿之上，守护着这片神秘的土地。',
  '精灵族在此建立了璀璨的文明，与自然和谐共存。',
  '记忆之树第一次开花，金色的光芒照亮了整个天空。',
  '一场巨大的风暴席卷而来，岛屿开始分裂破碎。',
  '守护者们将记忆封存在碎片中，等待有缘人来修复。',
  '古老的城堡在地震中崩塌，辉煌化为废墟。',
  '最后一位精灵离开时，留下了希望的种子。',
  '时间在此凝固，岛屿漂浮于云海之中沉睡。',
  '星辰陨落，为这片土地带来了新的能量。',
  '迷雾笼罩，岛屿从世人的记忆中彻底消失。',
  '千年之后，一道微光划破天际，唤醒了沉睡的碎片。',
  '第一位旅人发现了这座被遗忘的浮空岛屿。',
  '记忆之树的根系开始重新汲取大地的养分。',
  '第一片新叶在晨曦中舒展开来，生命的气息涌动。',
  '远处传来龙吟，古老的守护者正在回归的路上。',
  '精灵的歌谣在风中回荡，指引着修复的方向。',
  '破碎的城堡基石开始发光，重建的力量汇聚。',
  '金色的花瓣从天空飘落，每一片都承载着一段记忆。',
  '浮空岛屿的能量核心重新启动，光芒四射。',
  '记忆之树完全修复，岛屿的历史再次完整呈现。'
];

export function generateBranchNodes(centerX: number, baseY: number): BranchNode[] {
  const nodes: BranchNode[] = [];
  const trunkHeight = 180;

  nodes.push({
    id: 0,
    x: centerX,
    y: baseY,
    parentId: null,
    length: trunkHeight,
    angle: -90,
    thickness: 18,
    repaired: true
  });

  const branchConfigs = [
    { parentId: 0, angleOffset: -50, length: 70, thickness: 10, distRatio: 0.35 },
    { parentId: 0, angleOffset: 45, length: 75, thickness: 10, distRatio: 0.45 },
    { parentId: 0, angleOffset: -30, length: 65, thickness: 9, distRatio: 0.6 },
    { parentId: 0, angleOffset: 35, length: 68, thickness: 9, distRatio: 0.75 },

    { parentId: 1, angleOffset: -35, length: 50, thickness: 7, distRatio: 0.5 },
    { parentId: 1, angleOffset: 25, length: 55, thickness: 7, distRatio: 0.7 },
    { parentId: 2, angleOffset: -25, length: 52, thickness: 7, distRatio: 0.55 },
    { parentId: 2, angleOffset: 40, length: 48, thickness: 7, distRatio: 0.75 },

    { parentId: 3, angleOffset: -40, length: 45, thickness: 6, distRatio: 0.5 },
    { parentId: 3, angleOffset: 20, length: 50, thickness: 6, distRatio: 0.7 },
    { parentId: 4, angleOffset: -20, length: 48, thickness: 6, distRatio: 0.55 },
    { parentId: 4, angleOffset: 35, length: 42, thickness: 6, distRatio: 0.75 },

    { parentId: 5, angleOffset: -30, length: 38, thickness: 5, distRatio: 0.6 },
    { parentId: 6, angleOffset: 25, length: 40, thickness: 5, distRatio: 0.65 },
    { parentId: 7, angleOffset: -25, length: 36, thickness: 5, distRatio: 0.6 },
    { parentId: 8, angleOffset: 30, length: 38, thickness: 5, distRatio: 0.65 },

    { parentId: 9, angleOffset: -20, length: 32, thickness: 4, distRatio: 0.7 },
    { parentId: 10, angleOffset: 25, length: 34, thickness: 4, distRatio: 0.7 },
    { parentId: 11, angleOffset: -15, length: 30, thickness: 4, distRatio: 0.75 },
    { parentId: 12, angleOffset: 20, length: 32, thickness: 4, distRatio: 0.75 }
  ];

  for (let i = 0; i < branchConfigs.length; i++) {
    const config = branchConfigs[i];
    const parent = nodes[config.parentId];
    const parentAngleRad = Phaser.Math.DegToRad(parent.angle);
    const startX = parent.x + Math.cos(parentAngleRad) * parent.length * config.distRatio;
    const startY = parent.y + Math.sin(parentAngleRad) * parent.length * config.distRatio;
    const newAngle = parent.angle + config.angleOffset;

    nodes.push({
      id: i + 1,
      x: startX,
      y: startY,
      parentId: config.parentId,
      length: config.length,
      angle: newAngle,
      thickness: config.thickness,
      repaired: false
    });
  }

  return nodes;
}

export function generatePuzzlePieces(): PuzzlePiece[] {
  const colors = [
    '#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4',
    '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD',
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8B500', '#E74C3C', '#3498DB', '#2ECC71',
    '#9B59B6', '#1ABC9C', '#F39C12', '#E91E63'
  ];

  const pieces: PuzzlePiece[] = [];
  for (let i = 1; i <= 20; i++) {
    pieces.push({
      id: i,
      branchIndex: i,
      unlockText: ILLUSION_TEXTS[i - 1],
      illusionIndex: i - 1,
      color: colors[i - 1]
    });
  }
  return pieces;
}
