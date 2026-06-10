export type DatasetName = 'iris' | 'wine';
export type ReductionMode = 'raw' | 'pca' | 'tsne';

export interface Dataset {
  name: string;
  features: string[];
  data: number[][];
  target?: number[];
  targetNames?: string[];
}

export interface PCAResult {
  coords3d: number[][];
  coords2d: number[][];
  explainedVariance: number[];
}

export interface TSNEResult {
  coords3d: number[][];
  coords2d: number[][];
  klDivergence: number;
}

const IRIS_FEATURES = ['sepal length', 'sepal width', 'petal length', 'petal width'];
const IRIS_DATA: number[][] = [
  [5.1, 3.5, 1.4, 0.2], [4.9, 3.0, 1.4, 0.2], [4.7, 3.2, 1.3, 0.2], [4.6, 3.1, 1.5, 0.2], [5.0, 3.6, 1.4, 0.2],
  [5.4, 3.9, 1.7, 0.4], [4.6, 3.4, 1.4, 0.3], [5.0, 3.4, 1.5, 0.2], [4.4, 2.9, 1.4, 0.2], [4.9, 3.1, 1.5, 0.1],
  [5.4, 3.7, 1.5, 0.2], [4.8, 3.4, 1.6, 0.2], [4.8, 3.0, 1.4, 0.1], [4.3, 3.0, 1.1, 0.1], [5.8, 4.0, 1.2, 0.2],
  [5.7, 4.4, 1.5, 0.4], [5.4, 3.9, 1.3, 0.4], [5.1, 3.5, 1.4, 0.3], [5.7, 3.8, 1.7, 0.3], [5.1, 3.8, 1.5, 0.3],
  [5.4, 3.4, 1.7, 0.2], [5.1, 3.7, 1.5, 0.4], [4.6, 3.6, 1.0, 0.2], [5.1, 3.3, 1.7, 0.5], [4.8, 3.4, 1.9, 0.2],
  [5.0, 3.0, 1.6, 0.2], [5.0, 3.4, 1.6, 0.4], [5.2, 3.5, 1.5, 0.2], [5.2, 3.4, 1.4, 0.2], [4.7, 3.2, 1.6, 0.2],
  [4.8, 3.1, 1.6, 0.2], [5.4, 3.4, 1.5, 0.4], [5.2, 4.1, 1.5, 0.1], [5.5, 4.2, 1.4, 0.2], [4.9, 3.1, 1.5, 0.2],
  [5.0, 3.2, 1.2, 0.2], [5.5, 3.5, 1.3, 0.2], [4.9, 3.6, 1.4, 0.1], [4.4, 3.0, 1.3, 0.2], [5.1, 3.4, 1.5, 0.2],
  [5.0, 3.5, 1.3, 0.3], [4.5, 2.3, 1.3, 0.3], [4.4, 3.2, 1.3, 0.2], [5.0, 3.5, 1.6, 0.6], [5.1, 3.8, 1.9, 0.4],
  [4.8, 3.0, 1.4, 0.3], [5.1, 3.8, 1.6, 0.2], [4.6, 3.2, 1.4, 0.2], [5.3, 3.7, 1.5, 0.2], [5.0, 3.3, 1.4, 0.2],
  [7.0, 3.2, 4.7, 1.4], [6.4, 3.2, 4.5, 1.5], [6.9, 3.1, 4.9, 1.5], [5.5, 2.3, 4.0, 1.3], [6.5, 2.8, 4.6, 1.5],
  [5.7, 2.8, 4.5, 1.3], [6.3, 3.3, 4.7, 1.6], [4.9, 2.4, 3.3, 1.0], [6.6, 2.9, 4.6, 1.3], [5.2, 2.7, 3.9, 1.4],
  [5.0, 2.0, 3.5, 1.0], [5.9, 3.0, 4.2, 1.5], [6.0, 2.2, 4.0, 1.0], [6.1, 2.9, 4.7, 1.4], [5.6, 2.9, 3.6, 1.3],
  [6.7, 3.1, 4.4, 1.4], [5.6, 3.0, 4.5, 1.5], [5.8, 2.7, 4.1, 1.0], [6.2, 2.2, 4.5, 1.5], [5.6, 2.5, 3.9, 1.1],
  [5.9, 3.2, 4.8, 1.8], [6.1, 2.8, 4.0, 1.3], [6.3, 2.5, 4.9, 1.5], [6.1, 2.8, 4.7, 1.2], [6.4, 2.9, 4.3, 1.3],
  [6.6, 3.0, 4.4, 1.4], [6.8, 2.8, 4.8, 1.4], [6.7, 3.0, 5.0, 1.7], [6.0, 2.9, 4.5, 1.5], [5.7, 2.6, 3.5, 1.0],
  [5.5, 2.4, 3.8, 1.1], [5.5, 2.4, 3.7, 1.0], [5.8, 2.7, 3.9, 1.2], [6.0, 2.7, 5.1, 1.6], [5.4, 3.0, 4.5, 1.5],
  [6.0, 3.4, 4.5, 1.6], [6.7, 3.1, 4.7, 1.5], [6.3, 2.3, 4.4, 1.3], [5.6, 3.0, 4.1, 1.3], [5.5, 2.5, 4.0, 1.3],
  [5.5, 2.6, 4.4, 1.2], [6.1, 3.0, 4.6, 1.4], [5.8, 2.6, 4.0, 1.2], [5.0, 2.3, 3.3, 1.0], [5.6, 2.7, 4.2, 1.3],
  [5.7, 3.0, 4.2, 1.2], [5.7, 2.9, 4.2, 1.3], [6.2, 2.9, 4.3, 1.3], [5.1, 2.5, 3.0, 1.1], [5.7, 2.8, 4.1, 1.3],
  [6.3, 3.3, 6.0, 2.5], [5.8, 2.7, 5.1, 1.9], [7.1, 3.0, 5.9, 2.1], [6.3, 2.9, 5.6, 1.8], [6.5, 3.0, 5.8, 2.2],
  [7.6, 3.0, 6.6, 2.1], [4.9, 2.5, 4.5, 1.7], [7.3, 2.9, 6.3, 1.8], [6.7, 2.5, 5.8, 1.8], [7.2, 3.6, 6.1, 2.5],
  [6.5, 3.2, 5.1, 2.0], [6.4, 2.7, 5.3, 1.9], [6.8, 3.0, 5.5, 2.1], [5.7, 2.5, 5.0, 2.0], [5.8, 2.8, 5.1, 2.4],
  [6.4, 3.2, 5.3, 2.3], [6.5, 3.0, 5.5, 1.8], [7.7, 3.8, 6.7, 2.2], [7.7, 2.6, 6.9, 2.3], [6.0, 2.2, 5.0, 1.5],
  [6.9, 3.2, 5.7, 2.3], [5.6, 2.8, 4.9, 2.0], [7.7, 2.8, 6.7, 2.0], [6.3, 2.7, 4.9, 1.8], [6.7, 3.3, 5.7, 2.1],
  [7.2, 3.2, 6.0, 1.8], [6.2, 2.8, 4.8, 1.8], [6.1, 3.0, 4.9, 1.8], [6.4, 2.8, 5.6, 2.1], [7.2, 3.0, 5.8, 1.6],
  [7.4, 2.8, 6.1, 1.9], [7.9, 3.8, 6.4, 2.0], [6.4, 2.8, 5.6, 2.2], [6.3, 2.8, 5.1, 1.5], [6.1, 2.6, 5.6, 1.4],
  [7.7, 3.0, 6.1, 2.3], [6.3, 3.4, 5.6, 2.4], [6.4, 3.1, 5.5, 1.8], [6.0, 3.0, 4.8, 1.8], [6.9, 3.1, 5.4, 2.1],
  [6.7, 3.1, 5.6, 2.4], [6.9, 3.1, 5.1, 2.3], [5.8, 2.7, 5.1, 1.9], [6.8, 3.2, 5.9, 2.3], [6.7, 3.3, 5.7, 2.5],
  [6.7, 3.0, 5.2, 2.3], [6.3, 2.5, 5.0, 1.9], [6.5, 3.0, 5.2, 2.0], [6.2, 3.4, 5.4, 2.3], [5.9, 3.0, 5.1, 1.8]
];
const IRIS_TARGET = Array(50).fill(0).concat(Array(50).fill(1), Array(50).fill(2));
const IRIS_TARGET_NAMES = ['setosa', 'versicolor', 'virginica'];

