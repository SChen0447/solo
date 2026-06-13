import { FeatherManager } from './FeatherManager';

export function setupControls(manager: FeatherManager): void {
  const btnReset = document.getElementById('btn-reset') as HTMLButtonElement | null;
  const btnSave = document.getElementById('btn-save') as HTMLButtonElement | null;
  const btnRandom = document.getElementById('btn-random') as HTMLButtonElement | null;

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      btnReset.disabled = true;
      manager.reset().then(() => {
        btnReset.disabled = false;
      });
    });
  }

  if (btnSave) {
    btnSave.addEventListener('click', () => {
      manager.saveImage();
    });
  }

  if (btnRandom) {
    btnRandom.addEventListener('click', () => {
      btnRandom.disabled = true;
      manager.randomizeColors().then(() => {
        btnRandom.disabled = false;
      });
    });
  }
}
