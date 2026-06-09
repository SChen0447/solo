import Phaser from 'phaser';
import { TimeLineManager, TimelineState, TimelinePlatform, TimelineSpike } from '../objects/TimeLineManager';
import { Player, PlayerInput } from '../objects/Player';

const GRID_SIZE = 32;
const GRID_WIDTH = 20;
const GRID_HEIGHT = 15;
const CANVAS_WIDTH = GRID_WIDTH * GRID_SIZE;
const CANVAS_HEIGHT = GRID_HEIGHT * GRID_SIZE;
const SAVE_KEY = 'time_travel_save';

interface LevelShardData {
  gridX: number;
  gridY: number;
}

interface LevelDefinition {
  id: number;
  name: string;
  staticGrid: number[][];
  playerStart: { gridX: number; gridY: number };
  goalPosition: { gridX: number; gridY: number };
  portal?: { gridX: number; gridY: number };
  shards: LevelShardData[];
  platforms: TimelinePlatform[];
  spikes: TimelineSpike[];
  isHidden?: boolean;
}

interface GameSaveData {
  currentLevel: number;
  totalShards: number;
  unlockedHidden: boolean;
  perLevelShards: number[];
}

const LEVELS: LevelDefinition[] = [
  {
    id: 0,
    name: '时间的起点',
    staticGrid: generateStaticGrid([
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ]),
    playerStart: { gridX: 2, gridY: 11 },
    goalPosition: { gridX: 17, gridY: 11 },
    shards: [
      { gridX: 5, gridY: 11 },
      { gridX: 10, gridY: 11 },
      { gridX: 15, gridY: 11 },
    ],
    platforms: [
      { id: 'p1_0', gridX: 6, gridY: 9, visibleInPresent: true, visibleInPast: false },
      { id: 'p1_1', gridX: 7, gridY: 9, visibleInPresent: true, visibleInPast: false },
      { id: 'p1_2', gridX: 8, gridY: 9, visibleInPresent: true, visibleInPast: false },
      { id: 'p1_3', gridX: 12, gridY: 7, visibleInPresent: false, visibleInPast: true },
      { id: 'p1_4', gridX: 13, gridY: 7, visibleInPresent: false, visibleInPast: true },
      { id: 'p1_5', gridX: 14, gridY: 7, visibleInPresent: false, visibleInPast: true },
    ],
    spikes: [
      { id: 's1_0', gridX: 10, gridY: 11, movesInPast: false, baseY: 11 * GRID_SIZE + 16 },
    ],
  },
  {
    id: 1,
    name: '断裂的桥梁',
    staticGrid: generateStaticGrid([
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1],
      [1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1],
      [1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1],
    ]),
    playerStart: { gridX: 2, gridY: 11 },
    goalPosition: { gridX: 17, gridY: 11 },
    shards: [
      { gridX: 3, gridY: 11 },
      { gridX: 10, gridY: 6 },
      { gridX: 16, gridY: 11 },
    ],
    platforms: [
      { id: 'p2_0', gridX: 5, gridY: 12, visibleInPresent: true, visibleInPast: false },
      { id: 'p2_1', gridX: 6, gridY: 10, visibleInPresent: true, visibleInPast: false },
      { id: 'p2_2', gridX: 7, gridY: 8, visibleInPresent: false, visibleInPast: true },
      { id: 'p2_3', gridX: 8, gridY: 8, visibleInPresent: false, visibleInPast: true },
      { id: 'p2_4', gridX: 9, gridY: 8, visibleInPresent: false, visibleInPast: true },
      { id: 'p2_5', gridX: 10, gridY: 8, visibleInPresent: false, visibleInPast: true },
      { id: 'p2_6', gridX: 11, gridY: 8, visibleInPresent: false, visibleInPast: true },
      { id: 'p2_7', gridX: 12, gridY: 10, visibleInPresent: true, visibleInPast: false },
      { id: 'p2_8', gridX: 13, gridY: 12, visibleInPresent: true, visibleInPast: false },
    ],
    spikes: [
      { id: 's2_0', gridX: 5, gridY: 11, movesInPast: true, baseY: 11 * GRID_SIZE + 16 },
      { id: 's2_1', gridX: 14, gridY: 11, movesInPast: true, baseY: 11 * GRID_SIZE + 16 },
    ],
  },
  {
    id: 2,
    name: '消逝的阶梯',
    staticGrid: generateStaticGrid([
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1,0,0,0,0,1,1,1,1,1,1,1,1],
    ]),
    playerStart: { gridX: 2, gridY: 11 },
    goalPosition: { gridX: 17, gridY: 11 },
    shards: [
      { gridX: 4, gridY: 11 },
      { gridX: 9, gridY: 5 },
      { gridX: 15, gridY: 11 },
    ],
    platforms: [
      { id: 'p3_0', gridX: 8, gridY: 11, visibleInPresent: true, visibleInPast: false },
      { id: 'p3_1', gridX: 9, gridY: 9, visibleInPresent: false, visibleInPast: true },
      { id: 'p3_2', gridX: 10, gridY: 7, visibleInPresent: true, visibleInPast: false },
      { id: 'p3_3', gridX: 11, gridY: 5, visibleInPresent: false, visibleInPast: true },
      { id: 'p3_4', gridX: 10, gridY: 5, visibleInPresent: false, visibleInPast: true },
      { id: 'p3_5', gridX: 9, gridY: 7, visibleInPresent: true, visibleInPast: false },
      { id: 'p3_6', gridX: 10, gridY: 9, visibleInPresent: false, visibleInPast: true },
      { id: 'p3_7', gridX: 11, gridY: 11, visibleInPresent: true, visibleInPast: false },
    ],
    spikes: [
      { id: 's3_0', gridX: 8, gridY: 10, movesInPast: true, baseY: 10 * GRID_SIZE + 16 },
      { id: 's3_1', gridX: 9, gridY: 10, movesInPast: false, baseY: 10 * GRID_SIZE + 16 },
      { id: 's3_2', gridX: 10, gridY: 10, movesInPast: true, baseY: 10 * GRID_SIZE + 16 },
      { id: 's3_3', gridX: 11, gridY: 10, movesInPast: false, baseY: 10 * GRID_SIZE + 16 },
    ],
  },
  {
    id: 3,
    name: '交错的时空',
    staticGrid: generateStaticGrid([
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1],
      [1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1],
      [1,1,1,1,1,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1],
    ]),
    playerStart: { gridX: 2, gridY: 11 },
    goalPosition: { gridX: 18, gridY: 6 },
    shards: [
      { gridX: 1, gridY: 6 },
      { gridX: 9, gridY: 9 },
      { gridX: 18, gridY: 6 },
    ],
    platforms: [
      { id: 'p4_0', gridX: 6, gridY: 11, visibleInPresent: true, visibleInPast: false },
      { id: 'p4_1', gridX: 7, gridY: 11, visibleInPresent: false, visibleInPast: true },
      { id: 'p4_2', gridX: 8, gridY: 11, visibleInPresent: true, visibleInPast: false },
      { id: 'p4_3', gridX: 9, gridY: 11, visibleInPresent: false, visibleInPast: true },
      { id: 'p4_4', gridX: 10, gridY: 11, visibleInPresent: true, visibleInPast: false },
      { id: 'p4_5', gridX: 11, gridY: 11, visibleInPresent: false, visibleInPast: true },
      { id: 'p4_6', gridX: 12, gridY: 11, visibleInPresent: true, visibleInPast: false },
      { id: 'p4_7', gridX: 13, gridY: 11, visibleInPresent: false, visibleInPast: true },
      { id: 'p4_8', gridX: 14, gridY: 9, visibleInPresent: true, visibleInPast: false },
      { id: 'p4_9', gridX: 15, gridY: 8, visibleInPresent: false, visibleInPast: true },
      { id: 'p4_10', gridX: 16, gridY: 7, visibleInPresent: true, visibleInPast: false },
    ],
    spikes: [
      { id: 's4_0', gridX: 6, gridY: 10, movesInPast: true, baseY: 10 * GRID_SIZE + 16 },
      { id: 's4_1', gridX: 8, gridY: 10, movesInPast: false, baseY: 10 * GRID_SIZE + 16 },
      { id: 's4_2', gridX: 10, gridY: 10, movesInPast: true, baseY: 10 * GRID_SIZE + 16 },
      { id: 's4_3', gridX: 12, gridY: 10, movesInPast: false, baseY: 10 * GRID_SIZE + 16 },
    ],
  },
  {
    id: 4,
    name: '时光的尽头',
    staticGrid: generateStaticGrid([
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1],
      [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1],
      [1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1],
    ]),
    playerStart: { gridX: 1, gridY: 11 },
    goalPosition: { gridX: 18, gridY: 2 },
    shards: [
      { gridX: 1, gridY: 2 },
      { gridX: 9, gridY: 6 },
      { gridX: 18, gridY: 11 },
    ],
    platforms: [
      { id: 'p5_0', gridX: 3, gridY: 11, visibleInPresent: true, visibleInPast: false },
      { id: 'p5_1', gridX: 4, gridY: 9, visibleInPresent: false, visibleInPast: true },
      { id: 'p5_2', gridX: 5, gridY: 7, visibleInPresent: true, visibleInPast: false },
      { id: 'p5_3', gridX: 5, gridY: 5, visibleInPresent: false, visibleInPast: true },
      { id: 'p5_4', gridX: 5, gridY: 3, visibleInPresent: true, visibleInPast: false },
      { id: 'p5_5', gridX: 13, gridY: 5, visibleInPresent: false, visibleInPast: true },
      { id: 'p5_6', gridX: 14, gridY: 7, visibleInPresent: true, visibleInPast: false },
      { id: 'p5_7', gridX: 14, gridY: 9, visibleInPresent: false, visibleInPast: true },
      { id: 'p5_8', gridX: 14, gridY: 11, visibleInPresent: true, visibleInPast: false },
      { id: 'p5_9', gridX: 15, gridY: 11, visibleInPresent: false, visibleInPast: true },
      { id: 'p5_10', gridX: 16, gridY: 11, visibleInPresent: true, visibleInPast: false },
      { id: 'p5_11', gridX: 16, gridY: 9, visibleInPresent: false, visibleInPast: true },
      { id: 'p5_12', gridX: 16, gridY: 7, visibleInPresent: true, visibleInPast: false },
      { id: 'p5_13', gridX: 16, gridY: 5, visibleInPresent: false, visibleInPast: true },
      { id: 'p5_14', gridX: 16, gridY: 3, visibleInPresent: true, visibleInPast: false },
    ],
    spikes: [
      { id: 's5_0', gridX: 3, gridY: 10, movesInPast: true, baseY: 10 * GRID_SIZE + 16 },
      { id: 's5_1', gridX: 4, gridY: 8, movesInPast: false, baseY: 8 * GRID_SIZE + 16 },
      { id: 's5_2', gridX: 14, gridY: 10, movesInPast: true, baseY: 10 * GRID_SIZE + 16 },
      { id: 's5_3', gridX: 15, gridY: 10, movesInPast: false, baseY: 10 * GRID_SIZE + 16 },
      { id: 's5_4', gridX: 16, gridY: 2, movesInPast: true, baseY: 2 * GRID_SIZE + 16 },
    ],
  },
  {
    id: 5,
    name: '隐藏：永恒之境',
    isHidden: true,
    staticGrid: generateStaticGrid([
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,1,1,1,0,0,0,0,0,0,1,1,1,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1],
      [1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1],
      [1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1],
    ]),
    playerStart: { gridX: 1, gridY: 11 },
    goalPosition: { gridX: 9, gridY: 7 },
    shards: [
      { gridX: 0, gridY: 1 },
      { gridX: 19, gridY: 1 },
      { gridX: 9, gridY: 4 },
    ],
    platforms: [
      { id: 'ph_0', gridX: 4, gridY: 11, visibleInPresent: true, visibleInPast: false },
      { id: 'ph_1', gridX: 5, gridY: 11, visibleInPresent: false, visibleInPast: true },
      { id: 'ph_2', gridX: 4, gridY: 9, visibleInPresent: false, visibleInPast: true },
      { id: 'ph_3', gridX: 5, gridY: 9, visibleInPresent: true, visibleInPast: false },
      { id: 'ph_4', gridX: 4, gridY: 7, visibleInPresent: true, visibleInPast: false },
      { id: 'ph_5', gridX: 5, gridY: 7, visibleInPresent: false, visibleInPast: true },
      { id: 'ph_6', gridX: 4, gridY: 5, visibleInPresent: false, visibleInPast: true },
      { id: 'ph_7', gridX: 5, gridY: 5, visibleInPresent: true, visibleInPast: false },
      { id: 'ph_8', gridX: 4, gridY: 3, visibleInPresent: true, visibleInPast: false },
      { id: 'ph_9', gridX: 5, gridY: 3, visibleInPresent: false, visibleInPast: true },
      { id: 'ph_10', gridX: 14, gridY: 11, visibleInPresent: false, visibleInPast: true },
      { id: 'ph_11', gridX: 15, gridY: 11, visibleInPresent: true, visibleInPast: false },
      { id: 'ph_12', gridX: 14, gridY: 9, visibleInPresent: true, visibleInPast: false },
      { id: 'ph_13', gridX: 15, gridY: 9, visibleInPresent: false, visibleInPast: true },
      { id: 'ph_14', gridX: 14, gridY: 7, visibleInPresent: false, visibleInPast: true },
      { id: 'ph_15', gridX: 15, gridY: 7, visibleInPresent: true, visibleInPast: false },
      { id: 'ph_16', gridX: 14, gridY: 5, visibleInPresent: true, visibleInPast: false },
      { id: 'ph_17', gridX: 15, gridY: 5, visibleInPresent: false, visibleInPast: true },
      { id: 'ph_18', gridX: 14, gridY: 3, visibleInPresent: false, visibleInPast: true },
      { id: 'ph_19', gridX: 15, gridY: 3, visibleInPresent: true, visibleInPast: false },
    ],
    spikes: [
      { id: 'sh_0', gridX: 4, gridY: 10, movesInPast: true, baseY: 10 * GRID_SIZE + 16 },
      { id: 'sh_1', gridX: 5, gridY: 10, movesInPast: false, baseY: 10 * GRID_SIZE + 16 },
      { id: 'sh_2', gridX: 14, gridY: 10, movesInPast: true, baseY: 10 * GRID_SIZE + 16 },
      { id: 'sh_3', gridX: 15, gridY: 10, movesInPast: false, baseY: 10 * GRID_SIZE + 16 },
      { id: 'sh_4', gridX: 7, gridY: 7, movesInPast: true, baseY: 7 * GRID_SIZE + 16 },
      { id: 'sh_5', gridX: 12, gridY: 7, movesInPast: true, baseY: 7 * GRID_SIZE + 16 },
    ],
  },
];

