import * as THREE from 'three';

export function setupScreenshot(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
): void {
  const btn = document.getElementById('screenshot-btn');
  const flash = document.getElementById('flash-overlay');

  if (!btn || !flash) {
    return;
  }

  btn.addEventListener('click', () => {
    flash.classList.remove('flash');
    void flash.offsetWidth;
    flash.classList.add('flash');

    setTimeout(() => {
      takeScreenshot(renderer, scene, camera);
    }, 200);
  });
}

function takeScreenshot(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
): void {
  const prevSize = renderer.getSize(new THREE.Vector2());
  const prevPixelRatio = renderer.getPixelRatio();
  const prevClearColor = new THREE.Color();
  renderer.getClearColor(prevClearColor);
  const prevClearAlpha = renderer.getClearAlpha();

  const width = 1920;
  const height = 1080;

  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.setClearColor('#0A0A1A', 1);
  renderer.render(scene, camera);

  const canvas = renderer.domElement;
  canvas.toBlob((blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = generateFilename();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    renderer.setPixelRatio(prevPixelRatio);
    renderer.setSize(prevSize.x, prevSize.y, false);
    renderer.setClearColor(prevClearColor, prevClearAlpha);
  }, 'image/png');
}

function generateFilename(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `nebula_${yyyy}${mm}${dd}_${hh}${min}${ss}.png`;
}
