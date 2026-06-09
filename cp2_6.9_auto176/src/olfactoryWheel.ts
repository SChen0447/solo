import { ScentCategory, ScentSubCategory, ScentDescriptor, SCENT_CATEGORIES } from './types';

export interface WheelSelection {
  category: ScentCategory;
  subCategory: ScentSubCategory;
  descriptor: ScentDescriptor;
}

export interface OlfactoryWheelHandle {
  destroy: () => void;
  resetSelection: () => void;
}

export function createOlfactoryWheel(
  container: HTMLElement,
  onSelect: (selection: WheelSelection) => void
): OlfactoryWheelHandle {
  const wrapper = document.createElement('div');
  wrapper.className = 'wheel-wrapper';
  wrapper.style.position = 'relative';
  wrapper.style.width = '100%';
  wrapper.style.height = '100%';
  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.justifyContent = 'center';
  container.appendChild(wrapper);

  const size = Math.min(wrapper.clientWidth, wrapper.clientHeight, 500);
  const centerX = size / 2;
  const centerY = size / 2;

  const INNER_RADIUS = 60;
  const MIDDLE_RADIUS = 130;
  const OUTER_RADIUS = 210;
  const RING_WIDTH = 70;

  const canvas = document.createElement('canvas');
  canvas.width = size * window.devicePixelRatio;
  canvas.height = size * window.devicePixelRatio;
  canvas.style.width = size + 'px';
  canvas.style.height = size + 'px';
  const ctx = canvas.getContext('2d')!;
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

  wrapper.appendChild(canvas);

  let selectedCategory: ScentCategory | null = null;
  let selectedSubCategory: ScentSubCategory | null = null;
  let rotationAngle = 0;
  let isDragging = false;
  let lastAngle = 0;
  let hoveredInner: number = -1;
  let hoveredMiddle: number = -1;
  let hoveredOuter: number = -1;

  function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  }

  function getAngleFromEvent(e: MouseEvent | TouchEvent): number {
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = clientX - rect.left - centerX;
    const y = clientY - rect.top - centerY;
    return (Math.atan2(y, x) * 180) / Math.PI + 90;
  }

  function getRadiusFromEvent(e: MouseEvent | TouchEvent): number {
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = clientX - rect.left - centerX;
    const y = clientY - rect.top - centerY;
    return Math.sqrt(x * x + y * y);
  }

  function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  }

  function drawArc(
    cx: number,
    cy: number,
    innerR: number,
    outerR: number,
    startAngle: number,
    endAngle: number,
    fillColor: string,
    strokeColor: string = 'rgba(255,255,255,0.3)',
    isHovered: boolean = false,
    isSelected: boolean = false
  ): void {
    ctx.beginPath();
    const startInner = polarToCartesian(cx, cy, innerR, startAngle);
    ctx.moveTo(startInner.x, startInner.y);

    const startOuter = polarToCartesian(cx, cy, outerR, startAngle);
    ctx.lineTo(startOuter.x, startOuter.y);

    const sweepAngle = endAngle - startAngle;
    const rad = ((sweepAngle - 90) * Math.PI) / 180;
    const rad2 = ((startAngle - 90) * Math.PI) / 180;
    ctx.arc(cx, cy, outerR, rad2, rad);

    const endInner = polarToCartesian(cx, cy, innerR, endAngle);
    ctx.lineTo(endInner.x, endInner.y);

    const rad3 = ((endAngle - 90) * Math.PI) / 180;
    const rad4 = ((startAngle - 90) * Math.PI) / 180;
    ctx.arc(cx, cy, innerR, rad3, rad4, true);

    ctx.closePath();

    let fill = fillColor;
    if (isSelected) {
      fill = fillColor;
      ctx.globalAlpha = 0.9;
    } else if (isHovered) {
      ctx.globalAlpha = 0.7;
    } else {
      ctx.globalAlpha = 0.45;
    }
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawRotatedText(text: string, cx: number, cy: number, r: number, angleDeg: number, color: string): void {
    const pos = polarToCartesian(cx, cy, r, angleDeg);
    ctx.save();
    ctx.translate(pos.x, pos.y);
    const rotRad = (angleDeg * Math.PI) / 180;
    ctx.rotate(rotRad);
    ctx.fillStyle = color;
    ctx.font = '13px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 3;
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  function normalizeAngle(angle: number): number {
    let a = angle % 360;
    if (a < 0) a += 360;
    return a;
  }

  function getSegmentFromAngle(angle: number, totalSegments: number): number {
    const normalized = normalizeAngle(angle + rotationAngle);
    const segmentAngle = 360 / totalSegments;
    return Math.floor(normalized / segmentAngle);
  }

  function render(): void {
    ctx.clearRect(0, 0, size, size);

    const categories = SCENT_CATEGORIES;
    const catCount = categories.length;
    const catAngle = 360 / catCount;

    for (let i = 0; i < catCount; i++) {
      const start = i * catAngle - rotationAngle;
      const end = start + catAngle;
      const cat = categories[i];
      const isSelected = selectedCategory?.id === cat.id;
      const isHovered = hoveredInner === i;

      drawArc(centerX, centerY, INNER_RADIUS, MIDDLE_RADIUS, start, end, cat.color, 'rgba(255,255,255,0.4)', isHovered, isSelected);
      drawRotatedText(cat.name, centerX, centerY, (INNER_RADIUS + MIDDLE_RADIUS) / 2, start + catAngle / 2, '#fff');
    }

    if (selectedCategory) {
      const subs = selectedCategory.subCategories;
      const subCount = subs.length;
      const subAngle = 360 / subCount;

      for (let i = 0; i < subCount; i++) {
        const start = i * subAngle - rotationAngle;
        const end = start + subAngle;
        const sub = subs[i];
        const isSelected = selectedSubCategory?.id === sub.id;
        const isHovered = hoveredMiddle === i;

        drawArc(centerX, centerY, MIDDLE_RADIUS, OUTER_RADIUS, start, end, selectedCategory.color, 'rgba(255,255,255,0.3)', isHovered, isSelected);
        drawRotatedText(sub.name, centerX, centerY, (MIDDLE_RADIUS + OUTER_RADIUS) / 2, start + subAngle / 2, '#fff');
      }
    }

    if (selectedCategory && selectedSubCategory) {
      const descriptors = selectedSubCategory.descriptors;
      const descCount = descriptors.length;
      const descAngle = 360 / descCount;
      const outerOuter = OUTER_RADIUS + RING_WIDTH * 0.7;

      for (let i = 0; i < descCount; i++) {
        const start = i * descAngle - rotationAngle;
        const end = start + descAngle;
        const isHovered = hoveredOuter === i;

        drawArc(centerX, centerY, OUTER_RADIUS, outerOuter, start, end, selectedCategory.color, 'rgba(255,255,255,0.25)', isHovered, false);
        drawRotatedText(descriptors[i].name, centerX, centerY, (OUTER_RADIUS + outerOuter) / 2, start + descAngle / 2, '#fff');
      }
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, INNER_RADIUS - 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(42, 42, 64, 0.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#EAEAEA';
    ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('气味轮盘', centerX, centerY - 8);
    ctx.fillStyle = '#A0A0B0';
    ctx.font = '11px "Microsoft YaHei", sans-serif';
    ctx.fillText('点击选择', centerX, centerY + 12);
  }

  function handleClick(e: MouseEvent): void {
    const radius = getRadiusFromEvent(e);
    const angle = getAngleFromEvent(e);

    if (radius >= INNER_RADIUS && radius < MIDDLE_RADIUS) {
      const idx = getSegmentFromAngle(angle, SCENT_CATEGORIES.length);
      selectedCategory = SCENT_CATEGORIES[idx];
      selectedSubCategory = null;
      hoveredInner = -1;
      render();
    } else if (radius >= MIDDLE_RADIUS && radius < OUTER_RADIUS && selectedCategory) {
      const idx = getSegmentFromAngle(angle, selectedCategory.subCategories.length);
      selectedSubCategory = selectedCategory.subCategories[idx];
      hoveredMiddle = -1;
      render();
    } else if (radius >= OUTER_RADIUS && selectedCategory && selectedSubCategory) {
      const outerOuter = OUTER_RADIUS + RING_WIDTH * 0.7;
      if (radius < outerOuter) {
        const idx = getSegmentFromAngle(angle, selectedSubCategory.descriptors.length);
        const descriptor = selectedSubCategory.descriptors[idx];
        onSelect({
          category: selectedCategory,
          subCategory: selectedSubCategory,
          descriptor
        });
      }
    }
  }

  function handleMouseMove(e: MouseEvent): void {
    if (isDragging) {
      const currentAngle = getAngleFromEvent(e);
      rotationAngle += currentAngle - lastAngle;
      lastAngle = currentAngle;
      render();
      return;
    }

    const radius = getRadiusFromEvent(e);
    const angle = getAngleFromEvent(e);

    hoveredInner = -1;
    hoveredMiddle = -1;
    hoveredOuter = -1;

    if (radius >= INNER_RADIUS && radius < MIDDLE_RADIUS) {
      hoveredInner = getSegmentFromAngle(angle, SCENT_CATEGORIES.length);
      canvas.style.cursor = 'pointer';
    } else if (radius >= MIDDLE_RADIUS && radius < OUTER_RADIUS && selectedCategory) {
      hoveredMiddle = getSegmentFromAngle(angle, selectedCategory.subCategories.length);
      canvas.style.cursor = 'pointer';
    } else if (radius >= OUTER_RADIUS && selectedCategory && selectedSubCategory) {
      const outerOuter = OUTER_RADIUS + RING_WIDTH * 0.7;
      if (radius < outerOuter) {
        hoveredOuter = getSegmentFromAngle(angle, selectedSubCategory.descriptors.length);
        canvas.style.cursor = 'pointer';
      } else {
        canvas.style.cursor = 'default';
      }
    } else if (radius < INNER_RADIUS) {
      canvas.style.cursor = 'grab';
    } else {
      canvas.style.cursor = 'default';
    }

    render();
  }

  function handleMouseDown(e: MouseEvent): void {
    const radius = getRadiusFromEvent(e);
    if (radius < INNER_RADIUS) {
      isDragging = true;
      lastAngle = getAngleFromEvent(e);
      canvas.style.cursor = 'grabbing';
    }
  }

  function handleMouseUp(): void {
    isDragging = false;
    canvas.style.cursor = 'default';
    handleMouseMove({ clientX: -9999, clientY: -9999 } as MouseEvent);
  }

  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mouseleave', () => {
    hoveredInner = -1;
    hoveredMiddle = -1;
    hoveredOuter = -1;
    render();
  });

  render();

  function handleResize(): void {
    const newSize = Math.min(wrapper.clientWidth, wrapper.clientHeight, 500);
    if (newSize !== size) {
      // Re-render with new size if needed
    }
  }
  window.addEventListener('resize', handleResize);

  return {
    destroy: () => {
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
      wrapper.remove();
    },
    resetSelection: () => {
      selectedCategory = null;
      selectedSubCategory = null;
      render();
    }
  };
}
