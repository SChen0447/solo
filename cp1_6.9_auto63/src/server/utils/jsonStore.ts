import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '../../../data');

function getFilePath(filename: string): string {
  return path.join(DATA_DIR, filename);
}

export function readJSONFile<T>(filename: string, defaultValue: T): T {
  try {
    const filePath = getFilePath(filename);
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return defaultValue;
  }
}

export function writeJSONFile<T>(filename: string, data: T): void {
  try {
    const filePath = getFilePath(filename);
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error writing ${filename}:`, error);
    throw error;
  }
}

export interface UsersData {
  users: any[];
}

export interface BookmarksData {
  bookmarks: any[];
}

export interface FollowsData {
  follows: any[];
}

export interface FavoritesData {
  favorites: any[];
}

export interface ShortLinksData {
  shortlinks: any[];
}
