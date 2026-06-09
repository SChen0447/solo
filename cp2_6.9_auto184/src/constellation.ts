export interface Star {
  x: number;
  y: number;
  z: number;
  size?: number;
}

export interface Constellation {
  id: string;
  name: string;
  color: string;
  stars: Star[];
  lines: [number, number][];
  myth: string;
  animationParams: {
    glowIntensity: number;
    rippleSpeed: number;
  };
}

export const CONSTELLATIONS: Constellation[] = [
  {
    id: 'orion',
    name: '猎户座',
    color: '#4A90D9',
    stars: [
      { x: -2.5, y: 3.0, z: 6.0, size: 0.35 },
      { x: 2.5, y: 3.2, z: 5.8, size: 0.4 },
      { x: -1.5, y: 1.2, z: 6.5, size: 0.25 },
      { x: 0.0, y: 1.3, z: 6.4, size: 0.3 },
      { x: 1.5, y: 1.1, z: 6.6, size: 0.25 },
      { x: -1.8, y: -0.8, z: 6.3, size: 0.3 },
      { x: 1.8, y: -0.9, z: 6.2, size: 0.32 },
      { x: -2.2, y: -2.8, z: 5.9, size: 0.28 },
      { x: 2.0, y: -3.0, z: 6.1, size: 0.3 },
    ],
    lines: [
      [0, 2], [1, 4], [2, 3], [3, 4],
      [2, 5], [4, 6], [5, 7], [6, 8], [5, 6]
    ],
    myth: '猎户奥利翁是海神波塞冬之子，因向女神阿耳忒弥斯求婚而被天后赫拉派天蝎毒死。宙斯将他升上天空成为猎户座，与天蝎座永隔银河两端相望相斗。',
    animationParams: { glowIntensity: 1.5, rippleSpeed: 1.2 }
  },
  {
    id: 'cassiopeia',
    name: '仙后座',
    color: '#E8B4FF',
    stars: [
      { x: -6.5, y: 4.5, z: 2.0, size: 0.3 },
      { x: -5.0, y: 5.2, z: 2.5, size: 0.32 },
      { x: -3.5, y: 4.0, z: 3.0, size: 0.28 },
      { x: -2.0, y: 5.0, z: 2.8, size: 0.3 },
      { x: -0.5, y: 4.2, z: 3.2, size: 0.3 },
    ],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
    myth: '埃塞俄比亚王后卡西俄珀亚因自恃美貌触怒海神波塞冬，被缚于天上的椅子永受旋转之苦。她的星座呈W或M形，在北方天空永恒闪耀。',
    animationParams: { glowIntensity: 1.3, rippleSpeed: 1.0 }
  },
  {
    id: 'ursa_major',
    name: '大熊座',
    color: '#FFD700',
    stars: [
      { x: 5.0, y: 3.5, z: 1.5, size: 0.32 },
      { x: 6.2, y: 3.3, z: 1.2, size: 0.3 },
      { x: 6.8, y: 2.0, z: 1.8, size: 0.28 },
      { x: 5.6, y: 1.8, z: 2.2, size: 0.3 },
      { x: 4.5, y: 2.0, z: 2.5, size: 0.3 },
      { x: 3.2, y: 0.8, z: 3.0, size: 0.32 },
      { x: 2.5, y: -0.5, z: 3.5, size: 0.3 },
    ],
    lines: [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [3, 4], [4, 5], [5, 6]
    ],
    myth: '宙斯将所爱之女卡利斯托变为大熊以躲避赫拉之眼，后升为大熊座。她的儿子阿卡斯变为小熊座，母子二人在北天永不落下，为航海者指引方向。',
    animationParams: { glowIntensity: 1.4, rippleSpeed: 1.1 }
  },
  {
    id: 'cygnus',
    name: '天鹅座',
    color: '#FFFFFF',
    stars: [
      { x: 0.0, y: 5.5, z: -5.0, size: 0.35 },
      { x: 0.0, y: 3.5, z: -5.5, size: 0.3 },
      { x: 0.0, y: 1.5, z: -5.8, size: 0.32 },
      { x: -2.0, y: 3.0, z: -5.2, size: 0.28 },
      { x: 2.0, y: 3.0, z: -5.2, size: 0.28 },
      { x: 0.0, y: -0.5, z: -6.0, size: 0.3 },
    ],
    lines: [
      [0, 1], [1, 2], [2, 5],
      [3, 1], [1, 4]
    ],
    myth: '太阳神阿波罗之子法厄同驾驭太阳车失控被宙斯雷击而亡，其挚友赛格纳斯化身为天鹅在天上永恒追寻。天鹅座呈十字形展翅翱翔于银河之上。',
    animationParams: { glowIntensity: 1.6, rippleSpeed: 1.3 }
  },
  {
    id: 'aquila',
    name: '天鹰座',
    color: '#87CEEB',
    stars: [
      { x: -4.0, y: -0.5, z: -6.0, size: 0.38 },
      { x: -5.2, y: 0.8, z: -5.5, size: 0.28 },
      { x: -2.8, y: 0.8, z: -5.6, size: 0.28 },
      { x: -6.0, y: 1.8, z: -5.0, size: 0.25 },
      { x: -2.0, y: 1.8, z: -5.2, size: 0.25 },
    ],
    lines: [
      [0, 1], [0, 2],
      [1, 3], [2, 4]
    ],
    myth: '宙斯的化身神鹰伽倪墨得斯驮着美少年飞上奥林匹斯山为众神斟酒。天鹰座最亮的牛郎星与银河对岸的织女星遥遥相望，诉说着七夕的动人传说。',
    animationParams: { glowIntensity: 1.4, rippleSpeed: 1.1 }
  },
  {
    id: 'scorpius',
    name: '天蝎座',
    color: '#FF4444',
    stars: [
      { x: 5.5, y: -3.5, z: 2.5, size: 0.4 },
      { x: 6.5, y: -2.8, z: 1.8, size: 0.3 },
      { x: 7.2, y: -1.8, z: 1.2, size: 0.28 },
      { x: 7.8, y: -0.5, z: 0.8, size: 0.3 },
      { x: 7.5, y: 0.8, z: 1.0, size: 0.28 },
      { x: 6.8, y: 1.8, z: 1.5, size: 0.26 },
      { x: 5.8, y: 2.5, z: 2.0, size: 0.25 },
      { x: 6.5, y: 2.8, z: 1.2, size: 0.24 },
    ],
    lines: [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [4, 5], [5, 6], [5, 7]
    ],
    myth: '天后赫拉派遣的巨蝎刺死了狂妄的猎人奥利翁，二者同被升上天空却永远分居银河两侧。天蝎火红的心宿二是夏夜天空最璀璨的红色宝石。',
    animationParams: { glowIntensity: 1.7, rippleSpeed: 1.4 }
  },
  {
    id: 'ursa_minor',
    name: '小熊座',
    color: '#B0C4DE',
    stars: [
      { x: 2.0, y: 7.5, z: -2.0, size: 0.36 },
      { x: 1.0, y: 6.2, z: -1.5, size: 0.28 },
      { x: -0.2, y: 5.5, z: -1.0, size: 0.26 },
      { x: 0.8, y: 4.8, z: -0.8, size: 0.25 },
      { x: 1.8, y: 5.2, z: -1.2, size: 0.26 },
      { x: 2.5, y: 4.0, z: -0.5, size: 0.27 },
      { x: 3.2, y: 2.8, z: 0.0, size: 0.28 },
    ],
    lines: [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [4, 1], [4, 5], [5, 6]
    ],
    myth: '阿卡斯被宙斯升为小熊座与母亲大熊座相伴。其尾端的北极星是天球永恒的中心，自古以来指引着旅人与航海者找到归家的方向。',
    animationParams: { glowIntensity: 1.3, rippleSpeed: 1.0 }
  },
  {
    id: 'andromeda',
    name: '仙女座',
    color: '#FFB6C1',
    stars: [
      { x: -7.5, y: 1.0, z: -1.5, size: 0.34 },
      { x: -6.0, y: 0.5, z: -2.0, size: 0.3 },
      { x: -4.5, y: 0.2, z: -2.5, size: 0.28 },
      { x: -3.0, y: -0.2, z: -3.0, size: 0.3 },
      { x: -5.5, y: 1.8, z: -1.8, size: 0.26 },
      { x: -4.0, y: 1.5, z: -2.2, size: 0.25 },
    ],
    lines: [
      [0, 1], [1, 2], [2, 3],
      [1, 4], [2, 5]
    ],
    myth: '埃塞俄比亚公主安德洛墨达因母亲的虚荣被缚于悬崖献祭海怪，幸得英雄珀耳修斯相救。她的星座在北天静静舒展，象征着不屈与救赎。',
    animationParams: { glowIntensity: 1.3, rippleSpeed: 1.0 }
  }
];

export function getConstellationCenter(constellation: Constellation): { x: number; y: number; z: number } {
  const n = constellation.stars.length;
  let sx = 0, sy = 0, sz = 0;
  for (const s of constellation.stars) {
    sx += s.x; sy += s.y; sz += s.z;
  }
  return { x: sx / n, y: sy / n, z: sz / n };
}
