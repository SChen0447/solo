export interface GeneNode {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  expression: number;
  relatedGenes: string[];
}

const GENE_NAMES = [
  'BRCA1', 'TP53', 'EGFR', 'MYC', 'KRAS', 'PTEN', 'PIK3CA', 'APC', 'RB1', 'CDK4',
  'MDM2', 'AKT1', 'ERBB2', 'CDKN2A', 'SMAD4', 'BRAF', 'MET', 'ALK', 'ROS1', 'RET',
  'NTRK1', 'FGFR1', 'FGFR2', 'FGFR3', 'PDGFRA', 'KIT', 'FLT3', 'IDH1', 'IDH2', 'DNMT3A',
  'TET2', 'RUNX1', 'ASXL1', 'EZH2', 'SF3B1', 'U2AF1', 'SRSF2', 'ZRSR2', 'BCOR', 'STAG2',
  'PHF6', 'WT1', 'CEBPA', 'NPM1', 'FLT3-ITD', 'CALR', 'MPL', 'JAK2', 'CSF3R', 'NOTCH1'
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return function(): number {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function pearsonCorrelation(a: number[], b: number[]): number {
  const n = a.length;
  let sumA = 0, sumB = 0, sumAB = 0, sumA2 = 0, sumB2 = 0;
  for (let i = 0; i < n; i++) {
    sumA += a[i];
    sumB += b[i];
    sumAB += a[i] * b[i];
    sumA2 += a[i] * a[i];
    sumB2 += b[i] * b[i];
  }
  const numerator = n * sumAB - sumA * sumB;
  const denominator = Math.sqrt((n * sumA2 - sumA * sumA) * (n * sumB2 - sumB * sumB));
  return denominator === 0 ? 0 : numerator / denominator;
}

export function generateGeneData(count: number = 50): GeneNode[] {
  const rand = seededRandom(42);
  const expressionProfiles: number[][] = [];
  const genes: GeneNode[] = [];

  for (let i = 0; i < count; i++) {
    const profile: number[] = [];
    for (let j = 0; j < 20; j++) {
      profile.push(rand() * 100);
    }
    expressionProfiles.push(profile);
  }

  for (let i = 0; i < count; i++) {
    const profile = expressionProfiles[i];
    const mean = profile.reduce((a, b) => a + b, 0) / profile.length;
    genes.push({
      id: `GENE${String(i + 1).padStart(3, '0')}`,
      name: GENE_NAMES[i % GENE_NAMES.length],
      x: 0,
      y: 0,
      z: 0,
      expression: Math.min(100, Math.max(0, mean)),
      relatedGenes: []
    });
  }

  for (let i = 0; i < count; i++) {
    for (let j = i + 1; j < count; j++) {
      const corr = pearsonCorrelation(expressionProfiles[i], expressionProfiles[j]);
      if (corr > 0.8) {
        genes[i].relatedGenes.push(genes[j].id);
        genes[j].relatedGenes.push(genes[i].id);
      }
    }
  }

  return normalizePositions(genes);
}

export function normalizePositions(genes: GeneNode[]): GeneNode[] {
  const rand = seededRandom(123);
  const clusterCount = 5;
  const clusters: { cx: number; cy: number; cz: number }[] = [];

  for (let i = 0; i < clusterCount; i++) {
    clusters.push({
      cx: (rand() - 0.5) * 10,
      cy: (rand() - 0.5) * 10,
      cz: (rand() - 0.5) * 10
    });
  }

  for (let i = 0; i < genes.length; i++) {
    const cluster = clusters[i % clusterCount];
    genes[i].x = cluster.cx + (rand() - 0.5) * 4;
    genes[i].y = cluster.cy + (rand() - 0.5) * 4;
    genes[i].z = cluster.cz + (rand() - 0.5) * 4;
  }

  return genes;
}

export function loadGeneData(): Promise<GeneNode[]> {
  return Promise.resolve(generateGeneData(50));
}
