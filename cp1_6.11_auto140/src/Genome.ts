import { v4 as uuidv4 } from 'uuid';

export type Allele = string;
export type GenotypePair = [Allele, Allele];

export interface TraitGeneConfig {
  name: string;
  description: string;
  alleles: {
    [allele: string]: {
      label: string;
      dominance: 'dominant' | 'recessive' | 'codominant';
      value: string;
    };
  };
}

export interface Genome {
  id: string;
  furColor: GenotypePair;
  secondaryColor: GenotypePair;
  spotColor: GenotypePair;
  eyeColor: GenotypePair;
  bodyType: GenotypePair;
  earShape: GenotypePair;
  tailLength: GenotypePair;
  pattern: GenotypePair;
  glow?: boolean;
  rainbow?: boolean;
}

export interface Phenotype {
  furColor: string;
  secondaryColor: string;
  spotColor: string;
  eyeColor: string;
  bodyType: 'slim' | 'normal' | 'sturdy';
  earShape: 'round' | 'pointed' | 'floppy';
  tailLength: 'short' | 'medium' | 'long';
  pattern: 'stripes' | 'spots' | 'flames' | 'none';
  glow: boolean;
  rainbow: boolean;
}

export const FUR_COLOR_GENE: TraitGeneConfig = {
  name: '毛色基因',
  description: '决定宠物的主要毛色',
  alleles: {
    B: { label: '棕色', dominance: 'dominant', value: '#8b5e3c' },
    b: { label: '白色', dominance: 'recessive', value: '#f5f0e6' },
    G: { label: '灰色', dominance: 'dominant', value: '#9e9e9e' },
    O: { label: '橙色', dominance: 'codominant', value: '#ff8a65' }
  }
};

export const SECONDARY_COLOR_GENE: TraitGeneConfig = {
  name: '副色基因',
  description: '决定宠物的次要毛色（耳朵内衬、腹部）',
  alleles: {
    C: { label: '奶油色', dominance: 'dominant', value: '#fff3e0' },
    c: { label: '粉色', dominance: 'recessive', value: '#ffccbc' },
    D: { label: '深棕', dominance: 'dominant', value: '#5d4037' }
  }
};

export const SPOT_COLOR_GENE: TraitGeneConfig = {
  name: '斑点色基因',
  description: '决定宠物花纹的颜色',
  alleles: {
    S: { label: '深棕色', dominance: 'dominant', value: '#4e342e' },
    s: { label: '浅褐色', dominance: 'recessive', value: '#d7ccc8' },
    B: { label: '黑色', dominance: 'dominant', value: '#212121' }
  }
};

export const EYE_COLOR_GENE: TraitGeneConfig = {
  name: '眼睛颜色基因',
  description: '决定宠物眼睛的颜色',
  alleles: {
    E: { label: '琥珀色', dominance: 'dominant', value: '#ffb300' },
    e: { label: '蓝色', dominance: 'recessive', value: '#42a5f5' },
    G: { label: '绿色', dominance: 'codominant', value: '#66bb6a' }
  }
};

export const BODY_TYPE_GENE: TraitGeneConfig = {
  name: '体型基因',
  description: '决定宠物的体型大小和移动速度',
  alleles: {
    T: { label: '魁梧', dominance: 'dominant', value: 'sturdy' },
    t: { label: '瘦小', dominance: 'recessive', value: 'slim' },
    N: { label: '标准', dominance: 'dominant', value: 'normal' }
  }
};

export const EAR_SHAPE_GENE: TraitGeneConfig = {
  name: '耳朵形状基因',
  description: '决定宠物耳朵的形状',
  alleles: {
    R: { label: '圆耳', dominance: 'dominant', value: 'round' },
    r: { label: '尖耳', dominance: 'recessive', value: 'pointed' },
    F: { label: '垂耳', dominance: 'recessive', value: 'floppy' }
  }
};

