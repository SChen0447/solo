export interface NodeData {
  id: number;
  name: string;
  x: number;
  y: number;
  z: number;
  load: number;
}

export interface LineData {
  id: number;
  fromId: number;
  toId: number;
  current: number;
}

const NODE_NAMES = [
  '中心电站', '东区变压', '西区枢纽', '南区配电', '北区节点',
  '商业中心', '工业园A', '工业园B', '住宅区1', '住宅区2',
  '科技园区', '金融中心', '交通枢纽', '数据中心', '医疗系统',
  '教育网络', '会展中心', '体育场馆', '港口供电', '机场节点'
];

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function generateNetworkData(): { nodes: NodeData[]; lines: LineData[] } {
  const nodeCount = Math.floor(randomRange(50, 81));
  const lineCount = Math.floor(randomRange(100, 151));

  const nodes: NodeData[] = [];
  const lines: LineData[] = [];

  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: i,
      name: NODE_NAMES[i % NODE_NAMES.length] + '-' + (Math.floor(i / NODE_NAMES.length) + 1),
      x: randomRange(-8, 8),
      y: randomRange(-0.5, 1.5),
      z: randomRange(-8, 8),
      load: randomRange(10, 50)
    });
  }

  const lineSet = new Set<string>();
  let lineId = 0;

  for (let i = 0; i < nodes.length - 1; i++) {
    const target = i + 1;
    const key = i < target ? `${i}-${target}` : `${target}-${i}`;
    if (!lineSet.has(key)) {
      lineSet.add(key);
      lines.push({
        id: lineId++,
        fromId: i,
        toId: target,
        current: randomRange(0.2, 0.6)
      });
    }
  }

  while (lines.length < lineCount) {
    const from = Math.floor(Math.random() * nodeCount);
    let to = Math.floor(Math.random() * nodeCount);
    
    while (to === from) {
      to = Math.floor(Math.random() * nodeCount);
    }

    const key = from < to ? `${from}-${to}` : `${to}-${from}`;
    if (!lineSet.has(key)) {
      lineSet.add(key);
      lines.push({
        id: lineId++,
        fromId: from,
        toId: to,
        current: randomRange(0.2, 0.6)
      });
    }
  }

  return { nodes, lines };
}
