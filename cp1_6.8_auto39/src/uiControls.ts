import { MoleculeData, MOLECULES, AtomData } from './moleculeData';

export type UIControlEventType =
  | 'molecule-selected'
  | 'rotation-speed-changed'
  | 'bond-opacity-changed'
  | 'atom-scale-changed'
  | 'decompose-toggled'
  | 'info-closed';

export interface UIControlEvent {
  type: UIControlEventType;
  data?: any;
}

export class UIControls {
  private moleculeList: HTMLElement;
  private rotationSlider: HTMLInputElement;
  private opacitySlider: HTMLInputElement;
  private scaleSlider: HTMLInputElement;
  private decomposeBtn: HTMLButtonElement;
  private infoCard: HTMLElement;
  private closeInfoBtn: HTMLButtonElement;
  private opacityDisplay: HTMLElement;
  private drawerToggle: HTMLButtonElement;
  private drawer: HTMLElement;

  private rotationSliderMobile: HTMLInputElement | null = null;
  private opacitySliderMobile: HTMLInputElement | null = null;
  private scaleSliderMobile: HTMLInputElement | null = null;

  private listeners: Map<UIControlEventType, ((event: UIControlEvent) => void)[]> = new Map();
  private selectedMoleculeId: string | null = null;
  private isDecomposed: boolean = false;

  constructor() {
    this.moleculeList = document.getElementById('molecule-list')!;
    this.rotationSlider = document.getElementById('rotation-speed') as HTMLInputElement;
    this.opacitySlider = document.getElementById('bond-opacity') as HTMLInputElement;
    this.scaleSlider = document.getElementById('atom-scale') as HTMLInputElement;
    this.decomposeBtn = document.getElementById('decompose-btn') as HTMLButtonElement;
    this.infoCard = document.getElementById('info-card')!;
    this.closeInfoBtn = document.getElementById('close-info-btn') as HTMLButtonElement;
    this.opacityDisplay = document.getElementById('opacity-display')!;
    this.drawerToggle = document.getElementById('drawer-toggle') as HTMLButtonElement;
    this.drawer = document.getElementById('drawer')!;

    this.rotationSliderMobile = document.getElementById('rotation-speed-mobile') as HTMLInputElement | null;
    this.opacitySliderMobile = document.getElementById('bond-opacity-mobile') as HTMLInputElement | null;
    this.scaleSliderMobile = document.getElementById('atom-scale-mobile') as HTMLInputElement | null;

    this.renderMoleculeList();
    this.setupEventListeners();
  }

  private renderMoleculeList(): void {
    this.moleculeList.innerHTML = '';

    MOLECULES.forEach((molecule) => {
      const item = document.createElement('div');
      item.className = 'molecule-item';
      item.dataset.moleculeId = molecule.id;

      const thumbnail = document.createElement('div');
      thumbnail.className = 'molecule-thumbnail';
      thumbnail.innerHTML = this.createMoleculeThumbnailSVG(molecule);

      const name = document.createElement('div');
      name.className = 'molecule-name';
      name.textContent = molecule.name;

      const formula = document.createElement('div');
      formula.className = 'molecule-formula';
      formula.textContent = molecule.formula;

      item.appendChild(thumbnail);
      item.appendChild(name);
      item.appendChild(formula);

      item.addEventListener('click', () => {
        this.selectMolecule(molecule.id);
      });

      this.moleculeList.appendChild(item);
    });
  }