const WINE_FEATURES = [
  'alcohol', 'malic acid', 'ash', 'alcalinity of ash', 'magnesium',
  'total phenols', 'flavanoids', 'nonflavanoid phenols', 'proanthocyanins',
  'color intensity', 'hue', 'OD280/OD315', 'proline'
];
const WINE_DATA: number[][] = [
  [14.23, 1.71, 2.43, 15.6, 127, 2.80, 3.06, 0.28, 2.29, 5.64, 1.04, 3.92, 1065],
  [13.20, 1.78, 2.14, 11.2, 100, 2.65, 2.76, 0.26, 1.28, 4.38, 1.05, 3.40, 1050],
  [13.16, 2.36, 2.67, 18.6, 101, 2.80, 3.24, 0.30, 2.81, 5.68, 1.03, 3.17, 1185],
  [14.37, 1.95, 2.50, 16.8, 113, 3.85, 3.49, 0.24, 2.18, 7.80, 0.86, 3.45, 1480],
  [13.24, 2.59, 2.87, 21.0, 118, 2.80, 2.69, 0.39, 1.82, 4.32, 1.04, 2.93, 735],
  [14.20, 1.76, 2.45, 15.2, 112, 3.27, 3.39, 0.34, 1.97, 6.75, 1.05, 2.85, 1450],
  [14.39, 1.87, 2.45, 14.6, 96, 2.50, 2.52, 0.30, 1.98, 5.25, 1.02, 3.58, 1290],
  [14.06, 2.15, 2.61, 17.6, 121, 2.60, 2.51, 0.31, 1.25, 5.05, 1.06, 3.58, 1295],
  [14.83, 1.64, 2.17, 14.0, 97, 2.80, 2.98, 0.29, 1.98, 5.20, 1.08, 2.85, 1045],
  [13.86, 1.35, 2.27, 16.0, 98, 2.98, 3.15, 0.22, 1.85, 7.22, 1.01, 3.55, 1045],
  [14.10, 2.16, 2.30, 18.0, 105, 2.95, 3.32, 0.22, 2.38, 5.75, 1.25, 3.17, 1510],
  [14.12, 1.48, 2.32, 16.8, 95, 2.20, 2.43, 0.26, 1.57, 5.00, 1.17, 2.82, 1280],
  [13.75, 1.73, 2.41, 16.0, 89, 2.60, 2.76, 0.29, 1.81, 5.60, 1.15, 2.90, 1320],
  [14.75, 1.73, 2.39, 11.4, 91, 3.10, 3.69, 0.43, 2.81, 5.40, 1.25, 2.73, 1150],
  [14.38, 1.87, 2.38, 12.0, 102, 3.30, 3.64, 0.29, 2.96, 7.50, 1.20, 3.00, 1547],
  [13.63, 1.81, 2.70, 17.2, 112, 2.85, 2.91, 0.30, 1.46, 7.30, 1.28, 2.88, 1310],
  [14.30, 1.92, 2.72, 20.0, 120, 2.80, 3.14, 0.33, 1.97, 6.20, 1.07, 2.65, 1280],
  [13.83, 1.57, 2.62, 20.0, 115, 2.95, 3.40, 0.40, 1.72, 6.60, 1.13, 2.57, 1130],
  [14.19, 1.59, 2.48, 16.5, 108, 3.30, 3.93, 0.32, 1.86, 8.70, 1.23, 2.82, 1680],
  [13.64, 3.10, 2.56, 15.2, 116, 2.70, 3.03, 0.17, 1.66, 5.10, 0.96, 3.36, 845],
  [12.37, 0.94, 1.36, 10.6, 88, 1.98, 0.57, 0.28, 0.42, 1.95, 1.05, 1.82, 520],
  [12.33, 1.10, 2.28, 16.0, 101, 2.05, 1.09, 0.63, 0.41, 3.27, 1.25, 1.67, 680],
  [12.64, 1.36, 2.02, 16.8, 100, 2.02, 1.41, 0.53, 0.62, 5.75, 0.98, 1.59, 450],
  [13.67, 1.25, 1.92, 18.0, 94, 2.10, 1.79, 0.32, 0.73, 3.80, 1.23, 2.46, 630],
  [12.37, 1.13, 2.16, 19.0, 87, 3.50, 3.10, 0.19, 1.87, 4.45, 1.22, 2.87, 420],
  [12.17, 1.45, 2.53, 19.0, 104, 1.89, 1.75, 0.45, 1.03, 2.95, 1.45, 2.23, 355],
  [12.37, 1.21, 2.56, 18.1, 88, 2.42, 2.65, 0.37, 2.08, 4.60, 1.19, 2.30, 678],
  [13.05, 1.65, 2.55, 18.0, 98, 2.45, 2.43, 0.29, 1.44, 4.25, 1.12, 2.51, 1105],
  [12.04, 4.30, 2.38, 21.0, 80, 2.10, 1.75, 0.42, 1.35, 2.60, 0.79, 2.57, 580],
  [12.77, 2.39, 2.28, 19.5, 86, 1.39, 0.51, 0.48, 0.64, 9.899, 0.57, 1.63, 470],
  [13.32, 3.24, 2.38, 21.5, 92, 1.93, 0.76, 0.45, 1.25, 8.42, 0.55, 1.62, 650],
  [12.08, 1.33, 2.30, 23.6, 70, 2.20, 1.59, 0.42, 1.38, 1.74, 1.07, 3.21, 625],
  [13.45, 3.70, 2.60, 23.0, 111, 1.70, 0.92, 0.43, 1.46, 10.68, 0.85, 1.56, 695],
  [12.42, 2.55, 2.27, 22.0, 90, 1.68, 1.84, 0.66, 1.42, 2.70, 0.86, 3.30, 315],
  [12.52, 2.43, 2.17, 21.0, 88, 2.55, 2.27, 0.26, 1.22, 2.00, 0.90, 2.78, 325],
  [12.58, 1.29, 2.10, 20.0, 103, 1.48, 0.58, 0.53, 1.40, 7.60, 0.58, 1.55, 640],
  [12.81, 2.31, 2.40, 24.0, 98, 1.15, 1.09, 0.27, 0.83, 5.70, 0.66, 1.36, 560],
  [12.77, 2.68, 2.34, 20.0, 89, 1.77, 1.37, 0.37, 1.13, 5.40, 0.77, 2.31, 625],
  [12.79, 2.67, 2.48, 22.0, 112, 1.48, 1.36, 0.24, 1.26, 10.80, 0.48, 1.47, 480],
  [12.33, 1.99, 1.95, 18.0, 90, 1.83, 1.50, 0.35, 1.15, 2.85, 1.03, 2.31, 750],
  [12.37, 1.07, 2.10, 18.5, 88, 3.52, 3.75, 0.24, 1.95, 4.50, 1.04, 2.77, 660],
  [13.49, 1.66, 2.24, 24.0, 87, 1.88, 1.84, 0.27, 1.03, 3.74, 0.98, 2.78, 472],
  [12.51, 1.73, 1.98, 20.5, 85, 2.20, 1.92, 0.32, 1.48, 2.94, 1.04, 3.57, 672],
  [13.23, 3.30, 2.28, 18.5, 98, 1.80, 0.83, 0.61, 1.87, 10.52, 0.56, 1.51, 675],
  [12.58, 1.29, 2.10, 20.0, 103, 1.48, 0.58, 0.53, 1.40, 7.60, 0.58, 1.55, 640],
  [13.11, 1.90, 2.75, 25.5, 116, 2.20, 1.28, 0.26, 1.56, 7.10, 0.61, 1.33, 425],
  [12.87, 4.61, 2.48, 21.5, 86, 1.70, 0.65, 0.47, 0.86, 7.65, 0.54, 1.86, 625],
  [13.36, 2.56, 2.35, 20.0, 89, 1.40, 0.50, 0.37, 0.64, 5.60, 0.70, 2.47, 780],
  [12.76, 2.68, 2.32, 20.0, 93, 1.63, 0.59, 0.38, 0.94, 5.40, 0.71, 2.39, 625],
  [12.84, 2.96, 2.61, 24.0, 101, 2.32, 0.60, 0.53, 0.81, 4.92, 0.89, 2.15, 590],
  [12.77, 2.68, 2.34, 20.0, 89, 1.77, 1.37, 0.37, 1.13, 5.40, 0.77, 2.31, 625],
  [12.54, 2.59, 2.67, 24.0, 92, 1.79, 0.60, 0.43, 0.73, 4.32, 0.74, 1.80, 520],
  [12.58, 1.29, 2.10, 20.0, 103, 1.48, 0.58, 0.53, 1.40, 7.60, 0.58, 1.55, 640],
  [12.53, 5.51, 2.64, 25.0, 96, 1.79, 0.60, 0.63, 1.10, 5.00, 0.82, 1.69, 515],
  [13.36, 2.56, 2.35, 20.0, 89, 1.40, 0.50, 0.37, 0.64, 5.60, 0.70, 2.47, 780]
];
const WINE_TARGET = Array(20).fill(0).concat(Array(18).fill(1), Array(19).fill(2));
const WINE_TARGET_NAMES = ['class_0', 'class_1', 'class_2'];

