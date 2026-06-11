import { v4 as uuidv4 } from 'uuid';
import type {
  MixFormula,
  TestResult,
  CrackData,
  CrackBranch,
  CrackPoint,
  ForceField,
  ForceFieldPoint,
  MicroStructure,
  MicroParticle,
  MicroCrack,
} from '../types';

export function calculateCompressiveStrength(formula: MixFormula): number {
  const baseStrength = 25;
  const volcanicAshFactor = 1 + 0.6 * Math.sin(Math.PI * (formula.volcanicAshRatio - 35) / 50);
  const aggregateFactor = 1 - 0.15 * Math.abs(formula.aggregateDiameter - 10) / 10;
  const waterFactor = 1.5 - 1.5 * formula.waterCementRatio;
  return Math.round(baseStrength * volcanicAshFactor * aggregateFactor * waterFactor * 100) / 100;
}

export function calculateElasticModulus(compressiveStrength: number): number {
  return Math.round((20 + 0.5 * compressiveStrength) * 100) / 100;
}

export function calculatePorosity(formula: MixFormula): number {
  return Math.round((5 + 15 * formula.waterCementRatio - 3 * (formula.volcanicAshRatio / 60)) * 100) / 100;
}

export function calculateBrittlenessIndex(formula: MixFormula): number {
  return Math.round((0.3 + 0.5 * (1 - formula.waterCementRatio) + 0.2 * (formula.aggregateDiameter / 20)) * 100) / 100;
}

export function calculateTensileStrength(compressiveStrength: number, brittlenessIndex: number): number {
  return compressiveStrength * 0.1 * (1 - brittlenessIndex);
}

export function calculateCrackTotalLength(compressiveStrength: number, brittlenessIndex: number): number {
  const baseLength = 500;
  const tensileStrength = calculateTensileStrength(compressiveStrength, brittlenessIndex);
  const maxTensile = 5;
  return Math.round(baseLength * (1 - Math.min(tensileStrength / maxTensile, 0.9)) * 100) / 100;
}

export function calculateTestResult(formula: MixFormula): TestResult {
  const compressiveStrength = calculateCompressiveStrength(formula);
  const elasticModulus = calculateElasticModulus(compressiveStrength);
  const porosity = calculatePorosity(formula);
  const brittlenessIndex = calculateBrittlenessIndex(formula);
  const crackTotalLength = calculateCrackTotalLength(compressiveStrength, brittlenessIndex);

  return {
    formulaId: formula.id,
    compressiveStrength,
    elasticModulus,
    porosity,
    crackTotalLength,
    brittlenessIndex,
  };
}

export function generateCrackData(
  centerX: number,
  centerY: number,
  totalLength: number,
  brittlenessIndex: number
): CrackData {
  const branches: CrackBranch[] = [];
  const mainCrackCount = 3 + Math.floor(Math.random() * 3);
  const maxLength = totalLength / mainCrackCount;
  let accumulatedLength = 0;

  for (let i = 0; i < mainCrackCount; i++) {
    const angle = (i / mainCrackCount) * Math.PI * 2 + Math.random() * 0.5;
    const branchLength = maxLength * (0.7 + Math.random() * 0.6);
    const points: CrackPoint[] = [{ x: centerX, y: centerY }];
    let currentX = centerX;
    let currentY = centerY;
    let currentAngle = angle;
    let remainingLength = branchLength;
    const segmentCount = 5 + Math.floor(Math.random() * 5);

    for (let j = 0; j < segmentCount && remainingLength > 0; j++) {
      const segLength = remainingLength / (segmentCount - j);
      currentAngle += (Math.random() - 0.5) * 0.5;
      currentX += Math.cos(currentAngle) * segLength;
      currentY += Math.sin(currentAngle) * segLength;
      points.push({ x: currentX, y: currentY });
      remainingLength -= segLength;
      accumulatedLength += segLength;

      if (j > 1 && j < segmentCount - 2 && Math.random() < 0.3 * brittlenessIndex) {
        const subBranch = generateSubBranch(
          currentX,
          currentY,
          currentAngle + (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.3),
          branchLength * (0.2 + Math.random() * 0.3),
          3
        );
        branches.push(subBranch);
        accumulatedLength += calculateBranchLength(subBranch);
      }
    }

    branches.push({
      id: uuidv4(),
      points,
      width: 1 + Math.random() * 2,
    });
  }

  return {
    branches,
    totalLength: Math.round(accumulatedLength * 100) / 100,
  };
}