  private createMoleculeThumbnailSVG(molecule: MoleculeData): string {
    const colors: Record<string, string> = {
      H: '#ffffff',
      C: '#404040',
      N: '#3050f8',
      O: '#ff0d0d',
      S: '#ffff30',
      P: '#ff8000',
    };

    let svg = '<svg width="60" height="60" viewBox="-30 -30 60 60">';

    molecule.bonds.forEach((bond) => {
      const atom1 = molecule.atoms.find((a) => a.id === bond.atom1);
      const atom2 = molecule.atoms.find((a) => a.id === bond.atom2);
      if (atom1 && atom2) {
        const x1 = atom1.position.x * 5;
        const y1 = atom1.position.y * 5;
        const x2 = atom2.position.x * 5;
        const y2 = atom2.position.y * 5;

        if (bond.order === 1) {
          svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#888" stroke-width="1.5" />`;
        } else if (bond.order === 2) {
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = -dy / len * 1;
          const ny = dx / len * 1;
          svg += `<line x1="${x1 + nx}" y1="${y1 + ny}" x2="${x2 + nx}" y2="${y2 + ny}" stroke="#888" stroke-width="1" />`;
          svg += `<line x1="${x1 - nx}" y1="${y1 - ny}" x2="${x2 - nx}" y2="${y2 - ny}" stroke="#888" stroke-width="1" />`;
        } else if (bond.order === 3) {
          const dx = x2 - x1;
          const dy = y2 - y1;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx = -dy / len * 1.5;
          const ny = dx / len * 1.5;
          svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#888" stroke-width="1" />`;
          svg += `<line x1="${x1 + nx}" y1="${y1 + ny}" x2="${x2 + nx}" y2="${y2 + ny}" stroke="#888" stroke-width="0.8" />`;
          svg += `<line x1="${x1 - nx}" y1="${y1 - ny}" x2="${x2 - nx}" y2="${y2 - ny}" stroke="#888" stroke-width="0.8" />`;
        }
      }
    });

    molecule.atoms.forEach((atom) => {
      const x = atom.position.x * 5;
      const y = atom.position.y * 5;
      const r = Math.max(atom.radius * 4, 2);
      const color = colors[atom.element] || '#888';
      svg += `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" stroke="#666" stroke-width="0.5" />`;
    });

    svg += '</svg>';
    return svg;
  }

