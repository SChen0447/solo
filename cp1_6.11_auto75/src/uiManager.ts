import type { ArtifactData, HotspotInfo } from './modelLoader';

export interface UIManagerOptions {
  artifacts: ArtifactData[];
  onArtifactChange?: (index: number) => void;
  onAudioPlay?: () => void;
}

export class UIManager {
  private artifacts: ArtifactData[];
  private currentIndex = 0;
  private onArtifactChange?: (index: number) => void;
  private onAudioPlay?: () => void;
  
  private infoCard: HTMLElement;
  private hotspotName: HTMLElement;
  private hotspotPeriod: HTMLElement;
  private hotspotDesc: HTMLElement;
  private audioBtn: HTMLElement;
  
  private artifactName: HTMLElement;
  private artifactMaterial: HTMLElement;
  private artifactEra: HTMLElement;
  private artifactSize: HTMLElement;
  
  private navDots: HTMLElement[] = [];
  
  private isCardVisible = false;
  private cardHideTimeout: number | null = null;
  
  constructor(options: UIManagerOptions) {
    this.artifacts = options.artifacts;
    this.onArtifactChange = options.onArtifactChange;
    this.onAudioPlay = options.onAudioPlay;
    
    this.infoCard = document.getElementById('info-card')!;
    this.hotspotName = document.getElementById('hotspot-name')!;
    this.hotspotPeriod = document.getElementById('hotspot-period')!;
    this.hotspotDesc = document.getElementById('hotspot-desc')!;
    this.audioBtn = document.getElementById('audio-btn')!;
    
    this.artifactName = document.getElementById('artifact-name')!;
    this.artifactMaterial = document.getElementById('artifact-material')!;
    this.artifactEra = document.getElementById('artifact-era')!;
    this.artifactSize = document.getElementById('artifact-size')!;
    
    this.initNavDots();
    this.initAudioBtn();
    this.updateInfoPanel(0);
  }
  
  private initNavDots(): void {
    const dots = document.querySelectorAll('.nav-dot');
    dots.forEach((dot, index) => {
      const el = dot as HTMLElement;
      this.navDots.push(el);
      
      el.addEventListener('click', () => {
        this.switchArtifact(index);
      });
    });
  }
  
  private initAudioBtn(): void {
    this.audioBtn.addEventListener('click', () => {
      if (this.onAudioPlay) {
        this.onAudioPlay();
      }
      
      const icon = this.audioBtn.querySelector('.icon') as HTMLElement;
      icon.style.animation = 'pulse 0.5s ease';
      setTimeout(() => {
        icon.style.animation = '';
      }, 500);
    });
  }
  
  public switchArtifact(index: number): void {
    if (index === this.currentIndex) return;
    if (index < 0 || index >= this.artifacts.length) return;
    
    this.currentIndex = index;
    this.updateNavDots();
    this.updateInfoPanel(index);
    this.hideInfoCard();
    
    if (this.onArtifactChange) {
      this.onArtifactChange(index);
    }
  }
  
  private updateNavDots(): void {
    this.navDots.forEach((dot, index) => {
      if (index === this.currentIndex) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }
  
  private updateInfoPanel(index: number): void {
    const artifact = this.artifacts[index];
    this.artifactName.textContent = artifact.name;
    this.artifactMaterial.textContent = artifact.material;
    this.artifactEra.textContent = artifact.era;
    this.artifactSize.textContent = artifact.size;
  }
  
  public showInfoCard(hotspotInfo: HotspotInfo): void {
    if (this.cardHideTimeout) {
      clearTimeout(this.cardHideTimeout);
      this.cardHideTimeout = null;
    }
    
    this.hotspotName.textContent = hotspotInfo.name;
    this.hotspotPeriod.textContent = hotspotInfo.period;
    this.hotspotDesc.textContent = hotspotInfo.description;
    
    if (!this.isCardVisible) {
      requestAnimationFrame(() => {
        this.infoCard.classList.add('visible');
        this.isCardVisible = true;
      });
    }
  }
  
  public hideInfoCard(delay = 200): void {
    if (this.cardHideTimeout) {
      clearTimeout(this.cardHideTimeout);
    }
    
    this.cardHideTimeout = window.setTimeout(() => {
      if (this.isCardVisible) {
        this.infoCard.classList.remove('visible');
        this.isCardVisible = false;
      }
      this.cardHideTimeout = null;
    }, delay);
  }
  
  public getCurrentIndex(): number {
    return this.currentIndex;
  }
  
  public setArtifacts(artifacts: ArtifactData[]): void {
    this.artifacts = artifacts;
    this.updateInfoPanel(this.currentIndex);
  }
}
