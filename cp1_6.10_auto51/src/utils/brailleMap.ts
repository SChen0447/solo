export type DotPosition = [number, number];

export interface BrailleChar {
  letter: string;
  dots: DotPosition[];
}

export const brailleMap: Record<string, DotPosition[]> = {
  A: [[0, 0]],
  B: [[0, 0], [1, 0]],
  C: [[0, 0], [0, 1]],
  D: [[0, 0], [0, 1], [1, 1]],
  E: [[0, 0], [1, 1]],
  F: [[0, 0], [1, 0], [0, 1]],
  G: [[0, 0], [1, 0], [0, 1], [1, 1]],
  H: [[0, 0], [1, 0], [1, 1]],
  I: [[1, 0], [0, 1]],
  J: [[1, 0], [0, 1], [1, 1]],
  K: [[0, 0], [2, 0]],
  L: [[0, 0], [1, 0], [2, 0]],
  M: [[0, 0], [0, 1], [2, 0]],
  N: [[0, 0], [0, 1], [1, 1], [2, 0]],
  O: [[0, 0], [1, 1], [2, 0]],
  P: [[0, 0], [1, 0], [0, 1], [2, 0]],
  Q: [[0, 0], [1, 0], [0, 1], [1, 1], [2, 0]],
  R: [[0, 0], [1, 0], [1, 1], [2, 0]],
  S: [[1, 0], [0, 1], [2, 0]],
  T: [[1, 0], [0, 1], [1, 1], [2, 0]],
  U: [[0, 0], [2, 0], [2, 1]],
  V: [[0, 0], [1, 0], [2, 0], [2, 1]],
  W: [[1, 0], [0, 1], [1, 1], [2, 1]],
  X: [[0, 0], [0, 1], [2, 0], [2, 1]],
  Y: [[0, 0], [0, 1], [1, 1], [2, 0], [2, 1]],
  Z: [[0, 0], [1, 1], [2, 0], [2, 1]],
};

export function letterToDots(letter: string): DotPosition[] {
  const upper = letter.toUpperCase();
  return brailleMap[upper] || [];
}

export function dotsToLetter(dots: DotPosition[]): string | null {
  const sorted = dots.map(d => `${d[0]},${d[1]}`).sort().join('|');
  for (const [letter, letterDots] of Object.entries(brailleMap)) {
    const letterSorted = letterDots.map(d => `${d[0]},${d[1]}`).sort().join('|');
    if (sorted === letterSorted) return letter;
  }
  return null;
}

export function isValidLetter(letter: string): boolean {
  return /^[A-Za-z]$/.test(letter);
}

export function getAlphabetLetters(): string[] {
  return Object.keys(brailleMap);
}

export function getRandomLetter(): string {
  const letters = getAlphabetLetters();
  return letters[Math.floor(Math.random() * letters.length)];
}
