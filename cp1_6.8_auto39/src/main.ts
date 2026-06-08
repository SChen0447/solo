import './styles.css';
import { MoleculeRenderer } from './moleculeRenderer';
import { UIControls } from './uiControls';
import { MoleculeData } from './moleculeData';

class App {
  private renderer: MoleculeRenderer;
  private uiControls: UIControls;

  constructor() {
    const canvas = document.getElementById('scene-canvas') as HTMLCanvasElement;
    this.renderer = new MoleculeRenderer(canvas);
    this.uiControls = new UIControls();

    this.setupEventHandlers();
    this.uiControls.selectFirstMolecule();
  }

  private setupEventHandlers(): void {
    this.uiControls.on('molecule-selected', (event) => {
      const { molecule } = event.data as { molecule: MoleculeData };
      this.renderer.loadMolecule(molecule);
    });

    this.uiControls.on('rotation-speed-changed', (event) => {
      const { value } = event.data as { value: number };
      this.renderer.setRotationSpeed(value);
    });

    this.uiControls.on('bond-opacity-changed', (event) => {
      const { value } = event.data as { value: number };
      this.renderer.setBondOpacity(value);
    });

    this.uiControls.on('atom-scale-changed', (event) => {
      const { value } = event.data as { value: number };
      this.renderer.setAtomScale(value);
    });

    this.uiControls.on('decompose-toggled', () => {
      this.renderer.toggleDecompose();
    });

    this.uiControls.on('info-closed', () => {
    });

    this.renderer.on('atom-clicked', (event) => {
      const { atom, connected } = event.data;
      this.uiControls.showAtomInfo(atom, connected);
    });

    this.renderer.on('decompose-state-changed', (event) => {
      const { state } = event.data;
      const isDecomposed = state === 'decomposed' || state === 'decomposing';
      this.uiControls.setDecomposeState(isDecomposed);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
