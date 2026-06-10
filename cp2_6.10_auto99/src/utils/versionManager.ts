import { v4 as uuidv4 } from 'uuid';
import { cloneDeep } from 'lodash';

export interface PoemLine {
  id: string;
  text: string;
  author: string;
  timestamp: number;
}

export interface Version {
  id: string;
  lines: PoemLine[];
  versionNumber: number;
  timestamp: number;
}

export const createInitialVersion = (): Version => ({
  id: uuidv4(),
  lines: [],
  versionNumber: 1,
  timestamp: Date.now(),
});

export const createPoemLine = (text: string, author: string): PoemLine => ({
  id: uuidv4(),
  text,
  author,
  timestamp: Date.now(),
});

export const createVersionSnapshot = (
  previousLines: PoemLine[],
  newLine: PoemLine,
  previousVersionNumber: number
): Version => {
  const newLines = [...cloneDeep(previousLines), newLine];
  return {
    id: uuidv4(),
    lines: newLines,
    versionNumber: previousVersionNumber + 1,
    timestamp: Date.now(),
  };
};

export const getVersionDiff = (version1: Version, version2: Version): number => {
  return version2.lines.length - version1.lines.length;
};

export const rebuildLinesFromVersion = (targetVersion: Version): PoemLine[] => {
  return cloneDeep(targetVersion.lines);
};

export const getRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return `${days}天前`;
};

export const MAX_LINES = 30;
export const MAX_CHARS_PER_LINE = 20;