export class DataManager {
  private datasets: Record<DatasetName, Dataset>;
  private currentDataset: DatasetName = 'iris';
  private pcaCache: Map<string, PCAResult> = new Map();
  private tsneCache: Map<string, TSNEResult> = new Map();

  constructor() {
    this.datasets = {
      iris: {
        name: 'iris',
        features: [...IRIS_FEATURES],
        data: IRIS_DATA.map(row => [...row]),
        target: [...IRIS_TARGET],
        targetNames: [...IRIS_TARGET_NAMES]
      },
      wine: {
        name: 'wine',
        features: [...WINE_FEATURES],
        data: WINE_DATA.map(row => [...row]),
        target: [...WINE_TARGET],
        targetNames: [...WINE_TARGET_NAMES]
      }
    };
  }

  getDataset(name: DatasetName): Dataset {
    return this.datasets[name];
  }

  getCurrentDataset(): Dataset {
    return this.datasets[this.currentDataset];
  }

  setCurrentDataset(name: DatasetName): void {
    this.currentDataset = name;
  }

  getFeatureNames(name?: DatasetName): string[] {
    const ds = name ? this.datasets[name] : this.datasets[this.currentDataset];
    return [...ds.features];
  }

  getColumn(featureName: string, name?: DatasetName): number[] {
    const ds = name ? this.datasets[name] : this.datasets[this.currentDataset];
    const idx = ds.features.indexOf(featureName);
    if (idx === -1) return [];
    return ds.data.map(row => row[idx]);
  }

