export type ElementCategory =
  | 'alkali-metal'
  | 'alkaline-earth-metal'
  | 'transition-metal'
  | 'post-transition-metal'
  | 'metalloid'
  | 'nonmetal'
  | 'noble-gas'
  | 'lanthanide'
  | 'actinide';

export interface ElementData {
  atomicNumber: number;
  symbol: string;
  nameCn: string;
  nameEn: string;
  atomicMass: number;
  electronConfig: string;
  meltingPoint: number | null;
  discoveryYear: number | string;
  category: ElementCategory;
  row: number;
  col: number;
}

export const CATEGORY_COLORS: Record<ElementCategory, string> = {
  'alkali-metal': '#ff6b6b',
  'alkaline-earth-metal': '#ffa94d',
  'transition-metal': '#845ef7',
  'post-transition-metal': '#339af0',
  'metalloid': '#20c997',
  'nonmetal': '#51cf66',
  'noble-gas': '#cc5de8',
  'lanthanide': '#f06595',
  'actinide': '#e03131',
};

export const CATEGORY_LABELS: Record<ElementCategory, string> = {
  'alkali-metal': '碱金属',
  'alkaline-earth-metal': '碱土金属',
  'transition-metal': '过渡金属',
  'post-transition-metal': '后过渡金属',
  'metalloid': '类金属',
  'nonmetal': '非金属',
  'noble-gas': '稀有气体',
  'lanthanide': '镧系元素',
  'actinide': '锕系元素',
};

export const isMetal = (category: ElementCategory): boolean => {
  return [
    'alkali-metal',
    'alkaline-earth-metal',
    'transition-metal',
    'post-transition-metal',
    'lanthanide',
    'actinide',
  ].includes(category);
};

export const isNonmetal = (category: ElementCategory): boolean => {
  return ['nonmetal', 'noble-gas', 'metalloid'].includes(category);
};

