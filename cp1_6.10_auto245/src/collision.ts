import type { Ship, Comet } from './entities';

export function checkCollision(ship: Ship, comet: Comet): boolean {
  const dx = ship.x - comet.x;
  const dy = ship.y - comet.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < 20;
}

export function isCometOutOfBounds(
  comet: Comet,
  canvasWidth: number,
  canvasHeight: number
): boolean {
  const margin = 100;
  return (
    comet.x < -margin ||
    comet.x > canvasWidth + margin ||
    comet.y < -margin ||
    comet.y > canvasHeight + margin
  );
}
