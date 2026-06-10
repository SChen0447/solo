import { parseCodeToFlow, updateNodeCode, type FlowData, type FlowNode } from './astParser';
import { FlowRenderer } from './flowRenderer';
import { EditorPanel } from './editorPanel';

class App {
  private renderer: FlowRenderer;
  private editorPanel: EditorPanel;
  private flowData: FlowData = { nodes: [], edges: [] };
  private nodeInfoPanel: HTMLDivElement;
  private nodeCodeEdit: HTMLTextAreaElement;
  private applyBtn: HTMLButtonElement;
  private currentEditingNodeId: string | null = null;
  private resetViewBtn: HTMLButtonElement;

  constructor() {
    const canvas = document.getElementById('flowCanvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas not found');

    this.nodeInfoPanel = document.getElementById('nodeInfoPanel') as HTMLDivElement;
    this.nodeCodeEdit = document.getElementById('nodeCodeEdit') as HTMLTextAreaElement;
    this.applyBtn = document.getElementById('applyNodeEditBtn') as HTMLButtonElement;
    this.resetViewBtn = document.getElementById('resetViewBtn') as HTMLButtonElement;

    this.renderer = new FlowRenderer(canvas, {
      onNodeSelect: this.handleNodeSelect,
      onNodeDoubleClick: this.handleNodeDoubleClick,
      onNodePositionChange: this.handleNodePositionChange
    });

    this.editorPanel = new EditorPanel({
      onGenerate: this.handleGenerate
    });

    this.setupUIEvents();
    this.handleGenerate(this.editorPanel.getCode());
  }

  private setupUIEvents(): void {
    this.applyBtn.addEventListener('click', () => {
      this.applyNodeEdit();
    });

    this.resetViewBtn.addEventListener('click', () => {
      this.renderer.resetView();
    });
  }

  private handleGenerate = (code: string): void => {
    try {
      this.flowData = parseCodeToFlow(code);
      this.renderer.setFlowData(this.flowData);
      this.hideNodeInfoPanel();
    } catch (e) {
      console.error('Parse error:', e);
    }
  };

  private handleNodeSelect = (node: FlowNode | null): void => {
    if (node) {
      this.showNodeInfoPanel(node);
    } else {
      this.hideNodeInfoPanel();
    }
  };

  private handleNodeDoubleClick = (node: FlowNode): void => {
    this.currentEditingNodeId = node.id;
    this.showNodeInfoPanel(node);
    this.nodeCodeEdit.focus();
    this.nodeCodeEdit.select();
  };

  private handleNodePositionChange = (nodeId: string, x: number, y: number): void => {
    const node = this.flowData.nodes.find(n => n.id === nodeId);
    if (node) {
      node.x = x;
      node.y = y;
    }
  };

  private showNodeInfoPanel(node: FlowNode): void {
    this.currentEditingNodeId = node.id;
    this.nodeCodeEdit.value = node.code;
    this.nodeInfoPanel.classList.add('visible');
  }

  private hideNodeInfoPanel(): void {
    this.currentEditingNodeId = null;
    this.nodeInfoPanel.classList.remove('visible');
  }

  private applyNodeEdit(): void {
    if (!this.currentEditingNodeId) return;

    const newCode = this.nodeCodeEdit.value;
    this.flowData = updateNodeCode(this.currentEditingNodeId, newCode, this.flowData);

    const node = this.flowData.nodes.find(n => n.id === this.currentEditingNodeId);
    if (node) {
      this.renderer.updateNode(node.id, { label: node.label, code: node.code });
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
