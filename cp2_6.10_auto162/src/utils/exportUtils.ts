import { saveAs } from 'file-saver';
import type { MazeGrid } from './mazeGenerator';

export type CharacterType = 'knight' | 'mouse';

export interface ExportData {
  maze: MazeGrid;
  character: CharacterType;
  frameDelays: number[];
  exportedAt: number;
}

export function exportMazeData(
  maze: MazeGrid,
  character: CharacterType,
  frameDelays: number[]
): void {
  const data: ExportData = {
    maze,
    character,
    frameDelays,
    exportedAt: Date.now()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });

  const timestamp = Date.now();
  const filename = `maze_char_${timestamp}.json`;

  saveAs(blob, filename);
}
