export interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  pages: number;
  emotion: string;
  mood: string;
  message?: string;
  recommendationId?: string;
}

export interface QuestionnaireAnswers {
  tearfulBook: string;
  readingSpeed: string;
  pagePreference: string;
}

export async function recommendBook(answers: QuestionnaireAnswers): Promise<Book> {
  const preferences = {
    mood: answers.tearfulBook,
    speed: answers.readingSpeed,
    pages: answers.pagePreference
  };

  const response = await fetch('/api/recommend', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(preferences)
  });

  if (!response.ok) {
    throw new Error('推荐请求失败');
  }

  return response.json();
}

export async function saveFavorite(sessionId: string, book: Book): Promise<{ success: boolean; count: number }> {
  const response = await fetch('/api/favorites', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sessionId, book })
  });

  if (!response.ok) {
    throw new Error('收藏失败');
  }

  return response.json();
}

export async function getFavorites(sessionId: string): Promise<{ favorites: Book[] }> {
  const response = await fetch(`/api/favorites/${sessionId}`);
  if (!response.ok) {
    throw new Error('获取收藏失败');
  }
  return response.json();
}