function generateSubBranch(
  startX: number,
  startY: number,
  angle: number,
  length: number,
  segments: number
): CrackBranch {
  const points: CrackPoint[] = [{ x: startX, y: startY }];
  let currentX = startX;
  let currentY = startY;
  let currentAngle = angle;
  const segLength = length / segments;

  for (let i = 0; i < segments; i++) {
    currentAngle += (Math.random() - 0.5) * 0.4;
    currentX += Math.cos(currentAngle) * segLength;
    currentY += Math.sin(currentAngle) * segLength;
    points.push({ x: currentX, y: currentY });
  }

  return {
    id: uuidv4(),
    points,
    width: 0.5 + Math.random() * 1.5,
  };
}

function calculateBranchLength(branch: CrackBranch): number {
  let length = 0;
  for (let i = 1; i < branch.points.length; i++) {
    const dx = branch.points[i].x - branch.points[i - 1].x;
    const dy = branch.points[i].y - branch.points[i - 1].y;
    length += Math.sqrt(dx * dx + dy * dy);
  }
  return length;
}

export function generateForceField(width: number, height: number): ForceField {
  const points: ForceFieldPoint[] = [];
  const gridSize = 20;
  const centerX = width / 2;
  const centerY = height * 0.3;

  for (let x = 0; x < width; x += gridSize) {
    for (let y = 0; y < height; y += gridSize) {
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const normalizedDist = dist / Math.max(width, height);
      let stress = Math.sin(normalizedDist * Math.PI) * (y > height * 0.5 ? 1 : -1);
      stress += (Math.random() - 0.5) * 0.2;
      stress = Math.max(-1, Math.min(1, stress));

      points.push({ x, y, stress });
    }
  }

  const gradient = [
    '#1565c0',
    '#2196f3',
    '#64b5f6',
    '#90caf9',
    '#e0e0e0',
    '#ef9a9a',
    '#ef5350',
    '#f44336',
    '#c62828',
  ];

  return { points, gradient };
}

export function getStressColor(stress: number, gradient: string[]): string {
  const normalized = (stress + 1) / 2;
  const index = Math.floor(normalized * (gradient.length - 1));
  return gradient[Math.max(0, Math.min(gradient.length - 1, index))];
}

export function generateMicroStructure(formula: MixFormula): MicroStructure {
  const particles: MicroParticle[] = [];
  const cracks: MicroCrack[] = [];

  const particleCount = Math.floor(30 + (1 - formula.waterCementRatio) * 50);
  const regularity = 1 - Math.abs(formula.waterCementRatio - 0.45) / 0.3;

  for (let i = 0; i < particleCount; i++) {
    const baseX = (i % 10) * 50 + 25;
    const baseY = Math.floor(i / 10) * 50 + 25;
    const jitter = (1 - regularity) * 20;

    particles.push({
      x: baseX + (Math.random() - 0.5) * jitter,
      y: baseY + (Math.random() - 0.5) * jitter,
      diameter: 2 + (formula.aggregateDiameter / 20) * 6 + Math.random() * 2,
      color: formula.volcanicAshRatio > 40 ? '#6d4c41' : formula.volcanicAshRatio > 25 ? '#8d6e63' : '#a1887f',
      rotation: Math.random() * Math.PI * 2,
    });
  }

  const crackCount = Math.floor(formula.waterCementRatio * 8);
  for (let i = 0; i < crackCount; i++) {
    cracks.push({
      x1: Math.random() * 500,
      y1: Math.random() * 300,
      x2: Math.random() * 500,
      y2: Math.random() * 300,
      width: 0.5 + Math.random() * 1,
    });
  }

  const matrixGray = Math.floor(180 - formula.volcanicAshRatio * 1.5);
  const matrixColor = `rgb(${matrixGray}, ${matrixGray - 10}, ${matrixGray - 20})`;

  return {
    particles,
    cracks,
    matrixColor,
  };
}

export function getDefaultFormula(): MixFormula {
  return {
    id: uuidv4(),
    volcanicAshRatio: 35,
    aggregateDiameter: 10,
    waterCementRatio: 0.45,
    timestamp: Date.now(),
  };
}
