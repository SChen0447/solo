export type GeneDimension = 'drought' | 'cold' | 'yield' | 'color';

export interface AllelePair {
  allele1: string;
  allele2: string;
}

export interface Genotype {
  drought: AllelePair;
  cold: AllelePair;
  yield: AllelePair;
  color: AllelePair;
}

export interface Phenotype {
  droughtResistance: number;
  coldResistance: number;
  fruitYield: number;
  flowerColor: string;
}

export interface BasePlantDef {
  id: string;
  name: string;
  emoji: string;
  genotype: Genotype;
}

export type EnvironmentType = 'drought' | 'cold' | 'pest' | 'normal';

export interface EnvironmentChallenge {
  type: EnvironmentType;
  name: string;
  icon: string;
  duration: number;
  description: string;
}

const GENE_DOMINANT: Record<GeneDimension, string> = {
  drought: 'A',
  cold: 'B',
  yield: 'C',
  color: 'D'
};

const GENE_RECESSIVE: Record<GeneDimension, string> = {
  drought: 'a',
  cold: 'b',
  yield: 'c',
  color: 'd'
};

const FLOWER_COLORS: Record<string, string> = {
  DD: '#ff6b9d',
  Dd: '#ff9ec4',
  dD: '#ff9ec4',
  dd: '#ffd93d'
};

export function isDominant(dimension: GeneDimension, allele: string): boolean {
  return allele === GENE_DOMINANT[dimension];
}

export function calculatePhenotype(genotype: Genotype): Phenotype {
  const droughtTrait = calculateTrait(genotype.drought, 'drought');
  const coldTrait = calculateTrait(genotype.cold, 'cold');
  const yieldTrait = calculateTrait(genotype.yield, 'yield');

  const colorKey = genotype.color.allele1 + genotype.color.allele2;
  const flowerColor = FLOWER_COLORS[colorKey] || '#ffd93d';

  return {
    droughtResistance: droughtTrait,
    coldResistance: coldTrait,
    fruitYield: yieldTrait,
    flowerColor
  };
}

function calculateTrait(pair: AllelePair, dimension: GeneDimension): number {
  const dom = GENE_DOMINANT[dimension];
  const hasDominant = pair.allele1 === dom || pair.allele2 === dom;
  const isHomozygousDominant = pair.allele1 === dom && pair.allele2 === dom;

  if (isHomozygousDominant) {
    return 1.0;
  } else if (hasDominant) {
    return 0.7;
  } else {
    return 0.2;
  }
}

export function crossBreed(parent1: Genotype, parent2: Genotype): Genotype {
  return {
    drought: crossAlleles(parent1.drought, parent2.drought),
    cold: crossAlleles(parent1.cold, parent2.cold),
    yield: crossAlleles(parent1.yield, parent2.yield),
    color: crossAlleles(parent1.color, parent2.color)
  };
}

function crossAlleles(parent1: AllelePair, parent2: AllelePair): AllelePair {
  const alleleFromP1 = Math.random() < 0.5 ? parent1.allele1 : parent1.allele2;
  const alleleFromP2 = Math.random() < 0.5 ? parent2.allele1 : parent2.allele2;

  return {
    allele1: alleleFromP1,
    allele2: alleleFromP2
  };
}

export function countBeneficialGenes(
  genotype: Genotype,
  environment: EnvironmentType
): number {
  let count = 0;

  switch (environment) {
    case 'drought':
      count += countDominantAlleles(genotype.drought, 'drought');
      count += countDominantAlleles(genotype.yield, 'yield') * 0.5;
      break;
    case 'cold':
      count += countDominantAlleles(genotype.cold, 'cold');
      count += countDominantAlleles(genotype.drought, 'drought') * 0.3;
      break;
    case 'pest':
      count += countDominantAlleles(genotype.yield, 'yield');
      count += countDominantAlleles(genotype.cold, 'cold') * 0.3;
      break;
    default:
      count += countDominantAlleles(genotype.drought, 'drought') * 0.5;
      count += countDominantAlleles(genotype.cold, 'cold') * 0.5;
      count += countDominantAlleles(genotype.yield, 'yield') * 0.5;
  }

  return Math.floor(count * 10) / 10;
}