export const TAIL_LENGTH_GENE: TraitGeneConfig = {
  name: '尾巴长度基因',
  description: '决定宠物尾巴的长度',
  alleles: {
    L: { label: '长尾', dominance: 'dominant', value: 'long' },
    l: { label: '短尾', dominance: 'recessive', value: 'short' },
    M: { label: '中尾', dominance: 'codominant', value: 'medium' }
  }
};

export const PATTERN_GENE: TraitGeneConfig = {
  name: '花纹基因',
  description: '决定宠物身体上的花纹样式',
  alleles: {
    P: { label: '条纹', dominance: 'dominant', value: 'stripes' },
    p: { label: '无花纹', dominance: 'recessive', value: 'none' },
    S: { label: '斑点', dominance: 'codominant', value: 'spots' },
    F: { label: '火焰纹', dominance: 'dominant', value: 'flames' }
  }
};

export const ALL_GENE_CONFIGS: { [key: string]: TraitGeneConfig } = {
  furColor: FUR_COLOR_GENE,
  secondaryColor: SECONDARY_COLOR_GENE,
  spotColor: SPOT_COLOR_GENE,
  eyeColor: EYE_COLOR_GENE,
  bodyType: BODY_TYPE_GENE,
  earShape: EAR_SHAPE_GENE,
  tailLength: TAIL_LENGTH_GENE,
  pattern: PATTERN_GENE
};

export function getDominantAllele(pair: GenotypePair, geneConfig: TraitGeneConfig): Allele {
  const [a1, a2] = pair;
  const allele1 = geneConfig.alleles[a1];
  const allele2 = geneConfig.alleles[a2];

  if (!allele1 || !allele2) return a1;

  if (allele1.dominance === 'dominant' && allele2.dominance === 'recessive') return a1;
  if (allele2.dominance === 'dominant' && allele1.dominance === 'recessive') return a2;

  if (allele1.dominance === 'codominant' || allele2.dominance === 'codominant') {
    return a1;
  }

  return a1;
}

export function isHomozygous(pair: GenotypePair): boolean {
  return pair[0] === pair[1];
}

export function getPhenotypeValue(pair: GenotypePair, geneConfig: TraitGeneConfig): string {
  const dominant = getDominantAllele(pair, geneConfig);
  return geneConfig.alleles[dominant]?.value || '';
}

export function generatePhenotype(genome: Genome): Phenotype {
  return {
    furColor: getPhenotypeValue(genome.furColor, FUR_COLOR_GENE),
    secondaryColor: getPhenotypeValue(genome.secondaryColor, SECONDARY_COLOR_GENE),
    spotColor: getPhenotypeValue(genome.spotColor, SPOT_COLOR_GENE),
    eyeColor: getPhenotypeValue(genome.eyeColor, EYE_COLOR_GENE),
    bodyType: getPhenotypeValue(genome.bodyType, BODY_TYPE_GENE) as 'slim' | 'normal' | 'sturdy',
    earShape: getPhenotypeValue(genome.earShape, EAR_SHAPE_GENE) as 'round' | 'pointed' | 'floppy',
    tailLength: getPhenotypeValue(genome.tailLength, TAIL_LENGTH_GENE) as 'short' | 'medium' | 'long',
    pattern: getPhenotypeValue(genome.pattern, PATTERN_GENE) as 'stripes' | 'spots' | 'flames' | 'none',
    glow: genome.glow || false,
    rainbow: genome.rainbow || false
  };
}

function randomAllele(geneConfig: TraitGeneConfig): Allele {
  const alleles = Object.keys(geneConfig.alleles);
  return alleles[Math.floor(Math.random() * alleles.length)];
}

