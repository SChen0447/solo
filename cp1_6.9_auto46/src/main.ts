import p5 from 'p5';
import { FlowFieldRenderer } from './flowField';
import { ColorPalette } from './colorPalette';
import { InteractionManager } from './interaction';

const ASPECT_RATIO = 16 / 9;

let canvasWidth = 1920;
let canvasHeight = 1080;

const sketch = (p: p5) => {
  let colorPalette: ColorPalette;
  let interactionManager: InteractionManager;
  let flowFieldRenderer: FlowFieldRenderer;
  let lastSeasonTransition: number;
  const SEASON_TRANSITION_INTERVAL = 30000;
  let transitionOverlayAlpha: number;
  let isFirstFrame: boolean;

  const calculateCanvasSize = (): { width: number; height: number } => {
    const windowRatio = p.windowWidth / p.windowHeight;
    let w: number;
    let h: number;

    if (windowRatio > ASPECT_RATIO) {
      h = p.windowHeight;
      w = h * ASPECT_RATIO;
    } else {
      w = p.windowWidth;
      h = w / ASPECT_RATIO;
    }

    return { width: Math.floor(w), height: Math.floor(h) };
  };

  p.setup = () => {
    const size = calculateCanvasSize();
    canvasWidth = size.width;
    canvasHeight = size.height;

    const canvas = p.createCanvas(canvasWidth, canvasHeight);
    const container = document.getElementById('canvas-container');
    if (container) {
      canvas.parent(container);
    }

    p.pixelDensity(1);
    p.colorMode(p.HSL, 360, 100, 100, 1);
    p.blendMode(p.BLEND);

    colorPalette = new ColorPalette();
    interactionManager = new InteractionManager(p);
    flowFieldRenderer = new FlowFieldRenderer(p, canvasWidth, canvasHeight, colorPalette, interactionManager);

    interactionManager.setup();

    interactionManager.setOnSpacePressCallback(() => {
    });

    lastSeasonTransition = p.millis();
    transitionOverlayAlpha = 0;
    isFirstFrame = true;

    flowFieldRenderer.drawBackgroundWash();
  };

  p.windowResized = () => {
    const size = calculateCanvasSize();
    canvasWidth = size.width;
    canvasHeight = size.height;
    p.resizeCanvas(canvasWidth, canvasHeight);
    flowFieldRenderer.resize(canvasWidth, canvasHeight);
    p.background(20, 20, 20);
    flowFieldRenderer.drawBackgroundWash();
  };

  p.draw = () => {
    if (isFirstFrame) {
      isFirstFrame = false;
    }

    const now = p.millis();
    if (now - lastSeasonTransition > SEASON_TRANSITION_INTERVAL && !colorPalette.getIsTransitioning()) {
      colorPalette.startSeasonTransition();
      flowFieldRenderer.startSeasonTransition();
      interactionManager.setTransitionState();
      transitionOverlayAlpha = 1;
      lastSeasonTransition = now;
    }

    colorPalette.update();
    interactionManager.update();
    flowFieldRenderer.update();

    if (colorPalette.getIsTransitioning()) {
      interactionManager.setTransitionState();
    }

    flowFieldRenderer.draw();

    if (transitionOverlayAlpha > 0) {
      drawTransitionOverlay();
      transitionOverlayAlpha = p.lerp(transitionOverlayAlpha, 0, 0.05);
      if (transitionOverlayAlpha < 0.01) transitionOverlayAlpha = 0;
    }

    drawStatusIndicator();
    drawPaletteIndicator();
  };

  const drawTransitionOverlay = () => {
    const palette = colorPalette.getCurrentPalette();
    const avgColor = palette.colors.reduce(
      (acc, c) => ({
        h: acc.h + c.h / palette.colors.length,
        s: acc.s + c.s / palette.colors.length,
        l: acc.l + c.l / palette.colors.length
      }),
      { h: 0, s: 0, l: 0 }
    );
    p.noStroke();
    p.fill(avgColor.h, avgColor.s, avgColor.l, transitionOverlayAlpha * 0.3);
    p.rect(0, 0, canvasWidth, canvasHeight);
  };

  const drawStatusIndicator = () => {
    const barWidth = 120;
    const barHeight = 24;
    const x = 16;
    const y = 16;

    p.noStroke();
    p.fill(0, 0, 0, 0.3);
    p.rect(x, y, barWidth, barHeight, 4);

    p.fill(0, 0, 100, 1);
    p.textAlign(p.LEFT, p.CENTER);
    p.textSize(12);
    p.textStyle(p.NORMAL);
    p.textFont('sans-serif');
    p.text(interactionManager.getInteractionStateLabel(), x + 10, y + barHeight / 2);
  };

  const drawPaletteIndicator = () => {
    const centerX = canvasWidth - 60;
    const centerY = canvasHeight - 60;
    const radius = 40;

    p.noStroke();
    p.fill(0, 0, 0, 0.4);
    p.ellipse(centerX, centerY, radius * 2 + 10, radius * 2 + 10);

    const palette = colorPalette.getCurrentPalette();
    const numColors = palette.colors.length;
    for (let i = 0; i < numColors; i++) {
      const angle = (i / numColors) * p.TWO_PI - p.HALF_PI;
      const x = centerX + Math.cos(angle) * radius * 0.75;
      const y = centerY + Math.sin(angle) * radius * 0.75;
      const color = palette.colors[i];
      p.fill(color.h, color.s, color.l, 1);
      p.noStroke();
      p.ellipse(x, y, 10, 10);
    }

    p.fill(0, 0, 100, 1);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(16);
    p.textStyle(p.BOLD);
    p.textFont('sans-serif');

    const seasonLabel = colorPalette.getCurrentSeasonLabel();
    p.text(seasonLabel, centerX, centerY - 6);

    p.textSize(10);
    p.textStyle(p.NORMAL);
    const avgHue = Math.round(
      palette.colors.reduce((sum, c) => sum + c.h, 0) / palette.colors.length
    );
    p.text(`H: ${avgHue}°`, centerX, centerY + 12);
  };
};

new p5(sketch);
