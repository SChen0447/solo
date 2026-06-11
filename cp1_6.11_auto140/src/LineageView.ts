import type { Genome, GenotypePair, TraitGeneConfig, Phenotype } from './Genome';
import { ALL_GENE_CONFIGS, calculateOffspringProbabilities, generatePhenotype } from './Genome';

export interface BreedingResult {
  offspring: Genome;
  parent1: Genome;
  parent2: Genome;
  mutationOccurred: boolean;
  rareMutation: string | null;
}

interface GeneDisplay {
  key: string;
  genotype: GenotypePair;
  config: TraitGeneConfig;
  phenotype: string;
}

export class LineageView {
  private container: HTMLElement;
  private panel: HTMLElement | null = null;
  private contentContainer: HTMLElement | null = null;
  private isExpanded: boolean = true;
  private currentGenome: Genome | null = null;
  private currentPhenotype: Phenotype | null = null;

  private probabilityCanvas: HTMLCanvasElement | null = null;
  private probabilityCtx: CanvasRenderingContext2D | null = null;
  private selectedGeneKey: string | null = null;
  private mateGenome: Genome | null = null;

  private breedingPanel: HTMLElement | null = null;
  private breedingAnimationActive: boolean = false;
  private flashElement: HTMLElement | null = null;

  private onBreedCallback: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.createPanel();
    this.createFlashEffect();
  }

  private createPanel(): void {
    this.panel = document.createElement('div');
    this.panel.className = 'lineage-panel';
    this.panel.style.cssText = `
      position: absolute;
      top: 20px;
      left: 20px;
      width: 280px;
      background: rgba(239, 228, 196, 0.92);
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
      overflow: hidden;
      z-index: 20;
      border: 2px solid #8d6e63;
      font-family: 'Georgia', serif;
      transition: box-shadow 0.3s ease;
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      padding: 12px 16px;
      background: rgba(139, 94, 60, 0.85);
      color: #faf0e6;
      font-weight: 600;
      font-size: 15px;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      user-select: none;
    `;
    header.innerHTML = `
      <span>📜 基因谱系</span>
      <span class="toggle-icon" style="transition: transform 0.4s ease;">▼</span>
    `;
    header.addEventListener('click', () => this.togglePanel());
    this.panel.appendChild(header);

    this.contentContainer = document.createElement('div');
    this.contentContainer.style.cssText = `
      padding: 12px 16px;
      max-height: 500px;
      overflow-y: auto;
      transition: max-height 0.4s ease, padding 0.4s ease;
    `;
    this.panel.appendChild(this.contentContainer);

    this.createProbabilitySection();
    this.createBreedingSection();

    this.container.appendChild(this.panel);
  }

  private createProbabilitySection(): void {
    if (!this.contentContainer) return;

    const section = document.createElement('div');
    section.className = 'probability-section';
    section.style.cssText = `
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px dashed #8d6e63;
    `;

    const title = document.createElement('div');
    title.textContent = '🧬 基因型';
    title.style.cssText = 'font-weight: 600; color: #5d4037; margin-bottom: 10px; font-size: 14px;';
    section.appendChild(title);

    const genesList = document.createElement('div');
    genesList.className = 'genes-list';
    genesList.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';
    section.appendChild(genesList);

    const probTitle = document.createElement('div');
    probTitle.textContent = '📊 后代概率';
    probTitle.style.cssText = 'font-weight: 600; color: #5d4037; margin: 12px 0 8px; font-size: 13px;';
    section.appendChild(probTitle);

    const probDesc = document.createElement('div');
    probDesc.className = 'prob-desc';
    probDesc.textContent = '点击基因符号查看遗传概率';
    probDesc.style.cssText = 'font-size: 11px; color: #8d6e63; margin-bottom: 8px; font-style: italic;';
    section.appendChild(probDesc);

    this.probabilityCanvas = document.createElement('canvas');
    this.probabilityCanvas.width = 240;
    this.probabilityCanvas.height = 240;
    this.probabilityCanvas.style.cssText = `
      display: block;
      margin: 0 auto;
      border-radius: 8px;
      background: rgba(250, 240, 230, 0.6);
    `;
    this.probabilityCtx = this.probabilityCanvas.getContext('2d');
    section.appendChild(this.probabilityCanvas);

    this.contentContainer.appendChild(section);
  }

  private createBreedingSection(): void {
    if (!this.contentContainer) return;

    this.breedingPanel = document.createElement('div');
    this.breedingPanel.className = 'breeding-section';
    this.breedingPanel.style.cssText = '';

    const title = document.createElement('div');
    title.textContent = '💕 交配实验';
    title.style.cssText = 'font-weight: 600; color: #5d4037; margin-bottom: 10px; font-size: 14px;';
    this.breedingPanel.appendChild(title);

    const breedBtn = document.createElement('button');
    breedBtn.textContent = '🐣 与系统宠物交配';
    breedBtn.style.cssText = `
      width: 100%;
      padding: 10px;
      border: none;
      border-radius: 12px;
      background: #f0c040;
      color: #3e2723;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      font-family: 'Georgia', serif;
    `;
    
    breedBtn.addEventListener('mouseenter', () => {
      breedBtn.style.transform = 'translateY(-2px)';
      breedBtn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.25)';
    });
    
    breedBtn.addEventListener('mouseleave', () => {
      breedBtn.style.transform = 'translateY(0)';
      breedBtn.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
    });

    breedBtn.addEventListener('mousedown', () => {
      breedBtn.style.transform = 'scale(0.95)';
      setTimeout(() => {
        breedBtn.style.transform = 'scale(1.05)';
        setTimeout(() => {
          breedBtn.style.transform = 'scale(1) translateY(0)';
        }, 100);
      }, 100);
    });

    breedBtn.addEventListener('click', () => {
      if (this.onBreedCallback) {
        this.onBreedCallback();
      }
    });

    this.breedingPanel.appendChild(breedBtn);

    const resultContainer = document.createElement('div');
    resultContainer.className = 'breeding-result';
    resultContainer.style.cssText = 'margin-top: 12px; display: none;';
    this.breedingPanel.appendChild(resultContainer);

    this.contentContainer.appendChild(this.breedingPanel);
  }

  private createFlashEffect(): void {
    this.flashElement = document.createElement('div');
    this.flashElement.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: white;
      opacity: 0;
      pointer-events: none;
      z-index: 9999;
      transition: opacity 0.1s ease;
    `;
    this.container.appendChild(this.flashElement);
  }

  private togglePanel(): void {
    if (!this.panel || !this.contentContainer) return;

    this.isExpanded = !this.isExpanded;
    const toggleIcon = this.panel.querySelector('.toggle-icon') as HTMLElement;

    if (this.isExpanded) {
      this.contentContainer.style.maxHeight = '500px';
      this.contentContainer.style.padding = '12px 16px';
      if (toggleIcon) toggleIcon.style.transform = 'rotate(0deg)';
    } else {
      this.contentContainer.style.maxHeight = '0';
      this.contentContainer.style.padding = '0 16px';
      if (toggleIcon) toggleIcon.style.transform = 'rotate(-90deg)';
    }
  }

  updateGenome(genome: Genome): void {
    this.currentGenome = genome;
    this.currentPhenotype = generatePhenotype(genome);
    this.renderGeneList();
  }

  setMateGenome(genome: Genome): void {
    this.mateGenome = genome;
  }

  setOnBreedCallback(callback: () => void): void {
    this.onBreedCallback = callback;
  }

  private renderGeneList(): void {
    if (!this.contentContainer || !this.currentGenome) return;

    const genesList = this.contentContainer.querySelector('.genes-list') as HTMLElement;
    if (!genesList) return;

    genesList.innerHTML = '';

    const geneKeys = ['furColor', 'secondaryColor', 'spotColor', 'eyeColor', 'bodyType', 'earShape', 'tailLength', 'pattern'];

    for (const key of geneKeys) {
      const config = ALL_GENE_CONFIGS[key];
      if (!config) continue;

      const genotype = (this.currentGenome as any)[key] as GenotypePair;
      const phenotype = generatePhenotype(this.currentGenome);
      const phenotypeValue = (phenotype as any)[key];

      const geneItem = document.createElement('div');
      geneItem.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 10px;
        background: rgba(250, 240, 230, 0.7);
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.2s ease;
      `;

      geneItem.addEventListener('mouseenter', () => {
        geneItem.style.background = 'rgba(255, 255, 255, 0.8)';
      });
      geneItem.addEventListener('mouseleave', () => {
        geneItem.style.background = 'rgba(250, 240, 230, 0.7)';
      });
      geneItem.addEventListener('click', () => {
        this.selectedGeneKey = key;
        this.renderProbabilityChart(key);
      });

      const geneName = document.createElement('div');
      geneName.style.cssText = 'font-size: 12px; color: #5d4037;';
      geneName.textContent = config.name;
      geneItem.appendChild(geneName);

      const geneSymbols = document.createElement('div');
      geneSymbols.style.cssText = `
        font-family: 'Courier New', monospace;
        font-size: 13px;
        font-weight: 600;
        color: #3e2723;
        background: rgba(255, 255, 255, 0.6);
        padding: 2px 8px;
        border-radius: 6px;
      `;
      geneSymbols.textContent = `${genotype[0]}${genotype[1]}`;
      geneItem.appendChild(geneSymbols);

      const previewDot = document.createElement('div');
      previewDot.style.cssText = `
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: ${typeof phenotypeValue === 'string' && phenotypeValue.startsWith('#') ? phenotypeValue : '#d7ccc8'};
        border: 1px solid #8d6e63;
      `;
      
      if (typeof phenotypeValue === 'string' && phenotypeValue.startsWith('#')) {
        geneItem.appendChild(previewDot);
      }

      genesList.appendChild(geneItem);
    }
  }

  private renderProbabilityChart(geneKey: string): void {
    if (!this.probabilityCtx || !this.probabilityCanvas || !this.currentGenome || !this.mateGenome) return;

    const ctx = this.probabilityCtx;
    const w = this.probabilityCanvas.width;
    const h = this.probabilityCanvas.height;
    const centerX = w / 2;
    const centerY = h / 2;

    ctx.clearRect(0, 0, w, h);

    const geneConfig = ALL_GENE_CONFIGS[geneKey];
    if (!geneConfig) return;

    const parent1Genotype = (this.currentGenome as any)[geneKey] as GenotypePair;
    const parent2Genotype = (this.mateGenome as any)[geneKey] as GenotypePair;

    const probabilities = calculateOffspringProbabilities(parent1Genotype, parent2Genotype, geneConfig);

    const colors = ['#ff9999', '#99ff99', '#9999ff', '#ffff99'];
    const outerRadius = 80;
    const innerRadius = 25;

    let startAngle = -Math.PI / 2;

    for (let i = 0; i < probabilities.length; i++) {
      const prob = probabilities[i];
      const sweepAngle = prob.probability * Math.PI * 2;

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, startAngle, startAngle + sweepAngle);
      ctx.arc(centerX, centerY, innerRadius, startAngle + sweepAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      const midAngle = startAngle + sweepAngle / 2;
      const labelRadius = (outerRadius + innerRadius) / 2;
      const labelX = centerX + Math.cos(midAngle) * labelRadius;
      const labelY = centerY + Math.sin(midAngle) * labelRadius;

      ctx.save();
      ctx.fillStyle = '#3e2723';
      ctx.font = 'bold 11px Courier New';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(prob.probability * 100)}%`, labelX, labelY);
      ctx.restore();

      startAngle += sweepAngle;
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#faf0e6';
    ctx.fill();
    ctx.strokeStyle = '#8d6e63';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#5d4037';
    ctx.font = 'bold 12px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(parent1Genotype.join(''), centerX, centerY - 8);
    ctx.font = '10px Georgia';
    ctx.fillText('× ' + parent2Genotype.join(''), centerX, centerY + 8);

    const legendY = h - 30;
    const legendItemWidth = w / probabilities.length;

    for (let i = 0; i < probabilities.length; i++) {
      const prob = probabilities[i];
      const x = legendItemWidth * i + legendItemWidth / 2;

      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(x - 8, legendY, 12, 12);
      ctx.strokeStyle = '#8d6e63';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 8, legendY, 12, 12);

      ctx.fillStyle = '#3e2723';
      ctx.font = '10px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(prob.genotype.join(''), x, legendY + 24);
    }
  }

  showBreedingResult(result: BreedingResult): void {
    if (!this.breedingPanel) return;

    const resultContainer = this.breedingPanel.querySelector('.breeding-result') as HTMLElement;
    if (!resultContainer) return;

    resultContainer.innerHTML = '';
    resultContainer.style.display = 'block';

    const offspringTitle = document.createElement('div');
    offspringTitle.textContent = '🥚 后代蛋';
    offspringTitle.style.cssText = 'font-weight: 600; color: #5d4037; margin-bottom: 8px; font-size: 13px;';
    resultContainer.appendChild(offspringTitle);

    if (result.rareMutation) {
      this.triggerMutationFlash();
      const mutationLabel = document.createElement('div');
      mutationLabel.textContent = `✨ 稀有突变: ${result.rareMutation === 'glow' ? '发光' : '彩虹斑纹'}`;
      mutationLabel.style.cssText = `
        padding: 6px 10px;
        background: linear-gradient(90deg, #ff9999, #99ff99, #9999ff, #ffff99);
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        color: #3e2723;
        text-align: center;
        margin-bottom: 10px;
        animation: pulse 0.5s ease-in-out infinite alternate;
      `;
      resultContainer.appendChild(mutationLabel);
    } else if (result.mutationOccurred) {
      const mutationLabel = document.createElement('div');
      mutationLabel.textContent = '🔬 发生了基因突变';
      mutationLabel.style.cssText = `
        padding: 6px 10px;
        background: #ffe0b2;
        border-radius: 8px;
        font-size: 12px;
        color: #e65100;
        text-align: center;
        margin-bottom: 10px;
      `;
      resultContainer.appendChild(mutationLabel);
    }

    this.renderGeneTransferAnimation(resultContainer, result);
  }

  private triggerMutationFlash(): void {
    if (!this.flashElement) return;
    
    this.flashElement.style.opacity = '1';
    setTimeout(() => {
      if (this.flashElement) {
        this.flashElement.style.opacity = '0';
      }
    }, 200);

    this.createMutationParticles();
  }

  private createMutationParticles(): void {
    const particleCount = 50;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      const angle = (Math.PI * 2 * i) / particleCount;
      const distance = 50 + Math.random() * 150;
      const size = 4 + Math.random() * 8;

      particle.style.cssText = `
        position: fixed;
        left: ${centerX}px;
        top: ${centerY}px;
        width: ${size}px;
        height: ${size}px;
        background: hsl(${Math.random() * 360}, 100%, 70%);
        border-radius: 50%;
        pointer-events: none;
        z-index: 10000;
        transition: all 1s ease-out;
        opacity: 1;
      `;

      document.body.appendChild(particle);

      requestAnimationFrame(() => {
        particle.style.left = `${centerX + Math.cos(angle) * distance}px`;
        particle.style.top = `${centerY + Math.sin(angle) * distance}px`;
        particle.style.opacity = '0';
      });

      setTimeout(() => {
        particle.remove();
      }, 1000);
    }
  }

  private renderGeneTransferAnimation(container: HTMLElement, result: BreedingResult): void {
    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 200;
    canvas.style.cssText = 'display: block; margin: 0 auto;';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const geneKeys = ['furColor', 'eyeColor', 'bodyType', 'pattern'];
    const animDuration = 2000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animDuration, 1);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const yPositions = [30, 70, 110, 150];

      for (let i = 0; i < geneKeys.length; i++) {
        const key = geneKeys[i];
        const y = yPositions[i];
        
        const p1Genes = (result.parent1 as any)[key] as GenotypePair;
        const p2Genes = (result.parent2 as any)[key] as GenotypePair;
        const offspringGenes = (result.offspring as any)[key] as GenotypePair;

        ctx.font = '11px Courier New';
        ctx.fillStyle = '#5d4037';
        ctx.textAlign = 'center';
        ctx.fillText(p1Genes.join(''), 30, y + 4);
        ctx.fillText(p2Genes.join(''), 210, y + 4);

        const geneProgress = Math.max(0, Math.min(1, (progress - i * 0.15) / 0.7));

        if (geneProgress > 0) {
          const lineX = 30 + (210 - 30) * geneProgress;
          
          ctx.beginPath();
          ctx.moveTo(30, y);
          ctx.lineTo(lineX, y);
          ctx.strokeStyle = '#bdbdbd';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);

          if (geneProgress >= 1) {
            ctx.fillStyle = '#ffd54f';
            ctx.font = 'bold 12px Courier New';
            ctx.fillText(offspringGenes.join(''), 120, y + 4);
            
            ctx.beginPath();
            ctx.arc(120, y, 16, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffb300';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  destroy(): void {
    if (this.panel) {
      this.panel.remove();
    }
    if (this.flashElement) {
      this.flashElement.remove();
    }
  }
}
