export interface InputState {
  isDown: boolean;
  x: number;
  y: number;
  clicked: boolean;
}

export const inputState: InputState = {
  isDown: false,
  x: 0,
  y: 0,
  clicked: false,
};

let canvas: HTMLCanvasElement | null = null;

export function initInput(c: HTMLCanvasElement): void {
  canvas = c;

  c.addEventListener('mousedown', (e: MouseEvent) => {
    const rect = c.getBoundingClientRect();
    inputState.isDown = true;
    inputState.x = (e.clientX - rect.left) * (c.width / rect.width);
    inputState.y = (e.clientY - rect.top) * (c.height / rect.height);
    inputState.clicked = true;
  });

  c.addEventListener('mousemove', (e: MouseEvent) => {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    inputState.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    inputState.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  });

  c.addEventListener('mouseup', () => {
    inputState.isDown = false;
  });

  c.addEventListener('mouseleave', () => {
    inputState.isDown = false;
  });

  c.addEventListener('touchstart', (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = c.getBoundingClientRect();
    inputState.isDown = true;
    inputState.x = (touch.clientX - rect.left) * (c.width / rect.width);
    inputState.y = (touch.clientY - rect.top) * (c.height / rect.height);
    inputState.clicked = true;
  }, { passive: false });

  c.addEventListener('touchmove', (e: TouchEvent) => {
    e.preventDefault();
    if (!canvas) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    inputState.x = (touch.clientX - rect.left) * (canvas.width / rect.width);
    inputState.y = (touch.clientY - rect.top) * (canvas.height / rect.height);
  }, { passive: false });

  c.addEventListener('touchend', () => {
    inputState.isDown = false;
  });
}

export function consumeClick(): boolean {
  if (inputState.clicked) {
    inputState.clicked = false;
    return true;
  }
  return false;
}
