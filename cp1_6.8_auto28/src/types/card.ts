export interface Decoration {
  id: string;
  type: 'balloon' | 'star' | 'heart' | 'flower' | 'ribbon';
  x: number;
  y: number;
  scale: number;
  rotation: number;
  color: string;
}

export interface TextElement {
  id: string;
  content: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
}

export interface NoteSequence {
  notes: boolean[][];
  beats: 4 | 8 | 16;
  tempo: number;
}

export interface CardData {
  id?: string;
  templateId: string;
  backgroundColor: string;
  backgroundGradient?: {
    start: string;
    end: string;
    direction: 'to right' | 'to bottom' | 'to bottom right';
  };
  decorations: Decoration[];
  textElements: TextElement[];
  noteSequence: NoteSequence;
  createdAt?: number;
}

export interface CardTemplate {
  id: string;
  name: string;
  category: 'birthday' | 'holiday' | 'thanks';
  backgroundColor: string;
  backgroundGradient?: {
    start: string;
    end: string;
    direction: 'to right' | 'to bottom' | 'to bottom right';
  };
  decorations: Decoration[];
  textElements: TextElement[];
  noteSequence: NoteSequence;
}

export const COLOR_PALETTE = [
  '#FF6B9D',
  '#FFE66D',
  '#4ECDC4',
  '#95E1D3',
  '#F38181',
  '#AA96DA',
  '#FCBAD3',
  '#FFFFD2',
  '#A8D8EA',
  '#FFD93D',
  '#6BCB77',
  '#4D96FF',
];

export const GRADIENT_PRESETS = [
  { start: '#FFE4EC', end: '#E8DAEF', direction: 'to bottom right' as const },
  { start: '#FFECD2', end: '#FCB69F', direction: 'to right' as const },
  { start: '#D4FC79', end: '#96E6A1', direction: 'to bottom' as const },
  { start: '#A1C4FD', end: '#C2E9FB', direction: 'to bottom right' as const },
  { start: '#FFD3A5', end: '#FD6585', direction: 'to right' as const },
  { start: '#C2E9FB', end: '#A1C4FD', direction: 'to bottom' as const },
];

export const NOTE_FREQUENCIES = [
  261.63,
  293.66,
  329.63,
  349.23,
  392.00,
  440.00,
];

export const DECORATION_TYPES = ['balloon', 'star', 'heart', 'flower', 'ribbon'] as const;