export const ELEMENTS: ElementData[] = [
  { atomicNumber: 1, symbol: 'H', nameCn: '氢', nameEn: 'Hydrogen', atomicMass: 1.008, electronConfig: '1s¹', meltingPoint: -259.14, discoveryYear: 1766, category: 'nonmetal', row: 1, col: 1 },
  { atomicNumber: 2, symbol: 'He', nameCn: '氦', nameEn: 'Helium', atomicMass: 4.003, electronConfig: '1s²', meltingPoint: -272.2, discoveryYear: 1868, category: 'noble-gas', row: 1, col: 18 },
  { atomicNumber: 3, symbol: 'Li', nameCn: '锂', nameEn: 'Lithium', atomicMass: 6.941, electronConfig: '[He] 2s¹', meltingPoint: 180.54, discoveryYear: 1817, category: 'alkali-metal', row: 2, col: 1 },
  { atomicNumber: 4, symbol: 'Be', nameCn: '铍', nameEn: 'Beryllium', atomicMass: 9.012, electronConfig: '[He] 2s²', meltingPoint: 1287, discoveryYear: 1798, category: 'alkaline-earth-metal', row: 2, col: 2 },
  { atomicNumber: 5, symbol: 'B', nameCn: '硼', nameEn: 'Boron', atomicMass: 10.81, electronConfig: '[He] 2s² 2p¹', meltingPoint: 2076, discoveryYear: 1808, category: 'metalloid', row: 2, col: 13 },
  { atomicNumber: 6, symbol: 'C', nameCn: '碳', nameEn: 'Carbon', atomicMass: 12.01, electronConfig: '[He] 2s² 2p²', meltingPoint: 3550, discoveryYear: '古代', category: 'nonmetal', row: 2, col: 14 },
  { atomicNumber: 7, symbol: 'N', nameCn: '氮', nameEn: 'Nitrogen', atomicMass: 14.01, electronConfig: '[He] 2s² 2p³', meltingPoint: -210.1, discoveryYear: 1772, category: 'nonmetal', row: 2, col: 15 },
  { atomicNumber: 8, symbol: 'O', nameCn: '氧', nameEn: 'Oxygen', atomicMass: 16.00, electronConfig: '[He] 2s² 2p⁴', meltingPoint: -218.79, discoveryYear: 1774, category: 'nonmetal', row: 2, col: 16 },
  { atomicNumber: 9, symbol: 'F', nameCn: '氟', nameEn: 'Fluorine', atomicMass: 19.00, electronConfig: '[He] 2s² 2p⁵', meltingPoint: -219.67, discoveryYear: 1886, category: 'nonmetal', row: 2, col: 17 },
  { atomicNumber: 10, symbol: 'Ne', nameCn: '氖', nameEn: 'Neon', atomicMass: 20.18, electronConfig: '[He] 2s² 2p⁶', meltingPoint: -248.59, discoveryYear: 1898, category: 'noble-gas', row: 2, col: 18 },
  { atomicNumber: 11, symbol: 'Na', nameCn: '钠', nameEn: 'Sodium', atomicMass: 22.99, electronConfig: '[Ne] 3s¹', meltingPoint: 97.72, discoveryYear: 1807, category: 'alkali-metal', row: 3, col: 1 },
  { atomicNumber: 12, symbol: 'Mg', nameCn: '镁', nameEn: 'Magnesium', atomicMass: 24.31, electronConfig: '[Ne] 3s²', meltingPoint: 650, discoveryYear: 1755, category: 'alkaline-earth-metal', row: 3, col: 2 },
  { atomicNumber: 13, symbol: 'Al', nameCn: '铝', nameEn: 'Aluminum', atomicMass: 26.98, electronConfig: '[Ne] 3s² 3p¹', meltingPoint: 660.32, discoveryYear: 1825, category: 'post-transition-metal', row: 3, col: 13 },
  { atomicNumber: 14, symbol: 'Si', nameCn: '硅', nameEn: 'Silicon', atomicMass: 28.09, electronConfig: '[Ne] 3s² 3p²', meltingPoint: 1414, discoveryYear: 1824, category: 'metalloid', row: 3, col: 14 },
  { atomicNumber: 15, symbol: 'P', nameCn: '磷', nameEn: 'Phosphorus', atomicMass: 30.97, electronConfig: '[Ne] 3s² 3p³', meltingPoint: 44.15, discoveryYear: 1669, category: 'nonmetal', row: 3, col: 15 },
  { atomicNumber: 16, symbol: 'S', nameCn: '硫', nameEn: 'Sulfur', atomicMass: 32.07, electronConfig: '[Ne] 3s² 3p⁴', meltingPoint: 115.21, discoveryYear: '古代', category: 'nonmetal', row: 3, col: 16 },
  { atomicNumber: 17, symbol: 'Cl', nameCn: '氯', nameEn: 'Chlorine', atomicMass: 35.45, electronConfig: '[Ne] 3s² 3p⁵', meltingPoint: -101.5, discoveryYear: 1774, category: 'nonmetal', row: 3, col: 17 },
  { atomicNumber: 18, symbol: 'Ar', nameCn: '氩', nameEn: 'Argon', atomicMass: 39.95, electronConfig: '[Ne] 3s² 3p⁶', meltingPoint: -189.35, discoveryYear: 1894, category: 'noble-gas', row: 3, col: 18 },
  { atomicNumber: 19, symbol: 'K', nameCn: '钾', nameEn: 'Potassium', atomicMass: 39.10, electronConfig: '[Ar] 4s¹', meltingPoint: 63.38, discoveryYear: 1807, category: 'alkali-metal', row: 4, col: 1 },
  { atomicNumber: 20, symbol: 'Ca', nameCn: '钙', nameEn: 'Calcium', atomicMass: 40.08, electronConfig: '[Ar] 4s²', meltingPoint: 842, discoveryYear: 1808, category: 'alkaline-earth-metal', row: 4, col: 2 },
  { atomicNumber: 21, symbol: 'Sc', nameCn: '钪', nameEn: 'Scandium', atomicMass: 44.96, electronConfig: '[Ar] 3d¹ 4s²', meltingPoint: 1541, discoveryYear: 1879, category: 'transition-metal', row: 4, col: 3 },
  { atomicNumber: 22, symbol: 'Ti', nameCn: '钛', nameEn: 'Titanium', atomicMass: 47.87, electronConfig: '[Ar] 3d² 4s²', meltingPoint: 1668, discoveryYear: 1791, category: 'transition-metal', row: 4, col: 4 },
  { atomicNumber: 23, symbol: 'V', nameCn: '钒', nameEn: 'Vanadium', atomicMass: 50.94, electronConfig: '[Ar] 3d³ 4s²', meltingPoint: 1910, discoveryYear: 1801, category: 'transition-metal', row: 4, col: 5 },
  { atomicNumber: 24, symbol: 'Cr', nameCn: '铬', nameEn: 'Chromium', atomicMass: 52.00, electronConfig: '[Ar] 3d⁵ 4s¹', meltingPoint: 1907, discoveryYear: 1797, category: 'transition-metal', row: 4, col: 6 },
  { atomicNumber: 25, symbol: 'Mn', nameCn: '锰', nameEn: 'Manganese', atomicMass: 54.94, electronConfig: '[Ar] 3d⁵ 4s²', meltingPoint: 1246, discoveryYear: 1774, category: 'transition-metal', row: 4, col: 7 },
  { atomicNumber: 26, symbol: 'Fe', nameCn: '铁', nameEn: 'Iron', atomicMass: 55.85, electronConfig: '[Ar] 3d⁶ 4s²', meltingPoint: 1538, discoveryYear: '古代', category: 'transition-metal', row: 4, col: 8 },
  { atomicNumber: 27, symbol: 'Co', nameCn: '钴', nameEn: 'Cobalt', atomicMass: 58.93, electronConfig: '[Ar] 3d⁷ 4s²', meltingPoint: 1495, discoveryYear: 1735, category: 'transition-metal', row: 4, col: 9 },
  { atomicNumber: 28, symbol: 'Ni', nameCn: '镍', nameEn: 'Nickel', atomicMass: 58.69, electronConfig: '[Ar] 3d⁸ 4s²', meltingPoint: 1455, discoveryYear: 1751, category: 'transition-metal', row: 4, col: 10 },
  { atomicNumber: 29, symbol: 'Cu', nameCn: '铜', nameEn: 'Copper', atomicMass: 63.55, electronConfig: '[Ar] 3d¹⁰ 4s¹', meltingPoint: 1084.62, discoveryYear: '古代', category: 'transition-metal', row: 4, col: 11 },
  { atomicNumber: 30, symbol: 'Zn', nameCn: '锌', nameEn: 'Zinc', atomicMass: 65.38, electronConfig: '[Ar] 3d¹⁰ 4s²', meltingPoint: 419.53, discoveryYear: '古代', category: 'transition-metal', row: 4, col: 12 },
  { atomicNumber: 31, symbol: 'Ga', nameCn: '镓', nameEn: 'Gallium', atomicMass: 69.72, electronConfig: '[Ar] 3d¹⁰ 4s² 4p¹', meltingPoint: 29.76, discoveryYear: 1875, category: 'post-transition-metal', row: 4, col: 13 },
  { atomicNumber: 32, symbol: 'Ge', nameCn: '锗', nameEn: 'Germanium', atomicMass: 72.63, electronConfig: '[Ar] 3d¹⁰ 4s² 4p²', meltingPoint: 938.25, discoveryYear: 1886, category: 'metalloid', row: 4, col: 14 },
  { atomicNumber: 33, symbol: 'As', nameCn: '砷', nameEn: 'Arsenic', atomicMass: 74.92, electronConfig: '[Ar] 3d¹⁰ 4s² 4p³', meltingPoint: 817, discoveryYear: '古代', category: 'metalloid', row: 4, col: 15 },
  { atomicNumber: 34, symbol: 'Se', nameCn: '硒', nameEn: 'Selenium', atomicMass: 78.97, electronConfig: '[Ar] 3d¹⁰ 4s² 4p⁴', meltingPoint: 221, discoveryYear: 1817, category: 'nonmetal', row: 4, col: 16 },
  { atomicNumber: 35, symbol: 'Br', nameCn: '溴', nameEn: 'Bromine', atomicMass: 79.90, electronConfig: '[Ar] 3d¹⁰ 4s² 4p⁵', meltingPoint: -7.2, discoveryYear: 1826, category: 'nonmetal', row: 4, col: 17 },
  { atomicNumber: 36, symbol: 'Kr', nameCn: '氪', nameEn: 'Krypton', atomicMass: 83.80, electronConfig: '[Ar] 3d¹⁰ 4s² 4p⁶', meltingPoint: -157.36, discoveryYear: 1898, category: 'noble-gas', row: 4, col: 18 },
  { atomicNumber: 37, symbol: 'Rb', nameCn: '铷', nameEn: 'Rubidium', atomicMass: 85.47, electronConfig: '[Kr] 5s¹', meltingPoint: 39.31, discoveryYear: 1861, category: 'alkali-metal', row: 5, col: 1 },
  { atomicNumber: 38, symbol: 'Sr', nameCn: '锶', nameEn: 'Strontium', atomicMass: 87.62, electronConfig: '[Kr] 5s²', meltingPoint: 777, discoveryYear: 1790, category: 'alkaline-earth-metal', row: 5, col: 2 },
  { atomicNumber: 39, symbol: 'Y', nameCn: '钇', nameEn: 'Yttrium', atomicMass: 88.91, electronConfig: '[Kr] 4d¹ 5s²', meltingPoint: 1526, discoveryYear: 1794, category: 'transition-metal', row: 5, col: 3 },
  { atomicNumber: 40, symbol: 'Zr', nameCn: '锆', nameEn: 'Zirconium', atomicMass: 91.22, electronConfig: '[Kr] 4d² 5s²', meltingPoint: 1855, discoveryYear: 1789, category: 'transition-metal', row: 5, col: 4 },
  { atomicNumber: 41, symbol: 'Nb', nameCn: '铌', nameEn: 'Niobium', atomicMass: 92.91, electronConfig: '[Kr] 4d⁴ 5s¹', meltingPoint: 2477, discoveryYear: 1801, category: 'transition-metal', row: 5, col: 5 },
  { atomicNumber: 42, symbol: 'Mo', nameCn: '钼', nameEn: 'Molybdenum', atomicMass: 95.95, electronConfig: '[Kr] 4d⁵ 5s¹', meltingPoint: 2623, discoveryYear: 1781, category: 'transition-metal', row: 5, col: 6 },
  { atomicNumber: 43, symbol: 'Tc', nameCn: '锝', nameEn: 'Technetium', atomicMass: 98, electronConfig: '[Kr] 4d⁵ 5s²', meltingPoint: 2157, discoveryYear: 1937, category: 'transition-metal', row: 5, col: 7 },
  { atomicNumber: 44, symbol: 'Ru', nameCn: '钌', nameEn: 'Ruthenium', atomicMass: 101.07, electronConfig: '[Kr] 4d⁷ 5s¹', meltingPoint: 2334, discoveryYear: 1844, category: 'transition-metal', row: 5, col: 8 },
  { atomicNumber: 45, symbol: 'Rh', nameCn: '铑', nameEn: 'Rhodium', atomicMass: 102.91, electronConfig: '[Kr] 4d⁸ 5s¹', meltingPoint: 1964, discoveryYear: 1803, category: 'transition-metal', row: 5, col: 9 },
  { atomicNumber: 46, symbol: 'Pd', nameCn: '钯', nameEn: 'Palladium', atomicMass: 106.42, electronConfig: '[Kr] 4d¹⁰', meltingPoint: 1554.9, discoveryYear: 1803, category: 'transition-metal', row: 5, col: 10 },
  { atomicNumber: 47, symbol: 'Ag', nameCn: '银', nameEn: 'Silver', atomicMass: 107.87, electronConfig: '[Kr] 4d¹⁰ 5s¹', meltingPoint: 961.78, discoveryYear: '古代', category: 'transition-metal', row: 5, col: 11 },
  { atomicNumber: 48, symbol: 'Cd', nameCn: '镉', nameEn: 'Cadmium', atomicMass: 112.41, electronConfig: '[Kr] 4d¹⁰ 5s²', meltingPoint: 321.07, discoveryYear: 1817, category: 'transition-metal', row: 5, col: 12 },
  { atomicNumber: 49, symbol: 'In', nameCn: '铟', nameEn: 'Indium', atomicMass: 114.82, electronConfig: '[Kr] 4d¹⁰ 5s² 5p¹', meltingPoint: 156.6, discoveryYear: 1863, category: 'post-transition-metal', row: 5, col: 13 },
  { atomicNumber: 50, symbol: 'Sn', nameCn: '锡', nameEn: 'Tin', atomicMass: 118.71, electronConfig: '[Kr] 4d¹⁰ 5s² 5p²', meltingPoint: 231.93, discoveryYear: '古代', category: 'post-transition-metal', row: 5, col: 14 },
  { atomicNumber: 51, symbol: 'Sb', nameCn: '锑', nameEn: 'Antimony', atomicMass: 121.76, electronConfig: '[Kr] 4d¹⁰ 5s² 5p³', meltingPoint: 630.63, discoveryYear: '古代', category: 'metalloid', row: 5, col: 15 },
  { atomicNumber: 52, symbol: 'Te', nameCn: '碲', nameEn: 'Tellurium', atomicMass: 127.60, electronConfig: '[Kr] 4d¹⁰ 5s² 5p⁴', meltingPoint: 449.51, discoveryYear: 1783, category: 'metalloid', row: 5, col: 16 },
  { atomicNumber: 53, symbol: 'I', nameCn: '碘', nameEn: 'Iodine', atomicMass: 126.90, electronConfig: '[Kr] 4d¹⁰ 5s² 5p⁵', meltingPoint: 113.7, discoveryYear: 1811, category: 'nonmetal', row: 5, col: 17 },
  { atomicNumber: 54, symbol: 'Xe', nameCn: '氙', nameEn: 'Xenon', atomicMass: 131.29, electronConfig: '[Kr] 4d¹⁰ 5s² 5p⁶', meltingPoint: -111.75, discoveryYear: 1898, category: 'noble-gas', row: 5, col: 18 },
  { atomicNumber: 55, symbol: 'Cs', nameCn: '铯', nameEn: 'Cesium', atomicMass: 132.91, electronConfig: '[Xe] 6s¹', meltingPoint: 28.44, discoveryYear: 1860, category: 'alkali-metal', row: 6, col: 1 },
  { atomicNumber: 56, symbol: 'Ba', nameCn: '钡', nameEn: 'Barium', atomicMass: 137.33, electronConfig: '[Xe] 6s²', meltingPoint: 727, discoveryYear: 1808, category: 'alkaline-earth-metal', row: 6, col: 2 },
  { atomicNumber: 57, symbol: 'La', nameCn: '镧', nameEn: 'Lanthanum', atomicMass: 138.91, electronConfig: '[Xe] 5d¹ 6s²', meltingPoint: 920, discoveryYear: 1839, category: 'lanthanide', row: 9, col: 3 },
  { atomicNumber: 58, symbol: 'Ce', nameCn: '铈', nameEn: 'Cerium', atomicMass: 140.12, electronConfig: '[Xe] 4f¹ 5d¹ 6s²', meltingPoint: 795, discoveryYear: 1803, category: 'lanthanide', row: 9, col: 4 },
  { atomicNumber: 59, symbol: 'Pr', nameCn: '镨', nameEn: 'Praseodymium', atomicMass: 140.91, electronConfig: '[Xe] 4f³ 6s²', meltingPoint: 935, discoveryYear: 1885, category: 'lanthanide', row: 9, col: 5 },
  { atomicNumber: 60, symbol: 'Nd', nameCn: '钕', nameEn: 'Neodymium', atomicMass: 144.24, electronConfig: '[Xe] 4f⁴ 6s²', meltingPoint: 1024, discoveryYear: 1885, category: 'lanthanide', row: 9, col: 6 },
  { atomicNumber: 61, symbol: 'Pm', nameCn: '钷', nameEn: 'Promethium', atomicMass: 145, electronConfig: '[Xe] 4f⁵ 6s²', meltingPoint: 1042, discoveryYear: 1945, category: 'lanthanide', row: 9, col: 7 },
  { atomicNumber: 62, symbol: 'Sm', nameCn: '钐', nameEn: 'Samarium', atomicMass: 150.36, electronConfig: '[Xe] 4f⁶ 6s²', meltingPoint: 1072, discoveryYear: 1879, category: 'lanthanide', row: 9, col: 8 },
  { atomicNumber: 63, symbol: 'Eu', nameCn: '铕', nameEn: 'Europium', atomicMass: 151.96, electronConfig: '[Xe] 4f⁷ 6s²', meltingPoint: 826, discoveryYear: 1901, category: 'lanthanide', row: 9, col: 9 },
  { atomicNumber: 64, symbol: 'Gd', nameCn: '钆', nameEn: 'Gadolinium', atomicMass: 157.25, electronConfig: '[Xe] 4f⁷ 5d¹ 6s²', meltingPoint: 1313, discoveryYear: 1880, category: 'lanthanide', row: 9, col: 10 },
  { atomicNumber: 65, symbol: 'Tb', nameCn: '铽', nameEn: 'Terbium', atomicMass: 158.93, electronConfig: '[Xe] 4f⁹ 6s²', meltingPoint: 1356, discoveryYear: 1843, category: 'lanthanide', row: 9, col: 11 },
  { atomicNumber: 66, symbol: 'Dy', nameCn: '镝', nameEn: 'Dysprosium', atomicMass: 162.50, electronConfig: '[Xe] 4f¹⁰ 6s²', meltingPoint: 1407, discoveryYear: 1886, category: 'lanthanide', row: 9, col: 12 },
  { atomicNumber: 67, symbol: 'Ho', nameCn: '钬', nameEn: 'Holmium', atomicMass: 164.93, electronConfig: '[Xe] 4f¹¹ 6s²', meltingPoint: 1461, discoveryYear: 1878, category: 'lanthanide', row: 9, col: 13 },
  { atomicNumber: 68, symbol: 'Er', nameCn: '铒', nameEn: 'Erbium', atomicMass: 167.26, electronConfig: '[Xe] 4f¹² 6s²', meltingPoint: 1529, discoveryYear: 1843, category: 'lanthanide', row: 9, col: 14 },
  { atomicNumber: 69, symbol: 'Tm', nameCn: '铥', nameEn: 'Thulium', atomicMass: 168.93, electronConfig: '[Xe] 4f¹³ 6s²', meltingPoint: 1545, discoveryYear: 1879, category: 'lanthanide', row: 9, col: 15 },
  { atomicNumber: 70, symbol: 'Yb', nameCn: '镱', nameEn: 'Ytterbium', atomicMass: 173.05, electronConfig: '[Xe] 4f¹⁴ 6s²', meltingPoint: 824, discoveryYear: 1878, category: 'lanthanide', row: 9, col: 16 },
  { atomicNumber: 71, symbol: 'Lu', nameCn: '镥', nameEn: 'Lutetium', atomicMass: 174.97, electronConfig: '[Xe] 4f¹⁴ 5d¹ 6s²', meltingPoint: 1652, discoveryYear: 1907, category: 'lanthanide', row: 9, col: 17 },
  { atomicNumber: 72, symbol: 'Hf', nameCn: '铪', nameEn: 'Hafnium', atomicMass: 178.49, electronConfig: '[Xe] 4f¹⁴ 5d² 6s²', meltingPoint: 2233, discoveryYear: 1923, category: 'transition-metal', row: 6, col: 4 },
  { atomicNumber: 73, symbol: 'Ta', nameCn: '钽', nameEn: 'Tantalum', atomicMass: 180.95, electronConfig: '[Xe] 4f¹⁴ 5d³ 6s²', meltingPoint: 3017, discoveryYear: 1802, category: 'transition-metal', row: 6, col: 5 },
  { atomicNumber: 74, symbol: 'W', nameCn: '钨', nameEn: 'Tungsten', atomicMass: 183.84, electronConfig: '[Xe] 4f¹⁴ 5d⁴ 6s²', meltingPoint: 3422, discoveryYear: 1783, category: 'transition-metal', row: 6, col: 6 },
  { atomicNumber: 75, symbol: 'Re', nameCn: '铼', nameEn: 'Rhenium', atomicMass: 186.21, electronConfig: '[Xe] 4f¹⁴ 5d⁵ 6s²', meltingPoint: 3186, discoveryYear: 1925, category: 'transition-metal', row: 6, col: 7 },
  { atomicNumber: 76, symbol: 'Os', nameCn: '锇', nameEn: 'Osmium', atomicMass: 190.23, electronConfig: '[Xe] 4f¹⁴ 5d⁶ 6s²', meltingPoint: 3033, discoveryYear: 1803, category: 'transition-metal', row: 6, col: 8 },
  { atomicNumber: 77, symbol: 'Ir', nameCn: '铱', nameEn: 'Iridium', atomicMass: 192.22, electronConfig: '[Xe] 4f¹⁴ 5d⁷ 6s²', meltingPoint: 2466, discoveryYear: 1803, category: 'transition-metal', row: 6, col: 9 },
  { atomicNumber: 78, symbol: 'Pt', nameCn: '铂', nameEn: 'Platinum', atomicMass: 195.08, electronConfig: '[Xe] 4f¹⁴ 5d⁹ 6s¹', meltingPoint: 1768.3, discoveryYear: 1735, category: 'transition-metal', row: 6, col: 10 },
  { atomicNumber: 79, symbol: 'Au', nameCn: '金', nameEn: 'Gold', atomicMass: 196.97, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s¹', meltingPoint: 1064.18, discoveryYear: '古代', category: 'transition-metal', row: 6, col: 11 },
  { atomicNumber: 80, symbol: 'Hg', nameCn: '汞', nameEn: 'Mercury', atomicMass: 200.59, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s²', meltingPoint: -38.83, discoveryYear: '古代', category: 'transition-metal', row: 6, col: 12 },
  { atomicNumber: 81, symbol: 'Tl', nameCn: '铊', nameEn: 'Thallium', atomicMass: 204.38, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p¹', meltingPoint: 304, discoveryYear: 1861, category: 'post-transition-metal', row: 6, col: 13 },
  { atomicNumber: 82, symbol: 'Pb', nameCn: '铅', nameEn: 'Lead', atomicMass: 207.2, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²', meltingPoint: 327.46, discoveryYear: '古代', category: 'post-transition-metal', row: 6, col: 14 },
  { atomicNumber: 83, symbol: 'Bi', nameCn: '铋', nameEn: 'Bismuth', atomicMass: 208.98, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p³', meltingPoint: 271.4, discoveryYear: '古代', category: 'post-transition-metal', row: 6, col: 15 },
  { atomicNumber: 84, symbol: 'Po', nameCn: '钋', nameEn: 'Polonium', atomicMass: 209, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁴', meltingPoint: 254, discoveryYear: 1898, category: 'post-transition-metal', row: 6, col: 16 },
  { atomicNumber: 85, symbol: 'At', nameCn: '砹', nameEn: 'Astatine', atomicMass: 210, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁵', meltingPoint: 302, discoveryYear: 1940, category: 'metalloid', row: 6, col: 17 },
  { atomicNumber: 86, symbol: 'Rn', nameCn: '氡', nameEn: 'Radon', atomicMass: 222, electronConfig: '[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p⁶', meltingPoint: -71, discoveryYear: 1900, category: 'noble-gas', row: 6, col: 18 },
  { atomicNumber: 87, symbol: 'Fr', nameCn: '钫', nameEn: 'Francium', atomicMass: 223, electronConfig: '[Rn] 7s¹', meltingPoint: 27, discoveryYear: 1939, category: 'alkali-metal', row: 7, col: 1 },
  { atomicNumber: 88, symbol: 'Ra', nameCn: '镭', nameEn: 'Radium', atomicMass: 226, electronConfig: '[Rn] 7s²', meltingPoint: 700, discoveryYear: 1898, category: 'alkaline-earth-metal', row: 7, col: 2 },
  { atomicNumber: 89, symbol: 'Ac', nameCn: '锕', nameEn: 'Actinium', atomicMass: 227, electronConfig: '[Rn] 6d¹ 7s²', meltingPoint: 1050, discoveryYear: 1899, category: 'actinide', row: 10, col: 3 },
  { atomicNumber: 90, symbol: 'Th', nameCn: '钍', nameEn: 'Thorium', atomicMass: 232.04, electronConfig: '[Rn] 6d² 7s²', meltingPoint: 1750, discoveryYear: 1829, category: 'actinide', row: 10, col: 4 },
  { atomicNumber: 91, symbol: 'Pa', nameCn: '镤', nameEn: 'Protactinium', atomicMass: 231.04, electronConfig: '[Rn] 5f² 6d¹ 7s²', meltingPoint: 1572, discoveryYear: 1913, category: 'actinide', row: 10, col: 5 },
  { atomicNumber: 92, symbol: 'U', nameCn: '铀', nameEn: 'Uranium', atomicMass: 238.03, electronConfig: '[Rn] 5f³ 6d¹ 7s²', meltingPoint: 1132, discoveryYear: 1789, category: 'actinide', row: 10, col: 6 },
  { atomicNumber: 93, symbol: 'Np', nameCn: '镎', nameEn: 'Neptunium', atomicMass: 237, electronConfig: '[Rn] 5f⁴ 6d¹ 7s²', meltingPoint: 644, discoveryYear: 1940, category: 'actinide', row: 10, col: 7 },
  { atomicNumber: 94, symbol: 'Pu', nameCn: '钚', nameEn: 'Plutonium', atomicMass: 244, electronConfig: '[Rn] 5f⁶ 7s²', meltingPoint: 640, discoveryYear: 1940, category: 'actinide', row: 10, col: 8 },
  { atomicNumber: 95, symbol: 'Am', nameCn: '镅', nameEn: 'Americium', atomicMass: 243, electronConfig: '[Rn] 5f⁷ 7s²', meltingPoint: 1176, discoveryYear: 1944, category: 'actinide', row: 10, col: 9 },
  { atomicNumber: 96, symbol: 'Cm', nameCn: '锔', nameEn: 'Curium', atomicMass: 247, electronConfig: '[Rn] 5f⁷ 6d¹ 7s²', meltingPoint: 1340, discoveryYear: 1944, category: 'actinide', row: 10, col: 10 },
  { atomicNumber: 97, symbol: 'Bk', nameCn: '锫', nameEn: 'Berkelium', atomicMass: 247, electronConfig: '[Rn] 5f⁹ 7s²', meltingPoint: 986, discoveryYear: 1949, category: 'actinide', row: 10, col: 11 },
  { atomicNumber: 98, symbol: 'Cf', nameCn: '锎', nameEn: 'Californium', atomicMass: 251, electronConfig: '[Rn] 5f¹⁰ 7s²', meltingPoint: 900, discoveryYear: 1950, category: 'actinide', row: 10, col: 12 },
  { atomicNumber: 99, symbol: 'Es', nameCn: '锿', nameEn: 'Einsteinium', atomicMass: 252, electronConfig: '[Rn] 5f¹¹ 7s²', meltingPoint: 860, discoveryYear: 1952, category: 'actinide', row: 10, col: 13 },
  { atomicNumber: 100, symbol: 'Fm', nameCn: '镄', nameEn: 'Fermium', atomicMass: 257, electronConfig: '[Rn] 5f¹² 7s²', meltingPoint: 1527, discoveryYear: 1952, category: 'actinide', row: 10, col: 14 },
  { atomicNumber: 101, symbol: 'Md', nameCn: '钔', nameEn: 'Mendelevium', atomicMass: 258, electronConfig: '[Rn] 5f¹³ 7s²', meltingPoint: 827, discoveryYear: 1955, category: 'actinide', row: 10, col: 15 },
  { atomicNumber: 102, symbol: 'No', nameCn: '锘', nameEn: 'Nobelium', atomicMass: 259, electronConfig: '[Rn] 5f¹⁴ 7s²', meltingPoint: 827, discoveryYear: 1966, category: 'actinide', row: 10, col: 16 },
  { atomicNumber: 103, symbol: 'Lr', nameCn: '铹', nameEn: 'Lawrencium', atomicMass: 266, electronConfig: '[Rn] 5f¹⁴ 7s² 7p¹', meltingPoint: 1627, discoveryYear: 1961, category: 'actinide', row: 10, col: 17 },
  { atomicNumber: 104, symbol: 'Rf', nameCn: '𬬻', nameEn: 'Rutherfordium', atomicMass: 267, electronConfig: '[Rn] 5f¹⁴ 6d² 7s²', meltingPoint: null, discoveryYear: 1969, category: 'transition-metal', row: 7, col: 4 },
  { atomicNumber: 105, symbol: 'Db', nameCn: '𬭊', nameEn: 'Dubnium', atomicMass: 268, electronConfig: '[Rn] 5f¹⁴ 6d³ 7s²', meltingPoint: null, discoveryYear: 1970, category: 'transition-metal', row: 7, col: 5 },
  { atomicNumber: 106, symbol: 'Sg', nameCn: '𬭳', nameEn: 'Seaborgium', atomicMass: 269, electronConfig: '[Rn] 5f¹⁴ 6d⁴ 7s²', meltingPoint: null, discoveryYear: 1974, category: 'transition-metal', row: 7, col: 6 },
  { atomicNumber: 107, symbol: 'Bh', nameCn: '𬭛', nameEn: 'Bohrium', atomicMass: 270, electronConfig: '[Rn] 5f¹⁴ 6d⁵ 7s²', meltingPoint: null, discoveryYear: 1981, category: 'transition-metal', row: 7, col: 7 },
  { atomicNumber: 108, symbol: 'Hs', nameCn: '𬭶', nameEn: 'Hassium', atomicMass: 277, electronConfig: '[Rn] 5f¹⁴ 6d⁶ 7s²', meltingPoint: null, discoveryYear: 1984, category: 'transition-metal', row: 7, col: 8 },
  { atomicNumber: 109, symbol: 'Mt', nameCn: '鿏', nameEn: 'Meitnerium', atomicMass: 278, electronConfig: '[Rn] 5f¹⁴ 6d⁷ 7s²', meltingPoint: null, discoveryYear: 1982, category: 'transition-metal', row: 7, col: 9 },
  { atomicNumber: 110, symbol: 'Ds', nameCn: '𫟼', nameEn: 'Darmstadtium', atomicMass: 281, electronConfig: '[Rn] 5f¹⁴ 6d⁸ 7s²', meltingPoint: null, discoveryYear: 1994, category: 'transition-metal', row: 7, col: 10 },
  { atomicNumber: 111, symbol: 'Rg', nameCn: '𬬭', nameEn: 'Roentgenium', atomicMass: 282, electronConfig: '[Rn] 5f¹⁴ 6d⁹ 7s²', meltingPoint: null, discoveryYear: 1994, category: 'transition-metal', row: 7, col: 11 },
  { atomicNumber: 112, symbol: 'Cn', nameCn: '鎶', nameEn: 'Copernicium', atomicMass: 285, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s²', meltingPoint: null, discoveryYear: 1996, category: 'transition-metal', row: 7, col: 12 },
  { atomicNumber: 113, symbol: 'Nh', nameCn: '鿭', nameEn: 'Nihonium', atomicMass: 286, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p¹', meltingPoint: null, discoveryYear: 2004, category: 'post-transition-metal', row: 7, col: 13 },
  { atomicNumber: 114, symbol: 'Fl', nameCn: '𫓧', nameEn: 'Flerovium', atomicMass: 289, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p²', meltingPoint: null, discoveryYear: 1999, category: 'post-transition-metal', row: 7, col: 14 },
  { atomicNumber: 115, symbol: 'Mc', nameCn: '镆', nameEn: 'Moscovium', atomicMass: 290, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p³', meltingPoint: null, discoveryYear: 2003, category: 'post-transition-metal', row: 7, col: 15 },
  { atomicNumber: 116, symbol: 'Lv', nameCn: '𫟷', nameEn: 'Livermorium', atomicMass: 293, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁴', meltingPoint: null, discoveryYear: 2000, category: 'post-transition-metal', row: 7, col: 16 },
  { atomicNumber: 117, symbol: 'Ts', nameCn: '鿬', nameEn: 'Tennessine', atomicMass: 294, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁵', meltingPoint: null, discoveryYear: 2010, category: 'nonmetal', row: 7, col: 17 },
  { atomicNumber: 118, symbol: 'Og', nameCn: '鿫', nameEn: 'Oganesson', atomicMass: 294, electronConfig: '[Rn] 5f¹⁴ 6d¹⁰ 7s² 7p⁶', meltingPoint: null, discoveryYear: 2002, category: 'noble-gas', row: 7, col: 18 },
];
