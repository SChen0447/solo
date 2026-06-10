export type CrystalStructure = 'BCC' | 'FCC' | 'HCP' | 'SC' | 'Diamond';

export interface Isotope {
  mass: number;
  abundance: number;
}

export interface ElementData {
  symbol: string;
  name: string;
  atomicNumber: number;
  atomicMass: number;
  electronShells: number[];
  isotopes: Isotope[];
  crystalStructure: CrystalStructure;
  crystalName: string;
  color: string;
  glowColor: string;
}

export const ELEMENTS: ElementData[] = [
  {
    symbol: 'H',
    name: '氢',
    atomicNumber: 1,
    atomicMass: 1.008,
    electronShells: [1],
    isotopes: [
      { mass: 1, abundance: 99.98 },
      { mass: 2, abundance: 0.02 },
      { mass: 3, abundance: 0.00 }
    ],
    crystalStructure: 'HCP',
    crystalName: '六方密排',
    color: '#ffffff',
    glowColor: '#aaddff'
  },
  {
    symbol: 'He',
    name: '氦',
    atomicNumber: 2,
    atomicMass: 4.003,
    electronShells: [2],
    isotopes: [
      { mass: 3, abundance: 0.0001 },
      { mass: 4, abundance: 99.9999 },
      { mass: 5, abundance: 0.00 }
    ],
    crystalStructure: 'HCP',
    crystalName: '六方密排',
    color: '#ffccaa',
    glowColor: '#ffddaa'
  },
  {
    symbol: 'Li',
    name: '锂',
    atomicNumber: 3,
    atomicMass: 6.941,
    electronShells: [2, 1],
    isotopes: [
      { mass: 6, abundance: 7.59 },
      { mass: 7, abundance: 92.41 },
      { mass: 8, abundance: 0.00 }
    ],
    crystalStructure: 'BCC',
    crystalName: '体心立方',
    color: '#cc80ff',
    glowColor: '#ddaaff'
  },
  {
    symbol: 'Be',
    name: '铍',
    atomicNumber: 4,
    atomicMass: 9.012,
    electronShells: [2, 2],
    isotopes: [
      { mass: 9, abundance: 100.0 },
      { mass: 10, abundance: 0.00 },
      { mass: 7, abundance: 0.00 }
    ],
    crystalStructure: 'HCP',
    crystalName: '六方密排',
    color: '#c2ff00',
    glowColor: '#ccff33'
  },
  {
    symbol: 'B',
    name: '硼',
    atomicNumber: 5,
    atomicMass: 10.81,
    electronShells: [2, 3],
    isotopes: [
      { mass: 10, abundance: 19.9 },
      { mass: 11, abundance: 80.1 },
      { mass: 12, abundance: 0.00 }
    ],
    crystalStructure: 'SC',
    crystalName: '简单立方',
    color: '#ffa000',
    glowColor: '#ffbb33'
  },
  {
    symbol: 'C',
    name: '碳',
    atomicNumber: 6,
    atomicMass: 12.01,
    electronShells: [2, 4],
    isotopes: [
      { mass: 12, abundance: 98.93 },
      { mass: 13, abundance: 1.07 },
      { mass: 14, abundance: 0.00 }
    ],
    crystalStructure: 'Diamond',
    crystalName: '金刚石结构',
    color: '#404040',
    glowColor: '#808080'
  },
  {
    symbol: 'N',
    name: '氮',
    atomicNumber: 7,
    atomicMass: 14.01,
    electronShells: [2, 5],
    isotopes: [
      { mass: 14, abundance: 99.63 },
      { mass: 15, abundance: 0.37 },
      { mass: 16, abundance: 0.00 }
    ],
    crystalStructure: 'HCP',
    crystalName: '六方密排',
    color: '#3050f8',
    glowColor: '#6688ff'
  },
  {
    symbol: 'O',
    name: '氧',
    atomicNumber: 8,
    atomicMass: 16.00,
    electronShells: [2, 6],
    isotopes: [
      { mass: 16, abundance: 99.76 },
      { mass: 17, abundance: 0.04 },
      { mass: 18, abundance: 0.20 }
    ],
    crystalStructure: 'SC',
    crystalName: '简单立方',
    color: '#ff0d0d',
    glowColor: '#ff5555'
  },
  {
    symbol: 'Na',
    name: '钠',
    atomicNumber: 11,
    atomicMass: 22.99,
    electronShells: [2, 8, 1],
    isotopes: [
      { mass: 23, abundance: 100.0 },
      { mass: 22, abundance: 0.00 },
      { mass: 24, abundance: 0.00 }
    ],
    crystalStructure: 'BCC',
    crystalName: '体心立方',
    color: '#ab5cf2',
    glowColor: '#cc88ff'
  },
  {
    symbol: 'Mg',
    name: '镁',
    atomicNumber: 12,
    atomicMass: 24.31,
    electronShells: [2, 8, 2],
    isotopes: [
      { mass: 24, abundance: 78.99 },
      { mass: 25, abundance: 10.00 },
      { mass: 26, abundance: 11.01 }
    ],
    crystalStructure: 'HCP',
    crystalName: '六方密排',
    color: '#8aff00',
    glowColor: '#aaff55'
  },
  {
    symbol: 'Al',
    name: '铝',
    atomicNumber: 13,
    atomicMass: 26.98,
    electronShells: [2, 8, 3],
    isotopes: [
      { mass: 27, abundance: 100.0 },
      { mass: 26, abundance: 0.00 },
      { mass: 28, abundance: 0.00 }
    ],
    crystalStructure: 'FCC',
    crystalName: '面心立方',
    color: '#bfa6a6',
    glowColor: '#cccccc'
  },
  {
    symbol: 'Si',
    name: '硅',
    atomicNumber: 14,
    atomicMass: 28.09,
    electronShells: [2, 8, 4],
    isotopes: [
      { mass: 28, abundance: 92.23 },
      { mass: 29, abundance: 4.67 },
      { mass: 30, abundance: 3.10 }
    ],
    crystalStructure: 'Diamond',
    crystalName: '金刚石结构',
    color: '#f0c8a0',
    glowColor: '#ffddaa'
  },
  {
    symbol: 'K',
    name: '钾',
    atomicNumber: 19,
    atomicMass: 39.10,
    electronShells: [2, 8, 8, 1],
    isotopes: [
      { mass: 39, abundance: 93.26 },
      { mass: 40, abundance: 0.01 },
      { mass: 41, abundance: 6.73 }
    ],
    crystalStructure: 'BCC',
    crystalName: '体心立方',
    color: '#8f40d4',
    glowColor: '#aa66ff'
  },
  {
    symbol: 'Ca',
    name: '钙',
    atomicNumber: 20,
    atomicMass: 40.08,
    electronShells: [2, 8, 8, 2],
    isotopes: [
      { mass: 40, abundance: 96.94 },
      { mass: 42, abundance: 0.65 },
      { mass: 44, abundance: 2.09 }
    ],
    crystalStructure: 'FCC',
    crystalName: '面心立方',
    color: '#3dff00',
    glowColor: '#66ff55'
  },
  {
    symbol: 'Ti',
    name: '钛',
    atomicNumber: 22,
    atomicMass: 47.87,
    electronShells: [2, 8, 10, 2],
    isotopes: [
      { mass: 46, abundance: 8.25 },
      { mass: 47, abundance: 7.44 },
      { mass: 48, abundance: 73.72 }
    ],
    crystalStructure: 'HCP',
    crystalName: '六方密排',
    color: '#bfc2c7',
    glowColor: '#dddddd'
  },
  {
    symbol: 'Fe',
    name: '铁',
    atomicNumber: 26,
    atomicMass: 55.85,
    electronShells: [2, 8, 14, 2],
    isotopes: [
      { mass: 54, abundance: 5.85 },
      { mass: 56, abundance: 91.75 },
      { mass: 57, abundance: 2.12 }
    ],
    crystalStructure: 'BCC',
    crystalName: '体心立方',
    color: '#e06633',
    glowColor: '#ffaa66'
  },
  {
    symbol: 'Ni',
    name: '镍',
    atomicNumber: 28,
    atomicMass: 58.69,
    electronShells: [2, 8, 16, 2],
    isotopes: [
      { mass: 58, abundance: 68.08 },
      { mass: 60, abundance: 26.22 },
      { mass: 61, abundance: 1.14 }
    ],
    crystalStructure: 'FCC',
    crystalName: '面心立方',
    color: '#50d050',
    glowColor: '#88ff88'
  },
  {
    symbol: 'Cu',
    name: '铜',
    atomicNumber: 29,
    atomicMass: 63.55,
    electronShells: [2, 8, 18, 1],
    isotopes: [
      { mass: 63, abundance: 69.15 },
      { mass: 65, abundance: 30.85 },
      { mass: 67, abundance: 0.00 }
    ],
    crystalStructure: 'FCC',
    crystalName: '面心立方',
    color: '#c88033',
    glowColor: '#ffaa66'
  },
  {
    symbol: 'Zn',
    name: '锌',
    atomicNumber: 30,
    atomicMass: 65.38,
    electronShells: [2, 8, 18, 2],
    isotopes: [
      { mass: 64, abundance: 48.63 },
      { mass: 66, abundance: 27.90 },
      { mass: 67, abundance: 4.10 }
    ],
    crystalStructure: 'HCP',
    crystalName: '六方密排',
    color: '#7d80b0',
    glowColor: '#aabbdd'
  },
  {
    symbol: 'Au',
    name: '金',
    atomicNumber: 79,
    atomicMass: 196.97,
    electronShells: [2, 8, 18, 32, 18, 1],
    isotopes: [
      { mass: 197, abundance: 100.0 },
      { mass: 195, abundance: 0.00 },
      { mass: 198, abundance: 0.00 }
    ],
    crystalStructure: 'FCC',
    crystalName: '面心立方',
    color: '#ffd123',
    glowColor: '#ffee66'
  }
];

export function getElementBySymbol(symbol: string): ElementData | undefined {
  return ELEMENTS.find(el => el.symbol.toLowerCase() === symbol.toLowerCase());
}

export function getElementByAtomicNumber(num: number): ElementData | undefined {
  return ELEMENTS.find(el => el.atomicNumber === num);
}
