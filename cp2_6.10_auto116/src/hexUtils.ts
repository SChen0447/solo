import { HexCoord } from './types';

export const HEX_SIZE = 40;

export function hexKey(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}

export function hexEqual(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r;
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  return (
    (Math.abs(a.q - b.q) +
      Math.abs(a.q + a.r - b.q - b.r) +
      Math.abs(a.r - b.r)) /
    2
  );
}

export function hexToPixel(coord: HexCoord, size: number = HEX_SIZE): { x: number; y: number } {
  const x = size * (Math.sqrt(3) * coord.q + (Math.sqrt(3) / 2) * coord.r);
  const y = size * ((3 / 2) * coord.r);
  return { x, y };
}

export function pixelToHex(x: number, y: number, size: number = HEX_SIZE): HexCoord {
  const q = ((Math.sqrt(3) / 3) * x - (1 / 3) * y) / size;
  const r = ((2 / 3) * y) / size;
  return hexRound({ q, r });
}

export function hexRound(coord: { q: number; r: number }): HexCoord {
  const s = -coord.q - coord.r;
  let rq = Math.round(coord.q);
  let rr = Math.round(coord.r);
  let rs = Math.round(s);

  const qDiff = Math.abs(rq - coord.q);
  const rDiff = Math.abs(rr - coord.r);
  const sDiff = Math.abs(rs - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }

  return { q: rq, r: rr };
}

export function hexCorners(center: { x: number; y: number }, size: number = HEX_SIZE): { x: number; y: number }[] {
  const corners = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    corners.push({
      x: center.x + size * Math.cos(angle),
      y: center.y + size * Math.sin(angle)
    });
  }
  return corners;
}

export function getHexesInRange(center: HexCoord, range: number): HexCoord[] {
  const results: HexCoord[] = [];
  for (let q = -range; q <= range; q++) {
    for (let r = Math.max(-range, -q - range); r <= Math.min(range, -q + range); r++) {
      results.push({ q: center.q + q, r: center.r + r });
    }
  }
  return results;
}

export function getCrossHexes(center: HexCoord, range: number): HexCoord[] {
  const results: HexCoord[] = [{ ...center }];
  const directions = [
    { q: 1, r: 0 },
    { q: -1, r: 0 },
    { q: 0, r: 1 },
    { q: 0, r: -1 },
    { q: 1, r: -1 },
    { q: -1, r: 1 }
  ];
  for (const dir of directions) {
    for (let i = 1; i <= range; i++) {
      results.push({
        q: center.q + dir.q * i,
        r: center.r + dir.r * i
      });
    }
  }
  return results;
}

export function isValidHex(coord: HexCoord, gridSize: number): boolean {
  return coord.q >= 0 && coord.q < gridSize && coord.r >= 0 && coord.r < gridSize;
}
