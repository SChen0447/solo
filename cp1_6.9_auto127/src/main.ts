import { SceneManager } from './sceneManager';
import { ParticleSystem, QuantumParticle } from './particleSystem';

const container = document.getElementById('app') as HTMLElement;
const pairCountEl = document.getElementById('pair-count') as HTMLElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;

const sceneManager = new SceneManager(container);
const particleSystem = new ParticleSystem(sceneManager.scene, sceneManager.camera);

let currentPairCount = 0;

particleSystem.onEntanglementCountChange = (count: number) => {
  currentPairCount = count;
  sceneManager.updateEntanglementState(count);
  pairCountEl.textContent = String(count);
  pairCountEl.classList.add('pulse');
  setTimeout(() => {
    pairCountEl.classList.remove('pulse');
  }, 100);
};

resetBtn.addEventListener('click', () => {
  particleSystem.reset();
  sceneManager.reset();
  currentPairCount = 0;
  pairCountEl.textContent = '0';
});

let isDragging = false;
let dragStartParticle: QuantumParticle | null = null;
let dragCurrentParticle: QuantumParticle | null = null;
let hasMovedSignificantly = false;
let mouseDownX = 0;
let mouseDownY = 0;

const DRAG_THRESHOLD = 5;

container.addEventListener('mousedown', (e: MouseEvent) => {
  if (e.button !== 0) return;

  mouseDownX = e.clientX;
  mouseDownY = e.clientY;
  hasMovedSignificantly = false;

  const particle = particleSystem.getParticleAtScreenPoint(
    e.clientX,
    e.clientY,
    container.clientWidth,
    container.clientHeight
  );

  if (particle) {
    isDragging = true;
    dragStartParticle = particle;
    dragCurrentParticle = particle;
    particleSystem.startDrag(particle);
  }
});

container.addEventListener('mousemove', (e: MouseEvent) => {
  const particle = particleSystem.getParticleAtScreenPoint(
    e.clientX,
    e.clientY,
    container.clientWidth,
    container.clientHeight
  );

  if (!isDragging) {
    particleSystem.setParticleHovered(particle);
    container.style.cursor = particle ? 'pointer' : 'crosshair';
  } else {
    const moveDist = Math.sqrt(
      Math.pow(e.clientX - mouseDownX, 2) + Math.pow(e.clientY - mouseDownY, 2)
    );
    if (moveDist > DRAG_THRESHOLD) {
      hasMovedSignificantly = true;
    }

    if (dragCurrentParticle) {
      const worldPos = particleSystem.screenToWorld(
        e.clientX,
        e.clientY,
        container.clientWidth,
        container.clientHeight,
        dragCurrentParticle.mesh.position.z
      );
      particleSystem.dragParticle(dragCurrentParticle, worldPos);
    }
  }
});

container.addEventListener('mouseup', (e: MouseEvent) => {
  if (e.button !== 0) return;

  if (isDragging && dragStartParticle) {
    particleSystem.endDrag(dragStartParticle);

    if (hasMovedSignificantly) {
      const targetParticle = particleSystem.getParticleAtScreenPoint(
        e.clientX,
        e.clientY,
        container.clientWidth,
        container.clientHeight
      );

      if (targetParticle && targetParticle.id !== dragStartParticle.id) {
        particleSystem.createEntanglement(dragStartParticle, targetParticle);
        particleSystem.triggerPartnerColorSwap(dragStartParticle);
      }
    } else {
      particleSystem.triggerPartnerColorSwap(dragStartParticle);
    }
  } else {
    const particle = particleSystem.getParticleAtScreenPoint(
      e.clientX,
      e.clientY,
      container.clientWidth,
      container.clientHeight
    );

    if (!particle) {
      const worldPos = particleSystem.screenToWorld(
        e.clientX,
        e.clientY,
        container.clientWidth,
        container.clientHeight,
        (Math.random() - 0.5) * 4
      );
      particleSystem.createParticle(worldPos);
    }
  }

  isDragging = false;
  dragStartParticle = null;
  dragCurrentParticle = null;
});

container.addEventListener('mouseleave', () => {
  if (isDragging && dragStartParticle) {
    particleSystem.endDrag(dragStartParticle);
  }
  isDragging = false;
  dragStartParticle = null;
  dragCurrentParticle = null;
  particleSystem.setParticleHovered(null);
  container.style.cursor = 'crosshair';
});

let lastTime = performance.now();
let time = 0;

function animate() {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  time += delta;

  sceneManager.update(delta, time);
  particleSystem.update(delta, time);
  sceneManager.render();
}

animate();
