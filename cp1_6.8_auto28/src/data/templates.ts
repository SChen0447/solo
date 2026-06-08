import type { CardTemplate } from '../types/card';
import { v4 as uuidv4 } from 'uuid';

const createNoteSequence = (pattern: number[], beats: 4 | 8 | 16 = 8): { notes: boolean[][]; beats: 4 | 8 | 16; tempo: number } => {
  const notes: boolean[][] = [];
  for (let i = 0; i < 6; i++) {
    notes.push(new Array(beats).fill(false));
  }
  pattern.forEach((row, col) => {
    if (row >= 0 && row < 6 && col < beats) {
      notes[row][col] = true;
    }
  });
  return { notes, beats, tempo: 120 };
};

export const templates: CardTemplate[] = [
  {
    id: 'template-birthday',
    name: '生日快乐',
    category: 'birthday',
    backgroundColor: '#FFE4EC',
    backgroundGradient: {
      start: '#FFE4EC',
      end: '#FFC0CB',
      direction: 'to bottom right',
    },
    decorations: [
      { id: uuidv4(), type: 'balloon', x: 15, y: 20, scale: 1, rotation: -10, color: '#FF6B9D' },
      { id: uuidv4(), type: 'balloon', x: 80, y: 15, scale: 0.8, rotation: 15, color: '#FFD93D' },
      { id: uuidv4(), type: 'balloon', x: 25, y: 70, scale: 0.9, rotation: 5, color: '#6BCB77' },
      { id: uuidv4(), type: 'star', x: 70, y: 60, scale: 0.7, rotation: 20, color: '#FFD93D' },
      { id: uuidv4(), type: 'star', x: 50, y: 30, scale: 0.5, rotation: -15, color: '#FF6B9D' },
    ],
    textElements: [
      {
        id: uuidv4(),
        content: '生日快乐！',
        x: 50,
        y: 45,
        fontSize: 32,
        fontFamily: 'serif',
        color: '#FF6B9D',
        bold: true,
        italic: false,
      },
      {
        id: uuidv4(),
        content: '愿你每一天都充满快乐与幸福',
        x: 50,
        y: 60,
        fontSize: 14,
        fontFamily: 'sans-serif',
        color: '#666666',
        bold: false,
        italic: true,
      },
    ],
    noteSequence: createNoteSequence([2, 2, 4, 2, 1, 0, 2, 3], 8),
  },
  {
    id: 'template-holiday',
    name: '节日祝福',
    category: 'holiday',
    backgroundColor: '#E8F5E9',
    backgroundGradient: {
      start: '#E8F5E9',
      end: '#C8E6C9',
      direction: 'to bottom right',
    },
    decorations: [
      { id: uuidv4(), type: 'star', x: 20, y: 25, scale: 1, rotation: 0, color: '#FFD93D' },
      { id: uuidv4(), type: 'star', x: 75, y: 20, scale: 0.8, rotation: 30, color: '#FF9800' },
      { id: uuidv4(), type: 'star', x: 85, y: 70, scale: 0.6, rotation: -20, color: '#FFD93D' },
      { id: uuidv4(), type: 'ribbon', x: 50, y: 25, scale: 1.2, rotation: 0, color: '#E91E63' },
      { id: uuidv4(), type: 'flower', x: 15, y: 75, scale: 0.9, rotation: 10, color: '#F06292' },
      { id: uuidv4(), type: 'flower', x: 85, y: 80, scale: 0.7, rotation: -15, color: '#BA68C8' },
    ],
    textElements: [
      {
        id: uuidv4(),
        content: '节日快乐',
        x: 50,
        y: 50,
        fontSize: 36,
        fontFamily: 'serif',
        color: '#E91E63',
        bold: true,
        italic: false,
      },
      {
        id: uuidv4(),
        content: '愿美好与你常伴',
        x: 50,
        y: 65,
        fontSize: 16,
        fontFamily: 'sans-serif',
        color: '#555555',
        bold: false,
        italic: true,
      },
    ],
    noteSequence: createNoteSequence([0, 2, 4, 2, 0, 2, 4, 5], 8),
  },
  {
    id: 'template-thanks',
    name: '感谢有你',
    category: 'thanks',
    backgroundColor: '#FFF3E0',
    backgroundGradient: {
      start: '#FFF3E0',
      end: '#FFE0B2',
      direction: 'to bottom right',
    },
    decorations: [
      { id: uuidv4(), type: 'heart', x: 50, y: 35, scale: 1.2, rotation: 0, color: '#E91E63' },
      { id: uuidv4(), type: 'flower', x: 20, y: 60, scale: 0.8, rotation: -10, color: '#FF6B9D' },
      { id: uuidv4(), type: 'flower', x: 80, y: 65, scale: 0.85, rotation: 15, color: '#F06292' },
      { id: uuidv4(), type: 'star', x: 15, y: 20, scale: 0.5, rotation: 25, color: '#FFD93D' },
      { id: uuidv4(), type: 'star', x: 85, y: 25, scale: 0.6, rotation: -20, color: '#FF9800' },
    ],
    textElements: [
      {
        id: uuidv4(),
        content: '感谢有你',
        x: 50,
        y: 55,
        fontSize: 32,
        fontFamily: 'serif',
        color: '#E91E63',
        bold: true,
        italic: false,
      },
      {
        id: uuidv4(),
        content: '谢谢你一路的陪伴与支持',
        x: 50,
        y: 70,
        fontSize: 14,
        fontFamily: 'sans-serif',
        color: '#666666',
        bold: false,
        italic: true,
      },
    ],
    noteSequence: createNoteSequence([1, 2, 3, 4, 3, 2, 1, 0], 8),
  },
];

export const getTemplateById = (id: string): CardTemplate | undefined => {
  return templates.find((t) => t.id === id);
};