function countDominantAlleles(pair: AllelePair, dimension: GeneDimension): number {
  const dom = GENE_DOMINANT[dimension];
  let count = 0;
  if (pair.allele1 === dom) count++;
  if (pair.allele2 === dom) count++;
  return count;
}

export function canSurvive(
  genotype: Genotype,
  environment: EnvironmentType
): boolean {
  const beneficialCount = countBeneficialGenes(genotype, environment);
  return beneficialCount >= 1.5;
}

export const BASE_PLANTS: BasePlantDef[] = [
  {
    id: 'cactus',
    name: '仙人掌',
    emoji: '🌵',
    genotype: {
      drought: { allele1: 'A', allele2: 'A' },
      cold: { allele1: 'b', allele2: 'b' },
      yield: { allele1: 'c', allele2: 'c' },
      color: { allele1: 'd', allele2: 'd' }
    }
  },
  {
    id: 'rose',
    name: '玫瑰',
    emoji: '🌹',
    genotype: {
      drought: { allele1: 'a', allele2: 'a' },
      cold: { allele1: 'B', allele2: 'b' },
      yield: { allele1: 'c', allele2: 'c' },
      color: { allele1: 'D', allele2: 'D' }
    }
  },
  {
    id: 'wheat',
    name: '小麦',
    emoji: '🌾',
    genotype: {
      drought: { allele1: 'A', allele2: 'a' },
      cold: { allele1: 'B', allele2: 'B' },
      yield: { allele1: 'C', allele2: 'C' },
      color: { allele1: 'd', allele2: 'd' }
    }
  },
  {
    id: 'sunflower',
    name: '向日葵',
    emoji: '🌻',
    genotype: {
      drought: { allele1: 'A', allele2: 'A' },
      cold: { allele1: 'b', allele2: 'b' },
      yield: { allele1: 'C', allele2: 'c' },
      color: { allele1: 'D', allele2: 'd' }
    }
  },
  {
    id: 'pine',
    name: '松树',
    emoji: '🌲',
    genotype: {
      drought: { allele1: 'a', allele2: 'a' },
      cold: { allele1: 'B', allele2: 'B' },
      yield: { allele1: 'c', allele2: 'c' },
      color: { allele1: 'd', allele2: 'd' }
    }
  },
  {
    id: 'tomato',
    name: '番茄',
    emoji: '🍅',
    genotype: {
      drought: { allele1: 'a', allele2: 'a' },
      cold: { allele1: 'b', allele2: 'b' },
      yield: { allele1: 'C', allele2: 'C' },
      color: { allele1: 'D', allele2: 'd' }
    }
  }
];

export const ENVIRONMENT_CHALLENGES: EnvironmentChallenge[] = [
  {
    type: 'drought',
    name: '干旱',
    icon: '☀️',
    duration: 3,
    description: '连续高温干旱，需要抗旱性强的植物'
  },
  {
    type: 'cold',
    name: '寒潮',
    icon: '❄️',
    duration: 5,
    description: '低温寒潮来袭，需要抗寒性强的植物'
  },
  {
    type: 'pest',
    name: '虫害',
    icon: '🐛',
    duration: 4,
    description: '虫害爆发，需要高产量的植物才能存活'
  },
  {
    type: 'normal',
    name: '晴朗',
    icon: '🌤️',
    duration: 2,
    description: '天气良好，大多数植物都能存活'
  }
];

export function getRandomEnvironment(): EnvironmentChallenge {
  const index = Math.floor(Math.random() * ENVIRONMENT_CHALLENGES.length);
  return ENVIRONMENT_CHALLENGES[index];
}

export function genotypeToString(genotype: Genotype): string {
  const parts: string[] = [];
  const dimensions: GeneDimension[] = ['drought', 'cold', 'yield', 'color'];
  const labels: Record<GeneDimension, string> = {
    drought: '抗旱',
    cold: '抗寒',
    yield: '产量',
    color: '花色'
  };

  for (const dim of dimensions) {
    const pair = genotype[dim];
    parts.push(`${labels[dim]}: ${pair.allele1}${pair.allele2}`);
  }

  return parts.join(' | ');
}
