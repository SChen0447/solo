export interface Element {
  atomicNumber: number;
  symbol: string;
  name: string;
  nameEn: string;
  category: string;
  atomicMass: number;
  electronConfiguration: string;
  period: number;
  group: number;
}

export const categoryColors: Record<string, string> = {
  '碱金属': '#ff6b6b',
  '碱土金属': '#ffa502',
  '过渡金属': '#ff7f50',
  '后过渡金属': '#ffd93d',
  '准金属': '#6bcb77',
  '非金属': '#48dbfb',
  '卤素': '#a55eea',
  '稀有气体': '#00d2ff',
  '镧系元素': '#ff6b9d',
  '锕系元素': '#c56cf0',
  '未知': '#95a5a6',
};

export const getCategoryColor = (category: string): string => {
  return categoryColors[category] || '#95a5a6';
};

export const elements: Element[] = [
  { atomicNumber: 1, symbol: 'H', name: '氢', nameEn: 'Hydrogen', category: '非金属', atomicMass: 1.008, electronConfiguration: '1s1', period: 1, group: 1 },
  { atomicNumber: 2, symbol: 'He', name: '氦', nameEn: 'Helium', category: '稀有气体', atomicMass: 4.003, electronConfiguration: '1s2', period: 1, group: 18 },
  { atomicNumber: 3, symbol: 'Li', name: '锂', nameEn: 'Lithium', category: '碱金属', atomicMass: 6.941, electronConfiguration: '[He] 2s1', period: 2, group: 1 },
  { atomicNumber: 4, symbol: 'Be', name: '铍', nameEn: 'Beryllium', category: '碱土金属', atomicMass: 9.012, electronConfiguration: '[He] 2s2', period: 2, group: 2 },
  { atomicNumber: 5, symbol: 'B', name: '硼', nameEn: 'Boron', category: '准金属', atomicMass: 10.81, electronConfiguration: '[He] 2s2 2p1', period: 2, group: 13 },
  { atomicNumber: 6, symbol: 'C', name: '碳', nameEn: 'Carbon', category: '非金属', atomicMass: 12.01, electronConfiguration: '[He] 2s2 2p2', period: 2, group: 14 },
  { atomicNumber: 7, symbol: 'N', name: '氮', nameEn: 'Nitrogen', category: '非金属', atomicMass: 14.01, electronConfiguration: '[He] 2s2 2p3', period: 2, group: 15 },
  { atomicNumber: 8, symbol: 'O', name: '氧', nameEn: 'Oxygen', category: '非金属', atomicMass: 16.00, electronConfiguration: '[He] 2s2 2p4', period: 2, group: 16 },
  { atomicNumber: 9, symbol: 'F', name: '氟', nameEn: 'Fluorine', category: '卤素', atomicMass: 19.00, electronConfiguration: '[He] 2s2 2p5', period: 2, group: 17 },
  { atomicNumber: 10, symbol: 'Ne', name: '氖', nameEn: 'Neon', category: '稀有气体', atomicMass: 20.18, electronConfiguration: '[He] 2s2 2p6', period: 2, group: 18 },
  { atomicNumber: 11, symbol: 'Na', name: '钠', nameEn: 'Sodium', category: '碱金属', atomicMass: 22.99, electronConfiguration: '[Ne] 3s1', period: 3, group: 1 },
  { atomicNumber: 12, symbol: 'Mg', name: '镁', nameEn: 'Magnesium', category: '碱土金属', atomicMass: 24.31, electronConfiguration: '[Ne] 3s2', period: 3, group: 2 },
  { atomicNumber: 13, symbol: 'Al', name: '铝', nameEn: 'Aluminum', category: '后过渡金属', atomicMass: 26.98, electronConfiguration: '[Ne] 3s2 3p1', period: 3, group: 13 },
  { atomicNumber: 14, symbol: 'Si', name: '硅', nameEn: 'Silicon', category: '准金属', atomicMass: 28.09, electronConfiguration: '[Ne] 3s2 3p2', period: 3, group: 14 },
  { atomicNumber: 15, symbol: 'P', name: '磷', nameEn: 'Phosphorus', category: '非金属', atomicMass: 30.97, electronConfiguration: '[Ne] 3s2 3p3', period: 3, group: 15 },
  { atomicNumber: 16, symbol: 'S', name: '硫', nameEn: 'Sulfur', category: '非金属', atomicMass: 32.07, electronConfiguration: '[Ne] 3s2 3p4', period: 3, group: 16 },
  { atomicNumber: 17, symbol: 'Cl', name: '氯', nameEn: 'Chlorine', category: '卤素', atomicMass: 35.45, electronConfiguration: '[Ne] 3s2 3p5', period: 3, group: 17 },
  { atomicNumber: 18, symbol: 'Ar', name: '氩', nameEn: 'Argon', category: '稀有气体', atomicMass: 39.95, electronConfiguration: '[Ne] 3s2 3p6', period: 3, group: 18 },
  { atomicNumber: 19, symbol: 'K', name: '钾', nameEn: 'Potassium', category: '碱金属', atomicMass: 39.10, electronConfiguration: '[Ar] 4s1', period: 4, group: 1 },
  { atomicNumber: 20, symbol: 'Ca', name: '钙', nameEn: 'Calcium', category: '碱土金属', atomicMass: 40.08, electronConfiguration: '[Ar] 4s2', period: 4, group: 2 },
  { atomicNumber: 21, symbol: 'Sc', name: '钪', nameEn: 'Scandium', category: '过渡金属', atomicMass: 44.96, electronConfiguration: '[Ar] 3d1 4s2', period: 4, group: 3 },
  { atomicNumber: 22, symbol: 'Ti', name: '钛', nameEn: 'Titanium', category: '过渡金属', atomicMass: 47.87, electronConfiguration: '[Ar] 3d2 4s2', period: 4, group: 4 },
  { atomicNumber: 23, symbol: 'V', name: '钒', nameEn: 'Vanadium', category: '过渡金属', atomicMass: 50.94, electronConfiguration: '[Ar] 3d3 4s2', period: 4, group: 5 },
  { atomicNumber: 24, symbol: 'Cr', name: '铬', nameEn: 'Chromium', category: '过渡金属', atomicMass: 52.00, electronConfiguration: '[Ar] 3d5 4s1', period: 4, group: 6 },
  { atomicNumber: 25, symbol: 'Mn', name: '锰', nameEn: 'Manganese', category: '过渡金属', atomicMass: 54.94, electronConfiguration: '[Ar] 3d5 4s2', period: 4, group: 7 },
  { atomicNumber: 26, symbol: 'Fe', name: '铁', nameEn: 'Iron', category: '过渡金属', atomicMass: 55.85, electronConfiguration: '[Ar] 3d6 4s2', period: 4, group: 8 },
  { atomicNumber: 27, symbol: 'Co', name: '钴', nameEn: 'Cobalt', category: '过渡金属', atomicMass: 58.93, electronConfiguration: '[Ar] 3d7 4s2', period: 4, group: 9 },
  { atomicNumber: 28, symbol: 'Ni', name: '镍', nameEn: 'Nickel', category: '过渡金属', atomicMass: 58.69, electronConfiguration: '[Ar] 3d8 4s2', period: 4, group: 10 },
  { atomicNumber: 29, symbol: 'Cu', name: '铜', nameEn: 'Copper', category: '过渡金属', atomicMass: 63.55, electronConfiguration: '[Ar] 3d10 4s1', period: 4, group: 11 },
  { atomicNumber: 30, symbol: 'Zn', name: '锌', nameEn: 'Zinc', category: '过渡金属', atomicMass: 65.38, electronConfiguration: '[Ar] 3d10 4s2', period: 4, group: 12 },
  { atomicNumber: 31, symbol: 'Ga', name: '镓', nameEn: 'Gallium', category: '后过渡金属', atomicMass: 69.72, electronConfiguration: '[Ar] 3d10 4s2 4p1', period: 4, group: 13 },
  { atomicNumber: 32, symbol: 'Ge', name: '锗', nameEn: 'Germanium', category: '准金属', atomicMass: 72.63, electronConfiguration: '[Ar] 3d10 4s2 4p2', period: 4, group: 14 },
  { atomicNumber: 33, symbol: 'As', name: '砷', nameEn: 'Arsenic', category: '准金属', atomicMass: 74.92, electronConfiguration: '[Ar] 3d10 4s2 4p3', period: 4, group: 15 },
  { atomicNumber: 34, symbol: 'Se', name: '硒', nameEn: 'Selenium', category: '非金属', atomicMass: 78.97, electronConfiguration: '[Ar] 3d10 4s2 4p4', period: 4, group: 16 },
  { atomicNumber: 35, symbol: 'Br', name: '溴', nameEn: 'Bromine', category: '卤素', atomicMass: 79.90, electronConfiguration: '[Ar] 3d10 4s2 4p5', period: 4, group: 17 },
  { atomicNumber: 36, symbol: 'Kr', name: '氪', nameEn: 'Krypton', category: '稀有气体', atomicMass: 83.80, electronConfiguration: '[Ar] 3d10 4s2 4p6', period: 4, group: 18 },
  { atomicNumber: 37, symbol: 'Rb', name: '铷', nameEn: 'Rubidium', category: '碱金属', atomicMass: 85.47, electronConfiguration: '[Kr] 5s1', period: 5, group: 1 },
  { atomicNumber: 38, symbol: 'Sr', name: '锶', nameEn: 'Strontium', category: '碱土金属', atomicMass: 87.62, electronConfiguration: '[Kr] 5s2', period: 5, group: 2 },
  { atomicNumber: 39, symbol: 'Y', name: '钇', nameEn: 'Yttrium', category: '过渡金属', atomicMass: 88.91, electronConfiguration: '[Kr] 4d1 5s2', period: 5, group: 3 },
  { atomicNumber: 40, symbol: 'Zr', name: '锆', nameEn: 'Zirconium', category: '过渡金属', atomicMass: 91.22, electronConfiguration: '[Kr] 4d2 5s2', period: 5, group: 4 },
  { atomicNumber: 41, symbol: 'Nb', name: '铌', nameEn: 'Niobium', category: '过渡金属', atomicMass: 92.91, electronConfiguration: '[Kr] 4d4 5s1', period: 5, group: 5 },
  { atomicNumber: 42, symbol: 'Mo', name: '钼', nameEn: 'Molybdenum', category: '过渡金属', atomicMass: 95.95, electronConfiguration: '[Kr] 4d5 5s1', period: 5, group: 6 },
  { atomicNumber: 43, symbol: 'Tc', name: '锝', nameEn: 'Technetium', category: '过渡金属', atomicMass: 98.0, electronConfiguration: '[Kr] 4d5 5s2', period: 5, group: 7 },
  { atomicNumber: 44, symbol: 'Ru', name: '钌', nameEn: 'Ruthenium', category: '过渡金属', atomicMass: 101.07, electronConfiguration: '[Kr] 4d7 5s1', period: 5, group: 8 },
  { atomicNumber: 45, symbol: 'Rh', name: '铑', nameEn: 'Rhodium', category: '过渡金属', atomicMass: 102.91, electronConfiguration: '[Kr] 4d8 5s1', period: 5, group: 9 },
  { atomicNumber: 46, symbol: 'Pd', name: '钯', nameEn: 'Palladium', category: '过渡金属', atomicMass: 106.42, electronConfiguration: '[Kr] 4d10', period: 5, group: 10 },
  { atomicNumber: 47, symbol: 'Ag', name: '银', nameEn: 'Silver', category: '过渡金属', atomicMass: 107.87, electronConfiguration: '[Kr] 4d10 5s1', period: 5, group: 11 },
  { atomicNumber: 48, symbol: 'Cd', name: '镉', nameEn: 'Cadmium', category: '过渡金属', atomicMass: 112.41, electronConfiguration: '[Kr] 4d10 5s2', period: 5, group: 12 },
  { atomicNumber: 49, symbol: 'In', name: '铟', nameEn: 'Indium', category: '后过渡金属', atomicMass: 114.82, electronConfiguration: '[Kr] 4d10 5s2 5p1', period: 5, group: 13 },
  { atomicNumber: 50, symbol: 'Sn', name: '锡', nameEn: 'Tin', category: '后过渡金属', atomicMass: 118.71, electronConfiguration: '[Kr] 4d10 5s2 5p2', period: 5, group: 14 },
  { atomicNumber: 51, symbol: 'Sb', name: '锑', nameEn: 'Antimony', category: '准金属', atomicMass: 121.76, electronConfiguration: '[Kr] 4d10 5s2 5p3', period: 5, group: 15 },
  { atomicNumber: 52, symbol: 'Te', name: '碲', nameEn: 'Tellurium', category: '准金属', atomicMass: 127.60, electronConfiguration: '[Kr] 4d10 5s2 5p4', period: 5, group: 16 },
  { atomicNumber: 53, symbol: 'I', name: '碘', nameEn: 'Iodine', category: '卤素', atomicMass: 126.90, electronConfiguration: '[Kr] 4d10 5s2 5p5', period: 5, group: 17 },
  { atomicNumber: 54, symbol: 'Xe', name: '氙', nameEn: 'Xenon', category: '稀有气体', atomicMass: 131.29, electronConfiguration: '[Kr] 4d10 5s2 5p6', period: 5, group: 18 },
  { atomicNumber: 55, symbol: 'Cs', name: '铯', nameEn: 'Cesium', category: '碱金属', atomicMass: 132.91, electronConfiguration: '[Xe] 6s1', period: 6, group: 1 },
  { atomicNumber: 56, symbol: 'Ba', name: '钡', nameEn: 'Barium', category: '碱土金属', atomicMass: 137.33, electronConfiguration: '[Xe] 6s2', period: 6, group: 2 },
  { atomicNumber: 57, symbol: 'La', name: '镧', nameEn: 'Lanthanum', category: '镧系元素', atomicMass: 138.91, electronConfiguration: '[Xe] 5d1 6s2', period: 6, group: 3 },
  { atomicNumber: 58, symbol: 'Ce', name: '铈', nameEn: 'Cerium', category: '镧系元素', atomicMass: 140.12, electronConfiguration: '[Xe] 4f1 5d1 6s2', period: 6, group: 3 },
  { atomicNumber: 59, symbol: 'Pr', name: '镨', nameEn: 'Praseodymium', category: '镧系元素', atomicMass: 140.91, electronConfiguration: '[Xe] 4f3 6s2', period: 6, group: 3 },
  { atomicNumber: 60, symbol: 'Nd', name: '钕', nameEn: 'Neodymium', category: '镧系元素', atomicMass: 144.24, electronConfiguration: '[Xe] 4f4 6s2', period: 6, group: 3 },
  { atomicNumber: 61, symbol: 'Pm', name: '钷', nameEn: 'Promethium', category: '镧系元素', atomicMass: 145.0, electronConfiguration: '[Xe] 4f5 6s2', period: 6, group: 3 },
  { atomicNumber: 62, symbol: 'Sm', name: '钐', nameEn: 'Samarium', category: '镧系元素', atomicMass: 150.36, electronConfiguration: '[Xe] 4f6 6s2', period: 6, group: 3 },
  { atomicNumber: 63, symbol: 'Eu', name: '铕', nameEn: 'Europium', category: '镧系元素', atomicMass: 151.96, electronConfiguration: '[Xe] 4f7 6s2', period: 6, group: 3 },
  { atomicNumber: 64, symbol: 'Gd', name: '钆', nameEn: 'Gadolinium', category: '镧系元素', atomicMass: 157.25, electronConfiguration: '[Xe] 4f7 5d1 6s2', period: 6, group: 3 },
  { atomicNumber: 65, symbol: 'Tb', name: '铽', nameEn: 'Terbium', category: '镧系元素', atomicMass: 158.93, electronConfiguration: '[Xe] 4f9 6s2', period: 6, group: 3 },
  { atomicNumber: 66, symbol: 'Dy', name: '镝', nameEn: 'Dysprosium', category: '镧系元素', atomicMass: 162.50, electronConfiguration: '[Xe] 4f10 6s2', period: 6, group: 3 },
  { atomicNumber: 67, symbol: 'Ho', name: '钬', nameEn: 'Holmium', category: '镧系元素', atomicMass: 164.93, electronConfiguration: '[Xe] 4f11 6s2', period: 6, group: 3 },
  { atomicNumber: 68, symbol: 'Er', name: '铒', nameEn: 'Erbium', category: '镧系元素', atomicMass: 167.26, electronConfiguration: '[Xe] 4f12 6s2', period: 6, group: 3 },
  { atomicNumber: 69, symbol: 'Tm', name: '铥', nameEn: 'Thulium', category: '镧系元素', atomicMass: 168.93, electronConfiguration: '[Xe] 4f13 6s2', period: 6, group: 3 },
  { atomicNumber: 70, symbol: 'Yb', name: '镱', nameEn: 'Ytterbium', category: '镧系元素', atomicMass: 173.05, electronConfiguration: '[Xe] 4f14 6s2', period: 6, group: 3 },
  { atomicNumber: 71, symbol: 'Lu', name: '镥', nameEn: 'Lutetium', category: '镧系元素', atomicMass: 174.97, electronConfiguration: '[Xe] 4f14 5d1 6s2', period: 6, group: 3 },
  { atomicNumber: 72, symbol: 'Hf', name: '铪', nameEn: 'Hafnium', category: '过渡金属', atomicMass: 178.49, electronConfiguration: '[Xe] 4f14 5d2 6s2', period: 6, group: 4 },
  { atomicNumber: 73, symbol: 'Ta', name: '钽', nameEn: 'Tantalum', category: '过渡金属', atomicMass: 180.95, electronConfiguration: '[Xe] 4f14 5d3 6s2', period: 6, group: 5 },
  { atomicNumber: 74, symbol: 'W', name: '钨', nameEn: 'Tungsten', category: '过渡金属', atomicMass: 183.84, electronConfiguration: '[Xe] 4f14 5d4 6s2', period: 6, group: 6 },
  { atomicNumber: 75, symbol: 'Re', name: '铼', nameEn: 'Rhenium', category: '过渡金属', atomicMass: 186.21, electronConfiguration: '[Xe] 4f14 5d5 6s2', period: 6, group: 7 },
  { atomicNumber: 76, symbol: 'Os', name: '锇', nameEn: 'Osmium', category: '过渡金属', atomicMass: 190.23, electronConfiguration: '[Xe] 4f14 5d6 6s2', period: 6, group: 8 },
  { atomicNumber: 77, symbol: 'Ir', name: '铱', nameEn: 'Iridium', category: '过渡金属', atomicMass: 192.22, electronConfiguration: '[Xe] 4f14 5d7 6s2', period: 6, group: 9 },
  { atomicNumber: 78, symbol: 'Pt', name: '铂', nameEn: 'Platinum', category: '过渡金属', atomicMass: 195.08, electronConfiguration: '[Xe] 4f14 5d9 6s1', period: 6, group: 10 },
  { atomicNumber: 79, symbol: 'Au', name: '金', nameEn: 'Gold', category: '过渡金属', atomicMass: 196.97, electronConfiguration: '[Xe] 4f14 5d10 6s1', period: 6, group: 11 },
  { atomicNumber: 80, symbol: 'Hg', name: '汞', nameEn: 'Mercury', category: '过渡金属', atomicMass: 200.59, electronConfiguration: '[Xe] 4f14 5d10 6s2', period: 6, group: 12 },
  { atomicNumber: 81, symbol: 'Tl', name: '铊', nameEn: 'Thallium', category: '后过渡金属', atomicMass: 204.38, electronConfiguration: '[Xe] 4f14 5d10 6s2 6p1', period: 6, group: 13 },
  { atomicNumber: 82, symbol: 'Pb', name: '铅', nameEn: 'Lead', category: '后过渡金属', atomicMass: 207.2, electronConfiguration: '[Xe] 4f14 5d10 6s2 6p2', period: 6, group: 14 },
  { atomicNumber: 83, symbol: 'Bi', name: '铋', nameEn: 'Bismuth', category: '后过渡金属', atomicMass: 208.98, electronConfiguration: '[Xe] 4f14 5d10 6s2 6p3', period: 6, group: 15 },
  { atomicNumber: 84, symbol: 'Po', name: '钋', nameEn: 'Polonium', category: '准金属', atomicMass: 209.0, electronConfiguration: '[Xe] 4f14 5d10 6s2 6p4', period: 6, group: 16 },
  { atomicNumber: 85, symbol: 'At', name: '砹', nameEn: 'Astatine', category: '卤素', atomicMass: 210.0, electronConfiguration: '[Xe] 4f14 5d10 6s2 6p5', period: 6, group: 17 },
  { atomicNumber: 86, symbol: 'Rn', name: '氡', nameEn: 'Radon', category: '稀有气体', atomicMass: 222.0, electronConfiguration: '[Xe] 4f14 5d10 6s2 6p6', period: 6, group: 18 },
  { atomicNumber: 87, symbol: 'Fr', name: '钫', nameEn: 'Francium', category: '碱金属', atomicMass: 223.0, electronConfiguration: '[Rn] 7s1', period: 7, group: 1 },
  { atomicNumber: 88, symbol: 'Ra', name: '镭', nameEn: 'Radium', category: '碱土金属', atomicMass: 226.0, electronConfiguration: '[Rn] 7s2', period: 7, group: 2 },
  { atomicNumber: 89, symbol: 'Ac', name: '锕', nameEn: 'Actinium', category: '锕系元素', atomicMass: 227.0, electronConfiguration: '[Rn] 6d1 7s2', period: 7, group: 3 },
  { atomicNumber: 90, symbol: 'Th', name: '钍', nameEn: 'Thorium', category: '锕系元素', atomicMass: 232.04, electronConfiguration: '[Rn] 6d2 7s2', period: 7, group: 3 },
  { atomicNumber: 91, symbol: 'Pa', name: '镤', nameEn: 'Protactinium', category: '锕系元素', atomicMass: 231.04, electronConfiguration: '[Rn] 5f2 6d1 7s2', period: 7, group: 3 },
  { atomicNumber: 92, symbol: 'U', name: '铀', nameEn: 'Uranium', category: '锕系元素', atomicMass: 238.03, electronConfiguration: '[Rn] 5f3 6d1 7s2', period: 7, group: 3 },
  { atomicNumber: 93, symbol: 'Np', name: '镎', nameEn: 'Neptunium', category: '锕系元素', atomicMass: 237.0, electronConfiguration: '[Rn] 5f4 6d1 7s2', period: 7, group: 3 },
  { atomicNumber: 94, symbol: 'Pu', name: '钚', nameEn: 'Plutonium', category: '锕系元素', atomicMass: 244.0, electronConfiguration: '[Rn] 5f6 7s2', period: 7, group: 3 },
  { atomicNumber: 95, symbol: 'Am', name: '镅', nameEn: 'Americium', category: '锕系元素', atomicMass: 243.0, electronConfiguration: '[Rn] 5f7 7s2', period: 7, group: 3 },
  { atomicNumber: 96, symbol: 'Cm', name: '锔', nameEn: 'Curium', category: '锕系元素', atomicMass: 247.0, electronConfiguration: '[Rn] 5f7 6d1 7s2', period: 7, group: 3 },
  { atomicNumber: 97, symbol: 'Bk', name: '锫', nameEn: 'Berkelium', category: '锕系元素', atomicMass: 247.0, electronConfiguration: '[Rn] 5f9 7s2', period: 7, group: 3 },
  { atomicNumber: 98, symbol: 'Cf', name: '锎', nameEn: 'Californium', category: '锕系元素', atomicMass: 251.0, electronConfiguration: '[Rn] 5f10 7s2', period: 7, group: 3 },
  { atomicNumber: 99, symbol: 'Es', name: '锿', nameEn: 'Einsteinium', category: '锕系元素', atomicMass: 252.0, electronConfiguration: '[Rn] 5f11 7s2', period: 7, group: 3 },
  { atomicNumber: 100, symbol: 'Fm', name: '镄', nameEn: 'Fermium', category: '锕系元素', atomicMass: 257.0, electronConfiguration: '[Rn] 5f12 7s2', period: 7, group: 3 },
  { atomicNumber: 101, symbol: 'Md', name: '钔', nameEn: 'Mendelevium', category: '锕系元素', atomicMass: 258.0, electronConfiguration: '[Rn] 5f13 7s2', period: 7, group: 3 },
  { atomicNumber: 102, symbol: 'No', name: '锘', nameEn: 'Nobelium', category: '锕系元素', atomicMass: 259.0, electronConfiguration: '[Rn] 5f14 7s2', period: 7, group: 3 },
  { atomicNumber: 103, symbol: 'Lr', name: '铹', nameEn: 'Lawrencium', category: '锕系元素', atomicMass: 266.0, electronConfiguration: '[Rn] 5f14 7s2 7p1', period: 7, group: 3 },
  { atomicNumber: 104, symbol: 'Rf', name: '钅卢', nameEn: 'Rutherfordium', category: '过渡金属', atomicMass: 267.0, electronConfiguration: '[Rn] 5f14 6d2 7s2', period: 7, group: 4 },
  { atomicNumber: 105, symbol: 'Db', name: '钅杜', nameEn: 'Dubnium', category: '过渡金属', atomicMass: 268.0, electronConfiguration: '[Rn] 5f14 6d3 7s2', period: 7, group: 5 },
  { atomicNumber: 106, symbol: 'Sg', name: '钅喜', nameEn: 'Seaborgium', category: '过渡金属', atomicMass: 269.0, electronConfiguration: '[Rn] 5f14 6d4 7s2', period: 7, group: 6 },
  { atomicNumber: 107, symbol: 'Bh', name: '钅波', nameEn: 'Bohrium', category: '过渡金属', atomicMass: 270.0, electronConfiguration: '[Rn] 5f14 6d5 7s2', period: 7, group: 7 },
  { atomicNumber: 108, symbol: 'Hs', name: '钅黑', nameEn: 'Hassium', category: '过渡金属', atomicMass: 277.0, electronConfiguration: '[Rn] 5f14 6d6 7s2', period: 7, group: 8 },
  { atomicNumber: 109, symbol: 'Mt', name: '钅麦', nameEn: 'Meitnerium', category: '未知', atomicMass: 278.0, electronConfiguration: '[Rn] 5f14 6d7 7s2', period: 7, group: 9 },
  { atomicNumber: 110, symbol: 'Ds', name: '钅达', nameEn: 'Darmstadtium', category: '未知', atomicMass: 281.0, electronConfiguration: '[Rn] 5f14 6d8 7s2', period: 7, group: 10 },
  { atomicNumber: 111, symbol: 'Rg', name: '钅仑', nameEn: 'Roentgenium', category: '未知', atomicMass: 282.0, electronConfiguration: '[Rn] 5f14 6d9 7s2', period: 7, group: 11 },
  { atomicNumber: 112, symbol: 'Cn', name: '钅哥', nameEn: 'Copernicium', category: '过渡金属', atomicMass: 285.0, electronConfiguration: '[Rn] 5f14 6d10 7s2', period: 7, group: 12 },
  { atomicNumber: 113, symbol: 'Nh', name: '钅尔', nameEn: 'Nihonium', category: '未知', atomicMass: 286.0, electronConfiguration: '[Rn] 5f14 6d10 7s2 7p1', period: 7, group: 13 },
  { atomicNumber: 114, symbol: 'Fl', name: '钅夫', nameEn: 'Flerovium', category: '后过渡金属', atomicMass: 289.0, electronConfiguration: '[Rn] 5f14 6d10 7s2 7p2', period: 7, group: 14 },
  { atomicNumber: 115, symbol: 'Mc', name: '钅莫', nameEn: 'Moscovium', category: '未知', atomicMass: 290.0, electronConfiguration: '[Rn] 5f14 6d10 7s2 7p3', period: 7, group: 15 },
  { atomicNumber: 116, symbol: 'Lv', name: '钅立', nameEn: 'Livermorium', category: '未知', atomicMass: 293.0, electronConfiguration: '[Rn] 5f14 6d10 7s2 7p4', period: 7, group: 16 },
  { atomicNumber: 117, symbol: 'Ts', name: '钅田', nameEn: 'Tennessine', category: '未知', atomicMass: 294.0, electronConfiguration: '[Rn] 5f14 6d10 7s2 7p5', period: 7, group: 17 },
  { atomicNumber: 118, symbol: 'Og', name: '钅奥', nameEn: 'Oganesson', category: '未知', atomicMass: 294.0, electronConfiguration: '[Rn] 5f14 6d10 7s2 7p6', period: 7, group: 18 },
];

export const getElementBySymbol = (symbol: string): Element | undefined => {
  return elements.find((el) => el.symbol.toLowerCase() === symbol.toLowerCase());
};

export const getElementByAtomicNumber = (atomicNumber: number): Element | undefined => {
  return elements.find((el) => el.atomicNumber === atomicNumber);
};

export const getElementsByCategory = (category: string): Element[] => {
  return elements.filter((el) => el.category === category);
};

export const getElementsByPeriod = (period: number): Element[] => {
  return elements.filter((el) => el.period === period);
};

export const getElementsByGroup = (group: number): Element[] => {
  return elements.filter((el) => el.group === group);
};
