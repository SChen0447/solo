import { REACTIONS, CHEMICALS, Reaction, Product, Chemical, getChemicalById } from './chemicalData';

export interface PrecipitateParticle {
  x: number;
  y: number;
  targetY: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
  settled: boolean;
}

export interface BubbleParticle {
  x: number;
  y: number;
  vy: number;
  vx: number;
  size: number;
  opacity: number;
  alive: boolean;
}

export interface DropAnimation {
  x: number;
  y: number;
  targetY: number;
  color: string;
  opacity: number;
  size: number;
  active: boolean;
  progress: number;
}

export interface RippleEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  active: boolean;
}

export interface ReactionResult {
  success: boolean;
  equation: string;
  products: Product[];
  finalColor: string;
  temperatureDelta: number;
  hasPrecipitate: boolean;
  precipitateColor?: string;
  hasGas: boolean;
  precipitateParticles: PrecipitateParticle[];
  bubbles: BubbleParticle[];
}

export interface ContainerState {
  chemicals: string[];
  liquidLevel: number;
  liquidColor: string;
  temperature: number;
  targetTemperature: number;
  products: Product[];
  currentEquation: string;
  precipitateParticles: PrecipitateParticle[];
  bubbles: BubbleParticle[];
  drops: DropAnimation[];
  ripples: RippleEffect[];
  containerType: 'beaker' | 'testtube';
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 232, g: 244, b: 248 };
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return (
    '#' +
    [r, g, b]
      .map(x => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
};

const mixColors = (colors: string[]): string => {
  if (colors.length === 0) return '#e8f4f8';
  if (colors.length === 1) return colors[0];

  let totalR = 0,
    totalG = 0,
    totalB = 0;

  colors.forEach(color => {
    const rgb = hexToRgb(color);
    totalR += rgb.r;
    totalG += rgb.g;
    totalB += rgb.b;
  });

  return rgbToHex(totalR / colors.length, totalG / colors.length, totalB / colors.length);
};

const findReaction = (chemicalIds: string[]): Reaction | null => {
  for (const reaction of REACTIONS) {
    const sortedReactants = [...reaction.reactants].sort();
    const sortedInput = [...chemicalIds].sort();

    if (sortedReactants.length === sortedInput.length) {
      let match = true;
      for (let i = 0; i < sortedReactants.length; i++) {
        if (sortedReactants[i] !== sortedInput[i]) {
          match = false;
          break;
        }
      }
      if (match) return reaction;
    }

    if (sortedInput.length > sortedReactants.length) {
      const containsAll = sortedReactants.every(r => sortedInput.includes(r));
      if (containsAll) return reaction;
    }
  }
  return null;
};

const generatePrecipitateParticles = (
  color: string,
  containerWidth: number,
  containerHeight: number
): PrecipitateParticle[] => {
  const particles: PrecipitateParticle[] = [];
  const count = 10 + Math.floor(Math.random() * 11);

  for (let i = 0; i < count; i++) {
    particles.push({
      x: containerWidth * 0.2 + Math.random() * containerWidth * 0.6,
      y: containerHeight * 0.1 + Math.random() * containerHeight * 0.2,
      targetY: containerHeight * 0.85 + Math.random() * containerHeight * 0.08,
      vy: 0.3 + Math.random() * 0.5,
      size: 2 + Math.random() * 2,
      color,
      opacity: 0.7,
      settled: false
    });
  }
  return particles;
};

const generateBubble = (
  containerWidth: number,
  containerHeight: number,
  liquidLevel: number
): BubbleParticle => {
  return {
    x: containerWidth * 0.3 + Math.random() * containerWidth * 0.4,
    y: containerHeight * (liquidLevel / 100) * 0.9,
    vy: -1 - Math.random() * 1.5,
    vx: (Math.random() - 0.5) * 0.5,
    size: 3 + Math.random() * 5,
    opacity: 0.6 + Math.random() * 0.3,
    alive: true
  };
};

export class ReactionEngine {
  private state: ContainerState;
  private containerWidth: number;
  private containerHeight: number;

  constructor(width: number = 200, height: number = 250) {
    this.containerWidth = width;
    this.containerHeight = height;
    this.state = {
      chemicals: [],
      liquidLevel: 0,
      liquidColor: '#e8f4f8',
      temperature: 25,
      targetTemperature: 25,
      products: [],
      currentEquation: '',
      precipitateParticles: [],
      bubbles: [],
      drops: [],
      ripples: [],
      containerType: 'beaker'
    };
  }

  setContainerDimensions(width: number, height: number): void {
    this.containerWidth = width;
    this.containerHeight = height;
  }

  setContainerType(type: 'beaker' | 'testtube'): void {
    this.state.containerType = type;
  }

  getState(): ContainerState {
    return this.state;
  }

  addChemical(chemicalId: string): ReactionResult {
    const chemical = getChemicalById(chemicalId);
    if (!chemical) {
      return {
        success: false,
        equation: '',
        products: [],
        finalColor: this.state.liquidColor,
        temperatureDelta: 0,
        hasPrecipitate: false,
        hasGas: false,
        precipitateParticles: [],
        bubbles: []
      };
    }

    this.state.chemicals.push(chemicalId);
    this.state.liquidLevel = Math.min(100, this.state.liquidLevel + 15);

    const dropX = this.containerWidth / 2;
    const dropY = this.containerHeight * 0.1;
    this.state.drops.push({
      x: dropX,
      y: dropY,
      targetY: this.containerHeight * (this.state.liquidLevel / 100) * 0.85,
      color: chemical.color,
      opacity: 1,
      size: 8,
      active: true,
      progress: 0
    });

    this.state.ripples.push({
      x: dropX,
      y: this.containerHeight * (this.state.liquidLevel / 100) * 0.85,
      radius: 2,
      maxRadius: 40,
      opacity: 0.6,
      active: true
    });

    const reaction = findReaction(this.state.chemicals);

    if (reaction) {
      this.state.currentEquation = reaction.equation;
      this.state.products = reaction.products;
      this.state.targetTemperature = 25 + reaction.temperatureChange;

      if (reaction.colorChange) {
        this.state.liquidColor = reaction.colorChange;
      }

      if (reaction.precipitation && reaction.precipitateColor) {
        const newParticles = generatePrecipitateParticles(
          reaction.precipitateColor,
          this.containerWidth,
          this.containerHeight
        );
        this.state.precipitateParticles.push(...newParticles);
      }

      if (reaction.gasEvolution) {
        for (let i = 0; i < 5; i++) {
          setTimeout(() => {
            this.state.bubbles.push(
              generateBubble(this.containerWidth, this.containerHeight, this.state.liquidLevel)
            );
          }, i * 200);
        }
      }

      return {
        success: true,
        equation: reaction.equation,
        products: reaction.products,
        finalColor: reaction.colorChange || this.state.liquidColor,
        temperatureDelta: reaction.temperatureChange,
        hasPrecipitate: reaction.precipitation,
        precipitateColor: reaction.precipitateColor,
        hasGas: reaction.gasEvolution,
        precipitateParticles: this.state.precipitateParticles,
        bubbles: this.state.bubbles
      };
    } else {
      const allColors = this.state.chemicals.map(id => {
        const c = getChemicalById(id);
        return c ? c.color : '#e8f4f8';
      });
      this.state.liquidColor = mixColors(allColors);
      this.state.currentEquation = '';
      this.state.products = [];

      return {
        success: true,
        equation: '',
        products: [],
        finalColor: this.state.liquidColor,
        temperatureDelta: 0,
        hasPrecipitate: false,
        hasGas: false,
        precipitateParticles: [],
        bubbles: []
      };
    }
  }

  clearContainer(): void {
    this.state = {
      chemicals: [],
      liquidLevel: 0,
      liquidColor: '#e8f4f8',
      temperature: 25,
      targetTemperature: 25,
      products: [],
      currentEquation: '',
      precipitateParticles: [],
      bubbles: [],
      drops: [],
      ripples: [],
      containerType: this.state.containerType
    };
  }

  update(): void {
    const tempDiff = this.state.targetTemperature - this.state.temperature;
    if (Math.abs(tempDiff) > 0.1) {
      this.state.temperature += tempDiff * 0.05;
    }

    this.state.drops = this.state.drops.filter(drop => {
      if (!drop.active) return false;
      drop.progress += 0.08;
      drop.y = drop.y + (drop.targetY - drop.y) * 0.15;
      if (drop.progress >= 1 || Math.abs(drop.y - drop.targetY) < 2) {
        drop.active = false;
        return false;
      }
      return true;
    });

    this.state.ripples = this.state.ripples.filter(ripple => {
      if (!ripple.active) return false;
      ripple.radius += 2;
      ripple.opacity -= 0.03;
      if (ripple.radius >= ripple.maxRadius || ripple.opacity <= 0) {
        ripple.active = false;
        return false;
      }
      return true;
    });

    this.state.precipitateParticles.forEach(particle => {
      if (!particle.settled) {
        particle.y += particle.vy;
        if (particle.y >= particle.targetY) {
          particle.y = particle.targetY;
          particle.settled = true;
        }
      }
    });

    this.state.bubbles = this.state.bubbles.filter(bubble => {
      if (!bubble.alive) return false;
      bubble.y += bubble.vy;
      bubble.x += bubble.vx;
      bubble.vx += (Math.random() - 0.5) * 0.2;
      if (bubble.y < this.containerHeight * 0.15) {
        bubble.alive = false;
        return false;
      }
      if (Math.random() < 0.005) {
        this.state.bubbles.push(
          generateBubble(this.containerWidth, this.containerHeight, this.state.liquidLevel)
        );
      }
      return true;
    });
  }
}
