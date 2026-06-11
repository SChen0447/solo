export const MAP_CENTER: [number, number] = [37.5, 100.5];
export const MAP_ZOOM = 5;
export const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

export interface PassGeo {
  id: string;
  name: string;
  position: [number, number];
  description: string;
}

export interface RoadPath {
  id: string;
  from: string;
  to: string;
  positions: [number, number][];
  riskLevel: number;
}

export const PASS_GEO: PassGeo[] = [
  { id: "jiayuguan", name: "嘉峪关", position: [39.7732, 98.2894], description: "西陲第一关" },
  { id: "yumenguan", name: "玉门关", position: [40.3485, 93.7446], description: "丝路咽喉" },
  { id: "yangguan", name: "阳关", position: [39.885, 94.02], description: "西域门户" },
  { id: "dunhuang", name: "敦煌", position: [40.142, 94.662], description: "沙漠绿洲" },
  { id: "lanzhou", name: "兰州", position: [36.0611, 103.8343], description: "陇上要塞" },
  { id: "changan", name: "长安", position: [34.2637, 108.9423], description: "帝都" },
  { id: "datong", name: "大同", position: [40.0769, 113.3001], description: "北疆锁钥" },
];

export const ROAD_PATHS: RoadPath[] = [
  {
    id: "road1",
    from: "jiayuguan",
    to: "yumenguan",
    positions: [
      [39.7732, 98.2894],
      [40.0, 96.0],
      [40.3485, 93.7446],
    ],
    riskLevel: 2,
  },
  {
    id: "road2",
    from: "yumenguan",
    to: "dunhuang",
    positions: [
      [40.3485, 93.7446],
      [40.25, 94.2],
      [40.142, 94.662],
    ],
    riskLevel: 1,
  },
  {
    id: "road3",
    from: "dunhuang",
    to: "lanzhou",
    positions: [
      [40.142, 94.662],
      [39.5, 97.0],
      [38.5, 99.5],
      [37.2, 101.5],
      [36.0611, 103.8343],
    ],
    riskLevel: 4,
  },
  {
    id: "road4",
    from: "lanzhou",
    to: "changan",
    positions: [
      [36.0611, 103.8343],
      [35.5, 105.5],
      [34.9, 107.0],
      [34.2637, 108.9423],
    ],
    riskLevel: 3,
  },
  {
    id: "road5",
    from: "changan",
    to: "datong",
    positions: [
      [34.2637, 108.9423],
      [35.5, 109.5],
      [37.0, 111.0],
      [38.5, 112.0],
      [40.0769, 113.3001],
    ],
    riskLevel: 3,
  },
  {
    id: "road6",
    from: "yangguan",
    to: "dunhuang",
    positions: [
      [39.885, 94.02],
      [40.0, 94.35],
      [40.142, 94.662],
    ],
    riskLevel: 1,
  },
  {
    id: "road7",
    from: "jiayuguan",
    to: "yangguan",
    positions: [
      [39.7732, 98.2894],
      [39.83, 96.2],
      [39.885, 94.02],
    ],
    riskLevel: 2,
  },
  {
    id: "road8",
    from: "lanzhou",
    to: "datong",
    positions: [
      [36.0611, 103.8343],
      [37.0, 105.5],
      [38.0, 108.0],
      [39.0, 110.5],
      [40.0769, 113.3001],
    ],
    riskLevel: 5,
  },
];

export function riskLevelToColor(level: number): string {
  const colors = [
    "#22C55E",
    "#84CC16",
    "#EAB308",
    "#F97316",
    "#EF4444",
  ];
  return colors[Math.min(level - 1, 4)];
}
