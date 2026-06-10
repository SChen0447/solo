import { SceneSetup } from './sceneSetup';
import { NetworkGraph, type GraphConfig, type NodeData } from './networkGraph';
import { ControlsUI } from './controlsUI';

class App {
  private container: HTMLElement;
  private sceneSetup: SceneSetup;
  private networkGraph: NetworkGraph;
  private controlsUI: ControlsUI;
  private hoveredNodeId: string | null = null;
  private animationFrameId: number | null = null;

  constructor() {
    const container = document.getElementById('app');
    if (!container) {
      throw new Error('Container #app not found');
    }
    this.container = container;

    this.sceneSetup = new SceneSetup(this.container);
    this.sceneSetup.camera.userData.canvas = this.sceneSetup.renderer.domElement;

    this.networkGraph = new NetworkGraph(this.sceneSetup.scene);

    this.controlsUI = new ControlsUI(
      this.container,
      (config) => this.handleConfigChange(config),
      (nodeId) => this.handleFocusNode(nodeId)
    );

    this.bindEvents();
    this.animate();
  }

  private bindEvents(): void {
    const canvas = this.sceneSetup.renderer.domElement;

    canvas.addEventListener('mousemove', (e) => {
      const nodeId = this.networkGraph.getIntersectedNode(
        e.clientX,
        e.clientY,
        this.sceneSetup.camera
      );

      if (nodeId !== this.hoveredNodeId) {
        this.hoveredNodeId = nodeId;
        this.networkGraph.handleNodeHover(nodeId);

        if (nodeId) {
          const data = this.networkGraph.getNodeInfo(nodeId);
          if (data) {
            this.controlsUI.showNodePanel(data, e.clientX, e.clientY);
          }
          canvas.style.cursor = 'pointer';
        } else {
          this.controlsUI.hideNodePanel();
          canvas.style.cursor = 'grab';
        }
      } else if (nodeId) {
        const data = this.networkGraph.getNodeInfo(nodeId);
        if (data) {
          this.controlsUI.showNodePanel(data, e.clientX, e.clientY);
        }
      }
    });

    canvas.addEventListener('mouseleave', () => {
      if (this.hoveredNodeId) {
        this.hoveredNodeId = null;
        this.networkGraph.handleNodeHover(null);
        this.controlsUI.hideNodePanel();
      }
    });

    canvas.addEventListener('click', (e) => {
      const nodeId = this.networkGraph.getIntersectedNode(
        e.clientX,
        e.clientY,
        this.sceneSetup.camera
      );

      if (nodeId) {
        const data = this.networkGraph.handleNodeClick(nodeId);
        if (data) {
          this.controlsUI.updateCallChain(data);
          this.controlsUI.showNodePanel(data, e.clientX, e.clientY);
        }
      }
    });

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const nodeId = this.networkGraph.getIntersectedNode(
          touch.clientX,
          touch.clientY,
          this.sceneSetup.camera
        );
        if (nodeId) {
          const data = this.networkGraph.handleNodeClick(nodeId);
          if (data) {
            this.controlsUI.updateCallChain(data);
            this.controlsUI.showNodePanel(data, touch.clientX, touch.clientY);
            this.hoveredNodeId = nodeId;
            this.networkGraph.handleNodeHover(nodeId);
          }
        }
      }
    }, { passive: true });

    window.addEventListener('resize', () => {
      const isMobile = window.innerWidth < 768;
      this.networkGraph.setMobileMode(isMobile);
    });
  }

  private handleConfigChange(config: Partial<GraphConfig>): void {
    if (config.nodeScale !== undefined) {
      this.networkGraph.setNodeScale(config.nodeScale);
    }
    if (config.lineOpacity !== undefined) {
      this.networkGraph.setLineOpacity(config.lineOpacity);
    }
    if (config.rotationSpeed !== undefined) {
      this.networkGraph.setRotationSpeed(config.rotationSpeed);
    }
  }

  private handleFocusNode(nodeId: string): void {
    const nodeIds = Array.from(this.networkGraph.nodes.keys());
    if (!nodeId && nodeIds.length > 0) {
      const randomIdx = Math.floor(Math.random() * nodeIds.length);
      const targetId = nodeIds[randomIdx];
      const pos = this.networkGraph.getNodePosition(targetId);
      if (pos) {
        this.sceneSetup.focusOnNode(pos, 1500);
        const data = this.networkGraph.getNodeInfo(targetId);
        if (data) {
          this.controlsUI.updateCallChain(data);
        }
      }
      return;
    }

    if (nodeId) {
      const pos = this.networkGraph.getNodePosition(nodeId);
      if (pos) {
        this.sceneSetup.focusOnNode(pos, 1500);
      }
    }
  }

  private animate(): void {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    const now = performance.now();

    this.networkGraph.update(now);
    this.sceneSetup.updateFocusAnimation(now);
    this.sceneSetup.controls.update();
    this.sceneSetup.renderer.render(this.sceneSetup.scene, this.sceneSetup.camera);
  }

  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

const app = new App();
(window as unknown as { __app?: App }).__app = app;
