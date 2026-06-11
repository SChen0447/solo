import { rand, randInt, createIrregularPolygonPoints, lerp } from './utils';
import { CrystalType, CRYSTAL_INFO, CrystalCluster, CrystalManager } from './crystals';
import { LightSystem, SpectrumData } from './lights';

export interface UICallbacks {
  onCrystalSelect?: (type: CrystalType) => void;
  onTempChange?: (kelvin: number) => void;
  onSpectrumColorSelect?: (color: string | null, wavelength: number | null) => void;
  onKeyFocus?: (type: CrystalType) => void;
}

export class UIController {
  private crystalManager: CrystalManager;
  private lightSystem: LightSystem;
  private callbacks: UICallbacks;
  private selectedSpectrumBand: HTMLElement | null = null;
  private currentMineral: CrystalType = 'fluorite';

  private mineralNameEl!: HTMLElement;
  private mineralEnEl!: HTMLElement;
  private crystalSystemEl!: HTMLElement;
  private hardnessEl!: HTMLElement;
  private fluorescenceColorEl!: HTMLElement;
  private tempSliderEl!: HTMLInputElement;
  private tempValueEl!: HTMLElement;
  private spectrumBarEl!: HTMLElement;
  private spectrumBands: HTMLElement[] = [];
  private loadingScreenEl!: HTMLElement;

  constructor(crystalManager: CrystalManager, lightSystem: LightSystem, callbacks: UICallbacks = {}) {
    this.crystalManager = crystalManager;
    this.lightSystem = lightSystem;
    this.callbacks = callbacks;
    this.cacheElements();
    this.initStalactites();
    this.initGroundDebris();
    this.bindEvents();
    this.updateMineralPanel('fluorite');
  }

  private cacheElements(): void {
    this.mineralNameEl = document.getElementById('mineral-name')!;
    this.mineralEnEl = document.getElementById('mineral-en')!;
    this.crystalSystemEl = document.getElementById('crystal-system')!;
    this.hardnessEl = document.getElementById('hardness')!;
    this.fluorescenceColorEl = document.getElementById('fluorescence-color')!;
    this.tempSliderEl = document.getElementById('temp-slider') as HTMLInputElement;
    this.tempValueEl = document.getElementById('temp-value')!;
    this.spectrumBarEl = document.getElementById('spectrum-bar')!;
    this.spectrumBands = Array.from(document.querySelectorAll('.spectrum-band'));
    this.loadingScreenEl = document.getElementById('loading-screen')!;
  }

  private initStalactites(): void {
    const svg = document.getElementById('stalactites-svg') as SVGSVGElement;
    if (!svg) return;

    const screenWidth = window.innerWidth;
    const spacing = randInt(60, 120);
    const count = Math.floor(screenWidth / spacing) + 2;

    let svgContent = '';
    let xPos = randInt(0, 40);

    for (let i = 0; i < count; i++) {
      const height = randInt(40, 80);
      const width = height * rand(0.4, 0.7);
      const opacity = rand(0.25, 0.5);

      const gradientId = `stal-grad-${i}-${Date.now()}-${Math.floor(rand(0, 10000))}`;
      const cx = xPos + width / 2;
      const cy = height / 2;

      svgContent += `
        <defs>
          <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#2e3b4e;stop-opacity:${opacity}" />
            <stop offset="50%" style="stop-color:#3a4a62;stop-opacity:${opacity * 0.8}" />
            <stop offset="100%" style="stop-color:#1b263b;stop-opacity:${opacity * 0.3}" />
          </linearGradient>
        </defs>
        <polygon
          points="${cx},0 ${xPos + width},${height} ${xPos},${height}"
          fill="url(#${gradientId})"
        />
        <polygon
          points="${cx + width * 0.1},${height * 0.3} ${xPos + width * 0.95},${height * 0.95} ${xPos + width * 0.05},${height * 0.95}"
          fill="rgba(93, 173, 226, ${opacity * 0.08})"
        />
      `;

      xPos += spacing + randInt(-15, 15);
    }

    svg.innerHTML = svgContent;
    svg.setAttribute('viewBox', `0 0 ${screenWidth} 150`);
    svg.setAttribute('preserveAspectRatio', 'none');
  }

  private initGroundDebris(): void {
    const svg = document.getElementById('debris-svg') as SVGSVGElement;
    if (!svg) return;

    const screenWidth = window.innerWidth;
    const screenHeight = 120;
    const debrisCount = Math.floor(screenWidth / 20);

    let svgContent = '';
    for (let i = 0; i < debrisCount; i++) {
      const cx = rand(20, screenWidth - 20);
      const cy = rand(30, screenHeight - 10);
      const radius = rand(2.5, 7.5);
      const sides = randInt(5, 8);
      const opacity = rand(0.5, 0.85);

      const points = createIrregularPolygonPoints(cx, cy, radius, sides);

      svgContent += `
        <polygon
          points="${points}"
          fill="#2e3b4e"
          opacity="${opacity}"
        />
        <polygon
          points="${points}"
          fill="url(#debris-hl-${i})"
          opacity="${opacity * 0.3}"
        />
        <defs>
          <linearGradient id="debris-hl-${i}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#5dade2;stop-opacity:0.5" />
            <stop offset="100%" style="stop-color:#5dade2;stop-opacity:0" />
          </linearGradient>
        </defs>
      `;
    }

    svg.innerHTML = svgContent;
    svg.setAttribute('viewBox', `0 0 ${screenWidth} ${screenHeight}`);
    svg.setAttribute('preserveAspectRatio', 'none');
  }

