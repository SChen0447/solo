import _ from 'lodash';
import type { Book, RecommendedBook, RatingMap } from './types';
import { allBooksPool } from './booksData';

export function getRecommendations(
  shelfBooks: Book[],
  userRatings: RatingMap,
  count: number = 3
): RecommendedBook[] {
  const shelfTagCounts: Record<string, number> = {};
  const shelfTitleSet = new Set(shelfBooks.map(b => b.title));

  shelfBooks.forEach(book => {
    const rating = userRatings[book.id] ?? book.rating;
    const weight = rating / 5;
    book.tags.forEach(tag => {
      shelfTagCounts[tag] = (shelfTagCounts[tag] || 0) + weight;
    });
  });

  const totalWeight = Object.values(shelfTagCounts).reduce((sum, v) => sum + v, 0) || 1;
  const shelfTagFreq: Record<string, number> = {};
  Object.entries(shelfTagCounts).forEach(([tag, count]) => {
    shelfTagFreq[tag] = count / totalWeight;
  });

  const candidates = allBooksPool
    .filter(book => !shelfTitleSet.has(book.title))
    .map(book => {
      let matchScore = 0;
      book.tags.forEach(tag => {
        if (shelfTagFreq[tag]) {
          matchScore += shelfTagFreq[tag];
        }
      });
      const maxPossible = Math.min(book.tags.length, Object.keys(shelfTagFreq).length) || 1;
      matchScore = Math.min(100, Math.round((matchScore / maxPossible) * 100));
      return { ...book, matchScore };
    })
    .filter(b => b.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);

  const topCandidates = candidates.slice(0, count * 3);
  return _.shuffle(topCandidates).slice(0, count);
}
