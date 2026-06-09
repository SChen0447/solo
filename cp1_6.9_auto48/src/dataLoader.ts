import * as d3 from 'd3';

export interface BlockHourData {
  population: number;
  traffic: number;
  pm25: number;
}

export interface CityBlock {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  gridX: number;
  gridZ: number;
  hourlyData: Map<number, BlockHourData>;
}

export interface CityDataset {
  blocks: CityBlock[];
  gridSize: number;
}

const GRID_SIZE = 10;
const BLOCK_NAMES = [
  '金融中心', '科技园', '商业区', '居住区', '文化区',
  '工业区', '大学城', '医院区', '公园区', '交通枢纽',
  '行政中心', '物流园', '美食街', '娱乐区', '体育中心',
  '会展中心', '住宅区A', '住宅区B', '住宅区C', '住宅区D',
  '高新区', '开发区', '保税区', '生态园', '创业园',
  '软件园', '电商园', '创意园', '金融港', '商务中心',
  '老城区', '新城区', '湖畔区', '山地区', '河滨区',
  '临海园', '空港城', '铁路新城', '滨江带', '历史街区',
  '艺术区', '图书馆区', '博物馆群', '体育公园', '儿童乐园',
  '动物园区', '植物园', '湿地公园', '森林公园', '地质公园',
  '中心广场', '步行街', '购物公园', '奥特莱斯', '批发市场',
  '建材市场', '汽配城', '家具城', '电子城', '服装城',
  '食品城', '农资市场', '花卉市场', '宠物市场', '古玩市场',
  '科技园A', '科技园B', '科技园C', '科技园D', '科技园E',
  '产业园1', '产业园2', '产业园3', '产业园4', '产业园5',
  '孵化器A', '孵化器B', '加速器', '众创空间', '研发基地',
  '总部基地', '金融后台', '数据中心', '云计算基地', 'AI产业园',
  '新能源园', '新材料园', '生物医药园', '智能制造园', '绿色建筑园',
  '文旅小镇', '康养基地', '养老社区', '国际学校', '三甲医院',
  '妇幼保健', '中医院', '口腔医院', '眼科中心', '体检中心'
];

const seededRandom = (seed: number): () => number => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

const randInt = (rand: () => number, min: number, max: number): number => {
  return Math.floor(rand() * (max - min + 1)) + min;
};

const generateHourlyPattern = (
  rand: () => number,
  baseType: 'business' | 'residential' | 'industrial' | 'park'
): Map<number, BlockHourData> => {
  const hourlyData = new Map<number, BlockHourData>();

  for (let hour = 0; hour < 24; hour++) {
    let popMultiplier = 1;
    let trafficMultiplier = 1;
    let pmMultiplier = 1;

    switch (baseType) {
      case 'business':
        popMultiplier =
          hour >= 9 && hour <= 18 ? 1.0 :
          hour >= 7 && hour < 9 ? 0.7 :
          hour > 18 && hour <= 20 ? 0.6 :
          hour >= 21 || hour < 6 ? 0.15 : 0.3;
        trafficMultiplier =
          (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19) ? 1.0 :
          hour >= 10 && hour <= 16 ? 0.75 :
          hour >= 20 && hour <= 22 ? 0.4 : 0.15;
        pmMultiplier =
          hour >= 8 && hour <= 20 ? 1.0 :
          hour >= 6 && hour < 8 ? 0.7 : 0.5;
        break;
      case 'residential':
        popMultiplier =
          hour >= 22 || hour <= 6 ? 1.0 :
          hour >= 7 && hour <= 9 ? 0.5 :
          hour >= 10 && hour <= 16 ? 0.25 :
          hour >= 17 && hour <= 21 ? 0.8 : 0.6;
        trafficMultiplier =
          (hour >= 7 && hour <= 8) || (hour >= 18 && hour <= 19) ? 0.8 :
          hour >= 9 && hour <= 17 ? 0.3 : 0.1;
        pmMultiplier =
          hour >= 7 && hour <= 10 ? 0.7 :
          hour >= 17 && hour <= 21 ? 0.8 : 0.5;
        break;
      case 'industrial':
        popMultiplier = hour >= 8 && hour <= 18 ? 1.0 : 0.3;
        trafficMultiplier = hour >= 8 && hour <= 18 ? 0.8 : 0.2;
        pmMultiplier = hour >= 6 && hour <= 22 ? 1.0 : 0.6;
        break;
      case 'park':
        popMultiplier =
          hour >= 10 && hour <= 16 ? 1.0 :
          hour >= 7 && hour < 10 ? 0.5 :
          hour > 16 && hour <= 20 ? 0.6 : 0.1;
        trafficMultiplier = hour >= 9 && hour <= 18 ? 0.4 : 0.1;
        pmMultiplier = 0.4;
        break;
    }

    const basePop = baseType === 'residential' ? 3000 : baseType === 'business' ? 2500 : baseType === 'industrial' ? 1500 : 800;
    const baseTraffic = baseType === 'business' ? 70 : baseType === 'industrial' ? 50 : baseType === 'residential' ? 40 : 20;
    const basePm = baseType === 'industrial' ? 120 : baseType === 'business' ? 90 : baseType === 'residential' ? 50 : 30;

    const jitter = (v: number, amount: number) =>
      Math.max(0, v + (rand() - 0.5) * amount * v);

    hourlyData.set(hour, {
      population: Math.round(jitter(basePop * popMultiplier, 0.25)),
      traffic: Math.min(100, Math.max(0, Math.round(jitter(baseTraffic * trafficMultiplier, 0.3)))),
      pm25: Math.max(5, Math.round(jitter(basePm * pmMultiplier, 0.25)))
    });
  }

  return hourlyData;
};

