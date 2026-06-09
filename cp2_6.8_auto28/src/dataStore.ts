import { CardDeck, Card, ReviewRecord, AppState } from './types';

const STORAGE_KEY_DECKS = 'flashcard_decks';
const STORAGE_KEY_CARDS_PREFIX = 'flashcard_cards_';
const STORAGE_KEY_RECORDS = 'flashcard_review_records';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function getDecks(): CardDeck[] {
  const data = localStorage.getItem(STORAGE_KEY_DECKS);
  return data ? JSON.parse(data) : [];
}

export function saveDecks(decks: CardDeck[]): void {
  localStorage.setItem(STORAGE_KEY_DECKS, JSON.stringify(decks));
}

export function getCards(deckId: string): Card[] {
  const data = localStorage.getItem(STORAGE_KEY_CARDS_PREFIX + deckId);
  return data ? JSON.parse(data) : [];
}

export function saveCards(deckId: string, cards: Card[]): void {
  localStorage.setItem(STORAGE_KEY_CARDS_PREFIX + deckId, JSON.stringify(cards));
}

export function getAllCards(): Record<string, Card[]> {
  const decks = getDecks();
  const allCards: Record<string, Card[]> = {};
  for (const deck of decks) {
    allCards[deck.id] = getCards(deck.id);
  }
  return allCards;
}

export function getReviewRecords(): ReviewRecord[] {
  const data = localStorage.getItem(STORAGE_KEY_RECORDS);
  return data ? JSON.parse(data) : [];
}

export function saveReviewRecords(records: ReviewRecord[]): void {
  localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
}

export function addDeck(deck: CardDeck): void {
  const decks = getDecks();
  decks.push(deck);
  saveDecks(decks);
}

export function updateDeck(updatedDeck: CardDeck): void {
  const decks = getDecks();
  const index = decks.findIndex(d => d.id === updatedDeck.id);
  if (index !== -1) {
    decks[index] = updatedDeck;
    saveDecks(decks);
  }
}

export function deleteDeck(deckId: string): void {
  const decks = getDecks();
  const filtered = decks.filter(d => d.id !== deckId);
  saveDecks(filtered);
  localStorage.removeItem(STORAGE_KEY_CARDS_PREFIX + deckId);
}

export function addCard(deckId: string, card: Card): void {
  const cards = getCards(deckId);
  cards.push(card);
  saveCards(deckId, cards);
}

export function updateCard(deckId: string, updatedCard: Card): void {
  const cards = getCards(deckId);
  const index = cards.findIndex(c => c.id === updatedCard.id);
  if (index !== -1) {
    cards[index] = updatedCard;
    saveCards(deckId, cards);
  }
}

export function deleteCard(deckId: string, cardId: string): void {
  const cards = getCards(deckId);
  const filtered = cards.filter(c => c.id !== cardId);
  saveCards(deckId, filtered);
}

export function addReviewRecord(record: ReviewRecord): void {
  const records = getReviewRecords();
  records.push(record);
  saveReviewRecords(records);
}

export function loadAppState(): AppState {
  const decks = getDecks();
  const cards: Record<string, Card[]> = {};
  for (const deck of decks) {
    cards[deck.id] = getCards(deck.id);
  }
  const reviewRecords = getReviewRecords();
  return {
    decks,
    cards,
    selectedDeckId: null,
    currentView: 'list',
    reviewRecords
  };
}
