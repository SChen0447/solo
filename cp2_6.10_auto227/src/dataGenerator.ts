import { StratumConfig, ArtifactData } from './types';
import * as THREE from 'three';

const STRATUM_COLORS = [
  '#a67c52',
  '#9a6e47',
  '#8d613d',
  '#805434',
  '#75503a',
  '#6b4c3a',
  '#624835',
  '#5a4430',
  '#52402b',
  '#4a3c26'
];

const STRATUM_NAMES = [
  '火山灰表层',
  '庞贝末期文化层',
  '罗马殖民时期层',
  '萨谟奈人居住层',
  '希腊化文化层',
  '伊特鲁里亚层',
  '青铜时代晚期层',
  '青铜时代早期层',
  '新石器时代层',
  '基岩层'
];

const STRATUM_ERAS = [
  '公元79年至今',
  '公元前1世纪 - 公元79年',
  '公元前3世纪 - 公元前1世纪',
  '公元前5世纪 - 公元前3世纪',
  '公元前8世纪 - 公元前5世纪',
  '公元前10世纪 - 公元前8世纪',
  '公元前1600年 - 公元前10世纪',
  '公元前3000年 - 公元前1600年',
  '公元前6000年 - 公元前3000年',
  '史前时期'
];

const ARTIFACT_NAMES = [
  '双耳陶罐',
  '大理石雕像',
  '青铜油灯',
  '金币',
  '玻璃器皿',
  '陶制餐具',
  '铁质匕首',
  '壁画残片',
  '象牙雕刻',
  '青铜镜',
  '石制磨盘',
  '骨制梳子',
  '陶俑',
  '银质酒杯',
  '赤陶瓦当',
  '青铜三足鼎',
  '贝壳饰品',
  '石刻铭文',
  '木棺残件',
  '彩陶瓮'
];

export function generateStrata(count: number = 8): StratumConfig[] {
  const strata: StratumConfig[] = [];
  for (let i = 0; i < count; i++) {
    const thickness = 40 + Math.floor(Math.random() * 41);
    strata.push({
      id: i,
      name: STRATUM_NAMES[i % STRATUM_NAMES.length],
      thickness,
      color: STRATUM_COLORS[i % STRATUM_COLORS.length],
      era: STRATUM_ERAS[i % STRATUM_ERAS.length]
    });
  }
  return strata;
}

export function generateArtifactsForStratum(
  stratumConfig: StratumConfig,
  stratumTopY: number,
  areaSize: number
): ArtifactData[] {
  const count = Math.max(1, Math.floor(stratumConfig.thickness * 0.5));
  const artifacts: ArtifactData[] = [];
  const halfArea = areaSize / 2 - 10;

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 2 * halfArea;
    const z = (Math.random() - 0.5) * 2 * halfArea;
    const y = stratumTopY - 2 - Math.random() * (stratumConfig.thickness - 4);

    artifacts.push({
      id: `artifact-${stratumConfig.id}-${i}`,
      name: ARTIFACT_NAMES[Math.floor(Math.random() * ARTIFACT_NAMES.length)],
      era: stratumConfig.era,
      position: new THREE.Vector3(x, y, z),
      stratumId: stratumConfig.id,
      stratumName: stratumConfig.name
    });
  }

  return artifacts;
}