export const generateRandomData = (): CityDataset => {
  const seed = Date.now();
  const rand = seededRandom(seed);
  const blocks: CityBlock[] = [];
  const types: Array<'business' | 'residential' | 'industrial' | 'park'> = [
    'business', 'residential', 'industrial', 'park'
  ];

  let idx = 0;
  for (let gz = 0; gz < GRID_SIZE; gz++) {
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      const typeIdx = randInt(rand, 0, 3);
      const blockType = types[typeIdx];
      const id = `${String.fromCharCode(65 + gz)}${gx + 1}`;

      blocks.push({
        id,
        name: BLOCK_NAMES[idx % BLOCK_NAMES.length],
        latitude: 31.2 + (rand() - 0.5) * 0.1,
        longitude: 121.45 + (rand() - 0.5) * 0.1,
        gridX: gx,
        gridZ: gz,
        hourlyData: generateHourlyPattern(rand, blockType)
      });
      idx++;
    }
  }

  return { blocks, gridSize: GRID_SIZE };
};

export const loadData = async (): Promise<CityDataset> => {
  try {
    const response = await fetch('/data/city_data.csv');
    if (!response.ok) {
      throw new Error('CSV not found, generating random data');
    }
    const csvText = await response.text();
    const parsed = d3.csvParse(csvText);

    const blockMap = new Map<string, CityBlock>();
    let gridX = 0, gridZ = 0;

    for (const row of parsed) {
      const id = row.block_id;
      if (!blockMap.has(id)) {
        blockMap.set(id, {
          id,
          name: row.block_name,
          latitude: parseFloat(row.latitude),
          longitude: parseFloat(row.longitude),
          gridX: gridX % GRID_SIZE,
          gridZ: gridZ,
          hourlyData: new Map()
        });
        gridX++;
        if (gridX >= GRID_SIZE) {
          gridX = 0;
          gridZ++;
        }
      }
      const block = blockMap.get(id)!;
      const hour = parseInt(row.hour, 10);
      block.hourlyData.set(hour, {
        population: parseInt(row.population, 10),
        traffic: parseInt(row.traffic, 10),
        pm25: parseInt(row.pm25, 10)
      });
    }

    const existingBlocks = Array.from(blockMap.values());

    if (existingBlocks.length < GRID_SIZE * GRID_SIZE) {
      const seed = 42;
      const rand = seededRandom(seed);
      const types: Array<'business' | 'residential' | 'industrial' | 'park'> = [
        'business', 'residential', 'industrial', 'park'
      ];

      const usedCount = existingBlocks.length;
      for (let i = usedCount; i < GRID_SIZE * GRID_SIZE; i++) {
        const gx = i % GRID_SIZE;
        const gz = Math.floor(i / GRID_SIZE);
        const id = `${String.fromCharCode(65 + gz)}${gx + 1}`;
        const typeIdx = randInt(rand, 0, 3);
        existingBlocks.push({
          id,
          name: BLOCK_NAMES[i % BLOCK_NAMES.length],
          latitude: 31.2 + (rand() - 0.5) * 0.1,
          longitude: 121.45 + (rand() - 0.5) * 0.1,
          gridX: gx,
          gridZ: gz,
          hourlyData: generateHourlyPattern(rand, types[typeIdx])
        });
      }
    }

    return { blocks: existingBlocks, gridSize: GRID_SIZE };
  } catch {
    return generateRandomData();
  }
};

export const getBlockAtHour = (block: CityBlock, hour: number): BlockHourData => {
  return block.hourlyData.get(hour) || { population: 0, traffic: 0, pm25: 0 };
};

export const computeAverages = (blocks: CityBlock[], hour: number): BlockHourData => {
  if (blocks.length === 0) return { population: 0, traffic: 0, pm25: 0 };
  let pop = 0, traffic = 0, pm = 0;
  for (const b of blocks) {
    const d = getBlockAtHour(b, hour);
    pop += d.population;
    traffic += d.traffic;
    pm += d.pm25;
  }
  const n = blocks.length;
  return {
    population: Math.round(pop / n),
    traffic: Math.round(traffic / n),
    pm25: Math.round(pm / n)
  };
};
