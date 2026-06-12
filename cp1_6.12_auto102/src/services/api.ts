import { Annotation, Comment } from '../types';

const API_BASE = '/api';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function getAnnotations(bookId: string): Promise<Annotation[]> {
  await delay(300);
  const response = await fetch(`${API_BASE}/annotations?bookId=${bookId}`);
  const data = await response.json();
  return data.data;
}

export async function createAnnotation(
  annotation: Omit<Annotation, 'id' | 'timestamp' | 'likes' | 'comments'>
): Promise<Annotation> {
  await delay(300);
  const response = await fetch(`${API_BASE}/annotations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(annotation),
  });
  return response.json();
}

export async function likeAnnotation(id: string): Promise<Annotation> {
  await delay(300);
  const response = await fetch(`${API_BASE}/annotations/${id}/like`, {
    method: 'POST',
  });
  return response.json();
}

export async function addComment(
  annotationId: string,
  comment: Omit<Comment, 'id' | 'timestamp'>
): Promise<Annotation> {
  await delay(300);
  const response = await fetch(`${API_BASE}/annotations/${annotationId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(comment),
  });
  return response.json();
}
