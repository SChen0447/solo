import { Card, ReviewGrade } from './types';

const MAX_INTERVAL = 7;
const INITIAL_INTERVAL = 1;

function addDays(date: Date, days: number): string {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().split('T')[0];
}

export function schedule(card: Card, grade: ReviewGrade): Card {
  const today = new Date();
  let newInterval: number;
  let newRepetitions: number;

  if (grade === 'hard') {
    newRepetitions = 0;
    newInterval = INITIAL_INTERVAL;
  } else if (grade === 'normal') {
    newRepetitions = card.repetitions + 1;
    if (newRepetitions === 1) {
      newInterval = INITIAL_INTERVAL;
    } else if (newRepetitions === 2) {
      newInterval = 2;
    } else {
      newInterval = Math.min(card.interval * 2, MAX_INTERVAL);
    }
  } else {
    newRepetitions = card.repetitions + 1;
    if (newRepetitions === 1) {
      newInterval = 2;
    } else if (newRepetitions === 2) {
      newInterval = 4;
    } else {
      newInterval = Math.min(card.interval * 2, MAX_INTERVAL);
    }
  }

  const nextReview = addDays(today, newInterval);

  return {
    ...card,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReview
  };
}

export function isDueToday(card: Card): boolean {
  const today = new Date().toISOString().split('T')[0];
  return card.nextReview <= today;
}

export function getDueCards(cards: Card[]): Card[] {
  return cards.filter(isDueToday);
}

export function createNewCard(id: string, front: string, back: string): Card {
  const today = new Date().toISOString().split('T')[0];
  return {
    id,
    front,
    back,
    createdAt: today,
    nextReview: today,
    interval: INITIAL_INTERVAL,
    repetitions: 0
  };
}
