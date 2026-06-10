export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  startPoint: Point;
  endPoint: Point;
  controlPoints: Point[];
  widthCurve: {
    start: number;
    middle: number;
    end: number;
  };
  direction: number;
}

interface StrokeData {
  strokes: Stroke[];
  charWidth: number;
  charHeight: number;
}

const strokeDatabase: Record<string, StrokeData> = {
  '永': {
    charWidth: 300,
    charHeight: 300,
    strokes: [
      {
        startPoint: { x: 150, y: 30 },
        endPoint: { x: 150, y: 90 },
        controlPoints: [{ x: 148, y: 50 }, { x: 152, y: 70 }],
        widthCurve: { start: 4, middle: 2.5, end: 1 },
        direction: Math.PI / 2
      },
      {
        startPoint: { x: 150, y: 95 },
        endPoint: { x: 60, y: 150 },
        controlPoints: [{ x: 110, y: 110 }, { x: 85, y: 130 }],
        widthCurve: { start: 3.5, middle: 2.5, end: 1 },
        direction: Math.PI * 0.7
      },
      {
        startPoint: { x: 150, y: 95 },
        endPoint: { x: 240, y: 150 },
        controlPoints: [{ x: 190, y: 110 }, { x: 215, y: 130 }],
        widthCurve: { start: 3.5, middle: 2.5, end: 1 },
        direction: Math.PI * 0.3
      },
      {
        startPoint: { x: 90, y: 140 },
        endPoint: { x: 150, y: 250 },
        controlPoints: [{ x: 100, y: 180 }, { x: 120, y: 220 }],
        widthCurve: { start: 4, middle: 2.5, end: 1.5 },
        direction: Math.PI * 0.6
      },
      {
        startPoint: { x: 150, y: 160 },
        endPoint: { x: 210, y: 250 },
        controlPoints: [{ x: 175, y: 190 }, { x: 195, y: 225 }],
        widthCurve: { start: 4, middle: 2.5, end: 1.5 },
        direction: Math.PI * 0.4
      }
    ]
  },
  '龙': {
    charWidth: 300,
    charHeight: 300,
    strokes: [
      {
        startPoint: { x: 50, y: 40 },
        endPoint: { x: 120, y: 40 },
        controlPoints: [{ x: 70, y: 38 }, { x: 100, y: 42 }],
        widthCurve: { start: 4, middle: 2, end: 1 },
        direction: 0
      },
      {
        startPoint: { x: 50, y: 40 },
        endPoint: { x: 50, y: 120 },
        controlPoints: [{ x: 48, y: 70 }, { x: 52, y: 95 }],
        widthCurve: { start: 3.5, middle: 2.5, end: 1 },
        direction: Math.PI / 2
      },
      {
        startPoint: { x: 50, y: 75 },
        endPoint: { x: 130, y: 75 },
        controlPoints: [{ x: 75, y: 73 }, { x: 105, y: 77 }],
        widthCurve: { start: 3, middle: 2, end: 1 },
        direction: 0
      },
      {
        startPoint: { x: 50, y: 120 },
        endPoint: { x: 130, y: 115 },
        controlPoints: [{ x: 80, y: 118 }, { x: 105, y: 116 }],
        widthCurve: { start: 3, middle: 2, end: 1 },
        direction: 0
      },
      {
        startPoint: { x: 80, y: 35 },
        endPoint: { x: 80, y: 130 },
        controlPoints: [{ x: 78, y: 65 }, { x: 82, y: 100 }],
        widthCurve: { start: 3.5, middle: 2.5, end: 1 },
        direction: Math.PI / 2
      },
      {
        startPoint: { x: 155, y: 40 },
        endPoint: { x: 255, y: 60 },
        controlPoints: [{ x: 190, y: 35 }, { x: 225, y: 45 }],
        widthCurve: { start: 4, middle: 2.5, end: 1 },
        direction: 0.15
      },
      {
        startPoint: { x: 160, y: 80 },
        endPoint: { x: 250, y: 100 },
        controlPoints: [{ x: 200, y: 78 }, { x: 225, y: 88 }],
        widthCurve: { start: 3.5, middle: 2.5, end: 1 },
        direction: 0.15
      },
      {
        startPoint: { x: 170, y: 120 },
        endPoint: { x: 240, y: 140 },
        controlPoints: [{ x: 195, y: 118 }, { x: 220, y: 128 }],
        widthCurve: { start: 3, middle: 2, end: 1 },
        direction: 0.2
      },
      {
        startPoint: { x: 155, y: 160 },
        endPoint: { x: 240, y: 200 },
        controlPoints: [{ x: 180, y: 175 }, { x: 210, y: 190 }],
        widthCurve: { start: 3.5, middle: 2.5, end: 1.5 },
        direction: 0.45
      },
      {
        startPoint: { x: 155, y: 170 },
        endPoint: { x: 80, y: 270 },
        controlPoints: [{ x: 130, y: 210 }, { x: 100, y: 250 }],
        widthCurve: { start: 4, middle: 3, end: 1.5 },
        direction: Math.PI * 0.65
      },
      {
        startPoint: { x: 200, y: 180 },
        endPoint: { x: 270, y: 270 },
        controlPoints: [{ x: 220, y: 210 }, { x: 245, y: 250 }],
        widthCurve: { start: 3.5, middle: 2.5, end: 1.5 },
        direction: Math.PI * 0.45
      }
    ]
  },
  '梦': {
    charWidth: 300,
    charHeight: 300,
    strokes: [
      {
        startPoint: { x: 60, y: 25 },
        endPoint: { x: 240, y: 25 },
        controlPoints: [{ x: 100, y: 22 }, { x: 200, y: 28 }],
        widthCurve: { start: 4, middle: 2, end: 1 },
        direction: 0
      },
      {
        startPoint: { x: 100, y: 25 },
        endPoint: { x: 100, y: 60 },
        controlPoints: [{ x: 98, y: 38 }, { x: 102, y: 50 }],
        widthCurve: { start: 3.5, middle: 2.5, end: 1 },
        direction: Math.PI / 2
      },
      {
        startPoint: { x: 100, y: 60 },
        endPoint: { x: 55, y: 100 },
        controlPoints: [{ x: 85, y: 72 }, { x: 70, y: 88 }],
        widthCurve: { start: 3, middle: 2, end: 1 },
        direction: Math.PI * 0.6
      },
      {
        startPoint: { x: 100, y: 60 },
        endPoint: { x: 145, y: 100 },
        controlPoints: [{ x: 115, y: 72 }, { x: 130, y: 88 }],
        widthCurve: { start: 3, middle: 2, end: 1 },
        direction: Math.PI * 0.4
      },
      {
        startPoint: { x: 150, y: 25 },
        endPoint: { x: 150, y: 60 },
        controlPoints: [{ x: 148, y: 38 }, { x: 152, y: 50 }],
        widthCurve: { start: 3.5, middle: 2.5, end: 1 },
        direction: Math.PI / 2
      },
      {
        startPoint: { x: 150, y: 60 },
        endPoint: { x: 105, y: 100 },
        controlPoints: [{ x: 135, y: 72 }, { x: 120, y: 88 }],
        widthCurve: { start: 3, middle: 2, end: 1 },
        direction: Math.PI * 0.6
      },
      {
        startPoint: { x: 150, y: 60 },
        endPoint: { x: 195, y: 100 },
        controlPoints: [{ x: 165, y: 72 }, { x: 180, y: 88 }],
        widthCurve: { start: 3, middle: 2, end: 1 },
        direction: Math.PI * 0.4
      },
      {
        startPoint: { x: 200, y: 25 },
        endPoint: { x: 200, y: 70 },
        controlPoints: [{ x: 198, y: 42 }, { x: 202, y: 58 }],
        widthCurve: { start: 3.5, middle: 2.5, end: 1 },
        direction: Math.PI / 2
      },
      {
        startPoint: { x: 200, y: 45 },
        endPoint: { x: 245, y: 45 },
        controlPoints: [{ x: 215, y: 43 }, { x: 235, y: 47 }],
        widthCurve: { start: 3, middle: 2, end: 1 },
        direction: 0
      },
      {
        startPoint: { x: 60, y: 115 },
        endPoint: { x: 240, y: 115 },
        controlPoints: [{ x: 100, y: 113 }, { x: 200, y: 117 }],
        widthCurve: { start: 4, middle: 2, end: 1 },
        direction: 0
      },
      {
        startPoint: { x: 80, y: 120 },
        endPoint: { x: 80, y: 210 },
        controlPoints: [{ x: 78, y: 150 }, { x: 82, y: 180 }],
        widthCurve: { start: 4, middle: 2.5, end: 1 },
        direction: Math.PI / 2
      },
      {
        startPoint: { x: 80, y: 145 },
        endPoint: { x: 220, y: 145 },
        controlPoints: [{ x: 130, y: 142 }, { x: 180, y: 148 }],
        widthCurve: { start: 3, middle: 2, end: 1 },
        direction: 0
      },
      {
        startPoint: { x: 150, y: 115 },
        endPoint: { x: 150, y: 220 },
        controlPoints: [{ x: 148, y: 150 }, { x: 152, y: 185 }],
        widthCurve: { start: 4, middle: 3, end: 1.5 },
        direction: Math.PI / 2
      },
      {
        startPoint: { x: 80, y: 180 },
        endPoint: { x: 220, y: 180 },
        controlPoints: [{ x: 120, y: 178 }, { x: 180, y: 182 }],
        widthCurve: { start: 3, middle: 2, end: 1 },
        direction: 0
      },
      {
        startPoint: { x: 80, y: 210 },
        endPoint: { x: 220, y: 210 },
        controlPoints: [{ x: 120, y: 208 }, { x: 180, y: 212 }],
        widthCurve: { start: 3, middle: 2, end: 1.5 },
        direction: 0
      },
      {
        startPoint: { x: 220, y: 120 },
        endPoint: { x: 240, y: 270 },
        controlPoints: [{ x: 235, y: 170 }, { x: 230, y: 230 }],
        widthCurve: { start: 4, middle: 3, end: 1.5 },
        direction: Math.PI * 0.55
      },
      {
        startPoint: { x: 85, y: 235 },
        endPoint: { x: 55, y: 275 },
        controlPoints: [{ x: 75, y: 250 }, { x: 65, y: 265 }],
        widthCurve: { start: 3, middle: 2, end: 1 },
        direction: Math.PI * 0.6
      },
      {
        startPoint: { x: 215, y: 235 },
        endPoint: { x: 245, y: 275 },
        controlPoints: [{ x: 225, y: 250 }, { x: 235, y: 265 }],
        widthCurve: { start: 3, middle: 2, end: 1 },
        direction: Math.PI * 0.4
      }
    ]
  },
  '书': {
    charWidth: 300,
    charHeight: 300,
    strokes: [
      {
        startPoint: { x: 60, y: 30 },
        endPoint: { x: 240, y: 30 },
        controlPoints: [{ x: 100, y: 27 }, { x: 200, y: 33 }],
        widthCurve: { start: 4, middle: 2, end: 1 },
        direction: 0
      },
      {
        startPoint: { x: 80, y: 30 },
        endPoint: { x: 80, y: 80 },
        controlPoints: [{ x: 78, y: 48 }, { x: 82, y: 65 }],
        widthCurve: { start: 3.5, middle: 2.5, end: 1 },
        direction: Math.PI / 2
      },
      {
        startPoint: { x: 80, y: 55 },
        endPoint: { x: 220, y: 55 },
        controlPoints: [{ x: 120, y: 52 }, { x: 180, y: 58 }],
        widthCurve: { start: 3, middle: 2, end: 1 },
        direction: 0
      },
      {
        startPoint: { x: 150, y: 30 },
        endPoint: { x: 150, y: 90 },
        controlPoints: [{ x: 148, y: 50 }, { x: 152, y: 72 }],
        widthCurve: { start: 4, middle: 2.5, end: 1 },
        direction: Math.PI / 2
      },
      {
        startPoint: { x: 220, y: 30 },
        endPoint: { x: 220, y: 90 },
        controlPoints: [{ x: 218, y: 50 }, { x: 222, y: 72 }],
        widthCurve: { start: 3.5, middle: 2.5, end: 1 },
        direction: Math.PI / 2
      },
      {
        startPoint: { x: 80, y: 80 },
        endPoint: { x: 220, y: 80 },
        controlPoints: [{ x: 120, y: 78 }, { x: 180, y: 82 }],
        widthCurve: { start: 3, middle: 2, end: 1 },
        direction: 0
      },
      {
        startPoint: { x: 150, y: 85 },
        endPoint: { x: 70, y: 260 },
        controlPoints: [{ x: 130, y: 140 }, { x: 100, y: 210 }],
        widthCurve: { start: 4, middle: 3, end: 1.5 },
        direction: Math.PI * 0.55
      },
      {
        startPoint: { x: 150, y: 140 },
        endPoint: { x: 230, y: 260 },
        controlPoints: [{ x: 180, y: 180 }, { x: 205, y: 225 }],
        widthCurve: { start: 3.5, middle: 2.5, end: 1.5 },
        direction: Math.PI * 0.45
      }
    ]
  },
  '法': {
    charWidth: 300,
    charHeight: 300,
    strokes: [
      {
        startPoint: { x: 40, y: 30 },
        endPoint: { x: 30, y: 90 },
        controlPoints: [{ x: 35, y: 50 }, { x: 32, y: 70 }],
        widthCurve: { start: 4, middle: 2.5, end: 1.5 },
        direction: Math.PI * 0.55
      },
      {
        startPoint: { x: 35, y: 110 },
        endPoint: { x: 25, y: 180 },
        controlPoints: [{ x: 30, y: 135 }, { x: 28, y: 160 }],
        widthCurve: { start: 3.5, middle: 2.5, end: 1 },
        direction: Math.PI * 0.55
      },
      {
        startPoint: { x: 30, y: 200 },
        endPoint: { x: 70, y: 270 },
        controlPoints: [{ x: 40, y: 225 }, { x: 55, y: 250 }],
        widthCurve: { start: 4, middle: 3, end: 1.5 },
        direction: Math.PI * 0.45
      },
      {
        startPoint: { x: 100, y: 35 },
        endPoint: { x: 250, y: 35 },
        controlPoints: [{ x: 140, y: 32 }, { x: 210, y: 38 }],
        widthCurve: { start: 4, middle: 2, end: 1 },
        direction: 0
      },
      {
        startPoint: { x: 120, y: 35 },
        endPoint: { x: 120, y: 90 },
        controlPoints: [{ x: 118, y: 55 }, { x: 122, y: 75 }],
        widthCurve: { start: 3.5, middle: 2.5, end: 1 },
        direction: Math.PI / 2
      },
      {
        startPoint: { x: 120, y: 65 },
        endPoint: { x: 220, y: 65 },
        controlPoints: [{ x: 150, y: 62 }, { x: 190, y: 68 }],
        widthCurve: { start: 3, middle: 2, end: 1 },
        direction: 0
      },
      {
        startPoint: { x: 175, y: 35 },
        endPoint: { x: 175, y: 100 },
        controlPoints: [{ x: 173, y: 58 }, { x: 177, y: 82 }],
        widthCurve: { start: 3.5, middle: 2.5, end: 1 },
        direction: Math.PI / 2
      },
      {
        startPoint: { x: 230, y: 35 },
        endPoint: { x: 230, y: 100 },
        controlPoints: [{ x: 228, y: 58 }, { x: 232, y: 82 }],
        widthCurve: { start: 3.5, middle: 2.5, end: 1 },
        direction: Math.PI / 2
      },
      {
        startPoint: { x: 120, y: 95 },
        endPoint: { x: 230, y: 95 },
        controlPoints: [{ x: 155, y: 92 }, { x: 200, y: 98 }],
        widthCurve: { start: 3, middle: 2, end: 1 },
        direction: 0
      },
      {
        startPoint: { x: 115, y: 100 },
        endPoint: { x: 235, y: 100 },
        controlPoints: [{ x: 150, y: 105 }, { x: 200, y: 115 }],
        widthCurve: { start: 4, middle: 3, end: 1.5 },
        direction: 0.1
      },
      {
        startPoint: { x: 175, y: 115 },
        endPoint: { x: 175, y: 200 },
        controlPoints: [{ x: 173, y: 145 }, { x: 177, y: 175 }],
        widthCurve: { start: 4, middle: 3, end: 1.5 },
        direction: Math.PI / 2
      },
      {
        startPoint: { x: 175, y: 145 },
        endPoint: { x: 250, y: 180 },
        controlPoints: [{ x: 200, y: 152 }, { x: 225, y: 168 }],
        widthCurve: { start: 3, middle: 2, end: 1 },
        direction: 0.35
      },
      {
        startPoint: { x: 175, y: 200 },
        endPoint: { x: 110, y: 270 },
        controlPoints: [{ x: 155, y: 225 }, { x: 135, y: 250 }],
        widthCurve: { start: 4, middle: 3, end: 1.5 },
        direction: Math.PI * 0.6
      },
      {
        startPoint: { x: 175, y: 200 },
        endPoint: { x: 240, y: 270 },
        controlPoints: [{ x: 195, y: 225 }, { x: 215, y: 250 }],
        widthCurve: { start: 4, middle: 3, end: 1.5 },
        direction: Math.PI * 0.4
      }
    ]
  }
};