function generateStaticGrid(rows: number[][]): number[][] {
  return rows.map(row => [...row]);
}

export class GameScene extends Phaser.Scene {
  private timelineManager!: TimeLineManager;
  private player!: Player;
  private currentLevelIndex: number = 0;
  private totalShards: number = 0;
  private unlockedHidden: boolean = false;
  private perLevelShards: number[] = [];
  private currentLevelShards: number = 0;

  private levelStartTime: number = 0;
  private isPaused: boolean = false;
  private isLevelComplete: boolean = false;
  private isGameOver: boolean = false;

  private keyA!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keySpace!: Phaser.Input.Keyboard.Key;
  private keyT!: Phaser.Input.Keyboard.Key;

  private jumpPressed: boolean = false;
  private doubleJumpPressed: boolean = false;
  private prevJump: boolean = false;
  private prevSpace: boolean = false;
  private prevT: boolean = false;

  private stars: Phaser.GameObjects.Graphics[] = [];
  private staticPlatforms: Phaser.Physics.Arcade.StaticGroup | null = null;
  private dynamicPlatforms: TimelinePlatform[] = [];
  private spikeObjects: TimelineSpike[] = [];
  private shardObjects: { sprite: Phaser.GameObjects.Polygon; collected: boolean; gridX: number; gridY: number }[] = [];
  private goalContainer!: Phaser.GameObjects.Container;
  private goalCollider!: Phaser.Physics.Arcade.Sprite;

