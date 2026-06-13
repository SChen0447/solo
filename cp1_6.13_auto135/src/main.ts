import { AncientScroll, ScrollState } from './scroll';
import {
  StoryAnimator,
  ProgressAnimator,
  ParticleSystem,
  generatePaperTexture
} from './animation';

function init(): void {
  const bgCanvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
  if (bgCanvas) {
    generatePaperTexture(bgCanvas);
    window.addEventListener('resize', () => generatePaperTexture(bgCanvas));
  }

  const scrollCanvas = document.getElementById('scrollCanvas') as HTMLCanvasElement;
  if (!scrollCanvas) {
    console.error('Canvas element not found');
    return;
  }

  const scroll = new AncientScroll(scrollCanvas);

  const progressFill = document.getElementById('progressFill') as HTMLElement;
  const progressLabel = document.getElementById('progressLabel') as HTMLElement;
  const progressAnimator = new ProgressAnimator(progressFill, progressLabel);

  const storyPanel = document.getElementById('storyPanel') as HTMLElement;
  const storyTitle = document.getElementById('storyTitle') as HTMLElement;
  const storyContent = document.getElementById('storyContent') as HTMLElement;
  const listenBtn = document.getElementById('listenBtn') as HTMLElement;
  const soundWave = document.getElementById('soundWave') as HTMLElement;
  const storyAnimator = new StoryAnimator(
    storyPanel,
    storyTitle,
    storyContent,
    listenBtn,
    soundWave
  );

  const scrollContainer = document.getElementById('scrollContainer') as HTMLElement;
  const particleSystem = new ParticleSystem(scrollContainer);

  const stepBtns = document.querySelectorAll<HTMLButtonElement>('.step-btn');

  scroll.setOnProgressChange((state: ScrollState) => {
    progressAnimator.updateProgress(state.totalProgress);
  });

  scroll.setOnStepComplete((stepIndex: number) => {
    storyAnimator.showStory(stepIndex);

    if (stepIndex < stepBtns.length - 1) {
      const nextBtn = stepBtns[stepIndex + 1];
      nextBtn.classList.remove('locked');
    }
  });

  scroll.setOnRepairSpark((x: number, y: number) => {
    const frameEl = scrollCanvas.closest('.scroll-frame');
    if (frameEl) {
      const rect = frameEl.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      const offsetX = rect.left - containerRect.left;
      const offsetY = rect.top - containerRect.top;
      particleSystem.spawnParticles(offsetX + x, offsetY + y, 8);
    }
  });

  stepBtns.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('locked')) return;

      stepBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      scroll.setStep(index);
      scroll.clearRepairLayer();

      if (isStepCompleted(index)) {
        storyAnimator.showStory(index);
      } else {
        storyAnimator.hideStory();
      }
    });
  });

  function isStepCompleted(stepIndex: number): boolean {
    const state = scroll.getState();
    const types = ['tear', 'stain', 'character'];
    const currentType = types[stepIndex] as 'tear' | 'stain' | 'character';
    const typeRegions = state.damageRegions.filter(r => r.type === currentType);
    return typeRegions.length > 0 && typeRegions.every(r => r.repaired);
  }

  scroll.init();

  const handleResize = () => {
    scroll.resize();
    if (bgCanvas) generatePaperTexture(bgCanvas);
    particleSystem.resize();
  };

  let resizeTimeout: number;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(handleResize, 100);
  });

  progressAnimator.updateProgress(0);
}

document.addEventListener('DOMContentLoaded', init);
