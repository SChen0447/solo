import { v4 as uuidv4 } from 'uuid';

export type Allele = 'R' | 'r' | 'L' | 'l';
export type Locus = 'color' | 'shape';

export interface Genotype {
  color: [Allele, Allele];
  shape: [Allele, Allele];
}

export interface Plant {
  id: string;
  genotype: Genotype;
  generation: number;
  createdAt: number;
}

export const ALLELE_VALUES: Record<string, string> = {
  R: '1',
  r: '0',
  L: '1',
  l: '0'
};

export function genotypeToBinary(genotype: Genotype): string {
  const colorBits = genotype.color.map(a => ALLELE_VALUES[a]).join('');
  const shapeBits = genotype.shape.map(a => ALLELE_VALUES[a]).join('');
  return `${colorBits}${shapeBits}`;
}

export function binaryToGenotype(binary: string): Genotype {
  return {
    color: [binary[0] === '1' ? 'R' : 'r', binary[1] === '1' ? 'R' : 'r'] as [Allele, Allele],
    shape: [binary[2] === '1' ? 'L' : 'l', binary[3] === '1' ? 'L' : 'l'] as [Allele, Allele]
  };
}

export function genotypeToString(genotype: Genotype): string {
  return `${genotype.color.join('')}-${genotype.shape.join('')}`;
}

export function stringToGenotype(str: string): Genotype {
  const [colorPart, shapePart] = str.split('-');
  return {
    color: [colorPart[0] as Allele, colorPart[1] as Allele],
    shape: [shapePart[0] as Allele, shapePart[1] as Allele]
  };
}

export function getPhenotype(genotype: Genotype): {
  petalColor: string;
  leafShape: 'wide' | 'narrow';
  isDominantColor: boolean;
  isDominantShape: boolean;
} {
  const hasDominantColor = genotype.color.includes('R');
  const hasDominantShape = genotype.shape.includes('L');
  
  let petalColor: string;
  if (hasDominantColor) {
    if (genotype.color[0] === 'R' && genotype.color[1] === 'R') {
      petalColor = '#c2185b';
    } else {
      petalColor = '#f48fb1';
    }
  } else {
    petalColor = '#fce4ec';
  }

  return {
    petalColor,
    leafShape: hasDominantShape ? 'wide' : 'narrow',
    isDominantColor: hasDominantColor,
    isDominantShape: hasDominantShape
  };
}

function getGamete(alleles: [Allele, Allele]): Allele {
  const mutationChance = Math.random();
  let allele = alleles[Math.floor(Math.random() * 2)];
  
  if (mutationChance < 0.01) {
    if (allele === 'R') allele = 'r';
    else if (allele === 'r') allele = 'R';
    else if (allele === 'L') allele = 'l';
    else if (allele === 'l') allele = 'L';
  }
  
  return allele;
}

export function cross(parent1: Plant, parent2: Plant): Plant {
  const color1 = getGamete(parent1.genotype.color);
  const color2 = getGamete(parent2.genotype.color);
  const shape1 = getGamete(parent1.genotype.shape);
  const shape2 = getGamete(parent2.genotype.shape);
  
  const newGenotype: Genotype = {
    color: [color1, color2],
    shape: [shape1, shape2]
  };
  
  const newGeneration = Math.max(parent1.generation, parent2.generation) + 1;
  
  return {
    id: uuidv4(),
    genotype: newGenotype,
    generation: newGeneration,
    createdAt: Date.now()
  };
}

export function mutateAllele(plant: Plant, locus: Locus, index: 0 | 1): Plant {
  const newGenotype: Genotype = {
    color: [...plant.genotype.color] as [Allele, Allele],
    shape: [...plant.genotype.shape] as [Allele, Allele]
  };
  
  const currentAllele = newGenotype[locus][index];
  if (currentAllele === 'R') newGenotype[locus][index] = 'r';
  else if (currentAllele === 'r') newGenotype[locus][index] = 'R';
  else if (currentAllele === 'L') newGenotype[locus][index] = 'l';
  else if (currentAllele === 'l') newGenotype[locus][index] = 'L';
  
  return {
    ...plant,
    genotype: newGenotype,
    id: uuidv4()
  };
}

export function createRandomPlant(generation: number = 1): Plant {
  const colorAlleles: Allele[] = ['R', 'r'];
  const shapeAlleles: Allele[] = ['L', 'l'];
  
  const genotype: Genotype = {
    color: [
      colorAlleles[Math.floor(Math.random() * 2)],
      colorAlleles[Math.floor(Math.random() * 2)]
    ] as [Allele, Allele],
    shape: [
      shapeAlleles[Math.floor(Math.random() * 2)],
      shapeAlleles[Math.floor(Math.random() * 2)]
    ] as [Allele, Allele]
  };
  
  return {
    id: uuidv4(),
    genotype,
    generation,
    createdAt: Date.now()
  };
}

export function createInitialPlants(count: number = 6): Plant[] {
  return Array.from({ length: count }, () => createRandomPlant(1));
}