  private bindEvents(): void {
    this.tempSliderEl.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      this.tempValueEl.textContent = value.toString();
      this.callbacks.onTempChange?.(value);
    });

    this.spectrumBands.forEach(band => {
      band.addEventListener('click', (e) => {
        e.stopPropagation();
        const color = band.getAttribute('data-color');
        const wavelength = parseInt(band.getAttribute('data-wavelength') || '0', 10);
        this.handleSpectrumSelect(band, color, wavelength);
      });

      band.addEventListener('mouseenter', () => {
        if (this.selectedSpectrumBand !== band) {
          band.style.opacity = '0.8';
        }
      });
      band.addEventListener('mouseleave', () => {
        if (this.selectedSpectrumBand !== band) {
          band.style.opacity = '';
        }
      });
    });

    document.addEventListener('click', (e) => {
      if (!(e.target as HTMLElement).closest('#spectrum-bar')) {
        this.clearSpectrumSelection();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === '1') {
        this.handleKeyFocus('fluorite');
      } else if (e.key === '2') {
        this.handleKeyFocus('calcite');
      } else if (e.key === '3') {
        this.handleKeyFocus('amethyst');
      } else if (e.key === 'Escape') {
        this.clearSpectrumSelection();
      }
    });

    window.addEventListener('resize', () => {
      this.initStalactites();
      this.initGroundDebris();
    });
  }

  private handleSpectrumSelect(band: HTMLElement, color: string | null, wavelength: number): void {
    if (this.selectedSpectrumBand === band) {
      this.clearSpectrumSelection();
      return;
    }

    if (this.selectedSpectrumBand) {
      this.selectedSpectrumBand.classList.remove('selected');
      this.selectedSpectrumBand.style.opacity = '';
    }

    this.selectedSpectrumBand = band;
    band.classList.add('selected');

    const focusType = this.crystalManager.getCurrentFocused();
    if (focusType) {
      const cluster = this.crystalManager.getCluster(focusType);
      cluster?.setStainColor(color);
    }

    this.lightSystem.selectSpectrumColor(color);
    this.callbacks.onSpectrumColorSelect?.(color, wavelength);
  }

  private clearSpectrumSelection(): void {
    if (this.selectedSpectrumBand) {
      this.selectedSpectrumBand.classList.remove('selected');
      this.selectedSpectrumBand.style.opacity = '';
      this.selectedSpectrumBand = null;
    }

    this.crystalManager.clusters.forEach(cluster => {
      if (cluster.highlightStainColor) {
        cluster.setStainColor(null);
      }
    });

    this.lightSystem.selectSpectrumColor(null);
    this.callbacks.onSpectrumColorSelect?.(null, null);
  }

  private handleKeyFocus(type: CrystalType): void {
    this.updateMineralPanel(type);
    this.callbacks.onKeyFocus?.(type);
  }

  public updateMineralPanel(type: CrystalType): void {
    this.currentMineral = type;
    const info = CRYSTAL_INFO[type];

    this.mineralNameEl.style.opacity = '0';
    this.mineralEnEl.style.opacity = '0';

    setTimeout(() => {
      this.mineralNameEl.textContent = info.name;
      this.mineralEnEl.textContent = info.nameEn;
      this.crystalSystemEl.textContent = info.crystalSystem;
      this.hardnessEl.textContent = info.hardness;

      const fluorescenceText = this.fluorescenceColorEl.parentElement!;
      fluorescenceText.childNodes[0].textContent = info.fluorescenceName + ' ';
      this.fluorescenceColorEl.style.background = info.fluorescence;
      this.fluorescenceColorEl.style.color = info.fluorescence;

      this.mineralNameEl.style.transition = 'opacity 0.3s ease';
      this.mineralEnEl.style.transition = 'opacity 0.3s ease';
      this.mineralNameEl.style.opacity = '1';
      this.mineralEnEl.style.opacity = '1';
    }, 150);

    this.callbacks.onCrystalSelect?.(type);
  }

  public updateSpectrumIntensities(spectrum: SpectrumData): void {
    const bands = [
      { el: this.spectrumBands[0], value: spectrum.red },
      { el: this.spectrumBands[1], value: spectrum.orange },
      { el: this.spectrumBands[2], value: spectrum.yellow },
      { el: this.spectrumBands[3], value: spectrum.green },
      { el: this.spectrumBands[4], value: spectrum.cyan },
      { el: this.spectrumBands[5], value: spectrum.blue },
      { el: this.spectrumBands[6], value: spectrum.violet }
    ];

    bands.forEach(({ el, value }) => {
      if (el && el !== this.selectedSpectrumBand) {
        el.style.opacity = lerp(0.3, 1, value).toString();
      }
    });
  }

  public handleCrystalHover(cluster: CrystalCluster | null): void {
    if (cluster) {
      this.updateMineralPanel(cluster.type);
    }
  }

  public hideLoadingScreen(delay: number = 2200): void {
    setTimeout(() => {
      this.loadingScreenEl.classList.add('hidden');
      setTimeout(() => {
        this.loadingScreenEl.style.display = 'none';
      }, 900);
    }, delay);
  }

  public getCurrentMineral(): CrystalType {
    return this.currentMineral;
  }

  public dispose(): void {
    this.tempSliderEl.removeEventListener('input', () => {});
    this.spectrumBands.forEach(b => {
      b.removeEventListener('click', () => {});
      b.removeEventListener('mouseenter', () => {});
      b.removeEventListener('mouseleave', () => {});
    });
  }
}