export function createRandomGenome(): Genome {
  return {
    id: uuidv4(),
    furColor: [randomAllele(FUR_COLOR_GENE), randomAllele(FUR_COLOR_GENE)],
    secondaryColor: [randomAllele(SECONDARY_COLOR_GENE), randomAllele(SECONDARY_COLOR_GENE)],
    spotColor: [randomAllele(SPOT_COLOR_GENE), randomAllele(SPOT_COLOR_GENE)],
    eyeColor: [randomAllele(EYE_COLOR_GENE), randomAllele(EYE_COLOR_GENE)],
    bodyType: [randomAllele(BODY_TYPE_GENE), randomAllele(BODY_TYPE_GENE)],
    earShape: [randomAllele(EAR_SHAPE_GENE), randomAllele(EAR_SHAPE_GENE)],
    tailLength: [randomAllele(TAIL_LENGTH_GENE), randomAllele(TAIL_LENGTH_GENE)],
    pattern: [randomAllele(PATTERN_GENE), randomAllele(PATTERN_GENE)]
  };
}

function selectAllele(pair: GenotypePair): Allele {
  return Math.random() < 0.5 ? pair[0] : pair[1];
}

export const MUTATION_RATE = 0.005;
export const RARE_MUTATION_RATE = 0.005;

function maybeMutateAllele(allele: Allele, geneConfig: TraitGeneConfig): Allele {
  if (Math.random() < MUTATION_RATE) {
    const alleles = Object.keys(geneConfig.alleles).filter(a => a !== allele);
    if (alleles.length > 0) {
      return alleles[Math.floor(Math.random() * alleles.length)];
    }
  }
  return allele;
}

export function breed(parent1: Genome, parent2: Genome): { offspring: Genome; mutationOccurred: boolean; rareMutation: string | null } {
  const geneKeys: (keyof Genome)[] = [
    'furColor', 'secondaryColor', 'spotColor', 'eyeColor',
    'bodyType', 'earShape', 'tailLength', 'pattern'
  ];

  const offspring: Partial<Genome> = {
    id: uuidv4()
  };

  let mutationOccurred = false;
  let rareMutation: string | null = null;

  for (const key of geneKeys) {
    const geneConfig = ALL_GENE_CONFIGS[key as string];
    if (!geneConfig) continue;

    const p1Pair = (parent1[key] as GenotypePair) || ['A', 'A'];
    const p2Pair = (parent2[key] as GenotypePair) || ['A', 'A'];

    let allele1 = selectAllele(p1Pair);
    let allele2 = selectAllele(p2Pair);

    const mutated1 = maybeMutateAllele(allele1, geneConfig);
    const mutated2 = maybeMutateAllele(allele2, geneConfig);

    if (mutated1 !== allele1 || mutated2 !== allele2) {
      mutationOccurred = true;
    }

    allele1 = mutated1;
    allele2 = mutated2;

    (offspring as any)[key] = [allele1, allele2];
  }

  if (Math.random() < RARE_MUTATION_RATE) {
    const rareMutations = ['glow', 'rainbow'];
    const chosen = rareMutations[Math.floor(Math.random() * rareMutations.length)];
    rareMutation = chosen;
    (offspring as any)[chosen] = true;
    mutationOccurred = true;
  }

  if (parent1.glow && parent2.glow) {
    offspring.glow = true;
  }
  if (parent1.rainbow && parent2.rainbow) {
    offspring.rainbow = true;
  }

  return {
    offspring: offspring as Genome,
    mutationOccurred,
    rareMutation
  };
}

export function calculateOffspringProbabilities(pair1: GenotypePair, pair2: GenotypePair, geneConfig: TraitGeneConfig): { genotype: GenotypePair; probability: number; phenotype: string }[] {
  const results: { [key: string]: number } = {};
  const alleles1 = [pair1[0], pair1[1]];
  const alleles2 = [pair2[0], pair2[1]];

  for (const a1 of alleles1) {
    for (const a2 of alleles2) {
      const genotype: GenotypePair = [a1, a2].sort() as GenotypePair;
      const key = genotype.join('');
      results[key] = (results[key] || 0) + 1;
    }
  }

  const total = 4;
  return Object.entries(results).map(([key, count]) => {
    const genotype: GenotypePair = [key[0], key[1]] as GenotypePair;
    const phenotypeValue = getPhenotypeValue(genotype, geneConfig);
    return {
      genotype,
      probability: count / total,
      phenotype: phenotypeValue
    };
  });
}