  private setupEventListeners(): void {
    this.rotationSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.updateRotationValue(value);
      this.emit('rotation-speed-changed', { value });

      if (this.rotationSliderMobile) {
        this.rotationSliderMobile.value = value.toString();
      }
    });

    this.opacitySlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.updateOpacityValue(value);
      this.showOpacityDisplay(value);
      this.emit('bond-opacity-changed', { value });

      if (this.opacitySliderMobile) {
        this.opacitySliderMobile.value = value.toString();
      }
    });

    this.scaleSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value);
      this.updateScaleValue(value);
      this.emit('atom-scale-changed', { value });

      if (this.scaleSliderMobile) {
        this.scaleSliderMobile.value = value.toString();
      }
    });

    if (this.rotationSliderMobile) {
      this.rotationSliderMobile.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.rotationSlider.value = value.toString();
        this.updateRotationValue(value);
        this.emit('rotation-speed-changed', { value });
      });
    }

    if (this.opacitySliderMobile) {
      this.opacitySliderMobile.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.opacitySlider.value = value.toString();
        this.updateOpacityValue(value);
        this.showOpacityDisplay(value);
        this.emit('bond-opacity-changed', { value });
      });
    }

    if (this.scaleSliderMobile) {
      this.scaleSliderMobile.addEventListener('input', (e) => {
        const value = parseFloat((e.target as HTMLInputElement).value);
        this.scaleSlider.value = value.toString();
        this.updateScaleValue(value);
        this.emit('atom-scale-changed', { value });
      });
    }

    this.decomposeBtn.addEventListener('click', () => {
      this.toggleDecompose();
    });

    this.closeInfoBtn.addEventListener('click', () => {
      this.hideInfoCard();
      this.emit('info-closed', {});
    });

    this.drawerToggle.addEventListener('click', () => {
      this.toggleDrawer();
    });

    this.updateRotationValue(parseFloat(this.rotationSlider.value));
    this.updateOpacityValue(parseFloat(this.opacitySlider.value));
    this.updateScaleValue(parseFloat(this.scaleSlider.value));
  }

  private selectMolecule(moleculeId: string): void {
    if (this.selectedMoleculeId === moleculeId) return;

    document.querySelectorAll('.molecule-item').forEach((item) => {
      item.classList.remove('active');
    });

    const selectedItem = document.querySelector(`[data-molecule-id="${moleculeId}"]`);
    if (selectedItem) {
      selectedItem.classList.add('active');
    }

    this.selectedMoleculeId = moleculeId;

    const molecule = MOLECULES.find((m) => m.id === moleculeId);
    if (molecule) {
      this.emit('molecule-selected', { molecule });
    }

    if (this.isDecomposed) {
      this.setDecomposeState(false);
    }
  }

  private updateRotationValue(value: number): void {
    const valueEl = document.getElementById('rotation-value');
    if (valueEl) {
      valueEl.textContent = value.toFixed(1);
    }
  }

  private updateOpacityValue(value: number): void {
    const valueEl = document.getElementById('opacity-value');
    if (valueEl) {
      valueEl.textContent = Math.round(value * 100).toString();
    }
  }

  private updateScaleValue(value: number): void {
    const valueEl = document.getElementById('scale-value');
    if (valueEl) {
      valueEl.textContent = value.toFixed(1);
    }
  }

  private opacityDisplayTimeout: number | null = null;

  private showOpacityDisplay(value: number): void {
    this.opacityDisplay.textContent = `${Math.round(value * 100)}%`;
    this.opacityDisplay.classList.add('show');

    if (this.opacityDisplayTimeout) {
      clearTimeout(this.opacityDisplayTimeout);
    }

    this.opacityDisplayTimeout = window.setTimeout(() => {
      this.opacityDisplay.classList.remove('show');
    }, 1500);
  }

  private toggleDecompose(): void {
    this.isDecomposed = !this.isDecomposed;

    if (this.isDecomposed) {
      this.decomposeBtn.textContent = '还原';
      this.decomposeBtn.classList.add('active');
    } else {
      this.decomposeBtn.textContent = '分解';
      this.decomposeBtn.classList.remove('active');
    }

    this.emit('decompose-toggled', { decomposed: this.isDecomposed });
  }

  public setDecomposeState(decomposed: boolean): void {
    this.isDecomposed = decomposed;

    if (this.isDecomposed) {
      this.decomposeBtn.textContent = '还原';
      this.decomposeBtn.classList.add('active');
    } else {
      this.decomposeBtn.textContent = '分解';
      this.decomposeBtn.classList.remove('active');
    }
  }

  public showAtomInfo(atom: AtomData, connectedAtoms: AtomData[]): void {
    const nameEl = document.getElementById('atom-name');
    const numberEl = document.getElementById('atom-number');
    const symbolEl = document.getElementById('atom-symbol');
    const hybridEl = document.getElementById('atom-hybrid');
    const connectedEl = document.getElementById('atom-connected');

    if (nameEl) nameEl.textContent = `${atom.name}原子`;
    if (numberEl) numberEl.textContent = atom.atomicNumber.toString();
    if (symbolEl) symbolEl.textContent = atom.symbol;
    if (hybridEl) hybridEl.textContent = this.formatHybrid(atom.hybridization);
    if (connectedEl) {
      connectedEl.textContent = connectedAtoms.length > 0
        ? connectedAtoms.map((a) => `${a.name}(${a.symbol})`).join(', ')
        : '-';
    }

    this.infoCard.classList.remove('hidden');
  }

  private formatHybrid(hybrid: string): string {
    switch (hybrid) {
      case 'sp': return 'sp';
      case 'sp2': return 'sp²';
      case 'sp3': return 'sp³';
      default: return hybrid;
    }
  }

  public hideInfoCard(): void {
    this.infoCard.classList.add('hidden');
  }

  private toggleDrawer(): void {
    this.drawer.classList.toggle('open');
  }

  public on(eventType: UIControlEventType, callback: (event: UIControlEvent) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  private emit(eventType: UIControlEventType, data?: any): void {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach((callback) => callback({ type: eventType, data }));
    }
  }

  public getSelectedMoleculeId(): string | null {
    return this.selectedMoleculeId;
  }

  public selectFirstMolecule(): void {
    if (MOLECULES.length > 0) {
      this.selectMolecule(MOLECULES[0].id);
    }
  }
}