const defaultStrokes: StrokeData = {
  charWidth: 300,
  charHeight: 300,
  strokes: [
    {
      startPoint: { x: 150, y: 50 },
      endPoint: { x: 150, y: 250 },
      controlPoints: [{ x: 148, y: 120 }, { x: 152, y: 180 }],
      widthCurve: { start: 4, middle: 2.5, end: 1.5 },
      direction: Math.PI / 2
    },
    {
      startPoint: { x: 50, y: 150 },
      endPoint: { x: 250, y: 150 },
      controlPoints: [{ x: 120, y: 147 }, { x: 180, y: 153 }],
      widthCurve: { start: 4, middle: 2, end: 1.5 },
      direction: 0
    }
  ]
};

export function getStrokes(character: string): Stroke[] {
  const char = character.charAt(0);
  if (!char) return [];
  const data = strokeDatabase[char] || defaultStrokes;
  const strokes: Stroke[] = JSON.parse(JSON.stringify(data.strokes));
  return strokes;
}

export function getCharSize(character: string): { width: number; height: number } {
  const char = character.charAt(0);
  const data = strokeDatabase[char] || defaultStrokes;
  return { width: data.charWidth, height: data.charHeight };
}

export function hasCharacter(character: string): boolean {
  return character.charAt(0) in strokeDatabase;
}

export function getAvailableCharacters(): string[] {
  return Object.keys(strokeDatabase);
}
