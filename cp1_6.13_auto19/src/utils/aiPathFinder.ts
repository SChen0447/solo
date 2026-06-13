export interface Point {
  x: number;
  y: number;
}

interface AStarNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parentX: number;
  parentY: number;
}

const DIRS: Point[] = [
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: 1, y: 1 },
];

function heuristic(a: Point, b: Point): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
}

function isValid(x: number, y: number, cols: number, rows: number): boolean {
  return x >= 0 && x < cols && y >= 0 && y < rows;
}

export function findPath(
  heightMap: number[][],
  start: Point,
  end: Point
): Point[] {
  const rows = heightMap.length;
  if (rows === 0) return [];
  const cols = heightMap[0].length;

  if (!isValid(start.x, start.y, cols, rows) || !isValid(end.x, end.y, cols, rows)) {
    return [];
  }

  const openList: AStarNode[] = [];
  const closedSet = new Uint8Array(rows * cols);
  const gScores = new Float32Array(rows * cols);
  const parentMap = new Int32Array(rows * cols).fill(-1);

  const idx = (x: number, y: number) => y * cols + x;

  const startNode: AStarNode = {
    x: start.x,
    y: start.y,
    g: 0,
    h: heuristic(start, end),
    f: 0,
    parentX: -1,
    parentY: -1,
  };
  startNode.f = startNode.g + startNode.h;

  openList.push(startNode);
  gScores[idx(start.x, start.y)] = 0;

  const sqrt2 = Math.SQRT2;
  const heightWeight = 2.0;

  while (openList.length > 0) {
    let bestIdx = 0;
    let bestF = openList[0].f;
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < bestF) {
        bestF = openList[i].f;
        bestIdx = i;
      }
    }

    const current = openList[bestIdx];
    openList[bestIdx] = openList[openList.length - 1];
    openList.pop();

    const curIdx = idx(current.x, current.y);

    if (closedSet[curIdx]) continue;
    closedSet[curIdx] = 1;

    if (current.x === end.x && current.y === end.y) {
      const path: Point[] = [];
      let cx = end.x;
      let cy = end.y;
      while (cx !== -1 && cy !== -1) {
        path.push({ x: cx, y: cy });
        const pIdx = idx(cx, cy);
        const p = parentMap[pIdx];
        if (p === -1) break;
        const py = Math.floor(p / cols);
        const px = p % cols;
        if (px === cx && py === cy) break;
        cx = px;
        cy = py;
      }
      return path.reverse();
    }

    for (const dir of DIRS) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;

      if (!isValid(nx, ny, cols, rows)) continue;

      const nIdx = idx(nx, ny);
      if (closedSet[nIdx]) continue;

      if (dir.x !== 0 && dir.y !== 0) {
        const s1Idx = idx(current.x + dir.x, current.y);
        const s2Idx = idx(current.x, current.y + dir.y);
        if (closedSet[s1Idx] || closedSet[s2Idx]) continue;
      }

      const isDiag = dir.x !== 0 && dir.y !== 0;
      const baseCost = isDiag ? sqrt2 : 1;

      const heightDiff = heightMap[ny][nx] - heightMap[current.y][current.x];
      const moveCost = baseCost + heightWeight * Math.max(0, heightDiff) + heightWeight * 0.1 * Math.abs(heightDiff);

      const tentativeG = current.g + moveCost;

      if (gScores[nIdx] === 0 && !(current.x === start.x && current.y === start.y && nx === start.x && ny === start.y)) {
        gScores[nIdx] = Infinity;
      }

      const prevG = nIdx === idx(start.x, start.y) ? 0 : (gScores[nIdx] || Infinity);

      if (tentativeG < prevG) {
        gScores[nIdx] = tentativeG;
        parentMap[nIdx] = curIdx;

        const h = heuristic({ x: nx, y: ny }, end);
        openList.push({
          x: nx,
          y: ny,
          g: tentativeG,
          h,
          f: tentativeG + h,
          parentX: current.x,
          parentY: current.y,
        });
      }
    }
  }

  return [];
}
