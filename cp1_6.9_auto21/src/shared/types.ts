export interface Paragraph {
  id: string;
  index: number;
  authorName: string;
  content: string;
  timestamp: number;
  durationMs: number;
}

export interface Story {
  id: string;
  title: string;
  paragraphs: Paragraph[];
  currentWriterId: string | null;
  currentWriterName: string | null;
  lockExpiresAt: number | null;
  lastParagraphTime: number | null;
  createdAt: number;
}

export interface CreateStoryRequest {
  title: string;
  opening: string;
  authorName: string;
}

export interface CreateStoryResponse {
  id: string;
  story: Story;
}
