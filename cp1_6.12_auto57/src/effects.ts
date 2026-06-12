export function playShakeAnimation(element: HTMLElement, duration: number = 300, shakeDistance: number = 5, shakeCount: number = 3): void {
  const originalTransform = element.style.transform;
  const interval = duration / (shakeCount * 2);
  let currentShake = 0;

  const shake = () => {
    if (currentShake >= shakeCount * 2) {
      element.style.transform = originalTransform;
      return;
    }

    const direction = currentShake % 2 === 0 ? 1 : -1;
    const offset = (shakeCount - Math.floor(currentShake / 2)) * shakeDistance * direction;
    element.style.transform = `${originalTransform} translateX(${offset}px)`;
    currentShake++;
    setTimeout(shake, interval);
  };

  shake();
}

export function playRedFlash(element: HTMLElement, flashCount: number = 3, interval: number = 100): void {
  let count = 0;
  const originalBoxShadow = element.style.boxShadow;
  const originalBorderColor = element.style.borderColor;

  const flash = () => {
    if (count >= flashCount * 2) {
      element.style.boxShadow = originalBoxShadow;
      element.style.borderColor = originalBorderColor;
      return;
    }

    if (count % 2 === 0) {
      element.style.boxShadow = '0 0 20px #FF0040, inset 0 0 20px rgba(255, 0, 64, 0.3)';
      element.style.borderColor = '#FF0040';
    } else {
      element.style.boxShadow = originalBoxShadow;
      element.style.borderColor = originalBorderColor;
    }

    count++;
    setTimeout(flash, interval);
  };

  flash();
}

export function playWhiteFlash(element: HTMLElement, duration: number = 200): void {
  const flash = document.createElement('div');
  flash.style.position = 'absolute';
  flash.style.top = '0';
  flash.style.left = '0';
  flash.style.width = '100%';
  flash.style.height = '100%';
  flash.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
  flash.style.opacity = '1';
  flash.style.transition = `opacity ${duration}ms ease-out`;
  flash.style.pointerEvents = 'none';
  flash.style.zIndex = '10';
  element.appendChild(flash);

  requestAnimationFrame(() => {
    flash.style.opacity = '0';
  });

  setTimeout(() => {
    flash.remove();
  }, duration);
}

export function playGoldGlow(element: HTMLElement, duration: number = 500): void {
  const originalBoxShadow = element.style.boxShadow;
  const originalBorderColor = element.style.borderColor;

  element.style.boxShadow = '0 0 30px #FFD700, 0 0 60px #FFD700, inset 0 0 20px rgba(255, 215, 0, 0.3)';
  element.style.borderColor = '#FFD700';

  setTimeout(() => {
    element.style.boxShadow = originalBoxShadow;
    element.style.borderColor = originalBorderColor;
  }, duration);
}

export function createLightningBolt(
  container: HTMLElement,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  duration: number = 500
): void {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'absolute';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '100';

  const padding = 20;
  const left = Math.min(startX, endX) - padding;
  const top = Math.min(startY, endY) - padding;
  const width = Math.abs(endX - startX) + padding * 2;
  const height = Math.abs(endY - startY) + padding * 2;

  canvas.style.left = `${left}px`;
  canvas.style.top = `${top}px`;
  canvas.width = width * window.devicePixelRatio;
  canvas.height = height * window.devicePixelRatio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  container.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const sx = startX - left;
  const sy = startY - top;
  const ex = endX - left;
  const ey = endY - top;

  const segments = 8;
  const points: { x: number; y: number }[] = [];

  points.push({ x: sx, y: sy });
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const baseX = sx + (ex - sx) * t;
    const baseY = sy + (ey - sy) * t;
    const offset = (Math.random() - 0.5) * 30;
    const perpX = -(ey - sy) / Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2);
    const perpY = (ex - sx) / Math.sqrt((ex - sx) ** 2 + (ey - sy) ** 2);
    points.push({
      x: baseX + perpX * offset,
      y: baseY + perpY * offset
    });
  }
  points.push({ x: ex, y: ey });

  let startTime: number | null = null;
  const totalDuration = duration;

  const animate = (timestamp: number) => {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / totalDuration, 1);

    ctx.clearRect(0, 0, width, height);

    const alpha = progress < 0.8 ? 1 : 1 - (progress - 0.8) / 0.2;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 20;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    ctx.stroke();

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      canvas.remove();
    }
  };

  requestAnimationFrame(animate);
}

export function createHaloPulse(element: HTMLElement): void {
  element.style.animation = 'none';
  element.offsetHeight;
  element.style.animation = 'halo-pulse 2s ease-in-out infinite';
}

export function getElementCenter(element: HTMLElement, container: HTMLElement): { x: number; y: number } {
  const elementRect = element.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  return {
    x: elementRect.left + elementRect.width / 2 - containerRect.left,
    y: elementRect.top + elementRect.height / 2 - containerRect.top
  };
}
