import * as THREE from 'three';
import * as _ from 'lodash';

export interface BuildingBlock {
  id: string;
  name: string;
  year: number;
  material: string;
  note: string;
  geometry: THREE.BufferGeometry;
  position: THREE.Vector3;
  phaseId: number;
}

export interface PhaseData {
  id: number;
  year: number;
  name: string;
  color: string;
  buildings: BuildingBlock[];
  event: string;
}

export const PHASE_YEARS = [1200, 1280, 1450, 1500];
export const PHASE_NAMES = ['奠基', '扩建', '焚毁', '修复'];
export const PHASE_COLORS = ['#d4c5a9', '#8a9ba8', '#6b4226', '#c4a882'];

const generateNoiseTexture = (): THREE.DataTexture => {
  const size = 2;
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const value = 200 + Math.floor(Math.random() * 55);
    data[i * 4] = value;
    data[i * 4 + 1] = value;
    data[i * 4 + 2] = value;
    data[i * 4 + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.needsUpdate = true;
  return texture;
};

export const noiseTexture = generateNoiseTexture();

const createBoxGeometry = (w: number, h: number, d: number): THREE.BufferGeometry => {
  const geo = new THREE.BoxGeometry(w, h, d);
  return geo;
};

const createCylinderGeometry = (rTop: number, rBottom: number, h: number, segments: number = 16): THREE.BufferGeometry => {
  const geo = new THREE.CylinderGeometry(rTop, rBottom, h, segments);
  return geo;
};

const buildPhase1 = (): BuildingBlock[] => {
  const buildings: BuildingBlock[] = [];

  buildings.push({
    id: 'p1-main-wall-n',
    name: '北城墙（奠基段）',
    year: 1200,
    material: '当地石灰岩',
    note: '城堡最初防御工事的一部分，墙基深2.5米，采用典型罗马式砌石工艺。',
    geometry: createBoxGeometry(14, 3, 1.2),
    position: new THREE.Vector3(0, 1.5, -6),
    phaseId: 0
  });

  buildings.push({
    id: 'p1-main-wall-s',
    name: '南城墙（奠基段）',
    year: 1200,
    material: '当地石灰岩',
    note: '与北墙同期建造，南侧发现早期城门遗迹。',
    geometry: createBoxGeometry(14, 3, 1.2),
    position: new THREE.Vector3(0, 1.5, 6),
    phaseId: 0
  });

  buildings.push({
    id: 'p1-main-wall-w',
    name: '西城墙（奠基段）',
    year: 1200,
    material: '当地石灰岩',
    note: '墙体厚度1.2米，保存较为完好。',
    geometry: createBoxGeometry(1.2, 3, 10),
    position: new THREE.Vector3(-7, 1.5, 0),
    phaseId: 0
  });

  buildings.push({
    id: 'p1-main-wall-e',
    name: '东城墙（奠基段）',
    year: 1200,
    material: '当地石灰岩',
    note: '东城墙上发现多处后期修补痕迹。',
    geometry: createBoxGeometry(1.2, 3, 10),
    position: new THREE.Vector3(7, 1.5, 0),
    phaseId: 0
  });

  buildings.push({
    id: 'p1-dungeon',
    name: '主塔地牢',
    year: 1200,
    material: '粗凿花岗岩',
    note: '位于主塔正下方，深度约4米，推测为早期储藏室兼监狱。',
    geometry: createBoxGeometry(3, 2, 3),
    position: new THREE.Vector3(0, -1, 0),
    phaseId: 0
  });

  buildings.push({
    id: 'p1-main-tower-base',
    name: '主塔基座',
    year: 1200,
    material: '精加工砂岩',
    note: '方形主塔的基础部分，边长6米，砌筑极为规整。',
    geometry: createBoxGeometry(6, 1.5, 6),
    position: new THREE.Vector3(0, 0.75, 0),
    phaseId: 0
  });

  return buildings;
};

const buildPhase2 = (): BuildingBlock[] => {
  const buildings: BuildingBlock[] = [];

  buildings.push({
    id: 'p2-main-tower-upper',
    name: '主塔上层',
    year: 1280,
    material: '进口砂岩',
    note: '扩建阶段加高主塔，新增三层居住空间，四角设角楼。',
    geometry: createBoxGeometry(5.5, 6, 5.5),
    position: new THREE.Vector3(0, 4.5, 0),
    phaseId: 1
  });

  buildings.push({
    id: 'p2-outer-wall-n',
    name: '外堡北墙',
    year: 1280,
    material: '混合砌筑',
    note: '扩建外城时增建，工艺较内城粗糙。',
    geometry: createBoxGeometry(20, 2.5, 0.9),
    position: new THREE.Vector3(0, 1.25, -10),
    phaseId: 1
  });

  buildings.push({
    id: 'p2-outer-wall-e',
    name: '外堡东墙',
    year: 1280,
    material: '混合砌筑',
    note: '东侧外堡墙，发现马面结构遗迹。',
    geometry: createBoxGeometry(0.9, 2.5, 16),
    position: new THREE.Vector3(10, 1.25, -2),
    phaseId: 1
  });

  buildings.push({
    id: 'p2-outer-wall-s',
    name: '外堡南墙',
    year: 1280,
    material: '混合砌筑',
    note: '南侧外墙，中段设外城门。',
    geometry: createBoxGeometry(20, 2.5, 0.9),
    position: new THREE.Vector3(0, 1.25, 6),
    phaseId: 1
  });

  buildings.push({
    id: 'p2-east-bastion',
    name: '东侧角楼',
    year: 1280,
    material: '石灰岩',
    note: '半圆形防御工事，直径5米，为外堡制高点之一。',
    geometry: createCylinderGeometry(2.5, 2.8, 4, 12),
    position: new THREE.Vector3(10, 2, 6),
    phaseId: 1
  });

  buildings.push({
    id: 'p2-barrow',
    name: '瞭望塔',
    year: 1280,
    material: '砂岩',
    note: '位于城堡西北角的圆柱形瞭望塔，视野覆盖周边平原。',
    geometry: createCylinderGeometry(1.8, 2, 7, 16),
    position: new THREE.Vector3(-10, 3.5, -10),
    phaseId: 1
  });

  return buildings;
};

const buildPhase3 = (): BuildingBlock[] => {
  const buildings: BuildingBlock[] = [];

  buildings.push({
    id: 'p3-burned-main-tower',
    name: '焚毁后主塔残骸',
    year: 1450,
    material: '烧蚀砂岩',
    note: '战火焚毁后的主塔上部，顶部坍塌，墙体可见明显烟熏和开裂。',
    geometry: createBoxGeometry(5.2, 3, 5.2),
    position: new THREE.Vector3(0, 3, 0),
    phaseId: 2
  });

  buildings.push({
    id: 'p3-burned-wall-ne',
    name: '东北角城垣残迹',
    year: 1450,
    material: '炭化木石混合',
    note: '城墙坍塌段，散落大量烧熔的琉璃瓦碎片和铁钉。',
    geometry: createBoxGeometry(4, 1, 1),
    position: new THREE.Vector3(5.5, 0.5, -5.5),
    phaseId: 2
  });

  buildings.push({
    id: 'p3-burned-wall-sw',
    name: '西南角坍塌段',
    year: 1450,
    material: '碎裂石灰岩',
    note: '攻城器械撞击造成的大规模坍塌，废墟堆积高度约1.5米。',
    geometry: createBoxGeometry(5, 0.8, 1.5),
    position: new THREE.Vector3(-5.5, 0.4, 5.5),
    phaseId: 2
  });

  buildings.push({
    id: 'p3-burned-bastion',
    name: '焚毁角楼残基',
    year: 1450,
    material: '烧蚀石灰岩',
    note: '东侧角楼仅存底部2米，上部木结构完全焚毁。',
    geometry: createCylinderGeometry(2.5, 2.8, 2, 12),
    position: new THREE.Vector3(10, 1, 6),
    phaseId: 2
  });

  buildings.push({
    id: 'p3-debris-field',
    name: '内庭瓦砾场',
    year: 1450,
    material: '砖瓦碎石',
    note: '内庭区域堆积的建筑残骸层，厚度0.6-1.2米，包含大量生活器具残片。',
    geometry: createBoxGeometry(8, 0.6, 8),
    position: new THREE.Vector3(0, 0.3, 0),
    phaseId: 2
  });

  return buildings;
};

const buildPhase4 = (): BuildingBlock[] => {
  const buildings: BuildingBlock[] = [];

  buildings.push({
    id: 'p4-restored-tower',
    name: '修复后主塔',
    year: 1500,
    material: '新砌砂岩+旧石材',
    note: '在原主塔残骸基础上修复，新旧石材分界明显，修复部分高度5米。',
    geometry: createBoxGeometry(5.4, 5, 5.4),
    position: new THREE.Vector3(0, 4, 0),
    phaseId: 3
  });

  buildings.push({
    id: 'p4-restored-wall-n',
    name: '修复北城墙',
    year: 1500,
    material: '砂岩补砌',
    note: '北段城墙修补段，使用了不同时期的石材，可见典型文艺复兴时期砌筑风格。',
    geometry: createBoxGeometry(14, 3.2, 1.2),
    position: new THREE.Vector3(0, 1.6, -6),
    phaseId: 3
  });

  buildings.push({
    id: 'p4-new-chapel',
    name: '城堡礼拜堂',
    year: 1500,
    material: '精加工石灰岩',
    note: '修复阶段新增的小型礼拜堂，带有早期哥特式尖拱特征。',
    geometry: createBoxGeometry(4, 3.5, 6),
    position: new THREE.Vector3(-4, 1.75, -3),
    phaseId: 3
  });

  buildings.push({
    id: 'p4-gatehouse',
    name: '南门门楼',
    year: 1500,
    material: '砂岩+砖',
    note: '新建的门楼式城门，两侧设卫兵室，上方有防御平台。',
    geometry: createBoxGeometry(5, 4, 2.5),
    position: new THREE.Vector3(0, 2, 6.2),
    phaseId: 3
  });

  buildings.push({
    id: 'p4-courtyard-paving',
    name: '内庭铺地',
    year: 1500,
    material: '规整石板',
    note: '清理瓦砾后重新铺设的内庭地面，石板呈人字形排列。',
    geometry: createBoxGeometry(8, 0.15, 8),
    position: new THREE.Vector3(0, 0.075, 0),
    phaseId: 3
  });

  buildings.push({
    id: 'p4-restored-bastion',
    name: '修复角楼',
    year: 1500,
    material: '新旧石材混合',
    note: '东侧角楼修复至3.5米高，上部改为砖砌结构。',
    geometry: createCylinderGeometry(2.5, 2.8, 3.5, 12),
    position: new THREE.Vector3(10, 1.75, 6),
    phaseId: 3
  });

  return buildings;
};

export const buildAllPhases = (): PhaseData[] => {
  const phaseBuilders = [buildPhase1, buildPhase2, buildPhase3, buildPhase4];
  const eventDescriptions = [
    '1200年奠基：始建内城城墙与主塔基座',
    '1280年扩建：增建东侧外堡与瞭望塔',
    '1450年焚毁：战争导致主塔与多处城垣损毁',
    '1500年修复：重建主塔并新增礼拜堂与门楼'
  ];

  return _.map(phaseBuilders, (builder, index) => ({
    id: index,
    year: PHASE_YEARS[index],
    name: PHASE_NAMES[index],
    color: PHASE_COLORS[index],
    buildings: builder(),
    event: eventDescriptions[index]
  }));
};

export const getPhaseData = (phases: PhaseData[], phaseIndex: number): PhaseData => {
  const clampedIndex = _.clamp(phaseIndex, 0, phases.length - 1);
  return phases[clampedIndex];
};

export const lerpOpacity = (from: number, to: number, t: number): number => {
  const clampedT = _.clamp(t, 0, 1);
  return from + (to - from) * clampedT;
};

export const getAllPhaseEvents = (phases: PhaseData[]): Array<{ phaseId: number; year: number; text: string }> => {
  return _.map(phases, (p) => ({
    phaseId: p.id,
    year: p.year,
    text: p.event
  }));
};