  private hudContainer!: Phaser.GameObjects.Container;
  private heartSprites: Phaser.GameObjects.Polygon[] = [];
  private shardCountText!: Phaser.GameObjects.Text;
  private timelineText!: Phaser.GameObjects.Text;
  private holdProgressBar!: Phaser.GameObjects.Graphics;

  private touchControlsContainer!: Phaser.GameObjects.Container;
  private touchJoystickBase?: Phaser.GameObjects.Arc;
  private touchJoystickKnob?: Phaser.GameObjects.Arc;
  private touchJumpBtn?: Phaser.GameObjects.Arc;
  private touchTimelineBtn?: Phaser.GameObjects.Arc;
  private touchDoubleJumpBtn?: Phaser.GameObjects.Arc;
  private joystickActive: boolean = false;
  private joystickPointerId: number = -1;
  private joystickDirection: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    super('GameScene');
  }

  public preload(): void {
    this.createParticleTexture();
    this.loadAudioPlaceholders();
  }

  private createParticleTexture(): void {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle', 8, 8);
    g.destroy();
  }

  private loadAudioPlaceholders(): void {
    this.sound.add('jump_sfx', { rate: 1 });
    this.sound.add('damage_sfx', { rate: 1 });
    this.sound.add('collect_sfx', { rate: 1 });
    this.sound.add('switch_sfx', { rate: 1 });
    this.sound.add('win_sfx', { rate: 1 });
    this.sound.add('lose_sfx', { rate: 1 });
  }

  public create(): void {
    this.timelineManager = new TimeLineManager();
    this.timelineManager.setScene(this);
    this.player = new Player();

    this.loadSaveData();
    this.setupInput();
    this.setupPhysics();
    this.createStars();
    this.createHUD();
    this.setupTouchControls();
    this.loadLevel(this.currentLevelIndex);
  }

  private loadSaveData(): void {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const data: GameSaveData = JSON.parse(saved);
        this.currentLevelIndex = Math.max(0, Math.min(data.currentLevel, LEVELS.length - 1));
        this.totalShards = data.totalShards || 0;
        this.unlockedHidden = data.unlockedHidden || false;
        this.perLevelShards = data.perLevelShards || [];
      }
    } catch (_e) {
      this.currentLevelIndex = 0;
      this.totalShards = 0;
      this.unlockedHidden = false;
      this.perLevelShards = [];
    }

    if (this.totalShards >= 15) {
      this.unlockedHidden = true;
    }
  }

  private saveGame(): void {
    const data: GameSaveData = {
      currentLevel: this.currentLevelIndex,
      totalShards: this.totalShards,
      unlockedHidden: this.unlockedHidden,
      perLevelShards: this.perLevelShards,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (_e) {
    }
  }

  private setupInput(): void {
    this.keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keySpace = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyT = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.T);
  }

  private setupPhysics(): void {
    this.physics.world.setBounds(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.physics.world.gravity.y = 0;
  }

  private createStars(): void {
    for (let i = 0; i < 50; i++) {
      const star = this.add.graphics();
      const x = Phaser.Math.Between(0, CANVAS_WIDTH);
      const y = Phaser.Math.Between(0, CANVAS_HEIGHT);
      star.fillStyle(0xffffff, 0.5);
      star.fillCircle(x, y, Phaser.Math.FloatBetween(1, 2));
      star.setData('baseX', x);
      star.setData('baseY', y);
      star.setData('phase', Math.random() * Math.PI * 2);
      this.stars.push(star);
    }
  }

  private createHUD(): void {
    this.hudContainer = this.add.container(0, 0);
    this.hudContainer.setScrollFactor(0);
    this.hudContainer.setDepth(100);

    for (let i = 0; i < 3; i++) {
      const heart = this.add.graphics();
      this.drawHeart(heart, 30 + i * 35, 30, 0xff0000);
      this.heartSprites.push(heart);
      this.hudContainer.add(heart);
    }

    const shardIcon = this.add.graphics();
    this.drawDiamond(shardIcon, 140, 30, 0xffd700);
    this.hudContainer.add(shardIcon);

    this.shardCountText = this.add.text(160, 20, `0/${this.totalShards}`, {
      fontSize: '20px',
      color: '#ffd700',
      fontFamily: '"Courier New", monospace',
    });
    this.hudContainer.add(this.shardCountText);

    this.timelineText = this.add.text(20, 70, '现在', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: '"Courier New", monospace',
      fontWeight: 'bold',
    });
    this.hudContainer.add(this.timelineText);

    this.holdProgressBar = this.add.graphics();
    this.hudContainer.add(this.holdProgressBar);
  }

  private drawHeart(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number): void {
    g.clear();
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(x, y + 8);
    g.bezierCurveTo(x - 12, y - 4, x - 12, y - 16, x, y - 8);
    g.bezierCurveTo(x + 12, y - 16, x + 12, y - 4, x, y + 8);
    g.closePath();
    g.fillPath();
    g.lineStyle(1, 0x000000, 0.5);
    g.strokePath();
  }

  private drawDiamond(g: Phaser.GameObjects.Graphics, x: number, y: number, color: number): void {
    g.clear();
    g.fillStyle(color, 1);
    g.beginPath();
    g.moveTo(x, y - 12);
    g.lineTo(x + 8, y);
    g.lineTo(x, y + 12);
    g.lineTo(x - 8, y);
    g.closePath();
    g.fillPath();
    g.lineStyle(1, 0x000000, 0.5);
    g.strokePath();
  }

  private setupTouchControls(): void {
    this.touchControlsContainer = this.add.container(0, 0);
    this.touchControlsContainer.setScrollFactor(0);
    this.touchControlsContainer.setDepth(90);

    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.touchControlsContainer.setVisible(isTouch);

    if (!isTouch) return;

    const scale = this.scale;
    const w = scale.width;
    const h = scale.height;

    this.touchJoystickBase = this.add.circle(100, h - 100, 50, 0xffffff, 0.2);
    this.touchJoystickBase.setStrokeStyle(3, 0xffffff, 0.4);
    this.touchJoystickKnob = this.add.circle(100, h - 100, 25, 0xffffff, 0.4);
    this.touchControlsContainer.add([this.touchJoystickBase, this.touchJoystickKnob]);

    this.touchJumpBtn = this.add.circle(w - 170, h - 100, 40, 0x4169e1, 0.4);
    this.touchJumpBtn.setStrokeStyle(3, 0xffffff, 0.5);
    const jumpLabel = this.add.text(w - 170, h - 100, '跳', {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: '"Courier New", monospace',
    }).setOrigin(0.5);
    this.touchControlsContainer.add([this.touchJumpBtn, jumpLabel]);

    this.touchDoubleJumpBtn = this.add.circle(w - 80, h - 100, 35, 0x9370db, 0.4);
    this.touchDoubleJumpBtn.setStrokeStyle(3, 0xffffff, 0.5);
    const djLabel = this.add.text(w - 80, h - 100, '二段', {
      fontSize: '14px',
      color: '#ffffff',
      fontFamily: '"Courier New", monospace',
    }).setOrigin(0.5);
    this.touchControlsContainer.add([this.touchDoubleJumpBtn, djLabel]);

    this.touchTimelineBtn = this.add.circle(w - 80, h - 180, 38, 0x8a2be2, 0.4);
    this.touchTimelineBtn.setStrokeStyle(3, 0xffffff, 0.5);
    const tlLabel = this.add.text(w - 80, h - 180, 'T', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: '"Courier New", monospace',
      fontWeight: 'bold',
    }).setOrigin(0.5);
    this.touchControlsContainer.add([this.touchTimelineBtn, tlLabel]);

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const jb = this.touchJoystickBase!;
      const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, jb.x, jb.y);
      if (dist <= jb.radius + 20) {
        this.joystickActive = true;
        this.joystickPointerId = pointer.id;
        this.updateJoystick(pointer);
        this.vibrate(10);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.joystickActive && pointer.id === this.joystickPointerId) {
        this.updateJoystick(pointer);
      }
    });

    const endJoystick = (pointer: Phaser.Input.Pointer) => {
      if (this.joystickActive && pointer.id === this.joystickPointerId) {
        this.joystickActive = false;
        this.joystickPointerId = -1;
        this.joystickDirection = { x: 0, y: 0 };
        if (this.touchJoystickKnob && this.touchJoystickBase) {
          this.touchJoystickKnob.setPosition(this.touchJoystickBase.x, this.touchJoystickBase.y);
        }
      }
    };

    this.input.on('pointerup', endJoystick);
    this.input.on('pointerupoutside', endJoystick);
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    if (!this.touchJoystickBase || !this.touchJoystickKnob) return;
    const dx = pointer.x - this.touchJoystickBase.x;
    const dy = pointer.y - this.touchJoystickBase.y;
    const dist = Math.min(this.touchJoystickBase.radius, Math.sqrt(dx * dx + dy * dy));
    const angle = Math.atan2(dy, dx);
    const knobX = this.touchJoystickBase.x + Math.cos(angle) * dist;
    const knobY = this.touchJoystickBase.y + Math.sin(angle) * dist;
    this.touchJoystickKnob.setPosition(knobX, knobY);
    this.joystickDirection = {
      x: dist > 10 ? Math.cos(angle) : 0,
      y: dist > 10 ? Math.sin(angle) : 0,
    };
  }

  private vibrate(ms: number): void {
    if (navigator.vibrate) {
      try { navigator.vibrate(ms); } catch (_e) {}
    }
  }

  private loadLevel(index: number): void {
    this.cleanupLevel();

    if (index >= LEVELS.length) {
      this.showVictory();
      return;
    }

    const level = LEVELS[index];
    if (level.isHidden && !this.unlockedHidden) {
      this.showVictory();
      return;
    }

    this.currentLevelIndex = index;
    this.currentLevelShards = 0;
    this.isLevelComplete = false;
    this.isGameOver = false;
    this.levelStartTime = this.time.now;
    this.timelineManager.reset();
    this.timelineManager.setScene(this);

    this.createStaticPlatforms(level);
    this.createTimelinePlatforms(level);
    this.createSpikes(level);
    this.createShards(level);
    this.createGoal(level);
    this.createPlayer(level);
    this.setupCollisions();
    this.updateHUD();
    this.timelineManager.applyTimelineState();
  }

  private cleanupLevel(): void {
    if (this.staticPlatforms) {
      this.staticPlatforms.clear(true, true);
      this.staticPlatforms = null;
    }
    this.dynamicPlatforms.forEach(p => {
      if (p.phaserObject) (p.phaserObject as Phaser.GameObjects.Rectangle).destroy();
    });
    this.dynamicPlatforms = [];
    this.spikeObjects.forEach(s => {
      if (s.phaserObject) s.phaserObject.destroy();
      if (s.collider) s.collider.destroy();
    });
    this.spikeObjects = [];
    this.shardObjects.forEach(s => {
      if (s.sprite) s.sprite.destroy();
    });
    this.shardObjects = [];
    if (this.goalContainer) this.goalContainer.destroy();
    if (this.player && this.player.sprite) this.player.destroy();
  }

  private createStaticPlatforms(level: LevelDefinition): void {
    this.staticPlatforms = this.physics.add.staticGroup();
    const brickTexture = this.createBrickTexture();

    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (level.staticGrid[y] && level.staticGrid[y][x] === 1) {
          const px = x * GRID_SIZE + GRID_SIZE / 2;
          const py = y * GRID_SIZE + GRID_SIZE / 2;
          const sprite = this.physics.add.staticSprite(px, py, brickTexture);
          sprite.setSize(GRID_SIZE, GRID_SIZE);
          this.staticPlatforms!.add(sprite);
        }
      }
    }
  }

  private createBrickTexture(): string {
    const g = this.add.graphics();
    g.fillStyle(0x8b6914, 1);
    g.fillRect(0, 0, 32, 32);
    g.lineStyle(2, 0x5a4510, 1);
    g.strokeRect(0, 0, 32, 32);
    g.strokeRect(0, 0, 16, 16);
    g.strokeRect(16, 16, 16, 16);
    g.strokeRect(16, 0, 16, 16);
    g.strokeRect(0, 16, 16, 16);
    g.generateTexture('brick_static', 32, 32);
    g.destroy();
    return 'brick_static';
  }

  private createTimelinePlatforms(level: LevelDefinition): void {
    const metalTexture = this.createMetalTexture();

    level.platforms.forEach((p) => {
      const px = p.gridX * GRID_SIZE + GRID_SIZE / 2;
      const py = p.gridY * GRID_SIZE + GRID_SIZE / 2;
      const rect = this.add.rectangle(px, py, GRID_SIZE, GRID_SIZE, 0x808080);
      rect.setStrokeStyle(2, 0x505050, 1);
      rect.setTexture(metalTexture);

      const staticBody = this.physics.add.staticBody(px, py, GRID_SIZE, GRID_SIZE);
      const body = staticBody.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(GRID_SIZE, GRID_SIZE, true);
      body.updateFromGameObject();
      body.enable = p.visibleInPresent;

      const tp: TimelinePlatform = {
        ...p,
        phaserObject: rect,
        body: body,
      };
      this.dynamicPlatforms.push(tp);
      this.timelineManager.registerPlatform(tp);
    });
  }

  private createMetalTexture(): string {
    const g = this.add.graphics();
    g.fillStyle(0x808080, 1);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0xa0a0a0, 1);
    g.fillRect(0, 0, 32, 4);
    g.fillStyle(0x606060, 1);
    g.fillRect(0, 28, 32, 4);
    g.lineStyle(1, 0x404040, 1);
    g.strokeRect(0, 0, 32, 32);
    g.generateTexture('metal_platform', 32, 32);
    g.destroy();
    return 'metal_platform';
  }

  private createSpikes(level: LevelDefinition): void {
    level.spikes.forEach((s) => {
      const px = s.gridX * GRID_SIZE + GRID_SIZE / 2;
      const py = s.gridY * GRID_SIZE + GRID_SIZE / 2;
      const baseY = py;

      const points: Phaser.Types.Math.Vector2Like[] = [
        { x: 0, y: 14 },
        { x: -12, y: -10 },
        { x: 12, y: -10 },
      ];
      const spike = this.add.polygon(px, py, points, 0xff3333);
      spike.setStrokeStyle(2, 0xcc0000, 1);

      const pulseTween = this.tweens.add({
        targets: spike,
        scaleX: { from: 1, to: 1.1 },
        scaleY: { from: 1, to: 1.1 },
        duration: 750,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      const collider = this.physics.add.sprite(px, py, undefined);
      collider.setSize(20, 20);
      collider.setVisible(false);
      collider.body!.setAllowGravity(false);
      collider.body!.setImmovable(true);

      const ts: TimelineSpike = {
        ...s,
        baseY: baseY,
        phaserObject: spike,
        collider: collider,
      };
      this.spikeObjects.push(ts);
      this.timelineManager.registerSpike(ts);
    });
  }

  private createShards(level: LevelDefinition): void {
    level.shards.forEach((s) => {
      const px = s.gridX * GRID_SIZE + GRID_SIZE / 2;
      const py = s.gridY * GRID_SIZE + GRID_SIZE / 2;

      const points: Phaser.Types.Math.Vector2Like[] = [
        { x: 0, y: -12 },
        { x: 8, y: 0 },
        { x: 0, y: 12 },
        { x: -8, y: 0 },
      ];
      const shard = this.add.polygon(px, py, points, 0xffd700);
      shard.setStrokeStyle(2, 0xffaa00, 1);

      this.tweens.add({
        targets: shard,
        y: py - 5,
        scale: 1.1,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.tweens.add({
        targets: shard,
        angle: 360,
        duration: 3000,
        repeat: -1,
        ease: 'Linear',
      });

      this.shardObjects.push({
        sprite: shard,
        collected: false,
        gridX: s.gridX,
        gridY: s.gridY,
      });
    });
  }

  private createGoal(level: LevelDefinition): void {
    const px = level.goalPosition.gridX * GRID_SIZE + GRID_SIZE / 2;
    const py = level.goalPosition.gridY * GRID_SIZE + GRID_SIZE / 2;

    this.goalContainer = this.add.container(px, py);
    const inner = this.add.circle(0, 0, 18, 0x808080, 0.6);
    const outer = this.add.circle(0, 0, 22, undefined, undefined);
    outer.setStrokeStyle(3, 0x808080, 0.8);
    this.goalContainer.add([inner, outer]);

    this.tweens.add({
      targets: this.goalContainer,
      angle: 360,
      duration: 2000,
      repeat: -1,
      ease: 'Linear',
    });

    this.goalCollider = this.physics.add.sprite(px, py, undefined);
    this.goalCollider.setSize(36, 36);
    this.goalCollider.setVisible(false);
    this.goalCollider.body!.setAllowGravity(false);
    this.goalCollider.body!.setImmovable(true);

    this.timelineManager.setGoal(this.goalContainer);
    this.goalContainer.setData('active', false);
  }

  private createPlayer(level: LevelDefinition): void {
    const px = level.playerStart.gridX * GRID_SIZE + GRID_SIZE / 2;
    const py = level.playerStart.gridY * GRID_SIZE + GRID_SIZE / 2;
    this.player.create(this, px, py);
  }

  private setupCollisions(): void {
    if (this.staticPlatforms) {
      this.physics.add.collider(this.player.sprite, this.staticPlatforms);
    }
    this.dynamicPlatforms.forEach((p) => {
      if (p.body) {
        const bodySprite = { body: p.body } as unknown as Phaser.Types.Physics.Arcade.GameObjectWithBody;
        this.physics.add.collider(this.player.sprite, bodySprite);
      }
    });
    this.spikeObjects.forEach((s) => {
      if (s.collider) {
        this.physics.add.overlap(this.player.sprite, s.collider, () => this.onPlayerHitSpike());
      }
    });
    this.shardObjects.forEach((s) => {
      const body = this.physics.add.staticBody(
        s.gridX * GRID_SIZE + GRID_SIZE / 2,
        s.gridY * GRID_SIZE + GRID_SIZE / 2,
        16, 24
      );
      const bodySprite = { body: body.body } as unknown as Phaser.Types.Physics.Arcade.GameObjectWithBody;
      this.physics.add.overlap(this.player.sprite, bodySprite, () => this.onPlayerCollectShard(s));
    });
    this.physics.add.overlap(this.player.sprite, this.goalCollider, () => this.onPlayerReachGoal());
  }

  private onPlayerHitSpike(): void {
    if (this.player.takeDamage()) {
      this.updateHUD();
      if (this.player.lives <= 0) {
        this.gameOver();
      } else {
        const level = LEVELS[this.currentLevelIndex];
        const px = level.playerStart.gridX * GRID_SIZE + GRID_SIZE / 2;
        const py = level.playerStart.gridY * GRID_SIZE + GRID_SIZE / 2;
        this.player.reset(px, py);
      }
    }
  }

  private onPlayerCollectShard(shard: { sprite: Phaser.GameObjects.Polygon; collected: boolean; gridX: number; gridY: number }): void {
    if (shard.collected) return;
    shard.collected = true;
    this.currentLevelShards++;
    this.totalShards++;

    this.tweens.add({
      targets: shard.sprite,
      scale: 0,
      alpha: 0,
      duration: 400,
      ease: 'Cubic.easeIn',
      onComplete: () => shard.sprite.destroy(),
    });

    this.tweens.add({
      targets: shard.sprite,
      y: '-=30',
      duration: 400,
      ease: 'Cubic.easeOut',
    });

    const particles = this.add.particles(0, 0, 'particle', {
      x: shard.sprite.x,
      y: shard.sprite.y,
      speed: { min: 30, max: 80 },
      scale: { start: 1, end: 0 },
      lifespan: 400,
      quantity: 15,
      tint: [0xffd700, 0xffaa00, 0xffff00],
      blendMode: 'ADD',
    });
    this.time.delayedCall(400, () => particles.destroy());

    this.updateHUD();

    if (this.totalShards >= 15 && !this.unlockedHidden) {
      this.unlockedHidden = true;
    }

    this.saveGame();
  }

  private onPlayerReachGoal(): void {
    if (this.isLevelComplete || !this.goalContainer.getData('active')) return;
    this.isLevelComplete = true;

    const gx = this.goalContainer.x;
    const gy = this.goalContainer.y;
    const particles = this.add.particles(0, 0, 'particle', {
      x: gx,
      y: gy,
      speed: { min: 50, max: 150 },
      scale: { start: 1.5, end: 0 },
      lifespan: 800,
      quantity: 30,
      tint: [0x00bfff, 0x1e90ff, 0x87ceeb],
      blendMode: 'ADD',
    });

    this.time.delayedCall(800, () => {
      particles.destroy();
      this.showLevelComplete();
    });
  }

  private showLevelComplete(): void {
    const elapsed = (this.time.now - this.levelStartTime) / 1000;
    const minutes = Math.floor(elapsed / 60);
    const seconds = Math.floor(elapsed % 60);
    const level = LEVELS[this.currentLevelIndex];

    const overlay = this.add.rectangle(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2,
      CANVAS_WIDTH, CANVAS_HEIGHT,
      0x000000, 0.8
    );
    overlay.setDepth(200);

    const titleText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80,
      `关卡 ${level.id + 1} 完成！`, {
      fontSize: '32px',
      color: '#ffd700',
      fontFamily: '"Courier New", monospace',
      fontWeight: 'bold',
    }).setOrigin(0.5);
    titleText.setDepth(201);

    const timeText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20,
      `用时: ${minutes}:${seconds.toString().padStart(2, '0')}`, {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: '"Courier New", monospace',
    }).setOrigin(0.5);
    timeText.setDepth(201);

    const livesText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10,
      `剩余生命: ${this.player.lives}`, {
      fontSize: '20px',
      color: '#ff6b6b',
      fontFamily: '"Courier New", monospace',
    }).setOrigin(0.5);
    livesText.setDepth(201);

    const shardsText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40,
      `本关碎片: ${this.currentLevelShards}/3  总计: ${this.totalShards}`, {
      fontSize: '20px',
      color: '#ffd700',
      fontFamily: '"Courier New", monospace',
    }).setOrigin(0.5);
    shardsText.setDepth(201);

    this.perLevelShards[this.currentLevelIndex] = this.currentLevelShards;
    this.saveGame();

    this.time.delayedCall(2000, () => {
      overlay.destroy();
      titleText.destroy();
      timeText.destroy();
      livesText.destroy();
      shardsText.destroy();

      let nextLevel = this.currentLevelIndex + 1;
      if (nextLevel >= LEVELS.length) {
        this.showVictory();
      } else if (LEVELS[nextLevel].isHidden && !this.unlockedHidden) {
        this.showVictory();
      } else {
        this.loadLevel(nextLevel);
      }
    });
  }

  private gameOver(): void {
    this.isGameOver = true;

    const overlay = this.add.rectangle(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2,
      CANVAS_WIDTH, CANVAS_HEIGHT,
      0x000000, 0.85
    );
    overlay.setDepth(200);

    const titleText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40,
      '游戏结束', {
      fontSize: '48px',
      color: '#ff3333',
      fontFamily: '"Courier New", monospace',
      fontWeight: 'bold',
    }).setOrigin(0.5);
    titleText.setDepth(201);

    const hintText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20,
      '按 R 键重新开始本关', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: '"Courier New", monospace',
    }).setOrigin(0.5);
    hintText.setDepth(201);

    const keyR = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    keyR.once('down', () => {
      overlay.destroy();
      titleText.destroy();
      hintText.destroy();
      this.loadLevel(this.currentLevelIndex);
    });
  }

  private showVictory(): void {
    const overlay = this.add.rectangle(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2,
      CANVAS_WIDTH, CANVAS_HEIGHT,
      0x000000, 0.9
    );
    overlay.setDepth(200);

    const titleText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80,
      '恭喜通关！', {
      fontSize: '40px',
      color: '#ffd700',
      fontFamily: '"Courier New", monospace',
      fontWeight: 'bold',
    }).setOrigin(0.5);
    titleText.setDepth(201);

    const totalText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20,
      `收集时光碎片: ${this.totalShards}/15`, {
      fontSize: '24px',
      color: '#ffd700',
      fontFamily: '"Courier New", monospace',
    }).setOrigin(0.5);
    totalText.setDepth(201);

    if (this.unlockedHidden && this.currentLevelIndex < 5) {
      const hintText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30,
        '已解锁隐藏关卡！按 H 进入', {
        fontSize: '20px',
        color: '#8a2be2',
        fontFamily: '"Courier New", monospace',
      }).setOrigin(0.5);
      hintText.setDepth(201);

      const keyH = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.H);
      keyH.once('down', () => {
        overlay.destroy();
        titleText.destroy();
        totalText.destroy();
        hintText.destroy();
        this.loadLevel(5);
      });
    } else if (this.currentLevelIndex >= 5) {
      const hintText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30,
        '你已征服所有时空！', {
        fontSize: '20px',
        color: '#8a2be2',
        fontFamily: '"Courier New", monospace',
      }).setOrigin(0.5);
      hintText.setDepth(201);
    }

    const restartText = this.add.text(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 70,
      '按 R 键从第一关重新开始', {
      fontSize: '18px',
      color: '#aaaaaa',
      fontFamily: '"Courier New", monospace',
    }).setOrigin(0.5);
    restartText.setDepth(201);

    const keyR = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    keyR.once('down', () => {
      this.currentLevelIndex = 0;
      this.totalShards = 0;
      this.perLevelShards = [];
      this.unlockedHidden = false;
      this.saveGame();
      overlay.destroy();
      titleText.destroy();
      totalText.destroy();
      restartText.destroy();
      if (this.input.keyboard) {
        this.input.keyboard.removeKey(Phaser.Input.Keyboard.KeyCodes.H);
      }
      this.loadLevel(0);
    });
  }

  private updateHUD(): void {
    for (let i = 0; i < 3; i++) {
      const color = i < this.player.lives ? 0xff0000 : 0x444444;
      this.drawHeart(this.heartSprites[i], 30 + i * 35, 30, color);
    }

    this.shardCountText.setText(`${this.currentLevelShards}/3 (总${this.totalShards})`);

    const isPast = this.timelineManager.currentState === TimelineState.PAST;
    const targetColor = isPast ? '#8a2be2' : '#ffffff';
    this.timelineText.setText(isPast ? '过去' : '现在');
    this.timelineText.setColor(targetColor);

    this.holdProgressBar.clear();
    if (isPast && this.timelineManager.getHoldProgress() > 0) {
      const progress = this.timelineManager.getHoldProgress();
      this.holdProgressBar.fillStyle(0x8a2be2, 0.8);
      this.holdProgressBar.fillRect(20, 105, 120 * progress, 8);
      this.holdProgressBar.lineStyle(2, 0xffffff, 0.6);
      this.holdProgressBar.strokeRect(20, 105, 120, 8);
    }
  }

  private updateStars(time: number): void {
    this.stars.forEach((star, i) => {
      const phase = star.getData('phase') as number;
      const alpha = 0.3 + Math.sin(time / 1000 + phase) * 0.25 + 0.25;
      const baseX = star.getData('baseX') as number;
      const baseY = star.getData('baseY') as number;
      star.clear();
      star.fillStyle(0xffffff, alpha);
      const size = (i % 3 === 0) ? 2 : 1.5;
      star.fillCircle(baseX, baseY, size);
    });
  }

  private isTouchingBtn(pointer: Phaser.Input.Pointer, btn: Phaser.GameObjects.Arc | undefined): boolean {
    if (!btn) return false;
    const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, btn.x, btn.y);
    return dist <= btn.radius + 10;
  }

  public update(time: number, delta: number): void {
    if (this.isLevelComplete || this.isGameOver) return;

    this.updateStars(time);

    const tDown = this.keyT.isDown;
    const tPressed = tDown && !this.prevT;
    this.prevT = tDown;

    if (tPressed) {
      this.timelineManager.trySwitchToPast();
    }

    this.timelineManager.update(time, delta, tDown);

    let left = this.keyA.isDown;
    let right = this.keyD.isDown;
    let jumpPressed = this.keyW.isDown && !this.prevJump;
    let doubleJumpPressed = this.keySpace.isDown && !this.prevSpace;

    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      const pointers = this.input.pointers;
      for (const p of pointers) {
        if (!p.active) continue;
        if (this.joystickDirection.x < -0.3) left = true;
        if (this.joystickDirection.x > 0.3) right = true;
        if (this.isTouchingBtn(p, this.touchJumpBtn)) {
          jumpPressed = jumpPressed || (p.justDown);
        }
        if (this.isTouchingBtn(p, this.touchDoubleJumpBtn)) {
          doubleJumpPressed = doubleJumpPressed || (p.justDown);
        }
      }
    }

    this.prevJump = this.keyW.isDown;
    this.prevSpace = this.keySpace.isDown;

    const input: PlayerInput = {
      left,
      right,
      jump: this.keyW.isDown,
      jumpPressed,
      doubleJumpPressed,
    };

    this.player.update(input, time, delta);
    this.updateHUD();
  }
}