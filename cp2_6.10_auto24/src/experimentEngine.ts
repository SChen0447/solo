import cloneDeep from 'lodash/cloneDeep';
import {
  Container,
  AlcoholLamp,
  Chemical,
  ChemicalType,
  ReactionState,
  ReactionRule,
  LabState,
  Bubble,
  SteamParticle,
  Precipitate,
} from './types';
import {
  REACTION_RULES,
  DANGEROUS_COMBINATIONS,
  createChemical,
  getMixedColor,
  getMixedPH,
  CHEMICAL_DATA,
} from './chemicals';

let bubbleIdCounter = 0;
let steamIdCounter = 0;
let precipitateIdCounter = 0;

export interface EngineUpdateResult {
  state: LabState;
  warning: { message: string } | null;
  triggeredReactions: string[];
}

export class ExperimentEngine {
  private state: LabState;

  constructor() {
    this.state = {
      containers: [],
      lamps: [],
      droppers: [],
      bubbles: [],
      steamParticles: [],
      precipitates: [],
      activeReactions: [],
      temperatureHistory: [],
      currentEquation: '等待实验开始...',
    };
  }

  getState(): LabState {
    return this.state;
  }

  setState(state: LabState): void {
    this.state = state;
  }

  addContainer(type: 'testTube' | 'beaker', x: number, y: number): Container {
    const container: Container = {
      id: `container_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      x,
      y,
      width: type === 'beaker' ? 100 : 50,
      height: type === 'beaker' ? 120 : 150,
      chemicals: [],
      temperature: 25,
      isHeating: false,
      heatDuration: 0,
      isBoiling: false,
      reactionState: null,
    };
    this.state.containers.push(container);
    return container;
  }

  addLamp(x: number, y: number): AlcoholLamp {
    const lamp: AlcoholLamp = {
      id: `lamp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      x,
      y,
      width: 60,
      height: 70,
      isLit: true,
    };
    this.state.lamps.push(lamp);
    return lamp;
  }

  addChemical(containerId: string, chemicalType: ChemicalType, amount: number = 1): { container: Container; dangerous: boolean; warningMessage: string | null } {
    const container = this.state.containers.find((c) => c.id === containerId);
    if (!container) {
      return { container: {} as Container, dangerous: false, warningMessage: null };
    }

    const existingChemicals = container.chemicals.map((c) => c.type);
    let dangerous = false;
    let warningMessage: string | null = null;

    for (const existing of existingChemicals) {
      for (const [a, b] of DANGEROUS_COMBINATIONS) {
        if ((existing === a && chemicalType === b) || (existing === b && chemicalType === a)) {
          dangerous = true;
          warningMessage = `危险！${CHEMICAL_DATA[a].name} 与 ${CHEMICAL_DATA[b].name} 混合会发生危险反应！`;
        }
      }
    }

    const chemical = createChemical(chemicalType, amount);
    container.chemicals.push(chemical);

    this.checkAndTriggerReactions(container);

    return { container, dangerous, warningMessage };
  }

  private checkAndTriggerReactions(container: Container): void {
    const chemicalTypes = container.chemicals.map((c) => c.type);

    for (const rule of REACTION_RULES) {
      for (const reactantPair of rule.reactants) {
        if (this.hasAllReactants(chemicalTypes, reactantPair)) {
          this.triggerReaction(container, rule, reactantPair);
          return;
        }
      }
    }
  }

  private hasAllReactants(chemicals: ChemicalType[], reactants: ChemicalType[]): boolean {
    return reactants.every((r) => chemicals.includes(r));
  }

  private triggerReaction(container: Container, rule: ReactionRule, consumedTypes: ChemicalType[]): void {
    consumedTypes.forEach((type) => {
      const idx = container.chemicals.findIndex((c) => c.type === type);
      if (idx > -1) {
        container.chemicals.splice(idx, 1);
      }
    });

    rule.products.forEach((p) => {
      if (CHEMICAL_DATA[p.type].state !== 'gas') {
        container.chemicals.push(createChemical(p.type, p.amount));
      }
    });

    const reactionState: ReactionState = {
      type: rule.id,
      equation: rule.equation,
      startTime: performance.now(),
      duration: rule.duration,
      startColor: rule.colorChange.from,
      endColor: rule.colorChange.to,
      producesBubbles: rule.producesBubbles,
      bubbleColor: rule.bubbleColor,
      producesPrecipitate: rule.producesPrecipitate,
      precipitateColor: rule.precipitateColor,
      temperatureChange: rule.temperatureChange,
      products: rule.products,
    };

    container.reactionState = reactionState;
    this.state.currentEquation = rule.equation;
    this.state.activeReactions.push(reactionState);
  }

  placeContainerOnLamp(containerId: string, lampId: string): void {
    const container = this.state.containers.find((c) => c.id === containerId);
    const lamp = this.state.lamps.find((l) => l.id === lampId);
    if (!container || !lamp) return;

    container.isHeating = true;
    container.x = lamp.x + lamp.width / 2 - container.width / 2;
    container.y = lamp.y - container.height + 20;
  }

  removeContainerFromLamp(containerId: string): void {
    const container = this.state.containers.find((c) => c.id === containerId);
    if (!container) return;
    container.isHeating = false;
    container.heatDuration = 0;
    container.isBoiling = false;
  }

