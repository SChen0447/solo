export interface Snippet {
  id: string;
  title: string;
  description: string;
  code: string;
  language: string;
  tags: string[];
  createdAt: string;
}

export interface CreateSnippetData {
  title: string;
  description: string;
  code: string;
  language: string;
  tags: string[];
}

export type UpdateSnippetData = Partial<CreateSnippetData>;
