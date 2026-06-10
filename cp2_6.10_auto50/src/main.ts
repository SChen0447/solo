import { LevelEditor, type BlockType } from './levelEditor';
import { Toolbar } from './toolbar';
import './styles/main.css';

let editor: LevelEditor;
let toolbar: Toolbar;
let resizeTimeout: number | null = null;

function handleResize(): void {
  if (resizeTimeout !== null) {
    window.clearTimeout(resizeTimeout);
  }
  resizeTimeout = window.setTimeout(() => {
    if (editor) {
      editor.resize(window.innerHeight);
    }
  }, 100);
}

function handleKeyDown(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    if (toolbar) {
      toolbar.undo();
    }
  }
}

function init(): void {
  const canvas = document.getElementById('editorCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  editor = new LevelEditor(canvas, {
    onStatusUpdate: (tool: BlockType, x: number, y: number) => {
      if (toolbar) {
        toolbar.updateStatus(tool, x, y);
      }
    }
  });

  toolbar = new Toolbar(editor);

  editor.resize(window.innerHeight);

  window.addEventListener('resize', handleResize);
  window.addEventListener('keydown', handleKeyDown);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
