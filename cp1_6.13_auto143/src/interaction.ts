import { StageManager } from './stage';
import { PaperPuppet } from './renderer';

export class InteractionManager {
  private stage: StageManager;
  private canvas: HTMLCanvasElement;
  private isDragging: boolean = false;
  private draggedPuppet: PaperPuppet | null = null;
  private dragOffsetX: number = 0;
  private dragOffsetY: number = 0;
  private hasMoved: boolean = false;
  private startX: number = 0;
  private startY: number = 0;

  private scriptBtn: HTMLElement | null = null;
  private sidebar: HTMLElement | null = null;
  private sidebarClose: HTMLElement | null = null;
  private overlay: HTMLElement | null = null;
  private scriptList: HTMLElement | null = null;

  private onScriptSelectCallback: ((scriptId: string) => void) | null = null;

  constructor(stage: StageManager) {
    this.stage = stage;
    this.canvas = stage.getCanvas();
    this.setupCanvasEvents();
    this.setupUIEvents();
  }

  private setupCanvasEvents(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
    
    this.canvas.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd);
  }

  private setupUIEvents(): void {
    this.scriptBtn = document.getElementById('script-btn');
    this.sidebar = document.getElementById('script-sidebar');
    this.sidebarClose = document.getElementById('sidebar-close');
    this.overlay = document.getElementById('overlay');
    this.scriptList = document.getElementById('script-list');

    if (this.scriptBtn) {
      this.scriptBtn.addEventListener('click', this.toggleSidebar);
    }

    if (this.sidebarClose) {
      this.sidebarClose.addEventListener('click', this.closeSidebar);
    }

    if (this.overlay) {
      this.overlay.addEventListener('click', this.closeSidebar);
    }

    if (this.scriptList) {
      const scriptItems = this.scriptList.querySelectorAll('.script-item');
      scriptItems.forEach(item => {
        item.addEventListener('click', () => {
          const scriptId = item.getAttribute('data-script');
          if (scriptId) {
            this.selectScript(scriptId);
          }
        });
      });
    }
  }

  private getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  private handleMouseDown = (e: MouseEvent): void => {
    const coords = this.getCanvasCoords(e.clientX, e.clientY);
    this.startDrag(coords.x, coords.y);
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging || !this.draggedPuppet) return;

    const coords = this.getCanvasCoords(e.clientX, e.clientY);
    this.updateDrag(coords.x, coords.y);
  };

  private handleMouseUp = (e: MouseEvent): void => {
    const coords = this.getCanvasCoords(e.clientX, e.clientY);
    this.endDrag(coords.x, coords.y);
  };

  private handleMouseLeave = (): void => {
    if (this.isDragging) {
      this.endDrag(0, 0);
    }
  };

  private handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 0) return;
    
    const touch = e.touches[0];
    const coords = this.getCanvasCoords(touch.clientX, touch.clientY);
    this.startDrag(coords.x, coords.y);
  };

  private handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (!this.isDragging || !this.draggedPuppet || e.touches.length === 0) return;

    const touch = e.touches[0];
    const coords = this.getCanvasCoords(touch.clientX, touch.clientY);
    this.updateDrag(coords.x, coords.y);
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    if (this.isDragging) {
      const touch = e.changedTouches[0];
      const coords = this.getCanvasCoords(touch.clientX, touch.clientY);
      this.endDrag(coords.x, coords.y);
    }
  };

  private startDrag(x: number, y: number): void {
    const puppet = this.stage.getPuppetAtPoint(x, y);
    
    if (puppet) {
      this.isDragging = true;
      this.draggedPuppet = puppet;
      this.hasMoved = false;
      this.startX = x;
      this.startY = y;
      this.dragOffsetX = x - puppet.x;
      this.dragOffsetY = y - puppet.y;
      
      this.canvas.style.cursor = 'grabbing';
    }
  }

  private updateDrag(x: number, y: number): void {
    if (!this.draggedPuppet) return;

    const newX = x - this.dragOffsetX;
    const newY = y - this.dragOffsetY;

    if (!this.hasMoved) {
      const dist = Math.sqrt(
        Math.pow(x - this.startX, 2) + Math.pow(y - this.startY, 2)
      );
      if (dist > 5) {
        this.hasMoved = true;
      }
    }

    this.stage.setPuppetTarget(this.draggedPuppet.id, newX, newY);
  }

  private endDrag(x: number, y: number): void {
    if (this.draggedPuppet && !this.hasMoved) {
      this.stage.highlightPuppet(this.draggedPuppet.id, 0.5);
    }

    this.isDragging = false;
    this.draggedPuppet = null;
    this.hasMoved = false;
    this.canvas.style.cursor = 'pointer';
  }

  private toggleSidebar = (): void => {
    if (this.sidebar?.classList.contains('open')) {
      this.closeSidebar();
    } else {
      this.openSidebar();
    }
  };

  private openSidebar = (): void => {
    this.sidebar?.classList.add('open');
    this.overlay?.classList.add('show');
    this.updateActiveScript();
  };

  private closeSidebar = (): void => {
    this.sidebar?.classList.remove('open');
    this.overlay?.classList.remove('show');
  };

  private selectScript = (scriptId: string): void => {
    this.stage.loadScript(scriptId, true);
    this.updateActiveScript();
    this.closeSidebar();

    if (this.onScriptSelectCallback) {
      this.onScriptSelectCallback(scriptId);
    }
  };

  private updateActiveScript(): void {
    const currentScriptId = this.stage.getCurrentScriptId();
    const scriptItems = this.scriptList?.querySelectorAll('.script-item');
    
    scriptItems?.forEach(item => {
      const scriptId = item.getAttribute('data-script');
      if (scriptId === currentScriptId) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  onScriptSelect(callback: (scriptId: string) => void): void {
    this.onScriptSelectCallback = callback;
  }

  destroy(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);

    this.scriptBtn?.removeEventListener('click', this.toggleSidebar);
    this.sidebarClose?.removeEventListener('click', this.closeSidebar);
    this.overlay?.removeEventListener('click', this.closeSidebar);
  }
}
