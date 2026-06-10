import { ToolType, ChemicalType, DropperState } from './types';

export interface ToolEventCallbacks {
  onToolDragStart: (tool: ToolType) => void;
  onToolDragEnd: () => void;
  onLabDrop: (tool: ToolType, x: number, y: number) => void;
  onChemicalSelect: (chemical: ChemicalType) => void;
  onLabChemicalDrop: (chemical: ChemicalType, containerId: string | null, x: number, y: number) => void;
  onContainerClick: (containerId: string) => void;
  onLampClick: (lampId: string) => void;
  onLabCanvasClick: (x: number, y: number) => void;
  onLabCanvasMouseMove: (x: number, y: number) => void;
  onActionSelect: (action: 'heat' | 'cool') => void;
}

export class ToolManager {
  private toolbar: HTMLElement;
  private labArea: HTMLElement;
  private canvas: HTMLCanvasElement;
  private callbacks: ToolEventCallbacks;

  private draggingTool: ToolType | null = null;
  private draggingChemical: ChemicalType | null = null;
  private selectedChemical: ChemicalType | null = null;
  private selectedAction: 'heat' | 'cool' | null = null;

  constructor(
    toolbar: HTMLElement,
    labArea: HTMLElement,
    canvas: HTMLCanvasElement,
    callbacks: ToolEventCallbacks
  ) {
    this.toolbar = toolbar;
    this.labArea = labArea;
    this.canvas = canvas;
    this.callbacks = callbacks;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const toolItems = this.toolbar.querySelectorAll('[data-tool]');
    toolItems.forEach((item) => {
      item.addEventListener('dragstart', (e) => this.handleToolDragStart(e));
      item.addEventListener('dragend', () => this.handleToolDragEnd());
    });

    const chemicalItems = this.toolbar.querySelectorAll('[data-chemical]');
    chemicalItems.forEach((item) => {
      item.addEventListener('click', (e) => this.handleChemicalClick(e));
    });

    const actionItems = this.toolbar.querySelectorAll('[data-action]');
    actionItems.forEach((item) => {
      item.addEventListener('click', (e) => this.handleActionClick(e));
    });

    this.labArea.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    this.labArea.addEventListener('drop', (e) => this.handleLabDrop(e));

    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
  }

  private handleToolDragStart(e: Event): void {
    const target = e.target as HTMLElement;
    const toolItem = target.closest('[data-tool]') as HTMLElement;
    if (!toolItem) return;

    const tool = toolItem.dataset.tool as ToolType;
    this.draggingTool = tool;
    toolItem.classList.add('dragging');
    this.callbacks.onToolDragStart(tool);

    const dragEvent = e as DragEvent;
    if (dragEvent.dataTransfer) {
      dragEvent.dataTransfer.effectAllowed = 'copy';
      dragEvent.dataTransfer.setData('text/plain', tool);
    }
  }

  private handleToolDragEnd(): void {
    const dragging = this.toolbar.querySelector('.dragging');
    if (dragging) dragging.classList.remove('dragging');
    this.draggingTool = null;
    this.callbacks.onToolDragEnd();
  }

  private handleLabDrop(e: DragEvent): void {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.draggingTool) {
      this.callbacks.onLabDrop(this.draggingTool, x, y);
    }

    this.draggingTool = null;
    this.draggingChemical = null;
  }

  private handleChemicalClick(e: Event): void {
    const target = e.target as HTMLElement;
    const chemItem = target.closest('[data-chemical]') as HTMLElement;
    if (!chemItem) return;

    const chemical = chemItem.dataset.chemical as ChemicalType;

    this.toolbar.querySelectorAll('[data-chemical]').forEach((el) => {
      (el as HTMLElement).style.borderColor = 'transparent';
      (el as HTMLElement).style.background = 'white';
    });

    if (this.selectedChemical === chemical) {
      this.selectedChemical = null;
    } else {
      this.selectedChemical = chemical;
      chemItem.style.borderColor = '#e67e22';
      chemItem.style.background = '#fef9f3';
      this.callbacks.onChemicalSelect(chemical);
    }
  }

  private handleActionClick(e: Event): void {
    const target = e.target as HTMLElement;
    const actionItem = target.closest('[data-action]') as HTMLElement;
    if (!actionItem) return;

    const action = actionItem.dataset.action as 'heat' | 'cool';

    this.toolbar.querySelectorAll('[data-action]').forEach((el) => {
      (el as HTMLElement).style.borderColor = 'transparent';
      (el as HTMLElement).style.background = 'white';
    });

    if (this.selectedAction === action) {
      this.selectedAction = null;
    } else {
      this.selectedAction = action;
      actionItem.style.borderColor = '#e67e22';
      actionItem.style.background = '#fef9f3';
      this.callbacks.onActionSelect(action);
    }
  }

  private handleCanvasClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.callbacks.onLabCanvasClick(x, y);
  }

  private handleCanvasMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.callbacks.onLabCanvasMouseMove(x, y);
  }

  getSelectedChemical(): ChemicalType | null {
    return this.selectedChemical;
  }

  clearSelectedChemical(): void {
    this.selectedChemical = null;
    this.toolbar.querySelectorAll('[data-chemical]').forEach((el) => {
      (el as HTMLElement).style.borderColor = 'transparent';
      (el as HTMLElement).style.background = 'white';
    });
  }

  getSelectedAction(): 'heat' | 'cool' | null {
    return this.selectedAction;
  }

  clearSelectedAction(): void {
    this.selectedAction = null;
    this.toolbar.querySelectorAll('[data-action]').forEach((el) => {
      (el as HTMLElement).style.borderColor = 'transparent';
      (el as HTMLElement).style.background = 'white';
    });
  }

  getCanvasRelativeCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }
}