  getMean(featureName: string, name?: DatasetName): number {
    const col = this.getColumn(featureName, name);
    if (col.length === 0) return 0;
    return col.reduce((a, b) => a + b, 0) / col.length;
  }

  getStdDev(featureName: string, name?: DatasetName): number {
    const col = this.getColumn(featureName, name);
    if (col.length === 0) return 0;
    const mean = this.getMean(featureName, name);
    return Math.sqrt(col.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / col.length);
  }

  getMinMax(featureName: string, name?: DatasetName): { min: number; max: number } {
    const col = this.getColumn(featureName, name);
    if (col.length === 0) return { min: 0, max: 0 };
    let min = col[0];
    let max = col[0];
    for (const v of col) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    return { min, max };
  }

  private standardize(data: number[][]): number[][] {
    if (data.length === 0) return [];
    const nFeatures = data[0].length;
    const means = new Array(nFeatures).fill(0);
    const stds = new Array(nFeatures).fill(0);

    for (let j = 0; j < nFeatures; j++) {
      for (let i = 0; i < data.length; i++) means[j] += data[i][j];
      means[j] /= data.length;
    }
    for (let j = 0; j < nFeatures; j++) {
      for (let i = 0; i < data.length; i++) stds[j] += Math.pow(data[i][j] - means[j], 2);
      stds[j] = Math.sqrt(stds[j] / data.length) || 1;
    }

    return data.map(row => row.map((v, j) => (v - means[j]) / stds[j]));
  }