  heatContainer(containerId: string): void {
    const container = this.state.containers.find((c) => c.id === containerId);
    if (!container) return;
    container.isHeating = true;
  }

  coolContainer(containerId: string): void {
    const container = this.state.containers.find((c) => c.id === containerId);
    if (!container) return;
    container.isHeating = false;
    container.temperature = Math.max(25, container.temperature - 5);
  }

  update(deltaTime: number): EngineUpdateResult {
    const warning: { message: string } | null = null;
    const triggeredReactions: string[] = [];

    this.updateHeating(deltaTime);
    this.updateReactions(deltaTime, triggeredReactions);
    this.updateParticles(deltaTime);
    this.updateTemperatureHistory();

    return { state: this.state, warning, triggeredReactions };
  }

  private updateHeating(deltaTime: number): void {
    this.state.containers.forEach((container) => {
      if (container.isHeating) {
        container.heatDuration += deltaTime;
        container.temperature = Math.min(100, container.temperature + deltaTime * 0.01);

        if (container.heatDuration > 10000 && container.chemicals.length > 0) {
          container.isBoiling = true;
          this.generateSteamParticles(container);
        }
      } else {
        container.temperature = Math.max(25, container.temperature - deltaTime * 0.002);
      }
    });
  }

  private updateReactions(deltaTime: number, triggeredReactions: string[]): void {
    this.state.containers.forEach((container) => {
      if (!container.reactionState) return;

      const reaction = container.reactionState;
      const elapsed = performance.now() - reaction.startTime;
      const progress = Math.min(1, elapsed / reaction.duration);

      if (reaction.producesBubbles && progress < 1) {
        this.generateBubbles(container, reaction.bubbleColor);
      }

      if (reaction.producesPrecipitate && progress > 0.5 && !this.state.precipitates.find((p) => p.id.toString().includes(container.id))) {
        this.generatePrecipitate(container, reaction.precipitateColor);
      }

      if (progress >= 1) {
        triggeredReactions.push(reaction.type);
        this.state.activeReactions = this.state.activeReactions.filter((r) => r !== reaction);
        container.reactionState = null;
      }
    });
  }

  private updateParticles(deltaTime: number): void {
    this.state.bubbles = this.state.bubbles.filter((bubble) => {
      bubble.x += bubble.vx * deltaTime * 0.06;
      bubble.y += bubble.vy * deltaTime * 0.06;
      bubble.life -= deltaTime;
      bubble.alpha = Math.max(0, bubble.life / 1000);
      return bubble.life > 0 && bubble.y > 0;
    });

    if (this.state.bubbles.length > 200) {
      this.state.bubbles = this.state.bubbles.slice(-200);
    }

    this.state.steamParticles = this.state.steamParticles.filter((p) => {
      p.x += p.vx * deltaTime * 0.05;
      p.y += p.vy * deltaTime * 0.05;
      p.life -= deltaTime;
      p.alpha = Math.max(0, p.life / 1500);
      p.radius += deltaTime * 0.01;
      return p.life > 0;
    });
  }

  private updateTemperatureHistory(): void {
    if (this.state.containers.length > 0) {
      const avgTemp = this.state.containers.reduce((sum, c) => sum + c.temperature, 0) / this.state.containers.length;
      this.state.temperatureHistory.push(avgTemp);
      if (this.state.temperatureHistory.length > 100) {
        this.state.temperatureHistory.shift();
      }
    }
  }

  private generateBubbles(container: Container, color: string): void {
    if (Math.random() > 0.3) return;

    const bubble: Bubble = {
      id: bubbleIdCounter++,
      x: container.x + container.width * 0.2 + Math.random() * container.width * 0.6,
      y: container.y + container.height * 0.5,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -1 - Math.random() * 1.5,
      radius: 2 + Math.random() * 4,
      alpha: 0.8,
      life: 800 + Math.random() * 500,
    };
    this.state.bubbles.push(bubble);
  }

  private generateSteamParticles(container: Container): void {
    if (Math.random() > 0.4) return;

    const particle: SteamParticle = {
      id: steamIdCounter++,
      x: container.x + container.width * 0.3 + Math.random() * container.width * 0.4,
      y: container.y + 10,
      vx: (Math.random() - 0.5) * 0.8,
      vy: -0.8 - Math.random() * 0.5,
      radius: 5 + Math.random() * 8,
      alpha: 0.5,
      life: 1200 + Math.random() * 800,
    };
    this.state.steamParticles.push(particle);
  }

  private generatePrecipitate(container: Container, color: string): void {
    const precipitate: Precipitate = {
      id: precipitateIdCounter++,
      x: container.x + 5,
      y: container.y + container.height - 25,
      width: container.width - 10,
      height: 20,
      color,
    };
    this.state.precipitates.push(precipitate);
  }

  reset(): LabState {
    this.state = {
      containers: [],
      lamps: [],
      droppers: [],
      bubbles: [],
      steamParticles: [],
      precipitates: [],
      activeReactions: [],
      temperatureHistory: [],
      currentEquation: '等待实验开始...',
    };
    return cloneDeep(this.state);
  }
}
