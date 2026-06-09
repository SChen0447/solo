import p5 from 'p5';
import { ParticleSystem } from './ParticleSystem';
import { UIPanel } from './UIPanel';

let particleSystem: ParticleSystem;
let uiPanel: UIPanel;

const sketch = (p: p5) => {
  p.setup = () => {
    const canvas = p.createCanvas(p.windowWidth, p.windowHeight);
    canvas.parent('app');
    p.background('#0a0a1a');

    particleSystem = new ParticleSystem(p);
    uiPanel = new UIPanel(p, particleSystem.getParams(), (params) => {
      particleSystem.setParams(params);
    });
  };

  p.draw = () => {
    p.background('#0a0a1a');

    particleSystem.update();
    particleSystem.draw();
    uiPanel.draw();
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    uiPanel.updateLayout();
  };

  p.mousePressed = () => {
    if (uiPanel.handleMousePressed(p.mouseX, p.mouseY)) {
      return;
    }
    if (!uiPanel.isOverPanel(p.mouseX, p.mouseY)) {
      particleSystem.triggerClick(p.mouseX, p.mouseY);
    }
  };

  p.mouseDragged = () => {
    if (uiPanel.handleMouseDragged(p.mouseX, p.mouseY)) {
      return;
    }
  };

  p.mouseReleased = () => {
    uiPanel.handleMouseReleased();
  };

  p.mouseMoved = () => {
    uiPanel.handleMouseMoved(p.mouseX, p.mouseY);
    if (!uiPanel.isOverPanel(p.mouseX, p.mouseY)) {
      particleSystem.setMousePosition(p.mouseX, p.mouseY);
    } else {
      particleSystem.clearMouse();
    }
  };
};

new p5(sketch);