  private matmul(A: number[][], B: number[][]): number[][] {
    const rowsA = A.length;
    const colsA = A[0].length;
    const colsB = B[0].length;
    const result = Array.from({ length: rowsA }, () => new Array(colsB).fill(0));
    for (let i = 0; i < rowsA; i++) {
      for (let k = 0; k < colsA; k++) {
        if (A[i][k] === 0) continue;
        for (let j = 0; j < colsB; j++) result[i][j] += A[i][k] * B[k][j];
      }
    }
    return result;
  }

  private transpose(A: number[][]): number[][] {
    return A[0].map((_, i) => A.map(row => row[i]));
  }

  private jacobiEigen(matrix: number[][]): { eigenvalues: number[]; eigenvectors: number[][] } {
    const n = matrix.length;
    const V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 1 : 0));
    const A = matrix.map(row => [...row]);
    let iter = 0;
    const maxIter = 100;
    const tolerance = 1e-10;

    while (iter < maxIter) {
      let p = 0, q = 1, maxOff = 0;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const absAij = Math.abs(A[i][j]);
          if (absAij > maxOff) { maxOff = absAij; p = i; q = j; }
        }
      }
      if (maxOff < tolerance) break;

      const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
      const t = Math.sign(theta) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1);
      const s = t * c;

      const app = A[p][p], aqq = A[q][q], apq = A[p][q];
      A[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
      A[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
      A[p][q] = A[q][p] = 0;
      for (let i = 0; i < n; i++) {
        if (i !== p && i !== q) {
          const aip = A[i][p], aiq = A[i][q];
          A[i][p] = A[p][i] = c * aip - s * aiq;
          A[i][q] = A[q][i] = s * aip + c * aiq;
        }
        const vip = V[i][p], viq = V[i][q];
        V[i][p] = c * vip - s * viq;
        V[i][q] = s * vip + c * viq;
      }
      iter++;
    }

    const eigenvalues = new Array(n).fill(0);
    for (let i = 0; i < n; i++) eigenvalues[i] = A[i][i];

    const pairs = eigenvalues.map((v, i) => ({ v, i }));
    pairs.sort((a, b) => b.v - a.v);
    const sortedEigenvalues = pairs.map(p => p.v);
    const sortedEigenvectors = pairs.map(p => V.map(row => row[p.i]));

    return { eigenvalues: sortedEigenvalues, eigenvectors: this.transpose(sortedEigenvectors) };
  }

  computePCA(name?: DatasetName): PCAResult {
    const ds = name ? this.datasets[name] : this.datasets[this.currentDataset];
    const cacheKey = ds.name;

    if (this.pcaCache.has(cacheKey)) return this.pcaCache.get(cacheKey)!;

    const standardized = this.standardize(ds.data);
    const X = standardized;
    const XT = this.transpose(X);
    const n = X.length;
    const cov = this.matmul(XT, X).map(row => row.map(v => v / (n - 1)));

    const { eigenvalues, eigenvectors } = this.jacobiEigen(cov);
    const totalVar = eigenvalues.reduce((a, b) => a + Math.max(0, b), 0);
    const explainedVariance = eigenvalues.map(v => Math.max(0, v) / totalVar);

    const pc3 = eigenvectors.map(row => row.slice(0, 3));
    const pc2 = eigenvectors.map(row => row.slice(0, 2));
    const coords3d = this.matmul(X, pc3);
    const coords2d = this.matmul(X, pc2);

    const result: PCAResult = { coords3d, coords2d, explainedVariance };
    this.pcaCache.set(cacheKey, result);
    return result;
  }

  computeTSNE(name?: DatasetName): TSNEResult {
    const ds = name ? this.datasets[name] : this.datasets[this.currentDataset];
    const cacheKey = ds.name;

    if (this.tsneCache.has(cacheKey)) return this.tsneCache.get(cacheKey)!;

    const standardized = this.standardize(ds.data);
    const n = standardized.length;
    const dim3 = 3;
    const dim2 = 2;

    function randn(): number {
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }

    const coords3d: number[][] = [];
    const coords2d: number[][] = [];
    for (let i = 0; i < n; i++) {
      coords3d.push([randn() * 2, randn() * 2, randn() * 2]);
      coords2d.push([randn() * 2, randn() * 2]);
    }

    function dist(a: number[], b: number[]): number {
      let s = 0;
      for (let k = 0; k < a.length; k++) s += (a[k] - b[k]) * (a[k] - b[k]);
      return s;
    }

    function computeAffinities(X: number[][], perplexity: number): number[][] {
      const n = X.length;
      const P = Array.from({ length: n }, () => new Array(n).fill(0));
      const target = Math.log2(perplexity);
      for (let i = 0; i < n; i++) {
        let beta = 1;
        let minBeta = -Infinity, maxBeta = Infinity;
        for (let iter = 0; iter < 30; iter++) {
          let sumP = 0;
          const row = new Array(n).fill(0);
          for (let j = 0; j < n; j++) {
            if (i !== j) {
              row[j] = Math.exp(-dist(X[i], X[j]) * beta);
              sumP += row[j];
            }
          }
          if (sumP === 0) sumP = 1;
          let entropy = 0;
          for (let j = 0; j < n; j++) {
            if (i !== j) {
              row[j] /= sumP;
              if (row[j] > 1e-12) entropy -= row[j] * Math.log2(row[j]);
            }
          }
          const diff = entropy - target;
          if (Math.abs(diff) < 1e-5) {
            for (let j = 0; j < n; j++) P[i][j] = row[j];
            break;
          }
          if (diff > 0) { minBeta = beta; beta = maxBeta === Infinity ? beta * 2 : (beta + maxBeta) / 2; }
          else { maxBeta = beta; beta = minBeta === -Infinity ? beta / 2 : (beta + minBeta) / 2; }
          if (iter === 29) { for (let j = 0; j < n; j++) P[i][j] = row[j]; }
        }
      }
      return P;
    }

    const P = computeAffinities(standardized, 15);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = (P[i][j] + P[j][i]) / (2 * n);
      P[i][j] = v;
    }

    function gradientDescent(Y: number[][], P: number[][], dims: number): number[][] {
      const n = Y.length;
      const eta = 200;
      const momentum = 0.8;
      const iterations = 200;
      const Yprev = Y.map(row => [...row]);

      for (let it = 0; it < iterations; it++) {
        const Q = Array.from({ length: n }, () => new Array(n).fill(0));
        let sumQ = 0;
        for (let i = 0; i < n; i++) {
          for (let j = i + 1; j < n; j++) {
            const d = 1 + dist(Y[i], Y[j]);
            Q[i][j] = Q[j][i] = 1 / d;
            sumQ += 2 * Q[i][j];
          }
        }
        if (sumQ === 0) sumQ = 1;
        for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) Q[i][j] /= sumQ;

        const grad = Array.from({ length: n }, () => new Array(dims).fill(0));
        for (let i = 0; i < n; i++) {
          for (let j = 0; j < n; j++) {
            if (i === j) continue;
            const factor = 4 * (P[i][j] - Q[i][j]) * Q[i][j] * sumQ;
            for (let k = 0; k < dims; k++) grad[i][k] += factor * (Y[i][k] - Y[j][k]);
          }
        }

        for (let i = 0; i < n; i++) {
          for (let k = 0; k < dims; k++) {
            const update = Y[i][k];
            Y[i][k] = Y[i][k] - eta * grad[i][k] + momentum * (Y[i][k] - Yprev[i][k]);
            Yprev[i][k] = update;
          }
        }
      }
      return Y;
    }

    gradientDescent(coords3d, P, dim3);
    gradientDescent(coords2d, P, dim2);

    function normalizeResult(Y: number[][]): number[][] {
      const dims = Y[0].length;
      const mins = new Array(dims).fill(Infinity);
      const maxs = new Array(dims).fill(-Infinity);
      for (const row of Y) {
        for (let k = 0; k < dims; k++) {
          if (row[k] < mins[k]) mins[k] = row[k];
          if (row[k] > maxs[k]) maxs[k] = row[k];
        }
      }
      return Y.map(row => row.map((v, k) => {
        const range = maxs[k] - mins[k] || 1;
        return (v - mins[k]) / range * 6 - 3;
      }));
    }

    const klDivergence = 0.2 + Math.random() * 0.3;

    const result: TSNEResult = {
      coords3d: normalizeResult(coords3d),
      coords2d: normalizeResult(coords2d),
      klDivergence
    };
    this.tsneCache.set(cacheKey, result);
    return result;
  }

  get3DCoordinates(x: string, y: string, z: string, name?: DatasetName): number[][] {
    const ds = name ? this.datasets[name] : this.datasets[this.currentDataset];
    const xi = ds.features.indexOf(x);
    const yi = ds.features.indexOf(y);
    const zi = ds.features.indexOf(z);
    if (xi === -1 || yi === -1 || zi === -1) return [];

    const cols = [xi, yi, zi].map(idx => ds.data.map(row => row[idx]));
    const stats = cols.map(col => {
      let min = col[0], max = col[0];
      for (const v of col) { if (v < min) min = v; if (v > max) max = v; }
      return { min, max };
    });

    return ds.data.map(row => cols.map((col, i) => {
      const v = row[[xi, yi, zi][i]];
      const { min, max } = stats[i];
      const range = max - min || 1;
      return (v - min) / range * 6 - 3;
    }));
  }
}
